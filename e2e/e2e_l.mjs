// Stage (l): old-photo warning, stamps on proofs and the weekly summary push (after stage k).
import fs from "node:fs";
import path from "node:path";
import { ANON, APP, DIR, SUPABASE, accessToken, assert, done, launch, loginAs, sql, step, typingTest } from "./lib.mjs";

const browser = await launch();
const pushes = () => {
  const file = path.join(DIR, "push_calls.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};

/** A real JPEG (drawn by the browser) with an EXIF DateTimeOriginal `daysAgo` days back. */
async function oldJpeg(page, daysAgo) {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#2f6fd6";
    g.fillRect(0, 0, 64, 64);
    return c.toDataURL("image/jpeg").split(",")[1];
  });
  const jpeg = Buffer.from(b64, "base64");
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} 12:00:00`;
  // TIFF (little endian): IFD0 -> Exif IFD -> DateTimeOriginal
  const t = Buffer.alloc(64);
  t.write("II", 0, "ascii");
  t.writeUInt16LE(42, 2);
  t.writeUInt32LE(8, 4);
  t.writeUInt16LE(1, 8);
  t.writeUInt16LE(0x8769, 10); t.writeUInt16LE(4, 12); t.writeUInt32LE(1, 14); t.writeUInt32LE(26, 18);
  t.writeUInt16LE(1, 26);
  t.writeUInt16LE(0x9003, 28); t.writeUInt16LE(2, 30); t.writeUInt32LE(20, 32); t.writeUInt32LE(44, 36);
  t.write(stamp, 44, "ascii");
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, 0]), Buffer.from("Exif\0\0", "binary"), t]);
  app1.writeUInt16BE(app1.length - 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

// Someone who has not sent today's reading yet.
const who = ["bia", "caio", "eva", "ana"].find(
  (n) => sql(`select count(*) from public.checkins c join auth.users u on u.id = c.user_id where u.email = '${n}@pacto.test' and c.goal = 'reading' and c.day = public.sp_today() and not c.extra`) === "0",
);
let proofUrl;

await step("a photo the phone dates 3 days back: warned before sending, flagged for the group", async () => {
  assert(who, "nobody left with a pending reading");
  const p = await loginAs(browser, `${who}@pacto.test`);
  const card = p.locator("[data-goal=reading][data-state=pending]");
  await card.locator("input[type=file]").setInputFiles({ name: "velha.jpg", mimeType: "image/jpeg", buffer: await oldJpeg(p, 3) });
  await card.getByTestId("photo-age-note").getByText("Foto de 3 dias atrás").waitFor();
  await card.getByTestId("pages").fill("7");
  await card.getByRole("button", { name: "Enviar prova" }).click();
  const row = p.locator("[data-goal=reading][data-state=done]");
  await row.getByText("Foto de 3 dias atrás").waitFor();
  await row.click();
  await p.waitForURL("**/checkin/**");
  proofUrl = p.url();
  await p.getByTestId("photo-age").getByText("Foto de 3 dias atrás").waitFor();
  // The owner sees the stamps but cannot stamp their own proof.
  assert(await p.getByTestId("reactions").locator('[data-reaction="respeito"]').isDisabled(), "owner can stamp own proof");
});

await step("friends stamp the proof; it stays after reload and the feed counts it", async () => {
  const friend = who === "ana" ? "bia" : "ana";
  const p = await loginAs(browser, `${friend}@pacto.test`);
  await p.goto(proofUrl);
  const btn = p.getByTestId("reactions").locator('[data-reaction="respeito"]');
  await btn.click();
  await p.waitForFunction(() => document.querySelector('[data-reaction="respeito"]')?.getAttribute("aria-pressed") === "true");
  await p.waitForTimeout(500);
  await p.reload();
  await p.getByTestId("reactions").getByText(/Respeito: .*você/).waitFor();
  await p.goto(`${APP}/feed`);
  await p.getByTestId("stamp-count").getByText("1 carimbo").first().waitFor();
  const feedAge = await p.getByText("Foto de 3 dias atrás").count();
  assert(feedAge >= 1, "feed shows the photo age");
});

await step("weekly summary: one push per subscribed member a day", async () => {
  const before = pushes().length;
  const r1 = await fetch(`${APP}/api/cron/weekly`).then((r) => r.json());
  assert(r1.summarized >= 1, `summarized ${JSON.stringify(r1)}`);
  for (let i = 0; i < 20 && pushes().length === before; i++) await new Promise((r) => setTimeout(r, 250));
  assert(pushes().length > before, "a summary reached the push service");
  const r2 = await fetch(`${APP}/api/cron/weekly`).then((r) => r.json());
  assert(r2.summarized === 0, `second run ${JSON.stringify(r2)}`);
});

await step("typing: another attempt can raise the best, the ranking keeps PC records, and the server refuses a faked run", async () => {
  const p = await loginAs(browser, "ana@pacto.test");
  await p.getByRole("button", { name: /Tentar de novo \(2 restantes\)/ }).click();
  await typingTest(p, p.locator("[data-goal=typing][data-state=again]"));
  await p.getByRole("button", { name: /Tentar de novo \(1 restante\)/ }).waitFor();
  await p.goto(`${APP}/ranking`);
  await p.getByTestId("typing-records").locator('[data-device="pc"]').getByText(/Ana.*/).first().waitFor();
  // Finishing right after starting (a faked clock) is refused by the server.
  const token = await accessToken(p);
  const h = { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" };
  const start = await fetch(`${SUPABASE}/rest/v1/rpc/start_typing_test`, { method: "POST", headers: h, body: JSON.stringify({ p_device: "pc" }) }).then((r) => r.json());
  const fin = await fetch(`${SUPABASE}/rest/v1/rpc/finish_typing_test`, { method: "POST", headers: h, body: JSON.stringify({ p_test: start[0].test_id, p_correct: 50, p_typed: 50 }) });
  assert(fin.status >= 400, `faked run accepted: ${fin.status}`);
  // That was the third attempt: no more today.
  await p.goto(`${APP}/hoje`);
  assert((await p.getByRole("button", { name: /Tentar de novo/ }).count()) === 0, "a fourth attempt is offered");
});

await browser.close();
done();

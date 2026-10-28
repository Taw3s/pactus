// Stage (i): daily chest, collection, weekly challenge and push notifications (fake push service).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ANON, APP, CRON_HEADERS, DIR, FIXTURE, SHOTS, SUPABASE, accessToken, assert, done, launch, loginAs, step, typingTest } from "./lib.mjs";

const browser = await launch();
const as = (email) => loginAs(browser, email);
const pushes = () => {
  const file = path.join(DIR, "push_calls.jsonl");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ana = await as("ana@pacto.test");
let won;
await step("Ana closed the day: the daily chest spins, opens and reveals an item, once", async () => {
  const card = ana.getByTestId("chest-daily");
  await card.getByRole("button", { name: "Abrir baú" }).click();
  await card.getByTestId("chest-item").waitFor();
  won = await card.getByTestId("chest-item").innerText();
  await ana.waitForTimeout(400);
  await ana.screenshot({ path: `${SHOTS}/i1-bau-aberto.png` });
  await ana.reload();
  await ana.getByTestId("chest-daily").getByTestId("chest-item").waitFor();
  assert((await ana.getByTestId("chest-daily").getByTestId("chest-item").innerText()) === won, "same item after reload");
  assert((await ana.getByRole("button", { name: "Abrir baú" }).count()) === 0, "chest can be opened again");
});

await step("the item shows in Ana's collection (Perfil), seen by the group", async () => {
  await ana.getByRole("link", { name: "Perfil" }).click();
  await ana.waitForURL("**/historico/**");
  const shelf = ana.getByTestId("collection");
  await shelf.waitFor();
  assert((await ana.getByTestId("collection-count").innerText()) === "1/8", await ana.getByTestId("collection-count").innerText());
  assert((await shelf.locator('[data-owned="true"]').count()) === 1, "one owned slot");
  await shelf.getByText(won, { exact: false }).first().waitFor();
  await ana.screenshot({ path: `${SHOTS}/i2-colecao.png`, fullPage: true });
});

const davi = await as("davi@pacto.test");
await step("someone who didn't close the day sees a locked chest and the weekly challenge", async () => {
  await davi.getByTestId("daily-chest-card").getByText("Feche as 3 metas").waitFor();
  assert((await davi.getByRole("button", { name: "Abrir baú" }).count()) === 0, "open button without closing the day");
  const week = davi.getByTestId("weekly-challenge");
  await week.waitFor();
  assert((await week.locator("[data-week-member]").count()) === 6, "6 members in the challenge");
  // Nobody can open a chest through the API without earning it.
  const token = await accessToken(davi);
  const r = await fetch(`${SUPABASE}/rest/v1/rpc/open_chest`, {
    method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ p_kind: "daily" }),
  });
  assert(r.status >= 400, `open_chest without the day: ${r.status}`);
});

await step("push: Davi turns notices on (fake push service), Caio closes the day -> Davi is nudged once", async () => {
  // A real browser subscription needs Google/Apple push servers; store a valid one for the fake service.
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const b64u = (b) => b.toString("base64url");
  const token = await accessToken(davi);
  const sub = await fetch(`${SUPABASE}/rest/v1/push_subscriptions`, {
    method: "POST",
    headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ endpoint: "http://127.0.0.1:54500/push/davi", p256dh: b64u(ecdh.getPublicKey()), auth: b64u(crypto.randomBytes(16)) }),
  });
  assert(sub.status === 201, `subscribe ${sub.status} ${await sub.text()}`);

  const before = pushes().filter((p) => p.path === "/push/davi").length;
  const caio = await as("caio@pacto.test");
  await typingTest(caio, caio.locator("[data-goal=typing][data-state=pending]"));
  await caio.locator("[data-goal=typing][data-state=done]").waitFor();
  for (const goal of ["reading"]) {
    const card = caio.locator(`[data-goal=${goal}]`);
    await card.locator("input[type=file]").setInputFiles(FIXTURE);
    if (goal === "reading") await card.getByTestId("pages").fill("9");
    await card.getByRole("button", { name: "Enviar prova" }).click();
    await caio.locator(`[data-goal=${goal}][data-state=done]`).waitFor();
  }
  for (let i = 0; i < 40 && pushes().filter((p) => p.path === "/push/davi").length === before; i++) await wait(250);
  const got = pushes().filter((p) => p.path === "/push/davi");
  assert(got.length === before + 1, `Davi got ${got.length - before} nudges`);
  const last = got.at(-1);
  assert(last.vapid && last.encoding === "aes128gcm" && last.bytes > 50, `encrypted, signed push: ${JSON.stringify(last)}`);
  // Calling again the same day sends nothing new.
  const again = await caio.evaluate(async () => (await fetch("/api/progress", { method: "POST" })).json());
  assert(again.nudged === 0, `second nudge ${JSON.stringify(again)}`);
});

await step("daily reminder (cron): pending members get one reminder a day", async () => {
  const before = pushes().filter((p) => p.path === "/push/davi").length;
  const r1 = await fetch(`${APP}/api/cron/remind`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r1.reminded >= 1, `reminded ${JSON.stringify(r1)}`);
  const r2 = await fetch(`${APP}/api/cron/remind`, { headers: CRON_HEADERS }).then((r) => r.json());
  assert(r2.reminded === 0, `second run reminded ${JSON.stringify(r2)}`);
  assert(pushes().filter((p) => p.path === "/push/davi").length === before + 1, "exactly one reminder for Davi");
});

await step("settings show the notices section", async () => {
  await davi.goto(`${APP}/config`);
  await davi.getByTestId("push-settings").waitFor();
  await davi.getByRole("heading", { name: /Avisos/ }).waitFor();
});

await browser.close();
done();

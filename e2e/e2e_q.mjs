// Stage (q): drafts of the proof forms survive a reload on this device, per person, group, day, goal and form,
// never come back for another account or another day, and go away after a confirmed send and on logout.
// Photos are never kept. Blocked storage does not stop anyone from sending a proof.
// Each person has a challenge of their own, so nothing here depends on the other stages' groups.
import AxeBuilder from "@axe-core/playwright";
import { APP, FIXTURE, assert, done, launch, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();

async function newChallenge(name, s) {
  s ??= await newPhone(browser);
  const p = s.page;
  await p.goto(`${APP}/join?criar=1`);
  await p.fill("#name", name);
  await p.fill("#email", `${name.toLowerCase()}.rascunho@pacto.test`);
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", `Rascunhos da ${name}`);
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  return { ...s, id: sql(`select user_id from members where display_name = '${name}'`) };
}

async function login(p, name) {
  await p.goto(`${APP}/login`);
  await p.fill("#email", `${name.toLowerCase()}.rascunho@pacto.test`);
  await p.fill("#password", "senha123");
  await p.click("button:text-is('Entrar')");
  await p.waitForURL("**/hoje");
}

/** Every draft on the device: { key: parsed value }. */
const drafts = (p) =>
  p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith("pacto:draft:")).map((k) => [k, JSON.parse(localStorage.getItem(k))])));
const form = (p, goal, state = "pending") => p.locator(`[data-goal=${goal}][data-state=${state}]`);
const ANSWER = "Revisei recursão com três exercícios e anotei onde errei na condição de parada.";

let rita;
await step("what was typed in study, reading and project comes back after a reload; photos do not", async () => {
  rita = await newChallenge("Rita");
  const p = rita.page;
  const study = form(p, "study");
  await study.getByTestId("minutes").fill("75");
  await study.locator("textarea").fill(ANSWER);
  await study.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await form(p, "reading").getByTestId("pages").fill("17");
  await form(p, "project").getByTestId("title").fill("Calculadora em Python");
  await form(p, "project").getByTestId("project-url").fill("https://github.com/rita/calculadora");
  await p.reload();
  await study.getByTestId("draft-restored").waitFor();
  assert((await study.getByTestId("minutes").inputValue()) === "75", "minutes not restored");
  assert((await study.locator("textarea").inputValue()) === ANSWER, "answer not restored");
  assert((await study.getByTestId("photo-previews").count()) === 0, "a photo came back");
  assert((await form(p, "reading").getByTestId("pages").inputValue()) === "17", "pages not restored");
  assert((await form(p, "project").getByTestId("title").inputValue()) === "Calculadora em Python", "title not restored");
  assert((await form(p, "project").getByTestId("project-url").inputValue()) === "https://github.com/rita/calculadora", "link not restored");
  const stored = await drafts(p);
  assert(Object.keys(stored).length === 3, `drafts: ${Object.keys(stored).join(", ")}`);
  for (const [k, v] of Object.entries(stored)) {
    assert(k.includes(rita.id) && v.userId === rita.id, `draft of someone else: ${k}`);
    for (const f of Object.keys(v.fields)) assert(["summary", "minutes", "pages", "title", "projectUrl"].includes(f), `stored ${f}`);
    assert(!JSON.stringify(v).includes("data:"), "a file was stored");
  }
  const axe = await new AxeBuilder({ page: p }).include("[data-goal=study]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  assert(axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`).join("; "));
  for (const w of [320, 1440]) {
    await p.setViewportSize({ width: w, height: 800 });
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${w}`);
  }
  await p.setViewportSize({ width: 390, height: 844 });
});

await step("a confirmed send clears that form's draft only", async () => {
  const p = rita.page;
  const reading = form(p, "reading");
  await reading.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await reading.getByRole("button", { name: "Enviar prova" }).click();
  await form(p, "reading", "done").waitFor();
  const keys = Object.keys(await drafts(p));
  assert(!keys.some((k) => k.endsWith(":reading:first")), "reading draft left after the send");
  assert(keys.some((k) => k.endsWith(":study:first")) && keys.some((k) => k.endsWith(":project:first")), `other drafts lost: ${keys}`);
});

await step("an extra session is a draft of its own: it reopens after a reload and clears when added", async () => {
  const p = rita.page;
  const study = form(p, "study");
  await study.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await study.getByRole("button", { name: "Enviar prova" }).click();
  await form(p, "study", "done").waitFor();
  assert(!Object.keys(await drafts(p)).some((k) => k.endsWith(":study:first")), "study draft left after the send");
  await p.getByRole("button", { name: "Sessão extra de estudo" }).click();
  await form(p, "study", "extra").getByTestId("minutes").fill("25");
  await p.reload();
  const extra = form(p, "study", "extra");
  await extra.getByTestId("draft-restored").waitFor();
  assert((await extra.getByTestId("minutes").inputValue()) === "25", "extra minutes not restored");
  await extra.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await extra.getByRole("button", { name: "Somar sessão" }).click();
  await p.getByTestId("extra-sessions").getByText("25 min").waitFor();
  assert(!Object.keys(await drafts(p)).some((k) => k.endsWith(":study:extra")), "extra draft left after the send");
  await p.reload();
  await p.getByRole("button", { name: "Sessão extra de estudo" }).waitFor();
  assert((await form(p, "study", "extra").count()) === 0, "the extra form reopened with nothing to recover");
});

await step("yesterday's draft never comes back today and is dropped", async () => {
  const p = rita.page;
  await p.evaluate(() => {
    const [k, v] = Object.entries(localStorage).find(([key]) => key.endsWith(":project:first"));
    const d = JSON.parse(v);
    const yesterday = new Date(`${d.day}T12:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    d.day = yesterday.toISOString().slice(0, 10);
    d.fields.title = "Projeto de ontem";
    localStorage.removeItem(k);
    localStorage.setItem(k.replace(/:\d{4}-\d{2}-\d{2}:/, `:${d.day}:`), JSON.stringify(d));
  });
  await p.reload();
  const project = form(p, "project");
  await project.getByTestId("title").waitFor();
  await p.waitForFunction(() => !Object.keys(localStorage).some((k) => k.startsWith("pacto:draft:") && k.endsWith(":project:first")), null, { timeout: 5000 }).catch(() => {});
  assert((await project.getByTestId("title").inputValue()) === "", "yesterday's title came back");
  assert((await project.getByTestId("draft-restored").count()) === 0, "recovered note for yesterday's draft");
  assert(Object.keys(await drafts(p)).length === 0, "yesterday's draft kept");
  // Today's draft again, for the next step.
  await project.getByTestId("title").fill("Calculadora em Python");
});

let tito;
await step("another account on the same device sees none of the first one's drafts", async () => {
  tito = await newChallenge("Tito");
  await tito.ctx.close();
  const p = rita.page;
  assert(Object.keys(await drafts(p)).length === 1, "Rita has no draft to leak");
  // The session ends without logging out (expired, cookies cleared): the draft is still on the device.
  await rita.ctx.clearCookies();
  await login(p, "Tito");
  await form(p, "project").getByTestId("title").waitFor();
  await p.waitForFunction((id) => !Object.keys(localStorage).some((k) => k.includes(id)), rita.id, { timeout: 5000 });
  assert((await form(p, "project").getByTestId("title").inputValue()) === "", "Rita's title shown to Tito");
  assert((await p.getByTestId("draft-restored").count()) === 0, "recovered note shown to Tito");
});

await step("logging out clears every draft on the device", async () => {
  const p = rita.page;
  await form(p, "reading").getByTestId("pages").fill("9");
  await form(p, "study").getByTestId("minutes").fill("40");
  await p.waitForFunction(() => Object.keys(localStorage).filter((k) => k.startsWith("pacto:draft:")).length === 2);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair", exact: true }).click();
  await p.waitForURL("**/login");
  assert(Object.keys(await drafts(p)).length === 0, "drafts left after logout");
  await login(p, "Tito");
  await form(p, "reading").getByTestId("pages").waitFor();
  assert((await form(p, "reading").getByTestId("pages").inputValue()) === "", "a draft came back after logout");
  await rita.ctx.close();
});

await step("blocked storage: the forms still work and the proof goes", async () => {
  const s = await newPhone(browser);
  const errors = [];
  s.page.on("pageerror", (e) => errors.push(e.message));
  await s.ctx.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  });
  const vera = await newChallenge("Vera", s);
  const p = vera.page;
  const reading = form(p, "reading");
  await reading.getByTestId("pages").fill("12");
  await reading.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await reading.getByRole("button", { name: "Enviar prova" }).click();
  await form(p, "reading", "done").waitFor();
  assert(Number(sql(`select count(*) from checkins where user_id = '${vera.id}' and goal = 'reading' and pages = 12`)) === 1, "the proof did not go");
  assert(errors.length === 0, `page errors: ${errors.join("; ")}`);
  await s.ctx.close();
});

await browser.close();
done();

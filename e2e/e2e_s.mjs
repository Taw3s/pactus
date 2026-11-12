// Stage (s): Aprender. Progress belongs to the account (0033): a lesson and a challenge finished on one device show on
// another, never for another account. The playground runs Python and Java locally (Java only with cross-origin
// isolation, which /aprender gets in Chromium). A challenge of its own: nothing depends on the other stages.
import { createRequire } from "node:module";
import { APP, assert, done, launch, newPhone, sql, step } from "./lib.mjs";

const { devices } = createRequire(import.meta.url)("playwright");
const browser = await launch();

async function newChallenge(name, s) {
  s ??= await newPhone(browser);
  const p = s.page;
  await p.goto(`${APP}/join?criar=1`);
  await p.fill("#name", name);
  await p.fill("#email", `${name.toLowerCase()}.aprender@pacto.test`);
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", `Estudos da ${name}`);
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  // By the account's own e-mail: display names repeat across stages.
  return { ...s, id: sql(`select id from auth.users where email = '${name.toLowerCase()}.aprender@pacto.test'`) };
}

async function login(p, name) {
  await p.goto(`${APP}/login`);
  await p.fill("#email", `${name.toLowerCase()}.aprender@pacto.test`);
  await p.fill("#password", "senha123");
  await p.click("button:text-is('Entrar')");
  await p.waitForURL("**/hoje");
}

/** Finishes the beginner challenge of a language by typing the reference, then opens its playground. */
async function finishChallenge(p, language) {
  await p.getByRole("tab", { name: "Desafios" }).click();
  await p.getByLabel("Linguagem").selectOption(language);
  const panel = p.getByTestId("language-code-challenge");
  const solution = await panel.locator("pre[aria-hidden=true]").first().innerText();
  await panel.getByRole("textbox").first().fill(solution);
  await panel.getByRole("button", { name: "Conferir resposta" }).click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor({ timeout: 15000 });
  await panel.getByRole("button", { name: "Abrir exemplo e playground" }).click();
  return panel.getByTestId("code-playground");
}

async function run(playground, timeout) {
  await playground.getByRole("button", { name: "Executar" }).click();
  await playground.page().waitForFunction(() => !document.querySelector("[data-testid=code-playground] button[disabled]"), null, { timeout });
  return playground.locator("[aria-live=polite]").last().innerText();
}

let lia;
await step("a lesson finished on the phone is saved in the account and shows as done on another device", async () => {
  lia = await newChallenge("Lia");
  const p = lia.page;
  await p.goto(`${APP}/aprender`);
  await p.getByText("O progresso fica na sua conta").waitFor();
  await p.getByRole("button", { name: "Marcar como concluída" }).click();
  await p.getByRole("button", { name: "Concluída", exact: true }).waitFor();
  assert(sql(`select count(*) from learning_progress where user_id = '${lia.id}' and kind = 'lesson'`) === "1", "lesson row");
  const other = await newPhone(browser);
  await login(other.page, "Lia");
  await other.page.goto(`${APP}/aprender`);
  await other.page.getByRole("button", { name: "Concluída", exact: true }).waitFor();
  await other.ctx.close();
});

await step("a challenge finished by typing the reference keeps its score in the account; the playground runs Python locally", async () => {
  const p = lia.page;
  const playground = await finishChallenge(p, "python");
  assert(sql(`select best_score from learning_progress where user_id = '${lia.id}' and item_id = 'python:beginner:pt'`) === "1", "challenge score");
  const expected = await p.getByText("Resultado do exemplo").locator("..").locator("pre").innerText();
  const out = await run(playground, 60000);
  assert(out.includes(expected.trim()), `python output: ${out.slice(0, 300)}`);
});

await step("another account sees none of it", async () => {
  const rui = await newChallenge("Rui");
  await rui.page.goto(`${APP}/aprender`);
  await rui.page.getByRole("button", { name: "Marcar como concluída" }).waitFor();
  assert(sql(`select count(*) from learning_progress where user_id = '${rui.id}'`) === "0", "no rows for Rui");
  await rui.ctx.close();
});

await step("on desktop Chromium /aprender is cross-origin isolated and Java compiles and runs on the device", async () => {
  const ctx = await browser.newContext({ ...devices["Desktop Chrome"], locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const p = await ctx.newPage();
  await login(p, "Lia");
  const res = await p.goto(`${APP}/aprender`);
  assert(res.headers()["cross-origin-embedder-policy"] === "credentialless", `COEP ${res.headers()["cross-origin-embedder-policy"]}`);
  assert(await p.evaluate(() => crossOriginIsolated), "crossOriginIsolated");
  const playground = await finishChallenge(p, "java");
  const expected = await p.getByText("Resultado do exemplo").locator("..").locator("pre").innerText();
  const out = await run(playground, 150000);
  assert(out.includes(expected.trim()) && out.includes("código 0"), `java output: ${out.slice(0, 300)}`);
  await ctx.close();
});

await browser.close();
done();

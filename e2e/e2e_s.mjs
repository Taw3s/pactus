// Stage (s): Aprender. Progress belongs to the account (0033): a lesson and a challenge finished on one device show on
// another, never for another account. Java runs on the device (only with cross-origin isolation, which /aprender gets in
// Chromium); Python, SQL and Bash need the isolated host and stay paused without it (their challenges refuse to check too). A challenge of its own: nothing depends on the other stages.
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
  // "Sem visualizador" is the default now (13/11/2026); typing the reference is the 1-point visualizer mode.
  assert((await panel.getByTestId("mode-hints").getAttribute("aria-pressed")) === "true", "no-visualizer by default");
  assert((await panel.getByText(/^Dica 1 de/).count()) === 0, "no hint shown before asking");
  await panel.getByTestId("mode-visualizer").click();
  const solution = await panel.locator("pre[aria-hidden=true]").first().innerText();
  await panel.getByRole("textbox").first().fill(solution);
  await panel.getByRole("button", { name: "Conferir resposta" }).click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor({ timeout: 15000 });
  await panel.getByRole("button", { name: "Abrir no playground" }).click();
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

await step("a challenge finished by typing the reference keeps its score in the account; without an isolated host Python stays paused", async () => {
  const p = lia.page;
  const playground = await finishChallenge(p, "python");
  assert(sql(`select best_score from learning_progress where user_id = '${lia.id}' and item_id = 'python:beginner:pt'`) === "1", "challenge score");
  // The CI build has no NEXT_PUBLIC_ISOLATED_ORIGIN: Python, SQL and Bash must not run on the signed-in origin.
  await playground.getByText("Python, SQL e Bash estão pausados até configurar o hostname separado do interpretador.").waitFor();
  assert(await playground.getByRole("button", { name: "Executar" }).isDisabled(), "Executar stays disabled");
  assert((await p.locator("iframe[title='Interpretador isolado de código']").count()) === 0, "no runner frame");
});

await step("all 8 Bash exercises are reachable; without the isolated host the run-based check refuses instead of comparing text", async () => {
  const p = lia.page;
  await p.getByRole("tab", { name: "Desafios" }).click();
  await p.getByLabel("Linguagem").selectOption("bash");
  const options = await p.getByTestId("bash-exercise").locator("option").allInnerTexts();
  assert(options.length === 8, `bash exercises ${options.length}`);
  const panel = p.getByTestId("language-code-challenge");
  for (const [i, value] of (await p.getByTestId("bash-exercise").locator("option").evaluateAll((os) => os.map((o) => o.value))).entries()) {
    await p.getByTestId("bash-exercise").selectOption(value);
    await panel.getByText(`Caso 1:`, { exact: false }).first().waitFor();
    assert((await panel.getByRole("heading").first().innerText()).length > 0, `exercise ${i + 1}`);
  }
  // Hints cost points; revealing the solution is worth 1, like the visualizer.
  await panel.getByText("Esta tentativa vale até 5 ponto(s).").waitFor();
  await panel.getByTestId("hint-next").click();
  await panel.getByText("Esta tentativa vale até 4 ponto(s).").waitFor();
  for (let i = 0; i < 3; i++) await panel.getByTestId("hint-next").click();
  await panel.getByText("Esta tentativa vale até 1 ponto(s).").waitFor();
  await panel.getByTestId("challenge-answer").fill("echo oi");
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText(/interpretador isolado, que não está disponível aqui/).waitFor();
  assert((await panel.getByTestId("challenge-output").count()) === 0, "no output before an approved run");
});

await step("Python and SQL answers are checked by running them: without the isolated host even the exact reference is refused, never compared as text", async () => {
  const p = lia.page;
  await p.getByRole("tab", { name: "Desafios" }).click();
  const panel = p.getByTestId("language-code-challenge");
  for (const [language, level, item] of [["python", "easy", "python:easy:pt"], ["sql", "medium", "sql:medium:pt"]]) {
    await p.getByLabel("Linguagem").selectOption(language);
    await p.getByLabel("Nível").selectOption(level);
    assert((await panel.getByTestId("mode-hints").getAttribute("aria-pressed")) === "true", `${language}: no-visualizer by default`);
    // The cases are listed before any attempt (what goes in), and SQL shows the tables each case creates.
    const listed = panel.getByRole("list", { name: "Casos conferidos" }).getByRole("listitem");
    assert((await listed.count()) >= 2, `${language}: ${await listed.count()} cases`);
    if (language === "python") await listed.first().getByText("entrada: “ana bia caio”").waitFor();
    else {
      await listed.first().getByText("Ver as tabelas deste caso").click();
      await listed.first().getByText("tarefas (nome | categoria | concluida)").waitFor();
    }
    await panel.getByRole("button", { name: "Executar e conferir" }).waitFor();
    // Reveal the reference (worth 1 point) and send exactly that text: before, this was approved by comparing text.
    for (let i = 0; i < 4; i++) await panel.getByTestId("hint-next").click();
    await panel.getByText("Esta tentativa vale até 1 ponto(s).").waitFor();
    const reference = await panel.getByText("Solução de referência", { exact: true }).locator("xpath=following-sibling::pre").innerText();
    assert(reference.includes(language === "python" ? "input()" : "FROM tarefas"), `${language}: reference reads its data from the case: ${reference}`);
    await panel.getByTestId("challenge-answer").fill(reference);
    await panel.getByTestId("challenge-submit").click();
    await panel.getByText(/interpretador isolado, que não está disponível aqui/).waitFor();
    assert((await panel.getByTestId("challenge-output").count()) === 0, `${language}: no output before an approved run`);
    assert((await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").count()) === 0, `${language}: not completed`);
    assert(sql(`select count(*) from learning_progress where user_id = '${lia.id}' and item_id = '${item}'`) === "0", `${language}: no score saved`);
  }
  assert((await p.locator("iframe[title='Interpretador isolado dos desafios']").count()) === 0, "no runner frame without the isolated host");
});

await step("typing: Código mode with Bash ends at the end of the code and offers Recomeçar", async () => {
  const p = lia.page;
  await p.goto(`${APP}/hoje`);
  const typing = p.locator("[data-goal=typing][data-state=pending]");
  await typing.getByTestId("typing-mode-code").click();
  await typing.getByTestId("typing-text-code-bash-printf").click();
  await typing.getByRole("button", { name: "Começar teste" }).click();
  const input = typing.getByTestId("typing-input");
  await input.waitFor();
  for (let n = 0; n < 10 && (await typing.getByTestId("typing-test").getAttribute("data-phase").catch(() => "gone")) === "running"; n++) {
    const word = await typing.getByTestId("typing-word-current").innerText().catch(() => "");
    if (!word) break;
    await input.pressSequentially(`${word} `, { delay: 5 }).catch(() => {});
  }
  await p.getByTestId("typing-moved").getByText(/Texto concluído/).waitFor({ timeout: 15000 });
  assert(sql(`select words from typing_progress where user_id = '${lia.id}' and text_id = 'code-bash-printf'`) === "5", "place at the end, not wrapped");
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

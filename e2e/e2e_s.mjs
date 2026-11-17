// Stage (s): Aprender. Progress belongs to the account (0033): a lesson and a challenge finished on one device show on
// another, never for another account. Java runs on the device (only with cross-origin isolation, which /aprender gets in
// Chromium); Python, SQL and Bash need the isolated host and stay paused without it (their challenges refuse to check too).
// JavaScript, TypeScript and Web challenges are checked in a frame of the page, Java ones by compiling on the device (refused
// without cross-origin isolation); only Fundamentos (pseudocode) compares text. A challenge of its own: nothing depends on the other stages.
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

/** Reveals the reference solution of the challenge on screen (worth 1 point) and returns its text. */
async function revealReference(panel) {
  for (let i = 0; i < 4; i++) await panel.getByTestId("hint-next").click();
  await panel.getByText("Esta tentativa vale até 1 ponto(s).").waitFor();
  return panel.getByText("Solução de referência", { exact: true }).locator("xpath=following-sibling::pre").innerText();
}

await step("JavaScript, TypeScript and Web answers are checked by what they do, in a frame of the page: a fixed answer fails with expected × got, the right one is approved", async () => {
  const p = lia.page;
  await p.getByRole("tab", { name: "Desafios" }).click();
  const panel = p.getByTestId("language-code-challenge");
  const rows = (item) => sql(`select coalesce(max(best_score)::text, 'none') from learning_progress where user_id = '${lia.id}' and item_id = '${item}'`);

  await p.getByLabel("Linguagem").selectOption("javascript");
  await p.getByLabel("Nível").selectOption("beginner");
  const listed = panel.getByRole("list", { name: "Casos conferidos" }).getByRole("listitem");
  assert((await listed.count()) === 3, `javascript: ${await listed.count()} cases`);
  await listed.first().getByText('entrada: “[{"nome":"Ler","ativa":true},{"nome":"Pausar","ativa":false}]”').waitFor();
  // The text of the first case's result: right for that case only.
  await panel.getByTestId("challenge-answer").fill('console.log("Ler")');
  await panel.getByRole("button", { name: "Executar e conferir" }).click();
  const failed = panel.getByTestId("challenge-cases").getByRole("listitem");
  await failed.nth(1).getByText("Ler, Revisar").waitFor();
  assert((await failed.nth(0).innerText()).startsWith("✓") && (await failed.nth(1).innerText()).startsWith("✗"), "case 1 passes, case 2 fails");
  assert((await panel.getByTestId("challenge-output").count()) === 0, "javascript: no output before an approved run");
  assert(rows("javascript:beginner:pt") === "none", "javascript: a failed answer saves nothing");
  // An endless loop is stopped and fails; a syntax error shows the compiler's message. Neither shows the solution.
  await panel.getByTestId("challenge-answer").fill("while (true) {}");
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText(/Loop interrompido/).first().waitFor({ timeout: 20000 });
  await panel.getByTestId("challenge-answer").fill("console.log(entrada.length");
  await panel.getByTestId("challenge-submit").click();
  await panel.getByTestId("challenge-run-error").getByText("')' expected.").waitFor();
  assert((await panel.getByText("const ativas").count()) === 0, "the solution is not shown");
  // An answer written another way, with no help: approved, 5 points, and only now its output.
  await panel.getByTestId("challenge-answer").fill('const nomes = [];\nfor (const tarefa of entrada) {\n  if (tarefa.ativa) nomes.push(tarefa.nome);\n}\nconsole.log(nomes.join(", "));');
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor();
  await panel.getByTestId("challenge-output").getByText("Ler, Revisar").waitFor();
  assert(rows("javascript:beginner:pt") === "5", `javascript score ${rows("javascript:beginner:pt")}`);
  // In the playground the approved answer gets the first case's value.
  await panel.getByRole("button", { name: "Abrir sua resposta no playground" }).click();
  const out = await run(panel.getByTestId("code-playground"), 20000);
  assert(out.includes("Ler"), `playground output: ${out.slice(0, 200)}`);

  // TypeScript: the reference (revealed: 1 point) reads the case's value too.
  await p.getByLabel("Linguagem").selectOption("typescript");
  await p.getByLabel("Nível").selectOption("hard");
  const tsReference = await revealReference(panel);
  assert(tsReference.includes("declare const entrada: Evento;"), `typescript reference: ${tsReference}`);
  await panel.getByTestId("challenge-answer").fill(tsReference);
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor();
  assert(rows("typescript:hard:pt") === "1", `typescript score ${rows("typescript:hard:pt")}`);

  // Web: the page comes from the case (three widths); a fixed number of columns is right at one width only.
  await p.getByLabel("Linguagem").selectOption("web");
  await p.getByLabel("Nível").selectOption("medium");
  await listed.first().getByText("Ver a página deste caso").waitFor();
  await panel.getByTestId("challenge-answer").fill(".cartoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }");
  await panel.getByRole("button", { name: "Montar e conferir" }).click();
  await failed.nth(1).getByText("colunas: 2").waitFor();
  await failed.nth(1).getByText("colunas: 3").waitFor();
  assert((await panel.getByTestId("challenge-output").count()) === 0 && rows("web:medium:pt") === "none", "web: nothing shown or saved for a failed answer");
  await panel.getByTestId("challenge-answer").fill(".cartoes { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 1rem; }");
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor();
  assert(rows("web:medium:pt") === "5", `web score ${rows("web:medium:pt")}`);
  assert((await p.locator("iframe[title='Conferência do desafio']").count()) === 0, "the check frames are gone");

  // Fundamentos is pseudocode: nothing runs it, so it still compares the text and lists no cases.
  await p.getByLabel("Linguagem").selectOption("fundamentals");
  await panel.getByRole("button", { name: "Conferir resposta" }).waitFor();
  assert((await panel.getByRole("list", { name: "Casos conferidos" }).count()) === 0, "fundamentals: no cases");
});

await step("Java without its runtime (a page without cross-origin isolation): even the exact reference is refused, with no output and no row in learning_progress", async () => {
  // A browser without cross-origin isolation (Safari, Firefox). Whether the phone profile gets the headers depends on the
  // browser build, so this context has no service worker (it would answer the page without the route) and the page is
  // loaded without the headers on purpose; the check is then the same everywhere.
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR", timezoneId: "America/Sao_Paulo", serviceWorkers: "block" });
  const p = await ctx.newPage();
  await login(p, "Lia");
  let stripped = 0;
  await p.route("**/aprender", async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["cross-origin-opener-policy"];
    delete headers["cross-origin-embedder-policy"];
    stripped++;
    await route.fulfill({ response, headers });
  });
  const res = await p.goto(`${APP}/aprender`);
  const isolated = await p.evaluate(() => crossOriginIsolated);
  assert(!isolated, `the page is not cross-origin isolated (route ran ${stripped}x; COOP ${res.headers()["cross-origin-opener-policy"]}, COEP ${res.headers()["cross-origin-embedder-policy"]}; ${await p.evaluate(() => navigator.userAgent)})`);
  await p.getByRole("tab", { name: "Desafios" }).click();
  const panel = p.getByTestId("language-code-challenge");
  await p.getByLabel("Linguagem").selectOption("java");
  await p.getByLabel("Nível").selectOption("easy");
  const listed = panel.getByRole("list", { name: "Casos conferidos" }).getByRole("listitem");
  await listed.first().getByText("entrada: “Ana Bruno Bia Caio”").waitFor();
  const reference = await revealReference(panel);
  assert(reference.includes("new InputStreamReader(System.in)"), `java reference reads its data from the case: ${reference}`);
  await panel.getByTestId("challenge-answer").fill(reference);
  await panel.getByRole("button", { name: "Executar e conferir" }).click();
  await panel.getByText(/compilador Java precisa de isolamento entre origens/).waitFor();
  assert((await panel.getByTestId("challenge-output").count()) === 0, "java: no output before an approved run");
  assert((await panel.getByTestId("challenge-cases").count()) === 0, "java: no case was run");
  assert((await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").count()) === 0, "java: not completed");
  assert(sql(`select count(*) from learning_progress where user_id = '${lia.id}' and item_id = 'java:easy:pt'`) === "0", "java: no score saved");
  await ctx.close();
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

  // With the runtime, the Java challenge is checked by compiling and running the answer once per case (standard input).
  const panel = p.getByTestId("language-code-challenge");
  await p.getByLabel("Nível").selectOption("easy");
  await panel.getByTestId("mode-hints").click();
  await panel.getByTestId("challenge-answer").fill('public class Main { public static void main(String[] args) { System.out.println("[Bruno, Caio]"); } }');
  await panel.getByTestId("challenge-submit").click();
  const failed = panel.getByTestId("challenge-cases").getByRole("listitem");
  await failed.nth(1).getByText("[]", { exact: true }).waitFor({ timeout: 150000 });
  assert((await failed.nth(0).innerText()).startsWith("✓") && (await failed.nth(1).innerText()).startsWith("✗"), "java: the fixed answer passes case 1 only");
  assert(sql(`select count(*) from learning_progress where user_id = '${lia.id}' and item_id = 'java:easy:pt'`) === "0", "java: a failed answer saves nothing");
  const reference = await revealReference(panel);
  await panel.getByTestId("challenge-answer").fill(reference);
  await panel.getByTestId("challenge-submit").click();
  await panel.getByText("Desafio concluído. Seu progresso ficou guardado na sua conta.").waitFor({ timeout: 150000 });
  await panel.getByTestId("challenge-output").getByText("[Davi, Fernanda]").waitFor();
  assert(sql(`select best_score from learning_progress where user_id = '${lia.id}' and item_id = 'java:easy:pt'`) === "1", "java: approved by running, 1 point after the reveal");
  await ctx.close();
});

await browser.close();
done();

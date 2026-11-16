import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ts from "typescript";
import { buildScriptCaseDocument, checkScriptAnswer, compareScriptReports, SCRIPT_CHECKS, scriptPlaygroundPrelude, type ScriptLanguage } from "./script-challenge-checks";
import { openTestBrowser, type TestBrowser } from "./test-chromium";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "./typing-language-challenges";
import type { BashDifficulty } from "./typing-code";

const TOKEN = "PACTO_TESTTOKEN00001";
const LEVELS: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const LANGUAGES: ScriptLanguage[] = ["javascript", "typescript"];
const LANGS = ["pt", "en"] as const;

function challenge(language: ScriptLanguage, level: BashDifficulty) {
  return level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === language)!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES[language]![level];
}

describe("JavaScript and TypeScript challenge checks", () => {
  let chromium: TestBrowser;
  beforeAll(async () => {
    chromium = await openTestBrowser();
  }, 60000);
  afterAll(() => chromium?.close());

  const check = async (code: string, language: ScriptLanguage, level: BashDifficulty, lang: "pt" | "en") => {
    const outcome = await checkScriptAnswer(ts, code, language, level, lang, TOKEN, chromium.runFrames);
    if ("errors" in outcome) throw new Error(outcome.errors);
    return outcome.results;
  };
  const oks = async (...args: Parameters<typeof check>) => (await check(...args)).map((r) => r.ok);

  it("have at least two cases with different expected output for every language, level and idiom", () => {
    for (const language of LANGUAGES) for (const level of LEVELS) for (const lang of LANGS) {
      expect(new Set(SCRIPT_CHECKS[language][level].map((c) => c.expect[lang].join("\n"))).size, `${language} ${level} ${lang}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("refuse a token that is not random-looking", () => {
    expect(() => buildScriptCaseDocument("", 1, "pt", "x", 0)).toThrow();
  });

  it("accept every reference solution, in a real Chromium, and show its first case as the expected result", async () => {
    for (const language of LANGUAGES) for (const level of LEVELS) for (const lang of LANGS) {
      const results = await check(challenge(language, level).solution[lang], language, level, lang);
      expect(results.every((r) => r.ok), `${language} ${level} ${lang}: ${JSON.stringify(results)}`).toBe(true);
      expect(challenge(language, level).output[lang], `${language} ${level} ${lang}`).toBe(SCRIPT_CHECKS[language][level][0].expect[lang].join("\n"));
    }
  }, 120000);

  it("reject fixed answers, wrong filters and answers that carry their own data", async () => {
    // Printing the expected text of the first case passes that case only.
    expect(await oks('console.log("Ler")', "javascript", "beginner", "pt")).toEqual([true, false, false]);
    expect(await oks("console.log(25)", "javascript", "medium", "pt")).toEqual([true, false, false]);
    expect(await oks('console.log("Pending")', "typescript", "beginner", "en")).toEqual([true, false]);
    // The answer of before this change (the list inside the answer) is a fixed answer now.
    expect(await oks('const tarefas = [\n  { nome: "Ler", ativa: true },\n  { nome: "Pausar", ativa: false },\n];\nconst ativas = tarefas.filter((tarefa) => tarefa.ativa);\nconsole.log(ativas.map((tarefa) => tarefa.nome).join(", "));', "javascript", "beginner", "pt")).toEqual([true, false, false]);
    // Wrong filter: keeps the paused tasks.
    const wrong = await check('console.log(entrada.filter((t) => !t.ativa).map((t) => t.nome).join(", "))', "javascript", "beginner", "pt");
    expect(wrong.map((r) => r.ok)).toEqual([false, false, false]);
    expect(wrong[0]).toMatchObject({ got: ["Pausar"], expected: ["Ler"] });
    // Wrong order: categories as they appear, not sorted.
    expect(await oks("const t = {};\nfor (const i of entrada) t[i.categoria] = (t[i.categoria] ?? 0) + i.valor;\nfor (const c in t) console.log(`${c}: ${t[c]}`);", "javascript", "expert", "pt")).toEqual([false, false]);
    // Declaring the case's variable again is an error in every case, not a way to choose the data.
    const again = await check('const entrada = [{ nome: "Ler", ativa: true }];\nconsole.log(entrada.map((t) => t.nome).join(", "));', "javascript", "beginner", "pt");
    expect(again.map((r) => r.ok)).toEqual([false, false, false]);
    expect(again[0].error).toMatch(/SyntaxError/);
  }, 120000);

  it("accept another way of writing it, and check TypeScript by what it does", async () => {
    expect(await oks('const nomes = [];\nfor (const tarefa of entrada) {\n  if (tarefa.ativa) nomes.push(tarefa.nome);\n}\nconsole.log(nomes.join(", "));', "javascript", "beginner", "pt")).toEqual([true, true, true]);
    expect(await oks("let total = 0;\nentrada.forEach((valor) => { total += valor; });\nconsole.log(total);", "javascript", "medium", "pt")).toEqual([true, true, true]);
    // Several arguments are joined by a space; output printed by a promise still counts.
    expect(await oks('Promise.resolve().then(() => console.log(input.completed ? "Done" : "Pending"));', "typescript", "beginner", "en")).toEqual([true, true]);
    expect(await oks("declare const input: unknown[];\nconst [head] = input;\nconsole.log(head);", "typescript", "medium", "en")).toEqual([true, true, true]);
    expect(await oks("for (const [k, v] of Object.entries(Object.groupBy(entrada, (p: any) => p.setor)).sort()) console.log(k + ':', (v as any[]).map((p) => p.nome).join(', '));", "typescript", "expert", "pt")).toEqual([true, true]);
  }, 120000);

  it("stop an infinite loop, report errors per case and keep the cases apart", async () => {
    const started = Date.now();
    const loop = await check("while (true) {}\nconsole.log(25);", "javascript", "medium", "pt");
    expect(loop.map((r) => r.ok)).toEqual([false, false, false]);
    expect(loop[0].error).toMatch(/Loop interrompido/);
    expect(Date.now() - started).toBeLessThan(15000);
    // A loop only one case enters fails that case; the others still run.
    expect(await oks("while (entrada.length === 0) {}\nconsole.log(entrada.reduce((a, b) => a + b, 0));", "javascript", "medium", "pt")).toEqual([true, false, true]);
    // An error in one case comes with its message; an answer that never reports "done" (it leaves the page) fails.
    const crash = await check("console.log(entrada[0].toFixed(0))", "typescript", "medium", "pt");
    expect(crash.map((r) => r.ok)).toEqual([true, false, false]);
    expect(crash[1].error).toMatch(/^TypeError/);
    expect((await check("console.log(25", "javascript", "medium", "pt").catch((e: Error) => e.message))).toMatch(/expected/);
    // Each case starts in a new document: a global left by one case is not there in the next.
    expect(await oks("if (globalThis.visto) console.log('de novo');\nglobalThis.visto = true;\nconsole.log(entrada.reduce((a, b) => a + b, 0));", "javascript", "medium", "pt")).toEqual([true, true, true]);
    // console.error and console.warn are not output; the frame has no network and cannot reach the page that holds it.
    expect(await oks("console.error('x');\nconsole.warn('y');\nconsole.log(entrada.reduce((a, b) => a + b, 0));", "javascript", "medium", "pt")).toEqual([true, true, true]);
    const fenced = await check("let net = 'blocked';\ntry { const x = new XMLHttpRequest(); x.open('GET', '/', false); x.send(); net = 'open'; } catch {}\nlet page = 'blocked';\ntry { page = parent.document.title; } catch {}\nlet store = 'blocked';\ntry { localStorage.setItem('a', '1'); store = 'open'; } catch {}\nconsole.log(net, page, store);", "javascript", "medium", "pt");
    expect(fenced[0].got).toEqual(["blocked blocked blocked"]);
    // A forged message without the frame's token and index is ignored; forging with them is possible (see CLAUDE.md).
    expect(await oks("parent.postMessage({ bridge: 'x', index: 0, kind: 'line', text: '25' }, '*');", "javascript", "medium", "pt")).toEqual([false, false, false]);
  }, 120000);

  it("fail every case without reports, and build the playground prelude from the first case", () => {
    const cases = SCRIPT_CHECKS.javascript.easy;
    expect(compareScriptReports([], cases, "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(compareScriptReports([{ lines: ['["ANA","BIA","CAIO"]'], error: "", done: false }, { lines: ['["LIA"]'], error: "", done: true }], cases, "pt").map((r) => r.ok)).toEqual([false, true]);
    expect(scriptPlaygroundPrelude(cases[0], "en")).toBe('const input = ["ana","bia","caio"];\n\n');
  });
});

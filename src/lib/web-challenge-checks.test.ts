import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWebCaseDocument, compareWebReports, WEB_CASE_TIMEOUT_MS, WEB_CHECKS, webExpectedLines, webFrameSpecs } from "./web-challenge-checks";
import { openTestBrowser, type TestBrowser } from "./test-chromium";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "./typing-language-challenges";
import type { BashDifficulty } from "./typing-code";

const TOKEN = "PACTO_TESTTOKEN00002";
const LEVELS: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const LANGS = ["pt", "en"] as const;

function reference(level: BashDifficulty, lang: "pt" | "en") {
  return (level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === "web")!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES.web![level]).solution[lang];
}

describe("Web challenge checks", () => {
  let chromium: TestBrowser;
  beforeAll(async () => {
    chromium = await openTestBrowser();
  }, 60000);
  afterAll(() => chromium?.close());

  const check = async (answer: string, level: BashDifficulty, lang: "pt" | "en") =>
    compareWebReports(await chromium.runFrames(webFrameSpecs(answer, level, lang, TOKEN), TOKEN, WEB_CASE_TIMEOUT_MS), level, lang);
  const oks = async (...args: Parameters<typeof check>) => (await check(...args)).map((r) => r.ok);

  it("have at least two cases per level, and refuse a token that is not random-looking", () => {
    for (const level of LEVELS) expect(WEB_CHECKS[level].cases.length, level).toBeGreaterThanOrEqual(2);
    expect(() => buildWebCaseDocument("", WEB_CHECKS.easy, WEB_CHECKS.easy.cases[0], "pt", "x", 0)).toThrow();
  });

  it("accept every reference solution in a real Chromium", async () => {
    for (const level of LEVELS) for (const lang of LANGS) {
      const results = await check(reference(level, lang), level, lang);
      expect(results.every((r) => r.ok), `${level} ${lang}: ${JSON.stringify(results)}`).toBe(true);
    }
  }, 120000);

  it("reject pages that only look right in the text", async () => {
    // The right words in the wrong places: no lang, the button outside main and without a type.
    const loose = await check("<title>Aviso</title><main><h1>Aviso</h1><p>Seu progresso foi salvo.</p></main><button>Entendi</button>", "beginner", "pt");
    expect(loose.map((r) => r.ok)).toEqual([false, false]);
    expect(loose[0].got[0]).toBe("idioma declarado em <html>: não");
    expect(loose[1].got.slice(2)).toEqual(["botão: (nada)", "tipo do botão: (nada)"]);
    // A label that is only near the field leads nowhere; a field that is not required accepts nothing typed.
    expect(await oks('<form><label>Nome</label><input name="nome"><button>Enviar</button></form>', "easy", "pt")).toEqual([false, false, true]);
    // Another way of writing it passes: the label wrapping the field, the button as an input would not (it has no text).
    expect(await oks('<form><label>Nome <input name="nome" required></label><button>Enviar</button></form>', "easy", "pt")).toEqual([true, true, true]);
    // A text field marked required takes any text for an email; an email field that is not required takes nothing.
    expect(await oks('<label for="e">E-mail</label><input id="e" required aria-describedby="a"><p id="a">Ajuda</p>', "hard", "pt")).toEqual([false, true, false, true]);
    expect(await oks('<label for="e">E-mail</label><input id="e" type="email" aria-describedby="a"><p id="a">Ajuda</p>', "hard", "pt")).toEqual([true, false, true, true]);
    // aria-describedby pointing at nothing.
    expect((await check('<label for="e">E-mail</label><input id="e" type="email" required aria-describedby="nada">', "hard", "pt"))[0].got[2]).toMatch(/: não$/);
  }, 120000);

  it("count the grid's columns at each width the case gives (the page comes from the case)", async () => {
    // A fixed number of columns is right at one width only.
    const fixed = await check(".cartoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }", "medium", "pt");
    expect(fixed.map((r) => r.ok)).toEqual([true, false, false]);
    expect(fixed[1].got[1]).toBe("colunas: 3");
    expect(fixed[1].expected[1]).toBe("colunas: 2");
    // A smaller minimum gives one column too many at 800 px; no gap fails every width.
    expect(await oks(".cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; }", "medium", "en")).toEqual([false, true, true]);
    expect(await oks(".cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }", "medium", "en")).toEqual([false, false, false]);
    // Other ways of writing it pass: auto-fill, the long gap property, pixels.
    expect(await oks(".cartoes { display: grid; grid-template-columns: repeat(auto-fill, minmax(224px, 1fr)); column-gap: 16px; row-gap: 16px }", "medium", "pt")).toEqual([true, true, true]);
    // Markup in the answer does not replace the case's page, and closing the style element early changes nothing.
    expect(await oks('</style><div class="cartoes" style="display:grid"></div><style>', "medium", "pt")).toEqual([false, false, false]);
  }, 120000);

  it("apply the case's motion preference to the answer's own media queries", async () => {
    const page = (css: string) => `<a href="#c">Pular</a><nav aria-label="Principal"><a href="/" aria-current="page">Início</a></nav><main id="c"><h1>Resumo</h1></main><style>${css}</style>`;
    // No media query: the transition stays with reduced motion.
    expect(await oks(page("a { transition: color 150ms }"), "expert", "pt")).toEqual([true, true, false]);
    // No transition at all: nothing to reduce, but the normal case fails.
    expect(await oks(page(""), "expert", "pt")).toEqual([true, false, true]);
    // The opposite way of writing it (motion only for those who did not ask to reduce it) passes.
    expect(await oks(page("@media (prefers-reduced-motion: no-preference) { a { transition: color 0.15s } }"), "expert", "pt")).toEqual([true, true, true]);
    // The skip link must come first and lead to main.
    expect(await oks('<nav aria-label="Principal"><a href="/" aria-current="page">Início</a></nav><a href="#x">Pular</a><main><h1>Resumo</h1></main><p id="x"></p>', "expert", "pt")).toEqual([false, false, true]);

    // The rewrite agrees with the browser's own emulation of the preference.
    const reference = LANGUAGE_CODE_LEVEL_CHALLENGES.web!.expert.solution.pt;
    const real = async (reducedMotion: "reduce" | "no-preference") => {
      const page = await chromium.browser.newPage();
      await page.emulateMedia({ reducedMotion });
      await page.setContent(reference);
      const duration = await page.evaluate(() => getComputedStyle(document.querySelector("nav a")!).transitionDuration);
      await page.close();
      return duration;
    };
    expect(await real("no-preference")).toBe("0.15s");
    expect(parseFloat(await real("reduce"))).toBeLessThanOrEqual(0.00001);
  }, 120000);

  it("never run scripts the answer brings, and survive a page that tries to leave", async () => {
    const script = '<script>parent.postMessage({ bridge: "PACTO_TESTTOKEN00002", index: 0, kind: "done" }, "*"); document.title = "Aviso"; document.documentElement.lang = "pt";</script>';
    const results = await check(`${script}<main onclick="document.title='Aviso'"><img src="x" onerror="document.title='Aviso'"></main>`, "beginner", "pt");
    expect(results.map((r) => r.ok)).toEqual([false, false]);
    expect(results[0].got[1]).toBe("título da página: (nada)");
    expect((await check('<meta http-equiv="refresh" content="0;url=about:blank"><form><label for="n">Nome</label><input id="n" name="nome" required><button>Enviar</button></form>', "easy", "pt")).length).toBe(3);
  }, 120000);

  it("fail every case without a complete report, and list what each case expects", () => {
    expect(compareWebReports([], "easy", "pt").map((r) => r.ok)).toEqual([false, false, false]);
    expect(compareWebReports([{ lines: ["Nome"], error: "", done: true }], "easy", "pt")[0]).toMatchObject({ ok: false, got: [] });
    expect(webExpectedLines(WEB_CHECKS.medium.cases[1], "en")[1]).toBe("columns: 2");
  });
});

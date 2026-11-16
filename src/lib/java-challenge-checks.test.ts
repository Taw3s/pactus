import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compareJavaRuns, JAVA_CHECK_RESOURCES, javaCases, runJavaCases, type JavaOutcome } from "./java-challenge-checks";
import { javaBrowserSource } from "./java-toolchain";
import { openTestBrowser, type TestBrowser } from "./test-chromium";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "./typing-language-challenges";
import type { BashDifficulty } from "./typing-code";

const LEVELS: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const LANGS = ["pt", "en"] as const;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
// The page loads WASM-OJ as the packages publish it; the toolchain is the one `npm install` stages in public/toolchains.
const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">${JSON.stringify({
  imports: {
    "@wasm-oj/browser": "/nm/@wasm-oj/browser/dist/index.js",
    "@wasm-oj/core": "/nm/@wasm-oj/core/dist/index.js",
    "@wasm-oj/contracts": "/nm/@wasm-oj/contracts/dist/index.js",
    fflate: "/nm/fflate/esm/browser.js",
    "es-module-lexer": "/nm/@wasm-oj/browser/node_modules/es-module-lexer/dist/lexer.js",
  },
})}</script><body></body>`;

function challenge(level: BashDifficulty) {
  return level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === "java")!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES.java![level];
}

describe("Java challenge checks", () => {
  let chromium: TestBrowser;
  beforeAll(async () => {
    chromium = await openTestBrowser({ "/nm/": `${ROOT}node_modules/`, "/toolchains/": `${ROOT}public/toolchains/` }, PAGE);
    // One engine for the whole file, as one visit to the page has; each compilation and each run is still separate.
    await chromium.page.evaluate(`(async () => {
      const { createBrowserEngine } = await import("@wasm-oj/browser");
      window.pactoEngine = await createBrowserEngine({ toolchains: [Object.freeze(${JSON.stringify(javaBrowserSource("/toolchains/"))})] });
      await window.pactoEngine.ready();
    })()`);
  }, 120000);
  afterAll(() => chromium?.close());

  const run = (code: string, stdins: string[]) => chromium.page.evaluate(
    ([runner, source, inputs, resources]) => (0, eval)(`(${runner})`)((window as unknown as { pactoEngine: unknown }).pactoEngine, source, inputs, resources) as Promise<JavaOutcome>,
    [runJavaCases.toString(), code, stdins, JAVA_CHECK_RESOURCES] as const,
  );
  const check = async (code: string, level: BashDifficulty, lang: "pt" | "en") => {
    const cases = javaCases(level, lang);
    const outcome = await run(code, cases.map((c) => c.stdin));
    if ("compileError" in outcome) throw new Error(outcome.compileError);
    return compareJavaRuns(outcome.runs, cases, lang);
  };
  const program = (body: string, imports = "import java.io.*;\nimport java.util.*;\n") =>
    `${imports}public class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader leitor = new BufferedReader(new InputStreamReader(System.in));\n        ${body}\n    }\n}`;

  it("have at least two cases with different expected output for every level and language", () => {
    for (const level of LEVELS) for (const lang of LANGS) {
      expect(new Set(javaCases(level, lang).map((c) => c.expect[lang].join("\n"))).size, `${level} ${lang}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("the page is cross-origin isolated, as /aprender is in Chromium", async () => {
    expect(await chromium.page.evaluate(() => crossOriginIsolated)).toBe(true);
  });

  it("accept every reference solution, compiled and run for real, and show its first case as the expected result", async () => {
    for (const level of LEVELS) for (const lang of LANGS) {
      const results = await check(challenge(level).solution[lang], level, lang);
      expect(results.every((r) => r.ok), `${level} ${lang}: ${JSON.stringify(results)}`).toBe(true);
      expect(challenge(level).output[lang], `${level} ${lang}`).toBe(javaCases(level, lang)[0].expect[lang].join("\n"));
    }
  }, 300000);

  it("reject fixed answers, a wrong filter, an endless loop and a crash; accept another way of writing it", async () => {
    // Printing the expected text of the first case passes that case only.
    expect((await check('public class Main { public static void main(String[] args) { System.out.println(2); } }', "beginner", "pt")).map((r) => r.ok)).toEqual([true, false, false]);
    // The answer of before this change (the list inside the answer) is a fixed answer now.
    const old = "import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> numeros = List.of(-2, 4, 0, 7);\n        long positivos = numeros.stream()\n            .filter(numero -> numero > 0)\n            .count();\n        System.out.println(positivos);\n    }\n}";
    expect((await check(old, "beginner", "pt")).map((r) => r.ok)).toEqual([true, false, false]);
    // Wrong filter: zero counted as positive.
    const wrong = await check(program('int p = 0; for (String s : leitor.readLine().trim().split(" ")) if (Integer.parseInt(s) >= 0) p++; System.out.println(p);'), "beginner", "pt");
    expect(wrong.map((r) => r.ok)).toEqual([false, true, false]);
    expect(wrong[0]).toMatchObject({ got: ["3"], expected: ["2"] });
    // java.util.Scanner fits in the check's instruction budget (it does not in the playground's 50 million).
    expect((await check("import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner entrada = new Scanner(System.in);\n        int positivos = 0;\n        while (entrada.hasNextInt()) {\n            if (entrada.nextInt() > 0) positivos++;\n        }\n        System.out.println(positivos);\n    }\n}", "beginner", "pt")).every((r) => r.ok)).toBe(true);
    // An endless loop stops at the instruction limit, in every case, quickly.
    const started = Date.now();
    const loop = await check(program("long x = 0; while (true) { x++; }"), "beginner", "pt");
    expect(loop.map((r) => r.ok)).toEqual([false, false, false]);
    expect(loop[0].error).toMatch(/Limite de instruções/);
    expect(Date.now() - started).toBeLessThan(30000);
    // A loop only one case enters, and an exception only one case throws: the other cases still run, each in a new instance.
    expect((await check(program('String l = leitor.readLine().trim(); while (l.equals("5 1 9")) { } System.out.println(l.equals("-2 4 0 7") ? 2 : 0);'), "beginner", "pt")).map((r) => r.ok)).toEqual([true, false, true]);
    const crash = await check(program('String[] p = leitor.readLine().trim().split(" "); System.out.println(Integer.parseInt(p[2]) > 0 ? 3 : 2);'), "beginner", "pt");
    expect(crash.map((r) => r.ok)).toEqual([true, true, false]);
    expect(crash[2].error).toMatch(/Erro durante a execução na linha 6 de Main\.java/);
  }, 300000);

  it("report what stops the compilation as text: a syntax error and a method TeaVM's library lacks", async () => {
    expect(await run("public class Main { public static void main(String[] a) { int x = ; } }", [""])).toMatchObject({ compileError: expect.stringMatching(/^Main\.java:1:\d+ illegal start of expression/) });
    // The reference of before this change never compiled here: Collectors.counting() is not in the class library.
    const counting = "import java.util.*;\nimport java.util.stream.*;\npublic class Main { public static void main(String[] a) { System.out.println(Stream.of(\"a\", \"b\", \"a\").collect(Collectors.groupingBy(x -> x, Collectors.counting()))); } }";
    expect(await run(counting, [""])).toMatchObject({ compileError: expect.stringMatching(/Long\.sum/) });
  }, 120000);

  it("fail every case without one run per case", () => {
    const cases = javaCases("easy", "pt");
    expect(compareJavaRuns([], cases, "pt").map((r) => r.ok)).toEqual([false, false, false]);
    expect(compareJavaRuns([{ stdout: "[Bruno, Caio]\n", stderr: "", code: 0, termination: "exited" }], cases, "pt").map((r) => r.ok)).toEqual([false, false, false]);
    expect(compareJavaRuns(cases.map((c) => ({ stdout: c.expect.pt.join("\n"), stderr: "", code: 3, termination: "exited" })), cases, "pt")[0]).toMatchObject({ ok: false, error: "O programa terminou com o código 3." });
  });
});

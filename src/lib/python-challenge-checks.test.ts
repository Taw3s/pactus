import { describe, expect, it } from "vitest";
import { loadPyodide } from "pyodide";
import { buildPythonCheckScript, comparePythonOutput, pythonCases, pythonPlaygroundPrelude } from "./python-challenge-checks";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "./typing-language-challenges";
import type { BashDifficulty } from "./typing-code";

const MARKER = "PACTO_TESTMARKER0001";
const LEVELS: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const LANGS = ["pt", "en"] as const;

function reference(level: BashDifficulty, lang: "pt" | "en") {
  const challenge = level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === "python")!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES.python![level];
  return challenge.solution[lang];
}

describe("Python challenge checks", () => {
  it("have at least two cases with different expected output for every level and language", () => {
    for (const level of LEVELS) for (const lang of LANGS) {
      const cases = pythonCases(level, lang);
      expect(new Set(cases.map((c) => c.expect[lang].join("\n"))).size, `${level} ${lang}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("refuse a marker that is not random-looking", () => {
    expect(() => buildPythonCheckScript("print(1)", [{}], "x")).toThrow();
  });

  it("accept every reference solution and reject wrong, fixed and crashing answers (real Pyodide)", async () => {
    // Same setup as public/workers/python.worker.mjs: no standard input, output handed over line by line.
    const lines: string[] = [];
    const pyodide = await loadPyodide({ stdout: (text) => lines.push(text), stderr: () => {} });
    pyodide.setStdin({ error: true });
    pyodide.setStdout({ batched: (text) => lines.push(text) });
    const check = (code: string, level: BashDifficulty, lang: "pt" | "en") => {
      lines.length = 0;
      const cases = pythonCases(level, lang);
      pyodide.runPython(buildPythonCheckScript(code, cases, MARKER));
      return comparePythonOutput([...lines], cases, MARKER, lang);
    };

    for (const level of LEVELS) for (const lang of LANGS) {
      const results = check(reference(level, lang), level, lang);
      expect(results.every((r) => r.ok), `${level} ${lang}: ${JSON.stringify(results)}`).toBe(true);
    }

    // The visualizer's "expected result" is what the reference prints in the first case.
    for (const level of LEVELS) for (const lang of LANGS) {
      const challenge = level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === "python")!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES.python![level];
      expect(challenge.output[lang], `${level} ${lang}`).toBe(pythonCases(level, lang)[0].expect[lang].join("\n"));
    }

    // Printing the expected text of the first case passes that case only.
    expect(check("print([2, 8])", "beginner", "pt").map((r) => r.ok)).toEqual([true, false, false]);
    // The answer of before this change (data inside the answer) is a fixed answer now.
    expect(check("numeros = [2, 5, 8, 1]\nprint([n for n in numeros if n % 2 == 0])", "beginner", "pt").map((r) => r.ok)).toEqual([true, false, false]);
    expect(check("print([10.0, 9.0, 8.0])", "expert", "en").map((r) => r.ok)).toEqual([true, false, false]);
    // Wrong behavior: keeps the odd numbers.
    const odd = check("print([n for n in map(int, input().split()) if n % 2])", "beginner", "pt");
    expect(odd.map((r) => r.ok)).toEqual([false, false, false]);
    expect(odd[0]).toMatchObject({ got: ["[5, 1]"], expected: ["[2, 8]"] });
    // A different way of writing it passes, and a prompt given to input() is not part of the output.
    expect(check("nums = input('Números: ').split()\nout = []\nfor n in nums:\n    if int(n) % 2 == 0:\n        out.append(int(n))\nprint(out)", "beginner", "pt").every((r) => r.ok)).toBe(true);
    // An error in one case fails that case with the error, and the others still run.
    const crash = check("import sys\nprint(sorted([float(x) for x in sys.argv[1:]], reverse=True)[:3])", "expert", "pt");
    expect(crash.map((r) => r.ok)).toEqual([false, false, true]);
    expect(crash[0].error).toMatch(/^ValueError/);
    expect(check("print([2, 8]", "beginner", "pt")[0].error).toMatch(/SyntaxError/);
    // Leaving early or reading more input than there is does not break the harness.
    expect(check("import sys\nprint([2, 8])\nsys.exit(3)", "beginner", "pt").map((r) => r.ok)).toEqual([true, false, false]);
    expect(check("input()\ninput()", "easy", "pt")[0].error).toMatch(/^EOFError/);
    // Printing a forged result line does not pass: only the last line with the marker counts, and the marker is random in the app.
    expect(check(`print('${MARKER}[]')`, "easy", "pt").every((r) => !r.ok)).toBe(true);
    // Each case starts clean: a variable left by one case is not there in the next.
    expect(check("try:\n    seen\n    print('again')\nexcept NameError:\n    seen = 1\n    print(input().upper().split())", "easy", "pt").every((r) => r.ok)).toBe(true);

    // The playground prelude gives an approved answer the first case's input.
    lines.length = 0;
    pyodide.runPython(pythonPlaygroundPrelude(pythonCases("expert", "pt")[0]) + reference("expert", "pt"));
    pyodide.runPython(pythonPlaygroundPrelude(pythonCases("medium", "en")[0]) + reference("medium", "en"));
    expect(lines).toEqual(["[10.0, 9.0, 8.0]", "{'sun': 3, 'moon': 2, 'sea': 1}"]);
  }, 60000);

  it("fail every case when the result line is missing or malformed", () => {
    const cases = pythonCases("easy", "pt");
    expect(comparePythonOutput([], cases, MARKER, "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(comparePythonOutput([`${MARKER}[{"out": "['ANA', 'BIA', 'CAIO']\\n", "err": ""}]`], cases, MARKER, "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(comparePythonOutput([`${MARKER}{oops`], cases, MARKER, "pt").map((r) => r.ok)).toEqual([false, false]);
  });
});

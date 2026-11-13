import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { Bash, initBashkit } from "@everruns/bashkit-wasm";
import { BASH_CHECKS, buildCheckScript, compareCheckOutput, shellQuote } from "./bash-challenge-checks";
import { BASH_CODE_SNIPPETS } from "./typing-code";

const MARKER = "PACTO_TESTMARKER0001";

async function run(code: string, id: string, lang: "pt" | "en") {
  const shell = new Bash({ profile: "hardened", timeoutMs: 5000, maxCommands: 1500, maxLoopIterations: 1000, maxMemory: 16 * 1024 * 1024 });
  const cases = BASH_CHECKS[id];
  const result = await shell.execute(buildCheckScript(code, cases, MARKER), { capture: 12000 });
  return compareCheckOutput(result.stdout, cases, MARKER, lang, code);
}

describe("Bash challenge checks", () => {
  it("cover every exercise", () => {
    expect(Object.keys(BASH_CHECKS).sort()).toEqual(BASH_CODE_SNIPPETS.map((s) => s.id).sort());
  });

  it("quote arguments so nothing is expanded", () => {
    expect(shellQuote("a'b $HOME")).toBe(`'a'\\''b $HOME'`);
  });

  it("accept every reference solution and reject a hard-coded answer", async () => {
    await initBashkit(fs.readFileSync(new URL("../../node_modules/@everruns/bashkit-wasm/bashkit_wasm_bg.wasm", import.meta.url)));
    for (const s of BASH_CODE_SNIPPETS) {
      for (const lang of ["pt", "en"] as const) {
        const results = await run(s.code[lang], s.id, lang);
        expect(results.every((r) => r.ok), `${s.id} ${lang}: ${JSON.stringify(results)}`).toBe(true);
      }
    }
    // Printing the expected text without reading the argument passes the first case only.
    const fake = await run("printf 'Olá, visitante\\n'", "bash-printf", "pt");
    expect(fake.map((r) => r.ok)).toEqual([true, false]);
    // Without -r, the backslash is lost.
    const noR = await run('read -p "Qual é seu nome? " name\nprintf \'Olá, %s\\n\' "$name"', "bash-read-input", "pt");
    expect(noR.map((r) => r.ok)).toEqual([true, false]);
  }, 30000);
});

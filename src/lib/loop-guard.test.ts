import * as ts from "typescript";
import { describe, expect, it } from "vitest";
import { LOOP_GUARD, prepareExercise } from "./loop-guard";

function run(source: string, typescript = false) {
  const prepared = prepareExercise(ts, source, typescript);
  if ("errors" in prepared) throw new Error(prepared.errors);
  const logs: string[] = [];
  const started = Date.now();
  try {
    new Function("console", "performance", "setTimeout", prepared.code)({ log: (...a: unknown[]) => logs.push(a.join(" ")) }, performance, () => 0);
    return { logs, error: null as Error | null, ms: Date.now() - started };
  } catch (error) {
    return { logs, error: error as Error, ms: Date.now() - started };
  }
}

describe("loop guard", () => {
  it.each([
    "while (true) {}",
    "for (;;);",
    "do { } while (1)",
    "let i = 0; while (i >= 0) i++;",
    "outer: for (;;) { for (let j = 0; ; j++) { if (j < 0) break outer; } }",
    "for (;;) { try { for (;;) {} } catch {} }",
  ])("stops %s by itself", (source) => {
    const { error, ms } = run(source);
    expect(error).toBeInstanceOf(RangeError);
    expect(error?.message).toMatch(/Loop interrompido/);
    expect(ms).toBeLessThan(5000);
  }, 10000);

  it("leaves finite loops and their results alone, in JavaScript and TypeScript", () => {
    expect(run("let s = 0; for (const n of [1, 2, 3]) s += n; for (const k in { a: 1 }) s += 10; console.log(s);").logs).toEqual(["16"]);
    expect(run("const xs: number[] = [1, 2]; let t = 0; let i = 0; while (i < xs.length) { t += xs[i]; i++; } console.log(t);", true).logs).toEqual(["3"]);
  });

  it("guards every kind of loop and reports syntax errors instead of running", () => {
    const prepared = prepareExercise(ts, "for (;;) {} while (x) y(); do z(); while (w); for (const a of b) {} for (const k in o) {}", false);
    expect("code" in prepared && prepared.code.split(`${LOOP_GUARD}()`).length - 1).toBe(5);
    expect(prepareExercise(ts, "while (true {", false)).toHaveProperty("errors");
  });
});

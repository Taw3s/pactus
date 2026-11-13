import { describe, expect, it } from "vitest";
import { countRun, makeWords, unsentTypingTest } from "./typing";

describe("countRun", () => {
  const target = ["casa", "livro", "café", "mesa"];
  it("counts exact words plus their space; a wrong word types but scores nothing", () => {
    expect(countRun(target, ["casa", "livor"], "")).toEqual({ correct: 5, typed: 11 });
  });
  it("the word in progress counts up to where it matches", () => {
    expect(countRun(target, ["casa"], "liv")).toEqual({ correct: 8, typed: 8 });
    expect(countRun(target, ["casa"], "lix")).toEqual({ correct: 5, typed: 8 });
  });
  it("accents must match", () => {
    expect(countRun(target, ["casa", "livro", "cafe"], "")).toEqual({ correct: 11, typed: 16 });
  });
});

describe("makeWords", () => {
  it("gives the requested number of non-empty words", () => {
    const w = makeWords(50);
    expect(w).toHaveLength(50);
    expect(w.every((x) => x.length > 0)).toBe(true);
  });

  it("gives English words without accents in English", () => {
    const w = makeWords(200, Math.random, "en");
    expect(w.every((x) => /^[a-z]+$/.test(x))).toBe(true);
  });
});

describe("unsentTypingTest", () => {
  const test = (id: string, score: number | null, started_at: string, finished_at: string | null) => ({ id, wpm: score, accuracy: 1, score, device: "pc" as const, minutes: 1, started_at, finished_at });
  const a = test("a", 40, "2026-11-05T11:59:00Z", "2026-11-05T12:00:00Z");
  const b = test("b", 55, "2026-11-05T12:59:00Z", "2026-11-05T13:00:00Z");
  const running = test("c", null, "2026-11-05T13:10:00Z", null);

  it("gives the best confirmed test no proof uses", () => {
    expect(unsentTypingTest([a, b, running], [], null)?.id).toBe("b");
  });
  it("skips tests a proof already uses and tests the server did not finish", () => {
    expect(unsentTypingTest([a, b], ["b"], null)?.id).toBe("a");
    expect(unsentTypingTest([running], [], null)).toBeNull();
  });
  it("after an annulment, only a test started after the verdict can retake it", () => {
    expect(unsentTypingTest([a, b], [null], "2026-11-05T12:30:00Z")?.id).toBe("b");
    // Finished after the verdict but started before it: refused by the database, never offered.
    expect(unsentTypingTest([a], [], "2026-11-05T11:59:30Z")).toBeNull();
  });
});

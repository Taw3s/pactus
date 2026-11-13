import { describe, expect, it } from "vitest";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { lessonPath } from "./learning-paths";
import { TYPING_CATEGORIES } from "./typing-texts";

describe("Aprender content", () => {
  it("has one staged path per theme, intro first, basic to advanced, with no repeated filler", () => {
    for (const lang of ["pt", "en"] as const) {
      const path = lessonPath(lang);
      expect(new Set(path.map((l) => l.id)).size).toBe(path.length);
      for (const category of TYPING_CATEGORIES) {
        const stages = path.filter((l) => l.category === category);
        expect(stages.length, category).toBeGreaterThanOrEqual(3);
        expect(stages[0].stage, category).toMatch(/Introdução|Introduction/);
      }
      expect(path.filter((l) => l.category === "Bash").map((l) => l.stage).slice(1)).toEqual(lang === "pt" ? ["Básico", "Fácil", "Médio", "Difícil", "Expert"] : ["Basic", "Easy", "Medium", "Hard", "Expert"]);
      // No paragraph appears in two lessons (the old generic padding repeated the same sections everywhere).
      const seen = new Map<string, string>();
      for (const l of path) for (const p of l.text.split(/\n\s*\n/).map((x) => x.trim()).filter((x) => x.length > 80)) {
        expect(seen.get(p), `${l.id} repeats ${seen.get(p)}`).toBeUndefined();
        seen.set(p, l.id);
      }
    }
    expect(lessonPath("en").length).toBe(lessonPath("pt").length);
  });

  it("has one original code example for each supported path", () => {
    const ids = LANGUAGE_CODE_EXAMPLES.map((example) => example.id);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(ids.length);
    for (const example of LANGUAGE_CODE_EXAMPLES) {
      expect(example.code.pt.length, example.id + " PT").toBeGreaterThan(0);
      expect(example.code.en.length, example.id + " EN").toBeGreaterThan(0);
      expect(example.challenge.solution.pt.length, example.id + " challenge PT").toBeGreaterThan(0);
      expect(example.challenge.solution.en.length, example.id + " challenge EN").toBeGreaterThan(0);
    }
  });
});

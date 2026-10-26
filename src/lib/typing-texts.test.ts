import { describe, expect, it } from "vitest";
import { progressAfter, textWords, TYPING_CATEGORIES, TYPING_TEXTS, wordsFrom } from "./typing-texts";

describe("typing texts", () => {
  it("are prose of a test's length, with unique ids, in known categories", () => {
    expect(new Set(TYPING_TEXTS.map((t) => t.id)).size).toBe(TYPING_TEXTS.length);
    for (const t of TYPING_TEXTS) {
      expect(TYPING_CATEGORIES).toContain(t.category);
      // The database tells English texts by their id.
      expect(t.id.startsWith("en-"), t.id).toBe(t.lang === "en");
      expect(t.id.length).toBeLessThanOrEqual(60);
      expect(t.text).not.toMatch(/[{}()[\]<>=`"'_\\|#*]/);
      const n = textWords(t).length;
      expect(n, t.id).toBeGreaterThanOrEqual(100);
      expect(n, t.id).toBeLessThanOrEqual(170);
    }
  });

  it("continue where the person stopped and start over past the end", () => {
    const t = TYPING_TEXTS[0];
    const all = textWords(t);
    const { words, wrapsAt } = wordsFrom(t, all.length - 2, 5);
    expect(words).toEqual([all.at(-2), all.at(-1), all[0], all[1], all[2]]);
    expect(wrapsAt).toBe(2);
    expect(progressAfter(t, 10, 30)).toEqual({ restart: false, words: 40 });
    expect(progressAfter(t, all.length - 5, 5)).toEqual({ restart: true, words: 0 });
  });

  it("come in both languages, with the same subjects", () => {
    const pt = TYPING_TEXTS.filter((t) => t.lang === "pt");
    const en = TYPING_TEXTS.filter((t) => t.lang === "en");
    expect(en.length).toBe(pt.length);
    for (const c of TYPING_CATEGORIES) expect(en.filter((t) => t.category === c).length).toBe(pt.filter((t) => t.category === c).length);
  });
});

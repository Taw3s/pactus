import { describe, expect, it } from "vitest";
import { progressAfter, textWords, TYPING_CATEGORIES, TYPING_TEXTS, wordsFrom } from "./typing-texts";

describe("typing texts", () => {
  it("are prose of a test's length, with unique ids, in known categories", () => {
    expect(new Set(TYPING_TEXTS.map((t) => t.id)).size).toBe(TYPING_TEXTS.length);
    for (const t of TYPING_TEXTS) {
      expect(TYPING_CATEGORIES).toContain(t.category);
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
});

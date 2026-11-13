import { describe, expect, it } from "vitest";
import { TEXTS as EN } from "./typing-texts-en";
import { TEXTS as PT } from "./typing-texts-pt";
import { codeLayout, progressAfter, textWords, TYPING_CATEGORIES, wordsFrom } from "./typing-texts";
import { codeTypingTexts } from "./typing-code-texts";

const ALL = [...PT, ...EN];

describe("typing texts", () => {
  it("are prose of a test's length, with unique ids, in known categories", () => {
    expect(new Set(ALL.map((t) => t.id)).size).toBe(ALL.length);
    for (const t of ALL) {
      expect(TYPING_CATEGORIES).toContain(t.category);
      // The database tells English texts by their id.
      expect(t.id.startsWith("en-"), t.id).toBe(t.lang === "en");
      expect(t.id.length).toBeLessThanOrEqual(60);
      expect(t.text, t.id).not.toMatch(/[{}()[\]<>=`"'_\\|#*]/);
      const n = textWords(t).length;
      expect(n, t.id).toBeGreaterThanOrEqual(100);
      expect(n, t.id).toBeLessThanOrEqual(170);
    }
  });

  it("come in both languages, with the same subjects", () => {
    expect(PT.every((t) => t.lang === "pt")).toBe(true);
    expect(EN.length).toBe(PT.length);
    for (const c of TYPING_CATEGORIES) expect(EN.filter((t) => t.category === c).length, c).toBe(PT.filter((t) => t.category === c).length);
  });

  it("continue where the person stopped and end at the end of the text", () => {
    const t = PT[0];
    const all = textWords(t);
    const { words, left } = wordsFrom(t, all.length - 2);
    expect(words).toEqual([all.at(-2), all.at(-1)]);
    expect(left).toBe(2);
    expect(wordsFrom(t, all.length).words).toEqual([]);
    expect(progressAfter(t, 10, 30)).toEqual({ words: 40, finished: false, total: all.length });
    expect(progressAfter(t, all.length - 5, 5)).toEqual({ words: all.length, finished: true, total: all.length });
    expect(progressAfter(t, 10, all.length * 2)).toEqual({ words: all.length, finished: true, total: all.length });
  });

  it("include Bash theory in five stages per language, and Bash code with its line breaks", () => {
    for (const list of [PT, EN]) expect(list.filter((t) => t.category === "Bash").length).toBe(5);
    const code = codeTypingTexts("pt");
    expect(code.length).toBe(8);
    const layout = codeLayout(code.find((c) => c.id === "code-bash-printf")!);
    expect(layout.lineEnd.filter(Boolean).length).toBe(2);
    expect(codeTypingTexts("en").every((c) => c.id.startsWith("en-code-"))).toBe(true);
  });
});

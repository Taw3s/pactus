// Texts for the typing test's "Texto" mode: short explanations about programming, in prose (no
// code symbols), so the test is also a reading. Each person keeps their place in every text
// (typing_progress). The texts themselves live in typing-texts-pt.ts and typing-texts-en.ts and are
// loaded only when the test opens, so the rest of the app does not carry them.
import type { TypingLang } from "./typing";

export interface TypingText {
  id: string;
  lang: TypingLang;
  category: string;
  title: string;
  text: string;
  /** Code ("Código" mode): typed with its symbols, shown with its line breaks and indentation. */
  code?: boolean;
}

export const TYPING_CATEGORIES = ["Fundamentos", "SQL e dados", "Python", "JavaScript", "TypeScript", "Java", "Web", "Bash"] as const;

/** The texts of one language (a separate chunk per language). */
export async function loadTypingTexts(lang: TypingLang): Promise<TypingText[]> {
  const mod = lang === "en" ? await import("./typing-texts-en") : await import("./typing-texts-pt");
  return mod.TEXTS;
}

export function textWords(t: TypingText) {
  return t.text.split(/\s+/).filter(Boolean);
}

/** The words still to type in a text, from `start` to the end. The text never starts over by itself. */
export function wordsFrom(t: TypingText, start: number, n = Infinity) {
  const all = textWords(t);
  const from = Math.min(Math.max(0, start), all.length);
  return { words: all.slice(from, from + n), left: all.length - from };
}

/**
 * Where the person stands in a text after typing `typed` words from `start`. The end of the text is the end of the
 * session: `finished` says it was reached (the server keeps the place at the end until "Recomeçar").
 */
export function progressAfter(t: TypingText, start: number, typed: number) {
  const total = textWords(t).length;
  const words = Math.min(total, Math.max(0, start) + typed);
  return { words, finished: words >= total, total };
}

/** For code: for each word, the indentation (in spaces) when it opens a line and whether a line ends after it. */
export function codeLayout(t: TypingText) {
  const indent: number[] = [];
  const lineEnd: boolean[] = [];
  for (const line of t.text.split("\n")) {
    const parts = line.split(/\s+/).filter(Boolean);
    const lead = line.length - line.trimStart().length;
    parts.forEach((_, i) => {
      indent.push(i === 0 ? lead : 0);
      lineEnd.push(i === parts.length - 1);
    });
  }
  return { indent, lineEnd };
}

// Texts for the typing test's "Código" mode: the Bash examples of Aprender (typing-code.ts), typed with their
// symbols and line breaks. Same server rules as the "Texto" mode (catalog in 0034, place kept in typing_progress,
// the session ends at the end of the code). Ids: "code-" + snippet id, English "en-code-" + snippet id; never rename.
import type { TypingLang } from "./typing";
import { BASH_CODE_SNIPPETS } from "./typing-code";
import type { TypingText } from "./typing-texts";

const LEVEL: Record<string, string> = { beginner: "Básico", easy: "Fácil", medium: "Médio", hard: "Difícil", expert: "Expert" };
const LEVEL_EN: Record<string, string> = { beginner: "Basic", easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };

export function codeTypingTexts(lang: TypingLang): TypingText[] {
  const order = Object.keys(LEVEL);
  return [...BASH_CODE_SNIPPETS].sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty)).map((s) => ({
    lang,
    id: `${lang === "en" ? "en-" : ""}code-${s.id}`,
    category: "Bash",
    title: `${(lang === "en" ? LEVEL_EN : LEVEL)[s.difficulty]} · ${s.title[lang]}`,
    text: s.code[lang],
    code: true,
  }));
}

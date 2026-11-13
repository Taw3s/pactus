import fs from "node:fs";
import { expect, it } from "vitest";
import { TEXTS as portuguese } from "./typing-texts-pt";
import { TEXTS as english } from "./typing-texts-en";
import { codeTypingTexts } from "./typing-code-texts";

it("server text lengths match all shipped texts in both languages", () => {
  const migration = ["0022_typing_progress_integrity.sql", "0034_typing_text_end.sql"]
    .map((f) => fs.readFileSync(new URL(`../../supabase/migrations/${f}`, import.meta.url), "utf8"))
    .join("\n");
  const actual = new Map([...migration.matchAll(/^  \('([^']+)', '(pt|en)', (\d+)\)[,;]?$/gm)].map(match => [match[1], { lang: match[2], words: Number(match[3]) }]));
  const expected = new Map([...portuguese, ...english, ...codeTypingTexts("pt"), ...codeTypingTexts("en")].map(text => [text.id, { lang: text.lang, words: text.text.split(/\s+/).filter(Boolean).length }]));
  expect(actual).toEqual(expected);
});

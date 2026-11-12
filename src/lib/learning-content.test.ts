import { describe, expect, it } from "vitest";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { expandTypingLessons } from "./typing-lesson-expansion";
import { TEACHER_TEXTS_EN } from "./typing-teacher-lessons-en";
import { TEACHER_TEXTS_PT } from "./typing-teacher-lessons-pt";

describe("Aprender content", () => {
  it("keeps every written lesson at or above 2,000 characters in both languages", () => {
    const lessons = expandTypingLessons([...TEACHER_TEXTS_PT, ...TEACHER_TEXTS_EN]);
    expect(lessons).toHaveLength(TEACHER_TEXTS_PT.length + TEACHER_TEXTS_EN.length);
    for (const lesson of lessons) expect(lesson.text.length, lesson.id).toBeGreaterThanOrEqual(2000);
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

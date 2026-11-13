// Aprender, written lessons: one path per theme, from the basics to the advanced topics, one stage at a time. A path is
// the guided lesson of the theme (introduction) followed by that theme's readings, each about its own subject (the same
// texts as the typing test's Texto mode; Bash has its five stages, Básico to Expert). No generic filler is added: a
// short reading stays short. Lesson ids are the texts' ids (stored in learning_progress, never rename).
import type { TypingLang } from "./typing";
import { TEACHER_TEXTS_EN } from "./typing-teacher-lessons-en";
import { TEACHER_TEXTS_PT } from "./typing-teacher-lessons-pt";
import { TEXTS as TEXTS_EN } from "./typing-texts-en";
import { TEXTS as TEXTS_PT } from "./typing-texts-pt";
import { TYPING_CATEGORIES, type TypingText } from "./typing-texts";

export type LessonStage = TypingText & { stage: string };

const LEVELS: Record<TypingLang, [string, string, string]> = { pt: ["Básico", "Intermediário", "Avançado"], en: ["Basic", "Intermediate", "Advanced"] };
const BASH_LEVELS: Record<TypingLang, string[]> = { pt: ["Básico", "Fácil", "Médio", "Difícil", "Expert"], en: ["Basic", "Easy", "Medium", "Hard", "Expert"] };

// Readings in teaching order inside each theme (by the Portuguese id; the English one is its pair at the same index).
const ORDER: Record<string, string[]> = {
  Fundamentos: ["algoritmo", "variavel", "funcao", "terminal", "compilador-interpretador", "git", "testes", "redes", "http", "api", "complexidade", "senhas", "seguranca", "nuvem"],
};

export function lessonPath(lang: TypingLang): LessonStage[] {
  const teacher = lang === "pt" ? TEACHER_TEXTS_PT : TEACHER_TEXTS_EN;
  const texts = lang === "pt" ? TEXTS_PT : TEXTS_EN;
  const pairs = lang === "pt" ? null : TEXTS_PT;
  const out: LessonStage[] = [];
  for (const category of TYPING_CATEGORIES) {
    const intro = teacher.find((t) => t.category === category);
    if (intro) out.push({ ...intro, stage: lang === "pt" ? "Introdução" : "Introduction" });
    let readings = texts.filter((t) => t.category === category);
    const order = ORDER[category];
    if (order) {
      const ptIds = (pairs ?? texts).filter((t) => t.category === category).map((t) => t.id);
      const rank = (t: TypingText) => {
        const pos = order.indexOf(ptIds[readings.indexOf(t)] ?? t.id);
        return pos < 0 ? order.length : pos;
      };
      readings = [...readings].sort((a, b) => rank(a) - rank(b));
    }
    readings.forEach((t, i) => {
      const stage = category === "Bash"
        ? BASH_LEVELS[lang][i] ?? BASH_LEVELS[lang].at(-1)!
        : LEVELS[lang][Math.min(2, Math.floor((i * 3) / readings.length))];
      out.push({ ...t, stage });
    });
  }
  return out;
}

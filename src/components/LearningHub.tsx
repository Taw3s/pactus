"use client";

import dynamic from "next/dynamic";
import { BookOpen, Check, Code2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BASH_CODE_SNIPPETS, type BashDifficulty } from "@/lib/typing-code";
import { LANGUAGE_CODE_EXAMPLES, type LanguageCodeChallenge, type LanguageExample, type LanguageExampleId } from "@/lib/typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "@/lib/typing-language-challenges";
import { lessonPath } from "@/lib/learning-paths";
import { BASH_CHECKS, buildCheckScript, compareCheckOutput, randomMarker, shellQuote, type CaseResult } from "@/lib/bash-challenge-checks";
import { useIsolatedBash } from "@/components/IsolatedBash";
import type { TypingLang } from "@/lib/typing";
import type { TypingText } from "@/lib/typing-texts";
import { completeLearning, emptyLearning, loadLearning, toLearning, withRow, type LearningProgress } from "@/lib/learning-progress";
import { createClient } from "@/lib/supabase/client";

const CodePlayground = dynamic(() => import("@/components/CodePlayground").then((module) => module.CodePlayground), {
  ssr: false,
  loading: () => <p className="mt-4 rounded-sm border border-divider bg-surface p-3 text-sm text-muted" role="status">Carregando o ambiente de código…</p>,
});

const VideoLessonsScreen = dynamic(() => import("@/components/VideoLessonsScreen").then((module) => module.VideoLessonsScreen), {
  ssr: false,
  loading: () => <p className="rounded-sm border border-divider bg-surface p-3 text-sm text-muted" role="status">Carregando as vídeo-aulas…</p>,
});

const DIFFICULTIES: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const DIFFICULTY_LABEL: Record<BashDifficulty, string> = {
  beginner: "Iniciante",
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  expert: "Expert",
};
const LANGUAGE_ORDER = ["Fundamentos", "SQL e dados", "Python", "JavaScript", "TypeScript", "Java", "Web", "Bash"];
const TABS = [
  { id: "lessons", label: "Aulas escritas", icon: BookOpen },
  { id: "challenges", label: "Desafios", icon: Code2 },
  { id: "videos", label: "Vídeo-aulas", icon: Video },
] as const;

type Progress = LearningProgress;
type Tab = (typeof TABS)[number]["id"];

const emptyProgress = emptyLearning;

// The 8 Bash exercises in level order; each one is reachable (before, only the first of each level was).
const BASH_EXERCISES = [...BASH_CODE_SNIPPETS].sort((a, b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty));

function bashSnippet(id: string) {
  return BASH_EXERCISES.find((item) => item.id === id) ?? BASH_EXERCISES[0];
}

function challengeForLanguage(example: LanguageExample, difficulty: BashDifficulty, bashId: string): LanguageCodeChallenge {
  if (example.id === "bash") {
    const snippet = bashSnippet(bashId);
    return { title: snippet.title, prompt: snippet.challenge, solution: snippet.code, hints: snippet.hints, output: snippet.output };
  }
  if (difficulty === "beginner") return example.challenge;
  return LANGUAGE_CODE_LEVEL_CHALLENGES[example.id]?.[difficulty] ?? example.challenge;
}

function challengeKey(id: LanguageExampleId, difficulty: BashDifficulty, lang: TypingLang, bashId?: string) {
  // Bash: the first exercise of a level keeps the old key (its progress stays); the others get their own.
  if (id === "bash" && bashId) {
    const first = BASH_EXERCISES.find((item) => item.difficulty === bashSnippet(bashId).difficulty);
    if (first && first.id !== bashId) return `bash:${bashId}:${lang}`;
    return `bash:${bashSnippet(bashId).difficulty}:${lang}`;
  }
  return `${id}:${difficulty}:${lang}`;
}

function normalizeCode(value: string) {
  return value.replace(/\r\n/g, "\n").trim().split("\n").map((line) => line.trimEnd()).join("\n");
}

function lineExplanation(line: string, lang: TypingLang) {
  const value = line.trim();
  const bash = bashLine(value, lang);
  if (bash) return bash;
  if (!value) return lang === "pt" ? "Esta linha em branco separa blocos para facilitar a leitura." : "This blank line separates blocks for readability.";
  if (/^(const|let|var|final|int|String|boolean|bool|\w+\s*=)/.test(value)) return lang === "pt" ? "Aqui o programa guarda ou atualiza um valor que será usado por outras linhas." : "This line stores or updates a value used by later lines.";
  if (/^(if|else|elif|switch|case|when|\[\[)/.test(value)) return lang === "pt" ? "Esta condição escolhe qual caminho o programa segue conforme os dados." : "This condition selects a path based on the data.";
  if (/^(for|while|foreach|forEach|for\s*\()/.test(value)) return lang === "pt" ? "Este trecho repete uma operação para cada item ou enquanto a condição continuar verdadeira." : "This part repeats an operation for each item or while its condition remains true.";
  if (/^(function|def |class |public static|export |async |=>)/.test(value)) return lang === "pt" ? "Esta linha inicia uma função ou estrutura que organiza uma responsabilidade reutilizável." : "This line starts a function or structure that organizes a reusable responsibility.";
  if (/^(print|printf|console\.|System\.out|SELECT|INSERT|UPDATE|DELETE|CREATE|document\.|element\.)/i.test(value)) return lang === "pt" ? "Esta instrução produz uma saída, consulta dados ou altera o que aparece na página." : "This statement produces output, queries data, or changes what appears on the page.";
  return lang === "pt" ? "Leia esta linha junto com o bloco: ela contribui para transformar a entrada no resultado esperado." : "Read this line with the surrounding block: it helps transform the input into the expected result.";
}

/** Bash constructs explained by what they are, not by a generic guess (local rules, no AI). */
function bashLine(value: string, lang: TypingLang): string | null {
  const pt = lang === "pt";
  if (/^read\b/.test(value)) return pt ? "read lê uma linha da entrada padrão e guarda na variável do fim da linha. A opção -r mantém as barras invertidas; -p mostra a pergunta quando há um terminal." : "read takes one line from standard input into the variable at the end. -r keeps backslashes; -p shows the prompt when there is a terminal.";
  if (/^shopt -s nullglob/.test(value)) return pt ? "Com nullglob, um padrão como ./*.txt sem arquivos vira uma lista vazia, e não o próprio texto do padrão." : "With nullglob, a pattern such as ./*.txt with no matches becomes an empty list instead of the pattern itself.";
  if (/^local\b/.test(value)) return pt ? "local cria a variável só dentro da função, sem mexer numa variável de mesmo nome fora dela." : "local creates the variable only inside the function, without touching one with the same name outside.";
  if (/^\w+\(\)\s*\{/.test(value)) return pt ? "Define uma função: o bloco entre chaves roda quando o nome é chamado, e os argumentos dela ficam em $1, $2…" : "Defines a function: the block in braces runs when the name is called, and its arguments are $1, $2…";
  if (/^\w+=\(/.test(value)) return pt ? "Cria uma lista (array). Cada item entre aspas continua inteiro, mesmo com espaços." : "Creates an array. Each quoted item stays whole, even with spaces.";
  if (/^\w+="\$\{1:-/.test(value)) return pt ? "Guarda o primeiro argumento; a forma ${1:-valor} usa o valor padrão quando o argumento falta ou está vazio." : "Stores the first argument; ${1:-value} uses the fallback when it is missing or empty.";
  if (/^if \[\[ -d/.test(value)) return pt ? "[[ -d caminho ]] é verdadeiro quando o caminho existe e é uma pasta; as aspas protegem nomes com espaço." : "[[ -d path ]] is true when the path exists and is a directory; the quotes protect names with spaces.";
  if (/^\[\[ -f/.test(value)) return pt ? "Pula o que não for arquivo comum (uma pasta chamada algo.txt, por exemplo); || continue vai para o próximo item." : "Skips anything that is not a regular file (a folder named something.txt, for example); || continue moves on.";
  if (/^case\b/.test(value)) return pt ? "case compara o valor com cada padrão abaixo, de cima para baixo, e roda só o primeiro que combinar." : "case compares the value with each pattern below, top to bottom, and runs only the first match.";
  if (/^\*\)/.test(value)) return pt ? "O padrão * combina com qualquer coisa: é o caso para as opções não previstas." : "The * pattern matches anything: it handles every option not listed.";
  if (/^\w+\)/.test(value)) return pt ? "Um ramo do case: roda quando o valor é exatamente esse texto; ;; encerra o ramo." : "A case branch: runs when the value is exactly this text; ;; ends the branch.";
  if (/^for \w+ in "\$\{\w+\[@\]\}"/.test(value)) return pt ? "Percorre a lista item por item; \"${lista[@]}\" entre aspas não separa os itens nos espaços." : "Walks the array item by item; the quoted \"${list[@]}\" does not split items on spaces.";
  if (/^for \w+ in/.test(value)) return pt ? "Percorre cada item da lista ou do padrão de arquivos, um por vez, guardando-o na variável." : "Goes through each item of the list or file pattern, one at a time, in the variable.";
  if (/\|/.test(value) && /^printf/.test(value)) return pt ? "O pipe | passa a saída de um comando como entrada do próximo: aqui printf gera as linhas, grep -i filtra sem diferenciar maiúsculas e sort ordena." : "The pipe | feeds one command's output into the next: printf makes the lines, grep -i filters ignoring case and sort orders them.";
  if (/^printf\b/.test(value)) return pt ? "printf escreve o formato trocando cada %s pelo argumento seguinte; \\n quebra a linha." : "printf writes the format, replacing each %s with the next argument; \\n ends the line.";
  if (/^(done|fi|esac|\})$/.test(value)) return pt ? "Fecha o bloco aberto acima (laço, condição, case ou função)." : "Closes the block opened above (loop, condition, case or function).";
  if (/^else$/.test(value)) return pt ? "Caminho seguido quando a condição do if é falsa." : "Path taken when the if condition is false.";
  if (/^\w+ "\$\{1:-\}"$/.test(value)) return pt ? "Chama a função passando o primeiro argumento do script (vazio se não houver)." : "Calls the function with the script's first argument (empty when there is none).";
  return null;
}

export function LearningHub() {
  const [tab, setTab] = useState<Tab>("lessons");
  const [lang, setLang] = useState<TypingLang>("pt");
  const lessons = useMemo(() => lessonPath(lang), [lang]);
  const lessonIds = useMemo(() => new Set([...lessonPath("pt"), ...lessonPath("en")].map((item) => item.id)), []);
  const challengeIds = useMemo(() => {
    const ids: string[] = [];
    for (const example of LANGUAGE_CODE_EXAMPLES) {
      if (example.id === "bash") {
        for (const item of BASH_EXERCISES) ids.push(challengeKey("bash", item.difficulty, "pt", item.id), challengeKey("bash", item.difficulty, "en", item.id));
        continue;
      }
      for (const difficulty of DIFFICULTIES) {
        ids.push(challengeKey(example.id, difficulty, "pt"), challengeKey(example.id, difficulty, "en"));
      }
    }
    return new Set(ids);
  }, []);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [category, setCategory] = useState("Fundamentos");
  const [lessonId, setLessonId] = useState("");
  const [exampleId, setExampleId] = useState<LanguageExampleId>("python");
  const [difficulty, setDifficulty] = useState<BashDifficulty>("beginner");
  const [bashId, setBashId] = useState(BASH_EXERCISES[0].id);

  // Progress lives in the account (0033): read it from the server on every device.
  useEffect(() => {
    let live = true;
    loadLearning(createClient())
      .then((rows) => live && setProgress(toLearning(rows, lessonIds, challengeIds)))
      .catch(() => live && setStorageNotice("Não foi possível carregar o seu progresso. Recarregue a página para tentar de novo."))
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [challengeIds, lessonIds]);

  const categories = useMemo(() => {
    const all = new Set(lessons.map((lesson) => lesson.category));
    return [...all].sort((a, b) => LANGUAGE_ORDER.indexOf(a) - LANGUAGE_ORDER.indexOf(b));
  }, [lessons]);
  const selectedCategory = categories.includes(category) ? category : categories[0] ?? "Fundamentos";
  const categoryLessons = lessons.filter((lesson) => lesson.category === selectedCategory);
  const selectedLesson = categoryLessons.find((lesson) => lesson.id === lessonId) ?? categoryLessons[0];
  const currentExample = LANGUAGE_CODE_EXAMPLES.find((item) => item.id === exampleId) ?? LANGUAGE_CODE_EXAMPLES[0];
  const isBash = currentExample.id === "bash";
  const level = isBash ? bashSnippet(bashId).difficulty : difficulty;
  const currentChallenge = challengeForLanguage(currentExample, level, bashId);
  const key = challengeKey(currentExample.id, level, lang, isBash ? bashId : undefined);

  /** Saves in the account first; the screen shows it as done only after the server confirms. */
  async function record(kind: "lesson" | "challenge", item: string, score?: number) {
    try {
      const row = await completeLearning(createClient(), kind, item, score);
      setProgress((current) => withRow(current, row));
      setStorageNotice("");
      return true;
    } catch {
      setStorageNotice("Não foi possível salvar o progresso na sua conta. Confira a conexão e tente de novo.");
      return false;
    }
  }

  function changeLanguage(next: TypingLang) {
    setLang(next);
    setLessonId("");
  }

  function markLessonComplete(lesson: TypingText) {
    if (progress.completedLessons.includes(lesson.id)) return;
    void record("lesson", lesson.id);
  }

  const totalLessons = lessonIds.size;
  const totalChallenges = challengeIds.size;

  return <>
    <div className="mb-5">
      <p className="pixel text-xs uppercase text-muted">Biblioteca de estudo</p>
      <p className="mt-2 max-w-3xl text-sm text-muted">Aprenda com aulas guiadas, pratique cada linguagem e acompanhe as playlists gratuitas. O progresso fica na sua conta e aparece em qualquer aparelho. Ele não altera os pontos, o ranking nem o grupo.</p>
      {storageNotice && <p role="status" className="mt-3 rounded-sm border border-pending/60 bg-warn-bg px-3 py-2 text-xs">{storageNotice}</p>}
    </div>

    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-sm border-2 border-divider bg-surface p-3"><p className="pixel text-[10px] uppercase text-muted">Aulas concluídas</p><p className="mt-1 text-xl font-bold">{progress.completedLessons.length}/{totalLessons}</p></div>
      <div className="rounded-sm border-2 border-divider bg-surface p-3"><p className="pixel text-[10px] uppercase text-muted">Desafios concluídos</p><p className="mt-1 text-xl font-bold">{progress.completedChallenges.length}/{totalChallenges}</p></div>
      <div className="col-span-2 rounded-sm border-2 border-divider bg-surface p-3 sm:col-span-2"><p className="pixel text-[10px] uppercase text-muted">Seu progresso</p><div className="mt-2 h-2 overflow-hidden rounded-sm bg-bg"><div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(((progress.completedLessons.length + progress.completedChallenges.length) / (totalLessons + totalChallenges)) * 100)}%` }} /></div><p className="mt-1 text-right text-xs text-muted">{Math.round(((progress.completedLessons.length + progress.completedChallenges.length) / (totalLessons + totalChallenges)) * 100)}%</p></div>
    </div>

    <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Conteúdo de aprendizagem">
      {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border-2 px-3 text-sm font-semibold ${tab === id ? "border-accent bg-raised text-accent" : "border-divider bg-surface text-muted hover:text-fg"}`} onClick={() => setTab(id)}><Icon size={16} aria-hidden />{label}</button>)}
    </div>

    {tab === "lessons" && <section className="card" aria-label="Aulas escritas">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="pixel text-[10px] uppercase text-muted">Curso guiado</p><h2 className="pixel mt-1 text-lg uppercase">Conceitos de programação</h2><p className="mt-1 text-sm text-muted">Cada trilha vai do básico ao avançado, uma etapa por vez. Cada etapa traz um assunto próprio.</p></div>
        <div className="flex rounded-sm border-2 border-divider bg-bg p-0.5" role="group" aria-label="Idioma das aulas">
          {([["pt", "Português"], ["en", "English"]] as const).map(([code, label]) => <button key={code} type="button" aria-pressed={lang === code} className={`min-h-9 rounded-sm px-3 text-xs font-semibold ${lang === code ? "bg-raised text-accent" : "text-muted"}`} onClick={() => changeLanguage(code)}>{label}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Trilha<select className="input mt-1" value={selectedCategory} onChange={(event) => { setCategory(event.target.value); setLessonId(""); }}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label className="text-sm font-semibold">Etapa<select className="input mt-1" value={selectedLesson?.id ?? ""} onChange={(event) => setLessonId(event.target.value)} data-testid="lesson-stage">
          {categoryLessons.map((item, index) => <option key={item.id} value={item.id}>{progress.completedLessons.includes(item.id) ? "✓ " : ""}{index + 1}. {item.stage} · {item.title}</option>)}
        </select></label>
      </div>
      {selectedLesson ? <article className="mt-4 rounded-sm border-2 border-divider bg-bg p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="pixel text-[10px] uppercase text-muted">{selectedLesson.category} · {selectedLesson.stage}</p><h3 className="pixel mt-1 break-words text-base uppercase">{selectedLesson.title}</h3></div><span className="rounded-sm border border-divider px-2 py-1 text-xs text-muted">Etapa {categoryLessons.indexOf(selectedLesson) + 1} de {categoryLessons.length} · {selectedLesson.stage}</span></div>
        <div className="mt-4 space-y-4 text-sm leading-7 text-fg">{selectedLesson.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
          <p className="text-xs text-muted">{progress.completedLessons.includes(selectedLesson.id) ? "Aula concluída; seu avanço foi guardado na sua conta." : "Leia até o fim e marque a aula para atualizar seu percentual."}</p>
          <button type="button" className="btn-primary min-h-10" disabled={progress.completedLessons.includes(selectedLesson.id)} onClick={() => markLessonComplete(selectedLesson)}><Check size={16} aria-hidden />{progress.completedLessons.includes(selectedLesson.id) ? "Concluída" : "Marcar como concluída"}</button>
        </div>
        <nav className="mt-3 flex flex-wrap items-center justify-between gap-2" aria-label="Etapas da trilha">
          {(() => {
            const at = categoryLessons.indexOf(selectedLesson);
            const prev = categoryLessons[at - 1];
            const next = categoryLessons[at + 1];
            return <>
              {prev ? <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => setLessonId(prev.id)}><span aria-hidden>←</span> Etapa anterior</button> : <span />}
              {next ? <button type="button" className="btn-secondary min-h-10 text-sm" onClick={() => setLessonId(next.id)} data-testid="lesson-next">Próxima etapa: {next.stage} <span aria-hidden>→</span></button> : <p className="text-sm text-muted">Fim da trilha de {selectedLesson.category}.</p>}
            </>;
          })()}
        </nav>
      </article> : <p className="mt-4 text-sm text-muted">Não há aulas para esta trilha ainda.</p>}
    </section>}

    {tab === "challenges" && <section className="card" aria-label="Desafios de código">
      <div><p className="pixel text-[10px] uppercase text-muted">Prática por linguagem</p><h2 className="pixel mt-1 text-lg uppercase">Código, tentativa e explicação</h2><p className="mt-1 text-sm text-muted">Sem visualizador, você escreve a solução e o app confere o que ela faz (em Bash, executando no interpretador isolado); dicas são opcionais e cada uma reduz os pontos. Com visualizador, você copia a referência e vale 1 ponto. O progresso fica na sua conta.</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Linguagem<select className="input mt-1" value={exampleId} onChange={(event) => { setExampleId(event.target.value as LanguageExampleId); }}>
          {LANGUAGE_CODE_EXAMPLES.map((item) => <option key={item.id} value={item.id}>{item.label[lang]}</option>)}
        </select></label>
        {isBash ? <label className="text-sm font-semibold">Exercício<select className="input mt-1" value={bashId} onChange={(event) => setBashId(event.target.value)} data-testid="bash-exercise">
          {BASH_EXERCISES.map((item, index) => {
            const done = progress.completedChallenges.includes(challengeKey("bash", item.difficulty, lang, item.id));
            return <option key={item.id} value={item.id}>{done ? "✓ " : ""}{index + 1}. {DIFFICULTY_LABEL[item.difficulty]} · {item.title[lang]}</option>;
          })}
        </select></label> : <label className="text-sm font-semibold">Nível<select className="input mt-1" value={difficulty} onChange={(event) => setDifficulty(event.target.value as BashDifficulty)}>
          {DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABEL[item]}</option>)}
        </select></label>}
        <div className="flex rounded-sm border-2 border-divider bg-bg p-0.5 sm:self-end" role="group" aria-label="Idioma do desafio">
          {([["pt", "PT"], ["en", "EN"]] as const).map(([code, label]) => <button key={code} type="button" aria-pressed={lang === code} className={`min-h-10 flex-1 rounded-sm px-3 text-xs font-semibold ${lang === code ? "bg-raised text-accent" : "text-muted"}`} onClick={() => setLang(code)}>{label}</button>)}
        </div>
      </div>
      <ChallengePanel
        key={key}
        example={currentExample}
        challenge={currentChallenge}
        lang={lang}
        difficulty={level}
        bashId={isBash ? bashId : undefined}
        progress={progress}
        challengeKey={key}
        onProgress={(score) => {
          // The server keeps the best score; a redo never lowers it.
          void record("challenge", key, Math.min(5, Math.max(0, Math.round(score))));
        }}
      />
    </section>}

    {tab === "videos" && <VideoLessonsScreen />}
    {!ready && <p className="sr-only" role="status">Carregando seu progresso…</p>}
  </>;
}

function ChallengePanel({ example, challenge, lang, difficulty, bashId, progress, challengeKey: key, onProgress }: {
  example: LanguageExample;
  challenge: LanguageCodeChallenge;
  lang: TypingLang;
  difficulty: BashDifficulty;
  bashId?: string;
  progress: Progress;
  challengeKey: string;
  onProgress: (score: number) => void;
}) {
  // "Sem visualizador" first, with no hint shown until asked (request of 13/11/2026).
  const [mode, setMode] = useState<"visualizer" | "hints">("hints");
  const [typed, setTyped] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [review, setReview] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cases, setCases] = useState<CaseResult[] | null>(null);
  // The answer that passed in this visit, and its output: shown only after the check approved it.
  const [passed, setPassed] = useState<{ code: string; output: string } | null>(null);
  const bash = useIsolatedBash();
  const solution = challenge.solution[lang];
  const hints = challenge.hints[lang];
  const revealed = hintLevel > hints.length;
  const checks = bashId ? BASH_CHECKS[bashId] : undefined;
  const runsAnswer = mode === "hints" && !!checks;
  const completed = progress.completedChallenges.includes(key) && !review;
  // No help: 5. Each hint takes 1 off. Seeing the solution is worth the same as the visualizer: 1.
  const points = mode === "visualizer" || revealed ? 1 : Math.max(1, 5 - hintLevel);
  const pt = lang === "pt";

  function typeReference(value: string) {
    const expected = Array.from(solution);
    const next = Array.from(value);
    const wrongAt = next.findIndex((character, index) => character !== expected[index]);
    if (wrongAt >= 0 && wrongAt < expected.length) {
      setTyped(next.slice(0, wrongAt + 1).join(""));
      setError(true);
      setNotice(pt ? `A digitação parou na posição ${wrongAt + 1}. Corrija o caractere marcado para continuar.` : `Typing stopped at position ${wrongAt + 1}. Correct the marked character to continue.`);
      return;
    }
    setTyped(next.length > expected.length ? solution : value);
    setError(false);
    setNotice("");
  }

  function approve(output: string) {
    onProgress(points);
    setPassed({ code: typed, output });
    setReview(false);
    setError(false);
    setNotice(pt ? `Desafio concluído (${points} ${points === 1 ? "ponto" : "pontos"}).` : `Challenge complete (${points} ${points === 1 ? "point" : "points"}).`);
  }

  async function submit() {
    setCases(null);
    if (mode === "visualizer") {
      if (typed !== solution) {
        setError(true);
        setNotice(pt ? "O texto ainda difere da referência. Revise e tente de novo." : "Your text still differs from the reference.");
        return;
      }
      return approve(challenge.output[lang]);
    }
    if (!checks) {
      // Languages without a behavior check yet: the answer is compared with the reference, ignoring spaces at line ends.
      if (normalizeCode(typed) !== normalizeCode(solution)) {
        setError(true);
        setNotice(pt ? "A resposta ainda difere da solução de referência. Revise e tente de novo." : "Your answer still differs from the reference. Review it and try again.");
        return;
      }
      return approve(challenge.output[lang]);
    }
    if (!bash.available || !bash.ready) {
      setError(true);
      setNotice(pt
        ? "A conferência roda a sua resposta no interpretador isolado, que não está disponível aqui. Use o modo com visualizador ou tente mais tarde."
        : "The check runs your answer in the isolated runner, which is not available here. Use the visualizer mode or try later.");
      return;
    }
    setChecking(true);
    setNotice(pt ? "Executando sua resposta no interpretador isolado…" : "Running your answer in the isolated runner…");
    const marker = randomMarker();
    try {
      const result = await bash.run(buildCheckScript(typed, checks, marker));
      const results = compareCheckOutput(result.stdout, checks, marker, lang, typed);
      setCases(results);
      if (result.timedOut) {
        setError(true);
        setNotice(pt ? "A execução passou de 10 segundos e foi interrompida." : "The run took more than 10 seconds and was stopped.");
      } else if (results.every((r) => r.ok)) {
        approve(results.map((r) => r.got.join("\n")).join("\n"));
      } else {
        setError(true);
        setNotice(pt ? `Sua resposta rodou, mas ${results.filter((r) => !r.ok).length} de ${results.length} casos não deram o resultado esperado.` : `Your answer ran, but ${results.filter((r) => !r.ok).length} of ${results.length} cases did not give the expected result.`);
      }
    } catch {
      setError(true);
      setNotice(pt ? "Não foi possível executar a resposta. Tente de novo." : "Could not run the answer. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function switchMode(next: "visualizer" | "hints") {
    setMode(next);
    setTyped("");
    setHintLevel(0);
    setNotice("");
    setError(false);
    setCases(null);
  }

  const challengeCompletedBefore = progress.completedChallenges.includes(key);
  const playgroundCode = passed?.code && mode === "hints" ? passed.code : example.id === "bash" ? solution : example.code[lang];

  return <section className="mt-4 rounded-sm border-2 border-accent/50 bg-raised p-3 sm:p-4" data-testid="language-code-challenge">
    {bash.frame}
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="pixel text-[10px] uppercase text-accent">{example.label[lang]} · {DIFFICULTY_LABEL[difficulty]}</p><h3 className="pixel mt-1 text-base uppercase">{challenge.title[lang]}</h3></div><span className="rounded-sm border border-divider px-2 py-1 text-xs text-muted">{progress.bestScores[key] ?? 0} ponto(s) · recorde</span></div>
    <p className="mt-2 text-sm text-muted">{challenge.prompt[lang]}</p>
    {checks && <ul className="mt-2 space-y-1 text-xs text-muted" aria-label="Casos conferidos">
      {checks.map((c, i) => <li key={i}>Caso {i + 1}: {c.label[lang]}{c.args?.length ? ` · argumentos: ${c.args.map((a) => `“${a}”`).join(" ")}` : ""}{c.stdin ? ` · entrada: “${c.stdin.trim()}”` : ""}</li>)}
    </ul>}
    <div className="mt-3 flex rounded-sm border-2 border-divider bg-bg p-0.5" role="group" aria-label="Modo de prática">
      <button type="button" aria-pressed={mode === "hints"} className={`min-h-10 flex-1 rounded-sm px-2 text-xs font-semibold ${mode === "hints" ? "bg-raised text-accent" : "text-muted"}`} onClick={() => switchMode("hints")} data-testid="mode-hints">Sem visualizador</button>
      <button type="button" aria-pressed={mode === "visualizer"} className={`min-h-10 flex-1 rounded-sm px-2 text-xs font-semibold ${mode === "visualizer" ? "bg-raised text-accent" : "text-muted"}`} onClick={() => switchMode("visualizer")} data-testid="mode-visualizer">Com visualizador</button>
    </div>
    <p className="mt-2 text-xs text-muted">Sem ajuda vale 5 pontos; cada dica tira 1; ver a solução vale 1, igual ao modo com visualizador.</p>

    {!completed && mode === "hints" && <div className="mt-3 rounded-sm border border-divider bg-bg p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="pixel text-xs uppercase">Dicas (opcionais)</h4><p className="mt-1 text-xs text-muted">{hints.length} dicas antes da solução de referência.</p></div><button type="button" className="btn-secondary min-h-9 text-xs" disabled={revealed} onClick={() => setHintLevel((value) => Math.min(hints.length + 1, value + 1))} data-testid="hint-next">{hintLevel === 0 ? "Pedir dica (−1 ponto)" : revealed ? "Solução revelada" : hintLevel === hints.length ? "Revelar solução (vale 1 ponto)" : "Próxima dica (−1 ponto)"}</button></div>{hintLevel > 0 && <div className="mt-3 border-l-2 border-accent pl-3 text-sm" aria-live="polite"><strong>{revealed ? "Solução de referência" : `Dica ${hintLevel} de ${hints.length}`}</strong>{revealed ? <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs">{solution}</pre> : <p className="mt-1">{hints[hintLevel - 1]}</p>}</div>}</div>}

    {!completed && mode === "visualizer" ? <label className="mt-3 block text-sm font-semibold">Digite o código de referência
      <div className={`relative mt-1 min-h-40 max-h-80 overflow-auto rounded-sm border-2 border-divider bg-bg p-3 font-mono text-sm leading-6 focus-within:border-accent ${error ? "border-fail" : ""}`}>
        <pre aria-hidden="true" className="m-0 whitespace-pre-wrap break-normal">{Array.from(solution).map((character, index) => <span key={index} className={typed[index] === undefined ? "text-muted" : typed[index] === character ? "text-fg" : "text-fail"}>{index === typed.length && <span aria-hidden="true" className="inline-block h-[1.1em] w-0.5 bg-accent align-middle" />}{character}</span>)}{typed.length === solution.length && <span aria-hidden="true" className="inline-block h-[1.1em] w-0.5 bg-accent align-middle" />}</pre>
        <textarea aria-label={`Digite o código de referência ${example.label.pt}`} aria-invalid={error} className="absolute inset-0 h-full w-full resize-none cursor-text overflow-hidden opacity-0" value={typed} onChange={(event) => typeReference(event.target.value)} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </div>
    </label> : !completed && <label className="mt-3 block text-sm font-semibold">Escreva sua solução
      <textarea className="input mt-1 min-h-40 resize-y py-3 font-mono text-sm leading-6" aria-invalid={error} value={typed} onChange={(event) => { setTyped(event.target.value); setError(false); setNotice(""); setCases(null); }} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Escreva sua resposta…" data-testid="challenge-answer" />
    </label>}

    {!completed && <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="btn-primary min-h-10" disabled={!typed.trim() || checking} onClick={submit} data-testid="challenge-submit"><Check size={16} aria-hidden />{runsAnswer ? "Executar e conferir" : "Conferir resposta"}</button><span className="text-xs text-muted">Esta tentativa vale até {points} ponto(s).</span></div>}
    {notice && <p role={error ? "alert" : "status"} className={`mt-2 text-sm ${error ? "text-fail" : "text-accent"}`} data-testid="challenge-notice">{notice}</p>}
    {/* Failed cases say what was expected and what came out, never the reference solution. */}
    {cases && !cases.every((r) => r.ok) && checks && <ul className="mt-2 space-y-2 text-xs" data-testid="challenge-cases">
      {cases.map((r, i) => <li key={i} className={`rounded-sm border p-2 ${r.ok ? "border-done/40" : "border-fail/60"}`}>
        <p className="font-semibold">{r.ok ? "✓" : "✗"} Caso {i + 1}: {checks[i].label[lang]}</p>
        {!r.ok && <div className="mt-1 grid gap-2 sm:grid-cols-2"><div><p className="text-muted">Esperado</p><pre className="whitespace-pre-wrap font-mono">{r.expected.join("\n") || "(nenhuma linha)"}</pre></div><div><p className="text-muted">Sua resposta mostrou</p><pre className="whitespace-pre-wrap font-mono">{r.got.join("\n") || "(nenhuma linha)"}</pre></div></div>}
      </li>)}
    </ul>}

    {completed && <div className="mt-4 rounded-sm border border-done/40 bg-done-bg p-3"><p className="font-semibold text-done">Desafio concluído. Seu progresso ficou guardado na sua conta.</p><p className="mt-1 text-xs text-muted">Recorde: {progress.bestScores[key] ?? 0} ponto(s)</p>
      {passed && <div className="mt-3 rounded-sm border border-divider bg-bg p-3" data-testid="challenge-output"><p className="pixel text-[10px] uppercase text-muted">{runsAnswer ? "Saída da sua resposta (aprovada)" : "Resultado esperado"}</p><pre className="mt-1 whitespace-pre-wrap font-mono text-sm">{passed.output}</pre></div>}
      <p className="mt-3 text-xs text-muted">Solução de referência</p><pre className="mt-1 max-h-72 overflow-auto rounded-sm border border-divider bg-bg p-3 font-mono text-xs leading-5"><code>{solution}</code></pre>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => setShowExplanation((value) => !value)}>{showExplanation ? "Ocultar explicação" : "Entender o código (beta)"}</button><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => setShowExample((value) => !value)}>{showExample ? "Fechar playground" : passed?.code && mode === "hints" ? "Abrir sua resposta no playground" : "Abrir no playground"}</button><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => { setReview(true); setTyped(""); setPassed(null); setCases(null); setHintLevel(0); setNotice("Revisão opcional: seu progresso e recorde serão preservados."); setError(false); }}>{challengeCompletedBefore ? "Fazer de novo" : "Tentar novamente"}</button></div>
      {showExplanation && <CodeExplainer code={passed?.code && mode === "hints" ? passed.code : solution} lang={lang} checks={checks} hints={hints} prompt={challenge.prompt[lang]} />}
      {showExample && <section className="mt-3 rounded-sm border border-divider bg-bg p-3" aria-label="Playground">
        <p className="pixel text-[10px] uppercase text-muted">{passed?.code && mode === "hints" ? "Sua resposta" : example.id === "bash" ? "Solução de referência deste exercício" : `Exemplo separado da trilha: ${example.title[lang]}`}</p>
        {example.id !== "bash" && <p className="mt-1 text-xs text-muted">Este exemplo é outro programa, para experimentar a linguagem; não é a resposta do desafio.</p>}
        {example.id === "bash" ? <BashTry code={playgroundCode} bash={bash} lang={lang} /> : <CodePlayground id={example.id} code={playgroundCode} expected={example.expected[lang]} lang={lang} />}
      </section>}
    </div>}
  </section>;
}

/** Run a Bash answer with arguments and standard input typed by the person (quoted: nothing is expanded or executed). */
function BashTry({ code, bash, lang }: { code: string; bash: ReturnType<typeof useIsolatedBash>; lang: TypingLang }) {
  const [source, setSource] = useState(code);
  const [args, setArgs] = useState("");
  const [stdin, setStdin] = useState("");
  const [out, setOut] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const marker = randomMarker();
    try {
      const list = args.split("\n").map((a) => a.trim()).filter(Boolean).slice(0, 10);
      const script = buildCheckScript(source, [{ args: list, stdin: stdin.slice(0, 4000) }], marker);
      const r = await bash.run(script);
      setOut({ text: (r.timedOut ? "Limite de 10 segundos atingido." : `${r.stdout.split(`\n${marker}\n`)[0]}${r.stderr ? `\n${r.stderr}` : ""}`).trim() || "(nenhuma saída)", failed: r.failed || r.timedOut });
    } catch {
      setOut({ text: "Não foi possível executar.", failed: true });
    } finally {
      setBusy(false);
    }
  }
  if (!bash.available) return <p className="mt-2 text-xs text-muted">O Bash roda só no interpretador isolado, que não está configurado neste endereço.</p>;
  return <div className="mt-2 space-y-2" data-testid="bash-try">
    <textarea className="input min-h-32 resize-y py-2 font-mono text-xs leading-5" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Código" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-semibold">Argumentos (um por linha)<textarea className="input mt-1 min-h-16 py-2 font-mono text-xs" value={args} onChange={(e) => setArgs(e.target.value)} spellCheck={false} autoCapitalize="off" /></label>
      <label className="text-xs font-semibold">Entrada padrão (stdin)<textarea className="input mt-1 min-h-16 py-2 font-mono text-xs" value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} autoCapitalize="off" data-testid="bash-stdin" /></label>
    </div>
    <button type="button" className="btn-primary min-h-10 text-sm" disabled={busy || !bash.ready} onClick={go}>{busy ? "Executando…" : lang === "pt" ? "Executar" : "Run"}</button>
    {out && <pre className={`whitespace-pre-wrap rounded-sm border p-2 font-mono text-xs ${out.failed ? "border-fail/60" : "border-divider"}`} role="status">{out.text}</pre>}
    <p className="text-xs text-muted">Roda no interpretador isolado, sem rede e sem a sua sessão, com até 5 s de execução e 16 MB de memória.</p>
  </div>;
}

/**
 * Beta: explanation and questions about the code, put together on this device from the exercise itself (line rules,
 * cases, hints). No AI, nothing is sent anywhere.
 */
function CodeExplainer({ code, lang, checks, hints, prompt }: { code: string; lang: TypingLang; checks?: typeof BASH_CHECKS[string]; hints: string[]; prompt: string }) {
  const questions: [string, string][] = [
    ["O que o código precisa fazer?", prompt],
    ["Com que entradas ele é testado?", checks ? checks.map((c, i) => `Caso ${i + 1}, ${c.label[lang]}${c.args?.length ? `: argumentos ${c.args.map(shellQuote).join(" ")}` : ""}${c.stdin ? `: entrada ${c.stdin.trim()}` : ""}.`).join(" ") : "Este exercício não tem casos executáveis; compare com o resultado esperado."],
    ["O que ele deve mostrar?", checks ? checks.map((c, i) => `Caso ${i + 1}: ${c.expect[lang].join(" / ") || "nada"}.`).join(" ") : "Veja o resultado esperado acima."],
    ["Qual é o ponto que mais costuma dar errado?", hints.at(-1) ?? ""],
  ];
  const [open, setOpen] = useState(0);
  return <section className="mt-3 space-y-2 rounded-sm border border-divider bg-bg p-3" aria-label="Entender o código" data-testid="code-explainer">
    <p className="pixel text-[10px] uppercase text-accent">Protótipo beta</p>
    <p className="text-xs text-muted">Explicação montada neste aparelho a partir do próprio exercício. Sem IA e sem enviar o seu código para ninguém.</p>
    <div className="space-y-1">{questions.map(([q, a], i) => <div key={q} className="rounded-sm border border-divider bg-surface">
      <button type="button" aria-expanded={open === i} className="flex min-h-10 w-full items-center justify-between gap-2 px-2 text-left text-sm font-semibold" onClick={() => setOpen(open === i ? -1 : i)}>{q}<span aria-hidden>{open === i ? "−" : "+"}</span></button>
      {open === i && <p className="px-2 pb-2 text-sm text-muted">{a}</p>}
    </div>)}</div>
    <h4 className="pixel pt-2 text-xs uppercase">Linha por linha</h4>
    <div className="max-h-80 space-y-2 overflow-y-auto">{code.split("\n").map((line, index) => <article key={`${index}-${line}`} className="rounded-sm border border-divider bg-surface p-2"><p className="text-[10px] uppercase text-muted">Linha {index + 1}</p><code className="mt-1 block break-all font-mono text-xs">{line || "(linha em branco)"}</code><p className="mt-1 text-xs text-muted">{lineExplanation(line, lang)}</p></article>)}</div>
  </section>;
}

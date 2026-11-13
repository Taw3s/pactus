"use client";

import dynamic from "next/dynamic";
import { BookOpen, Check, Code2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BASH_CODE_SNIPPETS, type BashDifficulty } from "@/lib/typing-code";
import { LANGUAGE_CODE_EXAMPLES, type LanguageCodeChallenge, type LanguageExample, type LanguageExampleId } from "@/lib/typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "@/lib/typing-language-challenges";
import { expandTypingLessons } from "@/lib/typing-lesson-expansion";
import { TEACHER_TEXTS_EN } from "@/lib/typing-teacher-lessons-en";
import { TEACHER_TEXTS_PT } from "@/lib/typing-teacher-lessons-pt";
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

function challengeForLanguage(example: LanguageExample, difficulty: BashDifficulty): LanguageCodeChallenge {
  if (example.id === "bash") {
    const snippet = BASH_CODE_SNIPPETS.find((item) => item.difficulty === difficulty) ?? BASH_CODE_SNIPPETS[0];
    return { title: snippet.title, prompt: snippet.challenge, solution: snippet.code, hints: snippet.hints, output: snippet.output };
  }
  if (difficulty === "beginner") return example.challenge;
  return LANGUAGE_CODE_LEVEL_CHALLENGES[example.id]?.[difficulty] ?? example.challenge;
}

function challengeKey(id: LanguageExampleId, difficulty: BashDifficulty, lang: TypingLang) {
  return `${id}:${difficulty}:${lang}`;
}

function normalizeCode(value: string) {
  return value.replace(/\r\n/g, "\n").trim().split("\n").map((line) => line.trimEnd()).join("\n");
}

function lineExplanation(line: string, lang: TypingLang) {
  const value = line.trim();
  if (!value) return lang === "pt" ? "Esta linha em branco separa blocos para facilitar a leitura." : "This blank line separates blocks for readability.";
  if (/^(const|let|var|final|int|String|boolean|bool|\w+\s*=)/.test(value)) return lang === "pt" ? "Aqui o programa guarda ou atualiza um valor que será usado por outras linhas." : "This line stores or updates a value used by later lines.";
  if (/^(if|else|elif|switch|case|when|\[\[)/.test(value)) return lang === "pt" ? "Esta condição escolhe qual caminho o programa segue conforme os dados." : "This condition selects a path based on the data.";
  if (/^(for|while|foreach|forEach|for\s*\()/.test(value)) return lang === "pt" ? "Este trecho repete uma operação para cada item ou enquanto a condição continuar verdadeira." : "This part repeats an operation for each item or while its condition remains true.";
  if (/^(function|def |class |public static|export |async |=>)/.test(value)) return lang === "pt" ? "Esta linha inicia uma função ou estrutura que organiza uma responsabilidade reutilizável." : "This line starts a function or structure that organizes a reusable responsibility.";
  if (/^(print|printf|console\.|System\.out|SELECT|INSERT|UPDATE|DELETE|CREATE|document\.|element\.)/i.test(value)) return lang === "pt" ? "Esta instrução produz uma saída, consulta dados ou altera o que aparece na página." : "This statement produces output, queries data, or changes what appears on the page.";
  return lang === "pt" ? "Leia esta linha junto com o bloco: ela contribui para transformar a entrada no resultado esperado." : "Read this line with the surrounding block: it helps transform the input into the expected result.";
}

export function LearningHub() {
  const [tab, setTab] = useState<Tab>("lessons");
  const [lang, setLang] = useState<TypingLang>("pt");
  const lessons = useMemo(() => expandTypingLessons(lang === "pt" ? [...TEACHER_TEXTS_PT] : [...TEACHER_TEXTS_EN]), [lang]);
  const lessonIds = useMemo(() => new Set([...TEACHER_TEXTS_PT, ...TEACHER_TEXTS_EN].map((item) => item.id)), []);
  const challengeIds = useMemo(() => {
    const ids: string[] = [];
    for (const example of LANGUAGE_CODE_EXAMPLES) {
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
  const currentChallenge = challengeForLanguage(currentExample, difficulty);
  const key = challengeKey(currentExample.id, difficulty, lang);

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

  const totalLessons = TEACHER_TEXTS_PT.length + TEACHER_TEXTS_EN.length;
  const totalChallenges = LANGUAGE_CODE_EXAMPLES.length * DIFFICULTIES.length * 2;

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
        <div><p className="pixel text-[10px] uppercase text-muted">Curso guiado</p><h2 className="pixel mt-1 text-lg uppercase">Conceitos de programação</h2><p className="mt-1 text-sm text-muted">Cada aula apresenta a ideia, desenvolve um exemplo e conclui preparando a próxima.</p></div>
        <div className="flex rounded-sm border-2 border-divider bg-bg p-0.5" role="group" aria-label="Idioma das aulas">
          {([["pt", "Português"], ["en", "English"]] as const).map(([code, label]) => <button key={code} type="button" aria-pressed={lang === code} className={`min-h-9 rounded-sm px-3 text-xs font-semibold ${lang === code ? "bg-raised text-accent" : "text-muted"}`} onClick={() => changeLanguage(code)}>{label}</button>)}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">Trilha<select className="input mt-1" value={selectedCategory} onChange={(event) => { setCategory(event.target.value); setLessonId(""); }}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select></label>
        <label className="text-sm font-semibold">Aula<select className="input mt-1" value={selectedLesson?.id ?? ""} onChange={(event) => setLessonId(event.target.value)}>
          {categoryLessons.map((item) => <option key={item.id} value={item.id}>{progress.completedLessons.includes(item.id) ? "✓ " : ""}{item.title}</option>)}
        </select></label>
      </div>
      {selectedLesson ? <article className="mt-4 rounded-sm border-2 border-divider bg-bg p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="pixel text-[10px] uppercase text-muted">{selectedLesson.category}</p><h3 className="pixel mt-1 break-words text-base uppercase">{selectedLesson.title}</h3></div><span className="rounded-sm border border-divider px-2 py-1 text-xs text-muted">{selectedLesson.text.length.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")} caracteres</span></div>
        <div className="mt-4 space-y-4 text-sm leading-7 text-fg">{selectedLesson.text.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
          <p className="text-xs text-muted">{progress.completedLessons.includes(selectedLesson.id) ? "Aula concluída; seu avanço foi guardado na sua conta." : "Leia até o fim e marque a aula para atualizar seu percentual."}</p>
          <button type="button" className="btn-primary min-h-10" disabled={progress.completedLessons.includes(selectedLesson.id)} onClick={() => markLessonComplete(selectedLesson)}><Check size={16} aria-hidden />{progress.completedLessons.includes(selectedLesson.id) ? "Concluída" : "Marcar como concluída"}</button>
        </div>
        {categoryLessons.length > 1 && <button type="button" className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-sm border border-divider px-3 text-sm text-accent hover:border-accent" onClick={() => setLessonId(categoryLessons[(categoryLessons.findIndex((lesson) => lesson.id === selectedLesson.id) + 1) % categoryLessons.length].id)}>Próxima aula <span aria-hidden>→</span></button>}
      </article> : <p className="mt-4 text-sm text-muted">Não há aulas para esta trilha ainda.</p>}
    </section>}

    {tab === "challenges" && <section className="card" aria-label="Desafios de código">
      <div><p className="pixel text-[10px] uppercase text-muted">Prática por linguagem</p><h2 className="pixel mt-1 text-lg uppercase">Código, tentativa e explicação</h2><p className="mt-1 text-sm text-muted">Com visualizador, copie a referência caractere por caractere. Sem visualizador, resolva com dicas graduais. O desafio só é salvo no seu navegador.</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Linguagem<select className="input mt-1" value={exampleId} onChange={(event) => { setExampleId(event.target.value as LanguageExampleId); }}>
          {LANGUAGE_CODE_EXAMPLES.map((item) => <option key={item.id} value={item.id}>{item.label[lang]}</option>)}
        </select></label>
        <label className="text-sm font-semibold">Nível<select className="input mt-1" value={difficulty} onChange={(event) => setDifficulty(event.target.value as BashDifficulty)}>
          {DIFFICULTIES.map((item) => <option key={item} value={item}>{DIFFICULTY_LABEL[item]}</option>)}
        </select></label>
        <div className="flex rounded-sm border-2 border-divider bg-bg p-0.5 sm:self-end" role="group" aria-label="Idioma do desafio">
          {([["pt", "PT"], ["en", "EN"]] as const).map(([code, label]) => <button key={code} type="button" aria-pressed={lang === code} className={`min-h-10 flex-1 rounded-sm px-3 text-xs font-semibold ${lang === code ? "bg-raised text-accent" : "text-muted"}`} onClick={() => setLang(code)}>{label}</button>)}
        </div>
      </div>
      <ChallengePanel
        key={key}
        example={currentExample}
        challenge={currentChallenge}
        lang={lang}
        difficulty={difficulty}
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

function ChallengePanel({ example, challenge, lang, difficulty, progress, challengeKey: key, onProgress }: {
  example: LanguageExample;
  challenge: LanguageCodeChallenge;
  lang: TypingLang;
  difficulty: BashDifficulty;
  progress: Progress;
  challengeKey: string;
  onProgress: (score: number) => void;
}) {
  const [mode, setMode] = useState<"visualizer" | "hints">("visualizer");
  const [typed, setTyped] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [review, setReview] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const solution = challenge.solution[lang];
  const completed = progress.completedChallenges.includes(key) && !review;
  const points = mode === "visualizer" ? 1 : Math.max(1, 5 - Math.min(hintLevel, 4));

  function typeReference(value: string) {
    const expected = Array.from(solution);
    const next = Array.from(value);
    const wrongAt = next.findIndex((character, index) => character !== expected[index]);
    if (wrongAt >= 0 && wrongAt < expected.length) {
      setTyped(next.slice(0, wrongAt + 1).join(""));
      setError(true);
      setNotice(lang === "pt" ? `A digitação parou na posição ${wrongAt + 1}. Corrija o caractere marcado para continuar.` : `Typing stopped at position ${wrongAt + 1}. Correct the marked character to continue.`);
      return;
    }
    setTyped(next.length > expected.length ? solution : value);
    setError(false);
    setNotice("");
  }

  function submit() {
    if (mode === "visualizer" ? typed !== solution : normalizeCode(typed) !== normalizeCode(solution)) {
      setError(true);
      setNotice(lang === "pt" ? "A resposta ainda difere da solução de referência. Revise e tente de novo." : "Your answer still differs from the reference. Review it and try again.");
      return;
    }
    onProgress(points);
    setReview(false);
    setError(false);
    setNotice(lang === "pt" ? "Desafio concluído. O código abaixo roda apenas neste navegador." : "Challenge complete. The code below runs only in this browser.");
  }

  const challengeCompletedBefore = progress.completedChallenges.includes(key);

  return <section className="mt-4 rounded-sm border-2 border-accent/50 bg-raised p-3 sm:p-4" data-testid="language-code-challenge">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="pixel text-[10px] uppercase text-accent">{example.label[lang]} · {DIFFICULTY_LABEL[difficulty]}</p><h3 className="pixel mt-1 text-base uppercase">{challenge.title[lang]}</h3></div><span className="rounded-sm border border-divider px-2 py-1 text-xs text-muted">{progress.bestScores[key] ?? 0} ponto(s) · recorde</span></div>
    <p className="mt-2 text-sm text-muted">{challenge.prompt[lang]}</p>
    <div className="mt-3 flex rounded-sm border-2 border-divider bg-bg p-0.5" role="group" aria-label="Modo de prática">
      <button type="button" aria-pressed={mode === "visualizer"} className={`min-h-10 flex-1 rounded-sm px-2 text-xs font-semibold ${mode === "visualizer" ? "bg-raised text-accent" : "text-muted"}`} onClick={() => { setMode("visualizer"); setTyped(""); setHintLevel(0); setNotice(""); setError(false); }}>Com visualizador</button>
      <button type="button" aria-pressed={mode === "hints"} className={`min-h-10 flex-1 rounded-sm px-2 text-xs font-semibold ${mode === "hints" ? "bg-raised text-accent" : "text-muted"}`} onClick={() => { setMode("hints"); setTyped(""); setHintLevel(0); setNotice(""); setError(false); }}>Sem visualizador</button>
    </div>

    {!completed && mode === "hints" && <div className="mt-3 rounded-sm border border-divider bg-bg p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="pixel text-xs uppercase">Dicas graduais</h4><p className="mt-1 text-xs text-muted">{challenge.hints[lang].length} pistas antes da solução de referência.</p></div><button type="button" className="btn-secondary min-h-9 text-xs" disabled={hintLevel > challenge.hints[lang].length} onClick={() => setHintLevel((value) => Math.min(challenge.hints[lang].length + 1, value + 1))}>{hintLevel === 0 ? "Pedir dica" : hintLevel > challenge.hints[lang].length ? "Solução revelada" : hintLevel === challenge.hints[lang].length ? "Revelar solução" : "Próxima dica"}</button></div>{hintLevel > 0 && <div className="mt-3 border-l-2 border-accent pl-3 text-sm" aria-live="polite"><strong>{hintLevel <= challenge.hints[lang].length ? `Dica ${hintLevel} de ${challenge.hints[lang].length}` : "Solução de referência"}</strong>{hintLevel <= challenge.hints[lang].length ? <p className="mt-1">{challenge.hints[lang][hintLevel - 1]}</p> : <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-xs">{solution}</pre>}</div>}</div>}

    {!completed && mode === "visualizer" ? <label className="mt-3 block text-sm font-semibold">Digite o código de referência
      <div className={`relative mt-1 min-h-40 max-h-80 overflow-auto rounded-sm border-2 border-divider bg-bg p-3 font-mono text-sm leading-6 focus-within:border-accent ${error ? "border-fail" : ""}`}>
        <pre aria-hidden="true" className="m-0 whitespace-pre-wrap break-normal">{Array.from(solution).map((character, index) => <span key={index} className={typed[index] === undefined ? "text-muted" : typed[index] === character ? "text-fg" : "text-fail"}>{index === typed.length && <span aria-hidden="true" className="inline-block h-[1.1em] w-0.5 bg-accent align-middle" />}{character}</span>)}{typed.length === solution.length && <span aria-hidden="true" className="inline-block h-[1.1em] w-0.5 bg-accent align-middle" />}</pre>
        <textarea aria-label={`Digite o código de referência ${example.label.pt}`} aria-invalid={error} className="absolute inset-0 h-full w-full resize-none cursor-text overflow-hidden opacity-0" value={typed} onChange={(event) => typeReference(event.target.value)} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </div>
    </label> : !completed && <label className="mt-3 block text-sm font-semibold">Escreva sua solução
      <textarea className="input mt-1 min-h-40 resize-y py-3 font-mono text-sm leading-6" aria-invalid={error} value={typed} onChange={(event) => { setTyped(event.target.value); setError(false); setNotice(""); }} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Escreva sua resposta…" />
    </label>}

    {!completed && <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" className="btn-primary min-h-10" disabled={!typed.trim()} onClick={submit}><Check size={16} aria-hidden />Conferir resposta</button><span className="text-xs text-muted">Esta tentativa vale até {points} ponto(s).</span></div>}
    {notice && <p role={error ? "alert" : "status"} className={`mt-2 text-sm ${error ? "text-fail" : "text-accent"}`}>{notice}</p>}

    {completed && <div className="mt-4 rounded-sm border border-done/40 bg-done-bg p-3"><p className="font-semibold text-done">Desafio concluído. Seu progresso ficou guardado na sua conta.</p><p className="mt-1 text-xs text-muted">Solução de referência · recorde: {progress.bestScores[key] ?? 0} ponto(s)</p><pre className="mt-3 max-h-72 overflow-auto rounded-sm border border-divider bg-bg p-3 font-mono text-xs leading-5"><code>{solution}</code></pre><div className="mt-3 rounded-sm border border-divider bg-bg p-3"><p className="pixel text-[10px] uppercase text-muted">Resultado esperado</p><pre className="mt-1 whitespace-pre-wrap font-mono text-sm">{challenge.output[lang]}</pre></div>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => setShowExplanation((value) => !value)}>{showExplanation ? "Ocultar explicação" : "Entender linha por linha"}</button><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => setShowExample((value) => !value)}>{showExample ? "Ocultar exemplo" : "Abrir exemplo e playground"}</button><button type="button" className="btn-secondary min-h-9 text-xs" onClick={() => { setReview(true); setTyped(""); setNotice("Revisão opcional: seu progresso e recorde serão preservados."); setError(false); }}>{challengeCompletedBefore ? "Fazer de novo" : "Tentar novamente"}</button></div>
      {showExplanation && <section className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-sm border border-divider bg-bg p-3" aria-label="Explicação linha por linha"><h4 className="pixel text-xs uppercase">Explicação linha por linha</h4><p className="text-xs text-muted">A explicação descreve o papel provável de cada linha; confira como as partes se combinam no exemplo.</p>{solution.split("\n").map((line, index) => <article key={`${index}-${line}`} className="rounded-sm border border-divider bg-surface p-2"><p className="text-[10px] uppercase text-muted">Linha {index + 1}</p><code className="mt-1 block break-all font-mono text-xs">{line || "(linha em branco)"}</code><p className="mt-1 text-xs text-muted">{lineExplanation(line, lang)}</p></article>)}</section>}
      {showExample && <section className="mt-3 rounded-sm border border-divider bg-bg p-3" aria-label="Exemplo de código para experimentar"><div className="flex items-start justify-between gap-2"><div><p className="pixel text-[10px] uppercase text-muted">Exemplo da trilha</p><h4 className="pixel mt-1 text-xs uppercase">{example.title[lang]}</h4><p className="mt-1 text-xs text-muted">{example.summary[lang]}</p></div></div><pre className="mt-3 max-h-56 overflow-auto rounded-sm border border-divider bg-surface p-3 font-mono text-xs leading-5"><code>{example.code[lang]}</code></pre><p className="mt-2 text-xs text-muted">{example.howToTry[lang]}</p><div className="mt-2 rounded-sm border border-done/30 bg-done-bg p-2"><p className="pixel text-[10px] uppercase text-done">Resultado do exemplo</p><pre className="mt-1 whitespace-pre-wrap font-mono text-xs">{example.expected[lang]}</pre></div><CodePlayground id={example.id} code={example.code[lang]} expected={example.expected[lang]} lang={lang} /></section>}
    </div>}
  </section>;
}

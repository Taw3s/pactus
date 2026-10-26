"use client";

import { BookOpen, Check, Keyboard, Loader, Shuffle } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { countRun, DEVICE_LABEL, deviceKind, makeWords, typingLabel, type TypingLang } from "@/lib/typing";
import { progressAfter, textWords, TYPING_CATEGORIES, TYPING_TEXTS, typingText, wordsFrom, type TypingText } from "@/lib/typing-texts";

export interface TypingResult {
  testId: string;
  wpm: number;
  accuracy: number;
  score: number;
  device: "pc" | "mobile";
  /** Texto mode: how far the person got in the text, to show after the result. */
  moved?: string;
}

type Mode = "words" | "text";
const PREF = "pacto:typing";

const ERRORS: [string, string][] = [
  ["no attempts left", "Você já usou as 3 tentativas de hoje."],
  ["timing", "O tempo do teste não bateu (o app ficou em segundo plano?). Faça outro."],
  ["implausible", "Resultado impossível para 1 minuto. Faça outro."],
];

/**
 * One-minute typing test. The server starts and ends the clock (start/finish_typing_test) and
 * computes the result; this screen shows the words and counts what was typed. Random words or a
 * text about programming, which continues where the person stopped last time; in Portuguese or
 * English. While typing, the text itself is the field: letters light up as they are typed and a
 * caret follows them (as on Monkeytype); a transparent input over it receives the keys.
 */
export function TypingTest({ attemptsLeft, onResult }: { attemptsLeft: number; onResult: (r: TypingResult) => void | Promise<void> }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "sending" | "done">("idle");
  const [words, setWords] = useState<string[]>([]);
  const [committed, setCommitted] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<TypingResult | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("words");
  const [lang, setLang] = useState<TypingLang>("pt");
  // The chosen text of each language.
  const [texts, setTexts] = useState<Record<TypingLang, string>>(() => ({
    pt: TYPING_TEXTS.find((t) => t.lang === "pt")!.id,
    en: TYPING_TEXTS.find((t) => t.lang === "en")!.id,
  }));
  const textId = texts[lang];
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const test = useRef<{ id: string; seconds: number; started: number; device: "pc" | "mobile"; text: string | null; start: number } | null>(null);
  const [typingLang, setTypingLang] = useState<TypingLang>("pt");
  const [focused, setFocused] = useState(false);
  const run = useRef({ committed: [] as string[], current: "", words: [] as string[] });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  // The last choice (mode, language, texts) is remembered on this device; the place in each text is on the server.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF) ?? "{}");
      if (saved.mode === "text" || saved.mode === "words") setMode(saved.mode);
      if (saved.lang === "pt" || saved.lang === "en") setLang(saved.lang);
      for (const id of Object.values(saved.texts ?? {})) {
        const t = typingText(id as string);
        if (t) setTexts((cur) => ({ ...cur, [t.lang]: t.id }));
      }
    } catch {}
    loadProgress();
  }, []);

  function choose(next: { mode?: Mode; lang?: TypingLang; text?: string }) {
    const m = next.mode ?? mode;
    const l = next.lang ?? lang;
    const ts = next.text ? { ...texts, [l]: next.text } : texts;
    setMode(m);
    setLang(l);
    setTexts(ts);
    try {
      localStorage.setItem(PREF, JSON.stringify({ mode: m, lang: l, texts: ts }));
    } catch {}
  }

  async function loadProgress() {
    const { data } = await createClient().from("typing_progress").select("text_id, words");
    setProgress(Object.fromEntries((data ?? []).map((r) => [r.text_id as string, Number(r.words)])));
  }

  async function start() {
    setError("");
    setPhase("starting");
    const device = deviceKind();
    const text = mode === "text" ? typingText(textId) : null;
    const { data, error } = await createClient().rpc("start_typing_test", { p_device: device, p_mode: text ? "text" : "words", p_text: text?.id ?? null, p_lang: lang });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível começar. Tente de novo.");
      setPhase("idle");
      return;
    }
    const start = Number(row.start_word ?? 0);
    const list = text ? wordsFrom(text, start).words : makeWords(120, Math.random, lang);
    setTitle(text?.title ?? "");
    setTypingLang(lang);
    run.current = { committed: [], current: "", words: list };
    setWords(list);
    setCommitted([]);
    setCurrent("");
    test.current = { id: row.test_id, seconds: row.seconds, started: Date.now(), device, text: text?.id ?? null, start };
    setLeft(row.seconds);
    setPhase("running");
    requestAnimationFrame(() => input.current?.focus());
    timer.current = setInterval(() => {
      const t = test.current!;
      const remaining = Math.max(0, Math.ceil(t.seconds - (Date.now() - t.started) / 1000));
      setLeft(remaining);
      if (remaining === 0) finish();
    }, 200);
  }

  async function finish() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const t = test.current;
    if (!t) return;
    test.current = null;
    setPhase("sending");
    const { correct, typed } = countRun(run.current.words, run.current.committed, run.current.current);
    const text = typingText(t.text);
    const words = run.current.committed.length;
    const place = text ? progressAfter(text, t.start, words) : null;
    const { data, error } = await createClient().rpc("finish_typing_test", {
      p_test: t.id,
      p_correct: correct,
      p_typed: typed,
      p_words: words,
      p_restart: place?.restart ?? false,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível salvar o resultado.");
      setPhase("idle");
      return;
    }
    const r: TypingResult = { testId: t.id, wpm: Number(row.wpm), accuracy: Number(row.accuracy), score: Number(row.score), device: t.device };
    if (text && place) {
      r.moved = place.restart
        ? `Você terminou “${text.title}”. No próximo teste ele recomeça.`
        : `Avançou ${words} ${words === 1 ? "palavra" : "palavras"} em “${text.title}” (${Math.round((place.words / textWords(text).length) * 100)}%).`;
      setProgress((p) => ({ ...p, [text.id]: place.words }));
    }
    setResult(r);
    setPhase("done");
    await onResult(r);
  }

  function type(value: string) {
    if (phase !== "running") return;
    // A space (or several) ends the word.
    if (/\s/.test(value)) {
      const word = value.trim();
      if (!word) return setCurrent("");
      run.current.committed = [...run.current.committed, word];
      run.current.current = "";
      setCommitted(run.current.committed);
      setCurrent("");
      return;
    }
    run.current.current = value;
    setCurrent(value);
  }

  const at = committed.length;

  return (
    <div className="space-y-3" data-testid="typing-test" data-phase={phase}>
      {phase === "idle" || phase === "starting" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Idioma</span>
            <div className="flex rounded-sm border-2 border-bevel-dark bg-bg p-0.5" role="radiogroup" aria-label="Idioma">
              {(["pt", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={lang === l}
                  className={`min-h-11 rounded-sm px-3 text-sm font-semibold ${lang === l ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
                  onClick={() => choose({ lang: l })}
                  data-testid={`typing-lang-${l}`}
                  lang={l === "en" ? "en" : "pt-BR"}
                >
                  {l === "pt" ? "Português" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="O que digitar">
            {(
              [
                ["words", "Palavras", "Comuns, em ordem aleatória", Shuffle],
                ["text", "Texto", "Programação, para ler digitando", BookOpen],
              ] as const
            ).map(([m, label, hint, Icon]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => choose({ mode: m })}
                data-testid={`typing-mode-${m}`}
                className={`flex min-h-20 flex-col items-start gap-1 rounded-sm border-2 p-3 text-left shadow-[3px_3px_0_var(--color-hard-shadow)] ${
                  mode === m ? "border-accent bg-raised" : "border-bevel-dark bg-bg hover:bg-raised"
                }`}
              >
                <span className={`pixel flex items-center gap-2 text-lg uppercase leading-5 ${mode === m ? "text-accent" : ""}`}>
                  <Icon size={18} aria-hidden /> {label}
                </span>
                <span className="text-xs text-muted">{hint}</span>
              </button>
            ))}
          </div>
          {mode === "text" && <TextPicker lang={lang} selected={textId} progress={progress} onPick={(id) => choose({ text: id })} />}
          <p className="text-sm text-muted">
            1 minuto digitando {mode === "text" ? "o texto, lendo enquanto digita" : "as palavras que aparecem"}. Vale a melhor de {attemptsLeft === 3 ? "3 tentativas" : `${attemptsLeft} ${attemptsLeft === 1 ? "tentativa restante" : "tentativas restantes"}`} hoje. Colar não funciona.
          </p>
          <button className="btn-primary w-full" onClick={start} disabled={attemptsLeft <= 0 || phase === "starting"}>
            {phase === "starting" ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" /> : <Keyboard size={18} aria-hidden />}
            {attemptsLeft <= 0 ? "Sem tentativas hoje" : "Começar teste"}
          </button>
        </>
      ) : phase === "done" && result ? (
        <p className="pixel text-2xl uppercase" data-testid="typing-result" role="status">
          {typingLabel(result)} <span className="text-base text-muted">· {DEVICE_LABEL[result.device]}</span>
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="pixel tabular text-4xl font-bold leading-10 text-accent" aria-live="off">
                {phase === "sending" ? "…" : left}
              </p>
              {title && <p className="truncate text-sm text-muted">{title}</p>}
            </div>
            <p className="tabular shrink-0 text-sm text-muted">{committed.length} palavras</p>
          </div>
          <Board words={words} committed={committed} current={current} lang={typingLang} focused={focused} running={phase === "running"}>
            <input
              ref={input}
              // Transparent, over the text: tapping the text opens the keyboard on phones.
              className="absolute inset-0 h-full w-full cursor-text resize-none opacity-0"
              aria-invalid={!!current && !(words[at] ?? "").startsWith(current)}
              value={current}
              onChange={(e) => type(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={phase !== "running"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Digite aqui. Palavra atual: ${words[at] ?? ""}`}
              data-testid="typing-input"
            />
          </Board>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
    </div>
  );
}

/** One word, letter by letter: typed letters right or wrong, extras in red, a wrong word underlined. */
function Word({ target, typed, state, caret }: { target: string; typed: string; state: "done" | "current" | "next"; caret: boolean }) {
  const wrongWord = state === "done" && typed !== target;
  const letters = [...target];
  const extra = [...typed].slice(letters.length);
  const caretAt = caret ? [...typed].length : -1;
  const bar = <span aria-hidden className="absolute -left-px top-1 bottom-1 w-0.5 bg-accent animate-[caret-blink_1s_infinite] motion-reduce:animate-none" />;
  return (
    <span
      className={`relative mr-[0.55em] inline-block align-top ${wrongWord ? "underline decoration-fail decoration-2 underline-offset-4" : ""}`}
      data-testid={state === "current" ? "typing-word-current" : undefined}
    >
      {letters.map((ch, i) => {
        const t = typed[i];
        const cls = state === "next" || t === undefined ? (state === "done" ? "text-muted/60" : "text-muted") : t === ch ? "text-fg" : "text-fail";
        return (
          <span key={i} className={`relative ${cls}`}>
            {caretAt === i && bar}
            {ch}
          </span>
        );
      })}
      {extra.map((ch, i) => (
        <span key={`x${i}`} className="relative text-fail/70">
          {ch}
        </span>
      ))}
      {caretAt >= Math.max(letters.length, [...typed].length) && <span className="relative">{bar}</span>}
    </span>
  );
}

/**
 * The text as the typing field: three lines, scrolling a line at a time so the current word stays
 * on the first or second line. Children: the transparent input that receives the keys.
 */
function Board({
  words,
  committed,
  current,
  lang,
  focused,
  running,
  children,
}: {
  words: string[];
  committed: string[];
  current: string;
  lang: TypingLang;
  focused: boolean;
  running: boolean;
  children: React.ReactNode;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const at = committed.length;

  useLayoutEffect(() => {
    const box = inner.current;
    const el = box?.querySelector<HTMLElement>('[data-testid="typing-word-current"]');
    if (!box || !el) return;
    // Keep one finished line above the current one: scroll to the top of the previous line, measured
    // from the words themselves (line boxes can be taller than the line-height).
    const tops = [...box.children].map((w) => (w as HTMLElement).offsetTop);
    const above = tops.filter((t) => t < el.offsetTop);
    setScroll(above.length ? Math.max(...above) - tops[0] : 0);
  }, [at, words]);

  // Only a window around the current word is drawn; earlier lines are scrolled away anyway.
  const from = Math.max(0, at - 40);
  return (
    <div className={`relative h-[128px] overflow-hidden rounded-sm border-2 bg-bg px-3 py-2 ${focused || !running ? "border-bevel-dark" : "border-control"}`}>
      <div
        ref={inner}
        lang={lang === "en" ? "en" : "pt-BR"}
        aria-label="Palavras do teste"
        className="text-xl leading-9 transition-transform duration-100 motion-reduce:transition-none"
        style={{ transform: `translateY(-${scroll}px)` }}
      >
        {words.slice(from, at + 60).map((w, i) => {
          const n = from + i;
          const state = n < at ? "done" : n === at ? "current" : "next";
          return <Word key={n} target={w} typed={n < at ? committed[n] : n === at ? current : ""} state={state} caret={n === at && running} />;
        })}
      </div>
      {running && !focused && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg/85 text-sm font-semibold">Toque no texto para continuar</p>
      )}
      {children}
    </div>
  );
}

const pct = (t: TypingText, words: number | undefined) => Math.round(((words ?? 0) / textWords(t).length) * 100);

/** The texts of one language, filtered by a category chip, each with how far the person got. */
function TextPicker({ lang, selected, progress, onPick }: { lang: TypingLang; selected: string; progress: Record<string, number>; onPick: (id: string) => void }) {
  const [cat, setCat] = useState<string | null>(null);
  const chosen = typingText(selected);
  const category = cat ?? chosen?.category ?? TYPING_CATEGORIES[0];
  const list = TYPING_TEXTS.filter((t) => t.lang === lang && t.category === category);
  const preview = chosen && chosen.lang === lang ? wordsFrom(chosen, progress[chosen.id] ?? 0, 9).words.join(" ") : null;

  return (
    <div className="space-y-2" data-testid="typing-texts">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Assuntos">
        {TYPING_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            onClick={() => setCat(c)}
            className={`min-h-11 shrink-0 rounded-sm border-2 px-3 text-sm font-semibold ${
              c === category ? "border-accent bg-raised text-accent" : "border-bevel-dark bg-bg text-muted hover:text-fg"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5" role="radiogroup" aria-label={`Textos de ${category}`}>
        {list.map((t) => {
          const p = pct(t, progress[t.id]);
          const on = t.id === selected;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(t.id)}
                data-testid={`typing-text-${t.id}`}
                lang={t.lang === "en" ? "en" : "pt-BR"}
                className={`flex min-h-14 w-full items-center gap-3 rounded-sm border-2 px-3 py-2 text-left ${on ? "border-accent bg-raised" : "border-bevel-dark bg-bg hover:bg-raised"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-5">{t.title}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-divider">
                      <span className="block h-full bg-accent" style={{ width: `${p}%` }} />
                    </span>
                    <span className="tabular w-11 shrink-0 text-right text-xs text-muted">{p ? `${p}%` : "Novo"}</span>
                  </span>
                </span>
                {on && <Check size={18} aria-hidden className="shrink-0 text-accent" />}
              </button>
            </li>
          );
        })}
      </ul>
      {preview && (
        <p className="rounded-sm border-l-[3px] border-accent bg-bg px-3 py-2 text-sm text-muted" data-testid="typing-preview">
          {progress[chosen!.id] ? "Continua em: " : "Começa com: "}
          <span className="text-fg" lang={lang === "en" ? "en" : "pt-BR"}>
            {preview}…
          </span>
        </p>
      )}
    </div>
  );
}

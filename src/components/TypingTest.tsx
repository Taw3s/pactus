"use client";

import { BookOpen, Keyboard, Loader, Shuffle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { countRun, DEVICE_LABEL, deviceKind, makeWords, typingLabel } from "@/lib/typing";
import { progressAfter, textWords, TYPING_CATEGORIES, TYPING_TEXTS, typingText, wordsFrom } from "@/lib/typing-texts";

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
 * text about programming, which continues where the person stopped last time.
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
  const [textId, setTextId] = useState(TYPING_TEXTS[0].id);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const test = useRef<{ id: string; seconds: number; started: number; device: "pc" | "mobile"; text: string | null; start: number } | null>(null);
  const run = useRef({ committed: [] as string[], current: "", words: [] as string[] });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  // The last choice (mode and text) is remembered on this device; the place in each text is on the server.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF) ?? "{}");
      if (saved.mode === "text" || saved.mode === "words") setMode(saved.mode);
      if (typingText(saved.text)) setTextId(saved.text);
    } catch {}
    loadProgress();
  }, []);

  function choose(next: { mode?: Mode; text?: string }) {
    const m = next.mode ?? mode;
    const t = next.text ?? textId;
    setMode(m);
    setTextId(t);
    try {
      localStorage.setItem(PREF, JSON.stringify({ mode: m, text: t }));
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
    const { data, error } = await createClient().rpc("start_typing_test", { p_device: device, p_mode: text ? "text" : "words", p_text: text?.id ?? null });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível começar. Tente de novo.");
      setPhase("idle");
      return;
    }
    const start = Number(row.start_word ?? 0);
    const list = text ? wordsFrom(text, start).words : makeWords();
    setTitle(text?.title ?? "");
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
  const shown = words.slice(Math.max(0, at - 3), at + 18);
  const offset = Math.max(0, at - 3);

  return (
    <div className="space-y-3" data-testid="typing-test" data-phase={phase}>
      {phase === "idle" || phase === "starting" ? (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="O que digitar">
            {(
              [
                ["words", "Palavras", Shuffle],
                ["text", "Texto", BookOpen],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={mode === m ? "btn-primary" : "btn-secondary"}
                onClick={() => choose({ mode: m })}
                data-testid={`typing-mode-${m}`}
              >
                <Icon size={18} aria-hidden /> {label}
              </button>
            ))}
          </div>
          {mode === "text" && (
            <label className="block text-sm">
              <span className="text-muted">Texto (continua de onde você parou)</span>
              <select className="input mt-1" value={textId} onChange={(e) => choose({ text: e.target.value })} data-testid="typing-text-select">
                {TYPING_CATEGORIES.map((c) => (
                  <optgroup key={c} label={c}>
                    {TYPING_TEXTS.filter((t) => t.category === c).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                        {progress[t.id] ? ` · ${Math.round((progress[t.id] / textWords(t).length) * 100)}%` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
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
          {title && <p className="text-sm text-muted">{title}</p>}
          <div className="flex items-center justify-between">
            <p className="pixel tabular text-3xl font-bold text-accent" aria-live="off">
              {phase === "sending" ? "…" : `${left}s`}
            </p>
            <p className="tabular text-sm text-muted">{committed.length} palavras</p>
          </div>
          <p className="min-h-24 rounded-sm border-2 border-bevel-dark bg-bg p-3 text-lg leading-8" aria-label="Palavras do teste" lang="pt-BR">
            {shown.map((w, i) => {
              const n = offset + i;
              const typedWord = committed[n];
              const cls = n < at ? (typedWord === w ? "text-done" : "text-fail line-through") : n === at ? "rounded-sm bg-raised px-1 text-accent" : "text-fg";
              return (
                <span key={n} className={`${cls} mr-2 inline-block`} data-testid={n === at ? "typing-word-current" : undefined}>
                  {w}
                </span>
              );
            })}
          </p>
          <input
            ref={input}
            // Red border as soon as the word in progress stops matching.
            className={`input ${current && !(words[at] ?? "").startsWith(current) ? "!border-fail" : ""}`}
            aria-invalid={!!current && !(words[at] ?? "").startsWith(current)}
            value={current}
            onChange={(e) => type(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            disabled={phase !== "running"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Digite aqui"
            data-testid="typing-input"
          />
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

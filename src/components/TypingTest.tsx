"use client";

import { Keyboard, Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { countRun, DEVICE_LABEL, deviceKind, makeWords, typingLabel } from "@/lib/typing";

export interface TypingResult {
  testId: string;
  wpm: number;
  accuracy: number;
  score: number;
  device: "pc" | "mobile";
}

const ERRORS: [string, string][] = [
  ["no attempts left", "Você já usou as 3 tentativas de hoje."],
  ["timing", "O tempo do teste não bateu (o app ficou em segundo plano?). Faça outro."],
  ["implausible", "Resultado impossível para 1 minuto. Faça outro."],
];

/**
 * One-minute typing test. The server starts and ends the clock (start/finish_typing_test) and
 * computes the result; this screen shows the words and counts what was typed.
 */
export function TypingTest({ attemptsLeft, onResult }: { attemptsLeft: number; onResult: (r: TypingResult) => void | Promise<void> }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "sending" | "done">("idle");
  const [words, setWords] = useState<string[]>([]);
  const [committed, setCommitted] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<TypingResult | null>(null);
  const [error, setError] = useState("");
  const test = useRef<{ id: string; seconds: number; started: number; device: "pc" | "mobile" } | null>(null);
  const run = useRef({ committed: [] as string[], current: "", words: [] as string[] });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function start() {
    setError("");
    setPhase("starting");
    const device = deviceKind();
    const { data, error } = await createClient().rpc("start_typing_test", { p_device: device });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível começar. Tente de novo.");
      setPhase("idle");
      return;
    }
    const list = makeWords();
    run.current = { committed: [], current: "", words: list };
    setWords(list);
    setCommitted([]);
    setCurrent("");
    test.current = { id: row.test_id, seconds: row.seconds, started: Date.now(), device };
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
    const { data, error } = await createClient().rpc("finish_typing_test", { p_test: t.id, p_correct: correct, p_typed: typed });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível salvar o resultado.");
      setPhase("idle");
      return;
    }
    const r: TypingResult = { testId: t.id, wpm: Number(row.wpm), accuracy: Number(row.accuracy), score: Number(row.score), device: t.device };
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
          <p className="text-sm text-muted">
            1 minuto digitando as palavras que aparecem. Vale a melhor de {attemptsLeft === 3 ? "3 tentativas" : `${attemptsLeft} ${attemptsLeft === 1 ? "tentativa restante" : "tentativas restantes"}`} hoje. Colar não funciona.
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
          <div className="flex items-center justify-between">
            <p className="pixel tabular text-3xl font-bold text-accent" aria-live="off">
              {phase === "sending" ? "…" : `${left}s`}
            </p>
            <p className="tabular text-sm text-muted">{committed.length} palavras</p>
          </div>
          <p className="min-h-24 rounded-sm border-2 border-bevel-dark bg-bg p-3 text-lg leading-8" aria-label="Palavras do teste">
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

"use client";

import { Check, Loader, Send } from "lucide-react";
import { useId, useState } from "react";

// Same keys and labels as src/lib/feedback.ts (server-only); the server validates again.
const CATEGORIES = [
  ["bug", "Algo não funcionou"],
  ["idea", "Ideia ou sugestão"],
  ["text", "Texto confuso ou errado"],
  ["privacy", "Privacidade e dados"],
  ["other", "Outro assunto"],
] as const;
const MIN = 10;
const MAX = 2000;

const ERRORS: Record<string, string> = {
  cooldown: "Espere 30 segundos antes de mandar outra mensagem.",
  "daily limit": "Você já mandou 3 mensagens nas últimas 24 horas. Tente de novo amanhã.",
  unavailable: "O envio de feedback ainda não está ligado. Tente de novo mais tarde.",
  delivery: "Não foi possível entregar a mensagem agora. Ela não foi guardada; tente de novo em alguns minutos.",
  invalid: `Escreva entre ${MIN} e ${MAX} caracteres e escolha um assunto.`,
  unauthorized: "Sua sessão terminou. Entre de novo para mandar a mensagem.",
};

/**
 * Beta feedback, sent by the server (POST /api/feedback). The page never shows or knows where it goes, never opens
 * the person's e-mail app, and attaches nothing about the person: only the subject and the text they write.
 */
export function BetaFeedback({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const id = useId();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const length = [...message.trim()].length;
  const Heading = headingLevel;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setSent(false);
    if (!category || length < MIN || length > MAX) return setError(ERRORS.invalid);
    setBusy(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
        setCategory("");
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(ERRORS[body?.error ?? ""] ?? "Não foi possível enviar. Tente de novo.");
      }
    } catch {
      setError("Sem resposta do servidor. Confira a conexão: se a mensagem não chegou, você pode mandar de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="card space-y-4" data-testid="beta-feedback">
      <div>
        <Heading id={`${id}-title`} className="pixel text-xl uppercase leading-6">
          Feedback do beta
        </Heading>
        <p className="mt-1 text-sm text-muted">
          Conte o que travou, confundiu ou pode melhorar. A mensagem vai para a equipe do Pacto sem o seu nome, e-mail ou perfil: se quiser
          resposta, escreva no texto como prefere ser contatado. Não guardamos o texto no app. Limite: uma mensagem a cada 30 segundos e 3 por dia.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor={`${id}-category`}>
            Assunto
          </label>
          <select id={`${id}-category`} className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Escolha um assunto</option>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${id}-message`}>
            Mensagem
          </label>
          <textarea
            id={`${id}-message`}
            className="input min-h-36"
            value={message}
            maxLength={MAX}
            onChange={(e) => setMessage(e.target.value)}
            aria-describedby={`${id}-count`}
            required
          />
          <p id={`${id}-count`} className="tabular mt-1 text-sm text-muted">
            {length}/{MAX} caracteres (mínimo {MIN})
          </p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-fail">
            {error}
          </p>
        )}
        {sent && (
          <p role="status" className="flex items-center gap-2 text-sm text-done">
            <Check size={18} aria-hidden /> Mensagem enviada. Obrigado!
          </p>
        )}
        <button type="submit" className="btn-primary w-full" disabled={busy} aria-busy={busy}>
          {busy ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" /> : <Send size={18} aria-hidden />}
          {busy ? "Enviando…" : "Enviar feedback"}
        </button>
      </form>
    </section>
  );
}

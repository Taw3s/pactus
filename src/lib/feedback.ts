// Beta feedback: what the form may send and how the server delivers it (Resend). The message is never stored by the
// app, and nothing about the sender is attached: no e-mail, profile or account id. The recipient lives only in a
// server variable (FEEDBACK_TO_EMAIL) and never reaches the browser, a response or a log.
import "server-only";

export const FEEDBACK_CATEGORIES = {
  bug: "Algo não funcionou",
  idea: "Ideia ou sugestão",
  text: "Texto confuso ou errado",
  privacy: "Privacidade e dados",
  other: "Outro assunto",
} as const;
export type FeedbackCategory = keyof typeof FEEDBACK_CATEGORIES;

export const FEEDBACK_MIN = 10;
export const FEEDBACK_MAX = 2000;
/** The JSON body can hardly be bigger than this with a 2000-character message. */
export const FEEDBACK_MAX_BYTES = 16 * 1024;

export type FeedbackInput = { category: FeedbackCategory; message: string };

/** Validates the request body. Control characters (other than line breaks and tabs) are dropped. */
export function parseFeedback(body: unknown): FeedbackInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { category, message } = body as Record<string, unknown>;
  if (typeof category !== "string" || !Object.hasOwn(FEEDBACK_CATEGORIES, category)) return null;
  if (typeof message !== "string") return null;
  const clean = message.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
  if ([...clean].length < FEEDBACK_MIN || [...clean].length > FEEDBACK_MAX) return null;
  return { category: category as FeedbackCategory, message: clean };
}

/** Server configuration, or null when feedback is off (any of the three variables missing). */
export function feedbackConfig(env: Record<string, string | undefined> = process.env) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.FEEDBACK_TO_EMAIL?.trim();
  const from = env.FEEDBACK_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) return null;
  return { apiKey, to, from };
}

/** The e-mail as Resend receives it. Plain text only; the sender is never named. */
export function feedbackEmail(input: FeedbackInput, cfg: { to: string; from: string }, now = new Date()) {
  const when = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  return {
    from: cfg.from,
    to: [cfg.to],
    subject: `[Pacto beta] ${FEEDBACK_CATEGORIES[input.category]}`,
    text: `Categoria: ${FEEDBACK_CATEGORIES[input.category]}\nEnviado em: ${when} (horário de São Paulo)\n\n${input.message}\n\n— Enviado pelo formulário de feedback do Pacto. Sem dados de quem enviou.`,
  };
}

/** Sends through the Resend API. Resolves true only on a 2xx answer; never throws. */
export async function sendFeedbackEmail(input: FeedbackInput, cfg: { apiKey: string; to: string; from: string }, fetcher: typeof fetch = fetch) {
  try {
    const res = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(feedbackEmail(input, cfg)),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

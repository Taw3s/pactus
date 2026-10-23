// Minimal Gemini REST client (server only). The key never reaches the browser.
import "server-only";
import { RESPONSE_SCHEMA } from "./ai-review";

const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_API = "https://generativelanguage.googleapis.com/v1beta";

export function geminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

export function geminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

/** Sends one image + prompt and returns the model's JSON text. */
export async function askGemini(prompt: string, jpeg: ArrayBuffer): Promise<string> {
  const base = process.env.GEMINI_API_URL || DEFAULT_API; // overridable for local tests
  const res = await fetch(`${base}/models/${encodeURIComponent(geminiModel())}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: Buffer.from(jpeg).toString("base64") } }],
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0 },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

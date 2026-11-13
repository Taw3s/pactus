import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { FEEDBACK_MAX, feedbackConfig, feedbackEmail, parseFeedback, sendFeedbackEmail } from "./feedback";

const cfg = { apiKey: "re_test", to: "destino@exemplo.invalid", from: "Pacto <feedback@exemplo.invalid>" };

describe("parseFeedback", () => {
  it("accepts a known category and 10 to 2000 characters, trimmed and without control characters", () => {
    expect(parseFeedback({ category: "bug", message: "  A tela travou ao enviar.\u0007  " })).toEqual({ category: "bug", message: "A tela travou ao enviar." });
    expect(parseFeedback({ category: "idea", message: "x".repeat(FEEDBACK_MAX) })?.message).toHaveLength(FEEDBACK_MAX);
  });
  it.each([
    null,
    [],
    "texto",
    { category: "bug" },
    { category: "spam", message: "Mensagem longa o bastante." },
    { category: "__proto__", message: "Mensagem longa o bastante." },
    { category: "bug", message: "curta" },
    { category: "bug", message: "x".repeat(FEEDBACK_MAX + 1) },
    { category: "bug", message: 12345678901 },
  ])("refuses %j", (body) => {
    expect(parseFeedback(body)).toBeNull();
  });
});

describe("feedbackConfig", () => {
  it("needs the three server variables", () => {
    expect(feedbackConfig({ RESEND_API_KEY: "k", FEEDBACK_TO_EMAIL: "t", FEEDBACK_FROM_EMAIL: "f" })).toEqual({ apiKey: "k", to: "t", from: "f" });
    expect(feedbackConfig({ RESEND_API_KEY: "k", FEEDBACK_TO_EMAIL: "t" })).toBeNull();
    // A public variable never configures it.
    expect(feedbackConfig({ RESEND_API_KEY: "k", NEXT_PUBLIC_FEEDBACK_TO_EMAIL: "t", FEEDBACK_FROM_EMAIL: "f" })).toBeNull();
  });
});

describe("feedbackEmail", () => {
  it("carries only the category, the time and the text: no sender, no reply-to", () => {
    const mail = feedbackEmail({ category: "privacy", message: "Quero saber quais dados ficam guardados." }, cfg, new Date("2026-11-11T15:00:00Z"));
    expect(Object.keys(mail).sort()).toEqual(["from", "subject", "text", "to"]);
    expect(mail.to).toEqual([cfg.to]);
    expect(mail.subject).toBe("[Pacto beta] Privacidade e dados");
    expect(mail.text).toContain("Quero saber quais dados ficam guardados.");
    expect(mail.text).toContain("12:00");
  });
});

describe("sendFeedbackEmail", () => {
  it("posts to Resend with the key and reports only success or failure", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendFeedbackEmail({ category: "bug", message: "Mensagem de teste." }, cfg, fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body).reply_to).toBeUndefined();
    expect(await sendFeedbackEmail({ category: "bug", message: "Mensagem de teste." }, cfg, vi.fn().mockResolvedValue(new Response("", { status: 422 })))).toBe(false);
    expect(await sendFeedbackEmail({ category: "bug", message: "Mensagem de teste." }, cfg, vi.fn().mockRejectedValue(new Error("offline")))).toBe(false);
  });
});

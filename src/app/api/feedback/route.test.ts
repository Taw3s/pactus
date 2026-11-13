import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), claims: vi.fn(), fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.session }));

import { POST } from "./route";

const TO = "destino-privado@exemplo.invalid";
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const valid = { category: "bug", message: "O botão de enviar não respondeu." };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("FEEDBACK_TO_EMAIL", TO);
  vi.stubEnv("FEEDBACK_FROM_EMAIL", "Pacto <feedback@exemplo.invalid>");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-1", email: "pessoa@exemplo.invalid" } } });
  mocks.session.mockResolvedValue({ auth: { getClaims: mocks.claims }, rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name: string) => (name === "claim_feedback_send" ? { data: "slot-1", error: null } : { data: true, error: null }));
  mocks.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function call(r: NextRequest) {
  const res = await POST(r);
  const text = await res.text();
  // No answer ever names the recipient.
  expect(text).not.toContain(TO);
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe("POST /api/feedback", () => {
  it("refuses another origin before reading the session", async () => {
    expect((await call(req(valid, { origin: "https://attacker.example" }))).status).toBe(403);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("needs JSON and a signed-in person", async () => {
    expect((await call(req(valid, { "content-type": "text/plain" }))).status).toBe(415);
    mocks.claims.mockResolvedValue({ data: null });
    expect((await call(req(valid))).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("validates the body and its size before spending a slot", async () => {
    expect((await call(req("{not json"))).status).toBe(400);
    expect((await call(req({ category: "bug", message: "curta" }))).status).toBe(400);
    expect((await call(req({ category: "bug", message: "x".repeat(20_000) }))).status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("is off without the server variables", async () => {
    vi.stubEnv("FEEDBACK_TO_EMAIL", "");
    expect(await call(req(valid))).toEqual({ status: 503, body: { error: "unavailable" } });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("sends the text and the category only: no e-mail, id or profile of the sender", async () => {
    expect(await call(req(valid))).toEqual({ status: 200, body: { ok: true } });
    const sent = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(sent.to).toEqual([TO]);
    const all = JSON.stringify(sent);
    expect(all).not.toContain("pessoa@exemplo.invalid");
    expect(all).not.toContain("user-1");
    expect(sent.reply_to).toBeUndefined();
  });
  it("answers the database limits with 429", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "cooldown" } });
    const cooldown = await POST(req(valid));
    expect(cooldown.status).toBe(429);
    expect(cooldown.headers.get("retry-after")).toBe("30");
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "daily limit" } });
    expect(await call(req(valid))).toEqual({ status: 429, body: { error: "daily limit" } });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("gives the slot back when Resend fails", async () => {
    mocks.fetch.mockResolvedValue(new Response("", { status: 500 }));
    expect(await call(req(valid))).toEqual({ status: 502, body: { error: "delivery" } });
    expect(mocks.rpc).toHaveBeenCalledWith("release_feedback_send", { p_id: "slot-1" });
  });
});

import { NextResponse } from "next/server";
import { FEEDBACK_MAX_BYTES, feedbackConfig, parseFeedback, sendFeedbackEmail } from "@/lib/feedback";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST { category, message } — a signed-in person sends beta feedback. The database only counts the sends (0032:
 * one every 30 s, 3 in 24 h); the text goes by e-mail and is not stored. No answer names the recipient.
 */
export async function POST(req: Request) {
  if (!trustedMutationOrigin(req)) return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "bad request" }, { status: 415 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.text().catch(() => "");
  if (new TextEncoder().encode(raw).length > FEEDBACK_MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* falls through to the validation error */
  }
  const input = parseFeedback(body);
  if (!input) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const cfg = feedbackConfig();
  if (!cfg) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const claim = await supabase.rpc("claim_feedback_send");
  if (claim.error) {
    const msg = claim.error.message;
    if (msg.includes("cooldown")) return NextResponse.json({ error: "cooldown" }, { status: 429, headers: { "Retry-After": "30" } });
    if (msg.includes("daily limit")) return NextResponse.json({ error: "daily limit" }, { status: 429 });
    // Before 0032 runs the function is missing: the form says it is unavailable.
    console.error("feedback claim failed");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  if (!(await sendFeedbackEmail(input, cfg))) {
    // Delivery failed: give the slot back, so an outage does not spend the day's sends.
    await supabase.rpc("release_feedback_send", { p_id: claim.data });
    console.error("feedback delivery failed");
    return NextResponse.json({ error: "delivery" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

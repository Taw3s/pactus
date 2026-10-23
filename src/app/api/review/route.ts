import { NextResponse, type NextRequest } from "next/server";
import { buildPrompt, decideVerdict, parseAnswer } from "@/lib/ai-review";
import { askGemini, geminiConfigured } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Checkin } from "@/lib/types";

export const maxDuration = 60;

// Reviews one check-in photo with Gemini. Any member of the group may trigger it
// (idempotent: an existing review is kept). Without the keys the feature is simply off.
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  if (!admin || !geminiConfigured()) return NextResponse.json({ status: "disabled" }, { status: 501 });

  const { checkinId } = (await request.json().catch(() => ({}))) as { checkinId?: string };
  if (!checkinId || !/^[0-9a-f-]{36}$/i.test(checkinId)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // Read through the caller's session: RLS guarantees the check-in belongs to their group.
  const supabase = await createClient();
  const { data: checkin } = await supabase.from("checkins").select("*").eq("id", checkinId).maybeSingle<Checkin>();
  if (!checkin) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: existing } = await admin.from("checkin_reviews").select("checkin_id").eq("checkin_id", checkinId).maybeSingle();
  if (existing) return NextResponse.json({ status: "exists" });

  const photo = await admin.storage.from("media").download(checkin.photo_path);
  if (photo.error || !photo.data) return NextResponse.json({ error: "photo unavailable" }, { status: 502 });

  try {
    const { text, model } = await askGemini(buildPrompt(checkin), await photo.data.arrayBuffer());
    const answer = parseAnswer(text);
    if (!answer) throw new Error("unparseable answer");
    const { error } = await admin.from("checkin_reviews").insert({
      checkin_id: checkin.id,
      group_id: checkin.group_id,
      verdict: decideVerdict(checkin, answer),
      seen: answer.seen,
      detected: answer.number,
      model,
    });
    if (error && error.code !== "23505") throw new Error(error.message);
    return NextResponse.json({ status: "reviewed" });
  } catch (e) {
    console.error("AI review failed", checkinId, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "review failed" }, { status: 502 });
  }
}

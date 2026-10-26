import { NextResponse, type NextRequest } from "next/server";
import { buildPrompt, decideVerdict, parseAnswer } from "@/lib/ai-review";
import { askGemini, geminiConfigured } from "@/lib/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Checkin } from "@/lib/types";

export const maxDuration = 60;

// Reviews the photos of one check-in with Gemini. Any member of the group may trigger it
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

  // The main photo is required; an extra one that fails to download is just left out.
  const files = await Promise.all([checkin.photo_path, ...(checkin.extra_photos ?? [])].map((p) => admin.storage.from("media").download(p)));
  if (files[0].error || !files[0].data) return NextResponse.json({ error: "photo unavailable" }, { status: 502 });
  const jpegs = await Promise.all(files.filter((f) => !f.error && f.data).map((f) => f.data!.arrayBuffer()));

  try {
    const { text, model } = await askGemini(buildPrompt(checkin, jpegs.length), jpegs);
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

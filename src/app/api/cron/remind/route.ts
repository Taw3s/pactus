import { NextResponse, type NextRequest } from "next/server";
import { spToday } from "@/lib/dates";
import { plural } from "@/lib/text";
import { groupToday, notifyOnce } from "@/lib/push";
import { trimOldPhotos } from "@/lib/media-retention";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder (Vercel cron, see vercel.json: 20:00 in São Paulo). Everyone with goals still
 * pending today gets one notice. Safe to call more than once: each person gets at most one a day.
 * The same daily run trims old proofs to their thumbnail (media-retention.ts): the free plan allows
 * two crons, both taken.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "disabled" }, { status: 501 });

  const today = spToday();
  const { data: groups } = await admin.from("groups").select("id");
  let reminded = 0;
  for (const g of groups ?? []) {
    const people = (await groupToday(admin, g.id)).filter((p) => !p.off && p.done < 3);
    reminded += await notifyOnce(admin, people.map((p) => p.userId), "reminder", today, (to) => {
      const left = 3 - (people.find((p) => p.userId === to)?.done ?? 0);
      return { title: "Pacto: ainda dá tempo", body: `Falta${left === 1 ? "" : "m"} ${plural(left, "meta", "metas")} hoje. O prazo é 23:59.`, url: "/hoje" };
    });
  }
  const trimmed = await trimOldPhotos(admin, today).catch((e) => {
    console.error("photo trim failed", e);
    return 0;
  });
  return NextResponse.json({ reminded, trimmed });
}

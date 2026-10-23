import { PageHeader } from "@/components/PageHeader";
import { Countdown } from "@/components/Countdown";
import { TodayChecklist } from "@/components/TodayChecklist";
import { formatDayPt, spToday, weekdayOf, WEEKDAYS_PT } from "@/lib/dates";
import { requireMember, signUrls } from "@/lib/data";
import { dayOffOn } from "@/lib/ledger";
import type { Checkin, DisputeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const [{ data: checkins }, { data: changes }] = await Promise.all([
    supabase.from("checkins").select("*").eq("user_id", me.user_id).eq("day", today),
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
  ]);
  const mine = (checkins ?? []) as Checkin[];
  const { data: results } = await supabase
    .from("dispute_results")
    .select("checkin_id, status")
    .in("checkin_id", mine.map((c) => c.id));
  const statusOf = new Map((results ?? []).map((r) => [r.checkin_id as string, r.status as DisputeStatus]));
  const urls = await signUrls(supabase, mine.map((c) => c.photo_path));
  const dayOff = dayOffOn(changes ?? [], today);
  const isOff = weekdayOf(today) === dayOff;

  return (
    <>
      <PageHeader title="Hoje" subtitle={`${formatDayPt(today)} · olá, ${me.display_name}`} right={!isOff && <Countdown />} />
      {isOff && (
        <div className="card mb-3 text-center">
          <p className="text-4xl">🏖️</p>
          <h2 className="mt-2 text-lg font-semibold">Dia de folga</h2>
          <p className="text-sm text-zinc-400">
            {WEEKDAYS_PT[dayOff]} é sua folga: nada é obrigatório e não há penalidade. Se quiser estudar mesmo assim, o que você
            enviar conta pontos no ranking.
          </p>
        </div>
      )}
      <TodayChecklist
        groupId={me.group_id}
        userId={me.user_id}
        isOff={isOff}
        done={mine.map((c) => ({
          id: c.id,
          goal: c.goal,
          summary: c.summary,
          minutes: c.minutes,
          pages: c.pages,
          title: c.title,
          photoUrl: urls.get(c.photo_path) ?? null,
          dispute: statusOf.get(c.id) ?? null,
        }))}
      />
    </>
  );
}

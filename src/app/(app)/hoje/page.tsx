import { PageHeader } from "@/components/PageHeader";
import { Scoreboard, type GoalState } from "@/components/Scoreboard";
import { TodayChecklist } from "@/components/TodayChecklist";
import type { Verdict } from "@/lib/ai-review";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { requireMember, signUrls } from "@/lib/data";
import { dayOffOn } from "@/lib/ledger";
import { GOALS, type Checkin, type DailyGoal, type DisputeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const [{ data: checkins }, { data: changes }] = await Promise.all([
    supabase.from("checkins").select("*").eq("user_id", me.user_id).eq("day", today),
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
  ]);
  const mine = (checkins ?? []) as Checkin[];
  const ids = mine.map((c) => c.id);
  const [{ data: results }, { data: reviews }, urls] = await Promise.all([
    supabase.from("dispute_results").select("checkin_id, status").in("checkin_id", ids),
    supabase.from("checkin_reviews").select("checkin_id, verdict").in("checkin_id", ids),
    signUrls(supabase, mine.map((c) => c.photo_path)),
  ]);
  const statusOf = new Map((results ?? []).map((r) => [r.checkin_id as string, r.status as DisputeStatus]));
  const reviewOf = new Map((reviews ?? []).map((r) => [r.checkin_id as string, r.verdict as Verdict]));
  const isOff = weekdayOf(today) === dayOffOn(changes ?? [], today);

  // Same rule as the ledger: a goal counts only with a check-in not annulled by the tribunal.
  const states = Object.fromEntries(
    GOALS.map((g) => {
      const c = mine.find((x) => x.goal === g.id);
      const state: GoalState = !c ? "pending" : statusOf.get(c.id) === "upheld" ? "annulled" : "done";
      return [g.id, state];
    }),
  ) as Record<DailyGoal, GoalState>;

  return (
    <>
      <PageHeader title="Hoje" subtitle={`${formatDayPt(today)} · Olá, ${me.display_name}`} />
      <Scoreboard isOff={isOff} states={states} />
      <TodayChecklist
        groupId={me.group_id}
        userId={me.user_id}
        done={mine.map((c) => ({
          id: c.id,
          goal: c.goal,
          summary: c.summary,
          minutes: c.minutes,
          pages: c.pages,
          title: c.title,
          photoUrl: urls.get(c.photo_path) ?? null,
          dispute: statusOf.get(c.id) ?? null,
          review: reviewOf.get(c.id) ?? null,
        }))}
      />
    </>
  );
}

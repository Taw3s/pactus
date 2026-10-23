import { PageHeader } from "@/components/PageHeader";
import { PendingReviews } from "@/components/PendingReviews";
import { Scoreboard, type GoalState } from "@/components/Scoreboard";
import { TodayChecklist } from "@/components/TodayChecklist";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { embeddedVerdict, requireMember, signThumbs } from "@/lib/data";
import { dayOffOn } from "@/lib/ledger";
import { GOALS, type Checkin, type DailyGoal, type DisputeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  // One round trip: the AI verdict comes embedded; the group's dispute results are few.
  const [{ data: checkins }, { data: changes }, { data: results }] = await Promise.all([
    supabase.from("checkins").select("*, checkin_reviews(verdict)").eq("user_id", me.user_id).eq("day", today),
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
    supabase.from("dispute_results").select("checkin_id, status"),
  ]);
  const mine = (checkins ?? []) as (Checkin & { checkin_reviews: unknown })[];
  const urls = await signThumbs(supabase, mine.map((c) => c.photo_path));
  const statusOf = new Map((results ?? []).map((r) => [r.checkin_id as string, r.status as DisputeStatus]));
  const reviewOf = new Map(mine.map((c) => [c.id, embeddedVerdict(c.checkin_reviews)]));
  const isOff = weekdayOf(today) === dayOffOn(changes ?? [], today);

  // Same rule as the ledger: a goal counts only with a check-in not annulled by the tribunal.
  const states = Object.fromEntries(
    GOALS.map((g) => {
      const c = mine.find((x) => x.goal === g.id);
      const state: GoalState = !c ? "pending" : statusOf.get(c.id) === "upheld" ? "annulled" : "done";
      return [g.id, state];
    }),
  ) as Record<DailyGoal, GoalState>;

  // The AI judge's seal: all 3 daily proofs reviewed as "match" and none annulled.
  const verified = GOALS.every((g) => {
    const c = mine.find((x) => x.goal === g.id);
    return c && states[g.id] === "done" && reviewOf.get(c.id) === "match";
  });
  const unreviewed = mine.filter((c) => !reviewOf.get(c.id)).map((c) => c.id);

  return (
    <>
      <PendingReviews ids={unreviewed} />
      <PageHeader title="Hoje" subtitle={`${formatDayPt(today)} · Olá, ${me.display_name}`} />
      <Scoreboard isOff={isOff} states={states} verified={verified ? { day: today, userId: me.user_id } : null} />
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

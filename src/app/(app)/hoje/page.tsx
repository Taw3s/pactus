import { ChestsPanel } from "@/components/ChestsPanel";
import { PageHeader } from "@/components/PageHeader";
import { GroupSidebar } from "@/components/GroupSidebar";
import { PendingReviews } from "@/components/PendingReviews";
import { Scoreboard, type GoalState } from "@/components/Scoreboard";
import { TodayChecklist } from "@/components/TodayChecklist";
import { collectible, weekStart } from "@/lib/collectibles";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { embeddedVerdict, getMembers, requireMember, signThumbs } from "@/lib/data";
import { currentStreak, dayOffOn, STREAK_MILESTONES } from "@/lib/ledger";
import { photoIsOlder } from "@/lib/photo-date";
import { typingLabel, DEVICE_LABEL } from "@/lib/typing";
import { GOALS, type Checkin, type DailyGoal, type DisputeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const monday = weekStart(today);
  // One round trip: the AI verdict comes embedded; the group's dispute results are few.
  const [{ data: checkins }, { data: changes }, { data: results }, members, { data: chests }, { data: weekRows }, { data: typingRows }, { data: doneRows }] = await Promise.all([
    supabase.from("checkins").select("*, checkin_reviews(verdict)").eq("user_id", me.user_id).eq("day", today).order("created_at"),
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
    supabase.from("dispute_results").select("checkin_id, status"),
    getMembers(supabase),
    supabase.from("chest_openings").select("kind, period, item_id").eq("user_id", me.user_id).in("period", [today, monday]),
    supabase.rpc("my_weekly_progress"),
    supabase.from("typing_tests").select("wpm, accuracy, score, device, minutes, finished_at").eq("user_id", me.user_id).eq("day", today),
    supabase.from("completed_days").select("day").eq("user_id", me.user_id),
  ]);
  const completedDays = new Set((doneRows ?? []).map((r) => r.day as string));
  const streakDays = currentStreak({ joinedOn: me.joined_on, dayOffChanges: changes ?? [], completedDays }, today);
  const streak = {
    days: streakDays,
    hasHistory: completedDays.size > 0,
    milestone: (STREAK_MILESTONES as readonly number[]).includes(streakDays) ? streakDays : null,
    userId: me.user_id,
  };
  const chestOf = (kind: "daily" | "weekly", period: string) => {
    const row = (chests ?? []).find((c) => c.kind === kind && c.period === period);
    const info = row ? collectible(row.item_id) : null;
    return info ? { itemId: info.id, rarity: info.rarity } : null;
  };
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));
  const week = ((weekRows ?? []) as { user_id: string; done_days: number }[])
    .map((r) => ({ userId: r.user_id, name: nameOf.get(r.user_id) ?? "?", done: Number(r.done_days), me: r.user_id === me.user_id }))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
  const mine = (checkins ?? []) as (Checkin & { checkin_reviews: unknown })[];
  const urls = await signThumbs(supabase, mine.map((c) => c.photo_path));
  const statusOf = new Map((results ?? []).map((r) => [r.checkin_id as string, r.status as DisputeStatus]));
  const reviewOf = new Map(mine.map((c) => [c.id, embeddedVerdict(c.checkin_reviews)]));
  const isOff = weekdayOf(today) === dayOffOn(changes ?? [], today);
  // A retake comes after the proof it retakes, so the latest proof of a goal is the one that counts.
  const latest = (goal: string) => mine.findLast((x) => x.goal === goal && !x.extra);

  // Same rule as the ledger: a goal counts only with a check-in not annulled by the tribunal.
  const states = Object.fromEntries(
    GOALS.map((g) => {
      const c = latest(g.id);
      const state: GoalState = !c ? "pending" : statusOf.get(c.id) === "upheld" ? "annulled" : "done";
      return [g.id, state];
    }),
  ) as Record<DailyGoal, GoalState>;

  // The AI judge's seal: all 3 daily proofs reviewed as "match" and none annulled.
  const verified = GOALS.every((g) => {
    const c = latest(g.id);
    return c && states[g.id] === "done" && reviewOf.get(c.id) === "match";
  });
  const toDone = (c: Checkin) => ({
    id: c.id,
    goal: c.goal,
    summary: c.summary,
    minutes: c.minutes,
    pages: c.pages,
    title: c.title,
    photoUrl: urls.get(c.photo_path) ?? null,
    dispute: statusOf.get(c.id) ?? null,
    review: reviewOf.get(c.id) ?? null,
    // Same short label as the feed; the proof page explains what the file reports.
    photoAge: photoIsOlder(c.photo_taken_at, c.day) ? "Data anterior" : null,
  });
  const dayComplete = GOALS.every((g) => states[g.id] === "done");
  const chestsPanel = (
    <ChestsPanel dayComplete={dayComplete} daily={chestOf("daily", today)} weekly={chestOf("weekly", monday)} week={week} eligible={me.joined_on <= monday} />
  );
  const unreviewed = mine.filter((c) => !reviewOf.get(c.id)).map((c) => c.id);

  return (
    <div data-wide className="desk:grid desk:grid-cols-[minmax(0,1fr)_380px] desk:items-start desk:gap-10">
      <div className="min-w-0">
        <PendingReviews ids={unreviewed} />
        <PageHeader title="Hoje" subtitle={`${formatDayPt(today)} · Olá, ${me.display_name}`} />
        <Scoreboard isOff={isOff} states={states} streak={streak} verified={verified ? { day: today, userId: me.user_id } : null} />
        {/* With goals pending, sending proofs comes first; once the day is closed, the chest comes up. */}
        {dayComplete && chestsPanel}
        <TodayChecklist
          groupId={me.group_id}
          userId={me.user_id}
          done={mine.filter((c) => !c.extra && latest(c.goal) === c).map(toDone)}
          extras={mine.filter((c) => c.extra).map(toDone)}
          typing={typingToday(typingRows ?? [])}
        />
        {!dayComplete && <div className="mt-8">{chestsPanel}</div>}
      </div>
      <GroupSidebar />
    </div>
  );
}

/** Attempts used today and the best finished one ("72 WPM · 96% · PC"). */
function typingToday(
  rows: { wpm: number | null; accuracy: number | null; score: number | null; device: "pc" | "mobile"; minutes: number; finished_at: string | null }[],
) {
  const best = rows.filter((r) => r.finished_at && r.score !== null).sort((a, b) => Number(b.score) - Number(a.score))[0];
  return {
    used: rows.length,
    best: best ? `${typingLabel({ wpm: best.wpm!, accuracy: best.accuracy!, minutes: best.minutes })} · ${DEVICE_LABEL[best.device]}` : null,
    // Drawn in place of the stored picture, which shows only the first test.
    bestScore: best ? { wpm: Number(best.wpm), accuracy: Number(best.accuracy), device: best.device, minutes: Number(best.minutes) } : null,
  };
}

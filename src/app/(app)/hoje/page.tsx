import { ChestsPanel } from "@/components/ChestsPanel";
import { FirstSteps } from "@/components/FirstSteps";
import { PageHeader } from "@/components/PageHeader";
import { GroupSidebar } from "@/components/GroupSidebar";
import { PendingReviews } from "@/components/PendingReviews";
import { Scoreboard, type GoalState } from "@/components/Scoreboard";
import { TodayChecklist } from "@/components/TodayChecklist";
import { collectible, weekStart, type Rarity } from "@/lib/collectibles";
import { addDays, formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { embeddedVerdict, getMembers, requireMember, signThumbs } from "@/lib/data";
import { isDebtItem } from "@/lib/debt-items";
import { currentStreak, dayOffOn, itemsOn, STREAK_MILESTONES } from "@/lib/ledger";
import { photoIsOlder } from "@/lib/photo-date";
import { typingLabel, unsentTypingTest, DEVICE_LABEL, type FinishedTyping } from "@/lib/typing";
import { scoringTypingTests } from "@/lib/ranking";
import { GOALS, type Checkin, type DailyGoal, type DisputeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// "Primeiros passos" shows up for someone new: no proof of the three goals yet, or joined in the last week.
const FIRST_STEPS_DAYS = 7;

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ primeiros?: string }> }) {
  const { supabase, me } = await requireMember();
  const reopenFirstSteps = (await searchParams).primeiros === "1";
  const today = spToday();

  const monday = weekStart(today);
  // One round trip: the AI verdict comes embedded; the group's dispute results are few.
  const [
    { data: checkins },
    { data: changes },
    { data: results },
    members,
    { data: chests },
    { data: weekRows },
    { data: typingRows },
    { data: doneRows },
    { count: proofCount },
    { data: group },
    // Before 0029 runs the table is missing: treat it as seen, so nobody gets a welcome by mistake.
    { data: welcomeRow, error: welcomeError },
    { data: menuRows },
    { data: attempts },
  ] = await Promise.all([
    supabase.from("checkins").select("*, checkin_reviews(verdict)").eq("user_id", me.user_id).eq("day", today).order("created_at"),
    supabase.from("day_off_changes").select("weekday, effective_from").eq("user_id", me.user_id),
    supabase.from("dispute_results").select("checkin_id, status, decided_at"),
    getMembers(supabase),
    supabase.from("chest_openings").select("kind, period, item_id, collectibles(rarity)").eq("user_id", me.user_id).in("period", [today, monday]),
    supabase.rpc("my_weekly_progress"),
    supabase.from("typing_tests").select("id, wpm, accuracy, score, device, minutes, started_at, finished_at").eq("user_id", me.user_id).eq("day", today),
    supabase.from("completed_days").select("day").eq("user_id", me.user_id),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", me.user_id).in("goal", GOALS.map((g) => g.id)),
    supabase.from("groups").select("invite_code, name").maybeSingle<{ invite_code: string; name: string }>(),
    supabase.from("welcome_seen").select("user_id").maybeSingle(),
    supabase.from("debt_menus").select("effective_from, items").order("effective_from"),
    // The server decides the attempts, including the single "Nova tentativa" after an annulment (0031).
    supabase.rpc("my_typing_attempts").maybeSingle<{ used: number; special_available: boolean; special_used: boolean }>(),
  ]);
  const firstProof = (proofCount ?? 0) > 0;
  const menus = ((menuRows ?? []) as { effective_from: string; items: string[] }[]).map((m) => ({ effective_from: m.effective_from, items: m.items.filter(isDebtItem) }));
  const menuNext = menus.filter((m) => m.effective_from > today).at(-1);
  const showFirstSteps = !!group && (reopenFirstSteps || !firstProof || me.joined_on >= addDays(today, -FIRST_STEPS_DAYS));
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
    if (!row) return null;
    // Rarity comes from the database, so an id this version does not know still shows as opened.
    const embedded = row.collectibles as { rarity: Rarity } | { rarity: Rarity }[] | null;
    const rarity = (Array.isArray(embedded) ? embedded[0]?.rarity : embedded?.rarity) ?? collectible(row.item_id)?.rarity ?? "comum";
    return { itemId: row.item_id as string, rarity };
  };
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));
  const week = ((weekRows ?? []) as { user_id: string; done_days: number }[])
    .map((r) => ({ userId: r.user_id, name: nameOf.get(r.user_id) ?? "?", done: Number(r.done_days), me: r.user_id === me.user_id }))
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
  const mine = (checkins ?? []) as (Checkin & { checkin_reviews: unknown })[];
  const urls = await signThumbs(supabase, mine.map((c) => c.photo_path));
  const statusOf = new Map((results ?? []).map((r) => [r.checkin_id as string, r.status as DisputeStatus]));
  const decidedOf = new Map((results ?? []).map((r) => [r.checkin_id as string, (r.decided_at as string | null) ?? null]));
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
    <div data-wide className="desk:grid desk:grid-cols-[minmax(0,1fr)_380px] desk:items-start desk:gap-6">
      <div className="min-w-0">
        <PendingReviews ids={unreviewed} />
        <PageHeader title="Hoje" subtitle={`${formatDayPt(today)} · Olá, ${me.display_name}`} />
        {showFirstSteps && (
          <FirstSteps
            userId={me.user_id}
            groupId={me.group_id}
            inviteCode={group.invite_code}
            menuToday={itemsOn(menus, today)}
            menuNext={menuNext ? { from: menuNext.effective_from, items: menuNext.items } : null}
            firstProof={firstProof}
            alone={members.length <= 1}
            reopen={reopenFirstSteps}
            welcome={!welcomeError && !welcomeRow}
            groupName={group.name}
          />
        )}
        <Scoreboard isOff={isOff} states={states} streak={streak} verified={verified ? { day: today, userId: me.user_id } : null} />
        {/* With goals pending, sending proofs comes first; once the day is closed, the chest comes up. */}
        {dayComplete && chestsPanel}
        <TodayChecklist
          groupId={me.group_id}
          userId={me.user_id}
          done={mine.filter((c) => !c.extra && latest(c.goal) === c).map(toDone)}
          extras={mine.filter((c) => c.extra).map(toDone)}
          typing={typingToday(typingRows ?? [], mine, latest("typing"), statusOf, decidedOf, attempts, today)}
        />
        {!dayComplete && <div className="mt-8">{chestsPanel}</div>}
      </div>
      <GroupSidebar />
    </div>
  );
}

/**
 * Attempts used today, the best finished one ("72 WPM · 96% · PC", what scores), the test the proof was sent with
 * (frozen: what the proof page and the tribunal show) and a test the server confirmed but no proof uses yet (the
 * proof failed or its answer was lost): it sends the goal without another test.
 */
function typingToday(
  rows: (FinishedTyping & { started_at: string })[],
  mine: Checkin[],
  proof: Checkin | undefined,
  statusOf: Map<string, DisputeStatus>,
  decidedOf: Map<string, string | null>,
  attempts: { used: number; special_available: boolean; special_used: boolean } | null,
  today: string,
) {
  // Same cut as the ranking: after an annulment, only tests started after the verdict count.
  const judged = mine.filter((c) => c.goal === "typing" && !c.extra && statusOf.get(c.id) === "upheld");
  const finished = rows.filter((r) => r.finished_at && r.score !== null).map((r) => ({ ...r, user_id: "me", day: today }));
  const best = scoringTypingTests(finished, judged.map((c) => ({ user_id: "me", day: today, decided_at: decidedOf.get(c.id) ?? null })))
    .sort((a, b) => Number(b.score) - Number(a.score))[0];
  const verdictAt = proof && statusOf.get(proof.id) === "upheld" ? (decidedOf.get(proof.id) ?? null) : null;
  const unsent = !proof || verdictAt ? unsentTypingTest(rows, mine.map((c) => c.typing_test_id), verdictAt) : null;
  const sent = proof?.typing_test_id ? rows.find((r) => r.id === proof.typing_test_id) : undefined;
  const score = (t: FinishedTyping) => ({ wpm: Number(t.wpm), accuracy: Number(t.accuracy), device: t.device, minutes: Number(t.minutes) });
  const label = (t: FinishedTyping) => `${typingLabel({ wpm: t.wpm!, accuracy: t.accuracy!, minutes: t.minutes })} · ${DEVICE_LABEL[t.device]}`;
  return {
    // Before 0031 runs the RPC is missing: fall back to counting the rows, as before.
    used: attempts?.used ?? rows.length,
    special: !!attempts?.special_available,
    best: best ? label(best) : null,
    // The proof's own test, drawn in place of the stored picture.
    sent: sent && sent.score !== null ? { label: label(sent), score: score(sent) } : null,
    unsent: unsent
      ? { testId: unsent.id, wpm: Number(unsent.wpm), accuracy: Number(unsent.accuracy), score: Number(unsent.score), device: unsent.device, minutes: (Number(unsent.minutes) === 5 ? 5 : 1) as 1 | 5 }
      : null,
    day: today,
  };
}

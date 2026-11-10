// The TypeScript side of the differential test. A probe (harness.sql) carries the raw rows the app
// reads plus the database's own answers; here the app's functions answer the same questions and
// every disagreement becomes a Mismatch. Where a rule lives inline in a page (the Hoje goal states,
// the chests panel, getMonthScores), the lines are transcribed and say where they come from.
import { WEEKLY_GOAL_DAYS, weekStart } from "@/lib/collectibles";
import { addDays, monthKey, nextMonday, spToday, weekdayOf } from "@/lib/dates";
import { isDebtItem } from "@/lib/debt-items";
import { currentStreak, dayOffOn, debtLines, itemsOn, type DayOffChange, type DebtMenu, type MemberLedgerInput, type Payment } from "@/lib/ledger";
import { scoreMonth, scoringTypingTests, typingBestByDay } from "@/lib/ranking";
import { MAX_EXTRA_SESSIONS } from "@/lib/types";
import { unsentTypingTest } from "@/lib/typing";

export interface Probe {
  closed?: boolean;
  now: string;
  today: string;
  week: string;
  next_monday: string;
  group_id: string;
  owner_id: string | null;
  members: { user_id: string; joined_on: string; created_at: string }[];
  day_off_changes: (DayOffChange & { user_id: string })[];
  debt_menus: { effective_from: string; items: string[] }[];
  checkins: { id: string; user_id: string; day: string; goal: "study" | "typing" | "reading" | "project"; minutes: number | null; pages: number | null; extra: boolean; retake_of: string | null; created_at: string; typing_test_id: string | null }[];
  results: { checkin_id: string; status: "open" | "upheld" | "rejected"; yes: number; no: number; eligible: number }[];
  payments: { debtor_id: string; day: string; item: string; received_by: string | null; received_name: string | null; paid_at: string }[];
  typing: { id: string; user_id: string; day: string; score: number | null; wpm: number | null; accuracy: number | null; device: "pc" | "mobile"; minutes: number; finished_at: string | null }[];
  chests: { user_id: string; kind: "daily" | "weekly"; period: string }[];
  completed: { user_id: string; day: string }[];
  weekly: { user_id: string; done_days: number }[];
  days: { day: string; dow: number; items: string[] }[];
  off: { user_id: string; day: string; weekday: number }[];
  disputes: { id: string; checkin_id: string; created_at: string; by_ai: boolean }[];
  votes: { dispute_id: string; voter_id: string | null }[];
  dispute_try: { user_id: string; checkin_id: string; out: string }[];
  vote_try: { user_id: string; dispute_id: string; out: string }[];
  pay: { debtor: string; day: string; item: string; out: string }[];
  chest_try: { user_id: string; kind: "daily" | "weekly"; out: string }[];
  proof_try: { user_id: string; goal: "study" | "reading" | "project" | "extra" | "typing"; test_id?: string; out: string }[];
  ranking: { month: string; user_id: string; points: number }[];
}

export interface Mismatch {
  /** Stable name of the rule that disagrees (the keys of KNOWN in expected.ts). */
  rule: string;
  /** Who and what, without ids that change between runs. */
  where: string;
  db: string;
  ts: string;
}

const DAILY = ["study", "typing", "reading"] as const;

/** What the app derives for one person from the rows of a probe. */
export function tsView(p: Probe, userId: string) {
  const me = p.members.find((m) => m.user_id === userId)!;
  const today = spToday(new Date(p.now));
  const annulled = new Set(p.results.filter((r) => r.status === "upheld").map((r) => r.checkin_id));
  const menus: DebtMenu[] = p.debt_menus.map((m) => ({ effective_from: m.effective_from, items: m.items.filter(isDebtItem) }));
  // getLedgerInputs (src/lib/data.ts): completed days come from the completed_days view.
  const input: MemberLedgerInput = {
    joinedOn: me.joined_on,
    dayOffChanges: p.day_off_changes.filter((c) => c.user_id === userId),
    completedDays: new Set(p.completed.filter((c) => c.user_id === userId).map((c) => c.day)),
  };
  const payments = p.payments.filter((x) => x.debtor_id === userId && isDebtItem(x.item)) as unknown as Payment[];
  const lines = debtLines(input, payments, today, menus);

  // Hoje (src/app/(app)/hoje/page.tsx): the latest proof of each goal decides its state.
  const mine = p.checkins.filter((c) => c.user_id === userId && c.day === today);
  const latest = (goal: string) => mine.findLast((x) => x.goal === goal && !x.extra);
  const state = (goal: string) => {
    const c = latest(goal);
    return !c ? "pending" : annulled.has(c.id) ? "annulled" : "done";
  };
  const dayComplete = DAILY.every((g) => state(g) === "done");
  // push.ts groupToday and /api/group-summary: any proof the tribunal did not annul.
  const goalsDone = new Set(mine.filter((c) => c.goal !== "project" && !c.extra && !annulled.has(c.id)).map((c) => c.goal)).size;

  // Hoje + ChestsPanel: the weekly chest shows for whoever was in the group on Monday, once everyone has 5 days.
  const monday = weekStart(today);
  const weeklyOpen = p.weekly.length > 0 && p.weekly.every((r) => Number(r.done_days) >= WEEKLY_GOAL_DAYS) && me.joined_on <= monday;

  // Hoje typingToday: the tests that still score, and the one "Enviar resultado" would send.
  const tests = p.typing.filter((t) => t.user_id === userId && t.day === today && t.finished_at && t.score !== null).map((t) => ({ ...t, finished_at: t.finished_at! }));
  const judged = mine.filter((c) => c.goal === "typing" && !c.extra && annulled.has(c.id));
  const scoring = new Set(scoringTypingTests(tests, judged).map((t) => t.id));
  const typingProof = latest("typing");
  const condemned = typingProof && annulled.has(typingProof.id) ? typingProof.created_at : null;
  const unsent = !typingProof || condemned ? unsentTypingTest(tests, mine.map((c) => c.typing_test_id), condemned) : null;

  const extras = mine.filter((c) => c.extra);
  const mainStudyValid = mine.some((c) => c.goal === "study" && !c.extra && !annulled.has(c.id));

  return { me, today, input, menus, lines, state, dayComplete, goalsDone, monday, weeklyOpen, scoring, unsent, typingProof, extras, mainStudyValid, annulled };
}

/** getMonthScores (src/lib/data.ts) over the rows of a probe: points per person and month. */
export function tsRanking(p: Probe): Map<string, number> {
  const annulled = new Set(p.results.filter((r) => r.status === "upheld").map((r) => r.checkin_id));
  const months = new Set([...p.checkins.map((c) => monthKey(c.day)), ...p.completed.map((c) => monthKey(c.day)), ...p.ranking.map((r) => r.month)]);
  const out = new Map<string, number>();
  for (const month of months) {
    const checkins = p.checkins.filter((c) => monthKey(c.day) === month);
    const typing = p.typing.filter((t) => monthKey(t.day) === month && t.score !== null).map((t) => ({ ...t, score: Number(t.score), finished_at: t.finished_at! }));
    const typingBest = typingBestByDay(typing, checkins.filter((c) => c.goal === "typing" && annulled.has(c.id)));
    const scores = scoreMonth(
      p.members.map((m) => m.user_id),
      checkins.map((c) => ({ ...c, annulled: annulled.has(c.id) })),
      p.completed.filter((c) => monthKey(c.day) === month),
      typingBest,
    );
    for (const s of scores) out.set(`${month}|${s.userId}`, s.points);
  }
  return out;
}

export function compareProbe(p: Probe, name: (userId: string) => string): Mismatch[] {
  const out: Mismatch[] = [];
  if (p.closed) return out;
  const bad = (rule: string, where: string, db: unknown, ts: unknown) => out.push({ rule, where, db: String(db), ts: String(ts) });

  // The clock and the calendar helpers.
  const today = spToday(new Date(p.now));
  if (today !== p.today) bad("today", p.now, p.today, today);
  if (weekStart(today) !== p.week) bad("week-start", today, p.week, weekStart(today));
  if (nextMonday(today) !== p.next_monday) bad("next-monday", today, p.next_monday, nextMonday(today));
  for (const d of p.days) if (weekdayOf(d.day) !== d.dow) bad("weekday", d.day, d.dow, weekdayOf(d.day));

  const menus: DebtMenu[] = p.debt_menus.map((m) => ({ effective_from: m.effective_from, items: m.items.filter(isDebtItem) }));
  for (const d of p.days) {
    const ts = itemsOn(menus, d.day).join("+");
    if (ts !== d.items.join("+")) bad("menu-of-day", d.day, d.items.join("+"), ts);
  }
  for (const o of p.off) {
    const ts = dayOffOn(p.day_off_changes.filter((c) => c.user_id === o.user_id), o.day);
    if (ts !== o.weekday) bad("day-off", `${name(o.user_id)} ${o.day}`, o.weekday, ts);
  }

  const completed = new Set(p.completed.map((c) => `${c.user_id}|${c.day}`));
  const offOn = new Map(p.off.map((o) => [`${o.user_id}|${o.day}`, o.weekday]));
  const dowOf = new Map(p.days.map((d) => [d.day, d.dow]));
  const solo = p.members.length < 2; // nobody to receive: the payment probe cannot run

  for (const m of p.members) {
    const who = name(m.user_id);
    const v = tsView(p, m.user_id);

    // Debt: the days and items the app lists against what the payments trigger accepts.
    if (!solo) {
      const db = new Map(p.pay.filter((x) => x.debtor === m.user_id).map((x) => [`${x.day}|${x.item}`, x.out === "ok" ? "open" : x.out === "paid" ? "paid" : `refused (${x.out})`]));
      const ts = new Map(v.lines.map((l) => [`${l.day}|${l.item}`, l.payment ? "paid" : "open"]));
      for (const k of new Set([...db.keys(), ...ts.keys()])) {
        if ((db.get(k) ?? "not owed") !== (ts.get(k) ?? "not owed")) bad("debt", `${who} ${k}`, db.get(k) ?? "not owed", ts.get(k) ?? "not owed");
      }
      // A payment on file the app no longer lists (its day stopped being a debt).
      for (const x of p.payments.filter((x) => x.debtor_id === m.user_id)) {
        if (!ts.has(`${x.day}|${x.item}`)) bad("payment-without-debt", `${who} ${x.day}|${x.item}`, "payment on file", "no debt line");
      }

      // Streak, rebuilt from the database's own answers: a payable day breaks it, a completed working day adds one.
      let streak = 0;
      for (let d = today; d >= m.joined_on; d = addDays(d, -1)) {
        if ([...db.keys()].some((k) => k.startsWith(`${d}|`))) break;
        if (completed.has(`${m.user_id}|${d}`) && offOn.get(`${m.user_id}|${d}`) !== dowOf.get(d)) streak++;
      }
      const ts2 = currentStreak(v.input, today);
      if (ts2 !== streak) bad("streak", who, streak, ts2);
    }

    // The day is complete: the view, the Hoje screen, the group panel and the daily chest.
    const dbDone = completed.has(`${m.user_id}|${today}`);
    if (v.dayComplete !== dbDone) bad("day-complete-hoje", `${who} ${today}`, dbDone, v.dayComplete);
    if ((v.goalsDone === 3) !== dbDone) bad("day-complete-group", `${who} ${today}`, dbDone, v.goalsDone === 3);
    const daily = p.chest_try.find((c) => c.user_id === m.user_id && c.kind === "daily")!;
    if ((daily.out === "ok") !== v.dayComplete) bad("daily-chest", `${who} ${today}`, daily.out, v.dayComplete ? "chest offered" : "no chest");
    const weekly = p.chest_try.find((c) => c.user_id === m.user_id && c.kind === "weekly")!;
    if ((weekly.out === "ok") !== v.weeklyOpen) bad("weekly-chest", `${who} week ${v.monday}`, weekly.out, v.weeklyOpen ? "chest offered" : "no chest");

    // Tribunal (src/app/(app)/checkin/[id]/page.tsx): who may accuse a proof and who may vote.
    for (const t of p.dispute_try.filter((x) => x.user_id === m.user_id)) {
      const c = p.checkins.find((x) => x.id === t.checkin_id)!;
      const canDispute = !p.disputes.some((d) => d.checkin_id === c.id) && c.user_id !== m.user_id && c.day >= addDays(today, -1);
      if ((t.out === "ok") !== canDispute) bad("tribunal-accuse", `${who} on ${name(c.user_id)} ${c.day} ${c.goal}`, t.out, canDispute ? "button shown" : "no button");
    }
    for (const t of p.vote_try.filter((x) => x.user_id === m.user_id)) {
      const d = p.disputes.find((x) => x.id === t.dispute_id)!;
      const c = p.checkins.find((x) => x.id === d.checkin_id)!;
      const open = p.results.find((r) => r.checkin_id === c.id)?.status === "open";
      const joinedLate = m.created_at > d.created_at;
      const voted = p.votes.some((x) => x.dispute_id === d.id && x.voter_id === m.user_id);
      const canVote = open && c.user_id !== m.user_id && !joinedLate && !voted;
      if ((t.out === "ok") !== canVote) bad("tribunal-vote", `${who} on ${name(c.user_id)} ${c.day} ${c.goal}`, t.out, canVote ? "form shown" : "no form");
    }

    // A new proof: the form the Hoje screen shows against what the check-in trigger takes.
    for (const t of p.proof_try.filter((x) => x.user_id === m.user_id)) {
      const ok = t.out === "ok";
      if (t.goal === "extra") {
        const ts = v.mainStudyValid && v.extras.length < MAX_EXTRA_SESSIONS;
        if (ok !== ts) bad("extra-session", `${who} ${today}`, t.out, ts ? "form offered" : "no form");
      } else if (t.goal === "typing") {
        const test = p.typing.find((x) => x.id === t.test_id)!;
        const used = p.checkins.some((c) => c.typing_test_id === test.id);
        // "Enviar resultado" sends the best unsent test; any test that still scores could be that one.
        const ts = test.day === today && v.state("typing") !== "done" && !used && v.scoring.has(test.id);
        const label = `${who} ${today} test of ${test.day} score ${test.score}`;
        if (ok && !ts) bad(v.scoring.has(test.id) || test.day !== today ? "typing-proof" : "typing-retake-judged-test", label, "accepted", "not offered");
        if (!ok && ts) bad("typing-proof", label, t.out, "offered");
      } else {
        const ts = v.state(t.goal) !== "done";
        if (ok !== ts) bad("new-proof", `${who} ${today} ${t.goal}`, t.out, ts ? "form offered" : "already sent");
      }
    }
    // Condemned typing proof: the guide promises a new proof until 23:59. With the 3 attempts spent and no
    // result the screen can send, there is no way left (start_typing_test refuses a 4th test).
    if (v.state("typing") === "annulled" && !v.unsent && p.typing.filter((t) => t.user_id === m.user_id && t.day === today).length >= 3) {
      const taken = p.proof_try.some((x) => x.user_id === m.user_id && x.goal === "typing" && x.out === "ok");
      bad("typing-retake-no-way", `${who} ${today}`, taken ? "would take an older test of today" : "takes no test", "no attempt left, nothing to send");
    }
    // The result the screen offers to send must be one the database takes.
    if (v.unsent && p.proof_try.find((x) => x.test_id === v.unsent!.id)?.out !== "ok") bad("typing-unsent", `${who} ${today}`, "refused", "offered");
  }

  // Ranking: scoreMonth against the written rule (diff.ranking in harness.sql).
  const ts = tsRanking(p);
  for (const r of p.ranking) {
    const mine = ts.get(`${r.month}|${r.user_id}`);
    if (mine !== Number(r.points)) bad("ranking-points", `${name(r.user_id)} ${r.month}`, r.points, mine);
  }
  // A typing proof that stands and scores nothing (every test of the day was judged with an annulled proof).
  for (const c of p.checkins.filter((c) => c.goal === "typing" && c.typing_test_id)) {
    const annulled = p.results.some((r) => r.checkin_id === c.id && r.status === "upheld");
    if (annulled) continue;
    const tests = p.typing.filter((t) => t.user_id === c.user_id && t.day === c.day && t.score !== null).map((t) => ({ ...t, score: Number(t.score), finished_at: t.finished_at! }));
    const judged = p.checkins.filter((x) => x.user_id === c.user_id && x.day === c.day && x.goal === "typing" && p.results.some((r) => r.checkin_id === x.id && r.status === "upheld"));
    if (!typingBestByDay(tests, judged).has(`${c.user_id}|${c.day}`)) bad("typing-proof-scores-zero", `${name(c.user_id)} ${c.day}`, "proof stands (day complete)", "0 typing points");
  }
  return out;
}

/**
 * Someone left, was removed or deleted the account between two probes taken a second apart:
 * they take their own rows, the group's history stays, and nothing changes for who remains.
 */
export function compareLeave(before: Probe, after: Probe, leaver: string, how: "leave" | "remove" | "delete", name: (userId: string) => string): Mismatch[] {
  const out: Mismatch[] = [];
  const bad = (rule: string, where: string, db: unknown, ts: unknown) => out.push({ rule, where, db: String(db), ts: String(ts) });
  if (!before.members.some((m) => m.user_id === leaver)) return out; // the event was refused: nobody left
  if (after.closed) {
    if (before.members.length !== 1) bad("leave-closed-group", name(leaver), "group closed", `${before.members.length} members before`);
    return out;
  }
  const who = name(leaver);
  if (after.members.some((m) => m.user_id === leaver)) bad("leave-still-member", who, "still a member", "gone");
  const own = [
    ["checkins", after.checkins.filter((c) => c.user_id === leaver).length],
    ["typing tests", after.typing.filter((c) => c.user_id === leaver).length],
    ["chests", after.chests.filter((c) => c.user_id === leaver).length],
    ["day-off choices", after.day_off_changes.filter((c) => c.user_id === leaver).length],
    ["debts paid", after.payments.filter((c) => c.debtor_id === leaver).length],
  ] as const;
  for (const [what, n] of own) if (n) bad("leave-own-rows", `${who} ${what}`, n, 0);

  // Receipts: what the leaver received stays paid, with the name (or without it after an account deletion).
  for (const pay of before.payments.filter((x) => x.received_by === leaver && x.debtor_id !== leaver)) {
    const kept = after.payments.find((x) => x.debtor_id === pay.debtor_id && x.day === pay.day && x.item === pay.item);
    const expected = how === "delete" ? null : pay.received_name;
    if (!kept) bad("leave-receipt", `${name(pay.debtor_id)} ${pay.day}|${pay.item}`, "payment gone", "stays paid");
    else if (kept.received_by !== null || kept.received_name !== expected) bad("leave-receipt-name", `${name(pay.debtor_id)} ${pay.day}|${pay.item}`, `${kept.received_by ? "linked" : "unlinked"}, name ${kept.received_name}`, `unlinked, name ${expected}`);
  }
  // Verdicts on the proofs of who remains do not move.
  for (const r of before.results) {
    const c = before.checkins.find((x) => x.id === r.checkin_id);
    if (!c || c.user_id === leaver) continue;
    const now = after.results.find((x) => x.checkin_id === r.checkin_id);
    if (!now || now.status !== r.status || now.yes !== r.yes || now.no !== r.no || now.eligible !== r.eligible) {
      bad("leave-verdict", `${name(c.user_id)} ${c.day} ${c.goal}`, now ? `${now.status} ${now.yes}/${now.no}/${now.eligible}` : "gone", `${r.status} ${r.yes}/${r.no}/${r.eligible}`);
    }
  }
  // Debts, streak and points of who remains, as the app shows them.
  const pointsBefore = tsRanking(before);
  const pointsAfter = tsRanking(after);
  for (const m of after.members) {
    const a = tsView(before, m.user_id);
    const b = tsView(after, m.user_id);
    const key = (v: typeof a) => v.lines.map((l) => `${l.day}|${l.item}|${l.payment ? "paid" : "open"}`).join(",");
    if (key(a) !== key(b)) bad("leave-others-debt", name(m.user_id), key(b), key(a));
    if (currentStreak(a.input, a.today) !== currentStreak(b.input, b.today)) bad("leave-others-streak", name(m.user_id), currentStreak(b.input, b.today), currentStreak(a.input, a.today));
    for (const [k, pts] of pointsBefore) if (k.endsWith(`|${m.user_id}`) && (pointsAfter.get(k) ?? 0) !== pts) bad("leave-others-points", `${name(m.user_id)} ${k.slice(0, 7)}`, pointsAfter.get(k), pts);
  }
  // The owner's group goes to someone who is still there.
  if (!after.members.some((m) => m.user_id === after.owner_id)) bad("leave-owner", who, after.owner_id, "a current member");
  return out;
}

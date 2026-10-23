// Derives day status, streaks and debts from raw data. No cron: everything is
// computed on request, comparing São Paulo dates. The payments trigger in
// supabase/migrations/0001_init.sql mirrors the "missed day" rule — keep both in sync.
import { addDays, eachDay, monthKey, weekdayOf, type ISODate } from "./dates";

export type DayStatus = "done" | "missed" | "off" | "pending" | "before";
export type DebtItem = "coke" | "snack";

export interface DayOffChange {
  weekday: number;
  effective_from: ISODate;
}

export interface MemberLedgerInput {
  joinedOn: ISODate;
  dayOffChanges: DayOffChange[];
  completedDays: Set<ISODate>;
}

export interface Payment {
  day: ISODate;
  item: DebtItem;
  received_by: string;
  paid_at: string;
}

export const DEFAULT_DAY_OFF = 0; // Sunday

export function dayOffOn(changes: DayOffChange[], day: ISODate): number {
  let current: DayOffChange | undefined;
  for (const c of changes) {
    if (c.effective_from <= day && (!current || c.effective_from > current.effective_from)) current = c;
  }
  return current?.weekday ?? DEFAULT_DAY_OFF;
}

export function dayStatus(input: MemberLedgerInput, day: ISODate, today: ISODate): DayStatus {
  if (day < input.joinedOn || day > today) return "before";
  if (weekdayOf(day) === dayOffOn(input.dayOffChanges, day)) return "off";
  if (input.completedDays.has(day)) return "done";
  return day === today ? "pending" : "missed";
}

export function missedDays(input: MemberLedgerInput, today: ISODate): ISODate[] {
  const yesterday = addDays(today, -1);
  if (yesterday < input.joinedOn) return [];
  return eachDay(input.joinedOn, yesterday).filter((d) => dayStatus(input, d, today) === "missed");
}

/** Consecutive completed days. Days off neither break nor add; today counts only once done. */
export function currentStreak(input: MemberLedgerInput, today: ISODate): number {
  let streak = 0;
  for (let d = today; d >= input.joinedOn; d = addDays(d, -1)) {
    const status = dayStatus(input, d, today);
    if (status === "done") streak++;
    else if (status === "missed") break;
  }
  return streak;
}

export interface DebtLine {
  day: ISODate;
  item: DebtItem;
  overdue: boolean; // missed in a previous month and still unpaid
  payment?: Payment;
}

/** One coke + one snack per missed day; each settled independently. */
export function debtLines(input: MemberLedgerInput, payments: Payment[], today: ISODate): DebtLine[] {
  const paid = new Map(payments.map((p) => [`${p.day}|${p.item}`, p]));
  const lines: DebtLine[] = [];
  for (const day of missedDays(input, today)) {
    for (const item of ["coke", "snack"] as const) {
      const payment = paid.get(`${day}|${item}`);
      lines.push({ day, item, payment, overdue: !payment && monthKey(day) < monthKey(today) });
    }
  }
  return lines;
}

export function debtSummary(lines: DebtLine[]) {
  const open = lines.filter((l) => !l.payment);
  return {
    cokes: open.filter((l) => l.item === "coke").length,
    snacks: open.filter((l) => l.item === "snack").length,
    overdue: open.filter((l) => l.overdue).length,
  };
}

/** Streak milestones shown as a plaque in the history (visual only: no points, no rule). */
export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export function streakMilestone(streak: number): number | null {
  return [...STREAK_MILESTONES].reverse().find((n) => streak >= n) ?? null;
}

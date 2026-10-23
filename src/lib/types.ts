import type { ISODate } from "./dates";
import type { DebtItem } from "./ledger";

export type DailyGoal = "study" | "typing" | "reading";
export type Goal = DailyGoal | "project";

interface GoalMeta {
  id: Goal;
  label: string;
  hint: string;
  emoji: string;
}

/** The three daily goals; a day is complete only with all of them. */
export const GOALS: (GoalMeta & { id: DailyGoal })[] = [
  { id: "study", label: "Estudo", hint: "mínimo 60 min", emoji: "📚" },
  { id: "typing", label: "Digitação", hint: "5 min", emoji: "⌨️" },
  { id: "reading", label: "Leitura", hint: "15 min", emoji: "📖" },
];

/** Optional, at most one per day; worth few ranking points. */
export const PROJECT: GoalMeta = { id: "project", label: "Projeto concluído", hint: "opcional · 1 por dia", emoji: "🛠️" };

export function goalMeta(goal: Goal): GoalMeta {
  return goal === "project" ? PROJECT : GOALS.find((g) => g.id === goal)!;
}

export const MIN_STUDY_MINUTES = 60;

export function checkinNumbers(item: { goal: Goal; minutes: number | null; pages: number | null; title: string | null }): string | null {
  if (item.goal === "study" && item.minutes) return `⏱️ ${item.minutes} min de estudo`;
  if (item.goal === "reading" && item.pages) return `📄 ${item.pages} páginas`;
  if (item.goal === "project" && item.title) return `🛠️ ${item.title}`;
  return null;
}

export const MIN_SUMMARY = 40;

export interface Member {
  user_id: string;
  group_id: string;
  display_name: string;
  avatar_path: string | null;
  joined_on: ISODate;
}

export interface Checkin {
  id: string;
  user_id: string;
  group_id: string;
  day: ISODate;
  goal: Goal;
  photo_path: string;
  summary: string | null;
  minutes: number | null;
  pages: number | null;
  title: string | null;
  created_at: string;
}

export type DisputeStatus = "open" | "upheld" | "rejected";

export interface Dispute {
  id: string;
  checkin_id: string;
  author_id: string;
  reason: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface DisputeResult {
  dispute_id: string;
  checkin_id: string;
  yes: number;
  no: number;
  eligible: number;
  majority: number;
  closes_at: string;
  status: DisputeStatus;
}

export interface DisputeVote {
  dispute_id: string;
  voter_id: string;
  upheld: boolean;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  debtor_id: string;
  day: ISODate;
  item: DebtItem;
  received_by: string;
  paid_at: string;
}

export const ITEM_LABEL: Record<DebtItem, string> = { coke: "Coca-Cola", snack: "Salgado" };

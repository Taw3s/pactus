import type { ISODate } from "./dates";
import type { DebtItem } from "./ledger";

export type DailyGoal = "study" | "typing" | "reading";
export type Goal = DailyGoal | "project";

interface GoalMeta {
  id: Goal;
  label: string;
  hint: string;
}

/** The three daily goals; a day is complete only with all of them. */
export const GOALS: (GoalMeta & { id: DailyGoal })[] = [
  { id: "study", label: "Estudo", hint: "Mínimo 60 min" },
  { id: "typing", label: "Digitação", hint: "5 min" },
  { id: "reading", label: "Leitura", hint: "15 min" },
];

/** Optional, at most one per day; worth few ranking points. */
export const PROJECT: GoalMeta = { id: "project", label: "Projeto", hint: "Opcional · 1 por dia" };

export function goalMeta(goal: Goal): GoalMeta {
  return goal === "project" ? PROJECT : GOALS.find((g) => g.id === goal)!;
}

export const MIN_STUDY_MINUTES = 60;
export const MIN_EXTRA_MINUTES = 10;
export const MAX_EXTRA_SESSIONS = 5;
export const MAX_PHOTOS = 4;

export function checkinNumbers(item: { goal: Goal; minutes: number | null; pages: number | null; title: string | null }): string | null {
  if (item.goal === "study" && item.minutes) return `${item.minutes} min`;
  if (item.goal === "reading" && item.pages) return `${item.pages} ${item.pages === 1 ? "página" : "páginas"}`;
  if (item.goal === "project" && item.title) return item.title;
  return null;
}

export const MIN_SUMMARY = 40;

export interface Member {
  user_id: string;
  group_id: string;
  display_name: string;
  avatar_path: string | null;
  joined_on: ISODate;
  created_at: string;
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
  /** An extra study session (adds minutes; never counts as the study goal itself). */
  extra: boolean;
  /** The annulled proof this one retakes (same goal, same day). */
  retake_of: string | null;
  /** Up to 3 more photos besides photo_path (4 in total). */
  extra_photos: string[];
  created_at: string;
}

export type DisputeStatus = "open" | "upheld" | "rejected";

export interface Dispute {
  id: string;
  checkin_id: string;
  /** null when the AI judge opened the tribunal (by_ai). */
  author_id: string | null;
  by_ai: boolean;
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
  /** Why guilty / innocent. Null only for votes cast before reasons existed. */
  reason: string | null;
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


export interface CheckinReview {
  checkin_id: string;
  verdict: import("./ai-review").Verdict;
  seen: string;
  detected: number | null;
  model: string;
}

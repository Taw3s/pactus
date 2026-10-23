import type { ISODate } from "./dates";
import type { DebtItem } from "./ledger";

export type Goal = "study" | "typing" | "reading";

export const GOALS: { id: Goal; label: string; minutes: number; emoji: string }[] = [
  { id: "study", label: "Estudo", minutes: 60, emoji: "📚" },
  { id: "typing", label: "Digitação", minutes: 5, emoji: "⌨️" },
  { id: "reading", label: "Leitura", minutes: 15, emoji: "📖" },
];

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

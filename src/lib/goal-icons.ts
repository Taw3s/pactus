import { BookOpen, GraduationCap, Hammer, Keyboard, type LucideIcon } from "lucide-react";
import type { Goal } from "./types";

export const GOAL_ICON: Record<Goal, LucideIcon> = {
  study: GraduationCap,
  typing: Keyboard,
  reading: BookOpen,
  project: Hammer,
};

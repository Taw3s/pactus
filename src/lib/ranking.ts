// Monthly ranking. Scores are computed on request from check-ins (no stored scores).
import type { ISODate } from "./dates";
import type { Goal } from "./types";

/** Points table — the only place to tune the scoring. */
export const SCORING = {
  completedDay: 20,
  perStudyMinute: 1,
  maxStudyMinutesPerDay: 240,
  perPage: 2,
  maxPagesPerDay: 50,
  perProject: 10, // projects are deliberately cheap so nobody farms them
};

/** Check-ins made before minutes were recorded count as the goal's minimum. */
export const LEGACY_STUDY_MINUTES = 60;

export interface RankingCheckin {
  user_id: string;
  day: ISODate;
  goal: Goal;
  minutes: number | null;
  pages: number | null;
  annulled: boolean;
}

export interface Score {
  userId: string;
  points: number;
  studyMinutes: number;
  pages: number;
  projects: number;
  completedDays: number;
}

export function scoreMonth(userIds: string[], checkins: RankingCheckin[], completedDays: { user_id: string; day: ISODate }[]): Score[] {
  const scores = new Map<string, Score>(
    userIds.map((id) => [id, { userId: id, points: 0, studyMinutes: 0, pages: 0, projects: 0, completedDays: 0 }]),
  );

  for (const c of checkins) {
    const s = scores.get(c.user_id);
    if (!s || c.annulled) continue;
    if (c.goal === "study") {
      const minutes = Math.min(c.minutes ?? LEGACY_STUDY_MINUTES, SCORING.maxStudyMinutesPerDay);
      s.studyMinutes += minutes;
      s.points += minutes * SCORING.perStudyMinute;
    } else if (c.goal === "reading") {
      const pages = Math.min(c.pages ?? 0, SCORING.maxPagesPerDay);
      s.pages += pages;
      s.points += pages * SCORING.perPage;
    } else if (c.goal === "project") {
      s.projects += 1;
      s.points += SCORING.perProject;
    }
  }

  for (const d of completedDays) {
    const s = scores.get(d.user_id);
    if (!s) continue;
    s.completedDays += 1;
    s.points += SCORING.completedDay;
  }

  return [...scores.values()].sort(
    (a, b) => b.points - a.points || b.completedDays - a.completedDays || b.studyMinutes - a.studyMinutes,
  );
}

/** Competition ranking: ties share a position (1, 1, 3...). */
export function positions(scores: Score[]): number[] {
  const out: number[] = [];
  scores.forEach((s, i) => out.push(i > 0 && s.points === scores[i - 1].points ? out[i - 1] : i + 1));
  return out;
}

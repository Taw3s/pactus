import { describe, expect, it } from "vitest";
import { positions, scoreMonth, SCORING, type RankingCheckin } from "./ranking";

const c = (over: Partial<RankingCheckin>): RankingCheckin => ({
  user_id: "ana",
  day: "2026-10-26",
  goal: "study",
  minutes: null,
  pages: null,
  annulled: false,
  ...over,
});

describe("scoreMonth", () => {
  it("adds minutes, pages, projects and completed days", () => {
    const [ana] = scoreMonth(
      ["ana"],
      [
        c({ goal: "study", minutes: 90 }),
        c({ goal: "reading", pages: 12 }),
        c({ goal: "typing" }),
        c({ goal: "project" }),
      ],
      [{ user_id: "ana", day: "2026-10-26" }],
    );
    expect(ana).toMatchObject({ studyMinutes: 90, pages: 12, projects: 1, completedDays: 1 });
    expect(ana.points).toBe(90 + 12 * 2 + 10 + 20);
  });

  it("caps daily study minutes and pages so nobody can rush", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 1000 }), c({ goal: "reading", pages: 900 })], []);
    expect(ana.studyMinutes).toBe(SCORING.maxStudyMinutesPerDay);
    expect(ana.pages).toBe(SCORING.maxPagesPerDay);
  });

  it("sums extra study sessions under the same daily cap", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 90 }), c({ minutes: 60 }), c({ minutes: 200 }), c({ day: "2026-10-27", minutes: 30 })], []);
    expect(ana.studyMinutes).toBe(SCORING.maxStudyMinutesPerDay + 30);
  });

  it("ignores annulled check-ins and counts legacy study as 60 min", () => {
    const [ana] = scoreMonth(["ana"], [c({ minutes: 120, annulled: true }), c({ day: "2026-10-27" })], []);
    expect(ana.studyMinutes).toBe(60);
  });

  it("projects are worth little", () => {
    const scores = scoreMonth(
      ["ana", "bia"],
      [
        ...Array.from({ length: 5 }, (_, i) => c({ user_id: "ana", goal: "project", day: `2026-10-0${i + 1}` })),
        c({ user_id: "bia", minutes: 60 }),
      ],
      [],
    );
    expect(scores.map((s) => s.userId)).toEqual(["bia", "ana"]); // 60 min of study beats 5 projects
  });

  it("orders by points and shares positions on ties", () => {
    const scores = scoreMonth(["a", "b", "c"], [c({ user_id: "a", minutes: 80 }), c({ user_id: "b", minutes: 80 })], []);
    expect(scores[2].userId).toBe("c");
    expect(positions(scores)).toEqual([1, 1, 3]);
  });
});

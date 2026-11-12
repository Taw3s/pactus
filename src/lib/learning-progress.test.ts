import { describe, expect, it, vi } from "vitest";
import { completeLearning, emptyLearning, saveVideoProgress, toLearning, videoSaveArgs, withRow, LEARNING_ID } from "./learning-progress";

describe("learning progress (server rows)", () => {
  const lessons = new Set(["aula-sql-professor"]);
  const challenges = new Set(["python:medium:pt"]);
  it("keeps only ids the catalog knows, with the challenge scores", () => {
    const p = toLearning(
      [
        { kind: "lesson", item_id: "aula-sql-professor", best_score: null },
        { kind: "lesson", item_id: "aula-removida", best_score: null },
        { kind: "challenge", item_id: "python:medium:pt", best_score: 4 },
      ],
      lessons,
      challenges,
    );
    expect(p).toEqual({ completedLessons: ["aula-sql-professor"], completedChallenges: ["python:medium:pt"], bestScores: { "python:medium:pt": 4 } });
  });
  it("applies a confirmed row without duplicates, taking the server's best score", () => {
    let p = withRow(emptyLearning(), { kind: "challenge", item_id: "python:medium:pt", best_score: 3 });
    p = withRow(p, { kind: "challenge", item_id: "python:medium:pt", best_score: 5 });
    p = withRow(p, { kind: "lesson", item_id: "aula-sql-professor", best_score: null });
    p = withRow(p, { kind: "lesson", item_id: "aula-sql-professor", best_score: null });
    expect(p).toEqual({ completedLessons: ["aula-sql-professor"], completedChallenges: ["python:medium:pt"], bestScores: { "python:medium:pt": 5 } });
  });
  it("uses the same id format as the database", () => {
    expect(["aula-sql-professor", "python:medium:pt", "web:expert:en"].every((id) => LEARNING_ID.test(id))).toBe(true);
    expect(["", "Aula", "a b", "../x", "x".repeat(121)].some((id) => LEARNING_ID.test(id))).toBe(false);
  });
});

describe("video save", () => {
  it("drops invalid video ids and clamps the position before calling the server", () => {
    expect(videoSaveArgs("python-basics", { completed: ["aaaaaaaaaa1", "bad", "aaaaaaaaaa1"], currentId: "<script>", index: -3, seconds: 1e9, count: 700 })).toEqual({
      p_course: "python-basics",
      p_completed: ["aaaaaaaaaa1"],
      p_current: null,
      p_index: 0,
      p_seconds: 86400,
      p_count: 600,
    });
  });
  it("returns the merged list from the server and refuses a bad course without calling it", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: ["aaaaaaaaaa1", "aaaaaaaaaa2"], error: null });
    const supabase = { rpc } as never;
    expect(await saveVideoProgress(supabase, "python-basics", { completed: ["aaaaaaaaaa2"], currentId: "aaaaaaaaaa2", index: 1, seconds: 3, count: 2 })).toEqual(["aaaaaaaaaa1", "aaaaaaaaaa2"]);
    await expect(saveVideoProgress(supabase, "../x", { completed: [], currentId: "", index: 0, seconds: 0, count: 0 })).rejects.toThrow();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("a failed save is an error, never a silent success", async () => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }) } as never;
    await expect(saveVideoProgress(supabase, "python-basics", { completed: [], currentId: "", index: 0, seconds: 0, count: 0 })).rejects.toThrow("boom");
    await expect(completeLearning(supabase, "lesson", "aula-x")).rejects.toThrow("boom");
  });
});

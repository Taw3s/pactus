// Progress of Aprender, kept per account on the server (0033) and read on every device. The screens show only what
// the server confirmed; nothing local stands for synced progress. Points, ranking and the group are never touched.
import type { SupabaseClient } from "@supabase/supabase-js";

export type LearningProgress = { completedLessons: string[]; completedChallenges: string[]; bestScores: Record<string, number> };
export type LearningRow = { kind: string; item_id: string; best_score: number | null };

/** Same format the database checks (learning_progress.item_id). */
export const LEARNING_ID = /^[a-z0-9][a-z0-9:._-]{0,119}$/;
export const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
export const COURSE_ID = /^[a-z0-9][a-z0-9-]{0,59}$/;

export function emptyLearning(): LearningProgress {
  return { completedLessons: [], completedChallenges: [], bestScores: {} };
}

/** The rows of learning_progress as the screen uses them; ids the catalog no longer has are left out. */
export function toLearning(rows: LearningRow[], lessonIds: Set<string>, challengeIds: Set<string>): LearningProgress {
  const out = emptyLearning();
  for (const r of rows) {
    if (r.kind === "lesson" && lessonIds.has(r.item_id)) out.completedLessons.push(r.item_id);
    if (r.kind === "challenge" && challengeIds.has(r.item_id)) {
      out.completedChallenges.push(r.item_id);
      if (typeof r.best_score === "number") out.bestScores[r.item_id] = r.best_score;
    }
  }
  return out;
}

/** Applies one confirmed row from learning_complete to the progress shown. */
export function withRow(progress: LearningProgress, row: LearningRow): LearningProgress {
  if (row.kind === "lesson") {
    return progress.completedLessons.includes(row.item_id) ? progress : { ...progress, completedLessons: [...progress.completedLessons, row.item_id] };
  }
  const completedChallenges = progress.completedChallenges.includes(row.item_id) ? progress.completedChallenges : [...progress.completedChallenges, row.item_id];
  const bestScores = typeof row.best_score === "number" ? { ...progress.bestScores, [row.item_id]: row.best_score } : progress.bestScores;
  return { ...progress, completedChallenges, bestScores };
}

export async function loadLearning(supabase: SupabaseClient): Promise<LearningRow[]> {
  const { data, error } = await supabase.from("learning_progress").select("kind, item_id, best_score").limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as LearningRow[];
}

export async function completeLearning(supabase: SupabaseClient, kind: "lesson" | "challenge", item: string, score?: number): Promise<LearningRow> {
  const { data, error } = await supabase.rpc("learning_complete", { p_kind: kind, p_item: item, p_score: score ?? null });
  const row = (Array.isArray(data) ? data[0] : data) as LearningRow | undefined;
  if (error || !row) throw new Error(error?.message ?? "no answer");
  return row;
}

export type VideoRow = {
  course_id: string;
  completed_video_ids: string[];
  current_video_id: string | null;
  current_index: number;
  current_seconds: number;
  video_count: number;
  updated_at: string;
};

export async function loadVideoProgress(supabase: SupabaseClient): Promise<VideoRow[]> {
  const { data, error } = await supabase
    .from("learning_video_progress")
    .select("course_id, completed_video_ids, current_video_id, current_index, current_seconds, video_count, updated_at")
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as VideoRow[];
}

export type VideoSave = { completed: string[]; currentId: string; index: number; seconds: number; count: number };

/** The arguments of learning_video_save, clamped to what the database accepts (bad ids are dropped, not sent). */
export function videoSaveArgs(course: string, s: VideoSave) {
  return {
    p_course: course,
    p_completed: [...new Set(s.completed.filter((id) => VIDEO_ID.test(id)))].slice(0, 600),
    p_current: VIDEO_ID.test(s.currentId) ? s.currentId : null,
    p_index: Math.min(599, Math.max(0, Math.floor(s.index) || 0)),
    p_seconds: Math.min(86400, Math.max(0, Math.floor(s.seconds) || 0)),
    p_count: Math.min(600, Math.max(0, Math.floor(s.count) || 0)),
  };
}

/** Saves a course; resolves to the merged list of videos done on every device. */
export async function saveVideoProgress(supabase: SupabaseClient, course: string, s: VideoSave): Promise<string[]> {
  if (!COURSE_ID.test(course)) throw new Error("invalid course");
  const { data, error } = await supabase.rpc("learning_video_save", videoSaveArgs(course, s));
  if (error || !Array.isArray(data)) throw new Error(error?.message ?? "no answer");
  return data as string[];
}

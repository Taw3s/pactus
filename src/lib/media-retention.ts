// Storage stays small: a proof keeps its full photos for KEEP_FULL_DAYS; after that only the 480 px
// thumbnail of the first photo is kept (lists and old proofs show it). Run daily by /api/cron/remind.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, type ISODate } from "./dates";

export const KEEP_FULL_DAYS = 30;

/**
 * Deletes the full-size photos of proofs that just turned KEEP_FULL_DAYS old. The window is a week
 * wide, so a few missed runs catch up; deleting a file that is already gone is harmless.
 */
export async function trimOldPhotos(admin: SupabaseClient, today: ISODate) {
  const { data, error } = await admin
    .from("checkins")
    .select("photo_path, extra_photos")
    .gte("day", addDays(today, -(KEEP_FULL_DAYS + 7)))
    .lte("day", addDays(today, -(KEEP_FULL_DAYS + 1)))
    .limit(5000);
  if (error) throw new Error(error.message);
  const paths = (data ?? []).flatMap((c) => [c.photo_path as string, ...((c.extra_photos as string[] | null) ?? [])]).filter((p) => p && !p.endsWith(".thumb.jpg"));
  const media = admin.storage.from("media");
  let removed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const { data: gone, error: err } = await media.remove(paths.slice(i, i + 100));
    if (err) console.error("photo trim failed", err.message);
    removed += gone?.length ?? 0;
  }
  return removed;
}

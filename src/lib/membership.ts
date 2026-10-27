// Leaving, removal and account deletion: the database decides (leave_group / remove_member / _drop_member),
// then the server deletes the person's photos, which the database cannot reach. Server only.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Deletes every file under <group>/<user>/ (proof photos, thumbnails, avatar). */
export async function removeUserMedia(admin: SupabaseClient, groupId: string, userId: string) {
  const media = admin.storage.from("media");
  for (;;) {
    const { data } = await media.list(`${groupId}/${userId}`, { limit: 1000 });
    if (!data?.length) return;
    const { error } = await media.remove(data.map((f) => `${groupId}/${userId}/${f.name}`));
    // A photo left behind after someone leaves or deletes the account must not go unnoticed.
    if (error) {
      console.error("media cleanup failed", groupId, userId, error.message);
      return;
    }
    if (data.length < 1000) return;
  }
}

/** Deletes a closed group's files: one folder per member who ever posted. */
export async function removeGroupMedia(admin: SupabaseClient, groupId: string) {
  const { data } = await admin.storage.from("media").list(groupId, { limit: 1000 });
  for (const folder of data ?? []) await removeUserMedia(admin, groupId, folder.name);
}

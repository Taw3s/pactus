import { NextResponse } from "next/server";
import { removeGroupMedia, removeUserMedia } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * { action: "leave" } — the signed-in member leaves the group.
 * { action: "remove", userId } — the owner removes a member.
 * The database checks who may do what; the photos of whoever left are deleted afterwards.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; userId?: string };
  const { data: member } = await supabase.from("members").select("group_id").eq("user_id", me).maybeSingle();
  if (!member) return NextResponse.json({ error: "not a member" }, { status: 403 });

  let who = me;
  let rpc;
  if (body.action === "leave") rpc = await supabase.rpc("leave_group");
  else if (body.action === "remove" && typeof body.userId === "string") {
    who = body.userId;
    rpc = await supabase.rpc("remove_member", { p_user: who });
  } else return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 403 });

  const admin = createAdminClient();
  if (admin) {
    if (rpc.data === "closed") await removeGroupMedia(admin, member.group_id);
    else await removeUserMedia(admin, member.group_id, who);
  }
  return NextResponse.json({ status: rpc.data });
}

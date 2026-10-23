// Server-side data access. RLS guarantees every query only sees the caller's group.
import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { DayOffChange, MemberLedgerInput, Payment } from "./ledger";
import type { Member, PaymentRow } from "./types";

const PAGE = 1000; // PostgREST default max rows

/** Fetches every row of a query, page by page, so we never silently stop at 1000 rows. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Current user + membership. Redirects to login / join when missing. */
export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle<Member>();
  if (!me) redirect("/join?step=code");

  return { supabase, user, me };
}

export async function getMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase.from("members").select("*").order("display_name");
  if (error) throw new Error(error.message);
  return data as Member[];
}

/** Everything the ledger needs for every member of the group. */
export async function getLedgerInputs(supabase: SupabaseClient, members: Member[]) {
  const [changes, completed, payments] = await Promise.all([
    fetchAll<DayOffChange & { user_id: string }>((a, b) =>
      supabase.from("day_off_changes").select("user_id, weekday, effective_from").order("id").range(a, b),
    ),
    fetchAll<{ user_id: string; day: string }>((a, b) =>
      supabase.from("completed_days").select("user_id, day").order("user_id").order("day").range(a, b),
    ),
    fetchAll<PaymentRow>((a, b) => supabase.from("payments").select("*").order("id").range(a, b)),
  ]);

  const inputs = new Map<string, MemberLedgerInput>();
  const paymentsBy = new Map<string, Payment[]>();
  for (const m of members) {
    inputs.set(m.user_id, { joinedOn: m.joined_on, dayOffChanges: [], completedDays: new Set() });
    paymentsBy.set(m.user_id, []);
  }
  for (const c of changes) inputs.get(c.user_id)?.dayOffChanges.push(c);
  for (const c of completed) inputs.get(c.user_id)?.completedDays.add(c.day);
  for (const p of payments) paymentsBy.get(p.debtor_id)?.push(p);
  return { inputs, paymentsBy };
}

/** Signed URLs for private media (photos, avatars). */
export async function signUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await supabase.storage.from("media").createSignedUrls(unique, 60 * 60);
  for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  return urls;
}

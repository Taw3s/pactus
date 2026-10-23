/* eslint-disable @next/next/no-img-element -- signed URLs */
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { DisputeBadge } from "@/components/DisputeBadge";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { dayOffOn, type DayOffChange } from "@/lib/ledger";
import { checkinNumbers, goalMeta, GOALS, type Checkin, type DisputeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const [members, { data: checkinRows }, { data: changeRows }, { data: resultRows }] = await Promise.all([
    getMembers(supabase),
    supabase.from("checkins").select("*").eq("day", today).order("created_at"),
    supabase.from("day_off_changes").select("user_id, weekday, effective_from"),
    supabase.from("dispute_results").select("*"),
  ]);
  const checkins = (checkinRows ?? []) as Checkin[];
  const results = (resultRows ?? []) as DisputeResult[];
  const resultByCheckin = new Map(results.map((r) => [r.checkin_id, r]));
  const urls = await signUrls(supabase, [...checkins.map((c) => c.photo_path), ...members.map((m) => m.avatar_path)]);

  // Open disputes may concern yesterday's check-ins, so list them separately.
  const openIds = results.filter((r) => r.status === "open").map((r) => r.checkin_id);
  const { data: openRows } = openIds.length
    ? await supabase.from("checkins").select("*").in("id", openIds)
    : { data: [] as Checkin[] };
  const open = (openRows ?? []) as Checkin[];
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = members.map((m) => {
    const changes = (changeRows ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
    const all = checkins.filter((c) => c.user_id === m.user_id);
    const mine = all.filter((c) => c.goal !== "project");
    const project = all.find((c) => c.goal === "project");
    const valid = mine.filter((c) => resultByCheckin.get(c.id)?.status !== "upheld");
    return { m, mine, project, off: weekdayOf(today) === dayOffOn(changes, today), complete: new Set(valid.map((c) => c.goal)).size === 3 };
  });
  rows.sort((a, b) => Number(b.complete) - Number(a.complete) || b.mine.length - a.mine.length);

  return (
    <>
      <PageHeader title="Feed" subtitle={formatDayPt(today)} />

      {open.length > 0 && (
        <section className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <h2 className="mb-2 font-semibold text-amber-200">⚖️ Tribunal em andamento</h2>
          <ul className="space-y-1 text-sm">
            {open.map((c) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="text-amber-100 underline">
                  {goalMeta(c.goal).label} de {nameOf.get(c.user_id)} · {formatDayPt(c.day)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        {rows.map(({ m, mine, project, off, complete }) => (
          <section key={m.user_id} className="card" data-member={m.display_name}>
            <div className="flex items-center gap-3">
              <Avatar name={m.display_name} url={m.avatar_path ? urls.get(m.avatar_path) : null} />
              <div className="flex-1">
                <p className="font-semibold">
                  {m.display_name}
                  {m.user_id === me.user_id && <span className="text-zinc-500"> (você)</span>}
                </p>
                <p className="text-xs text-zinc-400">
                  {off ? "Folga hoje" : complete ? "Dia cumprido" : `${mine.length}/3 metas`}
                </p>
              </div>
              <span className="text-xl" aria-hidden>{off ? "🏖️" : complete ? "✅" : "⏳"}</span>
            </div>
            {mine.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {GOALS.map((g) => {
                  const c = mine.find((x) => x.goal === g.id);
                  if (!c) {
                    return (
                      <div key={g.id} className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-zinc-800 text-xs text-zinc-600">
                        {g.label}
                      </div>
                    );
                  }
                  const result = resultByCheckin.get(c.id);
                  return (
                    <Link key={g.id} href={`/checkin/${c.id}`} className="relative block aspect-square overflow-hidden rounded-xl bg-zinc-800">
                      <img src={urls.get(c.photo_path)} alt={g.label} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 text-[11px]">{g.emoji} {g.label}</span>
                      {result && <DisputeBadge status={result.status} className="absolute left-1 top-1" />}
                    </Link>
                  );
                })}
              </div>
            )}
            {mine.length > 0 && (
              <p className="mt-2 text-xs text-emerald-300">
                {mine.map((c) => checkinNumbers(c)).filter(Boolean).join(" · ")}
              </p>
            )}
            {mine.find((c) => c.goal === "study")?.summary && (
              <p className="mt-1 line-clamp-3 text-sm text-zinc-300">📚 {mine.find((c) => c.goal === "study")!.summary}</p>
            )}
            {project && (
              <Link href={`/checkin/${project.id}`} className="mt-2 flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm">
                <span className="flex-1">🛠️ Projeto: {project.title}</span>
                {resultByCheckin.get(project.id) && <DisputeBadge status={resultByCheckin.get(project.id)!.status} />}
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

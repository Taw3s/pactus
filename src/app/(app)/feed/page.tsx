/* eslint-disable @next/next/no-img-element -- signed URLs */
import { ChevronRight, Circle, CircleCheck, Pause, Scale } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import type { Verdict } from "@/lib/ai-review";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { getMembers, requireMember, signUrls } from "@/lib/data";
import { GOAL_ICON } from "@/lib/goal-icons";
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
  const { data: reviewRows } = checkins.length
    ? await supabase.from("checkin_reviews").select("checkin_id, verdict").in("checkin_id", checkins.map((c) => c.id))
    : { data: [] as { checkin_id: string; verdict: string }[] };
  const reviewOf = new Map((reviewRows ?? []).map((r) => [r.checkin_id as string, r.verdict as Verdict]));
  const urls = await signUrls(supabase, [...checkins.map((c) => c.photo_path), ...members.map((m) => m.avatar_path)]);

  // Open disputes may concern yesterday's check-ins, so list them separately.
  const openIds = results.filter((r) => r.status === "open").map((r) => r.checkin_id);
  const { data: openRows } = openIds.length ? await supabase.from("checkins").select("*").in("id", openIds) : { data: [] as Checkin[] };
  const open = (openRows ?? []) as Checkin[];
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = members.map((m) => {
    const changes = (changeRows ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
    const all = checkins.filter((c) => c.user_id === m.user_id);
    const mine = all.filter((c) => c.goal !== "project");
    const project = all.find((c) => c.goal === "project");
    const valid = mine.filter((c) => resultByCheckin.get(c.id)?.status !== "upheld");
    const done = new Set(valid.map((c) => c.goal)).size;
    return { m, mine, project, done, off: weekdayOf(today) === dayOffOn(changes, today) };
  });
  rows.sort((a, b) => b.done - a.done || b.mine.length - a.mine.length);

  return (
    <>
      <PageHeader title="Grupo" subtitle={`Feed de ${formatDayPt(today)}`} />
      <GroupTabs />

      {open.length > 0 && (
        <section className="mb-6 rounded-2xl bg-warn-bg p-4" aria-labelledby="tribunal">
          <h2 id="tribunal" className="flex items-center gap-2 font-semibold text-warn">
            <Scale size={20} aria-hidden /> Tribunal em andamento
          </h2>
          <ul className="mt-2">
            {open.map((c) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="flex min-h-11 items-center justify-between gap-2 text-fg">
                  <span>
                    {goalMeta(c.goal).label} de {nameOf.get(c.user_id)} · {formatDayPt(c.day)}
                  </span>
                  <ChevronRight size={20} aria-hidden className="text-warn" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        {rows.map(({ m, mine, project, done, off }) => (
          <section key={m.user_id} className="card" data-member={m.display_name} aria-label={m.display_name}>
            <div className="flex items-center gap-3">
              <Avatar name={m.display_name} url={m.avatar_path ? urls.get(m.avatar_path) : null} />
              <Link href={`/historico/${m.user_id}`} className="min-w-0 flex-1">
                <p className="break-words text-lg font-semibold leading-6">
                  {m.display_name}
                  {m.user_id === me.user_id && <span className="text-sm font-normal text-muted"> · você</span>}
                </p>
              </Link>
              {off ? (
                <Badge tone="off" icon={Pause}>Folga</Badge>
              ) : done === 3 ? (
                <Badge tone="done" icon={CircleCheck}>Dia cumprido</Badge>
              ) : (
                <Badge tone="pending" icon={Circle}>
                  <span className="tabular">{done}/3 metas</span>
                </Badge>
              )}
            </div>

            <ul className="mt-3 grid grid-cols-3 gap-2">
              {GOALS.map((g) => {
                const c = mine.find((x) => x.goal === g.id);
                const Icon = GOAL_ICON[g.id];
                if (!c) {
                  return (
                    <li key={g.id}>
                      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-divider text-muted">
                        <Icon size={20} aria-hidden />
                      </div>
                      <p className="mt-1.5 text-sm font-medium">{g.label}</p>
                      <p className="text-xs text-muted">Pendente</p>
                    </li>
                  );
                }
                const value = checkinNumbers(c);
                return (
                  <li key={g.id}>
                    <Link href={`/checkin/${c.id}`} className="block">
                      <img src={urls.get(c.photo_path)} alt={`Prova de ${g.label.toLowerCase()} de ${m.display_name}`} className="aspect-square w-full rounded-xl bg-raised object-cover" />
                      <p className="mt-1.5 text-sm font-medium">{g.label}</p>
                      {value && <p className="tabular text-xs text-muted">{value}</p>}
                    </Link>
                    <div className="mt-1">
                      <PrimaryBadge dispute={resultByCheckin.get(c.id)?.status} ai={reviewOf.get(c.id)} />
                    </div>
                  </li>
                );
              })}
            </ul>

            {project && (
              <Link href={`/checkin/${project.id}`} className="mt-3 flex min-h-12 items-center gap-2 border-t border-divider pt-3 text-sm">
                <GOAL_ICON.project size={18} aria-hidden className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">Projeto: {project.title}</span>
                <PrimaryBadge dispute={resultByCheckin.get(project.id)?.status} ai={reviewOf.get(project.id)} />
                <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

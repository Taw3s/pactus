/* eslint-disable @next/next/no-img-element -- signed URLs */
import { ChevronRight, Circle, CircleCheck, Pause } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { PageHeader } from "@/components/PageHeader";
import { Sprite } from "@/components/Sprite";
import { PrimaryBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { embeddedVerdict, getMembers, requireMember, signThumbs } from "@/lib/data";
import { GOAL_SPRITE } from "@/lib/goal-icons";
import { dayOffOn, type DayOffChange } from "@/lib/ledger";
import { photoAgeLabel } from "@/lib/photo-date";
import { typingLabel } from "@/lib/typing";
import { checkinNumbers, goalMeta, GOALS, type Checkin, type DisputeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const [members, { data: checkinRows }, { data: changeRows }, { data: resultRows }, { data: typingRows }] = await Promise.all([
    getMembers(supabase),
    supabase.from("checkins").select("*, checkin_reviews(verdict)").eq("day", today).order("created_at"),
    supabase.from("day_off_changes").select("user_id, weekday, effective_from"),
    supabase.from("dispute_results").select("*"),
    supabase.from("typing_tests").select("user_id, wpm, accuracy, score").eq("day", today).not("score", "is", null),
  ]);
  // Today's best typing test per person (what scores), shown on the typing tile.
  const typingBest = new Map<string, { wpm: number; accuracy: number; score: number }>();
  for (const t of (typingRows ?? []) as { user_id: string; wpm: number; accuracy: number; score: number }[]) {
    const cur = typingBest.get(t.user_id);
    if (!cur || Number(t.score) > cur.score) typingBest.set(t.user_id, { wpm: Number(t.wpm), accuracy: Number(t.accuracy), score: Number(t.score) });
  }
  const checkins = (checkinRows ?? []) as (Checkin & { checkin_reviews: unknown })[];
  const results = (resultRows ?? []) as DisputeResult[];
  const resultByCheckin = new Map(results.map((r) => [r.checkin_id, r]));
  const reviewOf = new Map(checkins.map((c) => [c.id, embeddedVerdict(c.checkin_reviews)]));

  // Open disputes may concern yesterday's check-ins, so list them separately.
  const openIds = results.filter((r) => r.status === "open").map((r) => r.checkin_id);
  const [urls, { data: openRows }, { data: reactionRows }] = await Promise.all([
    signThumbs(supabase, [...checkins.map((c) => c.photo_path), ...members.map((m) => m.avatar_path)]),
    openIds.length ? supabase.from("checkins").select("*").in("id", openIds) : Promise.resolve({ data: [] as Checkin[] }),
    checkins.length ? supabase.from("checkin_reactions").select("checkin_id").in("checkin_id", checkins.map((c) => c.id)) : Promise.resolve({ data: [] }),
  ]);
  const stamps = new Map<string, number>();
  for (const r of (reactionRows ?? []) as { checkin_id: string }[]) stamps.set(r.checkin_id, (stamps.get(r.checkin_id) ?? 0) + 1);
  const open = (openRows ?? []) as Checkin[];
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = members.map((m) => {
    const changes = (changeRows ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
    const all = checkins.filter((c) => c.user_id === m.user_id);
    const mine = all.filter((c) => c.goal !== "project" && !c.extra);
    const project = all.findLast((c) => c.goal === "project");
    const valid = mine.filter((c) => resultByCheckin.get(c.id)?.status !== "upheld");
    const done = new Set(valid.map((c) => c.goal)).size;
    // Valid extra study sessions, shown as "+N min" next to the study proof.
    const extraMinutes = all
      .filter((c) => c.extra && resultByCheckin.get(c.id)?.status !== "upheld")
      .reduce((sum, c) => sum + (c.minutes ?? 0), 0);
    return { m, mine, project, done, extraMinutes, off: weekdayOf(today) === dayOffOn(changes, today) };
  });
  rows.sort((a, b) => b.done - a.done || b.mine.length - a.mine.length);

  return (
    <>
      <PageHeader title="Grupo" subtitle={`Feed de ${formatDayPt(today)}`} />
      <GroupTabs />

      {open.length > 0 && (
        <section className="card mb-6 !border-warn !bg-warn-bg" aria-labelledby="tribunal">
          <h2 id="tribunal" className="pixel flex items-center gap-2 text-xl uppercase text-warn">
            <Sprite name="judgeBench" /> Tribunal em andamento
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
        {rows.map(({ m, mine, project, done, extraMinutes, off }) => (
          <section key={m.user_id} className="card" data-member={m.display_name} aria-label={m.display_name}>
            <div className="flex items-center gap-3">
              <Avatar name={m.display_name} url={m.avatar_path ? urls.get(m.avatar_path) : null} />
              <Link href={`/historico/${m.user_id}`} className="min-w-0 flex-1">
                <p className="pixel break-words text-xl uppercase leading-6">
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
                // Rows come in creation order: a retake (after its annulled proof) wins.
                const c = mine.findLast((x) => x.goal === g.id);
                if (!c) {
                  return (
                    <li key={g.id}>
                      <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-divider">
                        <Sprite name={GOAL_SPRITE[g.id]} dim />
                      </div>
                      <p className="pixel mt-1.5 text-base uppercase">{g.label}</p>
                      <p className="text-xs text-muted">{off ? "Opcional" : "Pendente"}</p>
                    </li>
                  );
                }
                const best = g.id === "typing" && c.typing_test_id ? typingBest.get(c.user_id) : undefined;
                const value = best ? typingLabel(best) : checkinNumbers(c);
                const age = photoAgeLabel(c.photo_taken_at, c.day);
                return (
                  <li key={g.id}>
                    <Link href={`/checkin/${c.id}`} className="block">
                      <span className="relative block">
                        <img src={urls.get(c.photo_path)} alt={`Prova de ${g.label.toLowerCase()} de ${m.display_name}`} className="aspect-square w-full rounded-sm border-2 border-bevel-dark bg-raised object-cover" />
                        {(c.extra_photos?.length ?? 0) > 0 && (
                          <span className="tabular absolute bottom-1 right-1 rounded-sm bg-bg/90 px-1 text-xs font-semibold">{c.extra_photos.length + 1} fotos</span>
                        )}
                      </span>
                      <p className="pixel mt-1.5 text-base uppercase">{g.label}</p>
                      {value && (
                        <p className="tabular text-xs text-muted">
                          {value}
                          {g.id === "study" && extraMinutes > 0 && ` + ${extraMinutes} extra`}
                        </p>
                      )}
                    </Link>
                    {age && <p className="text-xs font-semibold text-warn">{age}</p>}
                    {(stamps.get(c.id) ?? 0) > 0 && (
                      <p className="tabular text-xs text-accent" data-testid="stamp-count">
                        {stamps.get(c.id)} {stamps.get(c.id) === 1 ? "carimbo" : "carimbos"}
                      </p>
                    )}
                    <div className="mt-1">
                      <PrimaryBadge dispute={resultByCheckin.get(c.id)?.status} ai={reviewOf.get(c.id)} />
                    </div>
                  </li>
                );
              })}
            </ul>

            {project && (
              <Link href={`/checkin/${project.id}`} className="mt-3 flex min-h-12 items-center gap-2 border-t border-divider pt-3 text-sm">
                <Sprite name="computer" />
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

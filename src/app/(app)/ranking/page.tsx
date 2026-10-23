import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { MonthNav, monthName } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { lastDayOfMonth, monthKey, spToday } from "@/lib/dates";
import { fetchAll, getMembers, requireMember, signUrls } from "@/lib/data";
import { positions, scoreMonth, SCORING, type RankingCheckin } from "@/lib/ranking";

export const dynamic = "force-dynamic";

const PODIUM = ["text-gold", "text-silver", "text-bronze"];

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { supabase, me } = await requireMember();
  const current = monthKey(spToday());
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : current;
  const from = `${month}-01`;
  const to = lastDayOfMonth(from);

  const [members, checkins, upheld, completed] = await Promise.all([
    getMembers(supabase),
    fetchAll<Omit<RankingCheckin, "annulled"> & { id: string }>((a, b) =>
      supabase.from("checkins").select("id, user_id, day, goal, minutes, pages").gte("day", from).lte("day", to).order("id").range(a, b),
    ),
    fetchAll<{ checkin_id: string }>((a, b) =>
      supabase.from("dispute_results").select("checkin_id").eq("status", "upheld").order("checkin_id").range(a, b),
    ),
    fetchAll<{ user_id: string; day: string }>((a, b) =>
      supabase.from("completed_days").select("user_id, day").gte("day", from).lte("day", to).order("user_id").order("day").range(a, b),
    ),
  ]);

  const annulled = new Set(upheld.map((u) => u.checkin_id));
  const scores = scoreMonth(
    members.map((x) => x.user_id),
    checkins.map((c) => ({ ...c, annulled: annulled.has(c.id) })),
    completed,
  );
  const pos = positions(scores);
  const byId = new Map(members.map((x) => [x.user_id, x]));
  const urls = await signUrls(supabase, members.map((x) => x.avatar_path));
  const leader = (key: "studyMinutes" | "pages" | "projects") =>
    [...scores].sort((a, b) => b[key] - a[key]).find((s) => s[key] > 0);
  const highlights = [
    { label: "Mais horas", s: leader("studyMinutes"), value: (s: (typeof scores)[number]) => hours(s.studyMinutes) },
    { label: "Mais páginas", s: leader("pages"), value: (s: (typeof scores)[number]) => `${s.pages} páginas` },
    { label: "Mais projetos", s: leader("projects"), value: (s: (typeof scores)[number]) => `${s.projects}` },
  ];

  const everyoneZero = scores.every((s) => s.points === 0);

  return (
    <>
      <PageHeader title="Grupo" subtitle="Ranking do mês" />
      <GroupTabs />
      <MonthNav month={month} current={current} hrefFor={(x) => `/ranking?m=${x}`} />

      {everyoneZero ? (
        <p className="card text-center text-muted">Ninguém pontuou em {monthName(month).toLowerCase()} ainda.</p>
      ) : (
        <ol className="space-y-2" data-testid="ranking">
          {scores.map((s, i) => {
            const member = byId.get(s.userId)!;
            const p = pos[i];
            const podium = p <= 3 && s.points > 0 ? PODIUM[p - 1] : null;
            const isMe = s.userId === me.user_id;
            return (
              <li
                key={s.userId}
                data-member={member.display_name}
                data-position={p}
                className={`flex min-h-20 items-center gap-3 rounded-2xl p-3 ${isMe ? "bg-raised" : "bg-surface"}`}
              >
                <span className={`tabular w-8 shrink-0 text-center text-xl font-bold ${podium ?? "text-muted"}`}>
                  {p}º
                </span>
                <Avatar name={member.display_name} url={member.avatar_path ? urls.get(member.avatar_path) : null} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <span className="break-words">{member.display_name}</span>
                    {isMe && <span className="ml-1.5 text-sm font-normal text-muted">· Você</span>}
                  </p>
                  <p className="tabular text-sm text-muted">
                    {hours(s.studyMinutes)} de estudo · {s.pages} {s.pages === 1 ? "página" : "páginas"}
                    {s.projects > 0 && ` · ${s.projects} ${s.projects === 1 ? "projeto" : "projetos"}`} · {s.completedDays}{" "}
                    {s.completedDays === 1 ? "dia" : "dias"}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className={`tabular block font-bold ${p === 1 && s.points > 0 ? "text-[32px] leading-9" : "text-2xl leading-8"}`} data-testid="points">
                    {s.points}
                  </span>
                  <span className="text-xs text-muted">pts</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {!everyoneZero && (
        <section className="mt-6" aria-labelledby="destaques">
          <h2 id="destaques" className="mb-2 text-sm font-semibold text-muted">
            Destaques do mês
          </h2>
          <dl className="divide-y divide-divider rounded-2xl bg-surface px-4">
            {highlights.map((h) => (
              <div key={h.label} className="flex min-h-12 items-center justify-between gap-3">
                <dt className="text-sm text-muted">{h.label}</dt>
                <dd className="tabular text-right text-sm font-semibold">
                  {h.s ? `${byId.get(h.s.userId)?.display_name} · ${h.value(h.s)}` : "Ninguém ainda"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <details className="mt-6 rounded-2xl bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Como a pontuação funciona</summary>
        <ul className="mt-3 space-y-1 text-muted">
          <li>Dia cumprido (3 metas): {SCORING.completedDay} pts</li>
          <li>
            Estudo: {SCORING.perStudyMinute} pt por minuto, até {SCORING.maxStudyMinutesPerDay} min por dia
          </li>
          <li>
            Leitura: {SCORING.perPage} pts por página, até {SCORING.maxPagesPerDay} páginas por dia
          </li>
          <li>Projeto: {SCORING.perProject} pts, 1 por dia</li>
          <li>Prova anulada pelo Tribunal não pontua. Provas enviadas na folga pontuam normalmente.</li>
        </ul>
      </details>
    </>
  );
}

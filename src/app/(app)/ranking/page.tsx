import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { lastDayOfMonth, monthKey, spToday } from "@/lib/dates";
import { fetchAll, getMembers, requireMember, signUrls } from "@/lib/data";
import { positions, scoreMonth, SCORING, type RankingCheckin } from "@/lib/ranking";

export const dynamic = "force-dynamic";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MEDALS = ["🥇", "🥈", "🥉"];

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

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
    { label: "Mais páginas", s: leader("pages"), value: (s: (typeof scores)[number]) => `${s.pages} pág.` },
    { label: "Mais projetos", s: leader("projects"), value: (s: (typeof scores)[number]) => `${s.projects}` },
  ];

  return (
    <>
      <PageHeader title="Ranking" subtitle="Pontuação do mês" />

      <div className="card mb-3 flex items-center justify-between py-2">
        <Link href={`?m=${shiftMonth(month, -1)}`} className="px-2 text-zinc-400" aria-label="Mês anterior">‹</Link>
        <h2 className="font-semibold">{MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</h2>
        {month < current ? (
          <Link href={`?m=${shiftMonth(month, 1)}`} className="px-2 text-zinc-400" aria-label="Próximo mês">›</Link>
        ) : (
          <span className="px-2 text-zinc-700">›</span>
        )}
      </div>

      <ol className="space-y-2" data-testid="ranking">
        {scores.map((s, i) => {
          const member = byId.get(s.userId)!;
          const medal = pos[i] <= 3 && s.points > 0 ? MEDALS[pos[i] - 1] : null;
          return (
            <li
              key={s.userId}
              data-member={member.display_name}
              data-position={pos[i]}
              className={`card flex items-center gap-3 ${medal ? "border-emerald-500/30" : ""} ${s.userId === me.user_id ? "ring-1 ring-emerald-500/50" : ""}`}
            >
              <span className="w-7 text-center text-lg font-bold">{medal ?? `${pos[i]}º`}</span>
              <Avatar name={member.display_name} url={member.avatar_path ? urls.get(member.avatar_path) : null} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{member.display_name}</p>
                <p className="text-xs text-zinc-400">
                  ⏱️ {hours(s.studyMinutes)} · 📄 {s.pages} · 🛠️ {s.projects} · ✅ {s.completedDays} {s.completedDays === 1 ? "dia" : "dias"}
                </p>
              </div>
              <span className="text-right">
                <span className="block text-xl font-black" data-testid="points">{s.points}</span>
                <span className="text-[10px] uppercase text-zinc-500">pts</span>
              </span>
            </li>
          );
        })}
      </ol>

      <section className="mt-4 grid grid-cols-3 gap-2">
        {highlights.map((h) => (
          <div key={h.label} className="card p-3 text-center">
            <p className="text-[11px] uppercase text-zinc-500">{h.label}</p>
            <p className="mt-1 truncate text-sm font-semibold">{h.s ? byId.get(h.s.userId)?.display_name : "—"}</p>
            <p className="text-xs text-emerald-300">{h.s ? h.value(h.s) : ""}</p>
          </div>
        ))}
      </section>

      <details className="mt-4 text-xs text-zinc-400">
        <summary className="cursor-pointer">Como a pontuação funciona</summary>
        <ul className="mt-2 space-y-1">
          <li>✅ Dia cumprido (3 metas): {SCORING.completedDay} pts</li>
          <li>⏱️ Estudo: {SCORING.perStudyMinute} pt por minuto (até {SCORING.maxStudyMinutesPerDay} min por dia)</li>
          <li>📄 Leitura: {SCORING.perPage} pts por página (até {SCORING.maxPagesPerDay} páginas por dia)</li>
          <li>🛠️ Projeto: {SCORING.perProject} pts (1 por dia)</li>
          <li>Check-in anulado pelo tribunal não pontua. Check-ins na folga pontuam normalmente.</li>
        </ul>
      </details>
    </>
  );
}

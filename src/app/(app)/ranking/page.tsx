import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { MonthNav, monthName } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { Sprite } from "@/components/Sprite";
import { lastDayOfMonth, monthKey, spToday } from "@/lib/dates";
import { typingLabel } from "@/lib/typing";
import { getMembers, getMonthScores, requireMember, signUrls } from "@/lib/data";
import { SCORING } from "@/lib/ranking";

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
  const [{ members, scores, pos }, { data: typingRows }] = await Promise.all([
    getMonthScores(supabase, getMembers(supabase), month),
    supabase.from("typing_tests").select("user_id, device, mode, wpm, accuracy").gte("day", `${month}-01`).lte("day", lastDayOfMonth(`${month}-01`)).not("wpm", "is", null),
  ]);
  // Best wpm of the month per person: phones and computers apart, random words and texts apart.
  const records = (device: "pc" | "mobile", mode: "words" | "text") => {
    const best = new Map<string, { wpm: number; accuracy: number }>();
    for (const t of (typingRows ?? []) as { user_id: string; device: string; mode: string; wpm: number; accuracy: number }[]) {
      if (t.device !== device || t.mode !== mode) continue;
      const cur = best.get(t.user_id);
      if (!cur || Number(t.wpm) > cur.wpm) best.set(t.user_id, { wpm: Number(t.wpm), accuracy: Number(t.accuracy) });
    }
    return [...best.entries()].sort((a, b) => b[1].wpm - a[1].wpm).slice(0, 5);
  };
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
                className={`card flex min-h-20 items-center gap-3 !p-3 ${isMe ? "!bg-raised" : ""}`}
              >
                {p === 1 && s.points > 0 ? (
                  <span className="-mx-2 shrink-0">
                    <Sprite name="trophy" />
                    <span className="sr-only">1º</span>
                  </span>
                ) : (
                  <span className={`pixel tabular w-8 shrink-0 text-center text-xl font-bold ${podium ?? "text-muted"}`}>{p}º</span>
                )}
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
                  <span className={`pixel tabular block font-bold ${p === 1 && s.points > 0 ? "text-[32px] leading-9" : "text-2xl leading-8"}`} data-testid="points">
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
          <h2 id="destaques" className="pixel mb-2 text-lg uppercase">
            Destaques do mês
          </h2>
          <dl className="card divide-y divide-divider !py-0">
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

      <section className="card mt-6" aria-labelledby="recordes" data-testid="typing-records">
        <h2 id="recordes" className="pixel mb-3 text-xl uppercase leading-6">
          Recordes de digitação
        </h2>
        <div className="grid gap-4 min-[420px]:grid-cols-2">
          {(["pc", "mobile"] as const).map((device) => {
            const lists = (["words", "text"] as const).map((mode) => [mode, records(device, mode)] as const).filter(([, l]) => l.length > 0);
            return (
              <div key={device} data-device={device}>
                <h3 className="pixel mb-1 text-base uppercase text-muted">{device === "pc" ? "PC" : "Celular"}</h3>
                {lists.length === 0 ? (
                  <p className="text-sm text-muted">Ninguém fez teste ainda.</p>
                ) : (
                  lists.map(([mode, list]) => (
                    <div key={mode} data-mode={mode} className="mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{mode === "words" ? "Palavras" : "Texto"}</p>
                      <ol className="space-y-1 text-sm">
                        {list.map(([id, r], n) => (
                          <li key={id} className="flex justify-between gap-2">
                            <span className="truncate">
                              {n + 1}. {byId.get(id)?.display_name ?? "?"}
                            </span>
                            <span className="tabular shrink-0 font-semibold">{typingLabel(r)}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </section>

      <details className="card mt-6 text-sm">
        <summary className="cursor-pointer font-semibold">Como a pontuação funciona</summary>
        <ul className="mt-3 space-y-1 text-muted">
          <li>Dia cumprido (3 metas): {SCORING.completedDay} pts</li>
          <li>
            Estudo: {SCORING.perStudyMinute} pt por minuto, até {SCORING.maxStudyMinutesPerDay} min por dia
          </li>
          <li>
            Leitura: {SCORING.perPage} pts por página, até {SCORING.maxPagesPerDay} páginas por dia
          </li>
          <li>
            Digitação: o melhor teste do dia vale WPM × precisão em pontos (60 WPM com 95% = 57), até {SCORING.maxTypingPointsPerDay} por dia
          </li>
          <li>Projeto: {SCORING.perProject} pts, 1 por dia</li>
          <li>Prova anulada pelo Tribunal não pontua. Provas enviadas na folga pontuam normalmente.</li>
        </ul>
      </details>
    </>
  );
}

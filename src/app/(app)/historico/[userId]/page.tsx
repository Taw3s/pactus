import { Check, Circle, Pause, Settings, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthNav, monthName } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { CollectionShelf } from "@/components/CollectionShelf";
import { MilestonePlaque } from "@/components/MilestonePlaque";
import { PersonPicker } from "@/components/PersonPicker";
import { Sprite } from "@/components/Sprite";
import { eachDay, lastDayOfMonth, monthKey, spToday, weekdayOf } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember } from "@/lib/data";
import { currentStreak, dayStatus, streakMilestone, type DayStatus } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_FULL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WORD: Record<DayStatus, string> = { done: "cumprido", missed: "falhou", off: "folga", pending: "pendente (hoje)", before: "sem meta" };

function Cell({ day, status, today, offButDone }: { day: string; status: DayStatus; today: boolean; offButDone: boolean }) {
  const n = Number(day.slice(8));
  const style: Record<DayStatus, string> = {
    done: "bg-done-bg text-done",
    missed: "bg-fail-bg text-fail",
    off: "bg-off-bg text-off",
    pending: "bg-pending-bg text-pending",
    before: "text-muted",
  };
  const Icon = status === "done" ? Check : status === "missed" ? X : status === "off" ? Pause : status === "pending" ? Circle : null;
  const label = `${n} de ${monthName(day.slice(0, 7)).split(" ")[0].toLowerCase()}, ${WEEK_FULL[weekdayOf(day)]}: ${WORD[status]}${offButDone ? ", metas feitas na folga" : ""}${today ? ", hoje" : ""}`;
  return (
    <li
      aria-label={label}
      data-day={day}
      data-status={status}
      className={`relative flex h-12 flex-col items-center justify-center rounded-sm ${style[status]} ${today ? "ring-2 ring-accent ring-inset" : ""}`}
    >
      <span className="pixel tabular text-lg leading-5">{n}</span>
      {Icon && <Icon size={14} strokeWidth={2.5} aria-hidden />}
      {offButDone && <Check size={10} strokeWidth={3} aria-hidden className="absolute right-1 top-1 text-done" />}
    </li>
  );
}

export default async function HistoryPage({ params, searchParams }: { params: Promise<{ userId: string }>; searchParams: Promise<{ m?: string }> }) {
  const [{ userId }, { m }] = await Promise.all([params, searchParams]);
  const { supabase, me } = await requireMember();
  const today = spToday();
  const members = await getMembers(supabase);
  const member = members.find((x) => x.user_id === userId);
  if (!member) notFound();

  const [{ inputs }, { data: chestRows }] = await Promise.all([
    getLedgerInputs(supabase, [member]),
    supabase.from("chest_openings").select("item_id").eq("user_id", userId),
  ]);
  const counts = new Map<string, number>();
  for (const r of chestRows ?? []) counts.set(r.item_id, (counts.get(r.item_id) ?? 0) + 1);
  const input = inputs.get(userId)!;
  const current = monthKey(today);
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : current;
  const first = `${month}-01`;
  const days = eachDay(first, lastDayOfMonth(first));
  const statuses = days.map((d) => dayStatus(input, d, today));
  const count = (s: DayStatus) => statuses.filter((x) => x === s).length;
  const isMe = userId === me.user_id;
  const streak = currentStreak(input, today);
  const monthLower = monthName(month).split(" ")[0].toLowerCase();
  const milestone = streakMilestone(streak);

  return (
    <>
      <PageHeader
        title={isMe ? "Perfil" : "Histórico"}
        right={
          <Link href="/config" className="btn-secondary min-h-12 px-3 text-sm">
            <Settings size={18} aria-hidden />
            Configurações
          </Link>
        }
      />
      <PersonPicker people={members.map((x) => ({ id: x.user_id, name: x.display_name }))} selected={userId} month={month} />

      <div className="card mb-4 flex items-center gap-3">
        <Sprite name="memoryCard" />
        <div className="min-w-0">
          <h2 className="pixel break-words text-2xl font-bold uppercase leading-7">{member.display_name}</h2>
          <p className="text-sm text-muted">{isMe ? "Seu histórico" : "Histórico"}</p>
        </div>
      </div>

      {milestone && <MilestonePlaque milestone={milestone} viewerId={me.user_id} personId={userId} />}

      <dl className="mb-4 grid grid-cols-2 gap-2">
        <div className="card !border-done/40 !bg-done-bg">
          <dt className="text-sm text-done">Sequência atual</dt>
          <dd className="pixel tabular text-[40px] font-bold leading-[44px] text-done" data-testid="streak">
            {streak}
          </dd>
          <dd className="text-sm text-fg">{streak === 1 ? "dia seguido" : "dias seguidos"}, folgas não interrompem</dd>
        </div>
        <div className="card">
          <dt className="text-sm text-muted">Falhas em {monthLower}</dt>
          <dd className="pixel tabular text-[32px] font-bold leading-[44px]" data-testid="missed-month">
            {count("missed")}
          </dd>
          <dd className="text-sm text-muted">{count("missed") === 1 ? "dia descumprido" : "dias descumpridos"}</dd>
        </div>
      </dl>

      <CollectionShelf counts={counts} isMe={isMe} />

      <MonthNav month={month} current={current} hrefFor={(x) => `/historico/${userId}?m=${x}`} />

      <section aria-label={`Calendário de ${monthLower}`}>
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-semibold text-muted" aria-hidden>
          {WEEK.map((d, i) => (
            <span key={i} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: weekdayOf(first) }, (_, i) => (
            <li key={`pad-${i}`} aria-hidden />
          ))}
          {days.map((d, i) => (
            <Cell key={d} day={d} status={statuses[i]} today={d === today} offButDone={statuses[i] === "off" && input.completedDays.has(d)} />
          ))}
        </ol>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            <Check size={16} aria-hidden className="text-done" /> Cumprido: {count("done")}
          </li>
          <li className="flex items-center gap-2">
            <X size={16} aria-hidden className="text-fail" /> Falhou: {count("missed")}
          </li>
          <li className="flex items-center gap-2">
            <Pause size={16} aria-hidden className="text-off" /> Folga: {count("off")}
          </li>
          <li className="flex items-center gap-2">
            <Circle size={16} aria-hidden className="text-pending" /> Hoje, pendente
          </li>
        </ul>
      </section>
    </>
  );
}

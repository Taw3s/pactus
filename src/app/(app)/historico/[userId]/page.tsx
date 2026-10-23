import { Check, Circle, Pause, Settings, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthNav, monthName } from "@/components/MonthNav";
import { PageHeader } from "@/components/PageHeader";
import { PersonPicker } from "@/components/PersonPicker";
import { eachDay, lastDayOfMonth, monthKey, spToday, weekdayOf } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember } from "@/lib/data";
import { currentStreak, dayStatus, type DayStatus } from "@/lib/ledger";

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
      className={`relative flex h-12 flex-col items-center justify-center rounded-lg text-sm font-semibold ${style[status]} ${today ? "ring-2 ring-accent ring-inset" : ""}`}
    >
      <span className="tabular leading-4">{n}</span>
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

  const { inputs } = await getLedgerInputs(supabase, [member]);
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

  return (
    <>
      <PageHeader
        title={isMe ? "Perfil" : member.display_name}
        subtitle={isMe ? member.display_name : "Histórico"}
        right={
          <Link href="/config" className="btn-secondary min-h-11 px-3 text-sm">
            <Settings size={18} aria-hidden />
            Configurações
          </Link>
        }
      />
      <PersonPicker people={members.map((x) => ({ id: x.user_id, name: x.display_name }))} selected={userId} month={month} />

      <dl className="mb-4 grid grid-cols-2 gap-2">
        <div className="card">
          <dt className="text-sm text-muted">Sequência atual</dt>
          <dd className="tabular text-[32px] font-bold leading-9" data-testid="streak">
            {streak}
          </dd>
          <dd className="text-sm text-muted">{streak === 1 ? "dia seguido" : "dias seguidos"}, folgas não interrompem</dd>
        </div>
        <div className="card">
          <dt className="text-sm text-muted">Falhas em {monthLower}</dt>
          <dd className="tabular text-[32px] font-bold leading-9" data-testid="missed-month">
            {count("missed")}
          </dd>
          <dd className="text-sm text-muted">{count("missed") === 1 ? "dia descumprido" : "dias descumpridos"}</dd>
        </div>
      </dl>

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

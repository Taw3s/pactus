import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { eachDay, lastDayOfMonth, monthKey, spToday, weekdayOf } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember } from "@/lib/data";
import { currentStreak, dayStatus, missedDays, type DayStatus } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const STYLE: Record<DayStatus, string> = {
  done: "bg-emerald-500 text-zinc-950 font-semibold",
  missed: "bg-red-500/80 text-white",
  off: "bg-zinc-700 text-zinc-300",
  pending: "border border-emerald-500 text-emerald-300",
  before: "text-zinc-700",
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const [{ userId }, { m }] = await Promise.all([params, searchParams]);
  const { supabase } = await requireMember();
  const today = spToday();
  const members = await getMembers(supabase);
  const member = members.find((x) => x.user_id === userId);
  if (!member) notFound();

  const { inputs } = await getLedgerInputs(supabase, [member]);
  const input = inputs.get(userId)!;
  const month = m && /^\d{4}-\d{2}$/.test(m) ? m : monthKey(today);
  const first = `${month}-01`;
  const days = eachDay(first, lastDayOfMonth(first));
  const statuses = days.map((d) => dayStatus(input, d, today));
  const count = (s: DayStatus) => statuses.filter((x) => x === s).length;

  return (
    <>
      <PageHeader title="Histórico" />
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {members.map((x) => (
          <Link
            key={x.user_id}
            href={`/historico/${x.user_id}?m=${month}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${x.user_id === userId ? "bg-emerald-500 text-zinc-950" : "bg-zinc-900 text-zinc-300"}`}
          >
            {x.display_name}
          </Link>
        ))}
      </nav>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-black" data-testid="streak">{currentStreak(input, today)}</p>
          <p className="text-xs text-zinc-400">🔥 sequência atual</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-black">{missedDays(input, today).length}</p>
          <p className="text-xs text-zinc-400">dias descumpridos (total)</p>
        </div>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <Link href={`?m=${shiftMonth(month, -1)}`} className="px-2 text-zinc-400" aria-label="Mês anterior">‹</Link>
          <h2 className="font-semibold">{MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</h2>
          <Link href={`?m=${shiftMonth(month, 1)}`} className="px-2 text-zinc-400" aria-label="Próximo mês">›</Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-zinc-500">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: weekdayOf(first) }, (_, i) => <span key={`pad-${i}`} />)}
          {days.map((d, i) => (
            <span
              key={d}
              data-day={d}
              data-status={statuses[i]}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm ${STYLE[statuses[i]]}`}
            >
              {Number(d.slice(8))}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />cumprido {count("done")}</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-500/80" />falhou {count("missed")}</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-zinc-700" />folga {count("off")}</span>
        </div>
      </section>
    </>
  );
}

import { CircleCheck } from "lucide-react";
import { DebtorRow, type DebtDay } from "@/components/DebtorRow";
import { PageHeader } from "@/components/PageHeader";
import { Sprite } from "@/components/Sprite";
import { formatDayPt, lastDayOfMonth, spToday } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember, signUrls } from "@/lib/data";
import { debtLines, debtSummary, type DebtLine } from "@/lib/ledger";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";

function groupByDay(lines: DebtLine[], nameOf: Map<string, string>): DebtDay[] {
  const days = new Map<string, DebtDay>();
  for (const l of lines) {
    const d = days.get(l.day) ?? { day: l.day, label: formatDayPt(l.day), overdue: false, items: [] };
    d.overdue ||= l.overdue;
    d.items.push({ item: l.item, receivedBy: l.payment ? (nameOf.get(l.payment.received_by) ?? "alguém") : null });
    days.set(l.day, d);
  }
  return [...days.values()];
}

export default async function DebtsPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();
  const members = await getMembers(supabase);
  const [{ inputs, paymentsBy }, urls] = await Promise.all([
    getLedgerInputs(supabase, members),
    signUrls(supabase, members.map((m) => m.avatar_path)),
  ]);
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = members
    .map((m) => {
      const lines = debtLines(inputs.get(m.user_id)!, paymentsBy.get(m.user_id) ?? [], today);
      // Open items first; paid ones stay visible as history inside the expansion.
      const days = groupByDay([...lines.filter((l) => !l.payment), ...lines.filter((l) => l.payment)], nameOf);
      return { m, days, sum: debtSummary(lines) };
    })
    .sort((a, b) => b.sum.cokes + b.sum.snacks - (a.sum.cokes + a.sum.snacks));

  const mine = rows.find((r) => r.m.user_id === me.user_id)!.sum;
  const owesSomething = mine.cokes + mine.snacks > 0;
  const [, month, day] = lastDayOfMonth(today).split("-");

  return (
    <div data-wide>
      <PageHeader title="Dívidas" subtitle={`Cada dia descumprido vale 1 Coca + 1 salgado ao grupo. Prazo deste mês: ${day}/${month}.`} />

      <section className="card mb-6" aria-label="Seu saldo" data-testid="my-balance">
        {owesSomething ? (
          <>
            <p className="pixel text-base uppercase text-muted">Seu saldo</p>
            <div aria-hidden className="mt-2 flex items-end justify-center gap-6">
              <span className="flex items-end">
                <Sprite name="sodaCan" scale={2} />
                <span className="pixel tabular -ml-2 text-[32px] font-bold leading-9 text-accent">×{mine.cokes}</span>
              </span>
              <span className="flex items-end">
                <Sprite name="coxinha" scale={2} />
                <span className="pixel tabular -ml-2 text-[32px] font-bold leading-9 text-accent">×{mine.snacks}</span>
              </span>
            </div>
            <div aria-hidden className="mb-3 h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[3px_3px_0_var(--color-hard-shadow)]" />
            <p className="tabular text-xl font-bold leading-7">
              Você deve {plural(mine.cokes, "Coca", "Cocas")} + {plural(mine.snacks, "salgado", "salgados")}
            </p>
            {mine.overdue > 0 && <p className="mt-1 text-sm text-fail">{plural(mine.overdue, "item atrasado", "itens atrasados")} do mês passado.</p>}
            <p className="mt-2 text-sm text-muted">Pague a qualquer pessoa do grupo; quem receber marca aqui.</p>
          </>
        ) : (
          <>
            <p className="pixel flex items-center gap-2 text-[28px] font-bold uppercase leading-[34px] text-done">
              <CircleCheck size={26} aria-hidden /> Você está em dia
            </p>
            <p className="mt-1 text-sm text-muted">A geladeira agradece.</p>
          </>
        )}
      </section>

      <h2 className="pixel mb-3 text-xl uppercase leading-6">Saldo do grupo</h2>
      {/* Desktop: two cards per row, in the same order. */}
      <ul className="grid gap-2 desk:grid-cols-2 desk:items-start desk:gap-6">
        {rows.map(({ m, days, sum }) => (
          <DebtorRow
            key={m.user_id}
            debtorId={m.user_id}
            name={m.display_name}
            avatarUrl={m.avatar_path ? (urls.get(m.avatar_path) ?? null) : null}
            isMe={m.user_id === me.user_id}
            cokes={sum.cokes}
            snacks={sum.snacks}
            overdue={sum.overdue}
            days={days}
          />
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">O dia de hoje só vira dívida depois das 23:59.</p>
    </div>
  );
}

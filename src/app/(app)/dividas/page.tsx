import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { PayButton } from "@/components/PayButton";
import { formatDayPt, lastDayOfMonth, spToday } from "@/lib/dates";
import { getLedgerInputs, getMembers, requireMember, signUrls } from "@/lib/data";
import { debtLines, debtSummary } from "@/lib/ledger";
import { ITEM_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      return { m, lines, open: lines.filter((l) => !l.payment), paid: lines.filter((l) => l.payment), sum: debtSummary(lines) };
    })
    .sort((a, b) => b.open.length - a.open.length);

  const [, month, day] = lastDayOfMonth(today).split("-");
  const deadline = `${day}/${month}`;

  return (
    <>
      <PageHeader title="Dívidas" subtitle={`Cada dia descumprido = 1 Coca + 1 salgado ao grupo · prazo: ${deadline}`} />
      <div className="space-y-3">
        {rows.map(({ m, open, paid, sum }) => {
          const isMe = m.user_id === me.user_id;
          return (
            <section key={m.user_id} className="card" data-debtor={m.display_name}>
              <div className="flex items-center gap-3">
                <Avatar name={m.display_name} url={m.avatar_path ? urls.get(m.avatar_path) : null} />
                <div className="flex-1">
                  <p className="font-semibold">
                    {m.display_name}
                    {isMe && <span className="text-zinc-500"> (você)</span>}
                  </p>
                  <p className="text-xs text-zinc-400" data-testid="summary">
                    {open.length === 0 ? "Nada a pagar 🎉" : `deve ${sum.cokes} 🥤 Coca · ${sum.snacks} 🥟 salgado`}
                  </p>
                </div>
                {sum.overdue > 0 && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">{sum.overdue} atrasada(s)</span>
                )}
              </div>

              {open.length > 0 && (
                <ul className="mt-3 divide-y divide-zinc-800 border-t border-zinc-800">
                  {open.map((l) => (
                    <li key={`${l.day}-${l.item}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        {l.item === "coke" ? "🥤" : "🥟"} {ITEM_LABEL[l.item]} · {formatDayPt(l.day)}
                        {l.overdue && <span className="ml-1 text-xs font-semibold text-red-400">atrasada</span>}
                      </span>
                      {!isMe && <PayButton debtorId={m.user_id} debtorName={m.display_name} day={l.day} item={l.item} />}
                    </li>
                  ))}
                </ul>
              )}

              {paid.length > 0 && (
                <details className="mt-2 text-xs text-zinc-400">
                  <summary className="cursor-pointer">{paid.length} item(ns) pago(s)</summary>
                  <ul className="mt-1 space-y-0.5">
                    {paid.map((l) => (
                      <li key={`${l.day}-${l.item}`}>
                        {ITEM_LABEL[l.item]} de {formatDayPt(l.day)} → recebido por {nameOf.get(l.payment!.received_by)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Quem recebe marca como pago. O dia de hoje só vira dívida depois das 23:59.
      </p>
    </>
  );
}

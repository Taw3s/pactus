"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PayButton } from "@/components/PayButton";
import { Sprite } from "@/components/Sprite";
import { Badge } from "@/components/ui/Badge";
import type { DebtItem } from "@/lib/ledger";
import { plural } from "@/lib/text";

export interface DebtDay {
  day: string;
  label: string; // "Seg 19/10"
  overdue: boolean;
  items: { item: DebtItem; receivedBy: string | null }[];
}

interface Props {
  debtorId: string;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  cokes: number;
  snacks: number;
  overdue: number;
  days: DebtDay[];
}

const SPRITE = { coke: "sodaCan", snack: "coxinha" } as const;
const NAME = { coke: "Coca", snack: "Salgado" };

/**
 * One card per person: the open Cocas and salgados on a small wooden shelf (counted apart, they
 * can differ after partial payments); expanding reveals each day and item, each with its own "Recebi".
 */
export function DebtorRow({ debtorId, name, avatarUrl, isMe, cokes, snacks, overdue, days }: Props) {
  // Client state survives router.refresh(), so confirming a payment keeps the row open and in place.
  const [open, setOpen] = useState(false);
  const owes = cokes + snacks > 0;
  const panelId = `debts-${debtorId}`;

  return (
    <li className={`card !p-0 ${isMe ? "!border-accent" : ""}`} data-debtor={name}>
      <button
        className="flex min-h-16 w-full items-center gap-3 p-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        disabled={days.length === 0}
      >
        <Avatar name={name} url={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold">
            {name}
            {isMe && <span className="ml-1.5 rounded-sm bg-accent px-1 text-xs font-bold uppercase text-on-accent">Você</span>}
          </span>
          <span className="tabular block text-sm text-muted" data-testid="summary">
            {owes ? `${plural(cokes, "Coca", "Cocas")} · ${plural(snacks, "salgado", "salgados")}` : "Em dia"}
          </span>
        </span>
        {days.length > 0 && <ChevronDown size={20} aria-hidden className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />}
      </button>
      {owes && (
        <div className="px-3 pb-3">
          <div aria-hidden className="flex items-end gap-4 px-2">
            {(["coke", "snack"] as const).map((item) => (
              <span key={item} className="flex items-end">
                <Sprite name={SPRITE[item]} />
                <span className="pixel tabular -ml-1 text-2xl font-bold leading-7 text-accent">×{item === "coke" ? cokes : snacks}</span>
              </span>
            ))}
          </div>
          <div aria-hidden className="h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[3px_3px_0_var(--color-hard-shadow)]" />
          {/* The ledger counts open items (a day = 1 Coca + 1 salgado) from previous months. */}
          {overdue > 0 && (
            <p className="mt-2">
              <Badge tone="fail">{plural(overdue, "item atrasado", "itens atrasados")}</Badge>
            </p>
          )}
        </div>
      )}

      {open && (
        <div id={panelId} className="border-t border-divider px-3 pb-2">
          {days.map((d) => (
            <div key={d.day} className="border-b border-divider py-3 last:border-b-0">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {d.label}
                {d.overdue && <Badge tone="fail">Atrasada</Badge>}
              </p>
              <ul>
                {d.items.map(({ item, receivedBy }) => {
                  return (
                    <li key={item} className="flex min-h-12 items-center gap-3">
                      <Sprite name={SPRITE[item]} />
                      <span className="flex-1">{NAME[item]}</span>
                      {receivedBy ? (
                        <span className="text-sm text-done">Recebido por {receivedBy}</span>
                      ) : isMe ? (
                        <span className="text-sm text-muted">Em aberto</span>
                      ) : (
                        <PayButton debtorId={debtorId} debtorName={name} day={d.day} item={item} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

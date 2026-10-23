"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDayPt } from "@/lib/dates";
import type { DebtItem } from "@/lib/ledger";
import { ITEM_LABEL } from "@/lib/types";

/** The receiver marks a single item of a missed day as paid. */
export function PayButton({ debtorId, debtorName, day, item }: { debtorId: string; debtorName: string; day: string; item: DebtItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!confirm(`Confirmar que você recebeu ${ITEM_LABEL[item]} de ${debtorName} (${formatDayPt(day)})?`)) return;
    setBusy(true);
    const { error } = await createClient().from("payments").insert({ debtor_id: debtorId, day, item });
    setBusy(false);
    if (error) alert("Não foi possível marcar como pago.");
    router.refresh();
  }

  return (
    <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs" disabled={busy} onClick={pay}>
      Recebi
    </button>
  );
}

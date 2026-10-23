"use client";

import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DebtItem } from "@/lib/ledger";

const ONE: Record<DebtItem, string> = { coke: "1 Coca", snack: "1 salgado" };

/** The receiver marks a single item of a missed day as paid. */
export function PayButton({ debtorId, debtorName, day, item }: { debtorId: string; debtorName: string; day: string; item: DebtItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [, m, d] = day.split("-");

  async function pay() {
    if (!confirm(`Confirmar recebimento de ${ONE[item]} de ${debtorName}, referente a ${d}/${m}?`)) return;
    setBusy(true);
    setError(false);
    const { error } = await createClient().from("payments").insert({ debtor_id: debtorId, day, item });
    setBusy(false);
    if (error) setError(true);
    else router.refresh();
  }

  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-sm text-fail">
          Falhou
        </span>
      )}
      <button className="btn-secondary min-h-11 shrink-0 px-4 text-sm" disabled={busy} onClick={pay} aria-label={`Recebi ${ONE[item]} de ${debtorName}, ${d}/${m}`}>
        {busy && <Loader size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />}
        Recebi
      </button>
    </span>
  );
}

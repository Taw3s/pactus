"use client";

import { Copy, Link2, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDayPt } from "@/lib/dates";
import { menuPhrase, type DebtItem } from "@/lib/debt-items";
import { inviteUrl } from "@/lib/invite";
import { createClient } from "@/lib/supabase/client";
import { MenuPicker } from "./MenuPicker";

interface Props {
  groupName: string;
  inviteCode: string;
  isOwner: boolean;
  menuToday: DebtItem[];
  /** A change already scheduled for a coming Monday. */
  menuNext: { from: string; items: DebtItem[] } | null;
}

/**
 * The challenge: its invite code (anyone in it can invite) and the debt menu. Only the owner
 * changes the menu, and the change applies from the next Monday, so nobody is caught off guard.
 */
export function GroupSettings({ groupName, inviteCode, isOwner, menuToday, menuNext }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState<DebtItem[]>(menuNext?.items ?? menuToday);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<"" | "code" | "link" | "failed">("");
  const pending = menuNext?.items ?? menuToday;
  const changed = menu.join() !== pending.join();

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? inviteCode : inviteUrl(window.location.origin, inviteCode));
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("failed");
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    const { data, error } = await createClient().rpc("set_debt_menu", { p_items: menu });
    setBusy(false);
    setMsg(error ? "Não foi possível salvar o cardápio." : `Salvo. Vale a partir de ${formatDayPt(String(data))}.`);
    router.refresh();
  }

  return (
    <section className="card mb-4 space-y-4" aria-labelledby="desafio" data-testid="group-settings">
      <div>
        <h2 id="desafio" className="pixel text-xl uppercase leading-6">
          {groupName}
        </h2>
        <p className="text-sm text-muted">Convide amigos com este código:</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="pixel tabular flex-1 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-2xl tracking-widest" data-testid="invite-code">
            {inviteCode}
          </code>
          <button type="button" className="btn-secondary min-h-12 min-w-12 !px-3" onClick={() => copy("code")} aria-label="Copiar código de convite">
            <Copy size={18} aria-hidden />
          </button>
        </div>
        <button type="button" className="btn-secondary mt-2 min-h-12 w-full !text-base sm:w-auto" onClick={() => copy("link")}>
          <Link2 size={18} aria-hidden /> Copiar link do convite
        </button>
        <p className="mt-1 text-xs text-muted" role="status">
          {copied === "code"
            ? "Código copiado."
            : copied === "link"
              ? "Link copiado. Agora envie para seus amigos."
              : copied === "failed"
                ? "Não foi possível copiar. Copie o código manualmente."
                : "Quem entrar com ele começa a dever a partir do dia seguinte."}
        </p>
      </div>

      <div>
        <h3 className="pixel text-base uppercase text-muted">Cardápio da dívida</h3>
        <p className="text-sm">
          Hoje, cada dia descumprido vale <b data-testid="settings-menu-today">{menuPhrase(menuToday)}</b>.
        </p>
        {menuNext && (
          <p className="text-sm text-muted" data-testid="settings-menu-next">
            A partir de {formatDayPt(menuNext.from)}: {menuPhrase(menuNext.items)}.
          </p>
        )}
        {isOwner ? (
          <div className="mt-3 space-y-2">
            <MenuPicker value={menu} onChange={setMenu} disabled={busy} />
            <button type="button" className="btn-primary w-full" disabled={busy || !changed} onClick={save}>
              {busy && <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />}
              Salvar cardápio
            </button>
            <p className="text-xs text-muted">A troca vale a partir da segunda seguinte; dias que já passaram continuam com os itens de antes.</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted">Só quem criou o desafio troca o cardápio.</p>
        )}
        {msg && (
          <p className="mt-2 text-sm" role="status">
            {msg}
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { Loader, LogOut, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  isOwner: boolean;
  /** The other members, oldest first (the first one inherits the group if the owner leaves). */
  others: { id: string; name: string }[];
}

/**
 * Leaving the group, removing a member (owner only) and deleting the account. Each asks first and
 * says what happens to the group's history: it stays (payments, accusations and votes keep counting).
 */
export function MembershipSettings({ isOwner, others }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function call(key: string, url: string, init: RequestInit) {
    setBusy(key);
    setMsg("");
    const res = await fetch(url, init).catch(() => null);
    setBusy("");
    if (!res?.ok) {
      setMsg("Não deu certo. Tente de novo.");
      return null;
    }
    return (await res.json()) as { status: string };
  }

  async function remove(m: { id: string; name: string }) {
    if (!confirm(`Remover ${m.name} do grupo? As provas e as dívidas de ${m.name} saem; os pagamentos que recebeu e os votos continuam valendo.`)) return;
    const r = await call(`remove:${m.id}`, "/api/membership", { method: "POST", body: JSON.stringify({ action: "remove", userId: m.id }) });
    if (r) {
      setMsg(`${m.name} saiu do grupo.`);
      router.refresh();
    }
  }

  async function leave() {
    const heir = others[0]?.name;
    const what = !heir
      ? "Você é a última pessoa do grupo: ele será apagado."
      : isOwner
        ? `O grupo passa para ${heir}.`
        : "Suas provas e dívidas saem do grupo; os pagamentos que você recebeu e seus votos continuam valendo.";
    if (!confirm(`Sair do grupo? ${what}`)) return;
    const r = await call("leave", "/api/membership", { method: "POST", body: JSON.stringify({ action: "leave" }) });
    if (r) router.replace("/join?step=code");
  }

  async function deleteAccount() {
    const typed = prompt("Excluir a conta apaga seu acesso, suas provas e suas fotos, sem volta. Para confirmar, digite EXCLUIR.");
    if (typed?.trim().toUpperCase() !== "EXCLUIR") return;
    const r = await call("delete", "/api/account", { method: "DELETE" });
    if (r) router.replace("/login");
  }

  const spin = <Loader size={16} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />;
  return (
    <section className="card mb-4 space-y-4" aria-labelledby="membros" data-testid="membership">
      {isOwner && others.length > 0 && (
        <div>
          <h2 id="membros" className="pixel text-xl uppercase leading-6">
            Membros
          </h2>
          <p className="text-sm text-muted">Só quem criou o desafio remove alguém.</p>
          <ul className="mt-2 divide-y divide-divider">
            {others.map((m) => (
              <li key={m.id} className="flex min-h-12 items-center gap-3 py-1" data-member-row={m.name}>
                <span className="min-w-0 flex-1 break-words">{m.name}</span>
                <button type="button" className="btn-secondary min-h-11 shrink-0 !px-3 text-sm" disabled={!!busy} onClick={() => remove(m)} aria-label={`Remover ${m.name}`}>
                  {busy === `remove:${m.id}` ? spin : <UserMinus size={16} aria-hidden />}
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h2 id={isOwner && others.length > 0 ? undefined : "membros"} className="pixel text-base uppercase text-muted">
          Sair
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary min-h-11 text-sm" disabled={!!busy} onClick={leave}>
            {busy === "leave" ? spin : <LogOut size={16} aria-hidden />}
            Sair do grupo
          </button>
          <button type="button" className="btn-secondary min-h-11 text-sm !text-fail" disabled={!!busy} onClick={deleteAccount}>
            {busy === "delete" ? spin : <Trash2 size={16} aria-hidden />}
            Excluir minha conta
          </button>
        </div>
      </div>
      <p className="text-sm text-muted" role="status">
        {msg}
      </p>
    </section>
  );
}

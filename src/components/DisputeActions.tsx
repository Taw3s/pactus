"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  "dispute window closed": "Só dá para contestar check-ins de hoje ou de ontem.",
  "dispute closed": "A votação já foi encerrada.",
  "already replied": "Você já respondeu.",
};

function message(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Isso já foi registrado.";
  return Object.entries(ERRORS).find(([k]) => error.message.includes(k))?.[1] ?? "Não foi possível salvar.";
}

interface Props {
  checkinId?: string;
  disputeId?: string;
  canDispute?: boolean;
  canReply?: boolean;
  canVote?: boolean;
}

export function DisputeActions({ checkinId, disputeId, canDispute, canReply, canVote }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setBusy(true);
    setError("");
    const { error } = await action();
    setBusy(false);
    if (error) return setError(message(error));
    setText("");
    router.refresh();
  }

  const supabase = createClient();

  if (canDispute) {
    return (
      <section className="card mt-3 space-y-2">
        <h2 className="font-semibold">Contestar este check-in</h2>
        <p className="text-xs text-zinc-400">O grupo vota. Se a maioria concordar, o check-in é anulado e o dia conta como descumprido.</p>
        <textarea className="input min-h-20" maxLength={280} placeholder="Motivo (ex.: a foto é de ontem)" value={text} onChange={(e) => setText(e.target.value)} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          className="btn-ghost w-full border-amber-500/50 text-amber-200"
          disabled={busy || text.trim().length < 5}
          onClick={() => run(() => supabase.from("disputes").insert({ checkin_id: checkinId, reason: text.trim() }))}
        >
          ⚖️ Levar ao tribunal
        </button>
      </section>
    );
  }

  return (
    <>
      {canReply && (
        <div className="space-y-2">
          <textarea className="input min-h-20" maxLength={280} placeholder="Sua resposta (uma vez só)" value={text} onChange={(e) => setText(e.target.value)} />
          <button
            className="btn-ghost w-full"
            disabled={busy || text.trim().length === 0}
            onClick={() => run(() => supabase.from("disputes").update({ reply: text.trim() }).eq("id", disputeId!))}
          >
            Responder
          </button>
        </div>
      )}
      {canVote && (
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn bg-red-500/90 text-white"
            disabled={busy}
            onClick={() => run(() => supabase.from("dispute_votes").insert({ dispute_id: disputeId, upheld: true }))}
          >
            Procede
          </button>
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => run(() => supabase.from("dispute_votes").insert({ dispute_id: disputeId, upheld: false }))}
          >
            Não procede
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </>
  );
}

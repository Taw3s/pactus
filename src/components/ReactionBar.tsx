"use client";

import { Award, Crown, Flame } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const REACTIONS = [
  { kind: "respeito", label: "Respeito", Icon: Award },
  { kind: "monstro", label: "Monstro", Icon: Flame },
  { kind: "lenda", label: "Lenda", Icon: Crown },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["kind"];

interface Props {
  checkinId: string;
  /** Who stamped what (names, for the group to see). */
  initial: { kind: ReactionKind; name: string; mine: boolean }[];
  /** false on your own proof: you see the stamps but cannot stamp yourself. */
  canReact: boolean;
}

/** Friends' stamps on a proof. Positive only: suspicion goes to the tribunal. */
export function ReactionBar({ checkinId, initial, canReact }: Props) {
  const [mine, setMine] = useState(() => new Set(initial.filter((r) => r.mine).map((r) => r.kind)));
  const [busy, setBusy] = useState<ReactionKind | null>(null);
  const others = (kind: ReactionKind) => initial.filter((r) => r.kind === kind && !r.mine).map((r) => r.name);

  async function toggle(kind: ReactionKind) {
    if (!canReact || busy) return;
    const on = !mine.has(kind);
    setBusy(kind);
    // Optimistic: flip now, undo if the server says no.
    setMine((m) => new Set(on ? [...m, kind] : [...m].filter((k) => k !== kind)));
    const table = createClient().from("checkin_reactions");
    const { error } = on
      ? await table.insert({ checkin_id: checkinId, kind })
      : // RLS only lets anyone delete their own stamps.
        await table.delete().eq("checkin_id", checkinId).eq("kind", kind);
    if (error && !(on && error.code === "23505")) setMine((m) => new Set(on ? [...m].filter((k) => k !== kind) : [...m, kind]));
    setBusy(null);
  }

  return (
    <section aria-label="Reações" className="mb-4" data-testid="reactions">
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ kind, label, Icon }) => {
          const names = [...others(kind), ...(mine.has(kind) ? ["você"] : [])];
          const pressed = mine.has(kind);
          return (
            <button
              key={kind}
              type="button"
              disabled={!canReact || busy === kind}
              aria-pressed={canReact ? pressed : undefined}
              aria-label={`${label}: ${names.length ? names.join(", ") : "ninguém ainda"}`}
              onClick={() => toggle(kind)}
              data-reaction={kind}
              className={`pixel inline-flex min-h-11 items-center gap-1.5 rounded-sm border-2 px-3 text-base uppercase shadow-[2px_2px_0_var(--color-hard-shadow)] ${
                pressed ? "border-accent bg-raised text-accent" : "border-bevel-dark bg-bg text-fg"
              } disabled:cursor-default`}
            >
              <Icon size={16} aria-hidden />
              {label}
              {names.length > 0 && <span className="tabular">{names.length}</span>}
            </button>
          );
        })}
      </div>
      {initial.length + (mine.size - initial.filter((r) => r.mine).length) > 0 && (
        <p className="mt-2 text-xs text-muted">
          {REACTIONS.map(({ kind, label }) => {
            const names = [...others(kind), ...(mine.has(kind) ? ["você"] : [])];
            return names.length ? `${label}: ${names.join(", ")}` : null;
          })
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {!canReact && <p className="mt-1 text-xs text-muted">Os amigos carimbam a sua prova; você vê quem carimbou.</p>}
    </section>
  );
}

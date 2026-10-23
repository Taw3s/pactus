"use client";

import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { msUntilEndOfDay } from "@/lib/dates";
import { GOAL_SPRITE } from "@/lib/goal-icons";
import { GOALS, type DailyGoal } from "@/lib/types";
import { Sprite } from "./Sprite";
import { VerifiedSeal } from "./VerifiedSeal";

export type GoalState = "done" | "pending" | "annulled";

interface Props {
  isOff: boolean;
  states: Record<DailyGoal, GoalState>;
  /** Today's date when the AI judge confirmed all 3 proofs (shows the "Verificado!" seal). */
  verifiedDay?: string | null;
}

function remaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

function missingPhrase(missing: string[]) {
  const names = missing.map((m) => m.toLowerCase());
  if (names.length === 3) return "Faltam as 3 metas";
  if (names.length === 2) return `Faltam ${names[0]} e ${names[1]}`;
  return `Falta ${names[0]}`;
}

const WORD: Record<GoalState, string> = { done: "Feita", pending: "Pendente", annulled: "Anulada" };

/** The shelf: one low-poly prop per goal, lit when the goal is done. */
function Shelf({ states }: { states: Record<DailyGoal, GoalState> }) {
  return (
    <div>
      <ul className="grid grid-cols-3 gap-1.5" aria-label="Metas do dia">
        {GOALS.map((g) => {
          const s = states[g.id];
          return (
            <li key={g.id} className="flex flex-col items-center" data-shelf={g.id} data-shelf-state={s}>
              <div className="relative">
                <Sprite name={GOAL_SPRITE[g.id]} scale={2} dim={s !== "done"} />
                {s !== "pending" && (
                  <span
                    aria-hidden
                    className={`absolute right-0 top-7 flex h-6 w-6 items-center justify-center rounded-sm border-2 ${
                      s === "done" ? "border-done bg-done-bg text-done" : "border-fail bg-fail-bg text-fail"
                    }`}
                  >
                    {s === "done" ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {/* wooden shelf plank */}
      <div aria-hidden className="h-2.5 rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[3px_3px_0_var(--color-hard-shadow)]" />
      <ul className="mt-2 grid grid-cols-3 gap-1.5 text-center" aria-hidden>
        {GOALS.map((g) => (
          <li key={g.id}>
            <p className="pixel text-sm uppercase leading-4">{g.label}</p>
            <p className={`text-xs ${states[g.id] === "done" ? "text-done" : states[g.id] === "annulled" ? "text-fail" : "text-muted"}`}>
              {WORD[states[g.id]]}
            </p>
          </li>
        ))}
      </ul>
      {/* the same information for screen readers, in one sentence */}
      <p className="sr-only">{GOALS.map((g) => `${g.label}: ${WORD[states[g.id]]}`).join(". ")}.</p>
    </div>
  );
}

/** Answers "how much is left?" in one glance: count, next pending goal, deadline. */
export function Scoreboard({ isOff, states, verifiedDay }: Props) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilEndOfDay());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const done = GOALS.filter((g) => states[g.id] === "done").length;
  const missing = GOALS.filter((g) => states[g.id] !== "done").map((g) => g.label);
  const complete = done === 3;

  if (isOff) {
    return (
      <section className="card mb-6" data-testid="scoreboard" data-scoreboard="off">
        {verifiedDay && <VerifiedSeal day={verifiedDay} />}
        <div className="flex items-center gap-3">
          <Sprite name="beachChair" scale={2} />
          <div>
            <p className="pixel text-[28px] uppercase leading-8 text-off">Folga</p>
            <p className="mt-1 font-semibold">Hoje é sua folga</p>
            <p className="mt-1 text-sm text-muted">Nada é obrigatório. Se quiser fazer as metas, elas continuam pontuando.</p>
          </div>
        </div>
      </section>
    );
  }

  const pendingDuty = !complete;
  const urgent = pendingDuty && ms !== null && ms <= 15 * 60_000;
  const soon = pendingDuty && ms !== null && ms <= 60 * 60_000;

  return (
    <section className="card mb-6" data-testid="scoreboard" data-scoreboard={complete ? "complete" : "pending"}>
      {verifiedDay && <VerifiedSeal day={verifiedDay} />}
      <div className="flex items-center gap-4">
        <p className={`pixel tabular text-[56px] font-bold leading-[56px] ${complete ? "text-done" : "text-accent"}`} data-testid="progress">
          {done}/3
        </p>
        <div className="min-w-0">
          <p className="pixel text-sm uppercase text-muted">{complete ? "Dia cumprido" : "Metas cumpridas"}</p>
          <p className="text-lg font-semibold leading-6">{complete ? "Missão do dia completa" : missingPhrase(missing)}</p>
        </div>
      </div>

      <Shelf states={states} />

      {ms !== null &&
        (complete ? (
          <p className="mt-4 text-sm text-muted">Prazo de hoje: 23:59 (horário de São Paulo).</p>
        ) : (
          <div className={`mt-4 border-t-2 border-divider pt-3 ${urgent ? "text-fail" : soon ? "text-warn" : "text-fg"}`}>
            <p className="pixel tabular flex items-center gap-2 text-xl uppercase" data-testid="deadline">
              {urgent ? <AlertTriangle size={20} aria-hidden /> : <Clock size={20} aria-hidden />}
              {urgent ? "Últimos minutos · " : ""}Encerra em {remaining(ms)}
            </p>
            <p className="mt-0.5 text-sm text-muted">Até 23:59, horário de São Paulo.</p>
          </div>
        ))}
    </section>
  );
}

"use client";

import { AlertTriangle, Circle, CircleCheck, CircleX, Clock, Pause } from "lucide-react";
import { useEffect, useState } from "react";
import { msUntilEndOfDay } from "@/lib/dates";
import { GOALS, type DailyGoal } from "@/lib/types";

export type GoalState = "done" | "pending" | "annulled";

interface Props {
  isOff: boolean;
  states: Record<DailyGoal, GoalState>;
}

function remaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}

function missingPhrase(missing: string[]) {
  const names = missing.map((m) => m.toLowerCase());
  if (names.length === 3) return "Faltam as 3 metas";
  if (names.length === 2) return `Faltam ${names[0]} e ${names[1]}`;
  return `Falta ${names[0]}`;
}

/** Answers "how much is left?" in one glance: count, next pending goal, deadline. */
export function Scoreboard({ isOff, states }: Props) {
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
        <p className="flex items-center gap-2 text-off">
          <Pause size={22} aria-hidden />
          <span className="text-[28px] font-bold leading-[34px] text-fg">Hoje é sua folga</span>
        </p>
        <p className="mt-2 text-sm text-muted">Nada é obrigatório hoje. Se quiser fazer as metas, elas continuam pontuando.</p>
      </section>
    );
  }

  const pendingDuty = !complete;
  const urgent = pendingDuty && ms !== null && ms <= 15 * 60_000;
  const soon = pendingDuty && ms !== null && ms <= 60 * 60_000;

  return (
    <section className="card mb-6" data-testid="scoreboard" data-scoreboard={complete ? "complete" : "pending"}>
      <div className="flex items-end gap-3">
        <p className="tabular text-5xl font-extrabold leading-[52px]" data-testid="progress">
          {done}/3
        </p>
        <p className={`pb-1.5 text-base font-semibold ${complete ? "text-done" : "text-muted"}`}>
          {complete ? (
            <span className="inline-flex items-center gap-1">
              <CircleCheck size={18} aria-hidden /> Dia cumprido
            </span>
          ) : (
            "metas cumpridas"
          )}
        </p>
      </div>
      {!complete && <p className="mt-1 text-lg font-semibold">{missingPhrase(missing)}</p>}

      <ul className="mt-4 grid grid-cols-3 gap-2" aria-label="Metas do dia">
        {GOALS.map((g) => {
          const s = states[g.id];
          const Icon = s === "done" ? CircleCheck : s === "annulled" ? CircleX : Circle;
          const tone = s === "done" ? "bg-done-bg text-done" : s === "annulled" ? "bg-fail-bg text-fail" : "bg-pending-bg text-pending";
          const word = s === "done" ? "Cumprida" : s === "annulled" ? "Anulada" : "Pendente";
          return (
            <li key={g.id} className={`flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold ${tone}`}>
              <Icon size={16} aria-hidden className="shrink-0" />
              <span className="truncate">
                {g.label}
                <span className="sr-only">: {word}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {ms !== null &&
        (complete ? (
          <p className="mt-4 text-sm text-muted">Prazo de hoje: 23:59 (horário de São Paulo).</p>
        ) : (
          <div className="mt-4">
            <p
              className={`tabular flex items-center gap-2 text-lg font-semibold ${urgent ? "text-fail" : soon ? "text-warn" : "text-fg"}`}
              data-testid="deadline"
            >
              {urgent ? <AlertTriangle size={20} aria-hidden /> : <Clock size={20} aria-hidden />}
              {urgent ? "Últimos minutos: " : ""}Encerra em {remaining(ms)}
            </p>
            <p className="mt-0.5 text-sm text-muted">Até 23:59, horário de São Paulo.</p>
          </div>
        ))}
    </section>
  );
}

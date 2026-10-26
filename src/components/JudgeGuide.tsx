"use client";

import { ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import { GUIDE } from "@/lib/guide";
import { JudgeBubble } from "./Judge";
import { JudgeAnim } from "./JudgeAnim";

/**
 * "Pergunte ao juiz": a side button that opens the judge with fixed questions and answers about
 * the rules. No AI call: the answers are written from the code, so they are always right.
 */
export function JudgeGuide() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const entry = GUIDE.find((g) => g.id === open);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(null);
          dialog.current?.showModal();
        }}
        aria-haspopup="dialog"
        data-testid="judge-guide"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-3 z-30 flex min-h-12 items-center gap-1.5 rounded-sm border-2 border-bevel-dark bg-raised px-3 text-sm font-semibold shadow-[3px_3px_0_var(--color-hard-shadow)] desk:bottom-6 desk:right-6"
      >
        <HelpCircle size={18} aria-hidden className="text-accent" />
        Juiz
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="guide-title"
        className="m-auto max-h-[min(640px,100dvh)] w-[min(440px,calc(100vw-1.5rem))] rounded-sm border-2 border-bevel-dark bg-surface p-0 text-fg shadow-[4px_4px_0_var(--color-hard-shadow)] backdrop:bg-black/70"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="flex items-center justify-between gap-2 border-b-2 border-divider px-4 py-3">
          <h2 id="guide-title" className="pixel text-xl uppercase leading-6">
            Pergunte ao juiz
          </h2>
          <button type="button" autoFocus className="btn-secondary min-h-11 min-w-11 !px-2" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="flex items-end gap-2">
            <JudgeAnim action={entry ? "stamp" : "idle"} still={!!entry} />
            <JudgeBubble>{entry ? entry.q : "Sou o juiz do Pacto. Sobre o que você quer saber?"}</JudgeBubble>
          </div>
          {entry ? (
            <div className="mt-2" data-testid="guide-answer">
              <div className="space-y-2">
                {entry.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setOpen(null)}>
                <ChevronLeft size={18} aria-hidden /> Outras perguntas
              </button>
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {GUIDE.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(g.id)}
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-left font-medium hover:bg-raised"
                  >
                    {g.q}
                    <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Respostas fixas, escritas a partir das regras do app. O juiz não decide nada: quem decide é o grupo.</p>
        </div>
      </dialog>
    </>
  );
}

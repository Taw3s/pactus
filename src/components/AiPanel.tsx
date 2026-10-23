"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/ai-review";
import { AiBadge, type AiState } from "./StatusBadges";

interface Props {
  checkinId: string;
  review: { verdict: Verdict; seen: string; detected: number | null } | null;
  /** Declared study minutes, to explain a timer divergence. */
  declaredMinutes: number | null;
  ownerName: string;
  isOwner: boolean;
  /** Ask for a review when none exists (recent check-ins only). */
  canRequest: boolean;
  /** A tribunal decision exists: the analysis stays, but visually secondary. */
  secondary: boolean;
}

/** "Análise automática": an indication that never replaces the group's decision. */
export function AiPanel({ checkinId, review, declaredMinutes, ownerName, isOwner, canRequest, secondary }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AiState | "off" | null>(review ? review.verdict : canRequest ? "analyzing" : null);

  useEffect(() => {
    if (review || !canRequest) return;
    fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { status?: string };
        if (r.status === 501) setState("off"); // feature not configured: show nothing
        else if (body.status === "reviewed" || body.status === "exists") router.refresh();
        else setState("unavailable");
      })
      .catch(() => setState("unavailable"));
  }, [checkinId, review, canRequest, router]);

  if (!state || state === "off") return null;

  const timerGap =
    review?.verdict === "mismatch" && declaredMinutes && review.detected !== null
      ? `${isOwner ? "Você informou" : `${ownerName} informou`} ${declaredMinutes} min. A IA identificou um cronômetro com ${review.detected} min na imagem.`
      : null;

  return (
    <section
      aria-labelledby="ai-title"
      className={`card ${!secondary && review?.verdict === "mismatch" ? "!bg-warn-bg" : ""}`}
      data-testid="ai-review"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="ai-title" className={`pixel uppercase ${secondary ? "text-sm text-muted" : "text-lg leading-6"}`}>
          Juiz IA
        </h2>
        <AiBadge state={state} />
      </div>
      {review ? (
        <>
          {timerGap && <p className="mt-2 font-medium">{timerGap}</p>}
          <p className={`mt-2 ${secondary ? "text-sm text-muted" : ""}`}>
            <span className="text-muted">O que a IA viu: </span>
            {review.seen}
          </p>
          {review.verdict === "unclear" && <p className="mt-1 text-sm text-muted">A imagem não permitiu uma conclusão.</p>}
        </>
      ) : state === "analyzing" ? (
        <p className="mt-2 text-sm text-muted">Analisando a foto…</p>
      ) : (
        <p className="mt-2 text-sm text-muted">A análise não está disponível agora. A prova continua enviada normalmente.</p>
      )}
      <p className="mt-2 text-sm text-muted">A análise pode errar e não substitui a decisão do grupo.</p>
    </section>
  );
}

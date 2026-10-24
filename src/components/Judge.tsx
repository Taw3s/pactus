import { Sprite, type SpriteName } from "./Sprite";

/** The judge's moods, one per real state of the AI review or the tribunal (never improvised). */
export type JudgeMood = "idle" | "think" | "ok" | "unsure" | "point" | "verdict";

const SPRITE: Record<JudgeMood, SpriteName> = {
  idle: "judgeIdle",
  think: "judgeThink",
  ok: "judgeOk",
  unsure: "judgeUnsure",
  point: "judgePoint",
  verdict: "judgeDown",
};

/**
 * The judge with a short speech bubble. The lines are fixed per state: the judge only points
 * out suspicions; decisions always come from the group's vote.
 */
export function Judge({ mood, line, scale = 2, className = "" }: { mood: JudgeMood; line?: string; scale?: 1 | 2 | 3; className?: string }) {
  return (
    <div className={`flex items-end gap-2 ${className}`} data-judge={mood}>
      <Sprite name={SPRITE[mood]} scale={scale} className={mood === "think" ? "animate-[bob_1.2s_steps(2)_infinite] motion-reduce:animate-none" : ""} />
      {line && <JudgeBubble>{line}</JudgeBubble>}
    </div>
  );
}

const TAIL = {
  // pointing left, at a judge beside the bubble
  left: "before:-left-[8px] before:bottom-2 before:border-y-[6px] before:border-r-[8px] before:border-y-transparent before:border-r-bevel-dark after:-left-[5px] after:bottom-[10px] after:border-y-[4px] after:border-r-[6px] after:border-y-transparent after:border-r-fg",
  // pointing up, at a judge above the bubble
  up: "before:-top-[8px] before:left-1/2 before:-ml-[6px] before:border-x-[6px] before:border-b-[8px] before:border-x-transparent before:border-b-bevel-dark after:-top-[5px] after:left-1/2 after:-ml-[4px] after:border-x-[4px] after:border-b-[6px] after:border-x-transparent after:border-b-fg",
};

export function JudgeBubble({ children, tail = "left", className = "" }: { children: React.ReactNode; tail?: keyof typeof TAIL; className?: string }) {
  return (
    <p
      className={`relative rounded-sm border-2 border-bevel-dark bg-fg px-2.5 py-1.5 text-sm font-semibold leading-5 text-bg shadow-[3px_3px_0_var(--color-hard-shadow)] before:absolute after:absolute ${tail === "left" ? "mb-6" : ""} ${TAIL[tail]} ${className}`}
    >
      {children}
    </p>
  );
}

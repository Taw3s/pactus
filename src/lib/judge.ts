// The judge's animations: which frames (public/lowpoly/judge-*.png, made by tools/lowpoly) play
// in which order and for how long. Purely visual: nothing here decides anything.

export type JudgeAction = "idle" | "think" | "unsure" | "stamp" | "present" | "gavel";

export interface JudgeSequence {
  frames: { id: string; ms: number }[];
  /** Plays over and over while shown (only the real "analysing" state). */
  loop?: boolean;
  /** Plays every few seconds (resting): random pause between [min, max] ms. */
  every?: [number, number];
  /** Index of the frame where the gavel or the stamp hits. */
  impact?: number;
  /** The frame shown at rest, with reduced motion, and after playing. */
  still: string;
}

const seq = (prefix: string, ms: number[]) => ms.map((m, i) => ({ id: `${prefix}${i + 1}`, ms: m }));

export const JUDGE: Record<JudgeAction, JudgeSequence> = {
  // repouso: blink, then a small shift of posture
  idle: { frames: [{ id: "idle2", ms: 120 }, { id: "idle1", ms: 180 }, { id: "idle3", ms: 420 }, { id: "idle1", ms: 0 }], every: [6000, 10000], still: "idle1" },
  // analisando: brings the paper and the magnifier to the face
  think: { frames: seq("think", [150, 140, 160, 220, 140, 150]), loop: true, still: "think1" },
  // inconclusivo: tilts the head and lowers the paper
  unsure: { frames: seq("unsure", [160, 180, 200, 0]), still: "unsure4" },
  // verificado: approves and stamps the paper
  stamp: { frames: seq("stamp", [140, 120, 160, 70, 180, 110, 160, 0]), impact: 4, still: "stamp8" },
  // contestação aberta: straightens the paper and presents the evidence
  present: { frames: seq("present", [150, 130, 150, 180, 160, 0]), still: "present6" },
  // decisão do júri: raises and strikes the gavel
  gavel: { frames: seq("gavel", [120, 140, 160, 260, 60, 200, 90, 0]), impact: 5, still: "gavel8" },
};

export const judgeSrc = (id: string) => `/lowpoly/judge-${id}.png`;

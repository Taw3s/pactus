"use client";

import { useEffect, useState } from "react";
import { Sprite, type SpriteName } from "./Sprite";

// Two strikes of the gavel; the stamp lands on the second impact.
const FRAMES: { sprite: SpriteName; ms: number }[] = [
  { sprite: "gavelUp", ms: 380 },
  { sprite: "gavelMid", ms: 60 },
  { sprite: "gavel", ms: 160 },
  { sprite: "gavelMid", ms: 90 },
  { sprite: "gavelUp", ms: 220 },
  { sprite: "gavelMid", ms: 60 },
  { sprite: "gavel", ms: 0 },
];

const TONE = {
  done: "border-done bg-done-bg text-done",
  fail: "border-fail bg-fail-bg text-fail",
} as const;

interface Props {
  stamp: string;
  note: string;
  tone: keyof typeof TONE;
  /** The animation plays once per device for this key: include the viewer (user + day, user + dispute). */
  playKey: string;
  testId?: string;
}

/** A judge's gavel strikes twice and a stamp lands. Static when already seen or with reduced motion. */
export function GavelStamp({ stamp, note, tone, playKey, testId }: Props) {
  // Starts on the final, static state; only an unseen event replays the gavel and the stamp.
  const [frame, setFrame] = useState(FRAMES.length - 1);
  const [stamped, setStamped] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [impact, setImpact] = useState(0);

  useEffect(() => {
    const key = `pacto:stamp:${playKey}`;
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
      localStorage.setItem(key, "1");
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setFrame(0);
    setStamped(false);
    setPlaying(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let t = 0;
    FRAMES.forEach((f, i) => {
      timers.push(
        setTimeout(() => {
          setFrame(i);
          if (f.sprite === "gavel") setImpact((n) => n + 1);
          if (i === FRAMES.length - 1) setStamped(true);
        }, t),
      );
      t += f.ms;
    });
    return () => timers.forEach(clearTimeout);
  }, [playKey]);

  return (
    <div className="flex items-center gap-3" data-testid={testId} role="status">
      <div key={impact} className={impact ? "animate-[thud_180ms_steps(3)]" : ""}>
        <Sprite name={FRAMES[frame].sprite} scale={2} />
      </div>
      <div className="min-w-0">
        <p
          className={`pixel inline-block -rotate-6 rounded-sm border-[3px] px-3 py-1 text-2xl font-bold uppercase leading-7 shadow-[3px_3px_0_var(--color-hard-shadow)] ${TONE[tone]} ${
            !stamped ? "invisible" : playing ? "animate-[stamp_260ms_steps(4)_both]" : ""
          }`}
        >
          {stamp}
        </p>
        <p className={`mt-4 text-sm text-muted ${stamped ? "" : "invisible"}`}>{note}</p>
      </div>
    </div>
  );
}

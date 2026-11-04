"use client";

/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import { useEffect, useState } from "react";

// Pose 1 = repouso, 2 = leve ajuste, 3 = acomodada (tools/lowpoly/audience.js). At rest the audience is settled.
type Pose = 1 | 2 | 3;
const src = (side: "Left" | "Right", pose: Pose) => `/lowpoly/audience${side}${pose}.png`;

// The entrance timeline (Astra brief of 04/11): the left pair shifts first, the right one 100 ms later; both settle by 1.2 s.
const STEPS: Record<"Left" | "Right", [number, Pose][]> = {
  Left: [[0, 1], [150, 2], [1000, 3]],
  Right: [[100, 1], [250, 2], [1100, 3]],
};

/**
 * Two small generic groups seen from behind, at the foot of the bench, with the aisle free in the middle. They are scenery,
 * not the group's members: no names, no votes, never one per juror. They move only when `cue` changes (the judge's entrance
 * really started) and only once; otherwise they stay settled. Hidden from assistive technology and from the pointer.
 */
export function CourtAudience({ cue }: { cue: number }) {
  const [pose, setPose] = useState<{ Left: Pose; Right: Pose }>({ Left: 3, Right: 3 });

  // The two frames that are not shown at rest are fetched only for an open session (cue is wired), a couple of KB.
  useEffect(() => {
    for (const side of ["Left", "Right"] as const) for (const p of [1, 2] as const) new Image().src = src(side, p);
  }, []);

  useEffect(() => {
    if (!cue) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const settle = () => {
      timers.forEach(clearTimeout);
      setPose({ Left: 3, Right: 3 });
    };
    for (const side of ["Left", "Right"] as const)
      for (const [at, p] of STEPS[side]) timers.push(setTimeout(() => setPose((now) => ({ ...now, [side]: p })), at));
    // A hidden tab does not resume old frames: it comes back settled.
    const onHide = () => document.hidden && settle();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [cue]);

  const img = (side: "Left" | "Right") => (
    <img
      src={src(side, pose[side])}
      alt=""
      width={96}
      height={96}
      className="sprite h-12 w-12 max-w-none desk:h-24 desk:w-24"
      data-audience={side.toLowerCase()}
      data-pose={pose[side]}
    />
  );
  return (
    <div aria-hidden className="pointer-events-none" data-testid="court-audience">
      <div className="absolute bottom-0 right-full mr-2">{img("Left")}</div>
      <div className="absolute bottom-0 left-full ml-2">{img("Right")}</div>
    </div>
  );
}

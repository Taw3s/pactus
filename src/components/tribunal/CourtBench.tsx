"use client";

import { BenchJudge } from "./BenchJudge";

/**
 * The judge at the bench (the crowd in front of it is CourtCrowd, in Courtroom). Open: one strike opens the session, once
 * per viewer and tribunal (`playKey`). Closed: the final pose, still; the decision is told by the text below the scene,
 * never re-enacted on a later visit.
 */
export function CourtBench({ open, playKey }: { open: boolean; playKey: string }) {
  return (
    // 16 px closer to the crest (Astra brief): the judge's highest frame still clears it by ~7 px
    <div className="relative -mt-4">
      <BenchJudge action={open ? "session" : "gavel"} playKey={open ? playKey : undefined} still={!open} />
    </div>
  );
}

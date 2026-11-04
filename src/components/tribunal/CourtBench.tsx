"use client";

import { BenchJudge } from "./BenchJudge";

/**
 * The judge at the bench and, while the session is open, the audience at its foot. Open: one strike opens the session,
 * once per viewer and tribunal (`playKey`), and the audience shifts with it. Closed: the final pose, still; the decision
 * is told by the text below the scene, never re-enacted on a later visit.
 */
export function CourtBench({ open, playKey }: { open: boolean; playKey: string }) {
  return (
    <div className="relative">
      <BenchJudge action={open ? "session" : "gavel"} playKey={open ? playKey : undefined} still={!open} />
    </div>
  );
}

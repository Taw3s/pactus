"use client";

import { useState } from "react";
import { BenchJudge } from "./BenchJudge";
import { SESSION_EVENT } from "./CourtCrowd";

/**
 * The judge at the bench (the crowd in front of it is CourtCrowd, in Courtroom). Open: one strike opens the session, once
 * per viewer and tribunal (`playKey`), and the crowd settles with it. Closed: the final pose, still; the decision is told by the text below the scene,
 * never re-enacted on a later visit. Closing with the page open: one strike (`close`).
 */
export function CourtBench({ open, playKey }: { open: boolean; playKey: string }) {
  // Closing live (brief of 04/11, PR 2): the session turned closed while this page was open (with Q3 = A, only when the
  // viewer's own vote closed it). The judge looks at the result and strikes once; an entrance still running is cut off
  // (the action changes, so its frames stop) and the crowd settles (it loses its cue). Never on a later visit.
  // Derived during render (not in an effect), so the judge never shows the still closed pose for a frame before striking.
  const [closingLive, setClosingLive] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (wasOpen && !open) setClosingLive(true);
  }
  const action = open ? "session" : closingLive ? "close" : "gavel";
  return (
    // 16 px closer to the crest (Astra brief): the judge's highest frame still clears it by ~7 px
    <div className="relative -mt-4">
      <BenchJudge
        action={action}
        // the closing strike has its own key: it never makes the verdict stamp jolt (the gavel is not a conviction)
        playKey={open ? playKey : closingLive ? `closing:${playKey}` : undefined}
        still={!open && !closingLive}
        // the crowd settles with the opening strike only (CourtCrowd listens for this session's key)
        onPlay={open ? () => window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: playKey })) : undefined}
      />
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import { useEffect, useState } from "react";

/** Sent by VoteForm when the server accepted the viewer's vote (detail: the dispute id), right before the page refreshes. */
export const VOTED_EVENT = "court:voted";

// 4 frames of 80 ms (Astra brief of 04/11, PR 2): a blank ballot above the slot, halfway in, almost in, then the closed box.
const FRAMES = ["ballot1", "ballot2", "ballot3", "ballotBox"] as const;
const FRAME_MS = 80;

/**
 * The viewer's own vote, confirmed: a ballot drops into the box and "Seu voto foi registrado." appears. It plays only after
 * the server accepted this vote and the refreshed page still shows the session open; when the same vote closed it, the
 * judge's closing strike is the only movement (the verdict takes this place). Nothing while sending, on a failure, on a
 * repeated vote, on a later visit or on another refresh. The ballot is blank: it never shows the option, and the count
 * comes from the server. Reduced motion or a hidden tab: the closed box at once, with the text.
 */
export function BallotBox({ disputeId, open, hasVote }: { disputeId: string; open: boolean; hasVote: boolean }) {
  const [pending, setPending] = useState(false);
  const [frame, setFrame] = useState<(typeof FRAMES)[number] | null>(null);

  // The frames (~1 KB each) are fetched only where a vote can still be cast.
  useEffect(() => {
    if (open && !hasVote) for (const f of FRAMES) new Image().src = `/lowpoly/${f}.png`;
  }, [open, hasVote]);

  useEffect(() => {
    const onVoted = (e: Event) => (e as CustomEvent<string>).detail === disputeId && setPending(true);
    window.addEventListener(VOTED_EVENT, onVoted);
    return () => window.removeEventListener(VOTED_EVENT, onVoted);
  }, [disputeId]);

  useEffect(() => {
    if (!pending) return;
    if (!open) return setPending(false); // the vote closed the session: only the closing strike moves
    if (!hasVote) return; // wait for the refreshed page with the recorded vote
    setPending(false);
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setFrame("ballotBox");
    const timers = FRAMES.map((f, i) => setTimeout(() => setFrame(f), i * FRAME_MS));
    return () => timers.forEach(clearTimeout);
  }, [pending, open, hasVote]);

  if (!frame || !open) return null;
  return (
    <div className="mt-3 flex items-center gap-3" role="status" data-testid="ballot-box">
      <img src={`/lowpoly/${frame}.png`} alt="" width={48} height={48} className="sprite h-12 w-12 max-w-none shrink-0" data-frame={frame} />
      <p className="font-medium">Seu voto foi registrado.</p>
    </div>
  );
}

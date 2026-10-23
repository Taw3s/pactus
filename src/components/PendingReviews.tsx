"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Asks the AI judge for proofs it has not reviewed yet (a review that failed, or one still
 * running when the page loaded) and refreshes once a verdict exists. Renders nothing.
 */
export function PendingReviews({ ids }: { ids: string[] }) {
  const router = useRouter();
  const key = ids.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.all(
      key.split(",").map((checkinId) =>
        fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })
          .then(async (r) => ((await r.json().catch(() => ({}))) as { status?: string }).status)
          .catch(() => undefined),
      ),
    ).then((statuses) => {
      if (!cancelled && statuses.some((s) => s === "reviewed" || s === "exists")) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [key, router]);
  return null;
}

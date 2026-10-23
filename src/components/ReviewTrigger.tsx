"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Asks the server to review a check-in that has no AI review yet (e.g. the first attempt failed). */
export function ReviewTrigger({ checkinId }: { checkinId: string }) {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })
      .then((r) => r.json())
      .then((r: { status?: string }) => r.status === "reviewed" && router.refresh())
      .catch(() => {});
  }, [checkinId, router]);
  return null;
}

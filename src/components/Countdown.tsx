"use client";

import { useEffect, useState } from "react";
import { msUntilEndOfDay } from "@/lib/dates";

function format(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Time left until 23:59 in São Paulo. Rendered only on the client to avoid hydration drift. */
export function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilEndOfDay());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (ms === null) return null;
  const urgent = ms < 2 * 3600_000;
  return (
    <div className={`rounded-xl px-3 py-1.5 text-right ${urgent ? "bg-red-500/15 text-red-300" : "bg-zinc-900 text-zinc-300"}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">faltam</div>
      <div className="font-mono text-lg font-semibold leading-none">{format(ms)}</div>
    </div>
  );
}

import type { Verdict } from "@/lib/ai-review";

/** AI opinion on a photo. "unclear" shows nothing: the AI only speaks when it has something to say. */
export function ReviewBadge({ verdict, className = "" }: { verdict: Verdict; className?: string }) {
  if (verdict === "unclear") return null;
  const [label, style] =
    verdict === "match" ? ["🤖 conferido", "bg-sky-500/90 text-white"] : ["🤖 ⚠️ conferir", "bg-amber-400 text-zinc-950"];
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style} ${className}`}>{label}</span>;
}

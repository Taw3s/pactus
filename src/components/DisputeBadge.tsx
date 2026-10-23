import type { DisputeStatus } from "@/lib/types";

const STYLE: Record<DisputeStatus, [string, string]> = {
  open: ["⚖️ contestado", "bg-amber-500 text-zinc-950"],
  upheld: ["❌ anulado", "bg-red-500 text-white"],
  rejected: ["✔ mantido", "bg-zinc-600 text-white"],
};

export function DisputeBadge({ status, className = "" }: { status: DisputeStatus; className?: string }) {
  const [label, style] = STYLE[status];
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style} ${className}`}>{label}</span>;
}

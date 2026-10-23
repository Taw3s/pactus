import { AlertTriangle, CircleCheck, CircleX, CloudOff, Loader, Scale, ScanSearch } from "lucide-react";
import type { Verdict } from "@/lib/ai-review";
import type { DisputeStatus } from "@/lib/types";
import { Badge } from "./ui/Badge";

/** Tribunal decision: a human decision, always shown with priority over the AI. */
export function TribunalBadge({ status }: { status: DisputeStatus }) {
  if (status === "upheld") return <Badge tone="fail" icon={CircleX}>Anulado</Badge>;
  if (status === "rejected") return <Badge tone="done" icon={CircleCheck}>Mantido</Badge>;
  return <Badge tone="warn" icon={Scale}>Tribunal · aberto</Badge>;
}

export type AiState = Verdict | "analyzing" | "unavailable";

/** The AI judge's first-instance reading: never a final verdict. "unclear" shows nothing. */
export function AiBadge({ state }: { state: AiState }) {
  switch (state) {
    case "match":
      return <Badge tone="ai" icon={ScanSearch}>IA conferiu</Badge>;
    case "mismatch":
      return <Badge tone="warn" icon={AlertTriangle}>IA diverge</Badge>;
    case "analyzing":
      return <Badge tone="neutral" icon={Loader}>IA analisando</Badge>;
    case "unavailable":
      return <Badge tone="neutral" icon={CloudOff}>IA indisponível</Badge>;
    default:
      return null;
  }
}

/**
 * The one badge to show where space is short: the tribunal decision wins; otherwise the AI reading.
 * Never shows "IA conferiu" next to "Anulado" as if both were equivalent decisions.
 */
export function PrimaryBadge({ dispute, ai }: { dispute?: DisputeStatus | null; ai?: AiState | null }) {
  if (dispute) return <TribunalBadge status={dispute} />;
  if (ai) return <AiBadge state={ai} />;
  return null;
}

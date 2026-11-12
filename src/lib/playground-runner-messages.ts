export const PLAYGROUND_RUNNER_BRIDGE = "pactus-isolated-playground";

export type PlaygroundRunnerMessage =
  | { bridge: typeof PLAYGROUND_RUNNER_BRIDGE; type: "ready" }
  | {
      bridge: typeof PLAYGROUND_RUNNER_BRIDGE;
      type: "output";
      runId: number;
      kind: "log" | "warn" | "error" | "done";
      text?: string;
      failed?: boolean;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isPlaygroundRunnerMessage(value: unknown): value is PlaygroundRunnerMessage {
  if (!isRecord(value) || value.bridge !== PLAYGROUND_RUNNER_BRIDGE) return false;
  if (value.type === "ready") return true;
  return value.type === "output"
    && Number.isSafeInteger(value.runId)
    && Number(value.runId) >= 1
    && ["log", "warn", "error", "done"].includes(String(value.kind))
    && (value.text === undefined || (typeof value.text === "string" && value.text.length <= 12000))
    && (value.failed === undefined || typeof value.failed === "boolean");
}

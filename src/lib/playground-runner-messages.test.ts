import { describe, expect, it } from "vitest";
import { isPlaygroundRunnerMessage, PLAYGROUND_RUNNER_BRIDGE } from "./playground-runner-messages";

describe("isolated playground message boundary", () => {
  it("accepts only bounded messages from the runner protocol", () => {
    expect(isPlaygroundRunnerMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "ready" })).toBe(true);
    expect(isPlaygroundRunnerMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "output", runId: 3, kind: "log", text: "ok" })).toBe(true);
    expect(isPlaygroundRunnerMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "output", runId: 3, kind: "error", text: "x".repeat(12001) })).toBe(false);
    expect(isPlaygroundRunnerMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "output", runId: 0, kind: "done" })).toBe(false);
    expect(isPlaygroundRunnerMessage({ bridge: "wrong", type: "ready" })).toBe(false);
    expect(isPlaygroundRunnerMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "run", runId: 3 })).toBe(false);
  });
});

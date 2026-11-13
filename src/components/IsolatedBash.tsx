"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CREDENTIALLESS, resolveBashWorkerPath } from "@/components/CodePlayground";
import { isPlaygroundRunnerMessage, PLAYGROUND_RUNNER_BRIDGE } from "@/lib/playground-runner-messages";
import { resolveIsolatedHostOrigin } from "@/lib/youtube-player-messages";

export type BashRun = { stdout: string; stderr: string; failed: boolean; timedOut: boolean };

/**
 * Runs Bash in the isolated runner (NEXT_PUBLIC_ISOLATED_ORIGIN), the same frame, worker and limits as the playground:
 * no network, no storage, 5 s inside Bashkit and 10 s here. Without the isolated origin it is unavailable: nothing runs
 * on the app's origin. Render `frame` somewhere on the page.
 */
export function useIsolatedBash() {
  const [origin, setOrigin] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const pending = useRef<{ id: number; out: string; err: string; resolve: (r: BashRun) => void; timer: number } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    setOrigin(resolveIsolatedHostOrigin(process.env.NEXT_PUBLIC_ISOLATED_ORIGIN, window.location.origin, process.env.NODE_ENV !== "production"));
  }, []);

  useEffect(() => {
    if (!origin) return;
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== frameRef.current?.contentWindow || event.origin !== origin || !isPlaygroundRunnerMessage(event.data)) return;
      const m = event.data;
      if (m.type === "ready") return setReady(true);
      const p = pending.current;
      if (!p || m.runId !== p.id) return;
      if (m.kind === "done") {
        window.clearTimeout(p.timer);
        pending.current = null;
        p.resolve({ stdout: p.out, stderr: p.err, failed: !!m.failed, timedOut: false });
      } else if (m.text) {
        if (m.kind === "error") p.err = (p.err + m.text).slice(0, 12000);
        else p.out = (p.out + m.text).slice(0, 24000);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  useEffect(() => {
    if (!origin || ready) return;
    const ping = () => frameRef.current?.contentWindow?.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "ping" }, origin);
    ping();
    const timer = window.setInterval(ping, 500);
    return () => window.clearInterval(timer);
  }, [origin, ready]);

  const run = useCallback((code: string) => new Promise<BashRun>((resolve, reject) => {
    const target = frameRef.current?.contentWindow;
    if (!origin || !ready || !target) return reject(new Error("unavailable"));
    if (pending.current) {
      window.clearTimeout(pending.current.timer);
      pending.current.resolve({ stdout: "", stderr: "", failed: true, timedOut: false });
    }
    const id = ++seq.current;
    const timer = window.setTimeout(() => {
      target.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "cancel", runId: id, silent: true }, origin);
      pending.current = null;
      resolve({ stdout: "", stderr: "", failed: true, timedOut: true });
    }, 10000);
    pending.current = { id, out: "", err: "", resolve, timer };
    target.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "run", runId: id, language: "bash", code, workerPath: resolveBashWorkerPath() }, origin);
  }), [origin, ready]);

  const frame = origin ? (
    <iframe
      {...CREDENTIALLESS}
      ref={(el) => {
        frameRef.current = el;
      }}
      title="Interpretador isolado de Bash"
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer"
      aria-hidden="true"
      tabIndex={-1}
      hidden
      src={`${origin}/playground-runner.html?parent=${encodeURIComponent(window.location.origin)}`}
    />
  ) : null;

  return { available: !!origin, ready, run, frame };
}

"use client";

import { JAVA_CHECK_RESOURCES, JAVA_CHECK_TIMEOUT_MS, runJavaCases, type JavaEngine, type JavaOutcome } from "@/lib/java-challenge-checks";
import { javaBrowserSource } from "@/lib/java-toolchain";

/** The Java compiler only exists with cross-origin isolation (Chromium on /aprender). Without it the check refuses. */
export function javaCheckAvailable() {
  return typeof window !== "undefined" && window.crossOriginIsolated === true;
}

/**
 * Compiles the answer on this device and runs it once per standard input, with the playground's toolchain. The engine
 * lives for one check only. "timeout" when the whole thing passes JAVA_CHECK_TIMEOUT_MS.
 */
export async function runJavaCheck(code: string, stdins: string[]): Promise<JavaOutcome | "timeout"> {
  if (!javaCheckAvailable()) throw new Error("unavailable");
  let engine: (JavaEngine & { dispose: () => void }) | null = null;
  let timer = 0;
  const work = (async () => {
    const { createBrowserEngine } = await import("@wasm-oj/browser");
    const created = await createBrowserEngine({ toolchains: [javaBrowserSource("/toolchains/")] });
    engine = created as unknown as JavaEngine & { dispose: () => void };
    await created.ready();
    return runJavaCases(engine, code, stdins, JAVA_CHECK_RESOURCES);
  })();
  // A check that was given up on must not leave an unhandled rejection behind when its engine is disposed.
  work.catch(() => {});
  try {
    return await Promise.race([work, new Promise<"timeout">((resolve) => { timer = window.setTimeout(() => resolve("timeout"), JAVA_CHECK_TIMEOUT_MS); })]);
  } finally {
    window.clearTimeout(timer);
    (engine as { dispose: () => void } | null)?.dispose();
  }
}

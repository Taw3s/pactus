/**
 * Headers for /aprender. The Java runtime compiles in WebAssembly and needs cross-origin isolation (COOP + COEP).
 * COEP "credentialless" keeps the YouTube player working, but only Chromium 110+ supports it (and the iframe
 * attribute of the same name), so other browsers get no isolation: the video lessons work there and Java says it
 * needs Chrome or Edge. The answer depends on the browser, hence Vary: User-Agent.
 */
export function learningIsolationHeaders(userAgent: string | null, vary: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  const chromium = Number((userAgent ?? "").match(/(?:Chrome|Chromium|Edg|OPR)\/(\d+)/i)?.[1] ?? 0);
  if (chromium >= 110) {
    out["Cross-Origin-Opener-Policy"] = "same-origin";
    out["Cross-Origin-Embedder-Policy"] = "credentialless";
  }
  if (!vary?.split(",").some((v) => v.trim().toLowerCase() === "user-agent")) out.Vary = vary ? `${vary}, User-Agent` : "User-Agent";
  return out;
}

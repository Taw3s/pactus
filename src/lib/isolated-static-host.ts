const ISOLATED_STATIC_FILES = new Set([
  "/youtube-player.html",
  "/playground-runner.html",
  "/isolated-origin-policy.js",
  "/youtube-player.js",
  "/playground-runner.js",
]);
const ISOLATED_STATIC_PREFIXES = [
  "/workers/",
  "/local-runtimes/",
  "/toolchains/",
  "/wasm-oj/",
  "/_next/static/",
];

export function isPactusAppHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "pactus.dev.br" || normalized.endsWith(".pactus.dev.br");
}

export function isIsolatedStaticHost(
  requestHost: string,
  configuredOrigin: string | undefined,
  siteUrl: string | undefined,
  production: boolean,
): boolean {
  if (!configuredOrigin) return false;
  try {
    const isolated = new URL(configuredOrigin);
    if (isolated.username || isolated.password || isolated.search || isolated.hash || !["", "/"].includes(isolated.pathname)) return false;
    const localDevelopment = !production
      && isolated.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(isolated.hostname);
    if (isolated.protocol !== "https:" && !localDevelopment) return false;
    const appHost = siteUrl ? new URL(siteUrl).host.toLowerCase() : "";
    const appHostname = siteUrl ? new URL(siteUrl).hostname.toLowerCase() : "";
    const isolatedHostname = isolated.hostname.toLowerCase();
    const host = isolated.host.toLowerCase();
    if (host === appHost || isolatedHostname === appHostname || isolatedHostname.endsWith(`.${appHostname}`)
      || isPactusAppHostname(isolatedHostname)) return false;
    return requestHost.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function isAllowedIsolatedStaticPath(pathname: string): boolean {
  if (pathname.length > 1024 || pathname.includes("%") || pathname.includes(String.fromCharCode(92))) return false;
  if (pathname.split("/").some((segment) => segment === "." || segment === "..")) return false;
  return ISOLATED_STATIC_FILES.has(pathname) || ISOLATED_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length);
}

/**
 * Every host a request names: Host, the first X-Forwarded-Host and the URL Next built. request.nextUrl.host alone is not
 * enough: next start and next dev fill it with the server's own hostname, so the isolated host was served the whole app
 * (login, pages, APIs) in the local test of 12/11/2026. The middleware treats the request as isolated when any of them
 * is the isolated host: a forged header can only make the answer stricter (404), never open the app there.
 */
export function requestHostCandidates(headers: { get(name: string): string | null }, nextUrlHost: string): string[] {
  const first = (name: string) => headers.get(name)?.split(",")[0]?.trim().toLowerCase();
  return [...new Set([first("host"), first("x-forwarded-host"), nextUrlHost.toLowerCase()].filter((h): h is string => !!h))];
}

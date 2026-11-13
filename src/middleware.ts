import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { learningIsolationHeaders } from "@/lib/learning-isolation";
import { isAllowedIsolatedStaticPath, isIsolatedStaticHost, isPactusAppHostname, requestHostCandidates } from "@/lib/isolated-static-host";

const SESSION_FREE_STATIC_FILES = new Set([
  "/youtube-player.html",
  "/playground-runner.html",
  "/isolated-origin-policy.js",
  "/youtube-player.js",
  "/playground-runner.js",
  "/favicon.ico",
  "/sw.js",
  "/offline.html",
  "/manifest.webmanifest",
]);
const SESSION_FREE_STATIC_PREFIXES = ["/_next/static/", "/icons/", "/workers/", "/local-runtimes/", "/toolchains/", "/wasm-oj/"];
const RUNNER_ENTRY_FILES = new Set(["/playground-runner.html", "/playground-runner.js"]);

function isSessionFreeStaticAsset(pathname: string): boolean {
  return SESSION_FREE_STATIC_FILES.has(pathname)
    || SESSION_FREE_STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    || /\.(?:png|jpg|jpeg|svg|webp)$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hosts = requestHostCandidates(request.headers, request.nextUrl.host);
  if (hosts.some((host) => isIsolatedStaticHost(
    host,
    process.env.NEXT_PUBLIC_ISOLATED_ORIGIN,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV === "production",
  ))) {
    return isAllowedIsolatedStaticPath(pathname)
      ? NextResponse.next({ request })
      : new NextResponse(null, { status: 404 });
  }
  // The runner must never execute on a Pactus hostname, including when its configured origin is mis-set to a subdomain.
  if (RUNNER_ENTRY_FILES.has(pathname) && hosts.some((host) => isPactusAppHostname(host.replace(/:\d+$/, "")))) {
    return new NextResponse(null, { status: 404 });
  }
  if (pathname.startsWith("/_next/image") || isSessionFreeStaticAsset(pathname)) return NextResponse.next({ request });

  const response = await updateSession(request);
  if (response.status >= 300 || !pathname.startsWith("/aprender")) return response;
  // The local Java runtime (WebAssembly threads) needs cross-origin isolation, only on Aprender (learning-isolation.ts).
  for (const [key, value] of Object.entries(learningIsolationHeaders(request.headers.get("user-agent"), response.headers.get("Vary")))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Middleware checks the isolated host for every path. Regular static files exit early above.
  matcher: [
    "/((?!monitoring/?$).*)",
  ],
};

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { learningIsolationHeaders } from "@/lib/learning-isolation";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  if (response.status >= 300 || !request.nextUrl.pathname.startsWith("/aprender")) return response;
  // The local Java runtime (WebAssembly threads) needs cross-origin isolation, only on Aprender (learning-isolation.ts).
  for (const [key, value] of Object.entries(learningIsolationHeaders(request.headers.get("user-agent"), response.headers.get("Vary")))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Skip static assets, PWA files, images, the error-report tunnel (/monitoring, see next.config.ts) and the local
  // runtimes of Aprender (public files: workers, interpreters, the Java toolchain and their licenses).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|offline.html|manifest.webmanifest|monitoring|workers/|local-runtimes/|toolchains/|wasm-oj/|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};

import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// The WASM-OJ runner (Java in Aprender) builds these URLs at run time, next to its own chunk in /_next/static/media,
// where webpack never emits them. tools/runtimes/stage.mjs copies them (hash-checked) to public/wasm-oj/.
const WASM_OJ_ASSETS = [
  "runtime-core_bg-CKk6CPFH.wasm",
  "wasmer_js_bg-lccPpAdN.wasm",
  "java-stage.worker-COWR2SIP.js",
  "index-CMYYN-aK.mjs",
  "interactive-side.worker-pP6UC6gL.js",
  "wasmer-thread.worker-DKlJE3cb.js",
  "compiler.worker-CD4QCBe0.js",
  "runner.worker-BEbZIYKj.js",
];

const nextConfig: NextConfig = {
  async rewrites() {
    const files = WASM_OJ_ASSETS.map((f) => f.replace(/[.]/g, "\\.")).join("|");
    return { beforeFiles: [{ source: `/_next/static/media/:file(${files})`, destination: "/wasm-oj/:file" }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Workers of the local runtimes (Aprender): they run user code on this origin, so their own CSP keeps a dynamic
        // import() or a runtime from reaching any other site. 'wasm-unsafe-eval' compiles the interpreters.
        source: "/workers/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'none'" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // A page with cross-origin isolation (/aprender) only starts a dedicated worker whose response has COEP too.
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Same for the bundled workers (Bash) and the WASM-OJ workers rewritten from /_next/static/media.
        source: "/_next/static/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
      {
        source: "/wasm-oj/:path*",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

// Source maps go up only when SENTRY_AUTH_TOKEN exists (Vercel Production); without it the build just skips them.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  // Reports go through the app's own domain, so ad blockers do not drop them; the middleware skips this path.
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
});

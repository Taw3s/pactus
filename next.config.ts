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
        source: "/((?!youtube-player\\.html$|playground-runner\\.html$).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // This public video player is embedded only by the canonical app domains.
        source: "/youtube-player.html",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' https://www.youtube.com https://s.ytimg.com; connect-src https://www.youtube.com https://www.youtube-nocookie.com https://*.youtube.com https://*.googlevideo.com https://*.googleapis.com https://*.gstatic.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; img-src data: https://*.ytimg.com https://*.googleusercontent.com https://*.youtube.com; media-src blob: https://*.googlevideo.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://www.pactus.dev.br https://pactus.dev.br http://localhost:* http://127.0.0.1:*" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        // Runs on the isolated static hostname. Authenticated app routes are denied by middleware there.
        source: "/playground-runner.html",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://www.pactus.dev.br https://pactus.dev.br http://localhost:* http://127.0.0.1:*" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Local runtimes run only on the isolated hostname; same-origin fetches there cannot see the app session or APIs.
        source: "/workers/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'none'" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Bundled workers (Bash) and static dependencies use only this isolated origin.
        source: "/_next/static/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'none'" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
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
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
});

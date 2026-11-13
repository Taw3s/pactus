import { describe, expect, it } from "vitest";
import { isAllowedIsolatedStaticPath, isIsolatedStaticHost, isPactusAppHostname, requestHostCandidates } from "./isolated-static-host";

describe("isolated hostname routing", () => {
  it("recognizes only a distinct, configured HTTPS host", () => {
    expect(isIsolatedStaticHost("pactus-runner.vercel.app", "https://pactus-runner.vercel.app", "https://www.pactus.dev.br", true)).toBe(true);
    expect(isIsolatedStaticHost("www.pactus.dev.br", "https://pactus-runner.vercel.app", "https://www.pactus.dev.br", true)).toBe(false);
    expect(isIsolatedStaticHost("runner.pactus.dev.br", "https://runner.pactus.dev.br", "https://www.pactus.dev.br", true)).toBe(false);
    expect(isPactusAppHostname("runner.pactus.dev.br")).toBe(true);
    expect(isPactusAppHostname("pactus-runner.vercel.app")).toBe(false);
  });

  it("fails closed for the app host and malformed or insecure production origins", () => {
    expect(isIsolatedStaticHost("www.pactus.dev.br", "https://www.pactus.dev.br", "https://www.pactus.dev.br", true)).toBe(false);
    expect(isIsolatedStaticHost("pactus.dev.br", "https://pactus.dev.br", undefined, true)).toBe(false);
    expect(isIsolatedStaticHost("runner.example.com", "http://runner.example.com", "https://www.pactus.dev.br", true)).toBe(false);
    expect(isIsolatedStaticHost("runner.example.com", "https://runner.example.com/path", "https://www.pactus.dev.br", true)).toBe(false);
  });

  it("allows an HTTP loopback runner only in development", () => {
    expect(isIsolatedStaticHost("127.0.0.1:3001", "http://127.0.0.1:3001", "http://localhost:3000", false)).toBe(true);
    expect(isIsolatedStaticHost("127.0.0.1:3001", "http://127.0.0.1:3001", "http://localhost:3000", true)).toBe(false);
  });
});

describe("isolated static host allowlist", () => {
  it("allows only static player, runner, and runtime assets", () => {
    expect(isAllowedIsolatedStaticPath("/youtube-player.html")).toBe(true);
    expect(isAllowedIsolatedStaticPath("/playground-runner.html")).toBe(true);
    expect(isAllowedIsolatedStaticPath("/workers/python.worker.mjs")).toBe(true);
    expect(isAllowedIsolatedStaticPath("/local-runtimes/python/pyodide.mjs")).toBe(true);
    expect(isAllowedIsolatedStaticPath("/_next/static/webpack/worker.js")).toBe(true);
  });

  it("denies app pages, login, APIs, image optimization, and traversal paths", () => {
    expect(isAllowedIsolatedStaticPath("/")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/login")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/api/checkins")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/_next/image")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/workers/../api/checkins")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/playground-runner.html/extra")).toBe(false);
    expect(isAllowedIsolatedStaticPath("/x".repeat(600))).toBe(false);
  });
});

describe("requestHostCandidates", () => {
  const headers = (h: Record<string, string>) => ({ get: (name: string) => h[name.toLowerCase()] ?? null });
  it("names the Host header even when Next built the URL with the server's own hostname", () => {
    const hosts = requestHostCandidates(headers({ host: "pactus-isolated.vercel.app" }), "localhost:3000");
    expect(hosts).toContain("pactus-isolated.vercel.app");
    expect(hosts.some((h) => isIsolatedStaticHost(h, "https://pactus-isolated.vercel.app", "https://www.pactus.dev.br", true))).toBe(true);
  });
  it("keeps only the first X-Forwarded-Host and lowercases everything, without repeats", () => {
    expect(requestHostCandidates(headers({ host: "WWW.PACTUS.DEV.BR", "x-forwarded-host": "a.example, b.example" }), "www.pactus.dev.br")).toEqual([
      "www.pactus.dev.br",
      "a.example",
    ]);
  });
});

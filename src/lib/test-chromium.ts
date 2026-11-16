// Test helper (never imported by the app): a real Chromium for the challenge checks whose engine is the browser itself
// (JavaScript, TypeScript, Web, Java). The page is served with the same isolation headers /aprender gets in Chromium, so
// frames and WebAssembly behave as they do there. Needs `npx playwright install chromium` (CI does it), or CHROMIUM_PATH
// pointing at a browser that is already installed.
import { existsSync, createReadStream } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { runCheckFrames, type FrameReport, type FrameSpec } from "./check-frames";
import { learningIsolationHeaders } from "./learning-isolation";

const TYPES: Record<string, string> = { ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".html": "text/html; charset=utf-8" };
const PRESET = "/opt/pw-browsers/chromium";

export type TestBrowser = { browser: Browser; page: Page; origin: string; runFrames: (specs: FrameSpec[], token: string, timeoutMs: number) => Promise<FrameReport[]>; close: () => Promise<void> };

/**
 * Opens a page on a local server. `mounts` maps a URL prefix to a folder (the Java toolchain, for instance) and `html`
 * is the page's markup (an import map, when modules are loaded).
 */
export async function openTestBrowser(mounts: Record<string, string> = {}, html = "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>Teste</title></head><body></body></html>"): Promise<TestBrowser> {
  const headers = { ...learningIsolationHeaders("Mozilla/5.0 Chrome/140.0.0.0", null), "Cross-Origin-Resource-Policy": "same-origin" };
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/") return void response.writeHead(200, { ...headers, "content-type": TYPES[".html"] }).end(html);
    const prefix = Object.keys(mounts).find((p) => path.startsWith(p));
    const file = prefix ? normalize(join(mounts[prefix], path.slice(prefix.length))) : "";
    if (!prefix || !file.startsWith(mounts[prefix]) || !existsSync(file)) return void response.writeHead(404, headers).end();
    response.writeHead(200, { ...headers, "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const executablePath = process.env.CHROMIUM_PATH || (existsSync(PRESET) ? PRESET : undefined);
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage();
  await page.goto(`${origin}/`);
  const runner = runCheckFrames.toString();
  return {
    browser, page, origin,
    // The app's own frame runner, handed to the browser as it is.
    runFrames: (specs, token, timeoutMs) => page.evaluate(([source, s, t, ms]) => (0, eval)(`(${source})`)(s, t, ms) as Promise<FrameReport[]>, [runner, specs, token, timeoutMs] as const),
    close: async () => {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

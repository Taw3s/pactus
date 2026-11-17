// Aprender, challenges checked in a frame of the page (JavaScript, TypeScript and Web): one sandboxed iframe per case,
// one after the other. Each case gets a new document, so nothing a case leaves behind (variables, timers, DOM) reaches
// the next one. The frames are the playground's: sandbox="allow-scripts" (opaque origin, no cookies, no storage, no
// access to the app) and the document's own CSP has no network.

export type FrameSpec = { html: string; width?: number; height?: number };
/** What one case's frame said: the lines it reported, an error (empty when none) and whether it finished in time. */
export type FrameReport = { lines: string[]; error: string; done: boolean };

/**
 * Runs the documents and resolves with one report per document. `token` must be random: only messages that carry it and
 * come from the case's own frame count.
 *
 * Self-contained on purpose (no imports, no outer names): the tests hand this very function to a real Chromium.
 */
export function runCheckFrames(specs: FrameSpec[], token: string, timeoutMs: number): Promise<FrameReport[]> {
  const one = (spec: FrameSpec, index: number) => new Promise<FrameReport>((resolve) => {
    const report: FrameReport = { lines: [], error: "", done: false };
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", "Conferência do desafio");
    frame.tabIndex = -1;
    // Laid out and inside the viewport (the Web cases read computed styles and positions, and Chromium stops laying out
    // frames that are off screen), but invisible and out of reach.
    frame.style.cssText = `position:fixed;left:0;top:0;border:0;opacity:0;pointer-events:none;z-index:-1;max-width:none;width:${spec.width ?? 800}px;height:${spec.height ?? 600}px`;
    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve(report);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data as { bridge?: unknown; index?: unknown; kind?: unknown; text?: unknown } | null;
      if (!data || data.bridge !== token || data.index !== index) return;
      const text = typeof data.text === "string" ? data.text.slice(0, 1200) : "";
      if (data.kind === "line" && report.lines.length < 200) report.lines.push(text);
      else if (data.kind === "error" && !report.error) report.error = text || "Erro";
      else if (data.kind === "done") {
        report.done = true;
        finish();
      }
    };
    window.addEventListener("message", onMessage);
    timer = window.setTimeout(finish, timeoutMs);
    frame.srcdoc = spec.html;
    document.body.appendChild(frame);
  });
  return specs.reduce<Promise<FrameReport[]>>(async (previous, spec, index) => [...(await previous), await one(spec, index)], Promise.resolve([]));
}

/** Data for an inline script: JSON with every "<" escaped, so no value can close the script element or open a comment. */
export function inlineJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, (c) => (c === "\u2028" ? "\\u2028" : "\\u2029"));
}

// Same lockdown as public/workers/lockdown.js, for the Bash worker that webpack bundles (see that file for why).
const BLOCKED = ["fetch", "XMLHttpRequest", "WebSocket", "WebTransport", "EventSource", "Worker", "SharedWorker", "importScripts",
  "BroadcastChannel", "indexedDB", "caches", "RTCPeerConnection", "Notification", "cookieStore"] as const;

function blocked(): never {
  throw new Error("Acesso à rede e ao armazenamento desativado neste interpretador local.");
}

/** Removes network, storage and nested-worker entry points from `scope` and its prototypes. Returns what is still reachable. */
export function lockdownWorker(scope: object): string[] {
  const seen = new Set<object>();
  for (let o: object | null = scope; o && !seen.has(o); o = Object.getPrototypeOf(o)) {
    seen.add(o);
    for (const name of BLOCKED) {
      const d = Object.getOwnPropertyDescriptor(o, name);
      if (!d) continue;
      if (!d.configurable) {
        if ("value" in d && d.writable) (o as Record<string, unknown>)[name] = undefined;
        continue;
      }
      Object.defineProperty(o, name, { value: name === "fetch" || name === "importScripts" ? blocked : undefined, writable: false, configurable: false, enumerable: false });
    }
  }
  return BLOCKED.filter((name) => {
    let v: unknown;
    try {
      v = (scope as Record<string, unknown>)[name];
    } catch {
      return false;
    }
    return v !== undefined && v !== blocked;
  });
}

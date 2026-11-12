import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { lockdownWorker } from "./worker-lockdown";

// A stand-in for a worker global: the network lives on the prototype, as on WorkerGlobalScope.prototype.
function fakeScope() {
  class Base {}
  for (const name of ["fetch", "importScripts"]) Object.defineProperty(Base.prototype, name, { value: () => "network", writable: true, configurable: true });
  Object.defineProperty(Base.prototype, "indexedDB", { get: () => ({ open: () => "db" }), configurable: true });
  Object.defineProperty(Base.prototype, "caches", { get: () => ({}), configurable: true });
  const scope = new Base() as Record<string, unknown>;
  for (const name of ["XMLHttpRequest", "WebSocket", "WebSocketStream", "EventSource", "Worker", "SharedWorker", "BroadcastChannel"]) scope[name] = function Native() {};
  scope.navigator = { storage: {}, locks: {} };
  scope.postMessage = () => "message";
  scope.fetch = () => "own fetch";
  return scope;
}

describe.each([
  ["src/lib/worker-lockdown.ts", (s: object) => lockdownWorker(s)],
  [
    "public/workers/lockdown.js",
    (s: object) => {
      // The classic/module script registers itself on the global it runs in.
      const box: Record<string, unknown> = { self: {} };
      runInNewContext(readFileSync("public/workers/lockdown.js", "utf8"), box);
      return (box.self as { lockdownWorker: (o: object) => string[] }).lockdownWorker(s);
    },
  ],
] as const)("%s", (_name, lockdown) => {
  it("removes network, storage and nested workers from the scope and its prototypes", () => {
    const scope = fakeScope();
    expect(lockdown(scope)).toEqual([]);
    expect(() => (scope.fetch as () => void)()).toThrow(/desativado/);
    expect(() => (Object.getPrototypeOf(scope).fetch as () => void)()).toThrow(/desativado/);
    for (const name of ["XMLHttpRequest", "WebSocket", "WebSocketStream", "EventSource", "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches", "navigator", "postMessage"]) {
      expect(scope[name], name).toBeUndefined();
    }
  });
  it("cannot be undone by assigning or redefining the same slot", () => {
    const scope = fakeScope();
    lockdown(scope);
    const proto = Object.getPrototypeOf(scope);
    expect(() => Object.defineProperty(proto, "fetch", { value: () => "network" })).toThrow();
    try {
      proto.fetch = () => "network";
    } catch {
      /* strict mode */
    }
    expect(() => proto.fetch()).toThrow(/desativado/);
  });
});

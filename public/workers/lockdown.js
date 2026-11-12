/*
 * Shared by the local runtimes of Aprender (classic and module workers, and bundled into the Bash worker through
 * src/lib/worker-lockdown.ts). Called after a runtime has loaded its own files and before any user code runs.
 *
 * The workers share the app's origin, so a request from them would carry the session cookies. Replacing self.fetch
 * is not enough: user code can reach WorkerGlobalScope.prototype.fetch (in Python, through the "js" module). This
 * removes every network, storage and nested-worker entry point from the global object and its whole prototype
 * chain, and freezes the slots so they cannot be put back. What is left (a dynamic import()) is a GET without the
 * response being readable, and the worker CSP (next.config.ts) limits it to this site's own files.
 */
(function (root) {
  var BLOCKED = ["fetch", "XMLHttpRequest", "WebSocket", "WebSocketStream", "WebTransport", "EventSource", "Worker", "SharedWorker", "importScripts",
    "BroadcastChannel", "indexedDB", "caches", "RTCPeerConnection", "Notification", "cookieStore", "navigator", "postMessage"];
  function blocked() {
    throw new Error("Acesso à rede e ao armazenamento desativado neste interpretador local.");
  }
  function lockdownWorker(scope) {
    var seen = [];
    for (var o = scope; o && seen.indexOf(o) < 0; o = Object.getPrototypeOf(o)) {
      seen.push(o);
      for (var i = 0; i < BLOCKED.length; i++) {
        var name = BLOCKED[i];
        var d = Object.getOwnPropertyDescriptor(o, name);
        if (!d) continue;
        if (!d.configurable) {
          if ("value" in d && d.writable) o[name] = undefined;
          continue;
        }
        Object.defineProperty(o, name, { value: name === "fetch" || name === "importScripts" ? blocked : undefined, writable: false, configurable: false, enumerable: false });
      }
    }
    return BLOCKED.filter(function (name) {
      var v;
      try { v = scope[name]; } catch { return false; }
      return v !== undefined && v !== blocked;
    });
  }
  root.lockdownWorker = lockdownWorker;
})(typeof self !== "undefined" ? self : globalThis);

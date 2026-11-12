(() => {
  "use strict";
  const BRIDGE = "pactus-isolated-playground";
  const params = new URLSearchParams(location.search);
  const parentOrigin = window.PactusIsolatedOriginPolicy?.allowParent(params.get("parent") || "") || "";
  const languages = new Set(["python", "sql", "bash"]);
  let active = null;
  let activeRunId = 0;
  let workerTimer = 0;

  function send(message) {
    if (parentOrigin) window.parent.postMessage({ bridge: BRIDGE, ...message }, parentOrigin);
  }

  function validCommand(value) {
    if (!value || typeof value !== "object" || value.bridge !== BRIDGE) return false;
    if (value.type === "ping") return true;
    if (!Number.isSafeInteger(value.runId) || value.runId < 1) return false;
    if (value.type === "cancel") return value.silent === undefined || typeof value.silent === "boolean";
    if (value.type !== "run" || !languages.has(value.language) || typeof value.code !== "string" || value.code.length > 30000) return false;
    return value.language !== "bash"
      || (typeof value.workerPath === "string" && /^\/_next\/static\/(?:webpack|chunks)\/[A-Za-z0-9._/-]+\.js$/.test(value.workerPath) && !value.workerPath.includes(".."));
  }

  function stop(runId, silent = false) {
    if (!active || runId !== activeRunId) return;
    window.clearTimeout(workerTimer);
    workerTimer = 0;
    active.terminate();
    active = null;
    if (!silent) send({ type: "output", runId, kind: "done", failed: true });
  }

  function run(command) {
    if (active) stop(activeRunId, true);
    activeRunId = command.runId;
    const path = command.language === "python"
      ? "/workers/python.worker.mjs"
      : command.language === "sql"
        ? "/workers/sql.worker.js"
        : command.workerPath;
    const moduleWorker = command.language !== "sql";
    let worker;
    try {
      worker = new Worker(new URL(path, location.origin), moduleWorker
        ? { type: "module", credentials: "omit", name: "pactus-isolated-runner" }
        : { type: "classic", name: "pactus-isolated-runner" });
    } catch {
      send({ type: "output", runId: command.runId, kind: "error", text: "Não foi possível iniciar o interpretador isolado." });
      send({ type: "output", runId: command.runId, kind: "done", failed: true });
      return;
    }
    active = worker;
    workerTimer = window.setTimeout(() => stop(command.runId), 12000);
    worker.onmessage = (event) => {
      if (active !== worker || activeRunId !== command.runId) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !["log", "error", "done"].includes(data.kind)) return;
      if (data.kind === "done") {
        window.clearTimeout(workerTimer);
        workerTimer = 0;
        send({ type: "output", runId: command.runId, kind: "done", failed: Boolean(data.failed) });
        worker.terminate();
        active = null;
        return;
      }
      if (typeof data.text === "string") send({ type: "output", runId: command.runId, kind: data.kind, text: data.text.slice(0, 12000) });
    };
    worker.onerror = (event) => {
      if (active !== worker || activeRunId !== command.runId) return;
      window.clearTimeout(workerTimer);
      workerTimer = 0;
      send({ type: "output", runId: command.runId, kind: "error", text: String(event.message || "O interpretador isolado falhou.").slice(0, 12000) });
      send({ type: "output", runId: command.runId, kind: "done", failed: true });
      worker.terminate();
      active = null;
    };
    worker.postMessage({ code: command.code });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !parentOrigin || event.origin !== parentOrigin || !validCommand(event.data)) return;
    if (event.data.type === "ping") send({ type: "ready" });
    else if (event.data.type === "cancel") stop(event.data.runId, Boolean(event.data.silent));
    else run(event.data);
  });

  window.addEventListener("pagehide", () => {
    window.clearTimeout(workerTimer);
    active?.terminate();
    active = null;
  }, { once: true });
})();

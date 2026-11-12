import { loadPyodide } from "/local-runtimes/python/pyodide.mjs";
import "/workers/lockdown.js";

const postWorkerMessage = self.postMessage.bind(self);
const PYODIDE_BASE = "/local-runtimes/python/";
const OUTPUT_LIMIT = 12000;
let outputBytes = 0;

function send(kind, text) {
  const value = String(text ?? "");
  const remaining = Math.max(0, OUTPUT_LIMIT - outputBytes);
  if (remaining === 0) return;
  const clipped = value.slice(0, remaining);
  outputBytes += clipped.length;
  postWorkerMessage({ kind, text: clipped });
}

self.onmessage = async (event) => {
  outputBytes = 0;
  try {
    const pyodide = await loadPyodide({
      indexURL: new URL(PYODIDE_BASE, self.location.href).href,
      stdout: (text) => send("log", text),
      stderr: (text) => send("error", text),
    });
    pyodide.setStdin({ error: true });
    pyodide.setStdout({ batched: (text) => send("log", text) });
    pyodide.setStderr({ batched: (text) => send("error", text) });

    // The interpreter has finished loading its bundled files. Before any user code, remove networking, storage
    // and nested workers from the whole global prototype chain (lockdown.js); refuse to run if anything is left.
    const left = self.lockdownWorker(self);
    if (left.length) throw new Error(`Isolamento incompleto (${left.join(", ")}); o código não foi executado.`);
    pyodide.runPython(String(event.data?.code ?? ""));
    postWorkerMessage({ kind: "done" });
  } catch (error) {
    postWorkerMessage({ kind: "error", text: String(error?.stack ?? error) });
    postWorkerMessage({ kind: "done", failed: true });
  }
};

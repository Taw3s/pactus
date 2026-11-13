import { Bash, initBashkit } from "@everruns/bashkit-wasm";
import { lockdownWorker } from "@/lib/worker-lockdown";

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<{ code?: string }>) => void) | null;
  postMessage: (message: unknown) => void;
};

const postWorkerMessage = workerScope.postMessage.bind(self);

workerScope.onmessage = async (event: MessageEvent<{ code?: string }>) => {
  try {
    await initBashkit("/local-runtimes/bash/bashkit_wasm_bg.wasm");
    // The interpreter is loaded: remove networking, storage and nested workers before running the script.
    const left = lockdownWorker(self);
    if (left.length) throw new Error(`Isolamento incompleto (${left.join(", ")}); o script não foi executado.`);
    const shell = new Bash({
      profile: "hardened",
      timeoutMs: 5000,
      maxCommands: 1500,
      maxLoopIterations: 1000,
      maxMemory: 16 * 1024 * 1024,
    });
    const result = await shell.execute(String(event.data?.code ?? ""), { capture: 12000 });
    if (result.stdout) postWorkerMessage({ kind: "log", text: result.stdout });
    if (result.stderr) postWorkerMessage({ kind: "error", text: result.stderr });
    postWorkerMessage({ kind: "done", failed: !result.success });
  } catch (error) {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    postWorkerMessage({ kind: "error", text: detail });
    postWorkerMessage({ kind: "done", failed: true });
  }
};

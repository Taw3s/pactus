"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe2, Play, RotateCcw, Terminal } from "lucide-react";
import type { LanguageExampleId } from "@/lib/typing-language-examples";
import type { TypingLang } from "@/lib/typing";
import { JAVA_CHECK_RESOURCES } from "@/lib/java-challenge-checks";
import { javaBrowserSource } from "@/lib/java-toolchain";
import { isPlaygroundRunnerMessage, PLAYGROUND_RUNNER_BRIDGE } from "@/lib/playground-runner-messages";
import { resolveIsolatedHostOrigin } from "@/lib/youtube-player-messages";
import { prepareExercise } from "@/lib/loop-guard";

type Props = {
  id: LanguageExampleId;
  code: string;
  expected: string;
  lang: TypingLang;
  /** Java only: standard input for the run (an approved challenge answer reads its first case from it). */
  stdin?: string;
};

type ConsoleLine = { kind: "log" | "warn" | "error"; text: string };
type WorkerLanguage = "python" | "sql" | "bash";

const PREVIEW_POLICY = "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; font-src data:; object-src 'none'; form-action 'none'; base-uri 'none'";
const SCRIPT_POLICY = "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; font-src data:; object-src 'none'; form-action 'none'; base-uri 'none'";
const BRIDGE = "pactus-code-playground";
const MAX_CONSOLE_LINES = 80;
const MAX_LINE_LENGTH = 1200;
const MAX_OUTPUT_LENGTH = 12000;
const RUN_TIMEOUT_MS = 5000;
const WORKER_TIMEOUT_MS = 10000;
const JAVA_TIMEOUT_MS = 45000;
let cachedBashWorkerPath: string | null = null;
// Present on the iframe before its first navigation: /aprender has COEP in Chromium, and a cross-origin frame without
// COEP of its own is only let in when credentialless. Setting it later (in a ref) is too late. Other browsers ignore it.
export const CREDENTIALLESS = { credentialless: "" } as Record<string, string>;

function createBashWorkerForUrlCapture(): Worker {
  return new Worker(new URL("../workers/bashkit.worker.ts", import.meta.url), { type: "module", credentials: "omit", name: "pactus-bash-path" });
}

export function resolveBashWorkerPath(): string {
  if (cachedBashWorkerPath) return cachedBashWorkerPath;
  const descriptor = Object.getOwnPropertyDescriptor(window, "Worker");
  if (!descriptor?.configurable || !descriptor.value) throw new Error("Bash worker is not available in this build.");
  let capturedUrl = "";
  const originalWorker = descriptor.value as typeof Worker;
  const interceptedWorker = new Proxy(originalWorker, {
    construct(_target, args) {
      capturedUrl = String(args[0]);
      return { terminate() {} } as unknown as Worker;
    },
  });
  try {
    Object.defineProperty(window, "Worker", { ...descriptor, value: interceptedWorker });
    createBashWorkerForUrlCapture();
  } finally {
    Object.defineProperty(window, "Worker", descriptor);
  }
  const url = new URL(capturedUrl, window.location.origin);
  const allowedDirectory = url.pathname.startsWith("/_next/static/webpack/") || url.pathname.startsWith("/_next/static/chunks/");
  if (url.origin !== window.location.origin || !allowedDirectory || !url.pathname.endsWith(".js") || url.pathname.includes("..")) {
    throw new Error("Bash worker asset failed isolated-host validation.");
  }
  cachedBashWorkerPath = url.pathname;
  return cachedBashWorkerPath;
}

function withPreviewPolicy(source: string) {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_POLICY}">`;
  const head = /<head\b[^>]*>/i;
  if (head.test(source)) return source.replace(head, (match) => `${match}${meta}`);
  const doctype = /^\s*<!doctype\s+html[^>]*>/i;
  if (doctype.test(source)) return source.replace(doctype, (match) => `${match}<head>${meta}</head>`);
  return `<!doctype html><html><head>${meta}<meta charset="utf-8"></head><body>${source}</body></html>`;
}

function scriptDocument(code: string, runId: number) {
  const safeInlineCode = code.replace(/<\/script/gi, "<\\/script");
  const bridge = JSON.stringify(BRIDGE);
  const shell = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${SCRIPT_POLICY}"><style>body{font:15px system-ui,sans-serif;margin:16px;color:#24272c}#pactus-playground-root{min-height:170px;padding:16px;border:1px dashed #9298a1;border-radius:8px;background:#fafafa}#pactus-playground-root:empty:before{content:'A prévia aparece quando o código altera a página.';color:#707782}</style></head><body><main id="pactus-playground-root"></main><script>(function(){const bridge=${bridge};const runId=${runId};const send=(kind,args)=>{let text;try{text=args.map(value=>{if(typeof value==='string')return value;try{return JSON.stringify(value)}catch{return String(value)}}).join(' ')}catch{text='Não foi possível mostrar este valor'};parent.postMessage({bridge,runId,kind,text:String(text).slice(0,${MAX_LINE_LENGTH})},'*')};for(const kind of ['log','warn','error','info']){const original=console[kind].bind(console);console[kind]=(...args)=>{send(kind==='warn'?'warn':kind==='error'?'error':'log',args);original(...args)}}window.onerror=(message,source,line,column,error)=>{send('error',[error?.stack||message]);return true};window.onunhandledrejection=(event)=>{send('error',[event.reason?.stack||event.reason||'Erro assíncrono'])}})();</script><script>${safeInlineCode}</script><script>parent.postMessage({bridge:${bridge},runId:${runId},kind:'done'},'*')</script></body></html>`;
  return shell;
}

function clampOutput(text: string) {
  return text.length > MAX_OUTPUT_LENGTH ? `${text.slice(0, MAX_OUTPUT_LENGTH)}\n… saída limitada` : text;
}

export function CodePlayground({ id, code, expected, lang, stdin }: Props) {
  const [source, setSource] = useState(code);
  const [liveDocument, setLiveDocument] = useState(() => withPreviewPolicy(code));
  const [runDocument, setRunDocument] = useState("");
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runMessage, setRunMessage] = useState("");
  const [runnerOrigin, setRunnerOrigin] = useState<string | null>(null);
  const [runnerReady, setRunnerReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Read through a ref, so stopActiveRun stays stable: when it changed with the runner origin, the reset effect below ran
  // again and threw away what the person had already typed.
  const runnerOriginRef = useRef<string | null>(null);
  const runnerFrameRef = useRef<HTMLIFrameElement>(null);
  const javaEngineRef = useRef<{ dispose: () => void } | null>(null);
  const activeRunRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const english = lang === "en";
  const webOnly = id === "web";
  const scriptLanguage = id === "javascript" || id === "typescript";
  const localRunner = id === "python" || id === "sql" || id === "bash" || id === "java";
  const needsIsolatedRunner = id === "python" || id === "sql" || id === "bash";
  const runnable = scriptLanguage || localRunner;
  const nonWebWithoutRunner = id === "fundamentals";

  const stopActiveRun = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const origin = runnerOriginRef.current;
    if (origin) runnerFrameRef.current?.contentWindow?.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "cancel", runId: activeRunRef.current, silent: true }, origin);
    javaEngineRef.current?.dispose();
    javaEngineRef.current = null;
  }, []);

  useEffect(() => () => {
    stopActiveRun();
  }, [stopActiveRun]);

  useEffect(() => {
    const origin = resolveIsolatedHostOrigin(process.env.NEXT_PUBLIC_ISOLATED_ORIGIN, window.location.origin, process.env.NODE_ENV !== "production");
    runnerOriginRef.current = origin;
    setRunnerOrigin(origin);
  }, []);

  useEffect(() => {
    setSource(code);
    setLiveDocument(withPreviewPolicy(code));
    setRunDocument("");
    setConsoleLines([]);
    setRunStatus("idle");
    setRunMessage("");
    stopActiveRun();
    activeRunRef.current += 1;
  }, [code, id, lang, stopActiveRun]);

  useEffect(() => {
    if (!webOnly) return;
    const timer = window.setTimeout(() => setLiveDocument(withPreviewPolicy(source)), 180);
    return () => window.clearTimeout(timer);
  }, [source, webOnly]);

  useEffect(() => {
    if (!scriptLanguage) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as Partial<{ bridge: string; runId: number; kind: ConsoleLine["kind"] | "done"; text: string }>;
      if (data.bridge !== BRIDGE || data.runId !== activeRunRef.current) return;
      if (data.kind === "done") {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setRunStatus("done");
        setRunMessage(english
          ? "Executed in an isolated browser frame. Network requests and access to this app are blocked."
          : "Executado em um quadro isolado do navegador. Acesso a esta aplicação e pedidos de rede estão bloqueados.");
        return;
      }
      if (!data.text) return;
      setConsoleLines((current) => current.length >= MAX_CONSOLE_LINES
        ? current
        : [...current, { kind: data.kind === "error" || data.kind === "warn" ? data.kind : "log", text: data.text!.slice(0, MAX_LINE_LENGTH) }]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [scriptLanguage, english]);

  useEffect(() => {
    if (!needsIsolatedRunner || !runnerOrigin) return;
    const onRunnerMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== runnerFrameRef.current?.contentWindow || event.origin !== runnerOrigin || !isPlaygroundRunnerMessage(event.data)) return;
      const message = event.data;
      if (message.type === "ready") { setRunnerReady(true); return; }
      if (message.runId !== activeRunRef.current) return;
      if (message.kind === "done") {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        setRunStatus(message.failed ? "error" : "done");
        setRunMessage(english ? "Executed on an isolated hostname without the signed-in app session." : "Executado em um hostname isolado, sem a sessão autenticada do Pacto.");
        return;
      }
      if (!message.text) return;
      const chunks = message.text.match(/[\s\S]{1,1200}/g) ?? [];
      setConsoleLines((current) => current.length >= MAX_CONSOLE_LINES ? current : [...current, ...chunks.slice(0, MAX_CONSOLE_LINES - current.length).map((text) => ({ kind: message.kind === "error" ? "error" as const : "log" as const, text }))]);
    };
    window.addEventListener("message", onRunnerMessage);
    return () => window.removeEventListener("message", onRunnerMessage);
  }, [english, needsIsolatedRunner, runnerOrigin]);

  useEffect(() => {
    if (!needsIsolatedRunner || !runnerOrigin || runnerReady) return;
    const ping = () => runnerFrameRef.current?.contentWindow?.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "ping" }, runnerOrigin);
    ping();
    const pingTimer = window.setInterval(ping, 500);
    return () => {
      window.clearInterval(pingTimer);
    };
  }, [needsIsolatedRunner, runnerOrigin, runnerReady]);

  function appendLine(kind: ConsoleLine["kind"], text: string) {
    const clipped = clampOutput(text);
    const chunks = clipped.match(new RegExp(`[\\s\\S]{1,${MAX_LINE_LENGTH}}`, "g")) ?? [];
    if (!chunks.length) return;
    setConsoleLines((current) => [...current, ...chunks.slice(0, Math.max(0, MAX_CONSOLE_LINES - current.length)).map((chunk) => ({ kind, text: chunk }))]);
  }

  function runWorker(language: WorkerLanguage, runId: number) {
    const runner = runnerFrameRef.current?.contentWindow;
    if (!runnerOrigin || !runnerReady || !runner) {
      setRunStatus("error");
      setRunMessage(english ? "Code execution is unavailable until the isolated runner hostname is configured." : "A execução está desativada até configurar o hostname isolado do interpretador.");
      return;
    }
    let workerPath: string | undefined;
    try {
      if (language === "bash") workerPath = resolveBashWorkerPath();
    } catch (error) {
      setRunStatus("error");
      setRunMessage(String(error instanceof Error ? error.message : error));
      return;
    }
    const command = { bridge: PLAYGROUND_RUNNER_BRIDGE, type: "run", runId, language, code: source, ...(workerPath ? { workerPath } : {}) };
    runner.postMessage(command, runnerOrigin);
    timeoutRef.current = window.setTimeout(() => {
      if (activeRunRef.current !== runId) return;
      runner.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "cancel", runId, silent: true }, runnerOrigin);
      timeoutRef.current = null;
      setRunStatus("error");
      setRunMessage(english ? "Stopped after 10 seconds to keep the lab responsive." : "Interrompido após 10 segundos para manter o laboratório responsivo.");
      appendLine("error", english ? "Execution time limit reached." : "Limite de tempo de execução atingido.");
    }, WORKER_TIMEOUT_MS);
  }

  async function runJava(runId: number) {
    if (!window.crossOriginIsolated) {
      const message = english
        ? "Java's WebAssembly compiler needs cross-origin isolation. The Firefox profile keeps video lessons available; use Chrome or Edge to run Java."
        : "O compilador Java em WebAssembly precisa de isolamento entre origens. No Firefox, as vídeo-aulas ficam disponíveis; use Chrome ou Edge para executar Java.";
      setRunStatus("error");
      setRunMessage(message);
      appendLine("error", message);
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      javaEngineRef.current?.dispose();
      javaEngineRef.current = null;
      if (activeRunRef.current !== runId) return;
      activeRunRef.current += 1;
      setRunStatus("error");
      setRunMessage(english ? "Java compile/run exceeded the 45 second safety limit." : "A compilação/execução Java passou do limite de segurança de 45 segundos.");
      appendLine("error", english ? "Java run timed out." : "Tempo limite da execução Java atingido.");
    }, JAVA_TIMEOUT_MS);

    try {
      setRunMessage(english ? "Preparing the local Java WebAssembly runtime…" : "Preparando o interpretador Java local em WebAssembly…");
      const { createBrowserEngine } = await import("@wasm-oj/browser");
      if (activeRunRef.current !== runId) return;
      const engine = await createBrowserEngine({ toolchains: [javaBrowserSource("/toolchains/")] });
      javaEngineRef.current = engine;
      await engine.ready();
      if (activeRunRef.current !== runId) return;
      setRunMessage(english ? "Compiling the Java example locally…" : "Compilando o exemplo Java localmente…");
      const build = await engine.compile({
        language: "java",
        entry: "Main.java",
        files: { "Main.java": source },
        target: "wasip1",
        optimization: "debug",
        name: "Pacto Java local",
      }, { cache: false });

      for (const diagnostic of build.diagnostics) {
        appendLine(diagnostic.severity === "error" ? "error" : "warn", `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ${diagnostic.message}`);
      }
      if (!build.success || !build.artifact) {
        if (build.diagnostics.length === 0 && build.stderr) appendLine("error", build.stderr);
        setRunStatus("error");
        setRunMessage(english ? "Java compilation failed. Read the diagnostic above." : "A compilação Java falhou. Confira o diagnóstico acima.");
        return;
      }

      setRunMessage(english ? "Running the compiled program in a bounded WebAssembly sandbox…" : "Executando o programa compilado em um ambiente WebAssembly com limites…");
      const result = await engine.run(build.artifact, {
        stdin: stdin ?? "",
        resources: {
          // An answer that reads its input with java.util.Scanner needs the challenge check's budget.
          instructionBudget: stdin ? JAVA_CHECK_RESOURCES.instructionBudget : 50_000_000,
          logicalTimeLimitMs: 5000,
          memoryLimitBytes: 64 * 1024 * 1024,
          outputLimitBytes: MAX_OUTPUT_LENGTH,
          filesystemWriteLimitBytes: 1024 * 1024,
          filesystemEntryLimit: 32,
          wallTimeLimitMs: 8000,
        },
      });
      if (result.stdout) appendLine("log", result.stdout);
      if (result.stderr) appendLine("error", result.stderr);
      if (result.trapMessage) appendLine("error", result.trapMessage);
      const failed = result.code !== 0 || result.termination !== "exited";
      setRunStatus(failed ? "error" : "done");
      setRunMessage(english
        ? `Java program finished with exit code ${result.code} (${result.termination}). The source stayed on this device.`
        : `Programa Java finalizado com código ${result.code} (${result.termination}). O código permaneceu neste dispositivo.`);
    } catch (error) {
      if (activeRunRef.current === runId) {
        appendLine("error", String(error instanceof Error ? error.message : error));
        setRunStatus("error");
        setRunMessage(english ? "The local Java runtime could not finish this run." : "O interpretador Java local não conseguiu concluir esta execução.");
      }
    } finally {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      javaEngineRef.current?.dispose();
      javaEngineRef.current = null;
    }
  }

  async function runCode() {
    setRunStatus("running");
    setRunMessage("");
    setConsoleLines([]);
    setRunDocument("");
    stopActiveRun();
    const runId = activeRunRef.current + 1;
    activeRunRef.current = runId;

    if (id === "python" || id === "sql" || id === "bash") {
      runWorker(id, runId);
      return;
    }
    if (id === "java") {
      void runJava(runId);
      return;
    }

    // JavaScript and TypeScript both go through the compiler, which puts a time guard in every loop (loop-guard.ts): a
    // synchronous infinite loop in the iframe would otherwise freeze the whole tab before the 5 s timer below could run.
    let executable: string;
    try {
      const ts = await import("typescript");
      if (activeRunRef.current !== runId) return;
      const prepared = prepareExercise(ts, source, id === "typescript");
      if ("errors" in prepared) {
        appendLine("error", prepared.errors);
        setRunStatus("error");
        setRunMessage(id === "typescript"
          ? (english ? "TypeScript could not be converted to JavaScript." : "Não foi possível converter o TypeScript para JavaScript.")
          : (english ? "The code has a syntax error." : "O código tem um erro de sintaxe."));
        return;
      }
      executable = prepared.code;
    } catch {
      appendLine("error", english ? "The code checker could not be loaded." : "Não foi possível carregar o verificador de código.");
      setRunStatus("error");
      return;
    }

    setRunDocument(scriptDocument(executable, runId));
    timeoutRef.current = window.setTimeout(() => {
      activeRunRef.current += 1;
      setRunStatus("error");
      setRunMessage(english ? "Stopped after 5 seconds to keep the page responsive." : "Interrompido após 5 segundos para manter a página responsiva.");
      appendLine("error", english ? "Execution time limit reached." : "Limite de tempo de execução atingido.");
      setRunDocument("");
    }, RUN_TIMEOUT_MS);
  }

  function clearConsole() {
    stopActiveRun();
    activeRunRef.current += 1;
    setConsoleLines([]);
    setRunMessage("");
    setRunStatus("idle");
    setRunDocument("");
  }

  const helperText = webOnly
    ? (english ? "Edit HTML and CSS; the preview refreshes as you type. JavaScript is disabled in this view." : "Edite HTML e CSS; a prévia atualiza enquanto você digita. JavaScript fica desativado nesta visualização.")
    : scriptLanguage
      ? (english ? "Edit the example, run it, and inspect the page and console below." : "Edite o exemplo, execute e acompanhe a página e o console abaixo.")
      : needsIsolatedRunner && !runnerOrigin
        ? (english ? "Python, SQL, and Bash wait for a separate runner hostname so code never shares the signed-in app origin." : "Python, SQL e Bash aguardam um hostname separado para que o código não compartilhe a origem autenticada do Pacto.")
        : needsIsolatedRunner && !runnerReady
          ? (english ? "Connecting to the isolated code runner…" : "Conectando ao interpretador isolado…")
          : id === "python"
            ? (english ? "Python runs in a disposable worker on the isolated hostname, without the signed-in app session." : "Python roda em um worker descartável no hostname isolado, sem a sessão autenticada do Pacto.")
            : id === "sql"
              ? (english ? "SQLite uses a fresh in-memory database inside the isolated runner hostname." : "SQLite usa um banco em memória dentro do hostname isolado.")
              : id === "bash"
                ? (english ? "Bash-compatible commands run in a disposable worker on the isolated hostname with resource limits." : "Comandos compatíveis com Bash rodam em um worker descartável no hostname isolado, com limites de recursos.")
                : id === "java"
                  ? (english ? "Java compiles to WebAssembly locally in a bounded learning runtime; cross-origin isolation is available in Chrome and Edge." : "Java compila localmente para WebAssembly em um runtime de estudo com limites; o isolamento necessário fica disponível no Chrome e no Edge.")
                  : (english ? "Pseudocode is a teaching notation, so the terminal shows the reference output without claiming to execute it." : "Pseudocódigo é uma notação de ensino; o terminal mostra a saída de referência sem afirmar que executou o código.");

  return <section className="mt-4 rounded-sm border-2 border-accent/50 bg-raised p-3" data-testid="code-playground">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="paper-label">{english ? "After the challenge" : "Depois do desafio"}</p>
        <h3 className="pixel mt-2 flex items-center gap-2 text-base uppercase">{webOnly ? <Globe2 size={17} /> : nonWebWithoutRunner ? <Terminal size={17} /> : <Play size={15} />} {webOnly ? (english ? "Web preview" : "Prévia Web") : runnable ? (english ? "Code playground" : "Playground de código") : (english ? "Pseudocode output" : "Saída do pseudocódigo")}</h3>
        <p className="mt-1 text-sm text-muted">{helperText}</p>
      </div>
      {runnable && <div className="flex gap-2">
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-accent bg-accent px-3 text-xs font-semibold text-on-accent disabled:opacity-60" disabled={runStatus === "running" || (needsIsolatedRunner && !runnerReady)} onClick={() => void runCode()}><Play size={14} /> {english ? "Run" : "Executar"}</button>
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-bevel-dark px-3 text-xs font-semibold text-muted hover:text-fg" onClick={clearConsole}><RotateCcw size={14} /> {english ? "Clear" : "Limpar"}</button>
      </div>}
    </div>

    <label className="mt-3 block text-xs font-semibold text-muted">{english ? "Editable code" : "Código editável"}
      <textarea className="mt-1 min-h-48 w-full resize-y rounded-sm border-2 border-bevel-dark bg-bg p-3 font-mono text-xs leading-5 text-fg focus:border-accent focus:outline-none" spellCheck={false} autoCapitalize="off" autoCorrect="off" maxLength={30000} value={source} onChange={(event) => setSource(event.target.value)} aria-label={english ? "Editable playground code" : "Código editável do playground"} />
    </label>

    {id === "java" && stdin && <p className="mt-2 text-xs text-muted" data-testid="playground-stdin">{english ? "Standard input of this run (first case):" : "Entrada padrão desta execução (caso 1):"} <code className="whitespace-pre-wrap font-mono">{stdin.trim().replace(/\n/g, " ↵ ")}</code></p>}

    {needsIsolatedRunner && !runnerOrigin && <p className="mt-3 rounded-sm border border-pending/60 bg-warn-bg p-3 text-xs text-muted" role="status">
      {english
        ? "Python, SQL, and Bash are paused until the separate runner hostname is configured. This keeps untrusted code away from your signed-in session."
        : "Python, SQL e Bash estão pausados até configurar o hostname separado do interpretador. Isso mantém código não confiável longe da sua sessão autenticada."}
    </p>}
    {needsIsolatedRunner && runnerOrigin && <iframe
      {...CREDENTIALLESS}
      ref={(frame) => {
        runnerFrameRef.current = frame;
      }}
      title={english ? "Isolated code runner" : "Interpretador isolado de código"}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer"
      aria-hidden="true"
      tabIndex={-1}
      hidden
      src={runnerOrigin + "/playground-runner.html?parent=" + encodeURIComponent(window.location.origin)}
      onLoad={() => runnerFrameRef.current?.contentWindow?.postMessage({ bridge: PLAYGROUND_RUNNER_BRIDGE, type: "ping" }, runnerOrigin)}
    />}

    {webOnly && <div className="mt-3 overflow-hidden rounded-sm border-2 border-divider bg-bg">
      <div className="flex items-center gap-2 border-b border-divider px-3 py-2 text-xs font-semibold text-muted"><Globe2 size={14} /> {english ? "Live page" : "Página ao vivo"}<span className="ml-auto text-[10px] text-accent">{english ? "Auto-updating" : "Atualização automática"}</span></div>
      <iframe title={english ? "Live HTML and CSS preview" : "Prévia ao vivo de HTML e CSS"} sandbox="" referrerPolicy="no-referrer" className="h-72 w-full bg-white" srcDoc={liveDocument} />
    </div>}

    {scriptLanguage && <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <section className="overflow-hidden rounded-sm border-2 border-divider bg-bg">
        <h4 className="flex items-center gap-2 border-b border-divider px-3 py-2 text-xs font-semibold text-muted"><Globe2 size={14} /> {english ? "Web preview" : "Prévia Web"}</h4>
        <iframe ref={frameRef} title={english ? "Isolated JavaScript web preview" : "Prévia Web isolada de JavaScript"} sandbox="allow-scripts" referrerPolicy="no-referrer" className="h-64 w-full bg-white" srcDoc={runDocument || "<!doctype html><html><body style='font:14px system-ui;padding:16px;color:#555'>" + (english ? "Run the code to see its page changes." : "Execute o código para ver as mudanças na página.") + "</body></html>"} />
      </section>
      <section className="overflow-hidden rounded-sm border-2 border-divider bg-[#17191d] text-[#edf0f3]" aria-live="polite">
        <ConsolePanel english={english} runStatus={runStatus} consoleLines={consoleLines} runMessage={runMessage} />
      </section>
    </div>}

    {localRunner && <section className="mt-3 overflow-hidden rounded-sm border-2 border-divider bg-[#17191d] text-[#edf0f3]" aria-live="polite">
      <h4 className="flex items-center gap-2 border-b border-[#3a3e45] px-3 py-2 text-xs font-semibold text-[#c6ccd5]"><Terminal size={14} /> {english ? "Local terminal" : "Terminal local"}<span className="ml-auto text-[10px] text-[#93a0ae]">{runStatus === "running" ? (english ? "Running" : "Executando") : `${consoleLines.length}/${MAX_CONSOLE_LINES}`}</span></h4>
      <div className="min-h-28 max-h-72 overflow-auto p-3 font-mono text-xs leading-5">
        {runStatus === "idle" && <p className="text-[#929aa4]">$ {english ? `run ${id}` : `executar ${id}`}</p>}
        {consoleLines.map((line, index) => <pre key={`${index}-${line.text}`} className={`whitespace-pre-wrap break-words ${line.kind === "error" ? "text-[#ff9999]" : line.kind === "warn" ? "text-[#ffd27d]" : "text-[#e3e8ee]"}`}>{line.text}</pre>)}
        {runStatus === "done" && consoleLines.length === 0 && <p className="text-[#929aa4]">{english ? "Code ran without output." : "O código foi executado sem saída."}</p>}
        {runMessage && <p className="mt-2 border-t border-[#3a3e45] pt-2 text-[#a9b3bf]">{runMessage}</p>}
      </div>
    </section>}

    {nonWebWithoutRunner && <div className="mt-3 overflow-hidden rounded-sm border-2 border-divider bg-[#17191d] text-[#edf0f3]" aria-live="polite">
      <h4 className="flex items-center gap-2 border-b border-[#3a3e45] px-3 py-2 text-xs font-semibold text-[#c6ccd5]"><Terminal size={14} /> {english ? "Reference output" : "Saída de referência"}</h4>
      <div className="min-h-28 p-3 font-mono text-xs leading-5"><p className="text-[#93a0ae]">{english ? "Pseudocode is not executed." : "Este pseudocódigo não é executado."}</p><p className="mt-2 whitespace-pre-wrap text-[#a9b3bf]">{expected}</p></div>
    </div>}
  </section>;
}

function ConsolePanel({ english, runStatus, consoleLines, runMessage }: {
  english: boolean;
  runStatus: "idle" | "running" | "done" | "error";
  consoleLines: ConsoleLine[];
  runMessage: string;
}) {
  return <>
    <h4 className="flex items-center gap-2 border-b border-[#3a3e45] px-3 py-2 text-xs font-semibold text-[#c6ccd5]"><Terminal size={14} /> {english ? "Console" : "Console"}<span className="ml-auto text-[10px] text-[#93a0ae]">{consoleLines.length}/{MAX_CONSOLE_LINES}</span></h4>
    <div className="h-64 overflow-auto p-3 font-mono text-xs leading-5">
      {runStatus === "idle" && <p className="text-[#929aa4]">{english ? "Press Run to see console output." : "Pressione Executar para ver a saída do console."}</p>}
      {consoleLines.map((line, index) => <pre key={`${index}-${line.text}`} className={`whitespace-pre-wrap break-words ${line.kind === "error" ? "text-[#ff9999]" : line.kind === "warn" ? "text-[#ffd27d]" : "text-[#e3e8ee]"}`}>{line.text}</pre>)}
      {runStatus === "done" && consoleLines.length === 0 && <p className="text-[#929aa4]">{english ? "Code ran without console output." : "O código foi executado sem saída no console."}</p>}
      {runMessage && <p className="mt-2 border-t border-[#3a3e45] pt-2 text-[#a9b3bf]">{runMessage}</p>}
    </div>
  </>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe2, Play, RotateCcw, Terminal } from "lucide-react";
import type { LanguageExampleId } from "@/lib/typing-language-examples";
import type { TypingLang } from "@/lib/typing";
import { javaBrowserSource } from "@/lib/java-toolchain";

type Props = {
  id: LanguageExampleId;
  code: string;
  expected: string;
  lang: TypingLang;
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

export function CodePlayground({ id, code, expected, lang }: Props) {
  const [source, setSource] = useState(code);
  const [liveDocument, setLiveDocument] = useState(() => withPreviewPolicy(code));
  const [runDocument, setRunDocument] = useState("");
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [runMessage, setRunMessage] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const javaEngineRef = useRef<{ dispose: () => void } | null>(null);
  const activeRunRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const english = lang === "en";
  const webOnly = id === "web";
  const scriptLanguage = id === "javascript" || id === "typescript";
  const localRunner = id === "python" || id === "sql" || id === "bash" || id === "java";
  const runnable = scriptLanguage || localRunner;
  const nonWebWithoutRunner = id === "fundamentals";

  const stopActiveRun = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    javaEngineRef.current?.dispose();
    javaEngineRef.current = null;
  }, []);

  useEffect(() => () => {
    stopActiveRun();
  }, [stopActiveRun]);

  useEffect(() => {
    setSource(code);
    setLiveDocument(withPreviewPolicy(code));
    setRunDocument("");
    setConsoleLines([]);
    setRunStatus("idle");
    setRunMessage("");
    activeRunRef.current += 1;
    stopActiveRun();
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

  function appendLine(kind: ConsoleLine["kind"], text: string) {
    const clipped = clampOutput(text);
    const chunks = clipped.match(new RegExp(`[\\s\\S]{1,${MAX_LINE_LENGTH}}`, "g")) ?? [];
    if (!chunks.length) return;
    setConsoleLines((current) => [...current, ...chunks.slice(0, Math.max(0, MAX_CONSOLE_LINES - current.length)).map((chunk) => ({ kind, text: chunk }))]);
  }

  function runWorker(language: WorkerLanguage, runId: number) {
    const worker = language === "bash"
      ? new Worker(new URL("../workers/bashkit.worker.ts", import.meta.url), { type: "module" })
      : new Worker(language === "python" ? "/workers/python.worker.mjs" : "/workers/sql.worker.js", { type: language === "python" ? "module" : "classic" });
    workerRef.current = worker;

    const finish = (failed: boolean) => {
      if (activeRunRef.current !== runId) return;
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setRunStatus(failed ? "error" : "done");
      setRunMessage(english
        ? "Ran locally in an isolated worker; its temporary state is cleared after this run."
        : "Executado localmente em um processo isolado; o estado temporário é apagado ao final desta execução.");
    };

    worker.onmessage = (event: MessageEvent<{ kind?: string; text?: string; failed?: boolean }>) => {
      if (activeRunRef.current !== runId) return;
      if (event.data.kind === "done") {
        finish(Boolean(event.data.failed));
      } else if (event.data.text) {
        appendLine(event.data.kind === "error" ? "error" : "log", event.data.text);
      }
    };
    worker.onerror = (event) => {
      appendLine("error", event.message || (english ? "The local interpreter failed to start." : "Não foi possível iniciar o interpretador local."));
      finish(true);
    };
    timeoutRef.current = window.setTimeout(() => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      timeoutRef.current = null;
      if (activeRunRef.current !== runId) return;
      setRunStatus("error");
      setRunMessage(english ? "Stopped after 10 seconds to keep the lab responsive." : "Interrompido após 10 segundos para manter o laboratório responsivo.");
      appendLine("error", english ? "Execution time limit reached." : "Limite de tempo de execução atingido.");
    }, WORKER_TIMEOUT_MS);
    worker.postMessage({ code: source });
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
        stdin: "",
        resources: {
          instructionBudget: 50_000_000,
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

    let executable = source;
    if (id === "typescript") {
      try {
        const ts = await import("typescript");
        const result = ts.transpileModule(source, {
          reportDiagnostics: true,
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, strict: true },
        });
        if (activeRunRef.current !== runId) return;
        const syntaxErrors = (result.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
        if (syntaxErrors.length) {
          const details = syntaxErrors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("\n");
          appendLine("error", details);
          setRunStatus("error");
          setRunMessage(english ? "TypeScript could not be converted to JavaScript." : "Não foi possível converter o TypeScript para JavaScript.");
          return;
        }
        executable = result.outputText;
      } catch {
        appendLine("error", english ? "The TypeScript compiler could not be loaded." : "Não foi possível carregar o compilador TypeScript.");
        setRunStatus("error");
        return;
      }
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
    activeRunRef.current += 1;
    stopActiveRun();
    setConsoleLines([]);
    setRunMessage("");
    setRunStatus("idle");
    setRunDocument("");
  }

  const helperText = webOnly
    ? (english ? "Edit HTML and CSS; the preview refreshes as you type. JavaScript is disabled in this view." : "Edite HTML e CSS; a prévia atualiza enquanto você digita. JavaScript fica desativado nesta visualização.")
    : scriptLanguage
      ? (english ? "Edit the example, run it, and inspect the page and console below." : "Edite o exemplo, execute e acompanhe a página e o console abaixo.")
      : id === "python"
        ? (english ? "Python runs locally through Pyodide in a disposable worker; it cannot access the page or network." : "Python roda localmente com Pyodide em um processo descartável; não acessa a página nem a rede.")
        : id === "sql"
          ? (english ? "SQLite runs locally against a fresh in-memory database for each run." : "SQLite roda localmente em um banco temporário novo a cada execução.")
          : id === "bash"
            ? (english ? "Bash-compatible commands run in a virtual filesystem with resource limits and network access disabled." : "Comandos compatíveis com Bash rodam em arquivos virtuais, com limites de recursos e sem acesso à rede.")
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
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-accent bg-accent px-3 text-xs font-semibold text-on-accent disabled:opacity-60" disabled={runStatus === "running"} onClick={() => void runCode()}><Play size={14} /> {english ? "Run" : "Executar"}</button>
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-sm border-2 border-bevel-dark px-3 text-xs font-semibold text-muted hover:text-fg" onClick={clearConsole}><RotateCcw size={14} /> {english ? "Clear" : "Limpar"}</button>
      </div>}
    </div>

    <label className="mt-3 block text-xs font-semibold text-muted">{english ? "Editable code" : "Código editável"}
      <textarea className="mt-1 min-h-48 w-full resize-y rounded-sm border-2 border-bevel-dark bg-bg p-3 font-mono text-xs leading-5 text-fg focus:border-accent focus:outline-none" spellCheck={false} autoCapitalize="off" autoCorrect="off" maxLength={30000} value={source} onChange={(event) => setSource(event.target.value)} aria-label={english ? "Editable playground code" : "Código editável do playground"} />
    </label>

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

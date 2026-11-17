// Aprender, JavaScript and TypeScript challenges without the visualizer: the answer is checked by what it does, not by
// its text. Each level has a few cases; the case's value is already declared when the answer starts (`entrada` in
// Portuguese, `input` in English) and the answer shows the result with console.log. The answer runs once per case, each
// in a new sandboxed frame of the page (check-frames.ts) with a time guard in every loop (loop-guard.ts), and what each
// case printed is compared line by line, ignoring spaces at the ends and blank lines. The data comes from the case, so
// printing a fixed answer fails the other cases.
//
// Why the page's frame and not the isolated host: this is where the playground already runs JavaScript (opaque origin,
// no network), the answer needs no interpreter to download, and it works without NEXT_PUBLIC_ISOLATED_ORIGIN.
import type { CaseResult } from "./bash-challenge-checks";
import type * as TS from "typescript";
import { inlineJson, type FrameReport, type FrameSpec } from "./check-frames";
import { prepareExercise } from "./loop-guard";
import type { BashDifficulty } from "./typing-code";
import type { TypingLang } from "./typing";

export type ScriptLanguage = "javascript" | "typescript";
export type ScriptCase = { label: Record<TypingLang, string>; input: Record<TypingLang, unknown>; expect: Record<TypingLang, string[]> };

/** The name the case's value has inside the answer. */
export const SCRIPT_INPUT_NAME: Record<TypingLang, string> = { pt: "entrada", en: "input" };
/** One case may run this long before it counts as stopped (the loop guard gives up after 1 s of one burst of work). */
export const SCRIPT_CASE_TIMEOUT_MS = 4000;

const both = <T,>(pt: T, en: T = pt) => ({ pt, en });
const label = (pt: string, en: string) => ({ pt, en });

const JAVASCRIPT: Record<BashDifficulty, ScriptCase[]> = {
  beginner: [
    {
      label: label("uma tarefa ativa e uma pausada", "one active task and one paused"),
      input: both<unknown>([{ nome: "Ler", ativa: true }, { nome: "Pausar", ativa: false }], [{ name: "Read", active: true }, { name: "Pause", active: false }]),
      expect: both(["Ler"], ["Read"]),
    },
    {
      label: label("duas ativas, com uma pausada no meio", "two active, with a paused one in between"),
      input: both<unknown>(
        [{ nome: "Ler", ativa: true }, { nome: "Pausar", ativa: false }, { nome: "Revisar", ativa: true }],
        [{ name: "Read", active: true }, { name: "Pause", active: false }, { name: "Review", active: true }],
      ),
      expect: both(["Ler, Revisar"], ["Read, Review"]),
    },
    {
      label: label("só a última ativa", "only the last one active"),
      input: both<unknown>([{ nome: "Dormir", ativa: false }, { nome: "Correr", ativa: true }], [{ name: "Sleep", active: false }, { name: "Run", active: true }]),
      expect: both(["Correr"], ["Run"]),
    },
  ],
  easy: [
    { label: label("três nomes", "three names"), input: both<unknown>(["ana", "bia", "caio"]), expect: both(['["ANA","BIA","CAIO"]']) },
    { label: label("um nome só", "a single name"), input: both<unknown>(["lia"]), expect: both(['["LIA"]']) },
  ],
  medium: [
    { label: label("três valores", "three values"), input: both<unknown>([12, 8, 5]), expect: both(["25"]) },
    { label: label("lista vazia", "empty list"), input: both<unknown>([]), expect: both(["0"]) },
    { label: label("com um valor negativo", "with a negative value"), input: both<unknown>([-3, 3, 10]), expect: both(["10"]) },
  ],
  hard: [
    {
      label: label("dois estados", "two statuses"),
      input: both<unknown>(
        [{ nome: "Ler", estado: "feita" }, { nome: "Praticar", estado: "pendente" }, { nome: "Revisar", estado: "feita" }],
        [{ name: "Read", status: "done" }, { name: "Practice", status: "pending" }, { name: "Review", status: "done" }],
      ),
      expect: both(['{"feita":["Ler","Revisar"],"pendente":["Praticar"]}'], ['{"done":["Read","Review"],"pending":["Practice"]}']),
    },
    {
      label: label("todas no mesmo estado", "all with the same status"),
      input: both<unknown>([{ nome: "Correr", estado: "pendente" }, { nome: "Ler", estado: "pendente" }], [{ name: "Run", status: "pending" }, { name: "Read", status: "pending" }]),
      expect: both(['{"pendente":["Correr","Ler"]}'], ['{"pending":["Run","Read"]}']),
    },
  ],
  expert: [
    {
      label: label("duas categorias, uma repetida", "two categories, one repeated"),
      input: both<unknown>(
        [{ categoria: "livros", valor: 12 }, { categoria: "jogos", valor: 8 }, { categoria: "livros", valor: 5 }],
        [{ category: "games", value: 8 }, { category: "books", value: 12 }, { category: "books", value: 5 }],
      ),
      expect: both(["jogos: 8", "livros: 17"], ["books: 17", "games: 8"]),
    },
    {
      label: label("três categorias fora de ordem", "three categories out of order"),
      input: both<unknown>(
        [{ categoria: "sucos", valor: 3 }, { categoria: "cafés", valor: 2 }, { categoria: "doces", valor: 7 }, { categoria: "cafés", valor: 4 }],
        [{ category: "tea", value: 3 }, { category: "coffee", value: 2 }, { category: "snacks", value: 7 }, { category: "coffee", value: 4 }],
      ),
      expect: both(["cafés: 6", "doces: 7", "sucos: 3"], ["coffee: 6", "snacks: 7", "tea: 3"]),
    },
  ],
};

const TYPESCRIPT: Record<BashDifficulty, ScriptCase[]> = {
  beginner: [
    { label: label("tarefa pendente", "pending task"), input: both<unknown>({ nome: "Estudar", concluida: false }, { name: "Study", completed: false }), expect: both(["Pendente"], ["Pending"]) },
    { label: label("tarefa concluída", "completed task"), input: both<unknown>({ nome: "Ler", concluida: true }, { name: "Read", completed: true }), expect: both(["Feita"], ["Done"]) },
  ],
  easy: [
    { label: label("estado pendente", "pending status"), input: both<unknown>("pendente", "pending"), expect: both(["Em andamento"], ["In progress"]) },
    { label: label("estado feito", "done status"), input: both<unknown>("feito", "done"), expect: both(["Concluída"], ["Completed"]) },
  ],
  medium: [
    { label: label("lista de números", "list of numbers"), input: both<unknown>([4, 8, 12]), expect: both(["4"]) },
    { label: label("lista vazia", "empty list"), input: both<unknown>([]), expect: both(["undefined"]) },
    { label: label("lista de textos", "list of strings"), input: both<unknown>(["sol", "lua"], ["sun", "moon"]), expect: both(["sol"], ["sun"]) },
  ],
  hard: [
    {
      label: label("evento de conclusão", "completion event"),
      input: both<unknown>({ tipo: "concluido", tarefa: "Estudar" }, { kind: "completed", task: "Study" }),
      expect: both(["Concluída: Estudar"], ["Completed: Study"]),
    },
    {
      label: label("evento de cancelamento", "cancellation event"),
      input: both<unknown>({ tipo: "cancelado", motivo: "Chuva" }, { kind: "cancelled", reason: "Rain" }),
      expect: both(["Cancelada: Chuva"], ["Cancelled: Rain"]),
    },
  ],
  expert: [
    {
      label: label("dois setores", "two teams"),
      input: both<unknown>(
        [{ nome: "Ana", setor: "A" }, { nome: "Bia", setor: "B" }, { nome: "Caio", setor: "A" }],
        [{ name: "Ana", team: "A" }, { name: "Bea", team: "B" }, { name: "Kai", team: "A" }],
      ),
      expect: both(["A: Ana, Caio", "B: Bia"], ["A: Ana, Kai", "B: Bea"]),
    },
    {
      label: label("setores fora de ordem", "teams out of order"),
      input: both<unknown>([{ nome: "Davi", setor: "C" }, { nome: "Eva", setor: "B" }], [{ name: "Dave", team: "C" }, { name: "Eve", team: "B" }]),
      expect: both(["B: Eva", "C: Davi"], ["B: Eve", "C: Dave"]),
    },
  ],
};

export const SCRIPT_CHECKS: Record<ScriptLanguage, Record<BashDifficulty, ScriptCase[]>> = { javascript: JAVASCRIPT, typescript: TYPESCRIPT };

/** The case's value as the panel and the playground show it: JSON on one line. */
export function scriptInputText(c: ScriptCase, lang: TypingLang) {
  return JSON.stringify(c.input[lang]);
}

// No network at all, like the playground's script frame.
const POLICY = "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; font-src data:; object-src 'none'; form-action 'none'; base-uri 'none'";

/**
 * The document of one case. `prepared` is the answer after prepareExercise (TypeScript converted, loops guarded). The
 * first script declares the case's value and sends each console.log to the page: a string as it is, anything else as
 * JSON (undefined and functions as text), arguments separated by a space. console.warn and console.error are not part of
 * the output. An uncaught error fails the case. "done" leaves one task after the answer, so what promises print counts.
 */
export function buildScriptCaseDocument(prepared: string, input: unknown, lang: TypingLang, token: string, index: number) {
  if (!/^[A-Z0-9_]{12,40}$/.test(token)) throw new Error("invalid token");
  const answer = prepared.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
  const harness = `const ${SCRIPT_INPUT_NAME[lang]}=(()=>{const post=(kind,text)=>parent.postMessage({bridge:${inlineJson(token)},index:${index},kind,text:String(text).slice(0,1200)},"*");`
    + `const show=(value)=>{if(typeof value==="string")return value;let text;try{text=JSON.stringify(value)}catch{}return text===undefined?String(value):text};`
    + `const line=(...args)=>{let text;try{text=args.map(show).join(" ")}catch{text="?"}for(const part of text.split("\\n"))post("line",part)};`
    + `console.log=line;console.info=line;console.debug=line;console.warn=()=>{};console.error=()=>{};`
    + `window.onerror=(message,source,row,column,error)=>{post("error",error&&error.name?error.name+": "+error.message:message);return true};`
    + `window.onunhandledrejection=(event)=>{const r=event.reason;post("error",r&&r.name?r.name+": "+r.message:r)};`
    + `window.__pactoDone=()=>setTimeout(()=>post("done",""),0);`
    + `return JSON.parse(${inlineJson(JSON.stringify(input))})})();`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${POLICY}"></head><body>`
    + `<script>${harness}</script><script>${answer}</script><script>window.__pactoDone()</script></body></html>`;
}

/** Compares what each case's frame reported. A case that did not finish, or ended in an error, fails. */
export function compareScriptReports(reports: FrameReport[], cases: ScriptCase[], lang: TypingLang): CaseResult[] {
  return cases.map((c, i) => {
    const expected = c.expect[lang];
    const r = reports[i];
    if (!r) return { ok: false, got: [], expected };
    const got = r.lines.map((l) => l.trim()).filter(Boolean);
    const error = r.error || (r.done ? "" : lang === "pt" ? "A execução não terminou a tempo e foi interrompida." : "The run did not finish in time and was stopped.");
    return { ok: !error && got.length === expected.length && got.every((l, n) => l === expected[n]), got, expected, ...(error ? { error: error.slice(0, 400) } : {}) };
  });
}

/** How the frames are run: runCheckFrames in the app; the tests hand the same function to a real browser. */
export type FrameRunner = (specs: FrameSpec[], token: string, timeoutMs: number) => Promise<FrameReport[]>;

/**
 * The whole check of one answer: convert it (TypeScript, loop guards), run it once per case and compare. A syntax error
 * comes back as `errors`: no case could run.
 */
export async function checkScriptAnswer(
  ts: typeof TS, code: string, language: ScriptLanguage, difficulty: BashDifficulty, lang: TypingLang, token: string, run: FrameRunner,
): Promise<{ results: CaseResult[] } | { errors: string }> {
  const prepared = prepareExercise(ts, code, language === "typescript");
  if ("errors" in prepared) return prepared;
  const cases = SCRIPT_CHECKS[language][difficulty];
  const reports = await run(cases.map((c, i) => ({ html: buildScriptCaseDocument(prepared.code, c.input[lang], lang, token, i), width: 320, height: 200 })), token, SCRIPT_CASE_TIMEOUT_MS);
  return { results: compareScriptReports(reports, cases, lang) };
}

/** Put before an approved answer in the playground, so it gets the first case's value there too. */
export function scriptPlaygroundPrelude(c: ScriptCase, lang: TypingLang) {
  return `const ${SCRIPT_INPUT_NAME[lang]} = ${JSON.stringify(c.input[lang])};\n\n`;
}

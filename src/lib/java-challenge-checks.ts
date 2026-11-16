// Aprender, Java challenges without the visualizer: the answer is checked by what it does, not by its text. Each level
// has a few cases; the answer is compiled once on the device (WASM-OJ + TeaVM, the playground's toolchain, which only
// exists with cross-origin isolation) and runs once per case, each run a new WebAssembly instance with the case's text
// on standard input. What each run printed is compared line by line, ignoring spaces at the ends and blank lines. The
// data comes from the case, so printing a fixed answer fails the other cases.
//
// TeaVM's class library is not the whole JDK: a missing method (Collectors.counting, for one) stops the compilation
// with the backend's message. The references here are compiled and run for real by the tests.
import type { BashCase, CaseResult } from "./bash-challenge-checks";
import type { BashDifficulty } from "./typing-code";
import type { TypingLang } from "./typing";

export type JavaCase = Pick<BashCase, "label" | "expect"> & { stdin: string };

/**
 * Limits of one run. The playground's, except the instruction budget: java.util.Scanner alone spends more than the
 * playground's 50 million to read a line of numbers. An endless loop still ends in well under a second.
 */
export const JAVA_CHECK_RESOURCES = {
  instructionBudget: 200_000_000,
  logicalTimeLimitMs: 5000,
  memoryLimitBytes: 64 * 1024 * 1024,
  outputLimitBytes: 12000,
  filesystemWriteLimitBytes: 1024 * 1024,
  filesystemEntryLimit: 32,
  wallTimeLimitMs: 8000,
};
/** Compiling and running every case may take this long in all. */
export const JAVA_CHECK_TIMEOUT_MS = 60000;

const both = <T,>(pt: T, en: T = pt) => ({ pt, en });
const label = (pt: string, en: string) => ({ pt, en });
type Source = { label: Record<TypingLang, string>; stdin: Record<TypingLang, string>; expect: Record<TypingLang, string[]> };

const SOURCES: Record<BashDifficulty, Source[]> = {
  beginner: [
    { label: label("negativos, zero e positivos", "negative values, zero and positives"), stdin: both("-2 4 0 7\n"), expect: both(["2"]) },
    { label: label("só positivos", "only positives"), stdin: both("5 1 9\n"), expect: both(["3"]) },
    { label: label("nenhum positivo", "no positive value"), stdin: both("-1 0\n"), expect: both(["0"]) },
  ],
  easy: [
    { label: label("nomes curtos e longos", "short and long names"), stdin: both("Ana Bruno Bia Caio\n", "Ana Bruno Bea Caio\n"), expect: both(["[Bruno, Caio]"]) },
    { label: label("só nomes curtos", "only short names"), stdin: both("Ana Bia\n", "Ana Bea\n"), expect: both(["[]"]) },
    { label: label("o primeiro e o último são longos", "the first and the last are long"), stdin: both("Davi Eva Fernanda\n", "Dave Eve Fernanda\n"), expect: both(["[Davi, Fernanda]"], ["[Dave, Fernanda]"]) },
  ],
  medium: [
    { label: label("três notas", "three scores"), stdin: both("8 5 9\n"), expect: both(["Média: 7.333333333333333", "Aprovadas: 2"], ["Average: 7.333333333333333", "Passing: 2"]) },
    { label: label("duas notas", "two scores"), stdin: both("10 6\n"), expect: both(["Média: 8.0", "Aprovadas: 1"], ["Average: 8.0", "Passing: 1"]) },
    { label: label("ninguém aprovado", "nobody passing"), stdin: both("4 5 6\n"), expect: both(["Média: 5.0", "Aprovadas: 0"], ["Average: 5.0", "Passing: 0"]) },
  ],
  hard: [
    {
      label: label("dois estados", "two statuses"), stdin: both("Ler Feita\nPraticar Pendente\nRevisar Feita\n", "Read Done\nPractice Pending\nReview Done\n"),
      expect: both(["Feita: 2", "Pendente: 1"], ["Done: 2", "Pending: 1"]),
    },
    { label: label("todas pendentes", "all pending"), stdin: both("Correr Pendente\nLer Pendente\n", "Run Pending\nRead Pending\n"), expect: both(["Pendente: 2"], ["Pending: 2"]) },
    {
      label: label("estados fora de ordem alfabética", "statuses out of alphabetical order"), stdin: both("Ler Pendente\nNadar Adiada\nRevisar Feita\n", "Read Pending\nSwim Delayed\nReview Done\n"),
      expect: both(["Adiada: 1", "Feita: 1", "Pendente: 1"], ["Delayed: 1", "Done: 1", "Pending: 1"]),
    },
  ],
  expert: [
    { label: label("empate nos pontos", "tie on score"), stdin: both("Bia 12\nAna 12\nCaio 9\n", "Bea 12\nAna 12\nKai 9\n"), expect: both(["Ana 12", "Bia 12"], ["Ana 12", "Bea 12"]) },
    { label: label("sem empate", "no tie"), stdin: both("Zeca 3\nLia 7\nRui 5\n", "Zed 3\nLia 7\nRoy 5\n"), expect: both(["Lia 7", "Rui 5"], ["Lia 7", "Roy 5"]) },
    { label: label("um jogador só", "a single player"), stdin: both("Davi 4\n", "Dave 4\n"), expect: both(["Davi 4"], ["Dave 4"]) },
  ],
};

/** The cases of a level in one language (inputs differ between Portuguese and English). */
export function javaCases(difficulty: BashDifficulty, lang: TypingLang): JavaCase[] {
  return SOURCES[difficulty].map((c) => ({ label: c.label, expect: c.expect, stdin: c.stdin[lang] }));
}

/** The part of the WASM-OJ engine the check uses. */
export type JavaEngine = {
  compile(request: unknown, options?: unknown): Promise<{ success: boolean; artifact?: unknown; diagnostics: { severity: string; line: number; column: number; message: string }[]; stderr?: string }>;
  run(artifact: never, options: unknown): Promise<{ stdout: string; stderr: string; code: number; termination: string; trapMessage?: string }>;
};
export type JavaRun = { stdout: string; stderr: string; code: number; termination: string };
/** `compileError`: nothing ran. Otherwise one run per case, in order. */
export type JavaOutcome = { compileError: string } | { runs: JavaRun[] };

/**
 * Compiles the answer once and runs it once per standard input. Both steps can also throw (a method the class library
 * lacks, a program WASM-OJ refuses to load): that comes back as text, never as an exception.
 *
 * Self-contained on purpose (no imports, no outer names): the tests hand this very function to a real Chromium.
 */
export async function runJavaCases(engine: JavaEngine, source: string, stdins: string[], resources: Record<string, number>): Promise<JavaOutcome> {
  const text = (problem: unknown) => String(problem instanceof Error ? problem.message : problem).slice(0, 600);
  let build: Awaited<ReturnType<JavaEngine["compile"]>>;
  try {
    build = await engine.compile({ language: "java", entry: "Main.java", files: { "Main.java": source }, target: "wasip1", optimization: "debug", name: "Pacto Java" }, { cache: false });
  } catch (problem) {
    return { compileError: text(problem) };
  }
  if (!build.success || !build.artifact) {
    const errors = build.diagnostics.filter((d) => d.severity === "error").map((d) => `Main.java:${d.line}:${d.column} ${d.message}`);
    return { compileError: (errors.join("\n") || build.stderr || "?").slice(0, 600) };
  }
  const runs: JavaRun[] = [];
  for (const stdin of stdins) {
    try {
      const r = await engine.run(build.artifact as never, { stdin, resources });
      runs.push({ stdout: String(r.stdout ?? "").slice(0, 2000), stderr: `${r.trapMessage ?? ""}\n${r.stderr ?? ""}`.trim().slice(0, 2000), code: r.code, termination: r.termination });
    } catch (problem) {
      runs.push({ stdout: "", stderr: text(problem), code: -1, termination: "refused" });
    }
  }
  return { runs };
}

function runError(run: JavaRun, lang: TypingLang) {
  const pt = lang === "pt";
  if (run.termination === "exited" && run.code === 0) return "";
  if (run.termination === "instruction-limit") return pt ? "Limite de instruções atingido: confira se algum laço não termina." : "Instruction limit reached: check for a loop that never ends.";
  if (run.termination === "exited") return pt ? `O programa terminou com o código ${run.code}.` : `The program ended with exit code ${run.code}.`;
  // An uncaught exception: TeaVM prints only the stack, so point at the answer's own line.
  const line = run.stderr.match(/Main\.java:(\d+)/)?.[1];
  const where = line ? (pt ? ` na linha ${line} de Main.java` : ` at line ${line} of Main.java`) : "";
  return run.termination === "trap" ? (pt ? `Erro durante a execução${where}.` : `Error while running${where}.`) : (pt ? `A execução foi interrompida (${run.termination})${where}.` : `The run was stopped (${run.termination})${where}.`);
}

/** Compares each case's run. Without one run per case every case fails. */
export function compareJavaRuns(runs: JavaRun[], cases: JavaCase[], lang: TypingLang): CaseResult[] {
  return cases.map((c, i) => {
    const expected = c.expect[lang];
    const run = runs.length === cases.length ? runs[i] : undefined;
    if (!run) return { ok: false, got: [], expected };
    const got = run.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    const error = runError(run, lang);
    return { ok: !error && got.length === expected.length && got.every((l, n) => l === expected[n]), got, expected, ...(error ? { error } : {}) };
  });
}

// Aprender, Bash challenges without the visualizer: the answer is checked by what it does, not by its text. Each
// exercise has a few cases (arguments, standard input, files in a fresh folder); the answer runs once per case in the
// isolated runner (Bashkit, same limits as the playground) and each case's output is compared line by line, ignoring
// spaces at the ends, a "./" before a file name and the prompt `read -p` may print. Only the run decides.
import type { TypingLang } from "./typing";

export type BashCase = {
  /** What the case checks, shown when it fails. */
  label: Record<TypingLang, string>;
  args?: string[];
  stdin?: string;
  files?: string[];
  dirs?: string[];
  expect: Record<TypingLang, string[]>;
};

const both = (pt: string[], en: string[] = pt) => ({ pt, en });
const label = (pt: string, en: string) => ({ pt, en });

export const BASH_CHECKS: Record<string, BashCase[]> = {
  "bash-printf": [
    { label: label("sem argumento", "no argument"), expect: both(["Olá, visitante"], ["Hello, visitor"]) },
    { label: label("com o nome “Ana Lu”", "with the name “Ana Lu”"), args: ["Ana Lu"], expect: both(["Olá, Ana Lu"], ["Hello, Ana Lu"]) },
  ],
  "bash-read-input": [
    { label: label("entrada “Ana”", "input “Ana”"), stdin: "Ana\n", expect: both(["Olá, Ana"], ["Hello, Ana"]) },
    { label: label("entrada com barra invertida", "input with a backslash"), stdin: "C:\\temp\n", expect: both(["Olá, C:\\temp"], ["Hello, C:\\temp"]) },
  ],
  "bash-directory-check": [
    { label: label("sem argumento", "no argument"), expect: both(["Pasta encontrada: ."], ["Directory found: ."]) },
    { label: label("pasta “dados”", "folder “dados”"), dirs: ["dados"], args: ["dados"], expect: both(["Pasta encontrada: dados"], ["Directory found: dados"]) },
    { label: label("caminho que não existe", "missing path"), args: ["nada"], expect: both(["Pasta não encontrada: nada"], ["Directory not found: nada"]) },
  ],
  "bash-array": [
    { label: label("lista com espaço no nome", "list with a space in a name"), expect: both(["Arquivo: relatório final.pdf", "Arquivo: notas.txt"], ["File: final report.pdf", "File: notes.txt"]) },
  ],
  "bash-glob": [
    {
      label: label("dois arquivos .txt e uma pasta .txt", "two .txt files and a .txt folder"),
      files: ["notas.txt", "tarefas.txt", "foto.png"], dirs: ["antigos.txt"],
      expect: both(["notas.txt", "tarefas.txt"]),
    },
    { label: label("pasta sem arquivos .txt", "folder without .txt files"), files: ["foto.png"], expect: both([]) },
  ],
  "bash-function": [
    { label: label("sem argumento", "no argument"), expect: both(["Olá, visitante"], ["Hello, visitor"]) },
    { label: label("com o nome “Bia”", "with the name “Bia”"), args: ["Bia"], expect: both(["Olá, Bia"], ["Hello, Bia"]) },
  ],
  "bash-case": [
    { label: label("sem argumento", "no argument"), expect: both(["Use: status"]) },
    { label: label("ação “status”", "action “status”"), args: ["status"], expect: both(["Tudo certo"], ["All good"]) },
    { label: label("ação desconhecida", "unknown action"), args: ["voar"], expect: both(["Opção desconhecida"], ["Unknown option"]) },
  ],
  "bash-pipeline": [
    { label: label("frases filtradas e ordenadas", "filtered, sorted sentences"), expect: both(["Bash combina ferramentas", "Bash interpreta comandos"], ["Bash combines tools", "Bash interprets commands"]) },
  ],
};

/** One argument for the shell, quoted so nothing in it is expanded. */
export function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

const NAME = /^[A-Za-z0-9._-]{1,40}$/;

/**
 * The script the runner gets: each case in its own subshell, in a fresh folder, with its arguments and its standard
 * input (a quoted here-document: nothing in it is expanded), followed by a marker line. `marker` must be random.
 */
export function buildCheckScript(code: string, cases: Pick<BashCase, "args" | "stdin" | "files" | "dirs">[], marker: string) {
  if (!/^[A-Z0-9_]{12,40}$/.test(marker)) throw new Error("invalid marker");
  return cases.map((c, i) => {
    for (const n of [...(c.files ?? []), ...(c.dirs ?? [])]) if (!NAME.test(n)) throw new Error("invalid file name");
    const stdin = c.stdin ?? "";
    if (stdin.split("\n").includes(marker)) throw new Error("invalid input");
    const setup = [`mkdir -p /pacto/caso${i}`, `cd /pacto/caso${i}`, ...(c.dirs ?? []).map((d) => `mkdir -p ${shellQuote(d)}`), ...(c.files ?? []).map((f) => `: > ${shellQuote(f)}`)];
    return [
      `( ${setup.join(" && ")} || exit 97`,
      `set -- ${(c.args ?? []).map(shellQuote).join(" ")}`,
      "{",
      code,
      `} <<'${marker}'`,
      stdin.replace(/\n$/, ""),
      marker,
      ")",
      `printf '\\n%s\\n' ${shellQuote(marker)}`,
    ].join("\n");
  }).join("\n");
}

function clean(line: string, prompt: RegExp | null) {
  let out = line.trim();
  if (prompt) out = out.replace(prompt, "").trim();
  return out.replace(/^\.\//, "");
}

/** `error` is what the answer itself raised in that case (Python), shown with what it printed. */
export type CaseResult = { ok: boolean; got: string[]; expected: string[]; error?: string };

/** Splits the run's output by the markers and compares each case. A missing marker fails that case and the rest. */
export function compareCheckOutput(stdout: string, cases: BashCase[], marker: string, lang: TypingLang, code = ""): CaseResult[] {
  const parts = stdout.split(`\n${marker}\n`);
  // A prompt printed by `read -p "..."` is not part of the answer.
  const promptText = code.match(/read\s+(?:-\w+\s+)*-p\s+(["'])(.*?)\1/)?.[2];
  const prompt = promptText ? new RegExp(`^${promptText.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`) : null;
  return cases.map((c, i) => {
    const expected = c.expect[lang];
    if (i >= parts.length - 1) return { ok: false, got: [], expected };
    const got = parts[i].split("\n").map((l) => clean(l, prompt)).filter(Boolean);
    return { ok: got.length === expected.length && got.every((l, n) => l === expected[n]), got, expected };
  });
}

export function randomMarker() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `PACTO_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

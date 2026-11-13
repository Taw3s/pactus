// Aprender, Python challenges without the visualizer: the answer is checked by what it does, not by its text. Each level
// has a few cases (a line of standard input or arguments); the answer runs once per case inside one run of the isolated
// runner (Pyodide, same worker and limits as the playground) and each case's output is compared line by line, ignoring
// spaces at the ends and blank lines. The data comes from the case, so printing a fixed answer fails the other cases.
import type { BashCase, CaseResult } from "./bash-challenge-checks";
import type { BashDifficulty } from "./typing-code";
import type { TypingLang } from "./typing";

/** Same shape as a Bash case: label, arguments (sys.argv[1:]), standard input and the expected lines. */
export type PythonCase = Pick<BashCase, "label" | "args" | "stdin" | "expect">;

const both = <T,>(pt: T, en: T = pt) => ({ pt, en });
const label = (pt: string, en: string) => ({ pt, en });
type Localized = { stdin?: Record<TypingLang, string>; args?: Record<TypingLang, string[]> };
type Source = Omit<PythonCase, "stdin" | "args"> & Localized;

const SOURCES: Record<BashDifficulty, Source[]> = {
  beginner: [
    { label: label("pares e ímpares misturados", "even and odd numbers mixed"), stdin: both("2 5 8 1\n"), expect: both(["[2, 8]"]) },
    { label: label("nenhum número par", "no even number"), stdin: both("7 3\n"), expect: both(["[]"]) },
    { label: label("só pares, com um negativo", "only even numbers, one negative"), stdin: both("10 -4 6\n"), expect: both(["[10, -4, 6]"]) },
  ],
  easy: [
    { label: label("três nomes", "three names"), stdin: both("ana bia caio\n"), expect: both(["['ANA', 'BIA', 'CAIO']"]) },
    { label: label("um nome só", "a single name"), stdin: both("lia\n"), expect: both(["['LIA']"]) },
  ],
  medium: [
    { label: label("palavras repetidas", "repeated words"), stdin: both("sol lua sol mar lua sol\n", "sun moon sun sea moon sun\n"), expect: both(["{'sol': 3, 'lua': 2, 'mar': 1}"], ["{'sun': 3, 'moon': 2, 'sea': 1}"]) },
    { label: label("uma palavra duas vezes", "one word twice"), stdin: both("rio rio\n", "river river\n"), expect: both(["{'rio': 2}"], ["{'river': 2}"]) },
  ],
  hard: [
    {
      label: label("três iniciais", "three initials"), stdin: both("uva abacate ameixa banana\n", "grape apple apricot banana\n"),
      expect: both(["{'u': ['uva'], 'a': ['abacate', 'ameixa'], 'b': ['banana']}"], ["{'g': ['grape'], 'a': ['apple', 'apricot'], 'b': ['banana']}"]),
    },
    { label: label("todas com a mesma inicial", "all with the same initial"), stdin: both("pera pitanga\n", "pear plum\n"), expect: both(["{'p': ['pera', 'pitanga']}"], ["{'p': ['pear', 'plum']}"]) },
  ],
  expert: [
    { label: label("cinco entradas, uma inválida", "five entries, one invalid"), args: both(["8", "inválida", "10", "7", "9"], ["8", "invalid", "10", "7", "9"]), expect: both(["[10.0, 9.0, 8.0]"]) },
    { label: label("menos de três notas válidas", "fewer than three valid scores"), args: both(["5", "x"]), expect: both(["[5.0]"]) },
    { label: label("sem argumentos", "no arguments"), expect: both(["[]"]) },
  ],
};

/** The cases of a level in one language (inputs differ between Portuguese and English). */
export function pythonCases(difficulty: BashDifficulty, lang: TypingLang): PythonCase[] {
  return SOURCES[difficulty].map((c) => ({ label: c.label, expect: c.expect, stdin: c.stdin?.[lang], args: c.args?.[lang] }));
}

function base64(text: string) {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * The program the runner gets. The answer and the cases travel as base64 (nothing in them is read as Python source of
 * the harness); each case runs the answer in a fresh namespace with its own sys.stdin, sys.argv and captured output. A
 * prompt passed to input() is not printed. The results leave in one line that starts with `marker`, which must be random.
 */
export function buildPythonCheckScript(code: string, cases: Pick<PythonCase, "args" | "stdin">[], marker: string) {
  if (!/^[A-Z0-9_]{12,40}$/.test(marker)) throw new Error("invalid marker");
  const data = JSON.stringify(cases.map((c) => ({ args: c.args ?? [], stdin: c.stdin ?? "" })));
  return `import base64 as _b64, builtins as _bi, io as _io, json as _json, sys as _sys, traceback as _tb

def _pacto_check():
    code = _b64.b64decode("${base64(code.replace(/\r\n/g, "\n"))}").decode("utf-8")
    cases = _json.loads(_b64.b64decode("${base64(data)}").decode("utf-8"))
    real = (_sys.stdout, _sys.stderr, _sys.stdin, _sys.argv, _bi.input)
    results = []
    for case in cases:
        out = _io.StringIO()
        stdin = _io.StringIO(case["stdin"])
        def read_line(prompt="", stdin=stdin):
            line = stdin.readline()
            if not line:
                raise EOFError("EOF when reading a line")
            return line.rstrip("\\n")
        _sys.stdout, _sys.stderr, _sys.stdin, _sys.argv, _bi.input = out, _io.StringIO(), stdin, ["resposta.py", *case["args"]], read_line
        error = ""
        try:
            exec(compile(code, "resposta.py", "exec"), {"__name__": "__main__"})
        except SystemExit:
            pass
        except BaseException as problem:
            error = "".join(_tb.format_exception_only(type(problem), problem)).strip()[-400:]
        finally:
            _sys.stdout, _sys.stderr, _sys.stdin, _sys.argv, _bi.input = real
        results.append({"out": out.getvalue()[:1000], "err": error})
    print("${marker}" + _json.dumps(results, ensure_ascii=False))

_pacto_check()
`;
}

/**
 * Reads the result line out of the run's output (one entry per line the worker sent) and compares each case. Without a
 * well-formed result line (timeout, crash, tampering) every case fails.
 */
export function comparePythonOutput(messages: string[], cases: PythonCase[], marker: string, lang: TypingLang): CaseResult[] {
  const line = messages.join("\n").split("\n").reverse().find((l) => l.startsWith(marker));
  let parsed: unknown = null;
  try {
    parsed = line ? JSON.parse(line.slice(marker.length)) : null;
  } catch {
    parsed = null;
  }
  const results = Array.isArray(parsed) && parsed.length === cases.length ? parsed as { out?: unknown; err?: unknown }[] : null;
  return cases.map((c, i) => {
    const expected = c.expect[lang];
    const r = results?.[i];
    if (!r || typeof r.out !== "string" || typeof r.err !== "string") return { ok: false, got: [], expected };
    const got = r.out.split("\n").map((l) => l.trim()).filter(Boolean);
    return { ok: !r.err && got.length === expected.length && got.every((l, n) => l === expected[n]), got, expected, ...(r.err ? { error: r.err } : {}) };
  });
}

/** Lines put before an approved answer in the playground, so it gets the input of the first case there too. */
export function pythonPlaygroundPrelude(c: Pick<PythonCase, "args" | "stdin">) {
  return `import io, sys\nsys.stdin = io.StringIO(${JSON.stringify(c.stdin ?? "")})\nsys.argv = ${JSON.stringify(["resposta.py", ...(c.args ?? [])])}\n\n`;
}

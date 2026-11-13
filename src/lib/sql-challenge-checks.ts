// Aprender, SQL challenges without the visualizer: the answer is checked by the rows it returns, not by its text. Each
// case creates the tables the prompt describes with its own rows; the answer runs after them in one fresh in-memory
// database of the isolated runner (SQL.js, same worker and limits as the playground). The rows of the answer's last
// query are compared with the expected ones: in order when the challenge asks for an order, as a set of rows otherwise.
// Column names are free. The data comes from the case, so a query with fixed values fails the other cases.
import type { CaseResult } from "./bash-challenge-checks";
import type { BashDifficulty } from "./typing-code";
import type { TypingLang } from "./typing";

export type SqlValue = string | number | null;
export type SqlTable = { name: string; columns: string[]; rows: SqlValue[][] };
export type SqlCase = {
  /** What the case checks, shown when it fails. */
  label: Record<TypingLang, string>;
  tables: Record<TypingLang, SqlTable[]>;
  expect: Record<TypingLang, SqlValue[][]>;
};
/** `ordered`: the prompt asks for an order, so the rows must come in it. */
export type SqlCheck = { ordered: boolean; cases: SqlCase[] };

const label = (pt: string, en: string) => ({ pt, en });
const table = (name: string, columns: string[], rows: SqlValue[][]): SqlTable => ({ name, columns, rows });

// Booleans are stored as 1 (TRUE) and 0 (FALSE), as SQLite does.
export const SQL_CHECKS: Record<BashDifficulty, SqlCheck> = {
  beginner: {
    ordered: true,
    cases: [
      {
        label: label("três tarefas, duas pendentes", "three tasks, two pending"),
        tables: {
          pt: [table("tarefas", ["nome", "concluida"], [["Estudar", 1], ["Revisar", 0], ["Praticar", 0]])],
          en: [table("tasks", ["name", "completed"], [["Study", 1], ["Review", 0], ["Practice", 0]])],
        },
        expect: { pt: [["Praticar"], ["Revisar"]], en: [["Practice"], ["Review"]] },
      },
      {
        label: label("quatro tarefas, três pendentes", "four tasks, three pending"),
        tables: {
          pt: [table("tarefas", ["nome", "concluida"], [["Ler", 0], ["Correr", 1], ["Anotar", 0], ["Dormir", 0]])],
          en: [table("tasks", ["name", "completed"], [["Read", 0], ["Run", 1], ["Annotate", 0], ["Sleep", 0]])],
        },
        expect: { pt: [["Anotar"], ["Dormir"], ["Ler"]], en: [["Annotate"], ["Read"], ["Sleep"]] },
      },
    ],
  },
  easy: {
    ordered: true,
    cases: [
      {
        label: label("três tarefas, duas pendentes", "three tasks, two pending"),
        tables: {
          pt: [table("tarefas", ["nome", "prioridade", "concluida"], [["Ler", 2, 1], ["Praticar", 3, 0], ["Revisar", 1, 0]])],
          en: [table("tasks", ["name", "priority", "completed"], [["Read", 2, 1], ["Practice", 3, 0], ["Review", 1, 0]])],
        },
        expect: { pt: [["Praticar", 3], ["Revisar", 1]], en: [["Practice", 3], ["Review", 1]] },
      },
      {
        label: label("a prioridade mais alta já foi concluída", "the highest priority is already completed"),
        tables: {
          pt: [table("tarefas", ["nome", "prioridade", "concluida"], [["Enviar", 1, 0], ["Testar", 5, 0], ["Anotar", 9, 1], ["Planejar", 2, 0]])],
          en: [table("tasks", ["name", "priority", "completed"], [["Send", 1, 0], ["Test", 5, 0], ["Annotate", 9, 1], ["Plan", 2, 0]])],
        },
        expect: { pt: [["Testar", 5], ["Planejar", 2], ["Enviar", 1]], en: [["Test", 5], ["Plan", 2], ["Send", 1]] },
      },
    ],
  },
  medium: {
    ordered: false,
    cases: [
      {
        label: label("duas categorias com pendências", "two categories with pending tasks"),
        tables: {
          pt: [table("tarefas", ["nome", "categoria", "concluida"], [["Ler", "Estudo", 1], ["Praticar", "Estudo", 0], ["Enviar", "Projeto", 0], ["Revisar", "Projeto", 0]])],
          en: [table("tasks", ["name", "category", "completed"], [["Read", "Study", 1], ["Practice", "Study", 0], ["Send", "Project", 0], ["Review", "Project", 0]])],
        },
        expect: { pt: [["Estudo", 1], ["Projeto", 2]], en: [["Study", 1], ["Project", 2]] },
      },
      {
        label: label("uma categoria sem nenhuma pendência", "a category without any pending task"),
        tables: {
          pt: [table("tarefas", ["nome", "categoria", "concluida"], [["Varrer", "Casa", 1], ["Ler", "Estudo", 0], ["Praticar", "Estudo", 0], ["Revisar", "Estudo", 0], ["Enviar", "Projeto", 0]])],
          en: [table("tasks", ["name", "category", "completed"], [["Sweep", "Home", 1], ["Read", "Study", 0], ["Practice", "Study", 0], ["Review", "Study", 0], ["Send", "Project", 0]])],
        },
        expect: { pt: [["Estudo", 3], ["Projeto", 1]], en: [["Study", 3], ["Project", 1]] },
      },
    ],
  },
  hard: {
    ordered: false,
    cases: [
      {
        label: label("uma categoria sem tarefas", "one category without tasks"),
        tables: {
          pt: [table("categorias", ["nome"], [["Estudo"], ["Projeto"], ["Leitura"]]), table("tarefas", ["nome", "categoria"], [["Praticar", "Estudo"], ["Enviar", "Projeto"]])],
          en: [table("categories", ["name"], [["Study"], ["Project"], ["Reading"]]), table("tasks", ["name", "category"], [["Practice", "Study"], ["Send", "Project"]])],
        },
        expect: { pt: [["Leitura"]], en: [["Reading"]] },
      },
      {
        label: label("três categorias sem tarefas", "three categories without tasks"),
        tables: {
          pt: [table("categorias", ["nome"], [["Casa"], ["Estudo"], ["Saúde"], ["Projeto"]]), table("tarefas", ["nome", "categoria"], [["Praticar", "Estudo"], ["Revisar", "Estudo"]])],
          en: [table("categories", ["name"], [["Home"], ["Study"], ["Health"], ["Project"]]), table("tasks", ["name", "category"], [["Practice", "Study"], ["Review", "Study"]])],
        },
        expect: { pt: [["Casa"], ["Saúde"], ["Projeto"]], en: [["Home"], ["Health"], ["Project"]] },
      },
    ],
  },
  expert: {
    ordered: false,
    cases: [
      {
        label: label("três pendências numa categoria", "three pending tasks in one category"),
        tables: {
          pt: [table("tarefas", ["nome", "categoria", "prazo", "concluida"], [["Ler", "Estudo", 3, 0], ["Praticar", "Estudo", 1, 0], ["Revisar", "Estudo", 2, 0], ["Enviar", "Projeto", 2, 0]])],
          en: [table("tasks", ["name", "category", "due_day", "completed"], [["Read", "Study", 3, 0], ["Practice", "Study", 1, 0], ["Review", "Study", 2, 0], ["Send", "Project", 2, 0]])],
        },
        expect: { pt: [["Estudo", "Praticar", 1], ["Estudo", "Revisar", 2], ["Projeto", "Enviar", 2]], en: [["Study", "Practice", 1], ["Study", "Review", 2], ["Project", "Send", 2]] },
      },
      {
        label: label("a tarefa de prazo mais curto já foi concluída", "the task with the earliest deadline is already completed"),
        tables: {
          pt: [table("tarefas", ["nome", "categoria", "prazo", "concluida"], [["Ler", "Estudo", 1, 1], ["Praticar", "Estudo", 4, 0], ["Revisar", "Estudo", 2, 0], ["Resumir", "Estudo", 3, 0], ["Enviar", "Projeto", 5, 0], ["Testar", "Projeto", 1, 0], ["Publicar", "Projeto", 3, 0]])],
          en: [table("tasks", ["name", "category", "due_day", "completed"], [["Read", "Study", 1, 1], ["Practice", "Study", 4, 0], ["Review", "Study", 2, 0], ["Summarize", "Study", 3, 0], ["Send", "Project", 5, 0], ["Test", "Project", 1, 0], ["Publish", "Project", 3, 0]])],
        },
        expect: {
          pt: [["Estudo", "Revisar", 2], ["Estudo", "Resumir", 3], ["Projeto", "Testar", 1], ["Projeto", "Publicar", 3]],
          en: [["Study", "Review", 2], ["Study", "Summarize", 3], ["Project", "Test", 1], ["Project", "Publish", 3]],
        },
      },
    ],
  },
};

const NAME = /^[a-z_][a-z0-9_]{0,30}$/;

function literal(value: SqlValue) {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("invalid value");
    return String(value);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

/** The statements that create one case's tables, replacing any left by the case before. */
export function sqlSetup(tables: SqlTable[]) {
  return tables.map((t) => {
    for (const n of [t.name, ...t.columns]) if (!NAME.test(n)) throw new Error("invalid name");
    if (t.rows.some((r) => r.length !== t.columns.length)) throw new Error("invalid row");
    const rows = t.rows.length ? `\nINSERT INTO ${t.name} VALUES ${t.rows.map((r) => `(${r.map(literal).join(", ")})`).join(", ")};` : "";
    return `DROP TABLE IF EXISTS ${t.name};\nCREATE TABLE ${t.name} (${t.columns.join(", ")});${rows}`;
  }).join("\n");
}

const markerRow = (marker: string, n: number) => `pacto\n${marker}_${n}`;

/**
 * The script the runner gets: for each case, a marker row, the case's tables and the answer; a last marker closes it.
 * The answer is followed by a line break and a semicolon, so a comment or a missing ";" at its end cannot swallow the
 * next marker. `marker` must be random.
 */
export function buildSqlCheckScript(code: string, cases: SqlTable[][], marker: string) {
  if (!/^[A-Z0-9_]{12,40}$/.test(marker)) throw new Error("invalid marker");
  const every = [...new Set(cases.flat().map((t) => t.name))];
  return [
    ...cases.map((tables, i) => [
      `SELECT '${marker}_${i}' AS pacto;`,
      ...every.map((name) => `DROP TABLE IF EXISTS ${name};`),
      sqlSetup(tables),
      code.replace(/\r\n/g, "\n"),
      ";",
    ].join("\n")),
    `SELECT '${marker}_${cases.length}' AS pacto;`,
  ].join("\n");
}

function cell(value: string) {
  const text = value.trim();
  return /^-?\d+(\.\d+)?$/.test(text) ? String(Number(text)) : text;
}

/** A row as the comparison (and the screen) writes it. */
export const sqlRowLine = (row: SqlValue[]) => row.map((v) => cell(v === null ? "NULL" : String(v))).join(" | ");

/**
 * `messages` holds one entry per result set, as the SQL worker prints it: the column names in the first line, then one
 * line per row with " | " between values. The answer of a case is the last result set between its marker and the next
 * one; none means no rows. A missing marker (error, timeout) fails that case.
 */
export function compareSqlOutput(messages: string[], check: SqlCheck, marker: string, lang: TypingLang): CaseResult[] {
  return check.cases.map((c, i) => {
    const expected = c.expect[lang].map(sqlRowLine);
    const start = messages.indexOf(markerRow(marker, i));
    const end = messages.indexOf(markerRow(marker, i + 1));
    if (start < 0 || end < start) return { ok: false, got: [], expected };
    const answer = end - start > 1 ? messages[end - 1] : "";
    const got = answer.split("\n").slice(1).map((l) => l.split(" | ").map(cell).join(" | "));
    const [a, b] = check.ordered ? [got, expected] : [[...got].sort(), [...expected].sort()];
    return { ok: a.length === b.length && a.every((l, n) => l === b[n]), got, expected };
  });
}

/** The first case's tables as SQL, put before an approved answer in the playground (its database starts empty). */
export function sqlPlaygroundPrelude(check: SqlCheck, lang: TypingLang) {
  return `${sqlSetup(check.cases[0].tables[lang])}\n\n`;
}

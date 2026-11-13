import fs from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error sql.js ships no type declarations; the few calls used here are typed below.
import initSqlJsUntyped from "sql.js";
import { buildSqlCheckScript, compareSqlOutput, SQL_CHECKS, sqlPlaygroundPrelude, sqlSetup } from "./sql-challenge-checks";
import { LANGUAGE_CODE_EXAMPLES } from "./typing-language-examples";
import { LANGUAGE_CODE_LEVEL_CHALLENGES } from "./typing-language-challenges";
import type { BashDifficulty } from "./typing-code";

type SqlResult = { columns: string[]; values: (string | number | null)[][] };
type SqlJs = { Database: new () => { exec: (sql: string) => SqlResult[]; close: () => void } };
const initSqlJs = initSqlJsUntyped as (options: { wasmBinary: Uint8Array }) => Promise<SqlJs>;

const MARKER = "PACTO_TESTMARKER0001";
const LEVELS: BashDifficulty[] = ["beginner", "easy", "medium", "hard", "expert"];
const LANGS = ["pt", "en"] as const;

function challenge(level: BashDifficulty) {
  return level === "beginner" ? LANGUAGE_CODE_EXAMPLES.find((e) => e.id === "sql")!.challenge : LANGUAGE_CODE_LEVEL_CHALLENGES.sql![level];
}

describe("SQL challenge checks", () => {
  it("have at least two cases with different rows for every level and language", () => {
    for (const level of LEVELS) for (const lang of LANGS) {
      expect(new Set(SQL_CHECKS[level].cases.map((c) => JSON.stringify(c.expect[lang]))).size, `${level} ${lang}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("ask for an order exactly when the prompt does", () => {
    expect(LEVELS.filter((l) => SQL_CHECKS[l].ordered)).toEqual(["beginner", "easy"]);
  });

  it("quote values and refuse odd names", () => {
    expect(sqlSetup([{ name: "t", columns: ["a", "b"], rows: [["O'Neil", null]] }])).toContain("INSERT INTO t VALUES ('O''Neil', NULL);");
    expect(() => sqlSetup([{ name: "t; DROP", columns: ["a"], rows: [] }])).toThrow();
    expect(() => buildSqlCheckScript("SELECT 1", [], "x")).toThrow();
  });

  it("accept every reference solution and reject wrong, fixed and misordered answers (real SQL.js)", async () => {
    const SQL = await initSqlJs({ wasmBinary: fs.readFileSync(new URL("../../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url)) });
    // Same output as public/workers/sql.worker.js: one message per result set, " | " between values, NULL spelled out.
    const run = (script: string) => {
      const database = new SQL.Database();
      try {
        return database.exec(script).map((result) => [result.columns.join(" | "), ...result.values.slice(0, 100).map((row) => row.map((value) => String(value ?? "NULL")).join(" | "))].join("\n"));
      } finally {
        database.close();
      }
    };
    const check = (code: string, level: BashDifficulty, lang: "pt" | "en") => {
      const spec = SQL_CHECKS[level];
      let messages: string[] = [];
      try {
        messages = run(buildSqlCheckScript(code, spec.cases.map((c) => c.tables[lang]), MARKER));
      } catch {
        // The worker reports the error and no rows.
      }
      return compareSqlOutput(messages, spec, MARKER, lang);
    };

    for (const level of LEVELS) for (const lang of LANGS) {
      const results = check(challenge(level).solution[lang], level, lang);
      expect(results.every((r) => r.ok), `${level} ${lang}: ${JSON.stringify(results)}`).toBe(true);
      // The visualizer's "expected result" is what the reference returns in the first case.
      expect(results[0].got.join("\n"), `${level} ${lang} output`).toBe(challenge(level).output[lang]);
    }

    // Fixed rows pass the first case only; so does the answer of before this change (data in a CTE inside the answer).
    expect(check("SELECT 'Praticar' UNION ALL SELECT 'Revisar'", "beginner", "pt").map((r) => r.ok)).toEqual([true, false]);
    expect(check("WITH tarefas(nome, concluida) AS (\n  VALUES ('Estudar', TRUE), ('Revisar', FALSE), ('Praticar', FALSE)\n)\nSELECT nome\nFROM tarefas\nWHERE concluida = FALSE\nORDER BY nome;", "beginner", "pt").map((r) => r.ok)).toEqual([true, false]);
    // Wrong filter.
    const wrong = check("SELECT nome FROM tarefas ORDER BY nome", "beginner", "pt");
    expect(wrong.map((r) => r.ok)).toEqual([false, false]);
    expect(wrong[0]).toMatchObject({ got: ["Estudar", "Praticar", "Revisar"], expected: ["Praticar", "Revisar"] });
    // The prompt asks for an order: the right rows in another order fail.
    expect(check("SELECT nome FROM tarefas WHERE concluida = 0 ORDER BY nome DESC", "beginner", "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(check("SELECT name, priority FROM tasks WHERE NOT completed ORDER BY priority", "easy", "en").map((r) => r.ok)).toEqual([false, false]);
    // No order asked: any order passes, and so does another way of writing the query, with other column names.
    expect(check("SELECT categoria AS c, COUNT(*) AS n FROM tarefas WHERE NOT concluida GROUP BY categoria ORDER BY categoria DESC", "medium", "pt").every((r) => r.ok)).toBe(true);
    expect(check("SELECT name FROM categories WHERE name NOT IN (SELECT category FROM tasks) ORDER BY name DESC", "hard", "en").every((r) => r.ok)).toBe(true);
    // ...but the rows still have to be the right ones, each the right number of times, with the right columns.
    expect(check("SELECT categoria, COUNT(*) FROM tarefas GROUP BY categoria", "medium", "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(check("SELECT c.nome FROM categorias c LEFT JOIN tarefas t ON t.categoria = c.nome", "hard", "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(check("SELECT categoria FROM tarefas WHERE NOT concluida GROUP BY categoria", "medium", "pt").map((r) => r.ok)).toEqual([false, false]);
    // An answer that returns no rows, a syntax error and a comment at the end.
    expect(check("SELECT nome FROM tarefas WHERE 1 = 0", "beginner", "pt")[0]).toMatchObject({ ok: false, got: [] });
    expect(check("SELEC nome FROM tarefas", "beginner", "pt").map((r) => r.ok)).toEqual([false, false]);
    expect(check("SELECT nome FROM tarefas WHERE concluida = FALSE ORDER BY nome -- pronto", "beginner", "pt").every((r) => r.ok)).toBe(true);
    // Several statements: the last result is the answer.
    expect(check("SELECT 1; SELECT name FROM tasks WHERE completed = FALSE ORDER BY name;", "beginner", "en").every((r) => r.ok)).toBe(true);
    // A forged marker row does not pass (and the marker is random in the app).
    expect(check(`SELECT '${MARKER}_1' AS pacto`, "beginner", "pt").every((r) => !r.ok)).toBe(true);

    // The playground prelude creates the first case's tables for an approved answer.
    expect(run(sqlPlaygroundPrelude(SQL_CHECKS.expert, "pt") + challenge("expert").solution.pt).at(-1)).toBe("categoria | nome | prazo\nEstudo | Praticar | 1\nEstudo | Revisar | 2\nProjeto | Enviar | 2");
  }, 30000);
});

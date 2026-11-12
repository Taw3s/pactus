/* A fresh in-memory SQLite database is created for each run. */
self.onmessage = async (event) => {
  try {
    self.importScripts("/local-runtimes/sql/sql-wasm.js", "/workers/lockdown.js");
    const SQL = await self.initSqlJs({
      locateFile: (file) => `/local-runtimes/sql/${file}`,
    });
    // SQLite cannot call the browser, but the worker is locked down the same way before running the query.
    const left = self.lockdownWorker(self);
    if (left.length) throw new Error("Isolamento incompleto; a consulta não foi executada.");
    const database = new SQL.Database();
    const results = database.exec(String(event.data?.code ?? ""));
    let used = 0;
    for (const result of results) {
      const rows = result.values.slice(0, 100);
      const chunks = [result.columns.join(" | ")];
      for (const row of rows) chunks.push(row.map((value) => String(value ?? "NULL")).join(" | "));
      if (result.values.length > rows.length) chunks.push(`… mais ${result.values.length - rows.length} linha(s)`);
      const text = chunks.join("\n").slice(0, Math.max(0, 12000 - used));
      if (text) self.postMessage({ kind: "log", text });
      used += text.length;
      if (used >= 12000) break;
    }
    if (results.length === 0) self.postMessage({ kind: "log", text: "Comando executado; a consulta não retornou linhas." });
    self.postMessage({ kind: "done" });
    database.close();
  } catch (error) {
    self.postMessage({ kind: "error", text: String(error?.message ?? error) });
    self.postMessage({ kind: "done", failed: true });
  }
};

// The JavaScript/TypeScript exercise runs in a sandboxed iframe of the page, and browsers do not promise it a thread of
// its own: a synchronous infinite loop there froze the whole tab (Chromium, 12/11/2026), and the 5 s timer of the page
// never got to run. This TypeScript transform puts a time check at the start of every loop body, so one long burst of
// work (a single task) stops by itself after LOOP_BUDGET_MS. The preview keeps working: the code still runs in the page.
import type * as TS from "typescript";

export const LOOP_GUARD = "__pactoLoopGuard";
export const LOOP_BUDGET_MS = 1000;

/**
 * Runs before the exercise. On overrun it also empties the preview: a loop that adds elements leaves hundreds of thousands
 * of nodes in one second, and that page alone kept the tab slow after the loop stopped (Chromium, 13/11/2026).
 * The budget restarts only in the next task (setTimeout), so a loop that catches the error and
 * keeps going is stopped again at once; timers, events and slow async code each get a fresh budget.
 */
export const LOOP_GUARD_PRELUDE =
  `const ${LOOP_GUARD}=(()=>{let d=0;return()=>{const n=performance.now();if(!d){d=n+${LOOP_BUDGET_MS};setTimeout(()=>{d=0},0)}` +
  `else if(n>d){try{document.body&&document.body.replaceChildren()}catch(e){}` +
  `throw new RangeError("Loop interrompido: passou de ${LOOP_BUDGET_MS / 1000} s sem parar. Confira a condição de saída.")}}})();`;

/** A `before` transformer for ts.transpileModule. */
export function loopGuardTransformer(ts: typeof TS): TS.TransformerFactory<TS.SourceFile> {
  return (context) => {
    const f = context.factory;
    const guard = () => f.createExpressionStatement(f.createCallExpression(f.createIdentifier(LOOP_GUARD), undefined, []));
    const guarded = (body: TS.Statement) =>
      ts.isBlock(body) ? f.updateBlock(body, [guard(), ...body.statements]) : f.createBlock([guard(), body], true);
    const visit = (node: TS.Node): TS.Node => {
      const n = ts.visitEachChild(node, visit, context);
      if (ts.isWhileStatement(n)) return f.updateWhileStatement(n, n.expression, guarded(n.statement));
      if (ts.isDoStatement(n)) return f.updateDoStatement(n, guarded(n.statement), n.expression);
      if (ts.isForStatement(n)) return f.updateForStatement(n, n.initializer, n.condition, n.incrementor, guarded(n.statement));
      if (ts.isForInStatement(n)) return f.updateForInStatement(n, n.initializer, n.expression, guarded(n.statement));
      if (ts.isForOfStatement(n)) return f.updateForOfStatement(n, n.awaitModifier, n.initializer, n.expression, guarded(n.statement));
      return n;
    };
    return (file) => ts.visitNode(file, visit) as TS.SourceFile;
  };
}

/** JavaScript or TypeScript ready for the iframe, with every loop guarded; syntax errors come back as text. */
export function prepareExercise(ts: typeof TS, source: string, typescript: boolean): { code: string } | { errors: string } {
  const result = ts.transpileModule(source, {
    fileName: typescript ? "exercicio.ts" : "exercicio.js",
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None, strict: typescript, allowJs: true },
    transformers: { before: [loopGuardTransformer(ts)] },
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) return { errors: errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("\n") };
  return { code: `${LOOP_GUARD_PRELUDE}\n${result.outputText}` };
}

// Copies the local runtimes of Aprender (Bash, Python, SQL, Java) from their npm packages into public/, and refuses
// any file whose SHA-256 differs from the one checked on 12/11/2026 against the published package. The binaries are
// not kept in git: they come from the exact versions pinned in package.json. Runs on postinstall and before build.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = (name, file) => join(root, "node_modules", name, file);

// [source in node_modules, destination under public/, sha256]
const FILES = [
  [pkg("@everruns/bashkit-wasm", "bashkit_wasm_bg.wasm"), "local-runtimes/bash/bashkit_wasm_bg.wasm", "a07727cfe0d1a2d1d549f9c5f821595bed9274abf82cb741db878306c920ddd8"],
  [pkg("pyodide", "pyodide.mjs"), "local-runtimes/python/pyodide.mjs", "6f1d60f7bf529beb300f0f47983c921d3982363640ba20af0e38efdddbc66109"],
  [pkg("pyodide", "pyodide.asm.mjs"), "local-runtimes/python/pyodide.asm.mjs", "f7cdc8ece80678ceb712f8e65ebe6d3a83203a180c399865f49612a051693635"],
  [pkg("pyodide", "pyodide.asm.wasm"), "local-runtimes/python/pyodide.asm.wasm", "cc36e3cab04fdfc9a63ff13eb52eae2b911bf46c025cc7b281f394bd3de1d5e6"],
  [pkg("pyodide", "pyodide-lock.json"), "local-runtimes/python/pyodide-lock.json", "5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010"],
  [pkg("pyodide", "python_stdlib.zip"), "local-runtimes/python/python_stdlib.zip", "fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a"],
  [pkg("sql.js", "dist/sql-wasm.js"), "local-runtimes/sql/sql-wasm.js", "b46d4bddfdde8a787fc4764bd0a405cdfdf96fbd77e6a4e95446106826ecfa47"],
  [pkg("sql.js", "dist/sql-wasm.wasm"), "local-runtimes/sql/sql-wasm.wasm", "0dfeecda2070b36da0cd4f6afa250af9453de528a983770f85b13d5d6b667572"],
  // The Java descriptor (src/lib/java-toolchain.ts) carries the same hashes; @wasm-oj/browser checks them again on load.
  [pkg("@wasm-oj/toolchain-java", "assets/java-teavm-0.13.1.compile-classlib.bin"), "toolchains/java-teavm-0.13.1.compile-classlib.bin", "738a82b7d7e7ff8d98b07bb076785da7035847a166afb8446fd150c4efce6103"],
  [pkg("@wasm-oj/toolchain-java", "assets/java-teavm-0.13.1.compiler.wasm"), "toolchains/java-teavm-0.13.1.compiler.wasm", "8c37bce1c6fceeaffeffe93e10834309b67c8b6fb58c6f8a24547afe8be67f5d"],
  [pkg("@wasm-oj/toolchain-java", "assets/java-teavm-0.13.1.runtime-classlib.bin"), "toolchains/java-teavm-0.13.1.runtime-classlib.bin", "0ed234b66cdde19cb29e6c2865a3636d792d3cf72f102e73a7b3fdede80b79e6"],
];

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
let failed = false;
for (const [from, to, want] of FILES) {
  const dest = join(root, "public", to);
  if (existsSync(dest) && sha(dest) === want) continue;
  if (!existsSync(from)) {
    console.error(`runtimes: missing ${from} (run npm ci)`);
    failed = true;
    continue;
  }
  const got = sha(from);
  if (got !== want) {
    console.error(`runtimes: ${from} has sha256 ${got}, expected ${want}; not copied`);
    failed = true;
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(from, dest);
}
if (failed) process.exit(1);
console.log(`runtimes: ${FILES.length} files verified in public/`);

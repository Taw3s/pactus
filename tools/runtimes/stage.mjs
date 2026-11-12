// Copies the local runtimes of Aprender (Bash, Python, SQL, Java and the WASM-OJ runner) from their npm packages into public/, and refuses
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
  // Files the WASM-OJ runner loads from a URL it builds at run time, which webpack cannot see: served from
  // public/wasm-oj/ and reached through the rewrite in next.config.ts (WASM_OJ_ASSETS there must list the same names).
  ...[
    ["runtime-core_bg-CKk6CPFH.wasm", "077aa936a3382a242eee7222fc17369769cb5ad265303d730ffc45ee192367e9"],
    ["wasmer_js_bg-lccPpAdN.wasm", "49a6646209f5ab5e7c737eac33407d87d9a9959ac83e5ecaaab9261b2323589e"],
    ["java-stage.worker-COWR2SIP.js", "e24e88de34b96a39b39c71f5dc1bf06a8763bae9f6a4e7e387a1d0212116ad5e"],
    ["index-CMYYN-aK.mjs", "d5e0424d9de8173c0c7bc6a6b704aecde620d3f424050e0e6a079d863a44d58b"],
    ["interactive-side.worker-pP6UC6gL.js", "2d046ee80b70df36e09935fd3998b0c1beee07f7f36927f8df5cafc4bd025fcf"],
    ["wasmer-thread.worker-DKlJE3cb.js", "301e164851ca743ce00bc9e8e33d7a616f9349d1c87c6b86766520d8433a3b7c"],
    ["compiler.worker-CD4QCBe0.js", "c5c12725abf767d59178b771e5d3c5e151c45ed991dd511228fa3fe8a9d06069"],
    ["runner.worker-BEbZIYKj.js", "cff064f8a58522b67cd5c91bb43c5d14466d36e39117fac352192f31eca52a44"],
  ].map(([file, hash]) => [pkg("@wasm-oj/browser", `dist/assets/${file}`), `wasm-oj/${file}`, hash]),
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

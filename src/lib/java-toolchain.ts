import type { BrowserToolchainSource } from "@wasm-oj/browser";

const descriptor = {
  schema: "wasm-oj-v2/toolchain-package",
  id: "java-teavm",
  version: "teavm-0.13.1-wasmgc-wasip1",
  wasmOjContract: 2,
  languages: ["java"],
  profiles: [
    { language: "java", target: "wasip1", optimization: "debug" },
    { language: "java", target: "wasip1", optimization: "release" },
  ],
  assets: [
    {
      path: "/toolchains/java-teavm-0.13.1.compile-classlib.bin",
      bytes: 1261778,
      sha256: "738a82b7d7e7ff8d98b07bb076785da7035847a166afb8446fd150c4efce6103",
      exportPath: "./assets/java-teavm-0.13.1.compile-classlib.bin",
    },
    {
      path: "/toolchains/java-teavm-0.13.1.runtime-classlib.bin",
      bytes: 23709664,
      sha256: "0ed234b66cdde19cb29e6c2865a3636d792d3cf72f102e73a7b3fdede80b79e6",
      exportPath: "./assets/java-teavm-0.13.1.runtime-classlib.bin",
    },
    {
      path: "/toolchains/java-teavm-0.13.1.compiler.wasm",
      bytes: 7854442,
      sha256: "8c37bce1c6fceeaffeffe93e10834309b67c8b6fb58c6f8a24547afe8be67f5d",
      exportPath: "./assets/java-teavm-0.13.1.compiler.wasm",
    },
  ],
} as const;

/** Browser-only descriptor; the Java assets are staged locally by postinstall. */
export function javaBrowserSource(baseUrl: string): BrowserToolchainSource {
  return Object.freeze({ kind: "browser", descriptor, baseUrl });
}

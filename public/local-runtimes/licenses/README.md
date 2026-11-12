# Licenças dos interpretadores do Aprender

Esta pasta reúne avisos e licenças dos interpretadores e compiladores distribuídos com o Pacto. Os arquivos executáveis ficam em `../bash`, `../python`, `../sql` e em `../../toolchains`, copiados dos pacotes npm fixados no `package.json` por `tools/runtimes/stage.mjs`, que recusa qualquer arquivo com SHA-256 diferente do conferido em 12/11/2026 contra o pacote publicado. Eles não ficam no git.

| Componente | Uso no Pacto | Licença e avisos |
| --- | --- | --- |
| Bashkit WASM 0.20.3 | Terminal de desafios Bash, executado localmente no navegador | `bashkit/`; MIT e avisos de terceiros da versão publicada |
| Pyodide 314.0.7 (npm `pyodide`) | Interpretador Python no navegador; CPython 3.14.2, ABI 2026_0 | `pyodide/`; MPL-2.0 e licença PSF do CPython |
| SQL.js 1.15.2 (npm `sql.js`) | SQLite local no navegador | `sql.js/`; MIT e lista de autores |
| WASM-OJ Browser 0.2.6 | Executor Java e mecanismo WebAssembly | `wasm-oj-browser/`; licença MIT e avisos completos dos componentes |
| WASM-OJ Java 0.2.0 / TeaVM 0.13.1 (npm `@wasm-oj/toolchain-java`) | Compilador e bibliotecas Java distribuídos em `public/toolchains` | `wasm-oj-java/`; licença MIT do pacote, avisos Apache-2.0, GPL-2.0 com Classpath Exception e componentes de terceiros |

Fontes oficiais usadas para os avisos:

- Bashkit: <https://github.com/everruns/bashkit/tree/v0.20.3>
- Pyodide: <https://github.com/pyodide/pyodide> e <https://github.com/python/cpython/tree/v3.14.2>
- SQL.js: <https://github.com/sql-js/sql.js>
- WASM-OJ: avisos do pacote npm `@wasm-oj/browser` 0.2.6 e do pacote de toolchain Java copiado para `wasm-oj-java/`.

O app não envia código digitado ao servidor do Pacto. Os interpretadores são executados no dispositivo do usuário, em workers ou quadros isolados do navegador; isso não altera as licenças dos componentes listados.

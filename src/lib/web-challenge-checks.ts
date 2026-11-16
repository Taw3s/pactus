// Aprender, Web challenges without the visualizer: the answer is checked by the page it makes, not by its text. Each
// case mounts the answer in a new sandboxed frame (check-frames.ts) and reads the resulting DOM: elements, texts, the
// links between them, computed styles and how a field judges a value. Where the challenge is CSS, the page comes from
// the case (several widths); where it is HTML, the cases bring the values typed into the field or the motion preference.
// Scripts inside the answer never run (the frame's CSP only lets the probe script in), as in the Web playground.
import type { CaseResult } from "./bash-challenge-checks";
import { inlineJson, type FrameReport, type FrameSpec } from "./check-frames";
import type { BashDifficulty } from "./typing-code";
import type { TypingLang } from "./typing";

type Localized = Record<TypingLang, string>;
/** One thing read from the page: a JavaScript expression (helpers below) and the value it must give. */
export type WebProbe = { name: Localized; js: string | Localized; expect: Localized };
export type WebCase = {
  label: Localized;
  /** Width of the frame, in CSS pixels (800 when absent). */
  width?: number;
  /** Makes every `prefers-reduced-motion` media query of the answer read as "reduce" (true) or "no-preference" (false). */
  reducedMotion?: boolean;
  probes: WebProbe[];
};
/** `css`: the answer is a style sheet and `page` is the markup the cases give it. `page` absent: the answer is the page. */
export type WebCheck = { page?: Localized; cases: WebCase[] };

export const WEB_CASE_TIMEOUT_MS = 4000;

const both = (pt: string, en: string = pt) => ({ pt, en });
const yes = both("sim", "yes");
const no = both("não", "no");

const CARDS = (name: string) => `<style>body{margin:0}.${name}>*{min-height:40px}</style><div class="${name}">${[1, 2, 3, 4, 5, 6].map((n) => `<article>${n}</article>`).join("")}</div>`;
const grid = (columns: number): WebProbe[] => [
  { name: both("display", "display"), js: both('css($(".cartoes"), "display")', 'css($(".cards"), "display")'), expect: both("grid") },
  { name: both("colunas", "columns"), js: both('columns($(".cartoes"))', 'columns($(".cards"))'), expect: both(String(columns)) },
  { name: both("espaço entre as colunas", "space between columns"), js: both('css($(".cartoes"), "column-gap")', 'css($(".cards"), "column-gap")'), expect: both("16px") },
  { name: both("todo cartão tem pelo menos 14rem (224px)", "every card is at least 14rem (224px) wide"), js: both('minWidth($(".cartoes")) >= 224', 'minWidth($(".cards")) >= 224'), expect: yes },
];
const accepts = (value: string, expected: Localized): WebProbe => ({
  name: both(`o campo aceita “${value}”`, `the field accepts “${value}”`), js: `typed($("input"), ${JSON.stringify(value)})`, expect: expected,
});

export const WEB_CHECKS: Record<BashDifficulty, WebCheck> = {
  beginner: {
    cases: [
      {
        label: both("documento", "document"),
        probes: [
          { name: both("idioma declarado em <html>", "language declared on <html>"), js: both('document.documentElement.lang.toLowerCase().startsWith("pt")', 'document.documentElement.lang.toLowerCase().startsWith("en")'), expect: yes },
          { name: both("título da página", "page title"), js: "document.title", expect: both("Aviso", "Notice") },
          { name: both("elementos main", "main elements"), js: '$$("main").length', expect: both("1") },
        ],
      },
      {
        label: both("conteúdo dentro de main", "content inside main"),
        probes: [
          { name: both("h1", "h1"), js: 'text($("main h1"))', expect: both("Aviso", "Notice") },
          { name: both("parágrafo", "paragraph"), js: 'text($("main p"))', expect: both("Seu progresso foi salvo.", "Your progress was saved.") },
          { name: both("botão", "button"), js: 'text($("main button"))', expect: both("Entendi", "I understand") },
          { name: both("tipo do botão", "button type"), js: '$("main button")?.type', expect: both("button") },
        ],
      },
    ],
  },
  easy: {
    cases: [
      {
        label: both("rótulo e campo", "label and field"),
        probes: [
          { name: both("rótulo do campo", "the field's label"), js: 'text($("form input")?.labels?.[0])', expect: both("Nome", "Name") },
          { name: both("o rótulo leva ao campo", "the label leads to the field"), js: '!!$("form input") && $("form label")?.control === $("form input")', expect: yes },
          { name: both("name do campo", "the field's name"), js: '$("form input")?.name', expect: both("nome", "name") },
          { name: both("botão dentro do formulário", "button inside the form"), js: 'text($("form button"))', expect: both("Enviar", "Submit") },
          { name: both("tipo do botão", "button type"), js: '$("form button")?.type', expect: both("submit") },
        ],
      },
      { label: both("campo vazio", "empty field"), probes: [accepts("", no)] },
      { label: both("campo preenchido", "filled field"), probes: [accepts("Ana", yes)] },
    ],
  },
  medium: {
    page: both(CARDS("cartoes"), CARDS("cards")),
    cases: [
      { label: both("página de 800 px de largura", "page 800 px wide"), width: 800, probes: grid(3) },
      { label: both("página de 480 px de largura", "page 480 px wide"), width: 480, probes: grid(2) },
      { label: both("página de 300 px de largura", "page 300 px wide"), width: 300, probes: grid(1) },
    ],
  },
  hard: {
    cases: [
      {
        label: both("campo, rótulo e ajuda", "field, label and help"),
        probes: [
          { name: both("tipo do campo", "field type"), js: '$("input")?.type', expect: both("email") },
          { name: both("rótulo do campo", "the field's label"), js: 'text($("input")?.labels?.[0])', expect: both("E-mail", "Email") },
          { name: both("aria-describedby aponta para um texto de ajuda", "aria-describedby points to a help text"), js: '!!text(document.getElementById($("input")?.getAttribute("aria-describedby") || " "))', expect: yes },
        ],
      },
      { label: both("campo vazio", "empty field"), probes: [accepts("", no)] },
      { label: both("texto que não é e-mail", "text that is not an email"), probes: [accepts("ana", no)] },
      { label: both("e-mail válido", "valid email"), probes: [accepts("ana@exemplo.com", yes)] },
    ],
  },
  expert: {
    cases: [
      {
        label: both("estrutura e navegação", "structure and navigation"),
        probes: [
          { name: both("o primeiro link da página é o de pular", "the first link of the page is the skip link"), js: '!!$("a") && $("a") === $(\'a[href^="#"]\')', expect: yes },
          { name: both("o link de pular leva ao main", "the skip link leads to main"), js: '(document.getElementById(($(\'a[href^="#"]\')?.hash || "# ").slice(1)) || 0).localName', expect: both("main") },
          { name: both("a navegação tem nome (aria-label)", "the navigation has a name (aria-label)"), js: '!!$("nav")?.getAttribute("aria-label")?.trim()', expect: yes },
          { name: both("links marcados como página atual", "links marked as the current page"), js: '$$(\'nav a[aria-current="page"]\').length', expect: both("1") },
          { name: both("h1 dentro de main", "h1 inside main"), js: '$$("main h1").length', expect: both("1") },
        ],
      },
      {
        label: both("sem preferência por movimento reduzido", "no reduced-motion preference"), reducedMotion: false,
        probes: [{ name: both("duração da transição dos links (s)", "duration of the links' transition (s)"), js: 'seconds($("nav a"))', expect: both("0.15") }],
      },
      {
        label: both("com movimento reduzido", "with reduced motion"), reducedMotion: true,
        probes: [{ name: both("transição dos links de no máximo 0,01 ms", "links' transition of at most 0.01 ms"), js: 'seconds($("nav a")) <= 0.0000101', expect: yes }],
      },
    ],
  },
};

/**
 * The document of one case. The probe script goes first, under a nonce (`token`, which must be random): nothing the
 * answer brings can run. It waits for the page to load, applies the case's motion preference by rewriting the answer's
 * own media queries (a frame cannot change the system's), reads each probe and sends one line per probe.
 */
export function buildWebCaseDocument(answer: string, check: WebCheck, c: WebCase, lang: TypingLang, token: string, index: number) {
  if (!/^[A-Z0-9_]{12,40}$/.test(token)) throw new Error("invalid token");
  const policy = `default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'nonce-${token}'; connect-src 'none'; frame-src 'none'; font-src data:; object-src 'none'; form-action 'none'; base-uri 'none'`;
  const probes = c.probes.map((p) => `()=>(${typeof p.js === "string" ? p.js : p.js[lang]})`).join(",");
  const words = lang === "pt" ? ["sim", "não", "(nada)", "(erro)"] : ["yes", "no", "(nothing)", "(error)"];
  const harness = `(()=>{const post=(kind,text)=>parent.postMessage({bridge:${inlineJson(token)},index:${index},kind,text:String(text).slice(0,1200)},"*");`
    + `const W=${inlineJson(words)};`
    + `const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];`
    + `const text=(el)=>el?el.textContent.replace(/\\s+/g," ").trim():null;`
    + `const css=(el,prop)=>el?getComputedStyle(el).getPropertyValue(prop).trim():null;`
    + `const columns=(el)=>el?new Set([...el.children].map((c)=>Math.round(c.getBoundingClientRect().left))).size:null;`
    + `const minWidth=(el)=>el&&el.children.length?Math.min(...[...el.children].map((c)=>c.getBoundingClientRect().width)):null;`
    + `const seconds=(el)=>el?Math.max(...getComputedStyle(el).transitionDuration.split(",").map((v)=>/ms\\s*$/.test(v)?parseFloat(v)/1000:parseFloat(v))):null;`
    + `const typed=(el,value)=>{if(!el)return null;el.value=value;return el.checkValidity()};`
    + `const motion=${c.reducedMotion === undefined ? "null" : String(c.reducedMotion)};`
    + `const rewrite=(rules)=>{for(const rule of rules){if(rule.media&&/prefers-reduced-motion/.test(rule.media.mediaText))`
    + `rule.media.mediaText=rule.media.mediaText.replace(/\\(\\s*prefers-reduced-motion\\s*(?::\\s*([a-z-]+)\\s*)?\\)/g,(m,v)=>((v!=="no-preference")===motion?"(min-width: 0px)":"(max-width: 0px)"));`
    + `if(rule.cssRules)rewrite(rule.cssRules)}};`
    + `const show=(v)=>v===true?W[0]:v===false?W[1]:v===null||v===undefined||v===""?W[2]:String(v).replace(/\\s+/g," ");`
    + `const probes=[${probes}];`
    + `const read=()=>{try{if(motion!==null)for(const sheet of document.styleSheets)rewrite(sheet.cssRules)}catch(e){}`
    + `for(const probe of probes){let value;try{value=show(probe())}catch(e){value=W[3]}post("line",value)}post("done","")};`
    // The frame gets its size from the page that holds it a moment after it loads, and until Chromium has seen it on screen
    // nothing in it has a layout (every box measures 0): wait for both, 1 s at most.
    + `let waits=0;const ready=()=>innerWidth===${c.width ?? 800}&&document.documentElement.getBoundingClientRect().width>0;`
    + `const start=()=>ready()||waits++>50?read():setTimeout(start,20);`
    + `addEventListener("load",start)})();`;
  const head = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><script nonce="${token}">${harness.replace(/<\/script/gi, "<\\/script")}</script>`;
  if (check.page) return `${head}<style>${answer.replace(/<\/style/gi, "<\\/style")}</style>${check.page[lang]}`;
  // The answer may bring its own doctype, <html lang> and <head>: the parser merges them into the document started above.
  return `${head}${answer.replace(/^\s*<!doctype[^>]*>/i, "")}`;
}

/** The lines a case expects, as the panel shows them: "what is read: value". */
export function webExpectedLines(c: WebCase, lang: TypingLang) {
  return c.probes.map((p) => `${p.name[lang]}: ${p.expect[lang]}`);
}

export function webFrameSpecs(answer: string, difficulty: BashDifficulty, lang: TypingLang, token: string): FrameSpec[] {
  const check = WEB_CHECKS[difficulty];
  return check.cases.map((c, i) => ({ html: buildWebCaseDocument(answer, check, c, lang, token, i), width: c.width ?? 800, height: 600 }));
}

/** Compares what each case's frame read. A case whose frame did not answer with one value per probe fails. */
export function compareWebReports(reports: FrameReport[], difficulty: BashDifficulty, lang: TypingLang): CaseResult[] {
  return WEB_CHECKS[difficulty].cases.map((c, i) => {
    const expected = webExpectedLines(c, lang);
    const r = reports[i];
    if (!r || !r.done || r.lines.length !== c.probes.length) {
      return { ok: false, got: [], expected, error: lang === "pt" ? "A página não pôde ser examinada a tempo." : "The page could not be examined in time." };
    }
    const got = c.probes.map((p, n) => `${p.name[lang]}: ${r.lines[n]}`);
    return { ok: got.every((l, n) => l === expected[n]), got, expected };
  });
}

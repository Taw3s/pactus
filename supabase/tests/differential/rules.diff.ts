// Differential test: the same history goes through the database (real RPCs, triggers and views)
// and through the app's TypeScript; the two must agree on every rule. See README.md here.
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { compareLeave, compareProbe, type Mismatch, type Probe } from "./compare";
import { KNOWN } from "./expected";
import { HAND, randomScenario, toSql, uid, type Scenario } from "./scenarios";

const host = process.env.PACTO_DIFF_HOST;
const port = process.env.PACTO_DIFF_PORT;
// 40 histories keep the CI job around a minute; a wider sweep is one variable away (PACTO_DIFF_RANDOM=300).
const RANDOM = Number(process.env.PACTO_DIFF_RANDOM ?? 40);

interface Run {
  obs: { label: string; data: Probe }[];
  log: { step: number; ok: boolean; err: string | null }[];
}

function replay(s: Scenario): Run {
  const out = execFileSync("psql", ["-h", host!, "-p", port!, "-U", "postgres", "-d", "postgres", "-X", "-q", "-t", "-A", "-f", "-"], {
    input: toSql(s),
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return JSON.parse(out.trim().split("\n").at(-1)!) as Run;
}

/** Every disagreement of a history, each tagged with the probe where it showed up. */
function mismatches(s: Scenario, run: Run): (Mismatch & { probe: string })[] {
  const people = new Map<string, string>();
  for (let u = 1; u <= 9; u++) people.set(uid(s.id, u), `U${u}`);
  const name = (id: string) => people.get(id) ?? id;
  const probes = s.events.filter((e) => e.t === "probe");
  const out: (Mismatch & { probe: string })[] = [];
  run.obs.forEach((o, i) => {
    for (const m of compareProbe(o.data, name)) out.push({ ...m, probe: o.label });
    const ev = probes[i];
    // The leave right after this probe (two events on: the clock, then the action); a refused one changes nothing.
    const refused = ev?.t === "probe" && ev.leaving ? run.log.find((l) => l.step === s.events.indexOf(ev) + 2)?.ok === false : false;
    if (ev?.t === "probe" && ev.leaving && run.obs[i + 1] && !refused) {
      for (const m of compareLeave(o.data, run.obs[i + 1].data, uid(s.id, ev.leaving), ev.how!, name)) out.push({ ...m, probe: run.obs[i + 1].label });
    }
  });
  return out;
}

const show = (ms: (Mismatch & { probe: string })[]) => ms.map((m) => `[${m.rule}] ${m.probe} · ${m.where}: banco = ${m.db}; app = ${m.ts}`).join("\n");

/** The history as the database lived it: each action with "ok" or the refusal. */
function trace(s: Scenario, run: Run) {
  const log = new Map(run.log.map((l) => [l.step, l]));
  let clock = "";
  return s.events
    .flatMap((e, i) => {
      if (e.t === "at") return (clock = e.ts), [];
      const { t, ...rest } = e;
      const l = log.get(i);
      return [`${clock}  ${t} ${JSON.stringify(rest)}${l ? (l.ok ? "  -> ok" : `  -> recusado: ${l.err}`) : ""}`];
    })
    .join("\n");
}

// PACTO_DIFF_SEED=17 (a random history) or PACTO_DIFF_CASE="saída" (a hand-written one, by part of its name):
// prints the history and every disagreement, known or not.
const only = process.env.PACTO_DIFF_SEED ? randomScenario(Number(process.env.PACTO_DIFF_SEED)) : HAND.find((h) => process.env.PACTO_DIFF_CASE && h.name.includes(process.env.PACTO_DIFF_CASE));

describe.skipIf(!host || !port || !only)("um histórico, em detalhe", () => {
  it(only?.name ?? "-", () => {
    const run = replay(only!);
    console.log(`${trace(only!, run)}\n\n${show(mismatches(only!, run)) || "nenhuma divergência"}`);
  });
});

describe.skipIf(!host || !port || !!only)("regras: banco × TypeScript", () => {
  // Hand-written edge cases: no disagreement beyond the known ones, and each known one still shows up
  // where it was found (so fixing it forces this list to be updated).
  for (const s of HAND) {
    it(s.name, () => {
      const run = replay(s);
      expect(run.obs.length, "every probe ran").toBe(s.events.filter((e) => e.t === "probe").length);
      const found = mismatches(s, run);
      const unknown = found.filter((m) => !(m.rule in KNOWN));
      expect(show(unknown), "divergência nova").toBe("");
      const expected = Object.entries(KNOWN).filter(([, k]) => k.scenario === s.name).map(([rule]) => rule);
      for (const rule of expected) expect(found.some((m) => m.rule === rule), `divergência conhecida "${rule}" não apareceu: foi corrigida? atualize expected.ts`).toBe(true);
    });
  }

  it(`${RANDOM} históricos aleatórios (sementes 1 a ${RANDOM})`, () => {
    const failures: string[] = [];
    let probes = 0;
    let accepted = 0;
    let refused = 0;
    // What the histories really reached (a sweep that never annuls a proof proves nothing about the tribunal).
    const reached: Record<string, number> = {};
    const count = (k: string, n = 1) => (reached[k] = (reached[k] ?? 0) + n);
    for (let seed = 1; seed <= RANDOM; seed++) {
      const s = randomScenario(seed);
      const run = replay(s);
      probes += run.obs.length;
      accepted += run.log.filter((l) => l.ok).length;
      refused += run.log.filter((l) => !l.ok).length;
      const ok = new Set(run.log.filter((l) => l.ok).map((l) => l.step));
      s.events.forEach((e, i) => {
        if (ok.has(i)) count(e.t === "proof" ? (e.extra ? "sessões extras" : e.goal === "project" ? "projetos" : "provas com foto") : e.t);
      });
      const last = run.obs.findLast((o) => !o.data.closed)?.data;
      if (last) {
        count("provas anuladas", last.results.filter((r) => r.status === "upheld").length);
        count("provas mantidas", last.results.filter((r) => r.status === "rejected").length);
        count("provas refeitas", last.checkins.filter((c) => c.retake_of).length);
        count("dias completos", last.completed.length);
        count("itens de dívida em aberto", last.pay.filter((x) => x.out === "ok").length);
        count("baús abertos", last.chests.length);
      }
      const unknown = mismatches(s, run).filter((m) => !(m.rule in KNOWN));
      if (unknown.length) failures.push(`semente ${seed}:\n${show(unknown.slice(0, 12))}`);
    }
    console.log(`diferencial: ${RANDOM} históricos, ${probes} sondagens, ${accepted} ações aceitas e ${refused} recusadas pelo banco\n${JSON.stringify(reached)}`);
    for (const k of ["provas anuladas", "provas refeitas", "pay", "leave", "remove", "dayoff", "menu", "sessões extras", "chest", "dias completos", "itens de dívida em aberto"]) {
      expect(reached[k] ?? 0, `os históricos não chegaram a: ${k}`).toBeGreaterThan(0);
    }
    // The histories must exercise the rules, not bounce off the triggers.
    expect(accepted).toBeGreaterThan(RANDOM * 40);
    expect(failures.join("\n\n"), "divergência nova (reproduza com PACTO_DIFF_SEED)").toBe("");
  });
});

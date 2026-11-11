// Histories for the differential test: a list of events replayed through the real RPCs and triggers
// (see harness.sql). Hand-written edge cases plus seeded random ones; `toSql` turns a history into
// one psql script whose last line is the JSON of every probe.

export type Goal = "study" | "reading" | "project" | "typing";

export type Ev =
  | { t: "at"; ts: string } // São Paulo wall clock, "YYYY-MM-DD HH:MM:SS"
  | { t: "create"; u: number; items: string[] }
  | { t: "join"; u: number }
  | { t: "leave"; u: number }
  | { t: "remove"; u: number } // by whoever owns the group at that moment
  | { t: "delete"; u: number } // account deletion, as /api/account does it
  | { t: "proof"; u: number; goal: "study" | "reading" | "project"; minutes?: number; pages?: number; extra?: boolean }
  | { t: "test"; u: number; score: number; startedSecondsAgo?: number } // a finished typing test (fixture: the measuring is not under test)
  | { t: "typing"; u: number; pick: "best" | "oldest" | "newest" } // typing proof with one of today's unused tests
  | { t: "dispute"; by: number | "ai"; of: number; goal: Goal; extra?: boolean }
  | { t: "vote"; by: number; of: number; goal: Goal; extra?: boolean; upheld: boolean }
  | { t: "dayoff"; u: number; weekday: number }
  | { t: "menu"; items: string[] } // by the owner
  | { t: "pay"; by: number; debtor: number; day: string; item: string; penalty?: boolean }
  | { t: "chest"; u: number; kind: "daily" | "weekly" }
  | { t: "probe"; label: string; leaving?: number; how?: "leave" | "remove" | "delete" };

export interface Scenario {
  id: number;
  name: string;
  events: Ev[];
}

export const ITEMS = ["coke", "snack", "coffee", "chocolate", "acai", "pizza", "icecream", "pix"];

export function uid(scenario: number, u: number) {
  return `d1ff${scenario.toString(16).padStart(4, "0")}-0000-4000-8000-${u.toString(16).padStart(12, "0")}`;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** One psql script: replays the events, then prints {obs, log} as a single JSON line. */
export function toSql(s: Scenario): string {
  const S = s.id;
  const out: string[] = [
    "\\set ON_ERROR_STOP on",
    "\\o /dev/null",
    "set timezone = 'UTC';",
    `delete from public.groups where id in (select group_id from diff.scn where scenario = ${S});`,
    `delete from auth.users where id::text like 'd1ff${S.toString(16).padStart(4, "0")}-%';`,
    `delete from diff.scn where scenario = ${S}; delete from diff.log where scenario = ${S}; delete from diff.obs where scenario = ${S};`,
  ];
  const users = new Set<number>();
  for (const e of s.events) {
    for (const k of ["u", "by", "of", "debtor"]) {
      const v = (e as unknown as Record<string, unknown>)[k];
      if (typeof v === "number") users.add(v);
    }
  }
  for (const u of users) out.push(`insert into auth.users (id, email) values ('${uid(S, u)}', 's${S}u${u}@pacto.test');`);

  const group = `(select group_id from diff.scn where scenario = ${S})`;
  const owner = `(select owner_id::text from public.groups where id = ${group})`;
  // Runs `stmt` as a signed-in member through RLS and grants, and logs whether the database took it.
  const as = (step: number, who: string, stmt: string) => {
    out.push(`select set_config('request.jwt.claim.sub', coalesce(${who}, ''), false);`, "set role authenticated;");
    out.push(`do $do$ begin\n  ${stmt};\n  insert into diff.log values (${S}, ${step}, true, null);\nexception when others then\n  insert into diff.log values (${S}, ${step}, false, sqlerrm);\nend $do$;`);
    out.push("reset role;", "select set_config('request.jwt.claim.sub', '', false);");
  };
  const photo = (u: number, step: number) => {
    out.push(`insert into storage.objects (bucket_id, name) select 'media', m.group_id || '/' || m.user_id || '/p${step}.jpg' from public.members m where m.user_id = '${uid(S, u)}';`);
    return `(select group_id || '/' || user_id || '/p${step}.jpg' from public.members where user_id = auth.uid())`;
  };
  const target = (of: number, goal: Goal, extra?: boolean) =>
    `(select id from public.checkins where user_id = '${uid(S, of)}' and goal::text = '${goal}' and extra = ${!!extra} order by created_at desc limit 1)`;

  s.events.forEach((e, step) => {
    const me = "u" in e ? q(uid(S, e.u)) : "";
    switch (e.t) {
      case "at":
        out.push(`select set_config('pacto.now', '${e.ts} America/Sao_Paulo', false);`);
        break;
      case "create":
        as(step, me, `perform public.create_group('Grupo ${S}', 'U${e.u}', array[${e.items.map(q).join(", ")}])`);
        out.push(`insert into diff.scn select ${S}, group_id from public.members where user_id = ${me};`);
        break;
      case "join":
        out.push(`select set_config('diff.code', (select invite_code from public.groups where id = ${group}), false);`);
        as(step, me, `perform public.join_group(current_setting('diff.code'), 'U${e.u}')`);
        break;
      case "leave":
        as(step, me, "perform public.leave_group()");
        break;
      case "remove":
        as(step, owner, `perform public.remove_member(${me})`);
        break;
      case "delete":
        // Same order as src/app/api/account/route.ts (service role): unname the receipts, leave, delete the user.
        out.push(`update public.payments set received_name = null where received_by = ${me};`);
        out.push(`select public._drop_member(m.user_id, m.group_id) from public.members m where m.user_id = ${me};`);
        out.push(`delete from auth.users where id = ${me};`);
        break;
      case "proof": {
        const path = photo(e.u, step);
        if (e.goal === "study" && e.extra) as(step, me, `insert into public.checkins (goal, photo_path, minutes, extra) values ('study', ${path}, ${e.minutes ?? 10}, true)`);
        else if (e.goal === "study") as(step, me, `insert into public.checkins (goal, photo_path, summary, minutes) values ('study', ${path}, 'Resposta de teste com mais de quarenta caracteres.', ${e.minutes ?? 60})`);
        else if (e.goal === "reading") as(step, me, `insert into public.checkins (goal, photo_path, pages) values ('reading', ${path}, ${e.pages ?? 1})`);
        else as(step, me, `insert into public.checkins (goal, photo_path, title, project_url) values ('project', ${path}, 'Projeto ${step}', 'https://github.com/pacto/teste')`);
        break;
      }
      case "test":
        // The quota of start_typing_test, by its own rule (0031): 3 normal tests, then the single "Nova tentativa"
        // when the server opens it. The test belongs to the day it started.
        out.push(
          `insert into public.typing_tests (user_id, group_id, day, device, seconds, started_at, finished_at, correct_chars, typed_chars, wpm, accuracy, score, special)
           select m.user_id, m.group_id, s.d, 'pc', 60, s.at, pacto_clock.now(), 300, 300, ${e.score}, 1, ${e.score}, k.kind = 'special'
           from public.members m, (select pacto_clock.now() - interval '${e.startedSecondsAgo ?? 60} seconds' as at, ((pacto_clock.now() - interval '${e.startedSecondsAgo ?? 60} seconds') at time zone 'America/Sao_Paulo')::date as d) s,
                lateral (select public._typing_attempt_kind(m.user_id, s.d) as kind) k
           where m.user_id = ${me} and k.kind is not null;`,
        );
        break;
      case "typing": {
        const order = e.pick === "best" ? "t.score desc" : e.pick === "oldest" ? "t.finished_at" : "t.finished_at desc";
        const path = photo(e.u, step);
        as(
          step,
          me,
          `insert into public.checkins (goal, photo_path, typing_test_id) values ('typing', ${path}, (select t.id from public.typing_tests t
             where t.user_id = auth.uid() and t.day = public.sp_today() and t.finished_at is not null
               and not exists (select 1 from public.checkins c where c.typing_test_id = t.id) order by ${order} limit 1))`,
        );
        break;
      }
      case "dispute":
        if (e.by === "ai") {
          // What checkin_reviews_after_insert does on a "mismatch" (0026: only proofs of today or yesterday).
          out.push(`insert into public.disputes (checkin_id, reason, by_ai) select c.id, 'Juiz IA: teste', true from public.checkins c
                    where c.id = ${target(e.of, e.goal, e.extra)} and c.day >= public.sp_today() - 1 on conflict (checkin_id) do nothing;`);
        } else as(step, q(uid(S, e.by)), `insert into public.disputes (checkin_id, reason) values (${target(e.of, e.goal, e.extra)}, 'Motivo de teste')`);
        break;
      case "vote":
        as(
          step,
          q(uid(S, e.by)),
          `insert into public.dispute_votes (dispute_id, upheld, reason) values ((select id from public.disputes where checkin_id = ${target(e.of, e.goal, e.extra)}), ${e.upheld}, 'Voto de teste')`,
        );
        break;
      case "dayoff":
        as(step, me, `perform public.set_day_off(${e.weekday}::smallint)`);
        break;
      case "menu":
        as(step, owner, `perform public.set_debt_menu(array[${e.items.map(q).join(", ")}])`);
        break;
      case "pay":
        as(step, q(uid(S, e.by)), `insert into public.payments (debtor_id, day, item, penalty) values ('${uid(S, e.debtor)}', '${e.day}', '${e.item}', ${e.penalty ? "true" : "false"})`);
        break;
      case "chest":
        as(step, me, `perform * from public.open_chest('${e.kind}')`);
        break;
      case "probe":
        out.push(`select diff.probe(${S}, ${q(e.label)});`);
        break;
    }
  });
  out.push("\\o");
  out.push(
    `select jsonb_build_object(
       'obs', (select coalesce(jsonb_agg(jsonb_build_object('label', label, 'data', data) order by id), '[]') from diff.obs where scenario = ${S}),
       'log', (select coalesce(jsonb_agg(jsonb_build_object('step', step, 'ok', ok, 'err', err) order by step), '[]') from diff.log where scenario = ${S}));`,
  );
  // Leave nothing behind: later histories must not slow down or see these rows.
  out.push("\\o /dev/null");
  out.push(`delete from storage.objects o using diff.scn s where s.scenario = ${S} and o.name like s.group_id || '/%';`);
  out.push(`delete from public.groups where id in (select group_id from diff.scn where scenario = ${S});`);
  out.push(`delete from auth.users where id::text like 'd1ff${S.toString(16).padStart(4, "0")}-%';`);
  out.push(`delete from diff.scn where scenario = ${S}; delete from diff.log where scenario = ${S}; delete from diff.obs where scenario = ${S};`);
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------------------------
// Building histories
// ---------------------------------------------------------------------------------------------

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const hms = (sec: number) => [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map((n) => String(n).padStart(2, "0")).join(":");

/** Monday. Every scenario starts here, so weekdays are easy to read: +6 is the first Sunday. */
export const D0 = "2026-03-02";
const day = (n: number) => addDays(D0, n);
const at = (n: number, time: string): Ev => ({ t: "at", ts: `${day(n)} ${time}` });

/** The three goals of a day for one person, a few seconds apart from `time`. */
function fullDay(n: number, u: number, time = "10:00:00", score = 50): Ev[] {
  const [h, m, sec] = time.split(":").map(Number);
  const t = (s: number) => at(n, hms(h * 3600 + m * 60 + sec + s));
  return [t(0), { t: "proof", u, goal: "study" }, t(1), { t: "proof", u, goal: "reading" }, t(2), { t: "test", u, score }, t(3), { t: "typing", u, pick: "best" }];
}

let handId = 0;
/** Hand-written cases are told by theme; here they are put in the order of the clock (stable for equal instants). */
function hand(name: string, events: Ev[]): Scenario {
  const timed: { ts: string; ev: Ev }[] = [];
  let ts = "";
  for (const ev of events) {
    if (ev.t === "at") ts = ev.ts;
    else timed.push({ ts, ev });
  }
  timed.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return { id: ++handId, name, events: timed.flatMap(({ ts, ev }) => [{ t: "at", ts } as Ev, ev]) };
}

export const HAND: Scenario[] = [
  hand("virada do dia: provas a segundos da meia-noite", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 },
    ...fullDay(1, 1, "23:59:50"),
    at(1, "23:59:57"), { t: "proof", u: 2, goal: "study" }, at(1, "23:59:58"), { t: "proof", u: 2, goal: "reading" },
    // The test starts on day 1 and ends on day 2: it belongs to day 1, and day 2's proof may not use it.
    at(2, "00:00:20"), { t: "test", u: 2, score: 70, startedSecondsAgo: 60 }, at(2, "00:00:21"), { t: "typing", u: 2, pick: "best" },
    at(1, "23:59:59"), { t: "probe", label: "23:59:59" },
    at(2, "00:00:00"), { t: "probe", label: "meia-noite" },
    at(2, "00:00:30"), { t: "probe", label: "depois do teste que atravessou" },
    ...fullDay(2, 2, "08:00:00"),
    at(3, "12:00:00"), { t: "probe", label: "dia seguinte" },
  ]),

  hand("troca de folga: vale na segunda, duas trocas na mesma semana, metas feitas na folga", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke"] }, at(0, "09:01:00"), { t: "join", u: 2 },
    ...fullDay(1, 1), ...fullDay(2, 1),
    at(2, "12:00:00"), { t: "dayoff", u: 1, weekday: 3 }, at(2, "12:01:00"), { t: "dayoff", u: 1, weekday: 2 }, // second choice replaces the first
    at(3, "23:00:00"), { t: "probe", label: "mesma semana: a folga ainda é domingo" },
    ...fullDay(6, 1), // Sunday, still the day off this week
    at(6, "23:00:00"), { t: "probe", label: "domingo de folga com as metas feitas" },
    ...fullDay(7, 1),
    at(8, "23:00:00"), { t: "probe", label: "terça: a folga nova" },
    ...fullDay(9, 1),
    at(13, "23:00:00"), { t: "probe", label: "domingo virou dia normal" },
    at(15, "09:00:00"), { t: "probe", label: "semana seguinte" },
  ]),

  hand("entrada às 22h: o dia da entrada nunca deve, mas feito conta", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] },
    at(1, "22:00:00"), { t: "join", u: 2 }, // joins late and sends nothing
    at(1, "22:05:00"), { t: "join", u: 3 }, ...fullDay(1, 3, "22:10:00"), // joins late and completes the day
    at(1, "23:59:59"), { t: "chest", u: 3, kind: "daily" }, { t: "probe", label: "dia da entrada" },
    at(2, "00:00:01"), { t: "probe", label: "depois da meia-noite" },
    at(2, "08:00:00"), { t: "pay", by: 1, debtor: 2, day: day(1), item: "coke" }, // refused: the join day is not payable
    ...fullDay(2, 3),
    at(3, "09:00:00"), { t: "pay", by: 1, debtor: 2, day: day(2), item: "coke" },
    at(3, "09:01:00"), { t: "probe", label: "dia seguinte ao da entrada deve" },
  ]),

  hand("anulação e refação no mesmo dia (estudo com sessões extras, digitação)", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    ...fullDay(1, 1, "10:00:00", 50),
    at(1, "10:10:00"), { t: "proof", u: 1, goal: "study", extra: true, minutes: 30 },
    at(1, "10:20:00"), { t: "chest", u: 1, kind: "daily" },
    at(1, "11:00:00"), { t: "dispute", by: 2, of: 1, goal: "study" }, at(1, "11:01:00"), { t: "vote", by: 3, of: 1, goal: "study", upheld: true },
    at(1, "11:02:00"), { t: "probe", label: "estudo anulado: extras param de somar, baú fica" },
    at(1, "11:03:00"), { t: "proof", u: 1, goal: "study", extra: true, minutes: 20 }, // refused: no valid main proof
    at(1, "11:10:00"), { t: "proof", u: 1, goal: "study", minutes: 90 },
    at(1, "11:11:00"), { t: "probe", label: "estudo refeito: extras voltam" },
    at(1, "12:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "12:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "12:02:00"), { t: "probe", label: "digitação anulada" },
    at(1, "12:10:00"), { t: "test", u: 1, score: 40 }, at(1, "12:11:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "12:12:00"), { t: "probe", label: "digitação refeita com teste novo" },
    at(2, "09:00:00"), { t: "probe", label: "dia seguinte" },
  ]),

  hand("pagamento: dia já completo, dia de folga, item fora do cardápio, a própria dívida, duas vezes", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 },
    ...fullDay(1, 2),
    at(3, "09:00:00"),
    { t: "pay", by: 1, debtor: 2, day: day(1), item: "coke" }, // refused: completed
    { t: "pay", by: 1, debtor: 2, day: day(2), item: "pizza" }, // refused: not on the menu
    { t: "pay", by: 2, debtor: 2, day: day(2), item: "coke" }, // refused: own debt
    { t: "pay", by: 1, debtor: 2, day: day(3), item: "coke" }, // refused: today
    { t: "pay", by: 1, debtor: 2, day: day(2), item: "coke" },
    { t: "pay", by: 1, debtor: 2, day: day(2), item: "coke" }, // refused: twice
    at(3, "09:01:00"), { t: "probe", label: "metade paga" },
    at(7, "09:00:00"), { t: "pay", by: 1, debtor: 2, day: day(6), item: "coke" }, // refused: Sunday off
    { t: "probe", label: "depois do domingo" },
  ]),

  hand("saída no meio do mês: quem sai leva provas e dívidas; recibos, votos e acusações ficam", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    ...fullDay(1, 1), ...fullDay(1, 2),
    at(1, "11:00:00"), { t: "dispute", by: 2, of: 1, goal: "reading" }, at(1, "11:01:00"), { t: "vote", by: 3, of: 1, goal: "reading", upheld: true },
    ...fullDay(2, 2),
    at(3, "09:00:00"), { t: "pay", by: 2, debtor: 3, day: day(1), item: "coke" }, { t: "pay", by: 3, debtor: 2, day: day(2), item: "snack" }, // second one refused: completed
    { t: "pay", by: 2, debtor: 1, day: day(1), item: "snack" }, { t: "pay", by: 1, debtor: 2, day: day(3), item: "coke" },
    at(3, "12:00:00"), { t: "probe", label: "antes da saída", leaving: 2, how: "leave" },
    at(3, "12:00:01"), { t: "leave", u: 2 }, { t: "probe", label: "depois da saída" },
    at(4, "22:00:00"), { t: "join", u: 2 }, // back in: a new member, nothing from before
    at(6, "09:00:00"), { t: "probe", label: "voltou" },
    at(6, "09:00:01"), { t: "probe", label: "antes de o dono sair", leaving: 1, how: "leave" },
    at(6, "09:00:02"), { t: "leave", u: 1 }, { t: "probe", label: "dono saiu: o grupo passa ao mais antigo" },
    at(6, "09:01:00"), { t: "menu", items: ["pix"] },
    at(9, "09:00:00"), { t: "probe", label: "cardápio do dono novo" },
    at(9, "09:00:01"), { t: "probe", label: "antes de excluir a conta", leaving: 3, how: "delete" },
    at(9, "09:00:02"), { t: "delete", u: 3 }, { t: "probe", label: "conta excluída" },
  ]),

  hand("veredito tardio: 72 h depois, o dia completo vira dívida; baús abertos ficam", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 }, at(0, "09:03:00"), { t: "join", u: 4 },
    ...[0, 1, 2, 3, 4].flatMap((n) => [1, 2, 3, 4].flatMap((u) => fullDay(n, u, `1${u}:00:00`))),
    at(1, "20:00:00"), { t: "chest", u: 1, kind: "daily" },
    // One accusation and no other vote: after 72 h the single "guilty" wins.
    at(1, "23:00:00"), { t: "dispute", by: 2, of: 1, goal: "reading" },
    at(4, "20:00:00"), { t: "chest", u: 1, kind: "weekly" }, { t: "probe", label: "semana fechada com o tribunal aberto" },
    at(4, "22:59:59"), { t: "probe", label: "um segundo antes das 72 h" },
    at(4, "23:00:00"), { t: "probe", label: "72 h: prova anulada" },
    at(5, "09:00:00"), { t: "chest", u: 2, kind: "weekly" }, { t: "pay", by: 2, debtor: 1, day: day(1), item: "coke" },
    at(5, "09:01:00"), { t: "probe", label: "dia seguinte" },
  ]),

  hand("cardápio: a troca vale na segunda e não mexe em dias passados", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 },
    at(3, "09:00:00"), { t: "menu", items: ["pizza"] }, at(3, "09:01:00"), { t: "menu", items: ["acai", "pix"] }, // second choice replaces the first
    at(4, "09:00:00"), { t: "pay", by: 1, debtor: 2, day: day(3), item: "acai" }, { t: "pay", by: 1, debtor: 2, day: day(3), item: "coke" },
    { t: "probe", label: "antes da segunda" },
    at(8, "09:00:00"), { t: "pay", by: 1, debtor: 2, day: day(7), item: "coke" }, { t: "pay", by: 1, debtor: 2, day: day(7), item: "pix" },
    { t: "probe", label: "depois da segunda" },
    at(8, "09:01:00"), { t: "join", u: 3 }, { t: "menu", items: ["chocolate"] }, { t: "menu", items: ["coke", "coke"] }, // refused: repeated item
    at(15, "09:00:00"), { t: "probe", label: "terceiro cardápio" },
  ]),

  hand("digitação: refazer com um teste terminado antes da prova condenada", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    at(1, "09:00:00"), { t: "proof", u: 1, goal: "study" }, at(1, "09:00:01"), { t: "proof", u: 1, goal: "reading" },
    at(1, "09:05:00"), { t: "test", u: 1, score: 50 }, at(1, "09:10:00"), { t: "test", u: 1, score: 80 },
    at(1, "09:20:00"), { t: "typing", u: 1, pick: "oldest" }, // proof with the first test; the second one stays unused
    at(1, "10:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "10:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "10:02:00"), { t: "probe", label: "prova de digitação anulada" },
    at(1, "10:10:00"), { t: "typing", u: 1, pick: "best" }, // refused (0031): the unused test started before the verdict
    at(1, "10:11:00"), { t: "chest", u: 1, kind: "daily" }, { t: "probe", label: "refeita com teste já julgado: recusada" },
    at(1, "10:20:00"), { t: "test", u: 1, score: 30 }, at(1, "10:21:00"), { t: "typing", u: 1, pick: "best" }, // the third test, after the verdict
    at(1, "10:22:00"), { t: "probe", label: "refeita com um teste novo" },
    at(2, "09:00:00"), { t: "probe", label: "dia seguinte" },
  ]),

  hand("digitação: prova anulada com as 3 tentativas do dia já gastas", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    at(1, "09:00:00"), { t: "proof", u: 1, goal: "study" }, at(1, "09:00:01"), { t: "proof", u: 1, goal: "reading" },
    at(1, "09:05:00"), { t: "test", u: 1, score: 50 }, at(1, "09:10:00"), { t: "test", u: 1, score: 60 }, at(1, "09:15:00"), { t: "test", u: 1, score: 70 },
    at(1, "09:20:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "10:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "10:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "10:01:30"), { t: "probe", label: "anulada: a nova tentativa abre" },
    at(1, "10:02:00"), { t: "test", u: 1, score: 65 }, // the "Nova tentativa" (0031)
    at(1, "10:02:30"), { t: "test", u: 1, score: 99 }, // a 5th test: refused, like start_typing_test
    at(1, "10:03:00"), { t: "probe", label: "nova tentativa feita, prova ainda não enviada" },
    at(1, "10:04:00"), { t: "typing", u: 1, pick: "best" }, { t: "probe", label: "refeita com a nova tentativa" },
    at(2, "09:00:00"), { t: "probe", label: "dia seguinte: o dia valeu" },
  ]),

  hand("digitação: teste melhor feito depois da prova e antes do julgamento", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    at(1, "09:00:00"), { t: "proof", u: 1, goal: "study" }, at(1, "09:00:01"), { t: "proof", u: 1, goal: "reading" },
    at(1, "09:05:00"), { t: "test", u: 1, score: 50 }, at(1, "10:00:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "11:00:00"), { t: "test", u: 1, score: 90 }, // the proof stays frozen on the 50 (0031); the 90 only scores
    at(1, "11:30:00"), { t: "probe", label: "prova com o 50, melhor do dia 90" },
    at(1, "12:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "12:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "12:02:00"), { t: "probe", label: "anulada; o 90 é de antes do veredito" },
    at(1, "12:10:00"), { t: "typing", u: 1, pick: "best" }, // refused: the 90 started before the verdict
    at(1, "12:11:00"), { t: "probe", label: "refeita com o 90: recusada" },
    at(1, "12:20:00"), { t: "test", u: 1, score: 35 }, at(1, "12:21:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "12:22:00"), { t: "probe", label: "refeita com o teste novo; o ranking conta só ele" },
  ]),

  hand("digitação: a nova tentativa também anulada vira 1 Coca a mais", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke", "snack"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    at(1, "09:00:00"), { t: "proof", u: 1, goal: "study" }, at(1, "09:00:01"), { t: "proof", u: 1, goal: "reading" },
    at(1, "09:05:00"), { t: "test", u: 1, score: 50 }, at(1, "09:10:00"), { t: "test", u: 1, score: 60 }, at(1, "09:15:00"), { t: "test", u: 1, score: 70 },
    at(1, "09:20:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "10:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "10:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "10:10:00"), { t: "test", u: 1, score: 40 }, at(1, "10:11:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "11:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "11:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "11:02:00"), { t: "probe", label: "nova tentativa anulada: Coca de punição" },
    at(1, "11:03:00"), { t: "test", u: 1, score: 90 }, // refused: nothing left after the special one
    at(1, "11:04:00"), { t: "pay", by: 2, debtor: 1, day: day(1), item: "coke", penalty: true }, { t: "probe", label: "punição paga no mesmo dia" },
    at(2, "09:00:00"), { t: "pay", by: 3, debtor: 1, day: day(1), item: "coke" }, { t: "probe", label: "dia seguinte: dívida normal e punição, separadas" },
  ]),

  hand("digitação: nova tentativa contestada e mantida não pune", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    ...fullDay(1, 1, "09:00:00"),
    at(1, "09:30:00"), { t: "test", u: 1, score: 55 }, at(1, "09:40:00"), { t: "test", u: 1, score: 58 },
    at(1, "10:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "10:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: true },
    at(1, "10:10:00"), { t: "test", u: 1, score: 45 }, at(1, "10:11:00"), { t: "typing", u: 1, pick: "best" },
    at(1, "11:00:00"), { t: "dispute", by: 2, of: 1, goal: "typing" }, at(1, "11:01:00"), { t: "vote", by: 3, of: 1, goal: "typing", upheld: false },
    at(1, "11:02:00"), { t: "probe", label: "contestação em aberto" },
    at(4, "12:00:00"), { t: "probe", label: "72 h depois: empate mantém, sem punição" },
  ]),

  hand("desafio da semana: removido no meio da semana não bloqueia; quem entra depois de segunda joga a próxima", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 },
    ...[0, 1, 2, 3, 4].flatMap((n) => [...fullDay(n, 1), ...fullDay(n, 2, "11:00:00")]), // U3 sends nothing
    at(2, "12:00:00"), { t: "join", u: 4 }, // joined on Wednesday: not in this week's challenge, never blocks it
    at(4, "12:00:00"), { t: "probe", label: "sexta, antes da remoção", leaving: 3, how: "remove" },
    at(4, "12:00:01"), { t: "remove", u: 3 }, { t: "probe", label: "sexta, depois da remoção" },
    at(4, "12:01:00"), { t: "chest", u: 1, kind: "weekly" }, { t: "chest", u: 4, kind: "weekly" }, { t: "probe", label: "baú aberto; quem entrou na quarta não abre" },
    ...[7, 8, 9, 10].flatMap((n) => [...fullDay(n, 1), ...fullDay(n, 2, "11:00:00"), ...fullDay(n, 4, "12:00:00")]),
    at(11, "09:00:00"), { t: "probe", label: "semana seguinte: quem entrou na quarta conta" },
  ]),

  hand("tribunal: só prova de hoje ou de ontem; quem entrou depois não vota; empate em 72 h mantém", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke"] }, at(0, "09:01:00"), { t: "join", u: 2 }, at(0, "09:02:00"), { t: "join", u: 3 }, at(0, "09:03:00"), { t: "join", u: 5 },
    ...fullDay(1, 1), ...fullDay(2, 1),
    at(2, "23:59:59"), { t: "probe", label: "ontem ainda pode ser acusado" },
    at(3, "00:00:00"), { t: "probe", label: "anteontem não pode mais" },
    at(3, "00:00:01"), { t: "dispute", by: 2, of: 1, goal: "study" }, // the latest study proof: yesterday's
    at(3, "08:00:00"), { t: "join", u: 4 }, { t: "probe", label: "entrou com o tribunal aberto" }, { t: "vote", by: 4, of: 1, goal: "study", upheld: true }, // refused: joined after it opened
    at(3, "08:01:00"), { t: "vote", by: 1, of: 1, goal: "study", upheld: false }, // refused: the defendant
    at(3, "08:02:00"), { t: "vote", by: 3, of: 1, goal: "study", upheld: false }, { t: "probe", label: "1 a 1 com três jurados: aberto" },
    at(3, "08:03:00"), { t: "vote", by: 3, of: 1, goal: "study", upheld: true }, // refused: already voted
    at(6, "00:00:00"), { t: "probe", label: "um segundo antes das 72 h" },
    at(6, "00:00:01"), { t: "probe", label: "72 h com empate: prova mantida" },
  ]),

  hand("desafio da semana: quem estava na segunda e saiu deixa de contar", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["coke"] }, at(0, "09:01:00"), { t: "join", u: 2 },
    ...[0, 1, 2, 3, 4].flatMap((n) => fullDay(n, 1)), // U2 sends nothing all week
    at(4, "12:00:00"), { t: "chest", u: 1, kind: "weekly" }, // refused: U2 has no day
    { t: "probe", label: "sexta, com quem não fechou nenhum dia", leaving: 2, how: "leave" },
    at(4, "12:00:01"), { t: "leave", u: 2 }, { t: "probe", label: "sexta, depois da saída" },
    at(4, "12:01:00"), { t: "chest", u: 1, kind: "weekly" }, { t: "probe", label: "baú da semana aberto" },
  ]),

  hand("grupo de uma pessoa: tribunal da IA, baú semanal sozinho, último a sair fecha o grupo", [
    at(0, "09:00:00"), { t: "create", u: 1, items: ["pix"] },
    ...[0, 1, 2, 3, 4].flatMap((n) => fullDay(n, 1)),
    at(2, "12:00:00"), { t: "dispute", by: "ai", of: 1, goal: "study" }, // nobody can vote: closes at once, proof kept
    at(4, "12:00:00"), { t: "chest", u: 1, kind: "weekly" }, { t: "probe", label: "sozinho" },
    at(5, "12:00:00"), { t: "join", u: 2 }, // joined after Monday: not in this week's challenge
    at(5, "12:01:00"), { t: "chest", u: 2, kind: "weekly" }, { t: "probe", label: "entrou no meio da semana" },
    at(8, "12:00:00"), { t: "leave", u: 1 }, at(8, "12:01:00"), { t: "leave", u: 2 }, { t: "probe", label: "grupo fechado" },
  ]),
];

// ---------------------------------------------------------------------------------------------
// Seeded random histories
// ---------------------------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random history: 1 to 4 people, 9 to 17 days, starting on any weekday. */
export function randomScenario(seed: number): Scenario {
  const r = mulberry32(seed);
  const chance = (p: number) => r() < p;
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const menu = () => (chance(0.5) ? [pick(ITEMS)] : ((a) => [a, pick(ITEMS.filter((x) => x !== a))])(pick(ITEMS)));

  const start = int(-3, 3); // not always a Monday
  const days = int(9, 17);
  const people = int(1, 4);
  const events: Ev[] = [];
  const present = new Set<number>([1]);
  const gone = new Set<number>(); // accounts deleted for good
  const diligence = new Map<number, number>(); // how likely each person is to do each goal
  for (let u = 1; u <= people; u++) diligence.set(u, pick([0.5, 0.8, 0.93, 0.98]));

  let menuNow = menu(); // roughly: a change only applies on Monday, so some payments miss on purpose
  events.push(at(start, "08:00:00"), { t: "create", u: 1, items: menuNow });
  for (let n = start; n < start + days; n++) {
    // Things that happen during the day, each at its own second, then sorted.
    const todo: { sec: number; ev: Ev }[] = [];
    const used = new Set<number>();
    const when = (from = 8 * 3600 + 60, to = 86399) => {
      for (;;) {
        const s = int(from, to);
        if (!used.has(s)) return used.add(s), s;
      }
    };
    const add = (ev: Ev, from?: number, to?: number) => todo.push({ sec: when(from, to), ev });

    for (let u = 2; u <= people; u++) {
      if (!present.has(u) && !gone.has(u) && chance(n === start ? 0.7 : 0.25)) {
        add({ t: "join", u }, undefined, chance(0.3) ? 86399 : 12 * 3600);
        present.add(u);
      }
    }
    for (const u of [...present]) {
      const p = diligence.get(u)!;
      const late = chance(0.1); // works around midnight
      const base = late ? 86399 - 40 : int(8 * 3600 + 120, 20 * 3600);
      const room = late ? 30 : 3600;
      const slot = () => when(base, base + room);
      if (chance(p)) todo.push({ sec: slot(), ev: { t: "proof", u, goal: "study", minutes: pick([60, 60, 90, 200, 300]) } });
      if (chance(p)) todo.push({ sec: slot(), ev: { t: "proof", u, goal: "reading", pages: pick([1, 10, 30, 60]) } });
      if (chance(p)) {
        const tests = int(1, 3);
        const first = slot();
        todo.push({ sec: first, ev: { t: "test", u, score: int(20, 110) + pick([0, 0.5]) } });
        todo.push({ sec: when(first, Math.min(86399, first + 600)), ev: { t: "typing", u, pick: pick(["best", "oldest", "newest"]) } });
        for (let i = 1; i < tests; i++) add({ t: "test", u, score: int(20, 260) }, base);
      }
      if (chance(0.25)) for (let i = int(1, 2); i > 0; i--) add({ t: "proof", u, goal: "study", extra: true, minutes: pick([10, 45, 120]) }, base);
      if (chance(0.15)) add({ t: "proof", u, goal: "project" });
      if (chance(0.5)) add({ t: "chest", u, kind: "daily" }, 20 * 3600);
      if (chance(0.2)) add({ t: "chest", u, kind: "weekly" });
      if (chance(0.04)) add({ t: "dayoff", u, weekday: int(0, 6) });
      // Tribunal: accuse a proof of someone else (today's or yesterday's latest), others vote.
      if (present.size > 1 && chance(0.22)) {
        const of = pick([...present].filter((x) => x !== u));
        const goal = pick<Goal>(["study", "reading", "typing", "typing", "project"]);
        const extra = goal === "study" && chance(0.2);
        const sec = when(9 * 3600, 80000);
        todo.push({ sec, ev: { t: "dispute", by: chance(0.15) ? "ai" : u, of, goal, extra } });
        for (const v of present) if (v !== of && v !== u && chance(0.85)) todo.push({ sec: when(sec, Math.min(86399, sec + 1800)), ev: { t: "vote", by: v, of, goal, extra, upheld: chance(0.7) } });
        // A retake the same day, sometimes.
        if (chance(0.7)) {
          const after = Math.min(86300, sec + 1801);
          if (goal === "typing") {
            if (chance(0.5)) add({ t: "test", u: of, score: int(20, 110) }, after);
            add({ t: "typing", u: of, pick: pick(["best", "oldest", "newest"]) }, after);
          } else if (goal !== "study" || !extra) add({ t: "proof", u: of, goal }, after);
        }
      }
      // Votes on older tribunals still open.
      if (present.size > 1 && chance(0.1)) add({ t: "vote", by: u, of: pick([...present].filter((x) => x !== u)), goal: pick<Goal>(["study", "reading", "typing"]), upheld: chance(0.5) });
      // Payments: mostly plausible (a recent day, a common item), sometimes anything.
      if (present.size > 1 && chance(0.45)) {
        const debtor = pick([...present].filter((x) => x !== u));
        for (const item of chance(0.8) ? menuNow : [pick(ITEMS)]) if (chance(0.8)) add({ t: "pay", by: u, debtor, day: day(n - int(1, 4)), item });
      }
    }
    if (chance(0.06)) add({ t: "menu", items: (menuNow = menu()) });
    // Someone goes: leaves, is removed or deletes the account. Probes right before and after.
    if (present.size > 1 && chance(0.06)) {
      const u = pick([...present]);
      const how = pick<"leave" | "remove" | "delete">(["leave", "remove", "delete"]);
      const sec = when(9 * 3600, 86000);
      used.add(sec + 1);
      todo.push({ sec, ev: { t: "probe", label: `antes: ${how} U${u}`, leaving: u, how } });
      todo.push({ sec: sec + 1, ev: { t: how, u } as Ev });
      todo.push({ sec: sec + 1, ev: { t: "probe", label: `depois: ${how} U${u}` } });
      present.delete(u);
      if (how === "delete") gone.add(u);
    }
    if (chance(0.3)) add({ t: "probe", label: `dia ${n}, meio do dia` });
    todo.push({ sec: 86399, ev: { t: "probe", label: `dia ${n}, 23:59:59` } });

    // Stable: events sharing a second keep their order (the leave and its "after" probe).
    todo.sort((a, b) => a.sec - b.sec);
    for (const { sec, ev } of todo) events.push(at(n, hms(sec)), ev);
    if (chance(0.3)) events.push(at(n + 1, "00:00:00"), { t: "probe", label: `dia ${n + 1}, 00:00:00` });
  }
  // A week later: every tribunal has closed.
  events.push(at(start + days + 7, "12:00:00"), { t: "probe", label: "uma semana depois" });
  return { id: 1000 + seed, name: `aleatório, semente ${seed}`, events };
}

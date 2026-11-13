// Stage (r): the approved typing rules of 10/11/2026 (migration 0031). After the 3 daily tests and an annulled proof,
// Hoje offers one "Nova tentativa"; the proof made with it is frozen to its own test; if the tribunal annuls it too,
// the day owes 1 Coca more (Dívidas lists it apart). A challenge of its own: nothing depends on the other stages.
import AxeBuilder from "@axe-core/playwright";
import { APP, assert, done, launch, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();
const { page: p } = await newPhone(browser);

/** Annuls the latest typing proof of `id` as a fixture: the AI accuses and one vote decides (the vote flow is stage e). */
function annulLatestTyping(id) {
  sql(`
    insert into public.disputes (checkin_id, reason, by_ai)
    select id, 'Juiz IA: teste da nova tentativa', true from public.checkins
    where user_id = '${id}' and goal = 'typing' and day = public.sp_today() order by created_at desc limit 1;
    alter table public.dispute_votes disable trigger dispute_votes_before_insert;
    insert into public.dispute_votes (dispute_id, voter_id, upheld, reason)
    select d.id, '${id}', true, 'Fixture' from public.disputes d join public.checkins c on c.id = d.checkin_id
    where c.user_id = '${id}' and c.goal = 'typing' and c.day = public.sp_today()
      and not exists (select 1 from public.dispute_votes v where v.dispute_id = d.id);
    alter table public.dispute_votes enable trigger dispute_votes_before_insert;`);
}

/** Types the shown words until the test inside `card` ends (3 s in the test database). */
async function typeUntilDone(card) {
  const input = card.getByTestId("typing-input");
  await input.waitFor();
  while ((await card.getByTestId("typing-test").getAttribute("data-phase").catch(() => "gone")) === "running") {
    const word = await card.getByTestId("typing-word-current").innerText().catch(() => "");
    if (!word) break;
    await input.pressSequentially(`${word} `, { delay: 90 }).catch(() => {});
  }
}

let iara;
await step("Iara sends typing, spends the 3 tests, and the tribunal annuls the proof: Hoje opens the single Nova tentativa", async () => {
  await p.goto(`${APP}/join?criar=1`);
  await p.fill("#name", "Iara");
  await p.fill("#email", "iara.regras@pacto.test");
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", "Regras da digitação");
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  iara = sql("select user_id from members where display_name = 'Iara'");
  const pending = p.locator("[data-goal=typing][data-state=pending]");
  await pending.getByRole("button", { name: "Começar teste" }).click();
  await typeUntilDone(pending);
  await p.locator("[data-goal=typing][data-state=done]").waitFor();
  // The other two tests of the day, finished before the verdict (fixture).
  sql(`insert into public.typing_tests (user_id, group_id, day, device, seconds, started_at, finished_at, correct_chars, typed_chars, wpm, accuracy, score)
       select user_id, group_id, public.sp_today(), 'pc', 3, now() - interval '2 minutes' + n * interval '10 seconds', now() - interval '1 minute', 50, 50, 199, 1, 199
       from public.members, generate_series(1, 2) n where user_id = '${iara}'`);
  annulLatestTyping(iara);
  await p.reload();
  const retake = p.locator("[data-goal=typing][data-state=retake]");
  await retake.getByText(/Você tem uma nova tentativa, única, até 23:59/).waitFor();
  await retake.getByText(/a dívida do dia ganha 1 Coca a mais/).first().waitFor();
  // The 199 tests are older than the verdict: nothing to "send again".
  assert((await p.getByTestId("typing-unsent").count()) === 0, "an old test was offered as the retake");
  await p.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const axe = await new AxeBuilder({ page: p }).include("[data-goal=typing]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(bad.length === 0, bad.map((v) => `${v.id}×${v.nodes.length}`).join(", "));
});

await step("the Nova tentativa is a 4th test the server marks special, once; the retake shows its own test", async () => {
  const retake = p.locator("[data-goal=typing][data-state=retake]");
  await retake.getByRole("button", { name: "Nova tentativa" }).click();
  await typeUntilDone(retake);
  const row = p.locator("[data-goal=typing][data-state=done]");
  await row.waitFor();
  assert(sql(`select count(*) from public.typing_tests where user_id = '${iara}' and day = public.sp_today() and special`) === "1", "one special test");
  assert(sql(`select count(*) from public.typing_tests where user_id = '${iara}' and day = public.sp_today()`) === "4", "four tests in all");
  const label = await row.getByTestId("typing-card").getAttribute("aria-label");
  assert(label && !label.includes("199 WPM"), `the retake shows an old test: ${label}`);
  // A direct call cannot open a 5th one.
  const out = sql(`select set_config('request.jwt.claim.sub', '${iara}', true), set_config('role', 'authenticated', true);
                   do $$ begin perform public.start_typing_test('pc'); raise exception 'FAIL'; exception when raise_exception then
                     if sqlerrm not like '%no attempts left%' then raise; end if; end $$; select 'ok'`);
  assert(out.trim().endsWith("ok"), out);
});

await step("the tribunal annuls the Nova tentativa too: no way left, and Dívidas shows the extra Coca from the verdict on", async () => {
  annulLatestTyping(iara);
  await p.reload();
  const retake = p.locator("[data-goal=typing][data-state=retake]");
  await retake.getByRole("button", { name: "Sem tentativas hoje" }).waitFor();
  assert(sql(`select count(*) from public.typing_penalties where user_id = '${iara}'`) === "1", "one penalty");
  await p.goto(`${APP}/dividas`);
  await p.getByTestId("my-balance").getByText(/Você deve 1 Coca/).waitFor();
  await p.getByRole("button", { name: /Iara/ }).first().click();
  await p.getByText("Coca (punição)").waitFor();
});

await browser.close();
done();

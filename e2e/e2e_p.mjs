// Stage (p): a typing result the server confirmed always reaches the goal, without another test or attempt:
// the proof fails, its answer is lost, the page reloads, two tabs send it, it is the last attempt, the day turns.
// Each person has a challenge of their own, so nothing here depends on the other stages' groups.
import AxeBuilder from "@axe-core/playwright";
import { APP, assert, done, launch, newPhone, sql, step, typingTest } from "./lib.mjs";

const browser = await launch();

async function newChallenge(name) {
  const s = await newPhone(browser);
  const p = s.page;
  await p.goto(`${APP}/join?criar=1`);
  await p.fill("#name", name);
  await p.fill("#email", `${name.toLowerCase()}.digita@pacto.test`);
  await p.fill("#password", "senha123");
  await p.getByRole("button", { name: "Criar conta" }).click();
  await p.waitForURL("**/join?step=code&criar=1");
  await p.fill("#group", `Digitação da ${name}`);
  await p.getByRole("button", { name: "Criar desafio" }).click();
  await p.waitForURL("**/hoje");
  return { ...s, id: sql(`select user_id from members where display_name = '${name}'`) };
}

const tests = (id) => Number(sql(`select count(*) from typing_tests where user_id = '${id}' and day = sp_today()`));
const proofs = (id) => Number(sql(`select count(*) from checkins where user_id = '${id}' and goal = 'typing'`));
const pending = (p) => p.locator("[data-goal=typing][data-state=pending]");
const unsent = (p) => p.getByTestId("typing-unsent");
const doneRow = (p) => p.locator("[data-goal=typing][data-state=done]");
const isPost = (route) => route.request().method() === "POST";

// Fails before the server sees it (offline, connection dropped).
const dropRequest = (route) => (isPost(route) ? route.abort("failed") : route.fallback());
// Reaches the server, which saves it; the answer never comes back.
const dropAnswer = async (route) => {
  if (!isPost(route)) return route.fallback();
  await route.fetch();
  await route.abort("failed");
};

let nina;
await step("the proof fails after the test: Hoje offers the confirmed result, no new test and no attempt spent", async () => {
  nina = await newChallenge("Nina");
  const p = nina.page;
  await p.route("**/rest/v1/checkins*", dropRequest);
  await typingTest(p, pending(p));
  await unsent(p).waitFor();
  await pending(p).getByRole("alert").getByText("A meta não foi enviada. Tente de novo: o resultado continua salvo.").waitFor();
  assert((await pending(p).getByRole("button", { name: "Começar teste" }).count()) === 0, "asks for another test");
  assert(tests(nina.id) === 1 && proofs(nina.id) === 0, `tests ${tests(nina.id)}, proofs ${proofs(nina.id)}`);
  const axe = await new AxeBuilder({ page: p }).include("[data-goal=typing]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  assert(axe.violations.length === 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`).join("; "));
  for (const w of [320, 1440]) {
    await p.setViewportSize({ width: w, height: 800 });
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `sideways scroll at ${w}`);
  }
  await p.setViewportSize({ width: 390, height: 844 });
  await p.unroute("**/rest/v1/checkins*");
});

await step("the turn of the day: yesterday's confirmed test does not send today's goal, and today starts with 3 attempts", async () => {
  const p = nina.page;
  // The page was drawn before midnight; the database now dates the proof on the next day.
  sql(`update typing_tests set day = day - 1, started_at = started_at - interval '1 day', finished_at = finished_at - interval '1 day' where user_id = '${nina.id}'`);
  await unsent(p).getByRole("button", { name: "Enviar resultado" }).click();
  await pending(p).getByRole("alert").getByText("O dia virou antes de a meta ser enviada. O teste de ontem não vale para hoje.").waitFor();
  await pending(p).getByText("Vale a melhor de 3 tentativas hoje.", { exact: false }).waitFor();
  assert((await unsent(p).count()) === 0, "yesterday's test offered for today");
  assert(proofs(nina.id) === 0, "a proof was sent with yesterday's test");
  sql(`delete from typing_tests where user_id = '${nina.id}'`);
});

await step("reload and two tabs: the confirmed result survives the reload, and sending it from both tabs makes one proof", async () => {
  const p = nina.page;
  await p.reload();
  await p.route("**/rest/v1/checkins*", dropRequest);
  await typingTest(p, pending(p));
  await unsent(p).waitFor();
  await p.unroute("**/rest/v1/checkins*");
  await p.reload();
  await unsent(p).waitFor();
  const testId = sql(`select id from typing_tests where user_id = '${nina.id}'`);
  const other = await nina.ctx.newPage();
  await other.goto(`${APP}/hoje`);
  await unsent(other).waitFor();
  await unsent(p).getByRole("button", { name: "Enviar resultado" }).click();
  await doneRow(p).waitFor();
  // The second tab still shows the old page: its send finds the proof already there and shows it done.
  await unsent(other).getByRole("button", { name: "Enviar resultado" }).click();
  await doneRow(other).waitFor();
  assert(proofs(nina.id) === 1, `proofs ${proofs(nina.id)}`);
  assert(sql(`select typing_test_id from checkins where user_id = '${nina.id}' and goal = 'typing'`) === testId, "proof not tied to the confirmed test");
  assert(tests(nina.id) === 1, `tests ${tests(nina.id)}`);
  await p.getByRole("button", { name: "Tentar de novo (2 restantes)" }).waitFor();
  await nina.ctx.close();
});

await step("the answer is lost after the server saved the proof: Hoje shows it sent, once, without asking again", async () => {
  const otto = await newChallenge("Otto");
  const p = otto.page;
  await p.route("**/rest/v1/checkins*", dropAnswer);
  await typingTest(p, pending(p));
  await doneRow(p).waitFor();
  assert((await unsent(p).count()) === 0, "asks to send a proof that was saved");
  assert(proofs(otto.id) === 1 && tests(otto.id) === 1, `proofs ${proofs(otto.id)}, tests ${tests(otto.id)}`);
  await otto.ctx.close();
});

await step("last attempt: the test's own answer is lost and the proof fails; the result is read back and sent without attempts left", async () => {
  const pia = await newChallenge("Pia");
  const p = pia.page;
  // Two attempts already used today (started, never finished): the next one is the last.
  sql(`insert into typing_tests (user_id, group_id, day, device, seconds) select m.user_id, m.group_id, sp_today(), 'mobile', 3 from members m cross join generate_series(1, 2) where m.user_id = '${pia.id}'`);
  await p.reload();
  await pending(p).getByText("1 tentativa restante", { exact: false }).waitFor();
  await p.route("**/rest/v1/rpc/finish_typing_test*", dropAnswer);
  await p.route("**/rest/v1/checkins*", dropRequest);
  await typingTest(p, pending(p));
  await unsent(p).waitFor();
  assert(tests(pia.id) === 3 && proofs(pia.id) === 0, `tests ${tests(pia.id)}, proofs ${proofs(pia.id)}`);
  await p.unroute("**/rest/v1/checkins*");
  await p.reload();
  await unsent(p).getByRole("button", { name: "Enviar resultado" }).click();
  await doneRow(p).waitFor();
  assert(proofs(pia.id) === 1 && tests(pia.id) === 3, `proofs ${proofs(pia.id)}, tests ${tests(pia.id)}`);
  assert((await p.getByRole("button", { name: /Tentar de novo/ }).count()) === 0, "offers a fourth attempt");
  await pia.ctx.close();
});

await browser.close();
done();

// Stage (j): retaking a proof condemned by the tribunal (same day only) and extra study sessions.
import AxeBuilder from "@axe-core/playwright";
import { APP, FIXTURE, SHOTS, assert, done, launch, loginAs, sql, step, typingTest } from "./lib.mjs";

const browser = await launch();
const davi = await loginAs(browser, "davi@pacto.test");

/** Fills and sends a goal form found by its data-state ("pending", "retake" or "extra"). */
async function send(goal, state, fill = async () => {}) {
  const card = davi.locator(`[data-goal=${goal}][data-state=${state}]`);
  if (goal === "typing") {
    await typingTest(davi, card);
    return card.waitFor({ state: "detached" });
  }
  await card.getByTestId("proof-photo-input").setInputFiles(FIXTURE);
  await fill(card);
  await card.getByRole("button", { name: /Enviar prova|Enviar nova prova|Somar sessão/ }).click();
  await card.waitFor({ state: "detached" });
}

/** Annuls a proof as if the group had voted (the vote flow itself is covered in stage e). */
function annul(photoLike) {
  sql(`
    insert into public.disputes (checkin_id, reason, by_ai)
    select id, 'Juiz IA: teste de refazer', true from public.checkins where photo_path like '${photoLike}';
    alter table public.dispute_votes disable trigger dispute_votes_before_insert;
    insert into public.dispute_votes (dispute_id, voter_id, upheld, reason)
    select d.id, m.user_id, true, 'Culpado no teste'
    from public.disputes d join public.checkins c on c.id = d.checkin_id
    join public.members m on m.group_id = c.group_id and m.user_id <> c.user_id
    where c.photo_path like '${photoLike}';
    alter table public.dispute_votes enable trigger dispute_votes_before_insert;`);
}

const daviId = sql("select user_id from public.members where display_name = 'Davi'");
let firstTyping;

await step("Davi sends typing; the tribunal condemns it; Hoje offers a retake until 23:59", async () => {
  await send("typing", "pending");
  firstTyping = sql(`select photo_path from public.checkins where user_id = '${daviId}' and goal = 'typing' and day = public.sp_today()`);
  annul(firstTyping);
  await davi.reload();
  const retake = davi.locator("[data-goal=typing][data-state=retake]");
  await retake.getByText(/até 23:59/).waitFor();
  await davi.locator("[data-goal=typing][data-state=annulled]").waitFor();
  await davi.screenshot({ path: `${SHOTS}/j1-refazer.png`, fullPage: true });
  // Same contrast workaround as stage h (axe skips text over the dithered background).
  await davi.addStyleTag({ content: "body{background-image:none!important;background-color:#2a2d32!important}" });
  const axe = await new AxeBuilder({ page: davi }).include("[data-goal=typing]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  assert(bad.length === 0, bad.map((v) => `${v.id}×${v.nodes.length}`).join(", "));
});

await step("the retake counts: typing is done again and the tribunal links to the new proof", async () => {
  await send("typing", "retake");
  await davi.locator("[data-goal=typing][data-state=done]").waitFor();
  assert((await davi.locator("[data-goal=typing]").count()) === 1, "only the latest typing proof is listed");
  const oldId = sql(`select id from public.checkins where photo_path = '${firstTyping}'`);
  await davi.goto(`${APP}/checkin/${oldId}`);
  await davi.getByTestId("retake-link").getByText("refez esta prova").click();
  await davi.waitForURL((u) => !u.pathname.endsWith(oldId));
  await davi.getByText("Digitação (refeita)").waitFor();
});

await step("after the retake, Hoje and the Feed show the retake's best test, as the ranking and the proof page score it", async () => {
  // The test judged with the condemned proof becomes the day's highest: it must not come back as the day's best.
  sql(`update public.typing_tests t set wpm = 199, accuracy = 1, score = 199 from public.checkins c
       where c.photo_path = '${firstTyping}' and t.id = c.typing_test_id`);
  const retakeWpm = Math.round(Number(sql(`select t.wpm from public.typing_tests t join public.checkins c on t.id = c.typing_test_id
       where c.user_id = '${daviId}' and c.goal = 'typing' and c.retake_of is not null and c.day = public.sp_today()`)));
  assert(retakeWpm !== 199, "the retake test must differ from the judged one");
  await davi.goto(`${APP}/hoje`);
  const row = davi.locator("[data-goal=typing][data-state=done]");
  await row.getByText(`${retakeWpm} WPM`, { exact: false }).first().waitFor();
  assert((await row.getByText("199 WPM", { exact: false }).count()) === 0, "Hoje shows the judged test");
  const card = await row.getByTestId("typing-card").getAttribute("aria-label");
  assert(card?.includes(`${retakeWpm} WPM`), `Hoje card: ${card}`);
  await davi.goto(`${APP}/feed`);
  const tile = await davi.locator('[data-member="Davi"] [data-testid=typing-card]').getAttribute("aria-label");
  assert(tile?.includes(`${retakeWpm} WPM`) && !tile.includes("199 WPM"), `Feed tile: ${tile}`);
  const retakeId = sql(`select id from public.checkins where user_id = '${daviId}' and goal = 'typing' and retake_of is not null and day = public.sp_today()`);
  await davi.goto(`${APP}/checkin/${retakeId}`);
  const page = await davi.getByTestId("typing-card").first().getAttribute("aria-label");
  assert(page?.includes(`${retakeWpm} WPM`), `proof page: ${page}`);
});

await step("a second retake of a proof that stands is refused", async () => {
  await davi.goto(`${APP}/hoje`);
  assert((await davi.locator("[data-goal=typing][data-state=retake]").count()) === 0, "no retake form for a valid proof");
});

await step("extra study sessions add minutes, need the study proof and show in the feed", async () => {
  assert((await davi.getByRole("button", { name: "Sessão extra de estudo" }).count()) === 0, "extra before the study proof");
  await send("study", "pending", async (card) => {
    await card.getByTestId("minutes").fill("60");
    await card.locator("textarea").fill("Estudei limites e derivadas com exercícios resolvidos do livro.");
  });
  await davi.getByRole("button", { name: "Sessão extra de estudo" }).click();
  await send("study", "extra", async (card) => card.getByTestId("minutes").fill("45"));
  const extras = davi.getByTestId("extra-sessions");
  await extras.getByText("Sessão extra", { exact: true }).waitFor();
  await extras.getByText("45 min").waitFor();
  await davi.screenshot({ path: `${SHOTS}/j2-sessao-extra.png`, fullPage: true });
  await davi.goto(`${APP}/feed`);
  await davi.locator('[data-member="Davi"]').getByText("60 min + 45 extra").waitFor();
});

const points = async () => {
  await davi.goto(`${APP}/ranking`);
  return Number(await davi.locator('[data-member="Davi"] [data-testid=points]').innerText());
};
const studyLine = async () => {
  await davi.goto(`${APP}/feed`);
  return davi.locator('[data-member="Davi"] li').filter({ hasText: "Estudo" }).first().innerText();
};

const dayDone = () => Number(sql(`select count(*) from public.completed_days where user_id = '${daviId}' and day = public.sp_today()`));
let withExtras;
await step("study annulled and not retaken: the day's extra sessions stop scoring but stay in the history", async () => {
  withExtras = await points();
  const doneBefore = dayDone();
  const study = sql(`select photo_path from public.checkins where user_id = '${daviId}' and goal = 'study' and not extra and day = public.sp_today()`);
  annul(study);
  // The study minutes (60), the completed day (if it was) and now the extra session (45) leave the ranking.
  const after = await points();
  const lostDay = (doneBefore - dayDone()) * 20;
  assert(after === withExtras - 60 - lostDay - 45, `points ${withExtras} -> ${after} (day ${lostDay})`);
  const line = await studyLine();
  assert(line.includes("60 min") && !line.includes("extra"), `feed: ${line}`);
  assert(Number(sql(`select count(*) from public.checkins where user_id = '${daviId}' and extra and day = public.sp_today()`)) === 1, "the extra proof was removed");
});

await step("a valid retake of the study brings the valid extra sessions back", async () => {
  await davi.goto(`${APP}/hoje`);
  await send("study", "retake", async (card) => {
    await card.getByTestId("minutes").fill("75");
    await card.locator("textarea").fill("Refiz a prova com os exercícios de limites e derivadas resolvidos hoje.");
  });
  const after = await points();
  assert(after === withExtras - 60 + 75, `points ${withExtras} -> ${after}`);
  const line = await studyLine();
  assert(line.includes("75 min + 45 extra"), `feed: ${line}`);
});

await step("an annulled extra session never scores, with the study valid", async () => {
  const before = await points();
  await davi.goto(`${APP}/hoje`);
  await davi.getByRole("button", { name: "Sessão extra de estudo" }).click();
  await send("study", "extra", async (card) => card.getByTestId("minutes").fill("30"));
  assert((await points()) === before + 30, "the new extra session did not score");
  const extraPath = sql(`select photo_path from public.checkins where user_id = '${daviId}' and extra and minutes = 30 and day = public.sp_today()`);
  annul(extraPath);
  assert((await points()) === before, "an annulled extra session still scores");
  const line = await studyLine();
  assert(line.includes("75 min + 45 extra"), `feed: ${line}`);
});

await browser.close();
done();

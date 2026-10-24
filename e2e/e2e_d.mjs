// Stage (d): debts, history, settings. Dates are relative to today (see dates.mjs and seed.sql).
import { CAIO_JOIN, JOIN, OFF, PREV_MONTH, T, TODAY, WEEKDAYS_PT, ddmm, lastOfPrevMonth, monthKey, monthName, nextMonday, owedDays, weekday } from "./dates.mjs";
import { APP, FIXTURE, SHOTS, assert, done, launch, loginAs, step } from "./lib.mjs";

const browser = await launch();
const as = (email) => loginAs(browser, email);
const text = (loc) => loc.innerText();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Status of a calendar day in a person's history (opens the right month). */
async function dayStatus(page, userPath, day) {
  if (!page.url().includes(`m=${monthKey(day)}`)) {
    await page.goto(`${APP}${userPath}?m=${monthKey(day)}`);
    await page.getByTestId("streak").waitFor();
  }
  return page.locator(`[data-day="${day}"]`).getAttribute("data-status");
}

const davi = await as("davi@pacto.test");
await step("debts are derived from missed days (today never counts)", async () => {
  await davi.goto(`${APP}/dividas`);
  const bia = davi.locator("[data-debtor=Bia]");
  // Bia did the 3 goals once (T-3): 4 of the 5 obligation days are owed.
  assert((await text(bia.getByTestId("summary"))) === "4 Cocas · 4 salgados", await text(bia.getByTestId("summary")));
  assert((await text(davi.locator("[data-debtor=Ana]").getByTestId("summary"))) === "Em dia", "Ana owes nothing");
  // Davi did nothing since joining: 5 obligation days.
  assert((await text(davi.locator("[data-debtor=Davi]").getByTestId("summary"))).startsWith("5 Cocas"), "Davi 5");
  await davi.getByTestId("my-balance").getByText("Você deve 5 Cocas + 5 salgados").waitFor();
  await davi.screenshot({ path: `${SHOTS}/d1-dividas.png`, fullPage: true });
});

await step("last month's unpaid debts are flagged 'atrasada' but still owed", async () => {
  const caio = davi.locator("[data-debtor=Caio]");
  const overdueDays = owedDays(CAIO_JOIN, lastOfPrevMonth).length;
  const allDays = owedDays(CAIO_JOIN).length;
  assert((await text(caio)).includes(plural(overdueDays * 2, "atrasada", "atrasadas")), await text(caio));
  assert((await text(caio.getByTestId("summary"))).startsWith(`${allDays} Cocas`), `${await text(caio.getByTestId("summary"))} vs ${allDays}`);
});

await step("nobody can mark their own debt; others see 'Recebi'", async () => {
  await davi.locator("[data-debtor=Davi] button[aria-expanded]").click();
  await davi.locator("[data-debtor=Davi]").getByText("Em aberto").first().waitFor();
  assert((await davi.locator("[data-debtor=Davi] button:has-text('Recebi')").count()) === 0, "self pay button");
  await davi.locator("[data-debtor=Bia] button[aria-expanded]").click();
  assert((await davi.locator("[data-debtor=Bia] button:has-text('Recebi')").count()) === 8, "8 buttons for Bia (4 days × 2 items)");
});

await step("receiver marks a Coca as paid; balance and history update", async () => {
  await davi.getByRole("button", { name: `Recebi 1 Coca de Bia, ${ddmm(T(-5))}` }).click();
  await davi.locator("[data-debtor=Bia]").getByText("3 Cocas · 4 salgados").waitFor();
  // The row stays open after the refresh and shows who received it.
  await davi.locator("[data-debtor=Bia]").getByText("Recebido por Davi").waitFor();
});

const ana = await as("ana@pacto.test");
let anaPath;
await step("history: Ana's streak is 6 (5 seeded days + today; the day off doesn't break it)", async () => {
  await ana.goto(`${APP}/hoje`);
  await ana.getByRole("link", { name: "Perfil" }).click();
  await ana.waitForURL("**/historico/**");
  anaPath = new URL(ana.url()).pathname;
  await ana.getByTestId("streak").waitFor();
  assert((await text(ana.getByTestId("streak"))) === "6", `streak ${await text(ana.getByTestId("streak"))}`);
  await ana.screenshot({ path: `${SHOTS}/d2-historico.png`, fullPage: true });
  for (let n = -5; n <= 0; n++) assert((await dayStatus(ana, anaPath, T(n))) === "done", `day ${T(n)}`);
  assert((await dayStatus(ana, anaPath, JOIN)) === "off", "join day is the day off");
  assert((await dayStatus(ana, anaPath, T(-7))) === "before", "before join");
});

await step("history of another member + month navigation", async () => {
  await ana.goto(`${APP}${anaPath}`);
  await ana.waitForLoadState("networkidle");
  await ana.locator("details summary").click();
  await ana.getByRole("link", { name: "Bia", exact: true }).click();
  await ana.getByRole("heading", { name: "Bia" }).waitFor();
  await ana.getByTestId("streak").filter({ hasText: "0" }).waitFor();
  const biaPath = new URL(ana.url()).pathname;
  assert((await dayStatus(ana, biaPath, T(-4))) === "missed", "bia T-4 missed");
  assert((await dayStatus(ana, biaPath, T(-3))) === "done", "bia T-3 done");
  assert((await dayStatus(ana, biaPath, TODAY)) === "pending", "bia today pending");

  await ana.goto(`${APP}${biaPath}`);
  await ana.waitForLoadState("networkidle");
  await ana.locator("details summary").click();
  await ana.getByRole("link", { name: "Caio", exact: true }).click();
  await ana.getByRole("heading", { name: "Caio" }).waitFor();
  await ana.getByLabel("Mês anterior").click();
  await ana.getByRole("heading", { name: monthName(PREV_MONTH) }).waitFor();
  const caioPath = new URL(ana.url()).pathname;
  const firstOwed = owedDays(CAIO_JOIN, lastOfPrevMonth)[0];
  assert((await dayStatus(ana, caioPath, firstOwed)) === "missed", `caio ${firstOwed}`);
  assert((await dayStatus(ana, caioPath, `${PREV_MONTH}-19`)) === "before", "caio 19th, before joining");
});

// A weekday among the past obligation days, never Sunday (some locales sort it differently) and not today's.
const NEW_OFF_DAY = [T(-2), T(-3)].find((d) => weekday(d) !== 0);
const NEW_OFF = weekday(NEW_OFF_DAY);
await step("settings: change day off (from next Monday) without rewriting history", async () => {
  await ana.goto(`${APP}/config`);
  await ana.getByRole("radio", { name: WEEKDAYS_PT[NEW_OFF].slice(0, 3) }).click();
  await ana.getByText(`Folga: ${WEEKDAYS_PT[NEW_OFF]} a partir de segunda, ${ddmm(nextMonday(TODAY))}.`).waitFor();
  await ana.getByText(`Nesta semana: ${WEEKDAYS_PT[OFF]}`, { exact: false }).waitFor();
  await ana.goto(`${APP}${anaPath}`);
  await ana.getByTestId("streak").waitFor();
  assert((await dayStatus(ana, anaPath, NEW_OFF_DAY)) === "done", "past day with the new weekday unchanged");
  assert((await text(ana.getByTestId("streak"))) === "6", "streak unchanged");
});

await step("settings: rename + avatar appear in the feed", async () => {
  await ana.goto(`${APP}/config`);
  await ana.fill("#name", "Ana Clara");
  await ana.getByRole("button", { name: "Salvar" }).click();
  await ana.getByText("Nome salvo.").waitFor();
  await ana.getByTestId("avatar").setInputFiles(FIXTURE);
  await ana.getByText("Foto atualizada.").waitFor();
  await ana.goto(`${APP}/feed`);
  const img = ana.locator('[data-member="Ana Clara"] img').first();
  await img.waitFor();
  assert((await img.evaluate((i) => i.naturalWidth)) === 512, "avatar compressed to 512");
});

await step("logout returns to login and protects pages", async () => {
  await ana.goto(`${APP}/config`);
  await ana.getByRole("button", { name: "Sair" }).click();
  await ana.waitForURL("**/login");
  await ana.goto(`${APP}/dividas`);
  await ana.waitForURL("**/login");
});

await browser.close();
done();

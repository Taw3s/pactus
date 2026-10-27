// Stage (m): the owner removes a member, a member leaves, a member deletes the account (last stage: it
// takes people out of the group).
import { APP, assert, done, launch, loginAs, newPhone, sql, step } from "./lib.mjs";

const browser = await launch();
const group = sql("select id from groups where invite_code is not null order by created_at limit 1");
const ownerEmail = sql(`select u.email from groups g join auth.users u on u.id = g.owner_id where g.id = '${group}'`);
const idOf = (email) => sql(`select id from auth.users where email = '${email}'`);
const files = (user) => Number(sql(`select count(*) from storage.objects where bucket_id = 'media' and name like '${group}/${user}/%'`));
// Three people who are not the owner: one is removed, one leaves, one deletes the account.
const [removed, leaver, deleter] = sql(
  `select u.email from members m join auth.users u on u.id = m.user_id where m.group_id = '${group}' and u.email <> '${ownerEmail}' order by u.email limit 3`,
).split("\n");

await step("a member who is not the owner sees no 'Remover'", async () => {
  const p = await loginAs(browser, leaver);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).waitFor();
  assert((await p.getByRole("button", { name: /^Remover / }).count()) === 0, "remove buttons for a non-owner");
  await p.context().close();
});

await step("the owner removes a member: proofs and photos go, payments received stay with the name", async () => {
  const id = idOf(removed);
  const name = sql(`select display_name from members where user_id = '${id}'`);
  const received = Number(sql(`select count(*) from payments where received_by = '${id}'`));
  assert(files(id) > 0, "the member had photos");
  const p = await loginAs(browser, ownerEmail);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: `Remover ${name}` }).click();
  await p.getByText(`${name} saiu do grupo.`).waitFor();
  assert(sql(`select count(*) from members where user_id = '${id}'`) === "0", "still a member");
  assert(sql(`select count(*) from auth.users where id = '${id}'`) === "1", "the account was deleted");
  assert(files(id) === 0, "photos left behind");
  assert(Number(sql(`select count(*) from payments where received_by is null and received_name = '${name.replace(/'/g, "''")}'`)) === received, "payments lost");
  await p.context().close();
});

await step("the removed member signs in and is asked for an invite code", async () => {
  const { ctx, page } = await newPhone(browser);
  await page.goto(`${APP}/login`);
  await page.fill("#email", removed);
  await page.fill("#password", "senha123");
  await page.click("button:text-is('Entrar')");
  await page.waitForURL("**/join**");
  await ctx.close();
});

await step("a member leaves the group from Configurações", async () => {
  const id = idOf(leaver);
  const p = await loginAs(browser, leaver);
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Sair do grupo" }).click();
  await p.waitForURL("**/join**");
  assert(sql(`select count(*) from members where user_id = '${id}'`) === "0", "still a member");
  assert(files(id) === 0, "photos left behind");
  await p.context().close();
});

await step("a member deletes the account (typing EXCLUIR): the user and the photos are gone", async () => {
  const id = idOf(deleter);
  const p = await loginAs(browser, deleter);
  p.removeAllListeners("dialog");
  p.on("dialog", (d) => d.accept("excluir"));
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Excluir minha conta" }).click();
  await p.waitForURL("**/login**");
  assert(sql(`select count(*) from auth.users where id = '${id}'`) === "0", "the account still exists");
  assert(files(id) === 0, "photos left behind");
  await p.context().close();
});

await step("a wrong confirmation deletes nothing", async () => {
  const p = await loginAs(browser, ownerEmail);
  p.removeAllListeners("dialog");
  p.on("dialog", (d) => d.accept("sim"));
  await p.goto(`${APP}/config`);
  await p.getByRole("button", { name: "Excluir minha conta" }).click();
  await p.waitForTimeout(800);
  assert(p.url().includes("/config"), "left the page");
  assert(sql(`select count(*) from auth.users where email = '${ownerEmail}'`) === "1", "deleted anyway");
  await p.context().close();
});

await browser.close();
done();

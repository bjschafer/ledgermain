import { expect, type Page, test } from "@playwright/test";

/**
 * Category-scoped save bonuses on the sheet: a bonus that applies only against
 * a kind of effect renders as a situational line under the seal rather than
 * moving the headline number. Dwarf Steel Soul is the fixture ("+2 racial vs.
 * poison, +4 racial vs. spells and spell-like abilities"), since it puts two
 * different totals on one save and only one of them on the others.
 */

const benign = (t: string) =>
  /fonts\.(googleapis|gstatic)|favicon|net::ERR_|Failed to load resource/i.test(t);

function guard(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !benign(msg.text())) consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  return { consoleErrors, pageErrors };
}

/** The Fort/Ref/Will seals, in that order. */
function saveSeals(page: Page) {
  return page
    .locator(".stat-group")
    .filter({ has: page.locator(".stat-group-legend", { hasText: "Saves" }) })
    .locator(".seal");
}

test("a category-scoped racial bonus shows as a situational line, not in the total", async ({
  page,
}) => {
  const errs = guard(page);

  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  // The panel h2 runs its step marker straight onto the title ("Raceiii"), so
  // this matches on a prefix rather than a word boundary.
  const racePanel = page
    .locator("section.panel")
    .filter({ has: page.locator("h2", { hasText: /^Race/ }) });

  const header = racePanel.getByRole("button", { name: "Race" });
  if ((await header.getAttribute("aria-expanded")) === "false") await header.click();

  await racePanel.getByRole("button", { name: "Dwarf", exact: true }).click();
  // Switching away from an already-set race confirms first; a blank one does not.
  const confirmSwitch = page.getByRole("button", { name: "Switch race" });
  if (await confirmSwitch.isVisible().catch(() => false)) await confirmSwitch.click();

  await expect(racePanel).toContainText("Alternate racial traits");

  const steelSoul = racePanel.locator(".pick-row", { hasText: "Steel Soul" }).first();
  const addOrRemove = steelSoul.getByRole("button", { name: /^(Add|Remove)$/ });
  if ((await addOrRemove.textContent()) === "Add") await addOrRemove.click();

  // Fortitude carries both categories at different totals, so it gets two
  // lines. Poison can never be rolled on Reflex or Will, so those show only
  // the spells line.
  const fort = saveSeals(page).nth(0).locator(".seal-conditionals");
  await expect(fort).toBeVisible();
  await expect(fort).toContainText("spells/SLAs");
  await expect(fort).toContainText("poison");

  const ref = saveSeals(page).nth(1).locator(".seal-conditionals");
  await expect(ref).toContainText("spells/SLAs");
  await expect(ref).not.toContainText("poison");

  // The headline save is unchanged by a scoped bonus: Dwarf Con +2 on a
  // level-1 character with no class levels leaves Fortitude at its base.
  const fortValue = await saveSeals(page).nth(0).locator(".seal-value").textContent();
  expect(fortValue?.trim()).not.toContain("+4");

  expect(errs.consoleErrors).toEqual([]);
  expect(errs.pageErrors).toEqual([]);
});

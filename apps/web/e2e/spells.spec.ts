import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The spellbook editing flow in a real browser. Adding a spell means picking
 * from several hundred class spells, which happens in the full-screen spell
 * manager rather than in the builder panel — this drives that round trip:
 * open the manager, search, add, and confirm the pick lands in the panel's
 * known list after the dialog closes.
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

/**
 * A spell row by name. Matches on `.pname` rather than the row's text: every
 * row embeds the spell's full description, so a bare `hasText` also matches
 * spells that merely *mention* the one you're after.
 */
function spellRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: new RegExp(`^${name}$`) }) });
}

/** Build a wizard so the Spells panel has a caster class to work from. */
async function gotoWizardSpells(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Wizard", exact: true }).click();

  // By heading, not by text: the Gear panel also mentions "Spellbooks (WIZ)".
  return page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Spellbook" }),
  });
}

test("a spell added in the manager lands in the panel's known list", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWizardSpells(page);

  await panel.getByRole("button", { name: "Edit spellbook" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Search spells").fill("mirror image");

  const browse = dialog.locator(".spell-pane").first();
  const knownPane = dialog.locator(".spell-pane--known");
  await expect(knownPane).toContainText("Nothing here yet");

  await spellRow(browse, page, "Mirror Image").getByRole("button", { name: "Add" }).click();

  // It appears in the known pane immediately, without the search being cleared.
  await expect(spellRow(knownPane, page, "Mirror Image")).toBeVisible();
  await expect(dialog.getByLabel("Search spells")).toHaveValue("mirror image");

  // Escape closes, and the panel behind reflects the new spell.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(spellRow(panel, page, "Mirror Image")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the school and level filters narrow the browse pane", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWizardSpells(page);
  await panel.getByRole("button", { name: "Edit spellbook" }).click();

  const dialog = page.getByRole("dialog");
  const browse = dialog.locator(".spell-pane").first();

  await dialog.getByLabel("Filter by school").selectOption({ label: "Necromancy" });
  await dialog.getByLabel("Filter by spell level").selectOption({ label: "Level 1" });

  // Chill Touch is a level-1 wizard necromancy spell; Magic Missile (level 1,
  // evocation) must be filtered out by the school facet.
  await expect(spellRow(browse, page, "Chill Touch")).toBeVisible();
  await expect(spellRow(browse, page, "Magic Missile")).toHaveCount(0);

  // Clearing restores the unfiltered list.
  await dialog.getByRole("button", { name: "clear" }).click();
  await expect(spellRow(browse, page, "Magic Missile")).toHaveCount(1);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

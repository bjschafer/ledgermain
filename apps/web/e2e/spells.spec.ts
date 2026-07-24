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

test("spell levels collapse, and the state survives reopening", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWizardSpells(page);
  await panel.getByRole("button", { name: "Edit spellbook" }).click();

  const dialog = page.getByRole("dialog");
  const browse = dialog.locator(".spell-pane").first();
  const level1 = browse.getByRole("button", { name: /^Level 1/ });

  await expect(spellRow(browse, page, "Alarm")).toBeVisible();
  await expect(level1).toHaveAttribute("aria-expanded", "true");

  await level1.click();
  await expect(level1).toHaveAttribute("aria-expanded", "false");
  await expect(spellRow(browse, page, "Alarm")).toHaveCount(0);
  // The heading keeps its count, so a collapsed level still shows it has spells.
  await expect(level1).toContainText("245");

  // Collapse is per pane: the known pane's own Level 2 is unaffected.
  await dialog.getByLabel("Search spells").fill("mirror image");
  await spellRow(browse, page, "Mirror Image").getByRole("button", { name: "Add" }).click();
  const knownPane = dialog.locator(".spell-pane--known");
  await expect(knownPane.getByRole("button", { name: /^Level 2/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  // Reopening the manager restores the collapsed level.
  await page.keyboard.press("Escape");
  await panel.getByRole("button", { name: "Edit spellbook" }).click();
  await expect(browse.getByRole("button", { name: /^Level 1/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

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

/**
 * The arcanist (a hybrid caster) splits her daily loop across two tabs:
 * Prepare (ready spells from the spellbook) and Cast (spend a slot on anything
 * readied). A fresh arcanist opens in Prepare; once a cantrip is readied it
 * shows in the Cast tab as an at-will spell (her spells-per-day table has no
 * level-0 column, so cantrips never spend a slot).
 */
test("an arcanist's prepared cantrips show as at-will in the Cast tab", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();
  await page
    .locator(".panel", { hasText: "Classes" })
    .first()
    .getByRole("button", { name: "Arcanist", exact: true })
    .click();

  await page.getByRole("tab", { name: "Play" }).click();
  const spells = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Spells" }),
  });

  // Nothing readied yet, so the panel opens in Prepare mode.
  const prepare = spells.locator(".spell-mode-panel.is-prepare");
  await expect(prepare).toBeVisible();

  // Ready a cantrip: open the Cantrips level's picker and add Acid Splash.
  const prepareCantrips = prepare
    .locator("section.prep-level")
    .filter({ has: page.locator(".prep-head-label", { hasText: /^Cantrips$/ }) });
  await prepareCantrips.locator("details.prep-add > summary").click();
  await spells.getByRole("button", { name: "prepare Acid Splash" }).click();

  // Switch to the Cast tab: the readied cantrip shows there, at will.
  await spells.getByRole("tab", { name: "Cast" }).click();
  const castCantrips = spells
    .locator(".spell-mode-panel.is-cast section.prep-level")
    .filter({ has: page.locator(".prep-head-label", { hasText: /^Cantrips$/ }) });
  await expect(castCantrips.locator(".prep-name", { hasText: "Acid Splash" })).toBeVisible();
  await expect(castCantrips.locator(".prep-atwill").first()).toHaveText("at will");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

/**
 * An elemental specialist (issue #100) exercises the two mechanics that don't
 * work like a standard school's: the bonus school slot draws from the school's
 * own cross-school spell list rather than a `Spell.school` match, and the
 * opposition is a single element (Air's is fixed to Earth) instead of two
 * schools. Shocking Grasp is evocation, but it's on Air's 1st-level list.
 */
test("an air elementalist opposes Earth and fills the school slot from Air's list", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWizardSpells(page);

  const school = page.locator(".school-picker");
  await school.getByRole("combobox").selectOption({ label: "Air (Elemental)" });

  // Fixed opposite: chosen for the player, and no two-school picker in sight.
  const opposition = page.locator(".opposition-picker");
  await expect(opposition.getByRole("heading", { name: /Opposition Element/ })).toBeVisible();
  await expect(opposition.locator(".opposition-chosen")).toContainText("Earth");
  await expect(page.getByRole("heading", { name: "Opposition Schools" })).toHaveCount(0);

  // Learn Shocking Grasp — evocation, but on Air's list.
  await panel.getByRole("button", { name: "Edit spellbook" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search spells").fill("shocking grasp");
  await spellRow(dialog.locator(".spell-pane").first(), page, "Shocking Grasp")
    .getByRole("button", { name: "add" })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await page.getByRole("tab", { name: "Play" }).click();
  const spells = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Spells" }),
  });
  const schoolSlots = spells.locator(".school-slots");
  await expect(schoolSlots.locator(".school-slots-title")).toContainText("Air (Elemental)");

  const slotL1 = schoolSlots
    .locator("section.prep-level")
    .filter({ has: page.locator(".prep-head-label", { hasText: /^School L1$/ }) });
  await slotL1.locator("details.prep-add > summary").click();
  await slotL1.getByRole("button", { name: "prepare Shocking Grasp in the school slot" }).click();
  await expect(slotL1.locator(".prep-rows .prep-name")).toHaveText("Shocking Grasp");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

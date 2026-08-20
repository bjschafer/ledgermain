import { expect, type Locator, type Page, test } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * Metamagic at the table, end to end. The slot arithmetic is pinned by unit
 * tests (`apps/web/test/metamagic.test.ts`); what this adds is the flow a
 * player actually clicks: the per-row Metamagic control appears only once a
 * metamagic feat is owned, a prepared caster's modified spell re-buckets into
 * the higher slot level, a spontaneous caster's cast-time toggle spends the
 * higher slot, and Magical Lineage's chosen spell casts cheaper again.
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
 * A spell-manager row by exact name (`.pname` rather than row text: rows embed
 * the full description, so a bare `hasText` also matches entries that merely
 * mention the one you're after).
 */
function pickRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: new RegExp(`^${name}$`) }) });
}

/**
 * A feat-manager row by name PREFIX: a feat's `.pname` can carry trailing
 * markers (e.g. the wizard's "bonus slot" button), so an exact match misses.
 * Callers take `.first()` — the base feat sorts before its "-Like Ability" /
 * "(Mythic)" kin.
 */
function featRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: new RegExp(`^${name}`) }) })
    .first();
}

/** Start a fresh character of the given class and return the Classes panel. */
async function pickClass(page: Page, className: string) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: className, exact: true }).click();
  return classes;
}

/**
 * Class levels render as a read-only stepper (no fillable input), so levelling
 * means clicking that row's own increment `times` times.
 */
async function levelUp(page: Page, scope: Locator, className: string, times: number) {
  const stepper = scope.locator(".stepper").filter({ has: page.getByLabel(`${className} level`) });
  for (let i = 0; i < times; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }
}

/** Add one feat through the feat manager (open, search, add, close). */
async function addFeat(page: Page, name: string) {
  const panel = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Feats" }),
  });
  await panel.getByRole("button", { name: "Choose feats" }).click();

  const dialog = page.getByRole("dialog");
  await typeSearch(dialog.getByLabel("Search feats"), name);
  await featRow(dialog.locator(".spell-pane").first(), page, name)
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await expect(featRow(dialog.locator(".spell-pane--known"), page, name)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}

/** Add one spell to the known list through the spell manager (open, search, add, close). */
async function addKnownSpell(page: Page, panelHeading: string, name: string) {
  const panel = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: panelHeading }),
  });
  await panel.getByRole("button", { name: "Edit spellbook" }).click();

  const dialog = page.getByRole("dialog");
  await typeSearch(dialog.getByLabel("Search spells"), name);
  await pickRow(dialog.locator(".spell-pane").first(), page, name)
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await expect(pickRow(dialog.locator(".spell-pane--known"), page, name)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}

/** The Play tab's Spells panel. */
function spellsPanel(page: Page) {
  return page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Spells" }),
  });
}

/** One spell-level section of the panel, by its exact header label. */
function levelSection(panel: Locator, page: Page, label: string) {
  return panel
    .locator("section.prep-level")
    .filter({ has: page.locator(".prep-head-label", { hasText: new RegExp(`^${label}$`) }) });
}

/** A spell row in a level section, by exact spell name. */
function spellRow(section: Locator, page: Page, name: string) {
  return section
    .locator(".prep-row")
    .filter({ has: page.locator(".prep-name", { hasText: new RegExp(`^${name}$`) }) });
}

/**
 * Prepared caster: a level-5 wizard prepares Magic Missile plain, then takes
 * Empower Spell (+2) and Dazing Spell (+3). The Metamagic control is absent
 * until a metamagic feat is owned; once owned, applying Empower re-buckets the
 * prepared row from Level 1 to Level 3 (base+2) and marks its base level, and
 * Dazing is offered but disabled because base 1 + 3 = 4 exceeds the wizard's
 * highest slot (3).
 */
test("empowering a prepared spell re-buckets it two slot levels up", async ({ page }) => {
  // Two full manager round trips (spellbook + feats) plus four level-ups and
  // three mode switches — too many steps for the default budget on a loaded
  // CI runner once retry traces are added on top.
  test.slow();
  const { consoleErrors, pageErrors } = guard(page);

  const classes = await pickClass(page, "Wizard");
  await levelUp(page, classes, "Wizard", 4);
  await addKnownSpell(page, "Spellbook", "Magic Missile");

  // Prepare it into a level-1 slot.
  await page.getByRole("tab", { name: "Play" }).click();
  const spells = spellsPanel(page);
  const level1 = levelSection(spells, page, "Level 1");
  await level1.locator("details.prep-add > summary").click();
  await level1.getByRole("button", { name: "prepare Magic Missile", exact: true }).click();
  const row = spellRow(level1, page, "Magic Missile");
  await expect(row).toBeVisible();

  // Gating: no metamagic feat owned yet, so the row has no Metamagic control.
  await expect(row.locator(".prep-metamagic")).toHaveCount(0);

  await page.getByRole("tab", { name: "Build" }).click();
  await addFeat(page, "Empower Spell");
  await addFeat(page, "Dazing Spell");

  await page.getByRole("tab", { name: "Play" }).click();
  await row.locator("details.prep-metamagic > summary").click();

  // Dazing Spell (a long-tail registry entry) is offered as an owned chip —
  // but disabled here: base 1 + 3 would need a level-4 slot and the wizard's
  // highest is 3.
  const dazing = row.getByRole("button", { name: "Dazing Spell +3" });
  await expect(dazing).toBeVisible();
  await expect(dazing).toBeDisabled();

  // Empower fits (1 + 2 = 3): the row leaves Level 1 and lands in Level 3,
  // consuming that level's single slot, with its base level called out.
  await row.getByRole("button", { name: "Empower Spell +2" }).click();
  const level3 = levelSection(spells, page, "Level 3");
  const movedRow = spellRow(level3, page, "Magic Missile");
  await expect(movedRow).toBeVisible();
  await expect(movedRow.locator(".prep-mm-badge")).toHaveText("base L1");
  await expect(level3.locator(".prep-count")).toContainText("1/1 prepared");
  await expect(spellRow(level1, page, "Magic Missile")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

/**
 * Spontaneous caster: a level-4 sorcerer with Extend Spell toggles it at cast
 * time — the Cast button then spends a level-2 slot for the level-1 spell.
 * Magical Lineage is taken up front but names no spell yet (no pick, no
 * effect); once Mage Armor is chosen, the same toggle costs nothing and the
 * cast stays at level 1.
 */
test("extending a spontaneous cast spends the higher slot until Magical Lineage discounts it", async ({
  page,
}) => {
  // Three manager round trips (feats + spells known + traits) and repeated
  // mode switches — same time-budget reasoning as the wizard test above.
  test.slow();
  const { consoleErrors, pageErrors } = guard(page);

  const classes = await pickClass(page, "Sorcerer");
  await levelUp(page, classes, "Sorcerer", 3); // level 4: first level-2 slots
  await addFeat(page, "Extend Spell");
  await addKnownSpell(page, "Spells Known", "Mage Armor");

  // Take Magical Lineage, deliberately leaving its chosen spell unpicked.
  const traits = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Traits" }),
  });
  await traits.getByRole("button", { name: "Choose traits" }).click();
  const dialog = page.getByRole("dialog");
  await typeSearch(dialog.getByRole("textbox", { name: "Search traits" }), "Magical Lineage");
  const traitHit = dialog.locator("section", { hasText: "Catalog" }).first().locator(".pick-row");
  await expect(traitHit.first()).toContainText("Magical Lineage");
  await traitHit.first().getByRole("button", { name: "Add" }).click();
  await expect(dialog.locator(".spell-pane--known .pick-row")).toContainText("Magical Lineage");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // Cast time: Extend bumps the slot the Cast button spends to base+1.
  await page.getByRole("tab", { name: "Play" }).click();
  const spells = spellsPanel(page);
  const level1 = levelSection(spells, page, "Level 1");
  const level2 = levelSection(spells, page, "Level 2");
  await expect(level1.locator(".prep-count")).toContainText("6/6 remaining");
  await expect(level2.locator(".prep-count")).toContainText("3/3 remaining");

  const row = spellRow(level1, page, "Mage Armor");
  const cast = row.getByRole("button", { name: "Cast", exact: true });
  await expect(cast).toHaveAttribute("title", "Cast Mage Armor (spend 1 level-1 slot)");

  await row.locator("details.prep-metamagic > summary").click();
  await row.getByRole("button", { name: "Extend Spell +1" }).click();
  await expect(cast).toHaveAttribute(
    "title",
    "Cast Mage Armor with metamagic (spend 1 level-2 slot)",
  );

  // Casting spends a level-2 slot and leaves the level-1 pool untouched.
  await cast.click();
  await expect(level2.locator(".prep-count")).toContainText("2/3 remaining");
  await expect(level1.locator(".prep-count")).toContainText("6/6 remaining");

  // Name Mage Armor as the Magical Lineage spell in the builder.
  await page.getByRole("tab", { name: "Build" }).click();
  await traits
    .locator(".pick-row")
    .filter({ hasText: "Magical Lineage" })
    .getByRole("combobox")
    .selectOption({ label: "Mage Armor (level 1)" });

  // The discount surfaces in the control, and the extended cast is back to a
  // level-1 slot (the +1 is fully absorbed, never below the base level).
  await page.getByRole("tab", { name: "Play" }).click();
  await row.locator("details.prep-metamagic > summary").click();
  await expect(row.locator(".prep-metamagic-discount")).toContainText(
    "Magical Lineage: metamagic on this spell costs 1 slot level less",
  );
  await row.getByRole("button", { name: "Extend Spell +1" }).click();
  await expect(cast).toHaveAttribute("title", "Cast Mage Armor (spend 1 level-1 slot)");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

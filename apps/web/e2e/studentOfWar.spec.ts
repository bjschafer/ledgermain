import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Student of War end-to-end: the prestige entry-requirement gate in the class
 * picker, Additional Skill's player-chosen class skill, and Mind Over Metal's
 * ability substitution reaching the live sheet.
 *
 * The engine's own fixtures pin the arithmetic (see
 * `packages/engine/test/abilitySubstitution.test.ts` and
 * `bonusClassSkills.test.ts`); what this adds is that
 * the class is reachable through the real builder, that its hybrid gate
 * behaves per-requirement rather than all-or-nothing, and that the substituted
 * AC lands on the sheet a player actually reads.
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

function sealValue(page: Page, label: string) {
  return page.locator(".seal", { hasText: label }).locator(".seal-value");
}

function pickRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: new RegExp(`^${name}`) }) });
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

test("Student of War gates on entry, grants a chosen class skill, and substitutes Int for Dex in AC", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });

  const row = page.locator(".prestige-class-list .pick-row", { hasText: "Student of War" });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible();
  // `.pick-btn` rather than a role lookup: the soft-advisory InfoTip beside it
  // is also exposed as a button.
  const pick = row.locator(".pick-btn");
  await expect(pick).toHaveText("Locked");
  await expect(row.locator(".ck-unmet").first()).toContainText("BAB +5");
  // Parametrized and prose requirements are advisory, never blocking.
  await expect(row.locator(".preq")).toContainText("five distinct creatures");

  // Int 20 (+5), Dex 14 (+2). Both minimums matter for the feats taken below:
  // Combat Expertise needs Int 13, Dodge needs Dex 13.
  const abilities = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Ability Scores" }),
  });
  // NumberField commits on blur/Enter, not on input — `fill` alone would leave
  // the score unchanged.
  for (const [label, score] of [
    ["INT base score", "20"],
    ["DEX base score", "14"],
  ] as const) {
    await abilities.getByLabel(label).fill(score);
    await abilities.getByLabel(label).press("Enter");
  }

  // Fighter 5 clears BAB +5 — but the feat requirements are still unmet, so the
  // row stays locked. The gate is per-requirement, not all-or-nothing.
  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await classes.getByRole("button", { name: "Fighter", exact: true }).click();
  await levelUp(page, classes, "Fighter", 4);
  await expect(row.locator(".ck-met").first()).toContainText("BAB +5");
  await expect(pick).toHaveText("Locked");

  const feats = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Feats" }),
  });
  await feats.getByRole("button", { name: "Choose feats" }).click();
  const featDialog = page.getByRole("dialog");
  const catalog = featDialog.locator(".spell-pane").first();
  for (const feat of ["Combat Expertise", "Dodge"]) {
    await featDialog.getByLabel("Search feats").fill(feat);
    await pickRow(catalog, page, feat)
      .first()
      .getByRole("button", { name: "Add", exact: true })
      .click();
  }
  await page.keyboard.press("Escape");
  await expect(featDialog).toHaveCount(0);

  // All structured requirements met — the class unlocks.
  await expect(pick).toHaveText("Add");
  await pick.click();
  await levelUp(page, classes, "Student of War", 1); // 2nd level grants Mind Over Metal

  // Additional Skill (issue #93): SoW 2 entitles her to one player-chosen
  // class skill. Stealth is on neither the fighter nor the Student of War
  // list, so the "class" tag on the sheet can only come from the pick.
  const stealthRow = page.locator(".sheet-skill", { hasText: "Stealth" });
  await expect(stealthRow.locator(".tag-cls")).toHaveCount(0);
  const bonusSkills = classes.locator(".bonus-class-skills-picker");
  await bonusSkills.scrollIntoViewIfNeeded();
  await bonusSkills.getByLabel("Pick 1").selectOption({ label: "Stealth" });
  await expect(stealthRow.locator(".tag-cls")).toHaveCount(1);

  const ac = sealValue(page, "Armor Class");
  await expect(ac).toHaveText("13"); // 10 base + Dex 2 + Dodge 1 — unarmored, no substitution

  // Equipping armor flips the AC line onto Intelligence.
  const gear = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Gear & Inventory" }),
  });
  await gear.getByRole("button", { name: "+ Add worn armor / shield" }).click();
  await gear.getByPlaceholder("Search armor & shields…").fill("Breastplate");
  await pickRow(gear, page, "Breastplate").first().getByRole("button", { name: "Add" }).click();

  // 10 base + 6 breastplate + 4 + 1 Dodge = 21. Int +5 is capped by the
  // breastplate's max Dex 3, raised to 4 by Fighter 5's Armor Training — and
  // the capped Int beats the Dex +2 it replaced.
  await expect(ac).toHaveText("21");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

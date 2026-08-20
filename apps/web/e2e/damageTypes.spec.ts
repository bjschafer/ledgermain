import { expect, test, type Page } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * Typed damage e2e: the free-text amount field parses what a GM says, and the
 * engine's DR/resistance resolver reduces it before it reaches HP.
 *
 * Uses the custom-buff form to grant real DR rather than stubbing a sheet, so
 * this exercises the whole path — Change -> collectModifiers -> computeDefenses
 * -> qualifier normalization -> parse -> resolve -> applyDamage.
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

async function gotoPlay(page: Page) {
  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Play" }).click();
}

/** Authors a custom buff granting one `dr`-family change at `value`. */
async function grantDr(page: Page, target: string, value: string) {
  await page.getByText("Custom buff (expert)").click();
  const form = page.locator(".cb-grid");
  await form.getByLabel("Bonus applies to").selectOption(target);
  await form.getByLabel("Value", { exact: true }).fill(value);
  await form.getByRole("button", { name: "Add" }).click();
}

test("an untyped amount is treated as weapon damage and meets DR", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "dr", "10");

  const amount = page.getByLabel("Amount");
  await amount.fill("17");

  // The preview explains the reduction rather than silently applying it.
  await expect(page.locator(".hp-damage-preview")).toContainText("DR 10/—");
  await expect(page.locator(".hp-damage-result")).toContainText("7");
  await expect(page.locator(".hp-damage-note")).toContainText("treated as weapon damage");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("an explicit type routes each part to its own defense", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "dr", "10");

  const amount = page.getByLabel("Amount");
  // "12 bludgeoning and 6 cold": DR eats 10 of the bludgeoning, cold is untouched.
  await amount.fill("12b 6c");

  const preview = page.locator(".hp-damage-preview");
  await expect(preview).toContainText("12 bludgeoning");
  await expect(preview).toContainText("6 cold");
  await expect(page.locator(".hp-damage-result")).toContainText("8");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("a bypass chip drops the DR it defeats", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "dr.adamantine", "10");

  const amount = page.getByLabel("Amount");
  await amount.fill("17");
  await expect(page.locator(".hp-damage-result")).toContainText("7");

  // The GM says the attack was adamantine — the DR stops applying.
  await page.locator(".hp-bypass-chip", { hasText: "adamantine" }).click();
  await expect(page.locator(".hp-damage-preview")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the Damage button applies the reduced number to HP", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "dr", "10");

  await page.getByLabel("Amount").fill("17");
  await page.getByRole("button", { name: "Damage", exact: true }).click();

  // Level-0 default character; 17 raw would have been 10 more.
  await expect(page.locator(".hp-big")).toContainText("-7");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("stoneskin's pool depletes as it absorbs, and the spell ends when spent", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  // Level-0 character → caster level floors at 1 → pool capacity 10.
  await typeSearch(page.getByPlaceholder("Search the buff compendium…"), "Stoneskin");
  await page
    .locator(".pick-row", { hasText: "Stoneskin" })
    .getByRole("button", { name: "Add" })
    .click();

  const pool = page.locator(".hp-chip.pool");
  await expect(pool).toContainText("10/10");

  // A 4-point hit: DR 10/adamantine prevents all 4, drawing 4 from the pool.
  await page.getByLabel("Amount").fill("4");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(pool).toContainText("6/10");

  // Spend the rest — the discharged spell ends rather than sitting at zero.
  await page.getByLabel("Amount").fill("6");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.locator(".hp-chip.pool")).toHaveCount(0);
  await expect(page.locator(".buff-row", { hasText: "Stoneskin" })).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("protection from energy asks for an element and soaks only that type", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await typeSearch(page.getByPlaceholder("Search the buff compendium…"), "Protection From Energy");
  const row = page.locator(".pick-row", { hasText: "Protection From Energy" });
  await row.getByLabel("Energy type").selectOption("cold");
  await row.getByRole("button", { name: "Add" }).click();

  // CL 1 → 12-point pool, labelled with the chosen element.
  await expect(page.locator(".hp-chip.pool")).toContainText("cold");
  await expect(page.locator(".hp-chip.pool")).toContainText("12/12");

  // Fire is untouched by a cold pool.
  await page.getByLabel("Amount").fill("8 fire");
  await expect(page.locator(".hp-damage-result")).toHaveCount(0);

  // Cold is absorbed outright.
  await page.getByLabel("Amount").fill("8 cold");
  await expect(page.locator(".hp-damage-result")).toContainText("0");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("naming a type is echoed back even when no defense touches it", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  const amount = page.getByLabel("Amount");
  // No resistances at all — the echo is confirmation the parse was understood,
  // not a report of a reduction.
  await amount.fill("5 fire");
  await expect(page.locator(".hp-damage-preview")).toContainText("5 fire");
  await expect(page.locator(".hp-damage-result")).toHaveCount(0);

  // A plain number stays quiet and shows the syntax tip instead.
  await amount.fill("5");
  await expect(page.locator(".hp-damage-preview")).toHaveCount(0);
  await expect(page.locator(".hp-damage-hint")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the amount clears after applying, ready for the next hit", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  const amount = page.getByLabel("Amount");
  await expect(amount).toHaveValue("");

  await amount.fill("7");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(amount).toHaveValue("");

  await amount.fill("3");
  await page.getByRole("button", { name: "Heal", exact: true }).click();
  await expect(amount).toHaveValue("");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("bypass chips stay hidden against pure energy damage", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "dr.adamantine", "10");

  const amount = page.getByLabel("Amount");
  await amount.fill("10");
  await expect(page.locator(".hp-bypass-chip")).toBeVisible();

  // DR can't touch fire, so offering to bypass it is noise.
  await amount.fill("10 fire");
  await expect(page.locator(".hp-bypass-chip")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("an immunity zeroes its damage type and shows on the sheet", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  await grantDr(page, "imm.fire", "1");

  // The sheet advertises it as a flag chip, not a number.
  await expect(page.locator(".immunity-chip")).toContainText("Immune: Fire");

  const amount = page.getByLabel("Amount");
  await amount.fill("30 fire");
  await expect(page.locator(".hp-damage-result")).toContainText("0");
  await expect(page.locator(".hp-damage-preview")).toContainText("Immune to fire");

  // Another type is untouched.
  await amount.fill("30 cold");
  await expect(page.locator(".hp-damage-result")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";

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
  await form.getByLabel("Target").selectOption(target);
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

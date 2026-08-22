import { expect, type Page, test } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * The Craft side of the consumables picker in a real browser: taking Scribe
 * Scroll turns the Buy/Craft toggle on, and crafting from it lands a scroll in
 * gear priced from the cleric's own list rather than the market's cheapest.
 *
 * `test/crafting.test.ts` pins the arithmetic; what this adds is that the
 * controls exist, wire together, and can be reached by pressing them.
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
 * Build a Cleric 5 and give it Scribe Scroll. A cleric prepares from the whole
 * class list, so the craft list is populated without picking spells first, and
 * CL 5 leaves room to build a scroll above its minimum caster level.
 */
async function takeScribeScroll(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Cleric", exact: true }).click();
  const stepper = classes.locator(".stepper").filter({ has: page.getByLabel("Cleric level") });
  for (let i = 0; i < 4; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }

  const feats = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Feats" }),
  });
  await feats.getByRole("button", { name: "Choose feats" }).click();

  const dialog = page.getByRole("dialog");
  await typeSearch(dialog.getByLabel("Search feats"), "Scribe Scroll");
  await dialog
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: /^Scribe Scroll/ }) })
    .first()
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  return page.locator(".panel", { hasText: "Gear & Inventory" });
}

test("Scribe Scroll unlocks the Craft side of the consumables picker", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await takeScribeScroll(page);

  await panel.getByRole("button", { name: "+ Add potion / scroll / wand" }).click();

  // Buying is unchanged and stays the default.
  const picker = panel.locator(".gear-picker");
  await expect(picker.getByRole("tab", { name: "Buy" })).toHaveAttribute("aria-selected", "true");

  await picker.getByRole("tab", { name: "Scrolls" }).click();
  await picker.getByRole("tab", { name: "Craft" }).click();
  await expect(picker.locator(".craft-controls")).toBeVisible();

  // A cleric scribes cure light wounds as a 1st-level spell at CL 1: a 25 gp
  // scroll, 12.5 gp to make, two hours, Spellcraft DC 6.
  await typeSearch(picker.getByPlaceholder("Search spells…"), "Cure Light Wounds");
  const row = picker
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: "Scroll of Cure Light Wounds (divine)" }) })
    .first();
  await expect(row).toContainText("12.5 gp to craft");
  await expect(row).toContainText("2 hours");
  await expect(row).toContainText("Spellcraft DC 6");
  await expect(row).toContainText("worth 25 gp");

  await row.getByRole("button", { name: "Craft" }).click();
  await expect(
    panel.locator(".gear-row", { hasText: "Scroll of Cure Light Wounds (divine)" }),
  ).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the caster-level chooser reprices a scroll and names the stronger one", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await takeScribeScroll(page);

  await panel.getByRole("button", { name: "+ Add potion / scroll / wand" }).click();
  const picker = panel.locator(".gear-picker");
  await picker.getByRole("tab", { name: "Scrolls" }).click();
  await picker.getByRole("tab", { name: "Craft" }).click();

  await typeSearch(picker.getByPlaceholder("Search spells…"), "Cure Light Wounds");
  // At the cleric's own CL 5 the same scroll is 1 × 5 × 25 = 125 gp.
  await picker.getByLabel("Caster level").selectOption("5");
  const row = picker
    .locator(".pick-row")
    .filter({
      has: page.locator(".pname", { hasText: "Scroll of Cure Light Wounds (divine, CL 5)" }),
    })
    .first();
  await expect(row).toContainText("62.5 gp to craft");
  await expect(row).toContainText("worth 125 gp");
  await expect(row).toContainText("Spellcraft DC 10");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

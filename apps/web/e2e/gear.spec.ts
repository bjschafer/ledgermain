import { expect, type Page, test } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * Gear editing in a real browser: every gear row is editable after creation,
 * including the charge cap. The motivating case is an imported wand recorded as
 * "47 charges" — really a standard 50-charge wand with 3 spent — which must be
 * correctable in place rather than deleted and re-added.
 */

async function gotoGear(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();
  return page.locator(".panel", { hasText: "Gear & Inventory" });
}

test("a wand's charge cap and spent charges are editable after creation", async ({ page }) => {
  const panel = await gotoGear(page);

  await panel.getByRole("button", { name: "+ Add custom gear (ammo, consumables, ...)" }).click();
  await panel.getByLabel("Name").fill("Wand of Cure Light Wounds");
  await panel.getByRole("button", { name: "Add to gear" }).click();

  const row = panel.locator(".gear-row", { hasText: "Wand of Cure Light Wounds" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: /^Edit/ }).click();
  await panel.getByLabel("Max charges").fill("50");
  await panel.getByLabel("Charges used").fill("3");
  await panel.getByRole("button", { name: "Save changes" }).click();

  await expect(row.locator(".gear-charges")).toContainText("charges: 47/50");
});

test("adding a class kit expands it into the gear it packs", async ({ page }) => {
  const panel = await gotoGear(page);

  await panel.getByRole("button", { name: "+ Add kit" }).click();
  await typeSearch(panel.getByPlaceholder("Search kits…"), "wizard");

  const pick = panel.locator(".pick-row", { hasText: "Kit, Wizard's" });
  // The picker previews the contents before you commit to adding them.
  await expect(pick).toContainText("13 items");
  await pick.getByRole("button", { name: "Add" }).click();

  // Packed gear lands as real rows, quantities intact.
  await expect(panel.locator(".gear-row", { hasText: "Bedroll" })).toBeVisible();
  await expect(panel.locator(".gear-row", { hasText: "Torch" })).toContainText("10");
  // A packed container stays a single row — no cutlery.
  await expect(panel.locator(".gear-row", { hasText: "Mess Kit" })).toBeVisible();
  await expect(panel.locator(".gear-row", { hasText: "Fork" })).toHaveCount(0);
  // The kit itself is never carried alongside its contents (double-counting).
  await expect(panel.locator(".gear-row", { hasText: "Kit, Wizard's" })).toHaveCount(0);
});

test("buying the same potion twice stacks the row and pays for both", async ({ page }) => {
  const panel = await gotoGear(page);

  await panel.getByLabel("gp (coins)").fill("1000");

  await panel.getByRole("button", { name: "+ Add potion / scroll / wand" }).click();
  const picker = panel.locator(".gear-picker");
  await picker.getByLabel("Pay from purse").check();
  await expect(picker.locator(".purse-note")).toContainText("carrying 1000 gp");

  // A potion of cure moderate wounds is spell level 2 at CL 3: 2 x 3 x 50 gp.
  async function buyCureModerate() {
    await typeSearch(picker.getByPlaceholder("Search spells…"), "Cure Moderate Wounds");
    await picker
      .locator(".pick-row")
      .filter({ has: page.locator(".pname", { hasText: "Potion of Cure Moderate Wounds" }) })
      .first()
      .getByRole("button", { name: "Buy" })
      .click();
  }

  await buyCureModerate();
  const row = panel.locator(".gear-row", { hasText: "Potion of Cure Moderate Wounds" });
  await expect(row).toHaveCount(1);
  await expect(row.getByLabel("Potion of Cure Moderate Wounds quantity")).toHaveValue("1");
  await expect(panel.getByLabel("gp (coins)")).toHaveValue("700");

  await panel.getByRole("button", { name: "+ Add potion / scroll / wand" }).click();
  await buyCureModerate();

  // The second one joins the first rather than opening its own row.
  await expect(row).toHaveCount(1);
  await expect(row.getByLabel("Potion of Cure Moderate Wounds quantity")).toHaveValue("2");
  await expect(panel.getByLabel("gp (coins)")).toHaveValue("400");
});

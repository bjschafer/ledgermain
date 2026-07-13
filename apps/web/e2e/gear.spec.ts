import { expect, type Page, test } from "@playwright/test";

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

import { expect, test, type Page } from "@playwright/test";

/**
 * A widened threat range, end to end. The engine fixtures
 * (`packages/engine/test/critRange.test.ts`) already prove the ranges against
 * the printed rules; what this adds is that the weapon a player actually
 * picks carries the catalog back-pointer the widening reads, and that the
 * sheet says what widened it.
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

function panel(page: Page, name: string) {
  return page.locator(".panel").filter({ has: page.getByRole("heading", { name }) });
}

async function swashbuckler(page: Page, level: number) {
  await page.goto("/");
  const classes = panel(page, "Classes");
  await expect(classes).toBeVisible({ timeout: 15_000 });
  await classes.getByRole("button", { name: "Swashbuckler", exact: true }).click();
  const value = classes.getByLabel("Swashbuckler level");
  while (Number(await value.innerText()) < level) {
    await classes.locator(".stepper").getByRole("button", { name: "increment" }).click();
  }

  const weapons = panel(page, "Weapons");
  await weapons.scrollIntoViewIfNeeded();
  await weapons.getByRole("button", { name: "+ Add weapon" }).click();
  await weapons.getByPlaceholder("Search weapons…").fill("rapier");
  await weapons
    .locator(".pick-row", { hasText: "Rapier" })
    .first()
    .getByRole("button", { name: "Add" })
    .click();
}

test("swashbuckler weapon training doubles a rapier's threat range on the sheet", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await swashbuckler(page, 5);

  const row = page.locator(".weapon-attack-row", { hasText: "Rapier" });
  await expect(row).toContainText("15–20/×2");
  await expect(row.locator(".weapon-attack-bypass")).toContainText("Threat range");
  await expect(row.locator(".crit-source-chip")).toHaveText("Swashbuckler Weapon Training");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("a swashbuckler below 5th keeps the rapier's printed 18-20", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await swashbuckler(page, 4);

  const row = page.locator(".weapon-attack-row", { hasText: "Rapier" });
  await expect(row).toContainText("18–20/×2");
  await expect(row.locator(".crit-source-chip")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

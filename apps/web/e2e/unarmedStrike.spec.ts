import { expect, test, type Page } from "@playwright/test";

/**
 * The unarmed strike end-to-end: it isn't a compendium weapon, so the picker
 * synthesizes it from the character's own class level and size. What this adds
 * over the model fixtures (`test/unarmedStrike.test.ts`) is that a brawler can
 * actually reach it from the weapon picker, that it lands as a normal weapon
 * row with the right die, and that levelling up offers to update that die.
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

function classesPanel(page: Page) {
  return page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Classes" }) });
}

/** The class level is a read-only stepper: level up by clicking `+`. */
async function levelUp(page: Page, to: number) {
  const classes = classesPanel(page);
  const value = classes.getByLabel("Brawler level");
  while (Number(await value.innerText()) < to) {
    await classes.locator(".stepper").getByRole("button", { name: "increment" }).click();
  }
}

async function brawler(page: Page, level: number) {
  await page.goto("/");
  const classes = classesPanel(page);
  await expect(classes).toBeVisible({ timeout: 15_000 });
  await classes.getByRole("button", { name: "Brawler", exact: true }).click();
  await levelUp(page, level);
  return page.locator(".panel").filter({ has: page.getByRole("heading", { name: "Weapons" }) });
}

test("a brawler can add an unarmed strike carrying her own damage die", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  const weapons = await brawler(page, 8);
  await weapons.scrollIntoViewIfNeeded();
  await weapons.getByRole("button", { name: "+ Add weapon" }).click();
  await weapons.getByPlaceholder("Search weapons…").fill("unarmed");

  // Synthesized, not vendored: the compendium has no unarmed strike at all.
  const pick = weapons.locator(".pick-row", { hasText: "Unarmed Strike" });
  await expect(pick).toHaveCount(1);
  await expect(pick).toContainText("1d10"); // brawler 8, Medium
  await expect(pick).toContainText("Brawler 8");
  await pick.getByRole("button", { name: "Add" }).click();

  const row = weapons.locator(".gear-row", { hasText: "Unarmed Strike" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("1d10");
  await expect(row).toContainText("type: unarmed strike");

  // It reaches the attack line, and takes no non-proficiency penalty there.
  const attack = page.locator(".panel", { hasText: "Attacks" }).first();
  await expect(attack).toContainText("Unarmed Strike");
  await expect(page.getByText("Unarmed Strike (non-proficient)")).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("levelling past a die step offers to update the entry", async ({ page }) => {
  const weapons = await brawler(page, 7);
  await weapons.scrollIntoViewIfNeeded();
  await weapons.getByRole("button", { name: "+ Add weapon" }).click();
  await weapons.getByPlaceholder("Search weapons…").fill("unarmed");
  await weapons
    .locator(".pick-row", { hasText: "Unarmed Strike" })
    .getByRole("button", {
      name: "Add",
    })
    .click();

  const row = weapons.locator(".gear-row", { hasText: "Unarmed Strike" });
  await expect(row).toContainText("1d8"); // brawler 7
  await expect(row.getByRole("button", { name: /^Set to/ })).toHaveCount(0);

  await levelUp(page, 8);

  await row.getByRole("button", { name: "Set to 1d10" }).click();
  await expect(row).toContainText("1d10");
  await expect(row.getByRole("button", { name: /^Set to/ })).toHaveCount(0);
});

test("the attack line says what a brawler's fists get through", async ({ page }) => {
  const weapons = await brawler(page, 9);
  await weapons.scrollIntoViewIfNeeded();
  await weapons.getByRole("button", { name: "+ Add weapon" }).click();
  await weapons.getByPlaceholder("Search weapons…").fill("unarmed");
  await weapons
    .locator(".pick-row", { hasText: "Unarmed Strike" })
    .getByRole("button", { name: "Add" })
    .click();

  // Brawler's Strike: magic at 5th, cold iron and silver at 9th.
  const row = page.locator(".weapon-attack-row", { hasText: "Unarmed Strike" });
  const bypass = row.locator(".weapon-attack-bypass");
  await expect(bypass).toContainText("Bypasses DR");
  await expect(bypass.locator(".bypass-chip")).toHaveText(["Cold iron", "Silver", "Magic"]);
});

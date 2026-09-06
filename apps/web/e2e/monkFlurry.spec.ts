import { expect, test, type Page } from "@playwright/test";

/**
 * A monk's flurry of blows, end to end: the attack line carries it, and a
 * saved roll can be switched over to it. The model fixtures
 * (`test/savedRolls.test.ts`, `packages/engine/test/flurry.test.ts`) already
 * prove the sequences against the printed columns; what this adds is that a
 * player can actually reach them from the app.
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

/** An unchained monk of `level`, punching. Default abilities, so no Strength bonus. */
async function monk(page: Page, level: number) {
  await page.goto("/");
  const classes = panel(page, "Classes");
  await expect(classes).toBeVisible({ timeout: 15_000 });
  await classes.getByRole("button", { name: "Monk (Unchained)", exact: true }).click();
  const value = classes.getByLabel("Monk (Unchained) level");
  while (Number(await value.innerText()) < level) {
    await classes.locator(".stepper").getByRole("button", { name: "increment" }).click();
  }

  const weapons = panel(page, "Weapons");
  await weapons.scrollIntoViewIfNeeded();
  await weapons.getByRole("button", { name: "+ Add weapon" }).click();
  await weapons.getByPlaceholder("Search weapons…").fill("unarmed");
  await weapons
    .locator(".pick-row", { hasText: "Unarmed Strike" })
    .getByRole("button", { name: "Add" })
    .click();
}

test("the attack line carries a monk's flurry sequence", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await monk(page, 8);

  // Unchained monk 8: full BAB 8, no Strength bonus, one extra attack at the
  // highest bonus and no penalty. Normal +8/+3, flurry +8/+8/+3.
  const row = page.locator(".weapon-attack-row", { hasText: "Unarmed Strike" });
  await expect(row.locator(".weapon-attack-flurry")).toContainText("Flurry");
  await expect(row.locator(".weapon-attack-flurry-seq")).toHaveText("+8/+8/+3");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("a saved roll can be switched over to the flurry", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await monk(page, 8);
  await page.getByRole("tab", { name: "Play" }).click();

  const saved = panel(page, "Saved Rolls");
  await saved.scrollIntoViewIfNeeded();
  await saved.getByRole("button", { name: "Add a saved roll" }).click();
  await saved.getByPlaceholder("Search attacks, saves…").fill("Unarmed");
  await saved
    .locator(".pick-row", { hasText: "Unarmed Strike (attack)" })
    .getByRole("button", { name: "Add" })
    .click();

  const row = saved.locator(".saved-roll-row").first();
  await expect(row.locator(".saved-roll-value-num")).toHaveText("+8/+3");

  await row.locator(".saved-roll-value-btn").click();
  await row.getByText("Flurry of blows", { exact: true }).click();

  await expect(row.locator(".saved-roll-value-num")).toHaveText("+8/+8/+3");
  await expect(row).toContainText("unarmed strikes or monk weapons only");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

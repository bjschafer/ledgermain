import { expect, test, type Page } from "@playwright/test";

/**
 * Stage 4 e2e: drive the real tracker UI and assert the gilded sheet recomputes.
 *   - toggle a condition -> a sheet stat changes (and reverts)
 *   - add a timed buff -> a sheet stat changes -> advance rounds -> it expires
 *     and the stat reverts
 * Reuses the smoke spec's console/pageerror guards.
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

/** The value text inside a named stat seal (e.g. "Armor Class" -> "10"). */
function sealValue(page: Page, label: string) {
  return page.locator(".seal", { hasText: label }).locator(".seal-value");
}

async function gotoPlay(page: Page) {
  await page.goto("/");
  await expect(page.getByText(/data 11\.11/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Play" }).click();
}

test("toggling a condition updates the sheet and reverts", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  const ac = sealValue(page, "Armor Class");
  await expect(ac).toHaveText("10"); // default level-0 character

  // Prone: -4 AC.
  await page.getByRole("button", { name: "Prone" }).click();
  await expect(ac).toHaveText("6");

  // Toggle off -> reverts.
  await page.getByRole("button", { name: "Prone" }).click();
  await expect(ac).toHaveText("10");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("a timed buff changes a stat then expires when rounds advance", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  const melee = sealValue(page, "Melee");
  await expect(melee).toHaveText("+0");

  // Author a custom +1 attack buff lasting 1 round.
  await page.getByText("Custom buff (expert)").click();
  const form = page.locator(".cb-grid");
  await form.getByLabel("Rounds").fill("1");
  await form.getByRole("button", { name: "Add" }).click();

  await expect(melee).toHaveText("+1");

  // Advance one round -> the buff expires and the bonus reverts.
  await page.getByRole("button", { name: /Advance/ }).click();
  await expect(melee).toHaveText("+0");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

import { expect, test, type Page } from "@playwright/test";

/**
 * Printable character sheet (issue #69): the Settings-tab entry point takes
 * over the whole viewport with a read-only sheet, and Back returns to the
 * normal app. Reuses the smoke spec's console/pageerror guards.
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

test("opening and closing the print sheet from Settings", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Print character sheet…" }).click();

  // The print view takes over the whole page — app chrome is gone.
  await expect(page.locator(".mode-tabs")).toHaveCount(0);
  await expect(page.locator(".print-page")).toBeVisible();
  await expect(page.locator(".print-name")).toContainText("New Adventurer");

  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".mode-tabs")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

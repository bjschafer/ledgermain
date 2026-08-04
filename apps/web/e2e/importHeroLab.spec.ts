import { expect, test, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

/**
 * Drive the real Settings file picker with a real Hero Lab classic `.por`
 * portfolio and confirm the imported character lands on the sheet.
 *
 * Worth an e2e rather than leaving it to the unit tests: a `.por` is a ZIP, so
 * this is the only path that exercises the browser's own
 * `DecompressionStream` and `File.arrayBuffer()` (the unit tests run under
 * Bun), plus the async import handler behind the picker.
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

/** The value text inside a named stat seal (e.g. "Armor Class" -> "19"). */
function sealValue(page: Page, label: string) {
  return page.locator(".seal", { hasText: label }).locator(".seal-value");
}

const PORTFOLIO = fileURLToPath(new URL("../test/fixtures/herolab-crush.por", import.meta.url));

test("imports a Hero Lab .por portfolio and computes the sheet Hero Lab printed", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.locator('input[type="file"]').setInputFiles(PORTFOLIO);

  // The toast names the character that just loaded.
  await expect(page.getByText(/Imported Crush/)).toBeVisible();

  // The import report lists what did and didn't come across.
  await expect(page.getByText(/Maximum HP is 56/)).toBeVisible();

  // Hero Lab's stat block: "AC 19, touch 14, flat-footed 15".
  await page.getByRole("tab", { name: "Play" }).click();
  await expect(sealValue(page, "Armor Class")).toHaveText("19");

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

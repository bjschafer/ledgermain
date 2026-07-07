import { expect, test } from "@playwright/test";

/**
 * Stage 3 smoke: proves the app actually renders in a real browser and that
 * RefData is fetched + parsed client-side (the slice unit tests + `vite build`
 * can't cover). The sheet's "Armor Class" seal only renders a computed value
 * once `store.status === "ready"` (doc + sheet + RefData all loaded — see
 * App.tsx), so it's a faithful "data loaded" signal.
 */

// Network noise we don't control (CDN fonts, favicon) — not app bugs.
const benign = (t: string) =>
  /fonts\.(googleapis|gstatic)|favicon|net::ERR_|Failed to load resource/i.test(t);

test("renders and loads reference data in the browser with no errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !benign(msg.text())) consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/");

  // React mounted.
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");

  // RefData fetched + parsed client-side, and the sheet computed off it.
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });

  // Did not fall into the "couldn't load reference data" error state.
  await expect(page.getByText("Couldn't load reference data.")).toHaveCount(0);

  // No uncaught exceptions or unexpected console errors.
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

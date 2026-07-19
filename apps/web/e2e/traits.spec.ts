import { expect, type Page, test } from "@playwright/test";

/**
 * The trait picking flow in a real browser (issue #89). Traits browse through
 * the same full-screen manager as feats — this drives the round trip: open the
 * manager, search, add, and confirm the pick lands in the panel's chosen list
 * after the dialog closes.
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

async function gotoTraits(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  return page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Traits" }),
  });
}

test("add and remove a trait through the trait manager", async ({ page }) => {
  const errs = guard(page);
  const panel = await gotoTraits(page);

  await expect(panel.locator(".empty")).toContainText("No traits chosen yet");

  await panel.getByRole("button", { name: "Choose traits" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("in the catalog");

  const catalog = dialog.locator("section", { hasText: "Catalog" }).first();
  const mine = dialog.locator(".spell-pane--known");
  await expect(mine).toContainText("Nothing here yet");

  // Category chips narrow the catalog to one trait type.
  await dialog.getByRole("button", { name: "Magic", exact: true }).click();
  await expect(catalog.locator(".pick-row .tag-bloodline").first()).toHaveText("Magic");
  await dialog.getByRole("button", { name: "All", exact: true }).click();

  await dialog.getByRole("textbox", { name: "Search traits" }).fill("Reactionary");
  const row = catalog.locator(".pick-row").first();
  await expect(row).toContainText("Reactionary");
  await row.getByRole("button", { name: "Add" }).click();

  // The add lands in the right-hand pane without closing the dialog.
  await expect(mine.locator(".pick-row")).toContainText("Reactionary");
  await expect(dialog).toContainText("1 / 2 chosen");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(panel.locator(".pick-row")).toContainText("Reactionary");
  await expect(panel.getByText("1 / 2 traits")).toBeVisible();

  // Removing works straight from the panel row — no need to reopen the manager.
  await panel.locator(".pick-row").getByRole("button", { name: "Remove" }).click();
  await expect(panel.locator(".empty")).toContainText("No traits chosen yet");

  expect(errs.pageErrors).toEqual([]);
  expect(errs.consoleErrors).toEqual([]);
});

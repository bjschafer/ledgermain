import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The feat picking flow in a real browser. Browsing the ~1500-feat catalog
 * happens in the full-screen feat manager rather than in the builder panel —
 * this drives that round trip: open the manager, search, add, and confirm the
 * pick lands in the panel's chosen list after the dialog closes.
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

/**
 * A feat row by name. Matches on `.pname` rather than the row's text: every row
 * embeds the feat's description and prereqs, so a bare `hasText` also matches
 * feats that merely *mention* the one you're after.
 */
function featRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: new RegExp(`^${name}`) }) });
}

/** Build a fighter so the Feats panel has a feat budget to spend. */
async function gotoFighterFeats(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Fighter", exact: true }).click();

  return page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Feats" }),
  });
}

test("a feat added in the manager lands in the panel's chosen list", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoFighterFeats(page);

  await panel.getByRole("button", { name: "Choose feats" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const catalog = dialog.locator(".spell-pane").first();
  const taken = dialog.locator(".spell-pane--known");
  await expect(taken).toContainText("Nothing here yet");

  await dialog.getByLabel("Search feats").fill("Dodge");
  await featRow(catalog, page, "Dodge").getByRole("button", { name: "Add", exact: true }).click();

  // It appears in the taken pane immediately, without clearing the search.
  await expect(featRow(taken, page, "Dodge")).toBeVisible();
  await expect(dialog.getByLabel("Search feats")).toHaveValue("Dodge");

  // Escape closes, and the panel behind reflects the new feat.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(featRow(panel, page, "Dodge")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the category chips and hide-ineligible toggle narrow the catalog", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoFighterFeats(page);
  await panel.getByRole("button", { name: "Choose feats" }).click();

  const dialog = page.getByRole("dialog");
  const catalog = dialog.locator(".spell-pane").first();

  // Metamagic feats exist in the catalog but aren't Combat feats.
  await dialog.getByRole("button", { name: "Metamagic" }).click();
  await expect(featRow(catalog, page, "Empower Spell")).toBeVisible();
  await dialog.getByRole("button", { name: "Combat", exact: true }).click();
  await expect(featRow(catalog, page, "Empower Spell")).toHaveCount(0);

  // Power Attack requires Str 13 / BAB 1 — a level-1 fighter qualifies, so it
  // survives the hide-ineligible filter; a high-BAB feat should not.
  await dialog.getByRole("button", { name: /Hide ineligible/ }).click();
  await expect(featRow(catalog, page, "Greater Weapon Focus")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

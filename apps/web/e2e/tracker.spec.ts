import { expect, test, type Page } from "@playwright/test";

import { typeSearch } from "./search.js";

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
  // Wait for RefData to load and the sheet to compute off it (see smoke.spec.ts).
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
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

test("combat stances update attack and AC, remain exclusive, and show their source", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  const melee = sealValue(page, "Melee");
  const ac = sealValue(page, "Armor Class");
  await expect(melee).toHaveText("+0");
  await expect(ac).toHaveText("10");

  await page.getByRole("button", { name: "Fighting Defensively" }).click();
  await expect(melee).toHaveText("-4");
  await expect(ac).toHaveText("12");

  await page.locator(".seal", { hasText: "Armor Class" }).click();
  await expect(page.getByText("Fighting Defensively [dodge]", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Total Defense" }).click();
  await expect(page.getByRole("button", { name: "Fighting Defensively" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(melee).toHaveText("+0");
  await expect(ac).toHaveText("14");

  await page.getByRole("button", { name: "Charge" }).click();
  await expect(melee).toHaveText("+2");
  await expect(ac).toHaveText("8");

  await page.getByRole("button", { name: "Charge" }).click();
  await expect(melee).toHaveText("+0");
  await expect(ac).toHaveText("10");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("an owned combat Style feat appears as an independent stance toggle with its rules", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Fighter", exact: true }).click();
  const feats = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Feats" }),
  });
  await feats.getByRole("button", { name: "Choose feats" }).click();

  const dialog = page.getByRole("dialog");
  await typeSearch(dialog.getByLabel("Search feats"), "Stick-Fighting Style");
  const featRow = dialog
    .locator(".spell-pane")
    .first()
    .locator(".pick-row")
    .filter({ has: page.locator(".pname", { hasText: /^Stick-Fighting Style/ }) });
  await featRow.getByRole("button", { name: "Add", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Play" }).click();

  const stances = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Stances" }),
  });
  const style = stances.getByRole("button", { name: "Stick-Fighting Style" });
  await expect(style).toHaveAttribute("aria-pressed", "false");
  // No "M": switching this style on surfaces its rules and moves no numbers.
  // Crane Style, the one that does, is prereq-blocked from a bare character,
  // so its badge and math are pinned in the model and engine fixtures instead.
  await expect(style.locator(".badge-modeled")).toHaveCount(0);
  await style.click();
  await expect(style).toHaveAttribute("aria-pressed", "true");
  await expect(stances.getByText("1 active", { exact: true })).toBeVisible();

  await stances.getByText("Stick-Fighting Style rules").click();
  await expect(stances.getByText(/You know how to use batons/)).toBeVisible();

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
  await form.getByLabel("Duration value").fill("1");
  await form.getByRole("button", { name: "Add" }).click();

  await expect(melee).toHaveText("+1");

  // Advance one round -> the buff expires and the bonus reverts.
  await page.getByRole("button", { name: /Advance/ }).click();
  await expect(melee).toHaveText("+0");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

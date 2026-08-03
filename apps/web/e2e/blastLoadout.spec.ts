import { expect, test, type Page } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * The per-activation blast loadout, end to end: an infusion picked in the
 * builder becomes selectable in the tracker's Blast Loadout panel, and loading
 * it rewrites the blast lines on the sheet.
 *
 * `packages/engine/test/kineticistInfusions.test.ts` pins the arithmetic;
 * what this adds is that a player can reach it by pressing the app's own
 * controls, and that clearing the loadout puts the bare blast back.
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

function sealValue(page: Page, label: string) {
  return page.locator(".seal", { hasText: label }).locator(".seal-value");
}

test("an infusion loaded in the tracker rewrites the blast line, and clearing it restores the bare blast", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });

  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await classes.getByRole("button", { name: "Kineticist", exact: true }).click();
  // 4th level, so Infusion Specialization (5th) is not yet reducing anything
  // and the printed burn cost lands on the line unmodified.
  const stepper = classes.locator(".stepper").filter({
    has: page.getByLabel("Kineticist level"),
  });
  for (let i = 0; i < 3; i++) {
    await stepper.getByRole("button", { name: "increment" }).click();
  }

  const focus = page.locator(".subsection", {
    has: page.getByRole("heading", { name: "Elemental Focus" }),
  });
  await focus.locator("select").first().selectOption("earth");

  const blastRow = page.locator(".weapon-attack-row", { hasText: "Earth Blast" });
  await expect(blastRow.locator(".blast-line-sub").first()).toContainText("ranged · 30 ft");

  // Pick Extended Range, a 1st-level universal form infusion.
  const infusions = page.locator(".subsection", {
    has: page.getByRole("heading", { name: "Infusions" }),
  });
  await typeSearch(infusions.locator("input.search"), "Extended Range");
  await infusions
    .locator(".pick-row", { hasText: "Extended Range" })
    .getByRole("button", { name: "Add" })
    .click();

  await page.getByRole("tab", { name: "Play" }).click();

  const loadout = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Blast Loadout" }),
  });
  await expect(loadout).toBeVisible();
  await loadout.locator("#blast-form").selectOption({ label: "Extended Range (1 burn)" });

  // The line now reaches 120 ft and states what it costs to throw.
  const playRow = page.locator(".weapon-attack-row", { hasText: "Earth Blast" });
  await expect(playRow.locator(".blast-line-sub").first()).toContainText("ranged · 120 ft");
  await expect(playRow.locator(".blast-line-sub").first()).toContainText("1 burn");
  await expect(playRow.locator(".blast-line-infusions")).toContainText("Extended Range");

  // One press puts the bare blast back.
  await loadout.getByRole("button", { name: "Bare blast (clear all)" }).click();
  await expect(playRow.locator(".blast-line-sub").first()).toContainText("ranged · 30 ft");
  await expect(playRow.locator(".blast-line-infusions")).toHaveCount(0);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

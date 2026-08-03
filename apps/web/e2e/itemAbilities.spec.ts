import { expect, type Locator, type Page, test } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * The weapon special-abilities picker: searching the full ~187-entry
 * published catalog (not just the 18 hand-curated abilities), respecting the
 * PF1 RAW combined-bonus cap (enhancement, max +5, plus special-ability
 * bonus equivalents, together capped at +10) live as picks and enhancement
 * change, and persisting an imported pick's `abilityInfo` snapshot through
 * add and edit.
 *
 * "Menacing", "Vorpal", and "Dancing" are all real published weapon
 * abilities absent from the hand-curated table
 * (`apps/web/src/model/abilities.ts`), so only reachable through the catalog
 * import — a stand-in for the ~170 abilities that were unreachable in the
 * picker before this feature.
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

async function gotoWeapons(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();
  return page.locator(".panel", { hasText: "Weapons" });
}

function pickRow(scope: Locator, page: Page, name: string | RegExp) {
  return scope.locator(".pick-row").filter({ has: page.locator(".pname", { hasText: name }) });
}

test("an ability imported from the catalog shows on the weapon it's attached to", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWeapons(page);

  await panel.getByRole("button", { name: "+ Add weapon" }).click();
  await panel.getByLabel("Enh.").selectOption({ label: "+1" });

  // "Menacing" is imported from the published catalog, not one of the 18
  // hand-curated abilities — searching and adding it only works if the
  // picker actually reaches RefData.itemAbilities.
  await typeSearch(panel.getByPlaceholder("Search special abilities…"), "Menacing");
  const menacingRow = pickRow(panel, page, "Menacing");
  await expect(menacingRow).toBeVisible();
  await expect(menacingRow).toContainText("+1");
  await menacingRow.getByRole("button", { name: "Add" }).click();

  const menacingChip = panel.locator(".ability-chips .chip", { hasText: "Menacing" });
  await expect(menacingChip).toBeVisible();
  await expect(menacingChip).toContainText("+1");

  // Now pick a real weapon to attach it to. The search also matches "Punching
  // Dagger", "Dueling Dagger", etc., so pin the exact row by its full name.
  await typeSearch(panel.getByPlaceholder("Search weapons…"), "Dagger");
  const daggerRow = pickRow(panel, page, /^Dagger \+1$/);
  await daggerRow.getByRole("button", { name: "Add" }).click();

  const weaponRow = panel.locator(".gear-row", { hasText: "Dagger +1" });
  await expect(weaponRow).toBeVisible();
  await expect(weaponRow.locator(".gear-meta")).toContainText("Menacing");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the combined +10 cap drops an ability once a later enhancement raise no longer fits both picks", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWeapons(page);

  await panel.getByRole("button", { name: "+ Add weapon" }).click();
  await panel.getByLabel("Enh.").selectOption({ label: "+1" });

  // At +1 enhancement the budget is 9 — Vorpal (+5) and Dancing (+4)
  // together land exactly at the +10 combined cap (1 + 5 + 4 = 10).
  const search = panel.getByPlaceholder("Search special abilities…");
  await typeSearch(search, "Vorpal");
  await pickRow(panel, page, "Vorpal").getByRole("button", { name: "Add" }).click();
  await typeSearch(search, "Dancing");
  await pickRow(panel, page, "Dancing").getByRole("button", { name: "Add" }).click();

  await expect(panel.locator(".ability-chips .chip", { hasText: "Vorpal" })).toBeVisible();
  await expect(panel.locator(".ability-chips .chip", { hasText: "Dancing" })).toBeVisible();
  await expect(panel.locator(".ability-chips-section .hint")).toHaveText(
    "Enhancement + abilities: 10/10",
  );

  await typeSearch(search, "");
  await typeSearch(panel.getByPlaceholder("Search weapons…"), "Dagger");
  await pickRow(panel, page, /^Dagger \+1$/)
    .getByRole("button", { name: "Add" })
    .click();

  const weaponRow = panel.locator(".gear-row", { hasText: "Dagger +1" });
  await expect(weaponRow).toBeVisible();
  await expect(weaponRow.locator(".gear-meta")).toContainText("Vorpal");
  await expect(weaponRow.locator(".gear-meta")).toContainText("Dancing");

  // PF1 RAW caps enhancement itself at +5 (the dropdown never offers more),
  // but the combined cap still bites well before that: raising enhancement
  // from +1 to +2 shrinks the ability budget from 9 to 8, which can no
  // longer hold both a +5 and a +4 ability. Vorpal was picked first, so it
  // survives the truncation and Dancing is dropped.
  await weaponRow.getByRole("button", { name: "Edit" }).click();
  const editForm = panel.locator(".gear-armor-form", { hasText: "Edit Weapon" });
  await editForm.getByLabel("Enhancement bonus").selectOption({ label: "+2" });
  await expect(editForm.locator(".ability-chips .chip", { hasText: "Vorpal" })).toBeVisible();
  await expect(editForm.locator(".ability-chips .chip", { hasText: "Dancing" })).toHaveCount(0);
  await editForm.getByRole("button", { name: "Save changes" }).click();

  await expect(weaponRow.locator(".gear-meta")).toContainText("Vorpal");
  await expect(weaponRow.locator(".gear-meta")).not.toContainText("Dancing");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("an ability's Add button reflects the live enhancement-and-abilities budget", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoWeapons(page);

  await panel.getByRole("button", { name: "+ Add weapon" }).click();

  // At +1 enhancement with nothing else picked, the full 9-point remaining
  // budget comfortably covers Vorpal's +5.
  await panel.getByLabel("Enh.").selectOption({ label: "+1" });
  const search = panel.getByPlaceholder("Search special abilities…");
  await typeSearch(search, "Vorpal");
  const vorpalRow = pickRow(panel, page, "Vorpal");
  await expect(vorpalRow).toContainText("+5");
  await expect(vorpalRow.getByRole("button", { name: "Add" })).toBeEnabled();

  // Picking a +1 ability first, then raising enhancement to the RAW max of
  // +5, leaves only 4 points of budget (10 - 5 - 1) — not enough for a +5
  // ability.
  await typeSearch(search, "Menacing");
  await pickRow(panel, page, "Menacing").getByRole("button", { name: "Add" }).click();
  await panel.getByLabel("Enh.").selectOption({ label: "+5" });
  await typeSearch(search, "Vorpal");
  const vorpalAddButton = vorpalRow.getByRole("button", { name: "Add" });
  await expect(vorpalAddButton).toBeDisabled();
  // `aria-disabled` (not the native `disabled` attribute) is what makes this
  // TipButton stay tappable to reveal the reason — see InfoTip.tsx — so a
  // plain click needs `force: true` to bypass Playwright's actionability
  // wait, which otherwise treats an aria-disabled control as unclickable.
  await vorpalAddButton.click({ force: true });
  await expect(page.locator(".info-tip-bubble")).toContainText("cap");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

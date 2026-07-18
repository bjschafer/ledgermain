import { expect, test, type Page } from "@playwright/test";

/**
 * Homebrew race/feat authoring (phase 2): drives the real "Homebrew races" /
 * "Homebrew feats" authoring doors in the Build tab and asserts the created
 * content actually flows through `compute()` (a fixed +2 Str race changes the
 * sheet's Strength) and through the normal feat-selection path (a created
 * feat shows up, marked homebrew, in the Play tab's feat list). Reuses the
 * console/pageerror guard from tracker.spec.ts.
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

async function gotoBuild(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();
}

/**
 * A `Panel`'s collapsible header carries `aria-label={title}` — the RAW
 * title, unlike its `<h2>` (which also renders the step marker glued onto
 * the title text, e.g. "Featsvii", making heading-name matching unreliable).
 * That header's exact accessible name is the only precise way to find "the
 * one panel titled X": a plain `.panel` + substring `hasText` filter is NOT
 * safe here — Playwright's `hasText` is a case-insensitive substring match,
 * and with dozens of feat prereq/description strings on the page, "Race" as
 * a substring shows up incidentally (e.g. "grace", "Racial Heritage") in
 * panels that have nothing to do with the Race section.
 */
function panelByTitle(page: Page, title: string) {
  return page
    .locator(".panel")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) });
}

test("creating a homebrew race with a fixed +2 Str updates the sheet's Strength", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoBuild(page);

  const strPip = page.locator(".ability-pip", { hasText: "STR" }).locator(".ap-score");
  await expect(strPip).toHaveText("10"); // default level-0 character, no race yet

  const racePanel = panelByTitle(page, "Race");
  await racePanel.getByText("Homebrew races").click();
  await racePanel.getByRole("button", { name: "+ Create homebrew race" }).click();

  await racePanel.getByLabel("Name").fill("Stoneborn");
  await racePanel.getByRole("button", { name: "Fixed modifiers" }).click();
  const strMod = racePanel.getByLabel("STR modifier");
  await strMod.fill("2");
  await strMod.press("Enter"); // commit before Create (NumberField commits on blur/Enter)

  // "Select this race immediately after creating it" is checked by default.
  await racePanel.getByRole("button", { name: "Create race" }).click();

  await expect(strPip).toHaveText("12");

  // The homebrew race now shows as selected in its own management row, and
  // (via the RefData overlay) also as a badged chip in the normal picker.
  await expect(
    racePanel.locator(".hb-list").getByRole("button", { name: "Selected" }),
  ).toBeVisible();
  // A homebrew race with an unrecognized name defaults to the "Exotic"
  // rarity tier, which is collapsed by default — search forces every tier
  // open (`RaceSection`'s `forceOpen`) so the chip is actually in the DOM.
  await racePanel.getByPlaceholder("Search races…").fill("Stoneborn");
  const stoneBornChip = racePanel.locator(".chip", { hasText: "Stoneborn" });
  await expect(stoneBornChip).toHaveAttribute("aria-pressed", "true");
  await expect(stoneBornChip.getByText("homebrew")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("creating a homebrew feat adds it to the character, badged as homebrew", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoBuild(page);

  const featsPanel = panelByTitle(page, "Feats");
  await featsPanel.getByText("Homebrew feats").click();
  await featsPanel.getByRole("button", { name: "+ Create homebrew feat" }).click();

  await featsPanel.getByLabel("Name").fill("Keen Nose");
  // "Take this feat immediately after creating it" is checked by default.
  await featsPanel.getByRole("button", { name: "Create feat" }).click();

  // The main feat list (`.scroll`) is distinct from the homebrew-management
  // door's own list (`.hb-list`) — both render a row for the new feat, so
  // scope to the main list to avoid a strict-mode ambiguity.
  const featRow = featsPanel.locator(".scroll .pick-row", { hasText: "Keen Nose" });
  await expect(featRow).toBeVisible();
  await expect(featRow.getByText("homebrew")).toBeVisible();
  await expect(featRow.getByRole("button", { name: "Remove" })).toBeVisible();

  // Play tab's read-only feat reference list picks it up through the same
  // doc-overlaid RefData, badged the same way.
  await page.getByRole("tab", { name: "Play" }).click();
  const playFeatsPanel = panelByTitle(page, "Feats");
  // Scoped to the panel itself: an unscoped "Feats" button match is now
  // ambiguous with the PlayNav jump-rail button of the same name.
  await playFeatsPanel.getByRole("button", { name: "Feats", exact: true }).click(); // expand (defaultCollapsed)
  await expect(playFeatsPanel.getByText("Keen Nose")).toBeVisible();
  await expect(playFeatsPanel.getByText("homebrew")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

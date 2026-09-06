import { expect, test, type Page } from "@playwright/test";

/**
 * The round clock (`live.round`) has two faces that must agree: the tap-to-
 * advance chip in the phone stat strip (`StatStrip.tsx`) and the readout in
 * the Buffs panel header (`BuffsPanel.tsx`), which is where a desktop player
 * sees it since the strip is `display: none` above 940px.
 */

const PHONE = { width: 390, height: 844 };

const strip = (page: Page) => page.locator(".stat-strip-round");
const roundChip = (page: Page) => strip(page).locator(".round-advance .num");
const advance = (page: Page) => page.getByRole("button", { name: /Advance to round/ });
// Both clocks offer the reset, so scope it to the strip's copy.
const endCombat = (page: Page) => strip(page).getByRole("button", { name: /^End combat/ });

async function gotoPlay(page: Page) {
  await page.goto("/");
  // Same RefData wait the other tracker specs use before touching the UI.
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Play" }).click();
}

test("the phone stat strip advances and resets the round without opening Buffs", async ({
  page,
}) => {
  await gotoPlay(page);
  await page.setViewportSize(PHONE);

  // Starts on round 1, with no reset offered until the clock has moved.
  await expect(roundChip(page)).toHaveText("1");
  await expect(endCombat(page)).toHaveCount(0);

  await advance(page).click();
  await expect(roundChip(page)).toHaveText("2");
  await advance(page).click();
  await expect(roundChip(page)).toHaveText("3");

  await endCombat(page).click();
  await expect(roundChip(page)).toHaveText("1");
  await expect(endCombat(page)).toHaveCount(0);
});

test("the strip and the Buffs panel read the same clock", async ({ page }) => {
  await gotoPlay(page);
  await page.setViewportSize(PHONE);

  await advance(page).click();
  await advance(page).click();
  await expect(roundChip(page)).toHaveText("3");

  // The panel's own control advances the same counter the strip shows.
  await page.getByRole("button", { name: "Advance round" }).click();
  await expect(roundChip(page)).toHaveText("4");
  await expect(page.locator(".round-now")).toHaveText("Round 4");
});

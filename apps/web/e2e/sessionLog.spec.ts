import { expect, test, type Page } from "@playwright/test";

/**
 * The three player-polish pieces that only exist once the real app is running:
 * the session log filling itself from taps elsewhere in the tracker, undo
 * walking back more than one of them, and the level-up toast's jump landing on
 * a build section that actually has something outstanding.
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

async function gotoPlay(page: Page) {
  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Play" }).click();
}

/**
 * Take a fighter to 2nd. Picking the FIRST class is character creation and
 * stays quiet on purpose (`useCharacter.ts`), so the toast under test only
 * appears on the level after that.
 */
async function levelUpFighter(page: Page) {
  await page.goto("/");
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Build" }).click();
  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Fighter", exact: true }).click();
  // The class-level field is stepper-only (NumberField `readOnly`), so 2nd
  // level is a click on its increment.
  await classes.getByRole("button", { name: "increment" }).first().click();
}

const logRows = (page: Page) => page.locator(".session-log-row");

test("the session log records damage and conditions, and undo walks back through them", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoPlay(page);

  // Nothing has happened yet, so the panel isn't there at all.
  await expect(page.locator(".session-log")).toHaveCount(0);

  const hp = page.locator(".hp-big");
  const startHp = Number((await hp.innerText()).split("/")[0]!.trim());

  const amount = page.getByLabel("Amount");
  const damage = page.getByRole("button", { name: "Damage", exact: true });

  await amount.fill("3");
  await damage.click();
  await amount.fill("4");
  await damage.click();
  await page.getByRole("button", { name: "Prone" }).click();

  const log = page.locator("#play-log");
  await log.scrollIntoViewIfNeeded();
  await expect(logRows(page)).toHaveCount(3);
  // Newest first.
  await expect(logRows(page).first()).toContainText("Became Prone");
  await expect(logRows(page).nth(1)).toContainText("Took 4 damage");
  await expect(logRows(page).nth(2)).toContainText("Took 3 damage");

  await expect(hp).toContainText(String(startHp - 7));

  // Two damage taps used to leave only the second one undoable. Each press of
  // the log's Undo walks back one more step: the condition, then the 4, then
  // the 3, back to where the fight started.
  // Scoped to the panel: the damage toast is still up and carries its own Undo.
  const undo = page.locator("#play-log").getByRole("button", { name: "Undo" });
  await undo.click();
  await expect(page.getByRole("button", { name: "Prone" })).not.toHaveClass(/active/);
  await undo.click();
  await expect(hp).toContainText(String(startHp - 3));
  await undo.click();
  await expect(hp).toContainText(String(startHp));
  await expect(undo).toBeDisabled();

  // Undo is a correction, not a table event: it leaves the record alone.
  await expect(logRows(page)).toHaveCount(3);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("the log survives a reload, and Clear forgets it", async ({ page }) => {
  await gotoPlay(page);

  await page.getByLabel("Amount").fill("5");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await page.locator("#play-log").scrollIntoViewIfNeeded();
  await expect(logRows(page)).toHaveCount(1);

  await page.reload();
  await expect(sealValue(page, "Armor Class")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("tab", { name: "Play" }).click();
  await page.locator("#play-log").scrollIntoViewIfNeeded();
  await expect(logRows(page)).toHaveCount(1);
  await expect(logRows(page).first()).toContainText("Took 5 damage");

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".session-log")).toHaveCount(0);
});

test("levelling up offers a jump to the first thing left to spend", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await levelUpFighter(page);

  // The celebratory toast carries the jump.
  const spend = page.getByRole("button", { name: "Spend it" });
  await expect(spend).toBeVisible();
  await spend.click();

  // Lands on the topmost section that is actually flagged as outstanding. For a
  // 2nd-level fighter that is Skills: ranks arrive every level, the 4th-level
  // ability increase has not happened yet, and Feats sits below Skills.
  // Gold/warn only: the dim Traits badge is informational, and deliberately not
  // somewhere a level-up sends anyone.
  const flagged = page.locator(".build-nav-item", {
    has: page.locator(".build-nav-badge--gold, .build-nav-badge--warn"),
  });
  await expect(flagged.first()).toContainText("Skills");
  await expect(page.locator("#section-skills")).toBeInViewport();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

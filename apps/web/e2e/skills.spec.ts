import { expect, type Locator, type Page, test } from "@playwright/test";

/**
 * The skill assignment flow in a real browser. Spending ranks across the full
 * skill list happens in the full-screen skill manager rather than in the
 * builder panel — this drives that round trip: open the manager, invest a rank,
 * and confirm the skill lands in the panel's summary after the dialog closes.
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

function skillRow(scope: Locator, page: Page, name: string) {
  return scope
    .locator(".skill-row")
    .filter({ has: page.locator(".sname", { hasText: new RegExp(`^${name}`) }) });
}

/** Build a rogue so the Skills panel has a generous rank budget. */
async function gotoRogueSkills(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();

  const classes = page.locator(".panel", { hasText: "Classes" }).first();
  await classes.getByRole("button", { name: "Rogue", exact: true }).click();

  return page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Skills" }),
  });
}

test("a rank spent in the manager lands in the panel's summary", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  const panel = await gotoRogueSkills(page);

  await expect(panel).toContainText("No ranks assigned yet");
  await panel.getByRole("button", { name: "Assign skills" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const stealth = skillRow(dialog, page, "Stealth");
  await stealth.getByLabel("Stealth ranks").fill("1");
  await stealth.getByLabel("Stealth ranks").blur();

  // Budget in the header decrements as ranks are spent.
  await expect(dialog.locator(".dialog-subtitle")).toContainText("1");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  // The panel summary now lists Stealth with its rank count.
  await expect(skillRow(panel, page, "Stealth")).toBeVisible();
  await expect(skillRow(panel, page, "Stealth")).toContainText("1 rank");

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

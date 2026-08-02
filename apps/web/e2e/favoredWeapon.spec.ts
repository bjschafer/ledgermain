import { expect, test, type Page } from "@playwright/test";

/**
 * The deity's favored weapon end-to-end: the picker only appears for a class
 * that grants one, and the pick reaches the sheet's proficiency strip.
 *
 * The engine's fixtures pin the grant itself (see
 * `packages/engine/test/proficiency.test.ts`); what this adds is that the
 * choice is reachable through the real builder and shows up where a player
 * looks for it.
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

test("a cleric can name a deity's favored weapon and gains proficiency with it", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);

  await page.goto("/");
  const classes = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Classes" }),
  });
  await expect(classes).toBeVisible({ timeout: 15_000 });

  const picker = classes.locator(".favored-weapon-picker");
  await expect(picker).toHaveCount(0); // no class taken yet

  await classes.getByRole("button", { name: "Cleric", exact: true }).click();
  await picker.scrollIntoViewIfNeeded();
  await expect(picker).toBeVisible();

  const profChip = page.locator(".prof-chip", { hasText: "Greatsword" });
  await expect(profChip).toHaveCount(0);

  await picker.getByLabel("Deity's favored weapon").selectOption({ label: "Greatsword" });
  await expect(profChip).toHaveCount(1);
  // The subsection header echoes the pick without expanding it.
  await expect(picker.locator(".subsection-header")).toContainText("Greatsword");

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility sweep: an axe-core pass over each of the app's three tabs,
 * driven against the bundled sample character so the audit sees fully populated
 * panels (a blank character renders almost nothing, and an empty page passes
 * every rule vacuously).
 *
 * Scoped to WCAG 2.1 A/AA. `best-practice` rules are deliberately out: they
 * flag stylistic preferences (landmark counts, heading-order nits) that would
 * make this spec a running argument rather than a regression guard.
 *
 * The sample-character seed mirrors `screenshots/capture.ts` — a fresh store
 * seeds Kordrek but leaves a blank character active, so the active pointer has
 * to be repointed and the page reloaded.
 */

const SAMPLE_ID = "sample-kordrek-ironvein";
const ACTIVE_ID_KEY = "pf1-tracker:activeCharacterId";

const acValue = (page: Page) =>
  page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value");

async function gotoSample(page: Page) {
  await page.goto("/");
  await expect(acValue(page)).toBeVisible({ timeout: 20_000 });
  await page.evaluate(([key, id]) => localStorage.setItem(key, id), [
    ACTIVE_ID_KEY,
    SAMPLE_ID,
  ] as const);
  await page.reload();
  // Kordrek is AC 19, not the blank character's 10 — confirms he's active.
  await expect(acValue(page)).not.toHaveText("10", { timeout: 20_000 });
}

function audit(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
}

/** Rule id, the offending markup, and enough of the DOM path to go fix it. */
function report(violations: Awaited<ReturnType<typeof audit>>["violations"]): string {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `    ${n.target.join(" ")}\n      ${n.html}`).join("\n"),
    )
    .join("\n\n");
}

for (const tab of ["Build", "Play", "Settings"] as const) {
  test(`the ${tab} tab has no WCAG A/AA violations`, async ({ page }) => {
    await gotoSample(page);
    await page.getByRole("tab", { name: tab }).click();
    // The tab's own panel has to be on screen before axe reads the DOM.
    await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");

    // Asserted as a string: axe's node objects are deep enough that a failed
    // object diff buries the rule id and the offending markup.
    const { violations } = await audit(page);
    expect(report(violations)).toBe("");
  });
}

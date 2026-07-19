import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page, test } from "@playwright/test";

/**
 * Regenerates the README screenshots (`docs/images/{tracker,builder}.png`) from
 * the bundled sample character (Kordrek Ironvein, L5 cleric), driven against the
 * real app. NOT part of the e2e suite — run it explicitly:
 *
 *   bun run screenshots        # from apps/web, or from the repo root
 *
 * Prefix `CI=1` to force a fresh dev server built from your working tree (see
 * the playwright skill's dev-server gotcha) if something might already be on
 * :5173. Re-run whenever the UI changes enough that the images look stale.
 */

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../docs/images");

// The sample character's id and the active-character localStorage key, both
// defined in `apps/web/src/db/characters.ts`. A fresh store seeds the sample
// but leaves a blank character active, so we repoint the active pointer at it
// and reload.
const SAMPLE_ID = "sample-kordrek-ironvein";
const ACTIVE_ID_KEY = "pf1-tracker:activeCharacterId";

const acValue = (page: Page) =>
  page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value");

test.use({ viewport: { width: 1440, height: 960 } });

test("regenerate README screenshots", async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });

  await page.goto("/");
  await expect(acValue(page)).toBeVisible({ timeout: 20_000 });
  await page.evaluate(([key, id]) => localStorage.setItem(key, id), [
    ACTIVE_ID_KEY,
    SAMPLE_ID,
  ] as const);
  await page.reload();
  await expect(acValue(page)).toBeVisible({ timeout: 20_000 });
  // Kordrek is AC 19, not the blank character's 10 — confirms he's active.
  await expect(acValue(page)).not.toHaveText("10", { timeout: 10_000 });

  await page.waitForTimeout(600); // let webfonts settle

  // Play view (the live tracker) — the lead image. Taller than the builder:
  // HP + the conditions grid + both timed buffs have to fit, because the
  // README caption promises buffs counting down by the round. The asserts
  // below fail the run rather than silently committing a cropped image if a
  // new panel ever pushes the buffs past the fold again.
  await page.getByRole("tab", { name: "Play" }).click();
  await page.setViewportSize({ width: 1440, height: 1180 });
  const buffNames = page.locator(".buff-row .buff-name");
  await expect(buffNames.filter({ hasText: "Bull's Strength" })).toBeInViewport();
  await expect(buffNames.filter({ hasText: "Bless" })).toBeInViewport();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "tracker.png") });

  // Build view.
  await page.getByRole("tab", { name: "Build" }).click();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "builder.png") });
});

import { expect, type Locator } from "@playwright/test";

/**
 * Type into a search box and confirm the box kept what was typed.
 *
 * `fill()` writes the value and dispatches a single input event. When a doc
 * write from the step before is still settling, React can re-render the
 * controlled input from its pre-fill state and the typed text vanishes with no
 * error raised: the catalog stays unfiltered, and the next assertion fails
 * against whatever row happened to be first. The window is one render wide, so
 * retrying the fill closes it. Chromium is quick enough to almost always miss
 * the window; Firefox under a loaded worker pool is not.
 */
export async function typeSearch(box: Locator, text: string): Promise<void> {
  await expect(async () => {
    await box.fill(text);
    await expect(box).toHaveValue(text, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

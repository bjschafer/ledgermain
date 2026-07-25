import { expect, test, type Page } from "@playwright/test";

/**
 * The "what's new" cue's stateful half. `test/changelog.test.ts` pins the
 * seen/unseen arithmetic; what this adds is the wiring that only exists in
 * the live app — the first-visit seed, and the fact that opening Settings
 * clears the dot and leaves the newest entry visible without a second click.
 *
 * Deliberately no assertions on entry ids or copy: the changelog is edited
 * whenever something ships, and a test that pins its contents would fail on
 * every release for no reason.
 */

const SEEN_KEY = "pf1-tracker:changelogLastSeen";

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

async function bootApp(page: Page) {
  await page.goto("/");
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });
}

test("a first-ever visit is seeded silently, with no 'new' cue", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await bootApp(page);

  await expect(page.locator(".mode-tab-dot")).toHaveCount(0);
  const stored = await page.evaluate((key) => localStorage.getItem(key), SEEN_KEY);
  expect(stored).toMatch(/^\d{4}-\d{2}-\d{2}-/);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("a returning reader sees a dot that clears once Settings is opened", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  // Boot once to get past the first-visit seed, then plant a stale mark and
  // reload. An unrecognized mark counts as unseen, which keeps this
  // independent of whatever the real entry ids happen to be today. (Planting
  // it via `evaluate` rather than an init script, so the reload at the end of
  // this test doesn't re-plant it.)
  await bootApp(page);
  await page.evaluate(
    ([key, stale]) => localStorage.setItem(key!, stale!),
    [SEEN_KEY, "1900-01-01-stale"],
  );
  await page.reload();
  await bootApp(page);

  const settingsTab = page.getByRole("tab", { name: /Settings/ });
  await expect(settingsTab.locator(".mode-tab-dot")).toBeVisible();

  await settingsTab.click();

  const panel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: "What's New" }),
  });
  // Visible without expanding anything — that's what earns clearing the cue.
  await expect(panel.locator("li").first()).toBeVisible();
  await expect(page.locator(".mode-tab-dot")).toHaveCount(0);

  const stored = await page.evaluate((key) => localStorage.getItem(key), SEEN_KEY);
  expect(stored).toMatch(/^\d{4}-\d{2}-\d{2}-/);

  // ...and it stays cleared across a reload.
  await page.reload();
  await bootApp(page);
  await expect(page.locator(".mode-tab-dot")).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

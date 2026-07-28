import { expect, test, type Page } from "@playwright/test";

/**
 * The half of `model/appLocation` that only exists in a live browser: the URL
 * fragment actually being written, a reload landing where you left off, and a
 * pasted deep link opening the right tab. The parsing itself is pinned in
 * `test/appLocation.test.ts`.
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

async function bootApp(page: Page, path = "/") {
  await page.goto(path);
  await expect(
    page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value"),
  ).toBeVisible({ timeout: 15_000 });
}

test("the tab you're on survives a reload", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await bootApp(page);
  await expect(page.getByRole("tab", { name: /^Build/ })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Play" }).click();
  await expect(page).toHaveURL(/#\/play/);

  await page.reload();
  await bootApp(page);
  await expect(page.getByRole("tab", { name: "Play" })).toHaveAttribute("aria-selected", "true");

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("a section deep link opens its tab and scrolls to it", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await bootApp(page, "/#/settings/settings-coverage");
  await expect(page.getByRole("tab", { name: /^Settings/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Restored, not merely rendered: the anchor is near the top of the viewport
  // rather than wherever a fresh load would have left it.
  const top = await page
    .locator("#settings-coverage")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeLessThan(200);

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("the whats-new alias lands on the What's New panel", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);

  await bootApp(page, "/#/whats-new");
  await expect(page.getByRole("tab", { name: /^Settings/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const panel = page.locator("section.panel").filter({
    has: page.getByRole("heading", { name: "What's New" }),
  });
  await expect(panel.locator("li").first()).toBeVisible();
  await expect(panel.getByRole("button", { name: /Copy link to What's New/ })).toBeVisible();

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("the masthead links out to the reference site in a new tab", async ({ page }) => {
  await bootApp(page);

  const link = page.getByRole("link", { name: "Reference site" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(link).toHaveAttribute("href", /^https?:\/\/.+/);
});

import { expect, test, type Page } from "@playwright/test";

/**
 * Below 940px the derived sheet leaves the document flow (`.sheet-col` is
 * `display: none`) and is reachable only through the floating "Sheet" button,
 * which opens it in a `Dialog`. The dialog surface is `overflow: hidden` and
 * its body holds panes that scroll themselves — so the sheet, which is one tall
 * document rather than a pane, was simply clipped at the fold: everything past
 * Defense, Skills included, was unreachable on a phone.
 */

const SAMPLE_ID = "sample-kordrek-ironvein";
const ACTIVE_ID_KEY = "pf1-tracker:activeCharacterId";

const acValue = (page: Page) =>
  page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value");

/** Point the store at the sample character, whose sheet is long enough to scroll. */
async function gotoSample(page: Page) {
  await page.goto("/");
  await expect(acValue(page)).toBeVisible({ timeout: 20_000 });
  await page.evaluate(([key, id]: readonly [string, string]) => localStorage.setItem(key, id), [
    ACTIVE_ID_KEY,
    SAMPLE_ID,
  ] as const);
  await page.reload();
  await expect(acValue(page)).not.toHaveText("10", { timeout: 20_000 });
}

async function openSheetDialog(page: Page) {
  // Load wide, then resize: the seal `gotoSample` waits on is desktop-only
  // chrome, so a phone-sized first paint has nothing to wait for.
  await gotoSample(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Sheet" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test("the phone sheet dialog scrolls to the skills at the bottom", async ({ page }) => {
  await openSheetDialog(page);

  const scroller = page.locator(".sheet-dialog-scroll");
  const metrics = () =>
    scroller.evaluate((el) => ({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));

  // There is more sheet than fits, and it lives in a scroller rather than
  // overflowing the clipped surface.
  const before = await metrics();
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);

  const skills = scroller.locator(".sheet-skill-list");
  await expect(skills).not.toBeInViewport();

  // Not zero: the page behind is wherever the section-restore left it.
  const pageScroll = await page.evaluate(() => window.scrollY);

  // Wheel over the dialog rather than `scrollIntoViewIfNeeded`: the point is
  // that a gesture reaches the scroller, and the helper would scroll every
  // ancestor including the document, which is the thing being ruled out.
  // `isVisible()` is true for a laid-out box sitting outside the scroller's
  // window, so wheel until the scroller stops moving rather than until it.
  await page.mouse.move(195, 500);
  for (let i = 0, last = -1; i < 20; i++) {
    const { scrollTop } = await metrics();
    if (scrollTop === last) break;
    last = scrollTop;
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(80);
  }

  await expect(skills).toBeInViewport();
  await expect(scroller.getByText("Perception", { exact: true })).toBeVisible();

  // The scroller moved, and the gesture stayed in it: no chaining out to the
  // page behind, which is what `overscroll-behavior-y: contain` is there for.
  expect((await metrics()).scrollTop).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll);
});

test("the phone sheet dialog clips nothing and never scrolls sideways", async ({ page }) => {
  await openSheetDialog(page);

  const overflow = await page.evaluate(() => {
    const el = (sel: string) => document.querySelector(sel) as HTMLElement;
    const surface = el(".dialog-surface");
    const scroller = el(".sheet-dialog-scroll");
    return {
      // `.dialog-surface` is `overflow: hidden`; anything it holds past its own
      // height is lost, so its scrollHeight must not exceed what it shows.
      surfaceClipped: surface.scrollHeight - surface.clientHeight,
      scrollerSideways: scroller.scrollWidth - scroller.clientWidth,
      pageSideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(overflow.surfaceClipped).toBe(0);
  expect(overflow.scrollerSideways).toBe(0);
  expect(overflow.pageSideways).toBe(0);
});

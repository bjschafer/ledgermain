import { expect, test, type Page } from "@playwright/test";

/**
 * Cross-engine layout guard, run against the bundled sample character (whose
 * sheet is dense enough to exercise most control clusters).
 *
 * The rest of the suite asserts behavior, which barely differs between engines.
 * Sizing does: Firefox and WebKit leave an `appearance: none` <select>'s
 * horizontal padding out of the intrinsic contribution it makes to a
 * shrink-wrapping flex parent, so a select can paint past the box its parent
 * was measured at and whatever follows lands on top of it. Nothing about that
 * fails a functional assertion, and it is invisible in Chromium.
 *
 * So this sweeps the rendered page for the shape of the defect rather than for
 * any one instance of it: a laid-out box painting over its next sibling, or
 * past the content edge of the flex parent that was sized to hold it.
 */

const SAMPLE_ID = "sample-kordrek-ironvein";
const ACTIVE_ID_KEY = "pf1-tracker:activeCharacterId";

const acValue = (page: Page) =>
  page.locator(".seal", { hasText: "Armor Class" }).locator(".seal-value");

/**
 * Findings for the current DOM, as human-readable lines. Runs in the page, so
 * it must stay self-contained (no imports, no outer-scope references).
 *
 * Deliberately narrow to keep it honest: it only judges boxes that flow, and
 * only the ones a browser is supposed to keep apart. Positioned, transformed,
 * and negative-margin boxes are excluded because overlapping is what they are
 * for, and `display: inline` boxes are excluded because an inline that wraps
 * across lines has a bounding box that legitimately overlaps its neighbors.
 */
function auditLayout(): string[] {
  const findings: string[] = [];

  const label = (el: Element): string => {
    const cls = (el.getAttribute("class") ?? "").trim().split(/\s+/).filter(Boolean);
    return el.tagName.toLowerCase() + (cls.length ? `.${cls.slice(0, 2).join(".")}` : "");
  };

  // A bare class name is not enough to find the offender by hand: several rows
  // of the same kind render at once and typically only one of them is wrong.
  const where = (el: Element): string => {
    const trail: string[] = [];
    for (let node: Element | null = el; node && trail.length < 3; node = node.parentElement) {
      trail.unshift(label(node));
    }
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    return `${trail.join(" > ")}${text ? ` ("${text}")` : ""}`;
  };

  const flows = (el: Element): boolean => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.display === "inline" || cs.visibility === "hidden")
      return false;
    if (cs.position !== "static" || cs.transform !== "none" || cs.float !== "none") return false;
    if (parseFloat(cs.marginLeft) < 0 || parseFloat(cs.marginRight) < 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  for (const parent of document.querySelectorAll("body *")) {
    // An <svg>'s children are drawing instructions, not laid-out boxes.
    if (parent.closest("svg")) continue;

    const kids = [...parent.children].filter(flows);

    kids.forEach((kid, i) => {
      const next = kids[i + 1];
      if (!next) return;
      const a = kid.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      // Only siblings sharing a line can collide horizontally; stacked ones are
      // simply one above the other.
      const shared = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (shared <= Math.min(a.height, b.height) / 2) return;
      const over = a.right - b.left;
      if (over > 1.5) {
        findings.push(`${where(kid)} overlaps ${label(next)} by ${Math.round(over)}px`);
      }
    });

    const pcs = getComputedStyle(parent);
    // A scroller is allowed to hold more than it shows; a flex parent that
    // clips or scrolls has said so on purpose.
    if (!pcs.display.includes("flex") || pcs.overflow !== "visible") continue;
    const pr = parent.getBoundingClientRect();
    const edge = pr.right - parseFloat(pcs.borderRightWidth) - parseFloat(pcs.paddingRight);
    for (const kid of kids) {
      const spill = kid.getBoundingClientRect().right - edge;
      if (spill > 1.5) {
        findings.push(`${where(kid)} spills ${Math.round(spill)}px past its flex parent`);
      }
    }
  }

  return [...new Set(findings)];
}

/** Point the store at the sample character (a blank one is active by default). */
async function gotoSample(page: Page) {
  await page.goto("/");
  await expect(acValue(page)).toBeVisible({ timeout: 20_000 });
  await page.evaluate(([key, id]: readonly [string, string]) => localStorage.setItem(key, id), [
    ACTIVE_ID_KEY,
    SAMPLE_ID,
  ] as const);
  await page.reload();
  // Kordrek is AC 19, not the blank character's 10 — confirms he's active.
  await expect(acValue(page)).not.toHaveText("10", { timeout: 20_000 });
}

/** Open every collapsed panel, so the sweep sees the controls inside them. */
async function expandPanels(page: Page) {
  const collapsed = page.locator("header[role='button'][aria-expanded='false']");
  // Expanding one panel can reveal another; bounded so a mis-toggling header
  // can't spin here.
  for (let i = 0; i < 40 && (await collapsed.count()) > 0; i++) {
    await collapsed.first().click();
    await page.waitForTimeout(50);
  }
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 960 },
  { name: "phone", width: 390, height: 844 },
]) {
  test(`no control lands on its neighbor (${viewport.name})`, async ({ page }) => {
    // Load wide, then resize: the stat seal this waits on is desktop-only
    // chrome, so a phone-sized first paint has nothing to wait for.
    await gotoSample(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const findings: string[] = [];
    for (const tab of ["Build", "Play", "Settings"]) {
      await page.getByRole("tab", { name: tab }).click();
      await expandPanels(page);
      // Webfonts change every text-driven measurement in here.
      await page.waitForTimeout(400);
      for (const line of await page.evaluate(auditLayout)) findings.push(`[${tab}] ${line}`);
    }

    expect(findings, findings.join("\n")).toEqual([]);
  });
}

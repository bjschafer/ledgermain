import { expect, test, type Page } from "@playwright/test";

import { typeSearch } from "./search.js";

/**
 * Homebrew authoring: drives the real "Homebrew races" / "Homebrew feats" /
 * "Custom abilities" authoring doors in the Build tab and asserts the created
 * content actually flows through `compute()` (a fixed +2 Str race changes the
 * sheet's Strength) and through the normal display paths (a created feat
 * shows up, marked homebrew, in the Play tab's feat list; a created ability
 * lands in the class-feature timeline and, with a use count, in the Play
 * tab's resource pools). Reuses the console/pageerror guard from
 * tracker.spec.ts.
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

async function gotoBuild(page: Page) {
  await page.goto("/");
  await expect(page.locator(".wordmark")).toContainText("Ledgermain");
  await page.getByRole("tab", { name: "Build" }).click();
}

/**
 * A `Panel`'s collapsible header carries `aria-label={title}` — the RAW
 * title, unlike its `<h2>` (which also renders the step marker glued onto
 * the title text, e.g. "Featsvii", making heading-name matching unreliable).
 * That header's exact accessible name is the only precise way to find "the
 * one panel titled X": a plain `.panel` + substring `hasText` filter is NOT
 * safe here — Playwright's `hasText` is a case-insensitive substring match,
 * and with dozens of feat prereq/description strings on the page, "Race" as
 * a substring shows up incidentally (e.g. "grace", "Racial Heritage") in
 * panels that have nothing to do with the Race section.
 */
function panelByTitle(page: Page, title: string) {
  return page
    .locator(".panel")
    .filter({ has: page.getByRole("button", { name: title, exact: true }) });
}

test("creating a homebrew race with a fixed +2 Str updates the sheet's Strength", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoBuild(page);

  const strPip = page.locator(".ability-pip", { hasText: "STR" }).locator(".ap-score");
  await expect(strPip).toHaveText("10"); // default level-0 character, no race yet

  const racePanel = panelByTitle(page, "Race");
  await racePanel.getByText("Homebrew races").click();
  await racePanel.getByRole("button", { name: "+ Create homebrew race" }).click();

  await racePanel.getByLabel("Name").fill("Stoneborn");
  await racePanel.getByRole("button", { name: "Fixed modifiers" }).click();
  const strMod = racePanel.getByLabel("STR modifier");
  await strMod.fill("2");
  await strMod.press("Enter"); // commit before Create (NumberField commits on blur/Enter)

  // "Select this race immediately after creating it" is checked by default.
  await racePanel.getByRole("button", { name: "Create race" }).click();

  await expect(strPip).toHaveText("12");

  // The homebrew race now shows as selected in its own management row, and
  // (via the RefData overlay) also as a badged chip in the normal picker.
  await expect(
    racePanel.locator(".hb-list").getByRole("button", { name: "Selected" }),
  ).toBeVisible();
  // A homebrew race with an unrecognized name defaults to the "Exotic"
  // rarity tier, which is collapsed by default — search forces every tier
  // open (`RaceSection`'s `forceOpen`) so the chip is actually in the DOM.
  await typeSearch(racePanel.getByPlaceholder("Search races…"), "Stoneborn");
  const stoneBornChip = racePanel.locator(".chip", { hasText: "Stoneborn" });
  await expect(stoneBornChip).toHaveAttribute("aria-pressed", "true");
  await expect(stoneBornChip.getByText("homebrew")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("creating a homebrew feat adds it to the character, badged as homebrew", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoBuild(page);

  const featsPanel = panelByTitle(page, "Feats");
  await featsPanel.getByText("Homebrew feats").click();
  await featsPanel.getByRole("button", { name: "+ Create homebrew feat" }).click();

  await featsPanel.getByLabel("Name").fill("Keen Nose");
  // "Take this feat immediately after creating it" is checked by default.
  await featsPanel.getByRole("button", { name: "Create feat" }).click();

  // The main feat list (`.scroll`) is distinct from the homebrew-management
  // door's own list (`.hb-list`) — both render a row for the new feat, so
  // scope to the main list to avoid a strict-mode ambiguity.
  const featRow = featsPanel.locator(".scroll .pick-row", { hasText: "Keen Nose" });
  await expect(featRow).toBeVisible();
  await expect(featRow.getByText("homebrew")).toBeVisible();
  await expect(featRow.getByRole("button", { name: "Remove" })).toBeVisible();

  // Play tab's read-only feat reference list picks it up through the same
  // doc-overlaid RefData, badged the same way.
  await page.getByRole("tab", { name: "Play" }).click();
  const playFeatsPanel = panelByTitle(page, "Feats");
  // Scoped to the panel itself: an unscoped "Feats" button match is now
  // ambiguous with the PlayNav jump-rail button of the same name.
  await playFeatsPanel.getByRole("button", { name: "Feats", exact: true }).click(); // expand (defaultCollapsed)
  await expect(playFeatsPanel.getByText("Keen Nose")).toBeVisible();
  await expect(playFeatsPanel.getByText("homebrew")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

test("creating a custom ability adds it to the class-feature timeline and a use pool", async ({
  page,
}) => {
  const { consoleErrors, pageErrors } = guard(page);
  await gotoBuild(page);

  const classesPanel = panelByTitle(page, "Classes");
  await classesPanel.getByText("Custom abilities").click();
  await classesPanel.getByRole("button", { name: "+ Create custom ability" }).click();

  await classesPanel.getByLabel("Name").fill("Mark of the Storm Herald");
  await classesPanel.getByLabel("Description").fill("Lightning answers you.");
  const level = classesPanel.getByLabel("Level gained");
  await level.fill("3");
  await level.press("Enter"); // NumberField commits on blur/Enter
  const uses = classesPanel.getByLabel("Uses", { exact: true });
  await uses.fill("2");
  await uses.press("Enter");
  await classesPanel.getByRole("button", { name: "Create ability" }).click();

  // The timeline groups by level, so the ability lands under its own "Lv 3".
  const timeline = classesPanel.locator(".class-features");
  const levelGroup = timeline.locator(".cf-level-group", { hasText: "Lv 3" });
  await expect(levelGroup.getByText("Mark of the Storm Herald")).toBeVisible();
  await expect(levelGroup.getByText("(Custom)")).toBeVisible();

  // Play tab: the ability is a real tracked pool, spendable without a class.
  await page.getByRole("tab", { name: "Play" }).click();
  const resourcesPanel = panelByTitle(page, "Resources");
  await expect(resourcesPanel.getByText("Mark of the Storm Herald")).toBeVisible();
  await expect(resourcesPanel.getByText("per day")).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

/** Every homebrew feat description currently in IndexedDB. */
async function storedFeatDescriptions(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open("pf1-tracker");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const all = open.result
            .transaction("characters", "readonly")
            .objectStore("characters")
            .getAll();
          all.onerror = () => reject(all.error);
          all.onsuccess = () =>
            resolve(
              (all.result as { build?: { homebrew?: { feats?: Record<string, unknown> } } }[])
                .flatMap((doc) => Object.values(doc.build?.homebrew?.feats ?? {}))
                .map((feat) => String((feat as { description?: string }).description ?? "")),
            );
        };
      }),
  );
}

/**
 * The authoring form escapes what an author types
 * (`homebrewEditor.textToDescriptionHtml`), so typing a payload into it only
 * proves that first layer. This rewrites the stored description to raw markup
 * behind the form's back, which is the shape a hand-edited or imported doc
 * arrives in, and leaves `components/RulesProse.tsx` as the only thing
 * standing between it and the page.
 */
async function rewriteStoredFeatDescriptions(page: Page, html: string) {
  // The app's save is debounced, so the feat has to be on disk before this
  // read-modify-write, or it would put back the doc that predates it.
  await expect.poll(() => storedFeatDescriptions(page)).toHaveLength(1);
  await page.evaluate(
    (description) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("pf1-tracker");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("characters", "readwrite");
          tx.onerror = () => reject(tx.error);
          tx.oncomplete = () => resolve();
          const store = tx.objectStore("characters");
          const all = store.getAll();
          all.onsuccess = () => {
            for (const doc of all.result as {
              build?: { homebrew?: { feats?: Record<string, { description?: string }> } };
            }[]) {
              for (const feat of Object.values(doc.build?.homebrew?.feats ?? {})) {
                feat.description = description;
              }
              store.put(doc);
            }
          };
        };
      }),
    html,
  );
}

test("a homebrew description carrying real markup renders inert", async ({ page }) => {
  const { consoleErrors, pageErrors } = guard(page);
  // Flipped by the payload if the browser ever parses it as markup instead of
  // showing it, which is what the render-time sanitizer exists to prevent.
  await page.addInitScript(() => {
    (window as unknown as { __xss?: boolean }).__xss = false;
  });
  await gotoBuild(page);

  const featsPanel = panelByTitle(page, "Feats");
  await featsPanel.getByText("Homebrew feats").click();
  await featsPanel.getByRole("button", { name: "+ Create homebrew feat" }).click();
  await featsPanel.getByLabel("Name").fill("Sharp Tongue");
  await featsPanel.getByLabel("Description / benefit").fill("Cutting.");
  await featsPanel.getByRole("button", { name: "Create feat" }).click();
  await expect(featsPanel.locator(".scroll .pick-row", { hasText: "Sharp Tongue" })).toBeVisible();

  await rewriteStoredFeatDescriptions(
    page,
    '<p>Cutting.</p><img src="x" onerror="window.__xss = true">' +
      "<script>window.__xss = true</script>" +
      '<a href="javascript:window.__xss = true">tap</a>',
  );
  await page.reload();

  await page.getByRole("tab", { name: "Play" }).click();
  const playFeatsPanel = panelByTitle(page, "Feats");
  await playFeatsPanel.getByRole("button", { name: "Feats", exact: true }).click();
  const row = playFeatsPanel.locator(".pick-row", { hasText: "Sharp Tongue" });
  await row.getByText("details").click();

  const desc = row.locator(".spell-detail-desc");
  await expect(desc).toContainText("Cutting.");
  await expect(desc.locator("img, script")).toHaveCount(0);
  await expect(desc.locator("a")).not.toHaveAttribute("href", /javascript/);
  await desc.getByText("tap").click();
  expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBe(false);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});

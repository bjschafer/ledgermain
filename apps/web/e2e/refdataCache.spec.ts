import { expect, test, type Page } from "@playwright/test";

/**
 * The reference data is tens of megabytes, and re-downloading it on every cold
 * browser cache is what stands between a phone on venue wifi and a blank sheet.
 * `src/refdata/cache.ts` stores each collection in IndexedDB keyed by its hash
 * from `meta.json`, so a second visit should ask for `meta.json` and nothing
 * else, and a moved hash should pull back just that one collection.
 */

/** Collection files requested from `public/data/`, `meta.json` aside. */
function trackCollectionRequests(page: Page): string[] {
  const files: string[] = [];
  page.on("request", (req) => {
    // Anchored at the path root: the bundled sample character is served from
    // /src/data/ in dev and is not part of the reference dataset.
    const match = /^\/data\/([^/]+\.json)$/.exec(new URL(req.url()).pathname);
    if (match && match[1] !== "meta.json") files.push(match[1] as string);
  });
  return files;
}

async function sheetReady(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator(".seal", { hasText: "Armor Class" })).toBeVisible({ timeout: 30_000 });
}

/**
 * Rows in the store. The write is fire-and-forget, so it is still running when
 * the sheet paints; reloading before it lands would make these tests flaky.
 * Read through the raw API rather than `indexedDB.databases()`, which Firefox
 * doesn't implement.
 */
function storedCollections(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("pf1-refdata");
        open.onerror = () => resolve(-1);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("collections")) {
            db.close();
            resolve(0);
            return;
          }
          const count = db.transaction("collections").objectStore("collections").count();
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => {
            db.close();
            resolve(-1);
          };
        };
      }),
  );
}

test("a second visit paints the sheet without refetching the data", async ({ page }) => {
  const cold = trackCollectionRequests(page);
  await sheetReady(page);
  expect(cold.length).toBeGreaterThan(10);
  await expect.poll(() => storedCollections(page), { timeout: 30_000 }).toBe(cold.length);

  const warm = trackCollectionRequests(page);
  await sheetReady(page);
  expect(warm).toEqual([]);
});

test("a moved hash invalidates just that collection", async ({ page }) => {
  const cold = trackCollectionRequests(page);
  await sheetReady(page);
  const total = cold.length;
  await expect.poll(() => storedCollections(page), { timeout: 30_000 }).toBe(total);

  // Stand in for a data bump that touched one collection.
  await page.route("**/data/meta.json", async (route) => {
    const meta = await (await route.fetch()).json();
    meta.hashes["races.json"] = "moved";
    await route.fulfill({ json: meta });
  });

  const warm = trackCollectionRequests(page);
  await sheetReady(page);
  expect(warm).toEqual(["races.json"]);
  // The superseded row is dropped rather than accumulating across bumps.
  await expect.poll(() => storedCollections(page), { timeout: 30_000 }).toBe(total);
});

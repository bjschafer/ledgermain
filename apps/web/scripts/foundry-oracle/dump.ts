/**
 * Regenerates the Foundry oracle fixtures (`test/fixtures/foundry/*.json`)
 * from a live Foundry VTT world. Joins as a passwordless GM, builds every
 * `ORACLE_SPECS` character in each of its scenarios through Foundry's public
 * API (`oracle.browser.js`), and writes each actor's exported data next to
 * the numbers Foundry derived for it. CI never runs this: the fixtures are
 * committed, and `test/foundryOracle.test.ts` diffs against them.
 *
 * The world must run the pf1 build matching the pinned RefData
 * (`packages/data-pipeline/src/config.ts`), with exactly the pf-content and
 * pf1e-archetypes modules enabled, built from their pinned commits. Running
 * it deletes and rebuilds the actors for the specs it runs, in the world's
 * "Ledgermain Oracle" folder; other specs' actors are left alone, so runs with
 * different `--only` sets and different GM users can overlap.
 *
 *   bun scripts/foundry-oracle/dump.ts --url http://host:30000 [--user Gamemaster] [--only id,id]
 *
 * Run `bun run fmt` afterwards; the fixtures are written unformatted.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { SYSTEM_VERSION } from "@pf1/data-pipeline";
import { chromium } from "@playwright/test";

import { ORACLE_SPECS } from "./specs.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "../../test/fixtures/foundry");

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    user: { type: "string", default: "Gamemaster" },
    only: { type: "string" },
  },
});
if (!values.url) throw new Error("--url is required (the Foundry server, e.g. http://host:30000)");
const base = values.url.replace(/\/$/, "");
const only = values.only ? new Set(values.only.split(",")) : undefined;
const specs = ORACLE_SPECS.filter((s) => !only || only.has(s.id));
if (specs.length === 0) throw new Error(`--only matched no spec ids`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/join`);
  const userId = await page
    .locator("select[name=userId] option", { hasText: values.user })
    .first()
    .getAttribute("value");
  if (!userId) throw new Error(`No user named "${values.user}" on the join screen`);
  await page.selectOption("select[name=userId]", userId);
  await page.click("button[name=join]");
  await page.waitForURL(/\/game$/);
  await page.waitForFunction("globalThis.game?.ready === true", undefined, { timeout: 120_000 });

  const version: unknown = await page.evaluate("[game.system.id, game.system.version]");
  if (!Array.isArray(version) || version[0] !== "pf1" || version[1] !== SYSTEM_VERSION) {
    throw new Error(`World runs ${String(version)}; the pinned RefData is pf1 ${SYSTEM_VERSION}`);
  }
  // Archetypes and alternate racial traits come from these two, built from
  // ARCHETYPE_SHA and PF_CONTENT_SHA; any other active module could change
  // the numbers Foundry derives.
  const modules: unknown = await page.evaluate(
    "game.modules.filter((m) => m.active).map((m) => m.id).sort()",
  );
  if (JSON.stringify(modules) !== JSON.stringify(["pf-content", "pf1e-archetypes"])) {
    throw new Error(
      `Active modules are ${JSON.stringify(modules)}; the oracle needs exactly pf-content and pf1e-archetypes`,
    );
  }

  await page.evaluate(readFileSync(join(here, "oracle.browser.js"), "utf8"));
  const out: unknown = await page.evaluate(`ledgermainOracle.run(${JSON.stringify(specs)})`);
  if (!out || typeof out !== "object") throw new Error("The oracle returned no fixtures");

  mkdirSync(outDir, { recursive: true });
  for (const [id, fixture] of Object.entries(out)) {
    writeFileSync(join(outDir, `${id}.json`), `${JSON.stringify(fixture)}\n`);
    console.log(`wrote ${id}.json`);
  }
} finally {
  await browser.close();
}

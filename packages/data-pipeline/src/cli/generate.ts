/**
 * Reads the pinned Foundry clone and emits normalized JSON into the vendored
 * `data/` directory. Run `pnpm data:fetch` first (or `pnpm data:build` for both).
 */
import { existsSync } from "node:fs";

import {
  FOUNDRY_REPO,
  FOUNDRY_SHA,
  OUTPUT_DIR,
  PACKS_DIR,
  SYSTEM_VERSION,
} from "../config.js";
import { emit } from "../emit.js";
import { normalize } from "../normalize.js";

function main(): void {
  if (!existsSync(PACKS_DIR)) {
    throw new Error(
      `[generate] packs not found at ${PACKS_DIR}. Run \`pnpm data:fetch\` first.`,
    );
  }

  console.log(`[generate] normalizing from ${PACKS_DIR}`);
  const { refData } = normalize({
    packsDir: PACKS_DIR,
    sourceRepo: FOUNDRY_REPO,
    sourceSha: FOUNDRY_SHA,
    systemVersion: SYSTEM_VERSION,
  });

  emit(refData, OUTPUT_DIR);

  const c = refData.meta.counts;
  console.log(`[generate] wrote ${OUTPUT_DIR}`);
  console.log(`[generate] dataVersion=${refData.meta.dataVersion}`);
  console.log(
    `[generate] counts: ${Object.entries(c)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  );
}

main();

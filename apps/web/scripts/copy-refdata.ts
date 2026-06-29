/**
 * Copy the vendored normalized RefData JSON into the app's `public/data/` so the
 * browser can `fetch` it at runtime. The source of truth stays in
 * `packages/data-pipeline/data/`; this copy is gitignored. Runs via predev/prebuild.
 *
 * Stage 5 will swap the browser loader for lazy R2 loading; this copy step and
 * `src/refdata/loader.ts` are the only two places that know where the data lives.
 */
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../../../packages/data-pipeline/data");
const dest = join(here, "../public/data");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log(`[copy-refdata] ${src} -> ${dest}`);

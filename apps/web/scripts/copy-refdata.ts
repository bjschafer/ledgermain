/**
 * Copy the vendored normalized RefData JSON into the app's `public/data/` so the
 * browser can `fetch` it at runtime. The source of truth stays in
 * `packages/data-pipeline/data/`; this copy is gitignored. Runs via predev/prebuild.
 *
 * Also copies the repo-root `OGL.txt` and `NOTICE.md` into `public/` so that the
 * deployed app can serve the Open Game License and the mixed-license notice at
 * runtime (REQUIRED by OGL Sec. 10 whenever Open Game Content is distributed, and
 * by Paizo's Community Use Policy for attribution).
 *
 * Stage 5 will swap the browser loader for lazy R2 loading; this copy step and
 * `src/refdata/loader.ts` are the only two places that know where the data lives.
 */
import { copyFileSync, cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const src = join(repoRoot, "packages/data-pipeline/data");
const dest = join(here, "../public/data");
const publicDir = join(here, "../public");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

// Ship the OGL + NOTICE alongside the data so the deployed app is compliant.
for (const file of ["OGL.txt", "NOTICE.md", "LICENSE"]) {
  copyFileSync(join(repoRoot, file), join(publicDir, file));
}

console.log(`[copy-refdata] ${src} -> ${dest}`);
console.log(`[copy-refdata] also copied OGL.txt, NOTICE.md, LICENSE -> ${publicDir}`);

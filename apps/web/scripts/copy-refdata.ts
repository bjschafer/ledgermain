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
import { basename, dirname, join } from "node:path";
import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const src = join(repoRoot, "packages/data-pipeline/data");
const dest = join(here, "../public/data");
const publicDir = join(here, "../public");

// The bestiary is 13.8 MB the sheet never asks for: only the reference site
// reads it, and that builds its own index straight from the package. Shipping
// it here would cost every player a download for content they can't reach.
const REFERENCE_ONLY = ["monsters.json", "monster-templates.json"];

mkdirSync(dest, { recursive: true });
cpSync(src, dest, {
  recursive: true,
  filter: (from) => !REFERENCE_ONLY.includes(basename(from)),
});
// An earlier build may have left them behind; this copy is not a clean slate.
for (const file of REFERENCE_ONLY) rmSync(join(dest, file), { force: true });

// Ship the OGL + NOTICE alongside the data so the deployed app is compliant.
for (const file of ["OGL.txt", "NOTICE.md", "LICENSE"]) {
  copyFileSync(join(repoRoot, file), join(publicDir, file));
}

console.log(`[copy-refdata] ${src} -> ${dest}`);
console.log(`[copy-refdata] also copied OGL.txt, NOTICE.md, LICENSE -> ${publicDir}`);

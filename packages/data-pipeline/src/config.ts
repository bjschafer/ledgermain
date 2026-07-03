import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Data pinning. The pipeline fetches this EXACT commit — never a branch — so the
 * normalized output is fully reproducible and never drifts. To update the data:
 *
 *   1. Change FOUNDRY_SHA (and SYSTEM_VERSION) below.
 *   2. Run `pnpm data:fetch && pnpm data:build`.
 *   3. Review the diff in packages/data-pipeline/data/ and commit it.
 *
 * Updating data is therefore always a deliberate, reviewable act.
 */
export const FOUNDRY_REPO =
  "https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1.git";

/** Pinned upstream commit (Foundry PF1 system v11.11). */
export const FOUNDRY_SHA = "10b87c070c86d4782e7bcc35ed8c49c7e7e3cec4";

/** Human-readable system version corresponding to FOUNDRY_SHA. */
export const SYSTEM_VERSION = "11.11";

/**
 * Bumped when the RefData *shape* changes (mirrors schema package intent).
 * v2 added `armors` and `weapons` collections (Stage 6). v3 adds `archetypes`
 * and `archetypeFeatures` (Stage 11). v4 adds per-domain spell lists
 * (`domainSpellLists`, `domain-spell-lists.json`) for cleric domains. v5 adds
 * per-bloodline spell lists (`bloodlineSpellLists`, `bloodline-spell-lists.json`)
 * for sorcerer bloodlines.
 */
export const SCHEMA_VERSION = 5;

/**
 * Second pinned source: archetype data (Foundry's pf1 system ships none — see
 * IMPLEMENTATION_PLAN.md Stage 11). This is `bjschafer/pf1e-archetypes`, a fork
 * of `baileymh/pf1e-archetypes` with the upstream merge-conflict corruption
 * (every CSV/XML file) resolved — both conflict halves were verified
 * byte-identical before stripping. Pin like FOUNDRY_SHA: exact commit, never a
 * branch.
 */
export const ARCHETYPE_REPO = "https://github.com/bjschafer/pf1e-archetypes.git";

/** Pinned commit on the cleaned fork (see comment above). */
export const ARCHETYPE_SHA = "815ef073685faf215be442cc5035c8198a89432b";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

/** Where the raw Foundry clone lives (gitignored, fetched on demand). */
export const CACHE_DIR = resolve(packageRoot, ".cache");
export const CLONE_DIR = resolve(CACHE_DIR, "foundry-pf1");
export const PACKS_DIR = resolve(CLONE_DIR, "packs");

/** Where the archetype dataset clone lives (gitignored, fetched on demand). */
export const ARCHETYPE_CLONE_DIR = resolve(CACHE_DIR, "pf1e-archetypes");

/** Where the normalized JSON is vendored (committed to the repo). */
export const OUTPUT_DIR = resolve(packageRoot, "data");

/**
 * The content slice to normalize. Keeping this explicit makes the vertical slice
 * auditable and the output bounded. Classes resolve their feature links;
 * spell lists are derived per class tag.
 */
export const SLICE = {
  /** Class tags to include (their feature links are resolved). */
  classTags: [
    "fighter",
    "barbarian",
    "wizard",
    "cleric",
    "sorcerer",
    "rogue",
    "paladin",
    "ranger",
    "bard",
    "monk",
  ],
  /** Class tags whose spell lists we derive by inverting `learnedAt.class`. */
  spellListClassTags: ["wizard", "sorcerer", "cleric", "paladin", "ranger", "bard"],
  /**
   * Race source folders under packs/races to include. The seven core races live
   * in packs/races/core/.
   */
  raceFolders: ["core"],
} as const;

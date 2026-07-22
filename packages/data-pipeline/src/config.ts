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
export const FOUNDRY_REPO = "https://gitlab.com/foundryvtt_pathfinder1e/foundryvtt-pathfinder1.git";

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
 * for sorcerer bloodlines. v6 adds `domains`/`domains.json` and
 * `wizardSchools`/`wizard-schools.json` — resolved granted-power lists for
 * cleric domains and wizard arcane schools (top-level only, see `Domain`/
 * `WizardSchool` doc comments in `@pf1/schema`). v7 adds `ArmorRef.asf`
 * (armors.json) — arcane spell failure chance, from Foundry's
 * `system.spellFailure` (issue #8). v8 adds `ClassFeature.actions`
 * (structured attack/damage/save/heal data from `system.actions`, e.g. Acid
 * Dart's ranged touch acid damage, Stunning Fist's Fortitude DC) and
 * `ClassFeature.uses.source` (e.g. Channel Positive Energy's `source:
 * "layOnHands"`) — see the in-play resource-pool detail work in `@pf1/engine`'s
 * `deriveResourcePools`. v9 adds `Feat.uses` (feats.json) — the same
 * `maxFormula`/`per` shape as `ClassFeature.uses`, minus `source` (no vendored
 * feat draws from another feature's pool) — for feats like Combat Reflexes
 * and Alignment Channel that are themselves a resource pool; see
 * `deriveFeatResourcePools` in `@pf1/engine`'s `resources.ts`. v10 (issue #74
 * Phase 1) adds three collections and widens one: `traits`/`traits.json` (the
 * pf1-content module's full ~2,000-entry character-trait catalog, reconciled
 * with the hand-authored table via `@pf1/engine` traits.ts's `mergedTraits`);
 * `racialTraits`/`racial-traits.json` (the module's alternate racial traits —
 * entries with a "Replaced Trait(s)" header — covering all vendored races
 * alongside the 8-race hand-authored RACIAL_TRAITS table);
 * `subdomains`/`subdomains.json` + `subdomainSpellLists`/
 * `subdomain-spell-lists.json` and `druidDomains`/`druid-domains.json`; and
 * `wizardSchools` grows from 9 to 17 entries (elemental schools share the
 * collection, `WizardSchool.tag` widened to `WizardSchoolTag |
 * ElementalSchoolTag`).
 */
export const SCHEMA_VERSION = 10;

/**
 * Second pinned source: archetype data (Foundry's pf1 system ships none).
 * This is `bjschafer/pf1e-archetypes`, a fork
 * of `baileymh/pf1e-archetypes` with the upstream merge-conflict corruption
 * (every CSV/XML file) resolved — both conflict halves were verified
 * byte-identical before stripping. Pin like FOUNDRY_SHA: exact commit, never a
 * branch.
 */
export const ARCHETYPE_REPO = "https://github.com/bjschafer/pf1e-archetypes.git";

/** Pinned commit on the cleaned fork (see comment above). */
export const ARCHETYPE_SHA = "815ef073685faf215be442cc5035c8198a89432b";

/**
 * Third pinned source: the community "PF1 Content" module, same GitLab org as
 * the pinned system repo. It ships a much larger feats pack (~3,250 files vs.
 * the system's 390) in the same per-entity YAML shape our `readPack` already
 * consumes, so it merges into `feats.json` rather than adding a new RefData
 * collection. Pin like FOUNDRY_SHA: exact commit, never a branch.
 */
export const PF_CONTENT_REPO = "https://gitlab.com/foundryvtt_pathfinder1e/pf1-content.git";

/** Pinned commit (latest `main` as of 2025-11-24). */
export const PF_CONTENT_SHA = "c66bf333cafc451d817ead660473dd01d9846fb3";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

/** Where the raw Foundry clone lives (gitignored, fetched on demand). */
export const CACHE_DIR = resolve(packageRoot, ".cache");
export const CLONE_DIR = resolve(CACHE_DIR, "foundry-pf1");
export const PACKS_DIR = resolve(CLONE_DIR, "packs");

/** Where the archetype dataset clone lives (gitignored, fetched on demand). */
export const ARCHETYPE_CLONE_DIR = resolve(CACHE_DIR, "pf1e-archetypes");

/** Where the PF1 Content module clone lives (gitignored, fetched on demand). */
export const PF_CONTENT_CLONE_DIR = resolve(CACHE_DIR, "pf1-content");

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
    "druid",
    "arcanist",
    "magus",
    "oracle",
    "alchemist",
    "bloodrager",
    "brawler",
    "cavalier",
    "gunslinger",
    "hunter",
    "inquisitor",
    "investigator",
    "shaman",
    "shifter",
    "skald",
    "slayer",
    "summoner",
    "swashbuckler",
    "vigilante",
    "warpriest",
    "witch",
    // Alternate classes (APG antipaladin, UC ninja/samurai).
    "antipaladin",
    "ninja",
    "samurai",
    // Pathfinder Unchained.
    "barbarianUnchained",
    "monkUnchained",
    "rogueUnchained",
    "summonerUnchained",
    // Occult Adventures.
    "kineticist",
    "medium",
    "mesmerist",
    "occultist",
    "psychic",
    "spiritualist",
  ],
  /** Class tags whose spell lists we derive by inverting `learnedAt.class`. */
  spellListClassTags: [
    "wizard",
    "sorcerer",
    "cleric",
    "paladin",
    "ranger",
    "bard",
    "druid",
    "arcanist",
    "magus",
    "oracle",
    "alchemist",
    "bloodrager",
    "hunter",
    "inquisitor",
    "investigator",
    "shaman",
    "skald",
    "summoner",
    "warpriest",
    "witch",
    "antipaladin",
    "summonerUnchained",
    "medium",
    "mesmerist",
    "occultist",
    "psychic",
    "spiritualist",
  ],
  /**
   * Race source folders under packs/races to include. The seven core races live
   * in packs/races/core/.
   */
  raceFolders: ["core", "other"],
} as const;

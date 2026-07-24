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
 * ElementalSchoolTag`). v11 adds `RagePower`/`ragePowers` (rage-powers.json)
 * — the full published barbarian rage-power catalog from the "Pf Data 1e"
 * fourth pinned source (see `PFDATA_REPO`/`PFDATA_SHA`), prose-only reference
 * data merged with `@pf1/engine`'s hand-verified `RAGE_POWERS` table at read
 * time (see `mergedRagePowerCatalog`), not baked into RefData itself. (v10
 * retroactively also documents `Class.castingAdvancement` and `Class.prereqs`
 * — structured prestige casting-advancement slots and entry requirements,
 * shipped under v9 with issue #66.) v12 (issue #74 Phase 3b) adds eleven more
 * "Pf Data 1e" subsystem catalogs, same prose-only/merged-at-read-time
 * posture as `ragePowers`: `hexes`/`hexes.json` (witch hexes),
 * `shamanHexes`/`shaman-hexes.json` (general shaman hexes),
 * `magusArcana`/`magus-arcana.json`, `rogueTalents`/`rogue-talents.json`,
 * `ninjaTricks`/`ninja-tricks.json`, `slayerTalents`/`slayer-talents.json`,
 * `vigilanteTalents`/`vigilante-talents.json`,
 * `vigilanteSocialTalents`/`vigilante-social-talents.json`,
 * `arcanistExploits`/`arcanist-exploits.json`,
 * `investigatorTalents`/`investigator-talents.json`, and
 * `kineticWildTalents`/`kinetic-wild-talents.json`. v13 (issue #74 Phase 3c)
 * adds seventeen more "Pf Data 1e" subsystem catalogs across three waves,
 * same prose-only/merged-at-read-time posture as `ragePowers` — occult-class:
 * `mesmeristTricks`/`mesmerist-tricks.json`, `mesmeristBoldStares`/
 * `mesmerist-bold-stares.json`, `phrenicAmplifications`/
 * `phrenic-amplifications.json`, `psychicDisciplines`/
 * `psychic-disciplines.json`, `occultistImplements`/
 * `occultist-implements.json`, and `mediumSpirits`/`medium-spirits.json`;
 * caster-class: `oracleMysteries`/`oracle-mysteries.json`, `oracleCurses`/
 * `oracle-curses.json`, `witchPatrons`/`witch-patrons.json`,
 * `shamanSpirits`/`shaman-spirits.json`, `sorcererBloodlines`/
 * `sorcerer-bloodlines.json`, and `bloodragerBloodlines`/
 * `bloodrager-bloodlines.json`; martial/hybrid-class:
 * `alchemistDiscoveries`/`alchemist-discoveries.json`, `monkKiPowers`/
 * `monk-ki-powers.json`, `monkStyleStrikes`/`monk-style-strikes.json`,
 * `cavalierOrders`/`cavalier-orders.json`, and `shifterAspects`/
 * `shifter-aspects.json` — one integration bump covering all three sibling
 * waves rather than bumping per-wave. v14 (issue #99) adds `changes` to
 * `Domain` (the doc-level `system.changes` a handful of top-level domains
 * carry — Protection's save resistance, Travel's +10 speed, Darkness/Rune's
 * bonus feats), the same shape `Subdomain.changes` already vendored. v15
 * (issue #100) adds `elementalSchoolSpellLists`/
 * `elemental-school-spell-lists.json` (each elemental wizard school's
 * bonus-slot spell list, resolved by name from its description prose) and
 * `WizardSchool.oppositionOptions` (the elements an elemental school may
 * oppose, parsed from the same prose); spells reachable only through an
 * elemental list now also survive the spell slice. v16 (issue #102) widens
 * `RacialTrait`: `heritage` (the heritage a variant belongs to, e.g.
 * Plumekith) and `openChanges` (changes the source ships untargeted because
 * the trait says "choose one"), plus a classifier that now also keeps
 * heritage-tagged entries and the three punctuation variants of the "Replaced
 * Trait(s)" header it previously missed — 750 entries to 860.
 */
export const SCHEMA_VERSION = 16;

/**
 * Second pinned source: archetype data (Foundry's pf1 system ships none).
 * This is `Tryss_Farron/pf1e-archetypes` on GitLab, the maintained successor to
 * the (now-abandoned) `baileymh/pf1e-archetypes` GitHub module we vendored
 * from previously — same maintainer as the pinned `PF_CONTENT_REPO` below, and
 * registered on foundryvtt.com as that module's continuation. Ships per-entity
 * YAML packs under `src/` (the same shape `PF_CONTENT_REPO` uses, read via
 * `util/packs.ts` `readPack`) rather than the old fork's per-class CSVs. Pin
 * like FOUNDRY_SHA: exact commit, never a branch.
 */
export const ARCHETYPE_REPO = "https://gitlab.com/Tryss_Farron/pf1e-archetypes.git";

/** Pinned commit (latest `main` as of 2026-07-21). */
export const ARCHETYPE_SHA = "92ddcb60027e3088e5afd0645183c031ec3e9bb4";

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

/**
 * Fourth pinned source: "Pf Data 1e", a flat-JSON dictionary dataset (one file
 * per subsystem under `json/`, each a slug-keyed dictionary of entries) that
 * fills gaps neither the Foundry system nor PF1 Content ship as structured
 * data — starting with the full rage-power catalog (issue #74 Phase 3a), then
 * the witch-hex, general shaman-hex, magus-arcana, rogue-family talent,
 * arcanist-exploit, investigator-talent, and kineticist-wild-talent catalogs
 * (Phase 3b), then the mesmerist trick/bold-stare, phrenic-amplification,
 * psychic-discipline, occultist-implement, and Medium legendary-spirit
 * catalogs (Phase 3c). Single-maintainer repo, so pin like the others: exact
 * commit, never a branch.
 */
export const PFDATA_REPO = "https://github.com/jasontankapps/pathfinder-data-1-e.git";

/** Pinned commit (verified 2026-07-21). */
export const PFDATA_SHA = "33f1b75b8f62b43c59b96eab6bebb45e37c29229";

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

/** Where the Pf Data 1e clone lives (gitignored, fetched on demand). */
export const PFDATA_CLONE_DIR = resolve(CACHE_DIR, "pfdata");

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

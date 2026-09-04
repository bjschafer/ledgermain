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
 * Bumped when the RefData *shape* changes (mirrors schema package intent). v2
 * added `armors` and `weapons` collections (Stage 6). v3 adds `archetypes` and
 * `archetypeFeatures` (Stage 11). v4 adds per-domain spell lists
 * (`domainSpellLists`, `domain-spell-lists.json`) for cleric domains. v5 adds
 * per-bloodline spell lists (`bloodlineSpellLists`,
 * `bloodline-spell-lists.json`) for sorcerer bloodlines. v6 adds
 * `domains`/`domains.json` and `wizardSchools`/`wizard-schools.json` —
 * resolved granted-power lists for cleric domains and wizard arcane schools
 * (top-level only, see `Domain`/ `WizardSchool` doc comments in
 * `@pf1/schema`). v7 adds `ArmorRef.asf` (armors.json) — arcane spell failure
 * chance, from Foundry's `system.spellFailure`. v8 adds `ClassFeature.actions`
 * (structured attack/damage/save/heal data from `system.actions`, e.g. Acid
 * Dart's ranged touch acid damage, Stunning Fist's Fortitude DC) and
 * `ClassFeature.uses.source` (e.g. Channel Positive Energy's `source:
 * "layOnHands"`) — see the in-play resource-pool detail work in
 * `@pf1/engine`'s `deriveResourcePools`. v9 adds `Feat.uses` (feats.json) —
 * the same `maxFormula`/`per` shape as `ClassFeature.uses`, minus `source` (no
 * vendored feat draws from another feature's pool) — for feats like Combat
 * Reflexes and Alignment Channel that are themselves a resource pool; see
 * `deriveFeatResourcePools` in `@pf1/engine`'s `resources.ts`. v10 adds three
 * collections and widens one: `traits`/`traits.json` (the pf1-content module's
 * full ~2,000-entry character-trait catalog, reconciled with the hand-authored
 * table via `@pf1/engine` traits.ts's `mergedTraits`);
 * `racialTraits`/`racial-traits.json` (the module's alternate racial traits —
 * entries with a "Replaced Trait(s)" header — covering all vendored races
 * alongside the 8-race hand-authored RACIAL_TRAITS table);
 * `subdomains`/`subdomains.json` + `subdomainSpellLists`/
 * `subdomain-spell-lists.json` and `druidDomains`/`druid-domains.json`; and
 * `wizardSchools` grows from 9 to 17 entries (elemental schools share the
 * collection, `WizardSchool.tag` widened to `WizardSchoolTag |
 * ElementalSchoolTag`). v11 adds `RagePower`/`ragePowers` (rage-powers.json) —
 * the full published barbarian rage-power catalog from the "Pf Data 1e" fourth
 * pinned source (see `PFDATA_REPO`/`PFDATA_SHA`), prose-only reference data
 * merged with `@pf1/engine`'s hand-verified `RAGE_POWERS` table at read time
 * (see `mergedRagePowerCatalog`), not baked into RefData itself. (v10
 * retroactively also documents `Class.castingAdvancement` and `Class.prereqs`
 * — structured prestige casting-advancement slots and entry requirements,
 * shipped under v9.) v12 adds eleven more "Pf Data 1e"
 * subsystem catalogs, same prose-only/merged-at-read-time posture as
 * `ragePowers`: `hexes`/`hexes.json` (witch hexes),
 * `shamanHexes`/`shaman-hexes.json` (general shaman hexes),
 * `magusArcana`/`magus-arcana.json`, `rogueTalents`/`rogue-talents.json`,
 * `ninjaTricks`/`ninja-tricks.json`, `slayerTalents`/`slayer-talents.json`,
 * `vigilanteTalents`/`vigilante-talents.json`,
 * `vigilanteSocialTalents`/`vigilante-social-talents.json`,
 * `arcanistExploits`/`arcanist-exploits.json`,
 * `investigatorTalents`/`investigator-talents.json`, and
 * `kineticWildTalents`/`kinetic-wild-talents.json`. v13 adds seventeen more
 * "Pf Data 1e" subsystem catalogs across three waves, same
 * prose-only/merged-at-read-time posture as `ragePowers` — occult-class:
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
 * waves rather than bumping per-wave. v14 adds `changes` to `Domain` (the
 * doc-level `system.changes` a handful of top-level domains carry —
 * Protection's save resistance, Travel's +10 speed, Darkness/Rune's bonus
 * feats), the same shape `Subdomain.changes` already vendored. v15 adds
 * `elementalSchoolSpellLists`/ `elemental-school-spell-lists.json` (each
 * elemental wizard school's bonus-slot spell list, resolved by name from its
 * description prose) and `WizardSchool.oppositionOptions` (the elements an
 * elemental school may oppose, parsed from the same prose); spells reachable
 * only through an elemental list now also survive the spell slice. v16 widens
 * `RacialTrait`: `heritage` (the heritage a variant belongs to, e.g.
 * Plumekith) and `openChanges` (changes the source ships untargeted because
 * the trait says "choose one"), plus a classifier that now also keeps
 * heritage-tagged entries and the three punctuation variants of the "Replaced
 * Trait(s)" header it previously missed — 750 entries to 860. v17 adds
 * `eidolonSubtypes`/`eidolon-subtypes.json` — the full published
 * unchained-summoner eidolon-subtype catalog from the "Pf Data 1e" fourth
 * pinned source (`json/class_ability_unchained_eidolons.json`, 26 entries
 * after dropping `not_found`), prose-only browsing data alongside (not merged
 * with) `@pf1/engine` `eidolon-unchained.ts`'s hand-authored
 * `EIDOLON_SUBTYPES` table. v18 widens `Spell.sr` from a boolean passthrough
 * of Foundry's `system.sr` (which the pinned pack never actually sets `true`,
 * making the field dead noise) to a display string sourced by name-match from
 * the "Pf Data 1e" `json/spells*.json` files instead — "yes", "no", "yes
 * (object)", "yes (harmless)", or a free-text override, matching the printed
 * SR line verbatim. v19 adds `itemAbilities`/`item-abilities.json` — the 181
 * weapon/armor/shield special abilities (flaming, keen, fortification) that
 * `transformMagicItems` already parsed out of the Pf Data 1e magic-item files
 * but `normalize` previously discarded; see `ItemAbilityRef`'s doc comment.
 * v20 changes what `Subdomain.features`/`Subdomain.changes` mean: both are
 * now the subdomain's complete, already-merged truth rather than an override
 * that's empty when the Foundry pack documents none. The 125 subdomains the
 * pack carries no power for take theirs from the Pf Data 1e catalog, so a
 * consumer must no longer read the parent domain's powers when a subdomain's
 * list looks empty; see `transform/subdomainPowers.ts`. v21 adds
 * `focusedSchools`/`focused-schools.json` (22 entries) — the APG "Focused
 * Schools" variant rule, previously excluded at the pipeline level as "too
 * niche". Unlike subdomains, the Foundry pack states each one's full
 * mechanics directly (an `@UUID`-linked parent school, `@UUID`-linked
 * replaced powers, and its own `links.supplements` grants), so no
 * fourth-party source was needed; see `transform/focusedSchools.ts`. v22
 * fills `DruidDomain.features`/`.changes` — the Foundry pack states every druid
 * nature-bond domain power (all 25 animal/terrain domains) as free-text prose
 * with no `class-abilities` document at all, so, unlike every other gap this
 * pipeline fills, there's no vendored granted-power link to correct or
 * resolve; `supplements.ts`'s `SUPPLEMENTAL_DRUID_DOMAIN_FEATURES` hand-
 * authors one `ClassFeature` per named power straight from the published
 * rule. `DruidDomain.features` was always `[]` before this version; a
 * consumer built against v20 or earlier that assumed that and skipped
 * reading it now silently misses the granted powers. v23 adds
 * `inquisitions`/`inquisitions.json` — the full published inquisitor
 * inquisition catalog (fourth-source dataset; an inquisitor's alternative to
 * a domain), with each entry's granted powers parsed into `Inquisition.
 * features`, same `ClassFeatureGrant` shape as `Domain.features`; see
 * `Inquisition`'s doc comment and `transform/inquisitions.ts`. v24 adds
 * `blessings`/`class_ability_blessings.json` — the full published warpriest
 * blessing catalog from the "Pf Data 1e" fourth pinned source (42 entries
 * after dropping `not_found` and its five redirects), prose-only, split into
 * `minorPower`/`majorPower` per entry so a consumer can gate them by
 * warpriest level; see `transform/warpriestBlessings.ts`. v25 adds
 * `sorcererBloodlineMutations`/`sorcerer-bloodline-mutations.json` — the 24
 * published "Wildblooded Mutation" variants, previously rendered as inert bold
 * text inside their parent bloodline's own description
 * (`SorcererBloodline.description`) rather than promoted to entries of their
 * own; see `SorcererBloodlineMutation` doc comment and
 * `transform/sorcererBloodlines.ts`. A parent bloodline's description no
 * longer inlines its mutations' prose. v26 removes two fields that carried no
 * information. `Spell.learnedAt.subdomain` was emitted as an empty object on
 * all 3,026 spells: the pinned pack tags no spell by subdomain, which is
 * precisely why `subdomainSpellLists` is parsed from description prose
 * instead, so the key could never be populated and reading it as a spell
 * source was a standing trap. `Archetype.contributorModule` held the same
 * literal on all 1,429 archetypes; the attribution it duplicated lives in
 * `ARCHETYPE_REPO` above, and the content licence in `NOTICE.md`. v27 widens
 * `ArchetypeFeature` with fields the archetype source carried all along under
 * `flags["pf1-archetypes"]`/`system.abilityType` but the pipeline never read:
 * `replacesText` (verbatim "hex gained at 2nd level"-style prose naming what
 * a feature replaces), `isReplacement` (swap vs. addition/alteration),
 * `replacesSlot` (that same text parsed into a subsystem grant slot when
 * unambiguous), and `abilityType` (ex/su/sp). `.level` also now falls back to
 * the flag's own `archetypeLevel`, a level parsed off `replacesText`, or a
 * stricter opening-sentence prose scrape before giving up at 0 (previously
 * the only fallback for features linked without a structured level), and
 * `pairedBaseFeatureUuid` now prefers matching `replacesText` against the
 * base class's own feature names over the previous level-collision-only
 * heuristic. v28 adds the first two SIDECAR collections —
 * `monsters.json`/`monster-templates.json` (the full "Pf Data 1e" bestiary:
 * every parseable statblock across `SLICE.monsterFiles`, plus the monster
 * templates). Sidecar means: emitted beside the RefData files and present in
 * `meta.counts`/`meta.hashes`, but deliberately NOT keys of `RefData` — the
 * only consumer is `apps/reference`, and `loadRefData()` is eagerly parsed by
 * hundreds of engine test processes that should not pay several extra
 * megabytes of statblock heap. Loaded on demand via `loadMonsters()`/
 * `loadMonsterTemplates()` instead; see `Monster`'s doc comment in
 * `@pf1/schema` and `util/monsterStatblock.ts` for the parsing postures. v29
 * adds `meta.sourcePins` — all four pinned upstream SHAs, not just Foundry's
 * `meta.sourceSha`. `test/pinIntegrity.test.ts` asserts they equal the
 * constants below, so a pin edited without a regeneration fails the suite
 * instead of shipping a `data/` directory the pin no longer describes.
 */
export const SCHEMA_VERSION = 29;

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
 * data — starting with the full rage-power catalog, then the witch-hex,
 * general shaman-hex, magus-arcana, rogue-family talent, arcanist-exploit,
 * investigator-talent, and kineticist-wild-talent catalogs (Phase 3b), then
 * the mesmerist trick/bold-stare, phrenic-amplification, psychic-discipline,
 * occultist-implement, and Medium legendary-spirit catalogs (Phase 3c).
 * Single-maintainer repo, so pin like the others: exact commit, never a
 * branch.
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
  /**
   * Pf Data 1e `magic_*.json` files to import as the magic-item catalog (see
   * `transform/magicItems.ts`). Listed explicitly rather than globbed so a data
   * bump that adds or renames an upstream file is a reviewed change, not a
   * silent swing in what the gear picker offers.
   */
  magicItemFiles: [
    "magic_altar",
    "magic_armor",
    "magic_artifact",
    "magic_artifact2",
    "magic_artifact3",
    "magic_demonic_implants",
    "magic_devil_talismans",
    "magic_elemental_augmentations",
    "magic_enhancements",
    "magic_enhancements2",
    "magic_favor",
    "magic_fleshcrafting",
    "magic_fungal_grafts",
    "magic_infused_poisons",
    "magic_ioun_stones",
    "magic_juju_fetishes",
    "magic_legacy_items",
    "magic_necrografts",
    "magic_necrotoxins",
    "magic_plant",
    "magic_relics",
    "magic_ring",
    "magic_rod",
    "magic_set",
    "magic_shadow_piercings",
    "magic_staff",
    "magic_tattoo",
    "magic_throne",
    "magic_weapon",
    "magic_weapon2",
    "magic_wondrous_belt_body_chest",
    "magic_wondrous_eyes_feet_hands",
    "magic_wondrous_head_headband",
    "magic_wondrous_neck",
    "magic_wondrous_shoulders_wrists",
    "magic_wondrous_slotless01",
    "magic_wondrous_slotless02",
    "magic_wondrous_slotless03",
    "magic_wondrous_slotless04",
    "magic_wondrous_slotless05",
    "magic_wondrous_slotless06",
  ],
  /**
   * Pf Data 1e monster dictionaries → the `monsters.json` SIDECAR collection
   * (see `Monster` in schema — deliberately not a `RefData` key). Explicit
   * list, same posture as `magicItemFiles`: a source bump that adds or renames
   * a file is a reviewed change here, not a silent glob pickup. The
   * `monster_families*`/`monster_types`/`monster_subtypes` siblings are
   * deliberately excluded — crosslinks to them degrade to plain text.
   */
  monsterFiles: [
    "monsters01",
    "monsters02",
    "monsters03",
    "monsters04",
    "monsters05",
    "monsters06",
    "monsters07",
    "monsters08",
    "monsters09",
    "monsters10",
    "monsters11",
    "monsters12",
    "monsters13",
    "monsters14",
    "monsters15",
    "monsters16",
    "monsters17",
    "monsters18",
    "monsters19",
    "monsters20",
    "monsters21",
    "monsters22",
    "monsters23",
    "monsters24",
    "monsters25",
    "monsters26",
    "monsters27",
    "monsters28",
    "monsters29",
    "monsters30",
    "monsters31",
    "monsters32",
    "monsters33",
    "monsters34",
    "monsters35",
    "monsters36",
    "monsters37",
    "monsters38",
    "monsters39",
    "monsters40",
    "monsters41",
    "monsters42",
    "monsters_mythic",
    "monsters_mythic2",
    "monsters_unique",
    "monsters_unique2",
    "monsters_unique3",
    "monsters_unique4",
  ],
  /** Pf Data 1e monster-template dictionaries → `monster-templates.json` (sidecar, see `MonsterTemplate`). */
  monsterTemplateFiles: [
    "monster_template1",
    "monster_template2",
    "monster_template3",
    "monster_template4",
  ],
} as const;

import type { ElementalSchoolTag, WizardSchoolTag } from "./character.js";
import type {
  AbilityId,
  BabTier,
  Change,
  ContextNote,
  RefEntity,
  SaveTier,
  SizeId,
  SkillId,
  SourceRef,
} from "./primitives.js";

/**
 * `RefData` is the normalized, build-time-generated reference dataset consumed
 * by the rules engine. It is derived from the Foundry PF1 YAML packs at a pinned
 * source commit (see data-pipeline). Entities are keyed by Foundry id for O(1)
 * lookup and stable cross-references.
 */
export interface RefData {
  meta: RefDataMeta;
  races: Record<string, Race>;
  classes: Record<string, Class>;
  /** Class features (the `class-abilities` pack) referenced by classes. */
  classFeatures: Record<string, ClassFeature>;
  feats: Record<string, Feat>;
  /**
   * The full vendored PF1 character-trait catalog (~2,000 entries, see
   * {@link Trait}). Not the same as the engine's hand-authored `TRAITS`
   * table (28 verified entries, `CharacterDoc.build.traits` may reference
   * either) — see `@pf1/engine` `traits.ts` for how the two are merged.
   */
  traits: Record<string, Trait>;
  spells: Record<string, Spell>;
  buffs: Record<string, Buff>;
  items: Record<string, Item>;
  /** Per-class spell lists, keyed by class tag → spell level → spell ids. */
  spellLists: Record<string, SpellList>;
  /**
   * Per-domain spell lists, keyed by domain tag (e.g. "Air", "Fire") → spell
   * level → spell ids. Inverted from `Spell.learnedAt.domain`. A cleric's two
   * chosen domains each grant one bonus prepared slot per accessible spell
   * level, drawable from this list. Empty for non-cleric slices.
   */
  domainSpellLists: Record<string, SpellList>;
  /**
   * Per-bloodline spell lists, keyed by bloodline tag (e.g. "Draconic",
   * "Abyssal") → spell level → spell ids. Inverted from `Spell.learnedAt.bloodline`.
   * A sorcerer's chosen bloodline grants one bonus spell known per odd sorcerer
   * level starting at 3 (level-`L` bloodline spell unlocked at sorcerer level
   * `2L+1`); these do not count against the spells-known cap. Empty for non-sorcerer
   * slices. 39 bloodlines in the current vendored slice.
   */
  bloodlineSpellLists: Record<string, SpellList>;
  /** Mundane base armor/shields (the `armors-and-shields` pack, magic excluded). */
  armors: Record<string, ArmorRef>;
  /** Mundane base weapons (the `weapons-and-ammo` pack, magic + ammo excluded). */
  weapons: Record<string, WeaponRef>;
  /** Archetypes for the sliced classes (third-party dataset; see Archetype). */
  archetypes: Record<string, Archetype>;
  /** Archetype class features; each points back to its parent via `archetypeId`. */
  archetypeFeatures: Record<string, ArchetypeFeature>;
  /** Top-level cleric domains (see `Domain` doc comment; subdomains are `subdomains` below). */
  domains: Record<string, Domain>;
  /** Cleric subdomains, each swapping in place of a parent `Domain` — see `Subdomain` doc comment. */
  subdomains: Record<string, Subdomain>;
  /**
   * Per-subdomain spell lists, keyed by subdomain tag (e.g. "Cloud") → spell
   * level → spell ids. Derived at build time (not inverted from any
   * `Spell.learnedAt` field the way `domainSpellLists` is — the vendored
   * spell pack never tags individual spells by subdomain) by merging the
   * subdomain's own replacement/override list (parsed from its description
   * prose) onto its parent domain's `domainSpellLists[parentDomainTags[0]]`
   * entry for any level it doesn't override. Empty for subdomains with no
   * vendored spell-list section (rare — see `Subdomain` doc comment).
   */
  subdomainSpellLists: Record<string, SpellList>;
  /**
   * Druid nature-bond domains (`class-abilities/domains/druid-domains/**`,
   * animal-companion-alternative and terrain domains) — see `DruidDomain` doc
   * comment. Vendored for completeness; nothing in the builder/engine
   * consumes this yet (no nature-bond domain-choice field exists to wire it
   * into).
   */
  druidDomains: Record<string, DruidDomain>;
  /**
   * Wizard arcane schools: the nine standard/Universalist schools (top-level
   * `wizard-schools/*.yaml`) plus the elemental schools (`wizard-schools/
   * elemental-schools/*.yaml`) in the same collection, distinguished only by
   * `tag`'s type (`WizardSchoolTag` vs `ElementalSchoolTag`) — both are
   * selected and granted identically via `build.wizardSchool` /
   * `collectGrantedFeatures`. See `WizardSchool` doc comment for what's NOT
   * derived for the elemental entries (bonus-slot spell list, opposition).
   */
  wizardSchools: Record<string, WizardSchool>;
  /**
   * Alternate racial traits from the pinned `pf1-content` module's
   * `pf-racial-traits` pack (issue #74 fill plan phase 1), covering all 80
   * vendored races. Distinct from the 7-core-races-plus-Sylph hand-authored
   * `RACIAL_TRAITS` table in `@pf1/engine` `racial-traits.ts`, which remains
   * authoritative (mechanically-enforced replacement) for those races — see
   * that module's doc comment and `RacialTrait.replacedTraitNames` below for
   * how the two catalogs relate.
   */
  racialTraits: Record<string, RacialTrait>;
  /** The full published barbarian rage-power catalog (fourth-source dataset; see `RagePower` doc comment). */
  ragePowers: Record<string, RagePower>;
  /** The full published witch hex catalog (fourth-source dataset, issue #74 Phase 3b; see `WitchHex` doc comment). */
  hexes: Record<string, WitchHex>;
  /** The full published GENERAL shaman hex catalog (fourth-source dataset, issue #74 Phase 3b; see `ShamanHex` doc comment) — spirit-specific hexes stay hand-authored only, see that type's doc comment. */
  shamanHexes: Record<string, ShamanHex>;
  /** The full published magus arcana catalog (fourth-source dataset, issue #74 Phase 3b; see `MagusArcana` doc comment). */
  magusArcana: Record<string, MagusArcana>;
}

/** Provenance + integrity metadata for a generated dataset. */
export interface RefDataMeta {
  /** Bumped when the *shape* of RefData changes. */
  schemaVersion: number;
  /** Identifies this dataset build; derived from the source commit. */
  dataVersion: string;
  sourceRepo: string;
  /** Exact upstream git SHA the data was generated from. */
  sourceSha: string;
  /** Foundry PF1 *system* version (e.g. "11.11"). */
  systemVersion: string;
  /** Foundry *content* core version (e.g. "13.351"). */
  contentVersion: string;
  generatedAt: string;
  counts: Record<string, number>;
  /** sha256 of each emitted data file, for content-addressable diffing. */
  hashes: Record<string, string>;
}

/** A spell level (0–9) mapped to the spell ids available at that level. */
export type SpellList = Record<number, string[]>;

/* ------------------------------------------------------------------ races -- */

export interface Race extends RefEntity {
  size: SizeId;
  /** Movement speeds in feet, keyed by mode ("land", "fly", "swim", ...). */
  speeds: Record<string, number>;
  languages: string[];
  creatureTypes: string[];
  creatureSubtypes: string[];
  /**
   * Typed modifiers granted by the race — including ability adjustments
   * (target = an AbilityId), bonus skill ranks, bonus feats, etc.
   */
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Skills that are always class skills for this race, regardless of class
   * (e.g. Adaro always treat Swim as a class skill). Present on a minority of
   * non-core races; omitted (rather than an empty array) when the source has
   * no such grant.
   */
  classSkills?: SkillId[];
}

/**
 * An alternate racial trait vendored from `pf1-content`'s `pf-racial-traits`
 * pack (1,872 entries, ~750 of which are alternates — see
 * data-pipeline `transformRacialTrait`'s doc comment for how alternates are
 * told apart from the pack's standard-trait entries, which are dropped
 * before emission since `Race.changes`/`contextNotes` already carry them).
 *
 * Honesty posture (mirrors the hybrid feat-prereq model): `changes` apply
 * exactly like any other change source when present, but nothing here
 * SUPPRESSES a race's standard `Change`s the way the hand-authored
 * `@pf1/engine` `RACIAL_TRAITS` table does for its 8 races — this pack gives
 * only the replaced trait's NAME (`replacedTraitNames`), not a verified
 * mapping to the specific `Race.changes`/`contextNotes` entries it swaps
 * out, so mechanically suppressing them would risk silently dropping the
 * wrong thing (or the right thing for the wrong reason) on an unaudited
 * entry. The player is expected to manually retire the replaced standard
 * trait; the UI surfaces `replacedTraitNames` as a reminder, never a block.
 */
export interface RacialTrait extends RefEntity {
  /**
   * Race/heritage tag(s) this entry is filed under (`system.tags` verbatim) —
   * usually one race name matching `Race.name` (e.g. "Goblin"), but a
   * heritage-specific entry carries both its base race and heritage tags
   * (e.g. `["Aasimar", "Plumekith"]`). Match against `Race.name` to scope a
   * picker to the character's current race.
   */
  race: string[];
  /**
   * The pack's own grouping tag: "featSkills" | "defense" | "offense" |
   * "senses" | "magical" | "movement" | "other" | "weakness". Absent on a
   * minority of entries.
   */
  traitCategory?: string;
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Standard trait name(s) this entry replaces, parsed from the source
   * description's structured "Replaced Trait(s)" header — see this
   * interface's doc comment. Always non-empty: entries without the header
   * are the pack's STANDARD racial traits (already baked into `Race.changes`
   * elsewhere) and never reach this collection at all.
   */
  replacedTraitNames: string[];
  /** The published point cost in the Race Builder point-buy system, when tagged. */
  racePoints?: number;
  /** Limited-use resource, mirroring `Feat.uses` (e.g. a 3/day spell-like ability). */
  uses?: { maxFormula?: string; per?: string };
}

/* ----------------------------------------------------------------- classes -- */

export interface Class extends RefEntity {
  /** Stable slug, e.g. "barbarian". */
  tag: string;
  /** "base" | "prestige" | "npc" | ... */
  subType: string;
  /** Hit die size, e.g. 12 for d12. */
  hd: number;
  bab: BabTier;
  saves: { fort: SaveTier; ref: SaveTier; will: SaveTier };
  skillsPerLevel: number;
  classSkills: SkillId[];
  armorProf: string[];
  weaponProf: string[];
  /** Class features granted by level, resolved from `links.supplements`. */
  features: ClassFeatureGrant[];
  /**
   * Casting-advancement slots for prestige classes ("+1 level of existing
   * spellcasting class"). Absent for classes that don't advance casting.
   * Each slot advances ONE existing casting class the character already has
   * (of the matching `kind`) by one effective level at the listed prestige
   * levels — spells per day / spells known / caster level ONLY, never that
   * target class's other features (bonus feats, domains, etc). A class with
   * two slots (e.g. Mystic Theurge) can advance two different casting
   * classes independently, one per slot.
   */
  castingAdvancement?: {
    /** Which kind of existing casting class a slot may target. */
    kind: "arcane" | "divine" | "any";
    /** The prestige-class levels (1-based) at which this slot advances its target. */
    levels: number[];
  }[];
  /**
   * Structured entry requirements (prestige classes; issue #66 chunk 4).
   * Hybrid prereq model (DESIGN.md §4, mirrors `FeatPrerequisites`): the
   * builder hard-blocks only on these structured signals; `prereqText` (the
   * verbatim published requirements line) is shown as a soft advisory for
   * everything not structurally captured (alignment, race, sneak-attack-die
   * minimums, parametrized/OR feats like "Weapon Focus (longbow or
   * shortbow)", parametrized skills like "Perform (oratory)", etc).
   */
  prereqs?: {
    bab?: number;
    /** Feat NAMES as published (matched by name-slug like feat prereqs). */
    feats?: string[];
    skillRanks?: { skill: SkillId; ranks: number }[];
    /**
     * "Able to cast Nth-level (arcane|divine|any) spells" — one entry per
     * requirement (Mystic Theurge has two: 2nd-level arcane AND divine).
     */
    casting?: { kind: "arcane" | "divine" | "any"; spellLevel: number }[];
    /** Verbatim published requirements line (plain text), always present for display. */
    prereqText: string;
  };
}

/** A class feature granted at a specific level (resolved UUID link). */
export interface ClassFeatureGrant {
  level: number;
  /** UUID of the granted class feature. */
  uuid: string;
  /** Resolved class-feature id (key into `RefData.classFeatures`). */
  featureId: string;
  name: string;
  /** False if the UUID could not be resolved within the generated slice. */
  resolved: boolean;
}

/**
 * A top-level cleric domain (`class-abilities/domains/*.yaml`, one directory
 * level deep — excludes subdomains and druid-specific domains, each vendored
 * separately as `Subdomain` / `DruidDomain`, see their doc comments).
 */
export interface Domain extends RefEntity {
  /** Matches `Spell.learnedAt.domain` / `RefData.domainSpellLists` keys (e.g. "Fire"). */
  tag: string;
  /** Granted powers by level, resolved from `links.supplements` (same shape as `Class.features`). */
  features: ClassFeatureGrant[];
}

/**
 * A cleric subdomain (`class-abilities/domains/subdomains/*.yaml`) — a domain
 * variant a cleric may pick in place of one of its parent domain(s)
 * (`parentDomainTags`), entirely replacing that domain choice. Its parent
 * association and replacement spell list are parsed from the parent domain's
 * own description prose (a "Subdomains: ..." list) and the subdomain's own
 * "(Replacement) Domain Spells" list — neither is a structured link in the
 * source, so this is best-effort text parsing, not a `links.supplements`
 * resolution (see data-pipeline `transform/subdomains.ts`).
 */
export interface Subdomain extends RefEntity {
  /** Matches `RefData.subdomainSpellLists` keys (e.g. "Cloud"). Not a `Spell.learnedAt` key — see `subdomainSpellLists` doc comment. */
  tag: string;
  /**
   * `Domain.tag`(s) this subdomain can replace. Almost always one entry; a
   * handful (e.g. Alchemy: Artifice or Magic) attach to two parent domains —
   * `subdomainSpellLists` merges against `parentDomainTags[0]` only in that
   * case (a documented simplification, not derived per chosen parent).
   */
  parentDomainTags: string[];
  /**
   * Structured granted-power override, resolved from `links.supplements`
   * exactly like `Domain.features` — present for only ~11 of 137 subdomains
   * whose source doc models a full override (e.g. Cloud replaces Air's
   * 8th-level power with Thundercloud alongside Air's unchanged 1st power).
   * Empty for the rest: the source only documents a spell-list replacement
   * for those, so treat this subdomain's granted powers as identical to its
   * parent's — use `RefData.domains[parentDomainTags[0]].features` when this
   * array is empty, not an empty grant list.
   */
  features: ClassFeatureGrant[];
  /**
   * A numeric bonus carried directly on the subdomain doc itself (e.g.
   * Purity's +1-per-5-levels resistance bonus to all saves), rather than
   * proxied through a `links.supplements`-linked `ClassFeature.changes` the
   * way `features` above works. Vendored for the ~4 subdomains that have one
   * (the source's richest `system.changes` slice in the ecosystem — worth
   * capturing even though nothing consumes it yet: **not yet applied by the
   * engine** — `collectGrantedFeatures`/`compute()` don't read this field, the
   * same pre-existing gap top-level `Domain` has for its own handful of
   * directly-`changes`-bearing entries (Darkness, Protection, Rune, Travel).
   * Empty for the rest.
   */
  changes: Change[];
}

/**
 * A druid nature-bond domain (`class-abilities/domains/druid-domains/**`) —
 * an alternate to an animal companion; PF1 grants powers scaling off druid
 * level instead of a cleric's channel-energy-adjacent kit. `kind` mirrors the
 * source's own split: `"animal"` domains (Wolf, Eagle, ...) key off an animal
 * totem, `"terrain"` domains (Desert, Jungle, ...) off a landscape. `features`
 * is always `[]` — the source models every druid domain power as free-text
 * prose under its own description, never a `links.supplements`-linked
 * `class-abilities` entry, so there is nothing structured to resolve.
 */
export interface DruidDomain extends RefEntity {
  tag: string;
  kind: "animal" | "terrain";
  features: ClassFeatureGrant[];
}

/**
 * A wizard arcane school — the nine standard/Universalist schools
 * (`class-abilities/wizard-schools/*.yaml`) or one of the eight elemental
 * schools (`wizard-schools/elemental-schools/*.yaml`; the elemental/focused
 * variant-rule subfolder within THAT folder is excluded — too niche a
 * combination to vendor). Elemental entries have real `features` (resolved
 * from `links.supplements` exactly like the standard schools) but no derived
 * bonus-slot spell list: the source lists each elemental school's spells as
 * free-text names, not `@UUID`-linked entries, which isn't reliably
 * parseable (comma-separated names, some containing commas themselves, e.g.
 * "protection from energy, communal") — so `spell.school === build.
 * wizardSchool` (the mechanic standard schools use) simply matches nothing
 * for an elemental pick. Their opposition-school mechanic (one of four
 * elements, not two of the eight standard schools) also isn't modeled.
 */
export interface WizardSchool extends RefEntity {
  tag: WizardSchoolTag | ElementalSchoolTag;
  /** Granted powers by level, resolved from `links.supplements`. */
  features: ClassFeatureGrant[];
}

/** An entry from the `class-abilities` pack (e.g. Rage, Bravery). */
export interface ClassFeature extends RefEntity {
  tag?: string;
  /** "classFeat" | "talent" | ... */
  subType?: string;
  /** "ex" | "su" | "sp" — supernatural/extraordinary/spell-like. */
  abilityType?: string;
  /**
   * Limited-use resource pool, e.g. Rage rounds/day. `source`, when present
   * INSTEAD of `maxFormula` (e.g. Channel Positive Energy's `source:
   * "layOnHands"`, Wholeness of Body's `source: "kiPool"`), means this
   * feature has no independent daily cap of its own — using it spends uses
   * from another granted feature's pool (matched by that feature's `tag`).
   * Not resolved into a numeric max here (that would double-count the shared
   * pool); the engine surfaces such a feature's `actions` as an addendum on
   * the referenced pool's detail line instead (see `deriveResourcePools`).
   */
  uses?: { maxFormula?: string; per?: string; source?: string };
  changes: Change[];
  /** UUIDs of buffs this feature can activate (from `links.supplements`). */
  grantsBuffs: string[];
  /**
   * Structured attack/damage/save/heal actions from the feature's
   * `system.actions` block (e.g. Acid Dart's ranged touch acid damage,
   * Stunning Fist's Fortitude DC). Present on a minority of the sliced
   * features (~39 of 254 as of schema v8) — most class features (Rage,
   * Bravery, ...) carry no action data upstream, and `undefined`/absent here
   * means exactly that, not a missing extraction. When multiple actions
   * exist (e.g. Channel Energy's heal-living/harm-undead/heal-undead/
   * harm-living quartet), they're kept in source order; only the first
   * damage part of each action is captured (the vendored slice never needs
   * more than one). Used by the engine to derive a resource-pool `detail`
   * summary (see `deriveResourcePools` in `@pf1/engine`).
   */
  actions?: FeatureAction[];
}

/**
 * One action entry off a class feature's `system.actions` block — lean by
 * design (just enough to render an in-play summary line, not a full replica
 * of Foundry's action schema; contrast `SpellAction`, which keeps more shape
 * for the builder's spell detail view).
 */
export interface FeatureAction {
  /** The action's own label, e.g. "Use", "Heal living" — rarely shown verbatim. */
  name?: string;
  /** Foundry action-type code, e.g. "rsak" (ranged spell attack), "heal", "save". */
  actionType?: string;
  /** First damage part's formula + damage types (e.g. `["acid"]`, `["positive"]`). */
  damage?: { formula: string; types: string[] };
  /** Saving throw, when the action calls for one. */
  save?: { type: string; dcFormula?: string };
  /** Activation type, e.g. "standard", "swift", "nonaction". */
  activation?: string;
  /** Whether this is a touch attack (ranged or melee). */
  touch?: boolean;
  /** Display-only range string, e.g. "30 ft", "touch" — not parsed further. */
  range?: string;
}

/* ------------------------------------------------------------------- feats -- */

export interface Feat extends RefEntity {
  /** "feat" | "classFeat" | ... */
  subType?: string;
  /** Free-form tags, e.g. ["Combat", "Combat Trick"]. */
  tags: string[];
  prerequisites: FeatPrerequisites;
  /**
   * Limited-use resource, mirroring `ClassFeature.uses` (see its doc
   * comment) — e.g. Combat Reflexes' `1 + max(0, @abilities.dex.mod)`
   * AoOs/round, Alignment Channel's `3 + @abilities.cha.mod` uses/day.
   * 12 feats in the current vendored slice carry this (schema v9). No
   * `source` field here (unlike `ClassFeature.uses`) — no vendored feat
   * currently draws from another feature's pool the way Channel Positive
   * Energy draws from Lay on Hands.
   */
  uses?: { maxFormula?: string; per?: string };
  /**
   * Directly-authored typed modifiers (homebrew only — see
   * `apps/web/src/model/homebrew.ts`). Every VENDORED feat's mechanical
   * effect instead comes from the hand-curated `FEAT_EFFECTS`/
   * `FEAT_EFFECTS_EXTRACTED` tables in `@pf1/engine` keyed by name-slug
   * (clean-room discipline: Foundry's own per-feat script logic is never
   * ported), so the data pipeline never emits this field. A homebrew feat
   * has no name-slug table entry to resolve, so it needs its effect encoded
   * directly on the entity, the same way `Race.changes`/`Item.changes`
   * already work. `collectModifiers` applies these unconditionally
   * alongside (never instead of) any table-resolved effect.
   */
  changes?: Change[];
}

/* ------------------------------------------------------------------ traits -- */

/**
 * A PF1 character trait, vendored from the pf1-content community module's
 * `pf-traits` pack (issue #74 Phase 1) — same per-entity YAML shape as
 * `Feat`, normalized by the same `readPack`/transform machinery. This is the
 * FULL published catalog (~2,000 entries); it exists alongside, not instead
 * of, the engine's 28-entry hand-authored `TRAITS` table (issue #23) — see
 * `@pf1/engine` `traits.ts`'s `mergedTraits`/`resolveTraitDef` for how the two
 * are reconciled (hand-authored wins on a name collision; every other
 * vendored entry is pickable under its own Foundry id).
 */
export interface Trait extends RefEntity {
  /** Foundry's raw category tag, e.g. "combat", "drawback", "region". Title-Case it for display (see `TraitCategory`'s doc comment). */
  traitType: string;
  tags: string[];
  /** Typed modifiers — empty for purely situational/prose traits. */
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Limited-use resource, same shape as `Feat.uses` — e.g. a once-per-day
   * faction trait like "A Sure Thing". ~290 of the vendored 1,998 carry this.
   */
  uses?: { maxFormula?: string; per?: string };
}

/**
 * Feat prerequisites are FREE TEXT in the source. We parse what we reliably can
 * into structured form and retain everything as `prereqText` for the unparsed
 * remainder / soft validation. Do not assume completeness.
 */
export interface FeatPrerequisites {
  /** Ability minimums, e.g. { ability: "str", min: 13 }. */
  abilities: { ability: AbilityId; min: number }[];
  /** Minimum base attack bonus, e.g. 1 for "base attack bonus +1". */
  bab?: number;
  /** Minimum caster level, e.g. 7 for "caster level 7th". */
  casterLevel?: number;
  /** Required feats, extracted from embedded `@UUID[...]{Name}` references. */
  feats: FeatRef[];
  /** Skill-rank requirements parsed from prose (best-effort). */
  skills: { skill: SkillId | null; ranks: number; raw: string }[];
  /** The full prerequisite text, verbatim (HTML stripped). */
  prereqText?: string;
}

export interface FeatRef {
  id: string;
  name: string;
  uuid: string;
}

/* ------------------------------------------------------------------ spells -- */

export interface Spell extends RefEntity {
  /** Default/nominal spell level; per-class levels live in `learnedAt`. */
  level: number;
  /** School abbreviation, e.g. "evo". */
  school?: string;
  descriptors: string[];
  /** Whether spell resistance applies to this spell. */
  sr?: boolean;
  components: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    focus?: boolean;
    divineFocus?: boolean;
  };
  /**
   * Per-context spell level. `class` maps a class tag → the level at which that
   * class learns the spell; inverting this yields per-class spell lists.
   */
  learnedAt: {
    class: Record<string, number>;
    domain?: Record<string, number>;
    bloodline?: Record<string, number>;
    subdomain?: Record<string, number>;
  };
  actions: SpellAction[];
  /**
   * `@cl`-keyed formula for the number of projectiles a multi-projectile spell
   * fires (Magic Missile's missiles, Scorching Ray's rays) — the count scales
   * with caster level in the spell's prose, not in `damage.parts[].formula`, so
   * it can't be derived from vendored data. Hand-authored by name in
   * `data-pipeline`'s `SPELL_PROJECTILE_COUNTS` supplement and applied in
   * `normalize.ts`; absent for the ~all spells whose effect count is fixed.
   */
  projectileCount?: string;
}

export interface SpellAction {
  id: string;
  name?: string;
  actionType?: string;
  save?: { type?: string; description?: string };
  range?: { units?: string; value?: string };
  area?: string;
  duration?: { units?: string; value?: string };
  damage?: { parts: { formula: string; types: string[] }[] };
  /**
   * Casting time — Foundry action-economy code (e.g. "standard", "swift",
   * "round", "minute", "hour", "full", "immediate", "free") plus an optional
   * multiplier for the unit types that support one ("round" -> "3 rounds",
   * "minute" -> "10 minutes"). `cost` absent means 1. See
   * `apps/web/src/model/spellStats.ts`'s `formatCastingTime` for the
   * player-facing formatter.
   */
  activation?: { type?: string; cost?: number };
}

/* ------------------------------------------------------------------- buffs -- */

export interface Buff extends RefEntity {
  /** "spell" | "temp" | "perm" | "item" | ... */
  subType?: string;
  changes: Change[];
  contextNotes: ContextNote[];
  duration?: { end?: string; units?: string; value?: string };
  level?: number;
}

/* ------------------------------------------------------------------- items -- */

export interface Item extends RefEntity {
  /** "wondrous" | "magic" | "weapon" | ... */
  subType?: string;
  /** Equipment slot, e.g. "ring", "head". */
  slot?: string;
  price?: number;
  /** Total weight in pounds, where tracked (captured for #16 encumbrance). */
  weight?: number;
  /** Caster level of the item, where applicable. */
  cl?: number;
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Limited-use resource, e.g. a staff's charges or a poison's single use.
   * Foundry also tracks a live `value` (current charges), but that's
   * per-instance session state, not reference data — the character-side
   * `ItemInstance` is where a concrete item's current charges would live.
   */
  uses?: { maxFormula?: string; per?: string };
  aura?: { school?: string };
  /**
   * What's inside a container item — the class kits ("Kit, Wizard's") and a
   * handful of pre-packed bundles (Mess Kit, Grooming Kit). Absent for the
   * ~97% of items that aren't containers.
   *
   * Contents are a flat, one-level list: a kit that packs another container
   * keeps that container as a single entry and does *not* recurse into it (a
   * Wizard's Kit yields one "Mess Kit" row, not six pieces of cutlery). The
   * doc-side `build.gear` is a flat `ItemInstance[]` with no nesting to
   * represent the tree anyway, and a player thinks of a mess kit as one thing
   * they're carrying.
   */
  contents?: ItemContent[];
}

/**
 * One entry in a container item's `contents`. Quantities and prices are the
 * container's own snapshot of the entry (a Wizard's Kit packs 10 torches at
 * its own listed price), which is why they're captured here rather than being
 * read back off the referenced item.
 */
export interface ItemContent {
  /** Display name, always present (the fallback when `itemId` is absent). */
  name: string;
  /**
   * Reference into `RefData.items`. Absent when the entry resolves to a
   * different pack — the Vampire Slayer's Kit's Wooden Stake is a weapon, and
   * `RefData.items` can't represent it — in which case `weight`/`price` below
   * carry the snapshot instead and consumers treat it as mundane gear.
   */
  itemId?: string;
  /** How many the container packs. Absent means 1. */
  quantity?: number;
  /**
   * Unit weight in pounds / unit price in gp, snapshotted from the container's
   * own copy of the entry. Only emitted when `itemId` is absent: a linked entry
   * has no need of them, since `ItemInstance` already falls back to
   * `RefData.items[itemId]` for both.
   */
  weight?: number;
  price?: number;
}

/* -------------------------------------------------------- armor & shields -- */

/**
 * A mundane base armor or shield from the `armors-and-shields` pack. Magic gear
 * (Frost Brand etc.) is excluded; the enhancement bonus is handled separately
 * as a user-set field on the character's weapon, and named magical armors live
 * in `RefData.items` already (when they carry `changes`). The engine reads
 * physical stats off the doc's `WornArmor`; the schema `armorId` on
 * `ItemInstance` is purely a display + re-sync pointer back to this entry.
 */
export interface ArmorRef extends RefEntity {
  /** "armor" (body slot) | "shield" (off-hand). */
  slot: "armor" | "shield";
  /** Base armor/shield AC bonus (e.g. 9 for Full Plate, 1 for a Buckler). */
  ac: number;
  /** Maximum Dexterity bonus the armor permits (omit for no cap). */
  maxDex?: number;
  /** Armor check penalty ∗as a positive magnitude∗ (e.g. 6 for Full Plate). */
  acp?: number;
  /**
   * Armor weight class for `@armor.type` formulas: 1 light, 2 medium, 3 heavy.
   * Omitted / 0 for shields (identified via `slot`; engine derives `armor.type`
   * from body armor only).
   */
  weightClass?: 0 | 1 | 2 | 3;
  /** Canonical base type label(s), e.g. ["Full Plate"]. */
  baseTypes?: string[];
  /** Foundry proficiency tag, e.g. "heavyArmor" / "lightShield" / "towerShield". */
  proficiency?: string;
  price?: number;
  /** Total weight in pounds. */
  weight?: number;
  /**
   * Arcane spell failure chance, as a percentage magnitude (e.g. 35 for Full
   * Plate, 5 for a Buckler) — Foundry's `system.spellFailure` field. Shields
   * carry this too (a shield's ASF stacks with worn body armor's). Omitted
   * means 0% (issue #8).
   */
  asf?: number;
}

/* ---------------------------------------------------------------- weapons -- */

/**
 * A mundane base weapon from the `weapons-and-ammo` pack (simple / martial /
 * exotic). Magic + ammo + siege subtypes are excluded; named magical weapons
 * (Frost Brand) live in `RefData.items` already (when they carry `changes`).
 * The engine computes per-weapon attack and damage from the doc's
 * `WeaponInstance`; the schema `weaponId` is purely a display + re-sync pointer
 * back to this entry.
 */
export interface WeaponRef extends RefEntity {
  /** Damage dice for display, e.g. "1d8" (parsed from `sizeRoll(N,F,…)` / `NdM`). */
  damageDice?: string;
  /** Lower bound of the critical threat range (default 20). */
  critRange?: number;
  /** Critical hit multiplier (default 2). */
  critMult?: number;
  /**
   * Per-weapon type slug the engine routes Weapon Focus / Specialization
   * bonuses through (e.g. "longsword"); derived from `baseTypes[0]`.
   */
  group?: string;
  /** Melee or ranged; which attack modifier target applies. */
  category: "melee" | "ranged";
  /** Ability used for the attack roll: "str" (mwak) or "dex" (rwak). */
  attackAbility: "str" | "dex";
  /** Ability added to damage: "str" when the source declares it, else "none". */
  damageAbility?: "str" | "none";
  /**
   * Multiplier applied to the damage ability modifier (1 one-handed / ranged,
   * 1.5 two-handed, 0.5 off-hand).
   */
  damageMultiplier?: number;
  /** Foundry proficiency tag: "simple" | "martial" | "exotic". */
  proficiency: string;
  /** Foundry weapon-group tags, e.g. ["bladesHeavy"] (for Weapon Training). */
  weaponGroups?: string[];
  /** Foundry weapon subtype: "1h" | "2h" | "ranged" (drives damageMultiplier). */
  weaponSubtype?: string;
  /** Canonical base type label(s), e.g. ["Longsword"]. */
  baseTypes?: string[];
  price?: number;
  /** Total weight in pounds. */
  weight?: number;
}

/* -------------------------------------------------------------- archetypes -- */

/**
 * A PF1 class archetype (e.g. "Two-Handed Fighter"). Unlike the rest of RefData,
 * archetypes are NOT sourced from the Foundry pf1 system — it ships no archetype
 * data at all (confirmed: no `subType: archetype`, no parent-class field,
 * anywhere in the pinned packs). Sourced instead from a third-party CSV dataset
 * (see `ARCHETYPE_REPO`/`ARCHETYPE_SHA` in data-pipeline config); `id`/`uuid`
 * are therefore synthetic slugs, not real Foundry identifiers.
 */
export interface Archetype extends RefEntity {
  /** The base class this archetype modifies, e.g. "fighter". */
  classTag: string;
  /** Attribution for the source dataset (module name; content is OGL/Paizo CUP via AON). */
  contributorModule: string;
}

/**
 * A single archetype class feature — something an archetype adds, or that
 * replaces a base-class feature at the same level.
 *
 * No `changes` (mechanical effects) in v1: the dataset declares which features
 * exist and at what level, not how to compute them (its `Description` prose has
 * at least one verified copy-paste error, so it isn't trustworthy as a mechanics
 * source either). Any future numeric
 * effect must be hand-authored from the published rules, same as
 * `feat-effects.ts`/`tables.ts`.
 */
export interface ArchetypeFeature extends RefEntity {
  /** Parent `Archetype.id`. */
  archetypeId: string;
  /** Inherited from the parent archetype, for convenient filtering. */
  classTag: string;
  level: number;
  /**
   * The base-class `ClassFeatureGrant.uuid` (from `Class.features`) this
   * feature replaces, when the (classTag, level) pairing is unambiguous (a
   * single base feature at that level, not a multi-occupant slot like Bonus
   * Feats). `undefined` means the UI shows this feature's prose as a soft
   * warning instead of a paired swap.
   */
  pairedBaseFeatureUuid?: string;
}

/* ---------------------------------------------------------- rage powers -- */

/**
 * A published barbarian rage power (issue #74 Phase 3a: the "catalog from
 * data, mechanics as overlay" pattern later subsystems — hexes, arcana,
 * talents, exploits, wild talents — replicate). Unlike the rest of RefData,
 * rage powers are NOT sourced from the Foundry pf1 system — its Barbarian /
 * Barbarian Unchained class defs only link a generic "Rage Powers" stub
 * `ClassFeature`, no per-power breakdown. Sourced instead from the "Pf Data
 * 1e" third-party dataset (see `PFDATA_REPO`/`PFDATA_SHA` in
 * data-pipeline); `id` is that dataset's own slug key, `uuid` a synthetic
 * pointer (same posture as `Archetype`/`ArchetypeFeature`).
 *
 * This is the FULL published catalog (~244 entries after the source's own
 * redirect/disambiguation aliases are filtered out) with prose only — no
 * `changes` (mechanical effects). It exists to make the rage-power PICKER
 * browsable against the complete catalog; live mechanics for the
 * hand-verified subset remain in `@pf1/engine` `rage-powers.ts`'s
 * hand-authored `RAGE_POWERS` table, which is authoritative on any name
 * collision with an entry here (see that file's `mergedRagePowerCatalog`).
 */
export interface RagePower extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Ex)", "(Su)", "(Sp)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Totem", "Blood", "Stance", "Elemental" — absent for most (ungrouped) entries. */
  category?: string;
  /**
   * A small integer (observed range 1-3) the source attaches to some
   * entries — empirically NOT a barbarian-level requirement (e.g. the
   * Beast Totem chain has `lesser_beast_totem` with no `level` at all,
   * `beast_totem` at `1`, `greater_beast_totem` at `2`, while
   * `terrifying_howl` — an actual 8th-level-minimum rage power per the
   * published rules — carries `level: 1`). Reads more like a within-chain
   * tier depth than a character-level gate, but the source doesn't document
   * the field, so this is carried through UNINTERPRETED rather than
   * asserted as either. Do NOT use this as a level-gate minimum — every
   * actual "requires Nth level" prerequisite the published rules state is
   * already present as prose inside `description` (do not attempt to parse
   * it out structurally — see the data-pipeline transform's doc comment).
   */
  level?: number;
}

/* --------------------------------------------------------- witch hexes -- */

/**
 * A published witch hex (issue #74 Phase 3b, same "catalog from data,
 * mechanics as overlay" pattern `RagePower` established). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_hexes.json` (~105 raw entries;
 * see `PFDATA_REPO`/`PFDATA_SHA` in data-pipeline) rather than the Foundry
 * pf1 system — the Witch class def only links generic "Hex"/"Major Hex"/
 * "Grand Hex" stub `ClassFeature`s, no per-hex breakdown.
 *
 * The FULL published catalog (~104 entries after dropping the source's
 * `not_found` sentinel) with prose only — no `changes`. Live mechanics for
 * the hand-verified subset remain in `@pf1/engine` `witch-hexes.ts`'s
 * `WITCH_HEXES` table, authoritative on any name collision with an entry
 * here (see that file's `mergedWitchHexCatalog`).
 */
export interface WitchHex extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
  /**
   * Hex tier, taken directly from the source's own `category` field
   * (`"hex" | "majorhex" | "grandhex"`, renamed here to this project's
   * `"hex" | "major" | "grand"` convention — matching `@pf1/engine`
   * `WitchHexTier`). Empirically validated against all 27 hand-authored
   * entries plus the published tier thresholds (10th-level Major Hexes,
   * 18th-level Grand Hexes): every vendored entry's `category` matched the
   * expected tier with zero exceptions. The source ALSO carries a `level`
   * field on a handful of entries, but it's always `1` regardless of tier
   * (never a real level gate) — deliberately NOT carried onto this type; see
   * `RagePower.level`'s doc comment for the identical trap in that sibling
   * catalog.
   */
  tier: "hex" | "major" | "grand";
}

/* -------------------------------------------------- general shaman hexes -- */

/**
 * A published GENERAL shaman hex (issue #74 Phase 3b) — the Advanced Class
 * Guide's own "Shaman Hexes" table, available to any shaman regardless of
 * spirit. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_shaman_hexes.json` (18 raw entries, 16 after dropping
 * the source's `not_found` sentinel AND its `witch_hex` entry — the latter
 * isn't a hex at all, just the ACG rule text stating a shaman may instead
 * pick any non-major/non-grand WITCH hex, treating shaman level as witch
 * level; see the data-pipeline transform's doc comment).
 *
 * Distinct from `@pf1/engine` `shaman-spirits.ts`'s `ShamanSpiritHex` —
 * those are the 5 hexes each of the 8 spirits individually grants (hand-
 * authored, not vendored anywhere in this source), while this catalog is the
 * spirit-agnostic general list. The two are presented as separate sections
 * in `ShamanHexPicker` but share the same `doc.build.shamanHexes` id array.
 * No hand-authored mechanical table exists for this catalog (every entry
 * here is prose-only, browsable via `@pf1/engine` `shaman-hexes.ts`'s
 * `mergedShamanHexCatalog`) — unlike `RagePower`/`WitchHex`, there is no
 * "authoritative hand-verified subset" to overlay.
 */
export interface ShamanHex extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
}

/* -------------------------------------------------------- magus arcana -- */

/**
 * A published magus arcanum (issue #74 Phase 3b, same pattern as
 * `RagePower`/`WitchHex`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_magus_arcana.json` (66 raw entries, 64 after dropping
 * the source's `not_found` sentinel and one `redirect` alias — Greater
 * Arcane Redoubt -> Arcane Redoubt, Greater) rather than the Foundry pf1
 * system — the Magus class def only links a generic "Magus Arcana" stub
 * `ClassFeature`, no per-arcana breakdown.
 *
 * Unlike `RagePower`/`WitchHex`, this source has NO structured `level` or
 * `category` field at all — every stated level minimum (base 3rd, or a
 * higher stated minimum for a handful of arcana) is prose-only, embedded in
 * `description`'s own text (do not attempt to parse it out structurally).
 * `nameSuffix` is similarly not a top-level source field here — every
 * entry's description instead OPENS with a `**Name (Ex/Su/Sp):**` bold
 * header restating the name; the data-pipeline transform parses that header
 * out into `nameSuffix` and strips it from the rendered `description` (which
 * would otherwise duplicate the name already shown by the picker).
 *
 * The FULL published catalog with prose only — no `changes`. Live mechanics
 * for the hand-verified subset remain in `@pf1/engine` `magus-arcana.ts`'s
 * `MAGUS_ARCANA` table, authoritative on any name collision with an entry
 * here (see that file's `mergedMagusArcanaCatalog`).
 */
export interface MagusArcana extends RefEntity {
  /** Ability-type suffix, parsed from the description's own leading `**Name (Ex/Su/Sp):**` header — see the interface doc comment. */
  nameSuffix?: string;
}

export type { SourceRef };

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
  spells: Record<string, Spell>;
  buffs: Record<string, Buff>;
  items: Record<string, Item>;
  /** Per-class spell lists, keyed by class tag → spell level → spell ids. */
  spellLists: Record<string, SpellList>;
  /** Mundane base armor/shields (the `armors-and-shields` pack, magic excluded). */
  armors: Record<string, ArmorRef>;
  /** Mundane base weapons (the `weapons-and-ammo` pack, magic + ammo excluded). */
  weapons: Record<string, WeaponRef>;
  /** Archetypes for the sliced classes (third-party dataset; see Archetype). */
  archetypes: Record<string, Archetype>;
  /** Archetype class features; each points back to its parent via `archetypeId`. */
  archetypeFeatures: Record<string, ArchetypeFeature>;
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

/** An entry from the `class-abilities` pack (e.g. Rage, Bravery). */
export interface ClassFeature extends RefEntity {
  tag?: string;
  /** "classFeat" | "talent" | ... */
  subType?: string;
  /** "ex" | "su" | "sp" — supernatural/extraordinary/spell-like. */
  abilityType?: string;
  /** Limited-use resource pool, e.g. Rage rounds/day. */
  uses?: { maxFormula?: string; per?: string };
  changes: Change[];
  /** UUIDs of buffs this feature can activate (from `links.supplements`). */
  grantsBuffs: string[];
}

/* ------------------------------------------------------------------- feats -- */

export interface Feat extends RefEntity {
  /** "feat" | "classFeat" | ... */
  subType?: string;
  /** Free-form tags, e.g. ["Combat", "Combat Trick"]. */
  tags: string[];
  prerequisites: FeatPrerequisites;
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
  /** Caster level of the item, where applicable. */
  cl?: number;
  changes: Change[];
  contextNotes: ContextNote[];
  aura?: { school?: string };
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
 * source either — see IMPLEMENTATION_PLAN.md Stage 11). Any future numeric
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

export type { SourceRef };

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

export type { SourceRef };

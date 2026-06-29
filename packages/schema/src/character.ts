import type { AbilityId, SkillId } from "./primitives.js";

/**
 * The character document is the single source of truth: it holds build choices
 * and live session state, but NEVER derived values. Fleshed out in Stage 2 to
 * the extent the rules engine needs as input; the builder (Stage 3) will add the
 * remaining choice/option detail. Mirrors DESIGN.md §3.1.
 */
export interface CharacterDoc {
  schemaVersion: number;
  id: string;
  /** sync (DESIGN §2.1): whose document this is. Set in Stage 5. */
  ownerId: string;
  /** sync: optimistic-concurrency counter, bumped on each save. */
  version: number;
  /** sync: ISO timestamp of last change. */
  updatedAt: string;
  identity: {
    name: string;
    /** Race id (key into RefData.races). */
    race: string;
    /** Class tag + level pairs (multiclass-capable). */
    classes: { tag: string; level: number }[];
    alignment?: string;
    deity?: string;
    /**
     * Favored class tag (for the favored-class bonus). The per-level HP/skill
     * choices are recorded in `build.favoredClassBonus`; until the builder
     * populates that, the engine applies no FCB (see engine HP assumptions).
     */
    favoredClass?: string;
  };
  /** Base ability scores only — no racial/item adjustments baked in. */
  abilities: Record<AbilityId, number>;
  build: {
    /** Feat ids chosen (keys into RefData.feats). */
    feats: string[];
    skillRanks: Record<SkillId, number>;
    /** Archetypes, bonus-feat picks, etc. — typed in Stage 3. */
    classFeatureChoices: unknown[];
    spells: { known: string[]; prepared: unknown[] };
    gear: ItemInstance[];
    /**
     * Per-character-level favored-class bonus choice. `"hp"` adds +1 HP for that
     * level, `"skill"` adds +1 skill rank, `"other"` is a race/archetype option
     * with no flat numeric effect. Omitted entirely until the builder collects it.
     */
    favoredClassBonus?: ("hp" | "skill" | "other")[];
  };
  live: {
    hp: { current: number; temp: number; nonlethal: number };
    conditions: string[];
    /** Active buffs with remaining duration + the changes they apply (Stage 4). */
    activeBuffs: unknown[];
    /** Resource pools: spell slots, ki, rounds/day, charges. */
    resources: Record<string, { used: number; max: number }>;
  };
}

/**
 * A piece of gear on the character. Magic/typed-modifier items reference
 * `RefData.items` by id (their `changes` feed the stacking engine when equipped).
 *
 * The vendored data slice does NOT include the base `armors-and-shields` pack, so
 * worn body-armor/shield AC stats are recorded directly on the instance via
 * `armor`. (Stage 1 only vendored the magic-item subset that carries `changes`.)
 */
export interface ItemInstance {
  /** Reference into RefData.items. Optional for purely mundane gear. */
  itemId?: string;
  /** Only equipped items contribute their changes to the derived sheet. */
  equipped: boolean;
  /** Worn armor/shield physical stats (not present in the vendored slice). */
  armor?: WornArmor;
  /** Display label fallback when `itemId` is absent. */
  name?: string;
}

/** Physical stats of a worn piece of body armor or a shield. */
export interface WornArmor {
  slot: "armor" | "shield";
  /** Base armor/shield AC bonus. */
  ac: number;
  /** Maximum Dexterity bonus the armor permits (omit for no cap). */
  maxDex?: number;
  /** Armor check penalty (a negative number, or 0). */
  acp?: number;
  /** Armor weight class for `@armor.type` formulas: 0 none,1 light,2 med,3 heavy. */
  type?: number;
}

/* ----------------------------------------------------------- derived sheet -- */

/**
 * The output of `compute(doc, refData)` — every displayed number. Derived values
 * are never persisted; they are recomputed from the document on demand.
 */
export interface DerivedSheet {
  schemaVersion: number;
  /** Total character level (sum of class levels). */
  level: number;
  abilities: Record<AbilityId, AbilityScore>;
  bab: number;
  saves: { fort: ResolvedStat; ref: ResolvedStat; will: ResolvedStat };
  ac: ArmorClass;
  cmb: number;
  cmd: number;
  initiative: ResolvedStat;
  /** Base melee/ranged attack bonus (single-attack, before weapon specifics). */
  attack: { melee: ResolvedStat; ranged: ResolvedStat };
  hp: HitPoints;
  /** Movement speeds in feet, keyed by mode ("land", "fly", ...). */
  speeds: Record<string, number>;
  skills: Record<SkillId, DerivedSkill>;
}

export interface AbilityScore {
  /** Score from the document, before any modifiers. */
  base: number;
  /** Final score after racial/item/etc. modifiers. */
  total: number;
  /** Ability modifier: floor((total - 10) / 2). */
  mod: number;
  /** Per-source breakdown of the modifiers applied to the base score. */
  components: ModifierComponent[];
}

/** One contribution to a stacked value, with provenance for the UI. */
export interface ModifierComponent {
  /** Human-readable source label, e.g. "Belt of Physical Might +4". */
  source: string;
  /** Source entity id, where applicable. */
  sourceId?: string;
  /** Stacking category (e.g. "enh", "morale", "dodge", "untyped"). */
  type: string;
  value: number;
  /** False when overridden by a higher same-type bonus (struck through in UI). */
  applied: boolean;
}

/** A scalar derived value plus the modifier breakdown that produced it. */
export interface ResolvedStat {
  total: number;
  components: ModifierComponent[];
}

export interface ArmorClass {
  normal: number;
  touch: number;
  flatFooted: number;
  /** All AC contributions with provenance + applicability flags. */
  components: AcComponent[];
}

export interface AcComponent extends ModifierComponent {
  /** Which AC bucket this belongs to (controls touch/flat-footed inclusion). */
  category:
    | "base"
    | "armor"
    | "shield"
    | "natural"
    | "dex"
    | "size"
    | "dodge"
    | "deflection"
    | "generic";
}

export interface HitPoints {
  max: number;
  /** From the document's live state. */
  current: number;
  temp: number;
  nonlethal: number;
}

export interface DerivedSkill {
  id: SkillId;
  ability: AbilityId;
  ranks: number;
  abilityMod: number;
  /** +3 when this is a class skill with at least one rank. */
  classSkillBonus: number;
  /** Armor check penalty applied (0 unless a str/dex skill with worn armor). */
  acp: number;
  /** Net of typed modifiers targeting this skill. */
  miscMod: number;
  total: number;
  classSkill: boolean;
  /** Provenance for the misc modifiers. */
  components: ModifierComponent[];
}

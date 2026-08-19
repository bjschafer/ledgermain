/**
 * Casting-economy adjustment tables — hand-authored, clean-room content wiring
 * slot-count and spells-known-count edits onto the web app's casting model
 * (`apps/web/src/model/spellcasting.ts` folds them into `spellSlotsByLevel` /
 * `spellsKnownLimitsByLevel` / `preparedCapacityByLevel`).
 *
 * Charter — what belongs here and what never does:
 *
 * - IN: flat, unconditional count edits to a caster class's slots per day,
 *   spells known, or (hybrid casters) spells-prepared capacity: "+1 slot of
 *   each spell level", "one fewer spell known per spell level", "two
 *   additional 1st-level slots". Signed deltas; per-level or every-level.
 * - OUT (established residue, keep as prose notes in the classification
 *   stores): spend-a-slot activated abilities, whole spell-list swaps,
 *   casting-ability swaps, preparation-procedure rewrites, and any edit
 *   whose target class or spell level is a player CHOICE with no stored
 *   pick (Expanded Arcana-shaped feats).
 *
 * Adjustments EDIT levels the class progression already grants — they never
 * unlock a spell level the table hasn't reached (a "+1 2nd-level slot" grant
 * is inert until the class can cast 2nd-level spells at all).
 */

/** One slot/known/prepared count edit granted by a feature. */
export interface CastingAdjustmentDef {
  /** Stable id fragment, unique within the source's def list. */
  slug: string;
  /**
   * Which count this edits: `slots` = slots per day (a prepared caster's
   * prepare-into slots included), `known` = a spontaneous caster's
   * spells-known limits, `prepared` = a hybrid caster's readied-spells
   * capacity (arcanist).
   */
  kind: "slots" | "known" | "prepared";
  /**
   * Spell levels edited: an explicit list, or `"each"` for every accessible
   * spell level 1–9 (cantrips only ever via an explicit `0` — "one per spell
   * level" wording in the sources consistently means leveled spells).
   */
  spellLevels: readonly number[] | "each";
  /** Signed count change; the web fold clamps each level's result at 0. */
  delta: number;
  /**
   * The caster class whose economy this edits. Class-feature and
   * archetype-feature sources default to the granting class; feat, character
   * -trait, and racial-trait sources MUST set it (a def without it on those
   * sources is skipped — choice-of-class grants are residue, not content).
   */
  classTag?: string;
  /** Minimum granting-class level (class-feature/archetype sources) or character level (feat/trait sources). */
  minLevel?: number;
  /** Shown alongside the adjustment in slot detail UI when present. */
  note?: string;
}

/** One fixed spell a feature adds to the class's known list. */
export interface BonusKnownSpellDef {
  /** Exact vendored spell name (`RefData.spells` name, case-insensitive). */
  spell: string;
  /** Granting-class level at which the spell is gained. */
  atLevel: number;
  /**
   * Explicit "known as an Nth-level spell" override. Omitted, the spell's
   * own level on the granting class's list applies (nominal level when the
   * spell is off-list).
   */
  spellLevel?: number;
}

/**
 * Fixed named-spell known grants (oracle archetype Bonus Spell schedules,
 * "gains X as a 2nd-level spell known" riders), keyed by archetype-feature
 * id. Player-CHOSEN additions ("add any spell from the druid list") have no
 * stored pick and stay residue — only fixed schedules belong here.
 */
export interface BonusKnownSpellsDef {
  spells: readonly BonusKnownSpellDef[];
  /**
   * Oracle archetype Bonus Spell rows replace the MYSTERY's bonus spells
   * gained at these oracle class levels ("These bonus spells replace the
   * oracle's mystery bonus spells from these levels"); `"all"` replaces the
   * whole mystery schedule. The web's oracle known-merge filters
   * `mysterySpellsKnown` output accordingly.
   */
  replacesMysteryBonusSpellLevels?: readonly number[] | "all";
  note?: string;
}

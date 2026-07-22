/**
 * Shared primitive types used across reference data, character documents, and
 * derived sheets. These mirror the vocabulary used by the Foundry PF1 data
 * (ability/skill abbreviations, BAB/save tiers) so the data pipeline can map
 * 1:1 without a translation layer.
 */

/** Six ability scores, by their three-letter abbreviation. */
export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";

export const ABILITY_IDS: readonly AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

/**
 * Base-attack-bonus progression tier. PF1 has exactly three; the numeric table
 * per tier is fixed by the rules and lives in the engine (Stage 2), not here.
 */
export type BabTier = "high" | "med" | "low";

/**
 * Saving-throw progression tier. Base (20-level) classes use exactly two
 * ("high"/"good", "low"/"poor"), computed as `2 + floor(level/2)` and
 * `floor(level/3)` respectively (see `saveForLevels` in `@pf1/engine`
 * `tables.ts`).
 *
 * Prestige classes (10-level max) use DIFFERENT formulas for both their good
 * and poor saves — this isn't a simplification or a guess, it's directly
 * verified against the Core Rulebook's own tables (Eldritch Knight, Mystic
 * Theurge, Assassin all independently confirm both progressions below,
 * fetched from legacy.aonprd.com's raw HTML, not summarized):
 *
 * - `highPrestige` ("good" prestige save): `floor((level+1)/2)` — progresses
 *   1,1,2,2,3,3,4,4,5,5 across levels 1-10. No +2 at 1st level (unlike the
 *   base "high" tier's `2 + floor(level/2)`), which is how PF1 prevents a
 *   prestige class's good save from stacking an extra +2 on top of a
 *   multiclassed character's existing good save in the same ability.
 * - `lowPrestige` ("poor" prestige save): `floor((level+1)/3)` — progresses
 *   0,1,1,1,2,2,2,3,3,3 across levels 1-10. This is NOT the same as the base
 *   "low" tier's `floor(level/3)` (0,0,1,1,1,2,2,2,3,3) — the prestige poor
 *   progression reaches each new plateau one level earlier. (Verified: e.g.
 *   Eldritch Knight's Ref/Will and Mystic Theurge's Fort/Ref columns, and
 *   Assassin's Fort/Will columns, all match `lowPrestige` exactly; Wizard's
 *   Fort/Ref — a base-class poor save — matches base "low" exactly, ruling
 *   out a source-transcription error.)
 */
export type SaveTier = "high" | "low" | "highPrestige" | "lowPrestige";

/**
 * Skill identifiers are the Foundry abbreviations (e.g. "acr", "per", "kna").
 * Kept as a string for forward-compatibility with subskills (e.g. "crf.alchemy")
 * and homebrew; a closed union can be introduced later if needed.
 */
export type SkillId = string;

/** Creature size category abbreviations as used by the PF1 data. */
export type SizeId = "fine" | "dim" | "tiny" | "sm" | "med" | "lg" | "huge" | "grg" | "col";

/** A reference to a published source book + page(s). */
export interface SourceRef {
  id: string;
  pages?: string;
}

/**
 * A single typed modifier — the atom of the PF1 stacking engine. Foundry stores
 * these as `system.changes` on races, buffs, items, and class features.
 *
 * - `formula` is a Foundry roll-formula-dialect string (may reference `@data`
 *   paths and functions like `if`, `gte`, `min`); evaluated by the engine.
 * - `target` is what it modifies (e.g. "attack", "ac", "str", "skill.per",
 *   "bonusFeats").
 * - `type` is the stacking category (e.g. "untyped", "dodge", "morale",
 *   "enhancement", "racial", "deflection"). Same-type bonuses don't stack
 *   (highest wins); "dodge" and "untyped" always stack; penalties always stack.
 */
export interface Change {
  formula: string;
  target: string;
  type: string;
  /**
   * Foundry's change operator. Absent (or "add") means the formula's value is
   * added to the target like any other typed modifier. "set" means the
   * formula's *result* replaces the target's value outright rather than
   * adding to it (e.g. Slow halves speed via a set-change, not a penalty).
   * We deliberately do NOT carry Foundry's `priority` field — in the vendored
   * slice, every "set" change targets a speed/sense value, and the engine
   * resolves set-vs-set ordering itself (lowest value wins) rather than
   * relying on authored priority.
   */
  operator?: "add" | "set";
  /**
   * Buff gate (issue #75): when present, this Change applies ONLY while at
   * least one buff in `CharacterDoc.live.activeBuffs` matches — for a
   * hand-authored build choice whose bonus rides *someone else's* buff
   * rather than being unconditionally granted (the motivating case: a
   * barbarian rage power like Raging Climber only works "while raging",
   * where "raging" is the separately-toggled Rage buff, not the rage power
   * itself — see `@pf1/engine` `rage-powers.ts`). Absent (the default, and
   * the only value every other `Change` source in this codebase uses today)
   * means always-on and unconditional — fully backward compatible, no doc
   * migration needed.
   *
   * Matched by `ActiveBuff.buffId` (a `RefData.buffs` id) and/or
   * `ActiveBuff.effectTag` (a hand-authored toggle id) — **never** by
   * display name; name-based reference-data lookups have caused real
   * cross-branch bugs in this project (the Seeker/summoner-archetype
   * lesson), and a buff can be renamed/reworded upstream without this gate
   * silently breaking. A change is active if it matches ANY id in either
   * list (an OR across both lists and within each). Evaluated at
   * collect-time by `@pf1/engine` `collect.ts`'s `buffGateSatisfied`,
   * reading only `doc.live.activeBuffs` — `compute()` stays pure.
   */
  activeWhenBuff?: BuffGate;
}

/**
 * The match criteria for {@link Change.activeWhenBuff} — see that field's
 * doc comment for semantics. At least one of `buffIds`/`effectTags` should
 * be non-empty for the gate to ever be satisfiable; both may be set at once
 * (e.g. a gate that should fire off of either a vendored buff OR a
 * hand-authored toggle representing "morally the same" activated state).
 */
export interface BuffGate {
  /** `RefData.buffs` ids — matches `ActiveBuff.buffId`. */
  buffIds?: readonly string[];
  /** Hand-authored toggle ids — matches `ActiveBuff.effectTag`. */
  effectTags?: readonly string[];
}

/**
 * Free-text note attached to a target (e.g. "+2 vs Enchantment"). These are not
 * mechanically applied by the engine; they surface as reminders on the sheet.
 */
export interface ContextNote {
  target: string;
  text: string;
}

/**
 * A PF1 character-trait category. The engine's 28 hand-authored entries
 * (issue #23) use one of the traditional four ("Combat" | "Faith" | "Magic" |
 * "Social"); the vendored catalog (issue #74 Phase 1, `RefData.traits`) adds
 * many more — Foundry's `traitType` values Title-Cased ("Region", "Race",
 * "Campaign", "Religion", "Drawback", "Faction", "Equipment", "Mount",
 * "Cosmic", "Family", "Exemplar"). Kept as `string` (not a closed union) so
 * neither side needs to enumerate the other's values; the "two different
 * categories" reminder (`model/traits.ts` `traitsNeedWarning`) is a soft
 * warning that works over any string. Lives here (rather than beside the
 * engine's hand-authored `TRAITS` table) so `CharacterDoc.build.homebrew.traits`
 * — a schema-level field — can reference the same shape a homebrew trait must
 * conform to.
 */
export type TraitCategory = string;

/**
 * Shape shared by every entry in the engine's hand-authored `TRAITS` table
 * (`@pf1/engine` `traits.ts`, which re-exports this type), the vendored
 * catalog (`RefData.traits`, converted to this shape by the engine's
 * `mergedTraits`/`resolveTraitDef`), and user-authored entries in
 * `CharacterDoc.build.homebrew.traits` — all three flow through the same
 * lookup in `collect.ts`, so one definition covers all of them.
 */
export interface TraitDef {
  id: string;
  name: string;
  category: TraitCategory;
  /**
   * Short rules summary shown inline in the picker. Every hand-authored and
   * homebrew entry carries one; a vendored catalog entry doesn't (there's no
   * hand-curated one-liner for ~2,000 items) — the UI falls back to the
   * collapsible `description` for those (same posture as `FeatEntry`, which
   * never had a summary field at all).
   */
  summary?: string;
  /** Typed modifiers granted by the trait (empty when purely situational/prose). */
  changes: Change[];
  /** Non-mechanical reminders (situational scope, class-skill grants, etc.). */
  contextNotes?: ContextNote[];
  /** True when the trait has no flat modifier the static sheet applies. */
  displayOnly?: boolean;
  /** Full HTML description — vendored catalog entries only. */
  description?: string;
  sources?: SourceRef[];
  /** Free-form tags carried from the vendored catalog (e.g. faction names). */
  tags?: string[];
}

/** Base fields shared by every reference-data entity. */
export interface RefEntity {
  /** Foundry document id (the `_id` field / filename suffix). */
  id: string;
  name: string;
  /** Full Foundry UUID: `Compendium.pf1.<pack>.Item.<id>`. */
  uuid: string;
  /** HTML description text, retained verbatim from the source. */
  description?: string;
  sources?: SourceRef[];
}

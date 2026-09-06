/**
 * Shared plumbing for the collection subsystems in this directory: the
 * collected-modifier shape, the per-run context every subsystem receives, and
 * the two primitives they all reach for (formula evaluation into `out`, and
 * the buff-gate check).
 */

import type { ActiveBuff, Change, CharacterDoc, RefData } from "@pf1/schema";

import { tryEvaluateFormula, type RollData } from "../formula.js";
import type { TypedModifier } from "../stacking.js";

/** A {@link TypedModifier} tagged with what it targets. */
export interface CollectedModifier extends TypedModifier {
  target: string;
  /**
   * Foundry's change operator, carried through from {@link Change}. Absent
   * means additive (the default); "set" means the evaluated formula replaces
   * the target's value rather than adding to it. Only speed targets consume
   * "set" today (see compute.ts); other targets ignore it.
   */
  operator?: "add" | "set";
  /**
   * Save-category scope carried through from {@link Change}. When set, this
   * modifier is excluded from the save's headline total and contributes only
   * to those categories' conditional totals (see `compute.ts`'s `computeSave`).
   */
  saveCategories?: readonly string[];
  /**
   * Maneuver-category scope carried through from {@link Change}. When set,
   * this modifier is excluded from cmb/cmd's headline total and contributes
   * only to those categories' conditional totals (see `compute.ts`'s cmb/cmd
   * block). Only meaningful on `cmb`/`cmd`-target modifiers.
   */
  maneuverCategories?: readonly string[];
  /**
   * AC-category scope carried through from {@link Change}. When set, this
   * modifier is excluded from AC's headline totals (and from the CMD
   * auto-derivation that reads bare-`ac` modifiers) and contributes only to
   * those categories' conditional totals (see `compute.ts`'s `computeAc`).
   * Only meaningful on bare-`ac`-target modifiers.
   */
  acCategories?: readonly string[];
}

/**
 * Everything a subsystem collector needs. `out` is the shared accumulator each
 * one pushes into; the rest is read-only input.
 */
export interface CollectContext {
  doc: CharacterDoc;
  refData: RefData;
  rollData: RollData;
  out: CollectedModifier[];
  /**
   * Buffs the master actually carries. A buff flagged `excludeMaster` (a Share
   * Spells personal spell cast on a companion *instead of* the caster) applies
   * only to its shared creatures, so the master neither collects its modifiers
   * nor gates its own changes on it.
   */
  masterBuffs: readonly ActiveBuff[];
  /** {@link buffGateSatisfied} bound to {@link CollectContext.masterBuffs}. */
  gateOpen: (ch: Change) => boolean;
}

/** `@item.level` / `@cl` in a buff formula = the buff's caster/effect level. */
export function withBuffCasterLevel(
  buff: Pick<ActiveBuff, "casterLevel">,
  rollData: RollData,
): RollData {
  return buff.casterLevel === undefined
    ? rollData
    : { ...rollData, cl: buff.casterLevel, item: { level: buff.casterLevel } };
}

export function evalChange(
  formula: string,
  rollData: RollData,
  target: string,
  type: string,
  source: string,
  sourceId: string,
  out: CollectedModifier[],
  operator?: "add" | "set",
  saveCategories?: readonly string[],
  maneuverCategories?: readonly string[],
  acCategories?: readonly string[],
): void {
  let value: number | null;
  try {
    value = tryEvaluateFormula(formula, rollData);
  } catch {
    // A malformed change formula should not crash the whole sheet; skip it.
    return;
  }
  if (value === null || Number.isNaN(value)) return;
  // A category-scoped change contributing 0 (a level-tiered category that
  // hasn't unlocked yet) must not become a conditional line identical to the
  // headline total, so drop it here rather than filtering downstream.
  if (value === 0 && saveCategories !== undefined && saveCategories.length > 0) return;
  if (value === 0 && maneuverCategories !== undefined && maneuverCategories.length > 0) return;
  if (value === 0 && acCategories !== undefined && acCategories.length > 0) return;
  out.push({
    target,
    type: type || "untyped",
    value,
    source,
    sourceId,
    operator,
    saveCategories,
    maneuverCategories,
    acCategories,
  });
}

/**
 * Buff-gated changes: true when `ch` carries no `activeWhenBuff`
 * (unconditional — every change source that predates this mechanism resolves
 * here, unchanged) or when at least one currently active buff matches the gate
 * by `buffId` and/or `effectTag` — never by display name (see
 * `Change.activeWhenBuff`'s doc comment). A gate is satisfied by ANY match
 * across those two lists, plus EVERY `requiredEffectTags` match when that
 * conjunctive list is present.
 *
 * Gated-but-currently-inactive changes are simply OMITTED from the
 * collected list rather than pushed through with a forced
 * `applied: false` provenance flag. `stacking.ts`'s `resolveStack` computes
 * `applied` purely from same-type-bonus comparison (highest wins); bolting
 * on an externally-forced "inactive" entry would mean carrying a phantom
 * modifier through the whole pipeline (and through `resolveStack`'s
 * highest-wins logic, where it could wrongly suppress a genuinely-applied
 * same-type bonus) for a struck-through-in-the-UI distinction the tracker
 * doesn't currently render any differently from "this source contributed
 * nothing" — the cheaper, correct-by-construction choice.
 */
export function buffGateSatisfied(
  ch: Pick<Change, "activeWhenBuff">,
  activeBuffs: readonly ActiveBuff[],
): boolean {
  const gate = ch.activeWhenBuff;
  if (!gate) return true;
  const hasAnyMatchers = (gate.buffIds?.length ?? 0) > 0 || (gate.effectTags?.length ?? 0) > 0;
  const anyMatched = activeBuffs.some(
    (b) =>
      (b.buffId !== undefined && (gate.buffIds?.includes(b.buffId) ?? false)) ||
      (b.effectTag !== undefined && (gate.effectTags?.includes(b.effectTag) ?? false)),
  );
  const requiredMatched = (gate.requiredEffectTags ?? []).every((tag) =>
    activeBuffs.some((buff) => buff.effectTag === tag),
  );
  return (!hasAnyMatchers || anyMatched) && requiredMatched;
}

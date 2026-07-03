/**
 * Collects typed modifiers from all sources — passive (race, equipped items,
 * granted class features) AND live session state (active buffs, conditions) —
 * evaluating each change's formula to a number against the roll-data context.
 * Dice-bearing change formulas (none target static stats in the slice) are
 * skipped. Buffs and conditions flow through the same evaluator + stacker as
 * passive changes (Stage 4).
 */

import type { ActiveBuff, CharacterDoc, Change, RefData } from "@pf1/schema";

import { CONDITIONS } from "./conditions.js";
import { FAMILIARS } from "./familiars.js";
import { FEAT_EFFECTS, featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import { TRAITS } from "./traits.js";
import { totalLevel } from "./rolldata.js";
import type { TypedModifier } from "./stacking.js";
import { raceGrantsFlexibleAbility } from "./tables.js";

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
}

/** `@item.level` / `@cl` in a buff formula = the buff's caster/effect level. */
function withBuffCasterLevel(buff: Pick<ActiveBuff, "casterLevel">, rollData: RollData): RollData {
  return buff.casterLevel === undefined
    ? rollData
    : { ...rollData, cl: buff.casterLevel, item: { level: buff.casterLevel } };
}

/**
 * Resolve one buff change's formula to a number, honoring the buff's
 * `casterLevel` override the same way {@link collectModifiers} does. For UI
 * use — shows a player what a buff's formula actually amounts to rather than
 * the raw `@data.path` string. Returns `null` for dice terms or malformed
 * formulas; callers should fall back to displaying the raw formula.
 */
export function evaluateBuffChange(
  change: Pick<Change, "formula">,
  buff: Pick<ActiveBuff, "casterLevel">,
  rollData: RollData,
): number | null {
  try {
    return tryEvaluateFormula(change.formula, withBuffCasterLevel(buff, rollData));
  } catch {
    return null;
  }
}

function evalChange(
  formula: string,
  rollData: RollData,
  target: string,
  type: string,
  source: string,
  sourceId: string,
  out: CollectedModifier[],
  operator?: "add" | "set",
): void {
  let value: number | null;
  try {
    value = tryEvaluateFormula(formula, rollData);
  } catch {
    // A malformed change formula should not crash the whole sheet; skip it.
    return;
  }
  if (value === null || Number.isNaN(value)) return;
  out.push({ target, type: type || "untyped", value, source, sourceId, operator });
}

export function collectModifiers(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
): CollectedModifier[] {
  const out: CollectedModifier[] = [];

  // --- race ---------------------------------------------------------------
  const race = refData.races[doc.identity.race];
  if (race) {
    for (const ch of race.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, race.name, race.id, out, ch.operator);
    }
    // Flexible +2 (Human / Half-Elf / Half-Orc): no fixed ability changes,
    // player picks one ability score at character creation.
    if (raceGrantsFlexibleAbility(race) && doc.identity.flexibleAbility) {
      out.push({
        target: doc.identity.flexibleAbility,
        type: "racial",
        value: 2,
        source: `${race.name} (choice)`,
        sourceId: race.id,
      });
    }
  }

  // --- equipped items -----------------------------------------------------
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.itemId) continue;
    const item = refData.items[inst.itemId];
    if (!item) continue;
    for (const ch of item.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, item.name, item.id, out, ch.operator);
    }
  }

  // --- granted class features ---------------------------------------------
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    // `@class.unlevel` inside a feature formula refers to *this* class's level.
    const featureRollData: RollData = {
      ...rollData,
      class: { level: cls.level, unlevel: cls.level },
    };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      for (const ch of feature.changes ?? []) {
        evalChange(
          ch.formula,
          featureRollData,
          ch.target,
          ch.type,
          feature.name,
          feature.id,
          out,
          ch.operator,
        );
      }
    }
  }

  // --- active buffs (live state) ------------------------------------------
  for (const buff of doc.live.activeBuffs ?? []) {
    const buffRollData = withBuffCasterLevel(buff, rollData);
    for (const ch of buff.changes) {
      evalChange(
        ch.formula,
        buffRollData,
        ch.target,
        ch.type,
        buff.name,
        buff.instanceId,
        out,
        ch.operator,
      );
    }
  }

  // --- conditions (live state) --------------------------------------------
  for (const condId of doc.live.conditions ?? []) {
    const cond = CONDITIONS[condId];
    if (!cond) continue;
    for (const ch of cond.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, cond.name, cond.id, out, ch.operator);
    }
  }

  // --- traits (build choices) ----------------------------------------------
  // doc.build.traits holds trait ids (keys into the engine's hand-authored
  // TRAITS table — traits aren't in the vendored Foundry pack). Unknown ids
  // are skipped, matching the conditions/feats posture: never crash on an
  // unrecognized id.
  for (const traitId of doc.build.traits ?? []) {
    const trait = TRAITS[traitId];
    if (!trait) continue;
    for (const ch of trait.changes) {
      evalChange(ch.formula, rollData, ch.target, ch.type, trait.name, trait.id, out, ch.operator);
    }
  }

  // --- feats -----------------------------------------------------------------
  // doc.build.feats holds feat ids (keys into RefData.feats). We resolve each id
  // to a name slug and look it up in FEAT_EFFECTS.
  //   Static entries: emit their changes unconditionally.
  //   Choice entries: read doc.build.featChoices[featId]; if a choice is set,
  //     call entry.build(choiceId) and emit the resulting changes. If no choice
  //     is set yet, emit nothing — never crash on an incomplete doc.
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const slug = featNameSlug(feat.name);
    const entry = FEAT_EFFECTS[slug];
    if (!entry) continue;

    if (entry.type === "static") {
      for (const ch of entry.changes) {
        evalChange(ch.formula, rollData, ch.target, ch.type, feat.name, featId, out);
      }
    } else {
      // Choice-based feat: only emit changes when a choice has been stored.
      const choiceId = doc.build.featChoices?.[featId];
      if (!choiceId) continue;
      for (const ch of entry.build(choiceId)) {
        evalChange(ch.formula, rollData, ch.target, ch.type, feat.name, featId, out);
      }
    }
  }

  // --- arcane bond: familiar master bonus ----------------------------------
  // A familiar grants its master a small always-on bonus (hand-authored table
  // in familiars.ts). Unknown kinds and bonded objects apply nothing — bonded
  // objects have no numeric effect in v1 (display-only RAW notes in the UI).
  const bond = doc.build.arcaneBond;
  if (bond?.type === "familiar" && bond.familiarKind) {
    const familiar = FAMILIARS[bond.familiarKind];
    if (familiar) {
      for (const ch of familiar.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${familiar.name} (familiar)`,
          `familiar:${bond.familiarKind}`,
          out,
          ch.operator,
        );
      }
    }
  }

  // --- level-up ability score increases -----------------------------------
  // Defensive cap: if level dropped after choices were made, don't over-apply.
  const allowed = Math.floor(totalLevel(doc) / 4);
  const increases = (doc.build.abilityIncreases ?? []).slice(0, allowed);
  for (const ability of increases) {
    out.push({
      target: ability,
      type: "untyped",
      value: 1,
      source: "Level-up increase",
      sourceId: "ability-increase",
    });
  }

  return out;
}

/**
 * Filter collected modifiers down to a single target. Returns the full
 * {@link CollectedModifier} (not just {@link TypedModifier}) so callers that
 * need to branch on `operator` (e.g. speed set-changes in compute.ts) can —
 * it's still assignable wherever a `TypedModifier[]` is expected.
 */
export function forTarget(mods: CollectedModifier[], target: string): CollectedModifier[] {
  return mods.filter((m) => m.target === target);
}

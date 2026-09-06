/**
 * Collects typed modifiers from all sources — passive (race, equipped items,
 * granted class features) AND live session state (active buffs, conditions) —
 * evaluating each change's formula to a number against the roll-data context.
 * Dice-bearing change formulas (none target static stats in the slice) are
 * skipped. Buffs and conditions flow through the same evaluator + stacker as
 * passive changes (Stage 4).
 *
 * The work itself lives one subsystem per function under `collect/`; this file
 * only builds the shared context and runs them in order. Adding a subsystem
 * means a new function there and a new entry in {@link SUBSYSTEMS}.
 */

import type { ActiveBuff, Change, CharacterDoc, RefData } from "@pf1/schema";

import { tryEvaluateFormula, type RollData } from "./formula.js";
import {
  buffGateSatisfied,
  withBuffCasterLevel,
  type CollectContext,
  type CollectedModifier,
} from "./collect/shared.js";
import {
  collectAbilityDamage,
  collectAbilityIncreases,
  collectNegativeLevels,
} from "./collect/abilities.js";
import { collectArchetypeFeatureEffects } from "./collect/archetype-features.js";
import {
  collectBloodragerBloodline,
  collectPsychicDiscipline,
  collectSorcererBloodline,
} from "./collect/bloodlines.js";
import {
  collectClericDomainChanges,
  collectGrantedClassFeatures,
  collectGrantedPowerPatches,
} from "./collect/class-features.js";
import {
  collectAlchemistDiscoveries,
  collectArcanistExploits,
  collectMagusArcana,
  collectOracleCurse,
  collectOracleRevelations,
  collectShamanHexes,
  collectWitchHexes,
} from "./collect/class-powers.js";
import { collectArcaneBondFamiliar, collectTrackedFamiliar } from "./collect/familiars.js";
import {
  collectExtraFeatInstances,
  collectFeats,
  collectMartialFlexibility,
} from "./collect/feats.js";
import { collectEquippedItems } from "./collect/gear.js";
import {
  collectKineticistDefense,
  collectKineticistWildTalents,
  collectSkilledKineticist,
} from "./collect/kineticist.js";
import { collectActiveBuffs, collectConditions } from "./collect/live-state.js";
import { collectMediumSpirit, collectOccultistImplements } from "./collect/occultist-medium.js";
import { collectPolymorphForm } from "./collect/polymorph.js";
import { collectRace } from "./collect/race.js";
import { collectRagePowers } from "./collect/rage-powers.js";
import { collectSlayerTalents, collectTalentFamilies } from "./collect/talents.js";
import { collectHomebrewAbilities, collectTraits } from "./collect/traits.js";

export type { CollectContext, CollectedModifier } from "./collect/shared.js";

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

/**
 * Every subsystem, in the order they contribute. Order is not semantically
 * load-bearing (the stacker resolves by type, not by arrival), but it is the
 * order fixtures were computed against, so keep it stable.
 */
const SUBSYSTEMS: readonly ((ctx: CollectContext) => void)[] = [
  collectRace,
  collectEquippedItems,
  collectGrantedClassFeatures,
  collectClericDomainChanges,
  collectGrantedPowerPatches,
  collectArchetypeFeatureEffects,
  collectActiveBuffs,
  collectConditions,
  collectTraits,
  collectHomebrewAbilities,
  collectSorcererBloodline,
  collectBloodragerBloodline,
  collectPsychicDiscipline,
  collectArcanistExploits,
  collectMagusArcana,
  collectOracleRevelations,
  collectWitchHexes,
  collectShamanHexes,
  collectTalentFamilies,
  collectRagePowers,
  collectAlchemistDiscoveries,
  collectKineticistWildTalents,
  collectSkilledKineticist,
  collectKineticistDefense,
  collectSlayerTalents,
  collectOracleCurse,
  collectFeats,
  collectExtraFeatInstances,
  collectMartialFlexibility,
  collectArcaneBondFamiliar,
  collectTrackedFamiliar,
  collectOccultistImplements,
  collectMediumSpirit,
  collectPolymorphForm,
  collectAbilityIncreases,
  collectAbilityDamage,
  collectNegativeLevels,
];

export function collectModifiers(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
): CollectedModifier[] {
  const out: CollectedModifier[] = [];

  // Buff-gate check — see `buffGateSatisfied`. Consulted in every
  // hand-authored build-choice loop (traits, bloodline powers, exploits,
  // arcana, revelations, hexes, rage powers, discoveries, curse), all three
  // feat loops (`doc.build.feats`, `extraFeats`, granted feats -- Crane Style's
  // stance-gated changes ride this), and both racial-trait loops
  // (hand-authored `RACIAL_TRAITS` and the vendored `RefData.racialTraits`
  // catalog — the latter's own hand-authored
  // `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` supplement is the first data-pipeline
  // source to actually emit `activeWhenBuff`, e.g. a skinwalker heritage's
  // "while shapechanged" rider), so a table entry carrying `activeWhenBuff`
  // gates correctly no matter which table it lands in. Items, class features,
  // buffs, and conditions deliberately skip the check: nothing authors the
  // field on those sources.
  const masterBuffs = (doc.live.activeBuffs ?? []).filter((b) => !b.excludeMaster);
  const ctx: CollectContext = {
    doc,
    refData,
    rollData,
    out,
    masterBuffs,
    gateOpen: (ch: Change): boolean => buffGateSatisfied(ch, masterBuffs),
  };

  for (const collect of SUBSYSTEMS) collect(ctx);

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

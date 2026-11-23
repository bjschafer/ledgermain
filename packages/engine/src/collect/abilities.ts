/**
 * Ability-score bookkeeping: level-up increases, ability damage / drain /
 * penalty, and negative levels.
 */
import { totalLevel } from "../rolldata.js";
import { type CollectContext } from "./shared.js";

/** Level-up ability score increases. */
export function collectAbilityIncreases(ctx: CollectContext): void {
  const { doc, out } = ctx;
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
}

/** Ability damage / drain / penalty (live state). */
export function collectAbilityDamage(ctx: CollectContext): void {
  const { doc, out } = ctx;
  // Drain actually lowers the ability's effective score: a plain penalty on
  // the ability's own target, same as any other ability-targeting change.
  for (const [ability, points] of Object.entries(doc.live.abilityDrain ?? {})) {
    if (!points) continue;
    out.push({
      target: ability,
      type: "drain",
      value: -points,
      source: "Ability drain",
      sourceId: "ability-drain",
    });
  }
  // Damage/penalty must NOT lower the score, only the derived modifier, by
  // exactly floor(points/2). Subtracting 2*floor(points/2) (always even) from
  // the ability's total shifts `abilityMod = floor((total-10)/2)` down by
  // exactly floor(points/2) regardless of the total's parity, since
  // floor((x - 2k)/2) === floor(x/2) - k for any integer k. This does mean
  // `AbilityScore.total` visibly drops by an even number even though RAW says
  // the score itself is untouched — a deliberate, documented display
  // simplification (see CharacterDoc.live.abilityDamage doc comment) rather
  // than adding a parallel "modifier-only" adjustment path to computeAbilities.
  for (const [ability, points] of Object.entries(doc.live.abilityDamage ?? {})) {
    if (!points) continue;
    const evenPoints = 2 * Math.floor(points / 2);
    if (evenPoints === 0) continue;
    out.push({
      target: ability,
      type: "damage",
      value: -evenPoints,
      source: "Ability damage",
      sourceId: "ability-damage",
    });
  }
  for (const [ability, points] of Object.entries(doc.live.abilityPenalty ?? {})) {
    if (!points) continue;
    const evenPoints = 2 * Math.floor(points / 2);
    if (evenPoints === 0) continue;
    out.push({
      target: ability,
      type: "penalty",
      value: -evenPoints,
      source: "Ability penalty",
      sourceId: "ability-penalty",
    });
  }
}

/** Negative levels (live state). */
export function collectNegativeLevels(ctx: CollectContext): void {
  const { doc, out } = ctx;
  // Each negative level (temporary + permanent combined): -1 attack (which
  // CMB folds in), CMD, initiative, all saves and skill checks, -5 max HP
  // (CRB p. 562). Injected as synthetic untyped penalties through the targets
  // conditions and buffs already use, so no new consumer wiring is needed.
  // Initiative is the only ability check the sheet shows; the caster-level
  // penalty is a documented gap — see the `negativeLevels` doc comment on
  // CharacterDoc.live.
  const negLevels = doc.live.negativeLevels;
  const totalNegLevels = (negLevels?.temporary ?? 0) + (negLevels?.permanent ?? 0);
  if (totalNegLevels > 0) {
    for (const target of ["attack", "cmd", "init", "allSavingThrows", "skills"]) {
      out.push({
        target,
        type: "untyped",
        value: -totalNegLevels,
        source: "Negative levels",
        sourceId: "negative-levels",
      });
    }
    out.push({
      target: "hp",
      type: "untyped",
      value: -5 * totalNegLevels,
      source: "Negative levels",
      sourceId: "negative-levels",
    });
  }
}

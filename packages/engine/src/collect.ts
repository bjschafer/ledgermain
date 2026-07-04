/**
 * Collects typed modifiers from all sources — passive (race, equipped items,
 * granted class features) AND live session state (active buffs, conditions) —
 * evaluating each change's formula to a number against the roll-data context.
 * Dice-bearing change formulas (none target static stats in the slice) are
 * skipped. Buffs and conditions flow through the same evaluator + stacker as
 * passive changes (Stage 4).
 */

import type { ActiveBuff, CharacterDoc, Change, RefData } from "@pf1/schema";

import { ARCANIST_EXPLOITS } from "./arcanist-exploits.js";
import { ARCHETYPE_FEATURE_EFFECTS } from "./archetype-effects.js";
import { activeArchetypeSwaps } from "./archetypes.js";
import { BLOODLINES } from "./bloodlines.js";
import { CONDITIONS } from "./conditions.js";
import { FAMILIARS } from "./familiars.js";
import { FEAT_EFFECTS, featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import { RACIAL_TRAITS } from "./racial-traits.js";
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
    // Alternate racial traits (issue #35) that apply to THIS race — a stale id
    // from a race change (or an unknown id) is ignored, matching the
    // traits/conditions/feats posture. Each swaps a standard trait for an
    // alternate: `suppressTargets` drops the replaced standard trait's
    // structured `Race.change` (so e.g. a Human taking Focused Study loses the
    // `bonusFeats` grant), and the alternate's own `changes[]` are applied
    // below alongside every other change source.
    const activeRacialTraits = (doc.build.racialTraits ?? [])
      .map((id) => RACIAL_TRAITS[id])
      .filter((t): t is typeof t & {} => t != null && t.race === race.name);
    const suppressed = new Set<string>();
    for (const t of activeRacialTraits) {
      for (const target of t.suppressTargets ?? []) suppressed.add(target);
    }

    for (const ch of race.changes) {
      if (suppressed.has(ch.target)) continue;
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
    // The chosen alternates' own granted modifiers.
    for (const t of activeRacialTraits) {
      for (const ch of t.changes) {
        evalChange(ch.formula, rollData, ch.target, ch.type, t.name, t.id, out, ch.operator);
      }
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
  // Issue #7 audit: an active archetype's swapped-out base feature (e.g.
  // Two-Handed Fighter replacing Armor Training) previously kept contributing
  // its `changes[]` here regardless — this loop had no awareness of
  // `doc.build.archetypes` at all. `archetypeSwaps` (uuid -> replacing
  // archetype feature name, gated on the character's current level in that
  // class — see `activeArchetypeSwaps` in `archetypes.ts`) fixes that: a
  // swapped grant is skipped entirely, same as if the character never had it.
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
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
      if (archetypeSwaps.has(grant.uuid)) continue;
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

  // --- archetype feature effects (issue #7) -------------------------------
  // Hand-authored numeric effects for the small slice of archetype features
  // that grant an unconditional bonus (see `archetype-effects.ts`'s doc
  // comment for the audit/scope rationale) — gated the same way base class
  // features are: the granting class's level must reach the feature's level.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    const archFeatureRollData: RollData = {
      ...rollData,
      class: { level: clsLevel, unlevel: clsLevel },
    };
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const entry = ARCHETYPE_FEATURE_EFFECTS[f.id];
      if (!entry) continue;
      for (const ch of entry.changes) {
        evalChange(
          ch.formula,
          archFeatureRollData,
          ch.target,
          ch.type,
          f.name,
          f.uuid,
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

  // --- sorcerer bloodline arcana + powers (build choice, issue #34) ----------
  // Bloodline arcana/powers are hand-authored clean-room content (not in the
  // vendored Foundry data pack — see `@pf1/engine` `bloodlines.ts`), same
  // posture as `traits.ts` above. Gated on the character actually having
  // sorcerer levels (a non-sorcerer with a stale `sorcererBloodline` field
  // gets nothing) and, per power, on the sorcerer level reaching that power's
  // gate. `rollData.classes.sorcerer.level` (built by `buildRollData`) already
  // carries the right value for the `@classes.sorcerer.level` formulas these
  // entries use, so no per-grant RollData override is needed (unlike the
  // domain/school `@class.unlevel` convention above, which is granting-class
  // contextual).
  const sorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")?.level ?? 0;
  if (sorcererLevel > 0 && doc.build.sorcererBloodline) {
    const bloodline = BLOODLINES[doc.build.sorcererBloodline];
    if (bloodline) {
      for (const ch of bloodline.arcana.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${bloodline.name} Bloodline (Arcana)`,
          `bloodline:${bloodline.tag}:arcana`,
          out,
          ch.operator,
        );
      }
      for (const power of bloodline.powers) {
        if (power.level > sorcererLevel) continue;
        for (const ch of power.changes ?? []) {
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            `${power.name} (${bloodline.name} Bloodline)`,
            `bloodline:${bloodline.tag}:${power.id}`,
            out,
            ch.operator,
          );
        }
      }
    }
  }

  // --- arcanist exploits (build choice, issue #42) -------------------------
  // Exploit ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `arcanist-exploits.ts`), same
  // posture as `traits.ts` above. Gated on the character actually having
  // arcanist levels (a non-arcanist with a stale `arcanistExploits` field
  // gets nothing). Every base exploit is `displayOnly` with `changes: []`
  // today (see that file's doc comment), so this loop currently contributes
  // no numeric modifiers — it's wired the same way traits/bloodline powers
  // are so a future exploit with a real unconditional Change works for free.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = ARCANIST_EXPLOITS[exploitId];
      if (!exploit) continue;
      for (const ch of exploit.changes) {
        evalChange(ch.formula, rollData, ch.target, ch.type, exploit.name, exploit.id, out);
      }
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
    } else if (entry.type === "choice") {
      // Choice-based feat: only emit changes when a choice has been stored.
      const choiceId = doc.build.featChoices?.[featId];
      if (!choiceId) continue;
      for (const ch of entry.build(choiceId)) {
        evalChange(ch.formula, rollData, ch.target, ch.type, feat.name, featId, out);
      }
    }
    // "situational" entries never live in FEAT_EFFECTS (see SITUATIONAL_FEAT_EFFECTS
    // in feat-effects.ts) — this branch exists only so the type checker sees an
    // exhaustive narrowing if FEAT_EFFECTS's value type ever widens.
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

  // --- tracked familiar (build.familiar): master bonus + Alertness --------
  // A tracked familiar (issue: familiar support — independent of the
  // Wizard-only `arcaneBond` field above; see CharacterDoc.build.familiar's
  // doc comment) grants its master the SAME published per-species bonus as
  // an arcane-bond familiar. Reuses the `FAMILIARS` table above rather than
  // duplicating the hand-authored data a second time — a familiar's master
  // bonus doesn't depend on which field granted the familiar. It also grants
  // the master the Alertness feat's benefit while in reach (PF1 RAW "familiar
  // basics"), gated on `live.familiarInReach` (default true) and using the
  // exact same untyped +2/+2 shape as the real Alertness feat entry in
  // `feat-effects.ts` (so a master who separately has BOTH stacks them — a
  // documented, accepted edge case; see the schema doc comment on
  // `live.familiarInReach`).
  const trackedFamiliar = doc.build.familiar;
  if (trackedFamiliar?.speciesId) {
    const familiarDef = FAMILIARS[trackedFamiliar.speciesId];
    if (familiarDef) {
      for (const ch of familiarDef.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${familiarDef.name} (familiar: ${trackedFamiliar.name})`,
          `familiar:tracked:${trackedFamiliar.speciesId}`,
          out,
          ch.operator,
        );
      }
    }
    if (doc.live.familiarInReach ?? true) {
      out.push(
        {
          target: "skill.per",
          type: "untyped",
          value: 2,
          source: "Alertness (familiar in reach)",
          sourceId: "familiar-alertness",
        },
        {
          target: "skill.sen",
          type: "untyped",
          value: 2,
          source: "Alertness (familiar in reach)",
          sourceId: "familiar-alertness",
        },
      );
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

  // --- ability damage / drain / penalty (live state, issue #18) -----------
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

  // --- negative levels (live state, issue #19) -----------------------------
  // Each negative level (temporary + permanent combined): -1 attack, -1 all
  // saves, -1 skill checks, -5 max HP. Injected as synthetic untyped penalties
  // through the same `attack`/`allSavingThrows`/`skills`/`hp` targets that
  // conditions and buffs already use, so no new consumer wiring is needed.
  // Ability-check and caster-level penalties are documented gaps — see the
  // `negativeLevels` doc comment on CharacterDoc.live.
  const negLevels = doc.live.negativeLevels;
  const totalNegLevels = (negLevels?.temporary ?? 0) + (negLevels?.permanent ?? 0);
  if (totalNegLevels > 0) {
    for (const target of ["attack", "allSavingThrows", "skills"]) {
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

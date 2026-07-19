/**
 * Ability substitution — "use ability X in place of ability Y for <term>".
 *
 * PF1 has a whole family of abilities shaped this way, and they are NOT the
 * same thing as a bonus: Student of War's Mind Over Metal (Int in place of Dex
 * for AC), monk-style Wis-to-AC variants that *replace* rather than add, the
 * Guided weapon property (Wis in place of Str for attack and damage), Zen
 * Archer's Perfect Strike. A substitution swaps which ability modifier feeds a
 * derived term; it never stacks with the modifier it replaces, so it cannot be
 * modeled as a `Change` (which only ever adds to a target).
 *
 * The distinction matters for a concrete reason: the vendored monk "AC Bonus
 * (MNK)" feature really is additive — its `changes[]` adds `@abilities.wis.mod`
 * on top of Dex — whereas Mind Over Metal replaces the Dex line outright. Both
 * read as "Wis/Int to AC" in prose; only one of them is a `Change`.
 *
 * ## How a substitution gets applied
 *
 * {@link collectAbilitySubstitutions} walks the character's granted class
 * features and feats, looks each up in {@link ABILITY_SUBSTITUTIONS} by name
 * slug, and returns the ones whose `condition` currently holds.
 * {@link resolveSubstitution} then answers, for one slot, which ability
 * modifier actually applies — the caller (`compute.ts`) uses the returned
 * ability and label instead of the hardcoded one.
 *
 * ## Keying by name slug
 *
 * Same rationale as `feat-effects.ts`: RefData ids are opaque Foundry UUIDs
 * that can change between data versions, so the stable, human-authorable key
 * is the slugged canonical name. Hand-authored supplement features
 * (`data-pipeline/src/supplements.ts`) are covered by the same lookup — that
 * file already throws on any feature-name collision, so a slug identifies
 * exactly one feature across vendored and hand-authored content alike.
 *
 * ## When two substitutions target the same slot
 *
 * PF1 has no rule covering this specific collision, because in published
 * content two substitutions on one slot essentially never co-occur. This
 * engine takes the highest resulting modifier (ties keep the base ability).
 * That remains an engine convention rather than RAW, but it is the reading
 * that can never make a character worse off than the rules text they read,
 * every published substitution is written as a benefit rather than a
 * drawback, and it matches how the CRB resolves non-stacking bonuses
 * generally: the highest one applies.
 */

import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";

import { activeArchetypeSwaps } from "./archetypes.js";
import { featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";

/**
 * A derived term whose ability modifier can be substituted.
 *
 * `ac` covers the single Dexterity line in `computeAc`, and only that — CMD's
 * Dex term is deliberately left alone, because Mind Over Metal reads "for
 * determining her Armor Class" and CMD is a separate defense. `init` is
 * initiative's Dex term. The attack/damage slots are per-weapon and apply to
 * every weapon the character carries.
 *
 * Known boundary: weapon-restricted substitutions (Zen Archer's Wis-to-hit
 * with bows only, the Guided property on one specific weapon) would need a
 * per-weapon predicate on the registry entry. Nothing vendored or
 * hand-authored needs one today, so it is deliberately not built — an
 * untested restriction path would be worse than an honest gap.
 */
export type SubstitutionSlot = "ac" | "init" | "attack.melee" | "attack.ranged" | "damage.melee";

/** A registry entry: one ability-for-ability swap on one slot. */
export interface AbilitySubstitutionDef {
  slot: SubstitutionSlot;
  /**
   * The ability the rules normally use for this slot. The substitution only
   * fires when this matches the ability actually in play, so a feature that
   * says "Int in place of Dex" correctly does nothing to a term already using
   * Str (e.g. a Str-based weapon's attack roll).
   */
  from: AbilityId;
  /** The ability used instead. */
  to: AbilityId;
  /**
   * Foundry-dialect gate evaluated against the character's roll data; the
   * substitution applies only when it evaluates to a nonzero value. Absent
   * means unconditional. A formula that fails to evaluate (dice term,
   * malformed) is treated as not applying rather than throwing — same posture
   * as `tryEvaluateFormula`'s callers everywhere else.
   */
  condition?: string;
}

/** A substitution that has been matched to a character and passed its gate. */
export interface ActiveAbilitySubstitution extends AbilitySubstitutionDef {
  /** Display name of the granting feature/feat, for AC-component provenance. */
  source: string;
}

/**
 * Substitutions keyed by feature/feat name slug (see {@link featNameSlug}).
 * Clean-room from the published rules.
 *
 * Only Mind Over Metal is registered today. That is not a placeholder: the
 * other real PF1 substitutions are either already handled elsewhere (the
 * per-weapon `attackAbility`/`damageAbility` fields on `WeaponInstance` cover
 * Weapon Finesse and Slashing Grace, driven by an explicit player choice) or
 * weapon-restricted in a way this registry deliberately does not yet express
 * (see {@link SubstitutionSlot}). The non-`ac` slots are exercised by the
 * engine's fixture tests against synthetic registry entries, so they are live
 * code paths rather than speculative ones.
 */
export const ABILITY_SUBSTITUTIONS: Readonly<Record<string, AbilitySubstitutionDef>> = {
  // "At 2nd level, when a student of war is using armor or a shield, she can
  // use her Intelligence modifier in place of her Dexterity modifier for
  // determining her Armor Class." The gate is armor OR shield, matching the
  // published text — `@armor.type`/`@shield.type` are 0 when nothing of that
  // kind is equipped (see `rolldata.ts`).
  "mind-over-metal": {
    slot: "ac",
    from: "dex",
    to: "int",
    condition: "if(or(gte(@armor.type, 1), gte(@shield.type, 1)), 1, 0)",
  },
};

/**
 * Every substitution the character currently qualifies for, from granted class
 * features and feats.
 *
 * Class-feature grants respect archetype swaps for the same reason
 * `collect.ts` does — a feature an archetype traded away must not keep
 * applying — and are gated on the character having reached the granting level.
 */
export function collectAbilitySubstitutions(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
  registry: Readonly<Record<string, AbilitySubstitutionDef>> = ABILITY_SUBSTITUTIONS,
): ActiveAbilitySubstitution[] {
  const found: ActiveAbilitySubstitution[] = [];

  const consider = (name: string) => {
    const def = registry[featNameSlug(name)];
    if (!def) return;
    if (def.condition !== undefined && !(tryEvaluateFormula(def.condition, rollData) ?? 0)) return;
    found.push({ ...def, source: name });
  };

  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (feature) consider(feature.name);
    }
  }

  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (feat) consider(feat.name);
  }

  return found;
}

/** Which ability feeds a slot, and where that came from. */
export interface ResolvedAbility {
  ability: AbilityId;
  mod: number;
  /** The substitution that won, if any — absent when the base ability applies. */
  substitution?: ActiveAbilitySubstitution;
}

/**
 * Resolve one slot's ability modifier, applying the highest-wins convention
 * documented at the top of this module.
 *
 * `baseAbility` is what the rules use absent any substitution; passing it
 * explicitly (rather than deriving it from the slot) is what lets a weapon
 * already switched to Dex by Weapon Finesse correctly ignore a
 * "Wis in place of Str" substitution.
 */
export function resolveSubstitution(
  slot: SubstitutionSlot,
  baseAbility: AbilityId,
  abilityMods: Readonly<Record<AbilityId, number>>,
  substitutions: readonly ActiveAbilitySubstitution[],
): ResolvedAbility {
  let best: ResolvedAbility = { ability: baseAbility, mod: abilityMods[baseAbility] };
  for (const sub of substitutions) {
    if (sub.slot !== slot || sub.from !== baseAbility) continue;
    const mod = abilityMods[sub.to];
    if (mod > best.mod) best = { ability: sub.to, mod, substitution: sub };
  }
  return best;
}

/** Human-readable ability name for derived-sheet component provenance. */
export const ABILITY_LABEL: Readonly<Record<AbilityId, string>> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

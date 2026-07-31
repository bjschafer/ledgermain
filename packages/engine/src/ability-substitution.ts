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
import { ORACLE_REVELATIONS } from "./oracle-revelations.js";

/**
 * A derived term whose ability modifier can be substituted.
 *
 * `ac` covers the single Dexterity line in `computeAc`, and only that — CMD's
 * own Dex term is a separate slot, `cmd` (see below), not automatically
 * covered by an `ac` substitution. `init` is initiative's Dex term. The attack/damage slots are
 * per-weapon and apply to every weapon the character carries. `cmb` is CMB's
 * ability term specifically — Agile Maneuvers (APG p.150: "you can use your
 * Dexterity modifier instead of your Strength modifier when calculating your
 * CMB") is the one registered user; unlike the Tiny-or-smaller substitution
 * (CRB p.199, still hardcoded in `compute.ts` since it is a SIZE rule, not a
 * granted feature/feat this registry's name-slug lookup can key on), Agile
 * Maneuvers applies at any size, so it fits this module's shape exactly.
 *
 * `cmd` is CMD's own Dex term — deliberately a *different* slot from `ac`,
 * because RAW splits on this exactly: Mind Over Metal reads "for determining
 * her Armor Class" and stops there (AC only, CMD untouched), while the
 * oracle's Nature's Whispers reads "to your Armor Class and CMD" and names
 * both. A substitution registered only on `ac` still leaves `cmd` alone; one
 * written for Nature's Whispers is registered on both slots. `save.ref` is
 * the Reflex save's ability term, for the oracle's Cha-for-Dex pair
 * (Sidestep Secret, Prophetic Armor: "to your Armor Class and all Reflex
 * saving throws") — scoped to Reflex only, per the quote's own words; it
 * never reaches Fortitude, Will, or CMD (CMD is a defense value, not a saving
 * throw, regardless of sharing Dex as its usual ability).
 *
 * Known boundary: weapon-restricted substitutions (Zen Archer's Wis-to-hit
 * with bows only, the Guided property on one specific weapon) would need a
 * per-weapon predicate on the registry entry. Nothing vendored or
 * hand-authored needs one today, so it is deliberately not built — an
 * untested restriction path would be worse than an honest gap. The same
 * reasoning keeps every skill-scoped substitution (the oracle's Lore Keeper,
 * Cha-for-Int on Knowledge checks; Whispered Glimpses, Cha-for-Wis on
 * Perception/Sense Motive; the medium's Perform-for-Bluff/Intimidate swap)
 * out of this registry entirely: skills are computed generically per skill id
 * in `computeSkills`, with no per-skill or per-skill-group substitution slot,
 * and building one for three revelations would be exactly the kind of
 * untested, narrowly-used mechanism this module already declines to add.
 */
export type SubstitutionSlot =
  | "ac"
  | "init"
  | "attack.melee"
  | "attack.ranged"
  | "damage.melee"
  | "cmb"
  | "cmd"
  | "save.ref";

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
 * Substitutions keyed by feature/feat/oracle-revelation name slug (see
 * {@link featNameSlug}). Clean-room from the published rules. A key maps to
 * an ARRAY of defs, not a single one, because a granting name can substitute
 * on more than one slot at once (Sidestep Secret hits both `ac` and
 * `save.ref`; Nature's Whispers hits both `ac` and `cmd`) — see
 * {@link SubstitutionSlot}'s doc comment for why those are separate slots
 * rather than one.
 *
 * Mind Over Metal and Agile Maneuvers come from granted class
 * features/feats; the oracle revelations below come from
 * `doc.build.oracleRevelations` picks instead (see
 * {@link collectAbilitySubstitutions}'s revelation loop). Other real PF1
 * substitutions are either already handled elsewhere (the per-weapon
 * `attackAbility`/`damageAbility` fields on `WeaponInstance` cover Weapon
 * Finesse and Slashing Grace, driven by an explicit player choice) or
 * weapon-/skill-restricted in a way this registry deliberately does not yet
 * express (see {@link SubstitutionSlot}). The non-`ac` slots are exercised by
 * the engine's fixture tests against synthetic registry entries (and, for
 * `cmb`, by Agile Maneuvers itself), so they are live code paths rather than
 * speculative ones.
 */
export const ABILITY_SUBSTITUTIONS: Readonly<Record<string, readonly AbilitySubstitutionDef[]>> = {
  // "At 2nd level, when a student of war is using armor or a shield, she can
  // use her Intelligence modifier in place of her Dexterity modifier for
  // determining her Armor Class." The gate is armor OR shield, matching the
  // published text — `@armor.type`/`@shield.type` are 0 when nothing of that
  // kind is equipped (see `rolldata.ts`).
  "mind-over-metal": [
    {
      slot: "ac",
      from: "dex",
      to: "int",
      condition: "if(or(gte(@armor.type, 1), gte(@shield.type, 1)), 1, 0)",
    },
  ],
  // Agile Maneuvers (APG p.150): "you can use your Dexterity modifier
  // instead of your Strength modifier when calculating your Combat Maneuver
  // Bonus." Unconditional (no size/armor gate) — unlike the Tiny-or-smaller
  // CMB substitution (CRB p.199), which stays a direct size check in
  // `compute.ts` since it isn't granted by a named feature this registry
  // can key on.
  "agile-maneuvers": [{ slot: "cmb", from: "str", to: "dex" }],
  // Oracle, Lore mystery, Sidestep Secret (aonprd.com): "Add your Charisma
  // modifier (instead of your Dexterity modifier) to your Armor Class and
  // all Reflex saving throws. Your armor's maximum Dexterity bonus applies
  // to your Charisma instead of your Dexterity." Unconditional once picked
  // (no armor/level gate in the text) — the max-Dex cap clause needs no
  // special casing here: `computeAc` already applies the worn armor's cap
  // to whichever ability feeds the AC line, substituted or not (see
  // `computeAc`'s doc comment), so Mind Over Metal already exercises the
  // same behavior this text calls out explicitly.
  "sidestep-secret": [
    { slot: "ac", from: "dex", to: "cha" },
    { slot: "save.ref", from: "dex", to: "cha" },
  ],
  // Oracle, Lunar mystery, Prophetic Armor (aonprd.com): "You may use your
  // Charisma modifier (instead of your Dexterity modifier) as part of your
  // Armor Class and all Reflex saving throws. Your armor's maximum
  // Dexterity bonus applies to your Charisma, instead." Same shape as
  // Sidestep Secret above, word for word on the mechanic.
  "prophetic-armor": [
    { slot: "ac", from: "dex", to: "cha" },
    { slot: "save.ref", from: "dex", to: "cha" },
  ],
  // Oracle, Nature mystery, Nature's Whispers (aonprd.com): "You may add
  // your Charisma modifier, instead of your Dexterity modifier, to your
  // Armor Class and CMD. Any condition that would cause you to lose your
  // Dexterity modifier to your Armor Class instead causes you to lose your
  // Charisma modifier to your Armor Class." No Reflex-save clause here,
  // unlike Sidestep Secret/Prophetic Armor — registered on `ac` and `cmd`
  // only. The flat-footed clause needs no special casing either: AC's
  // flat-footed derivation already drops whichever ability is in the "dex"
  // category (substituted or not), so it already behaves as the second
  // sentence describes.
  "nature-s-whispers": [
    { slot: "ac", from: "dex", to: "cha" },
    { slot: "cmd", from: "dex", to: "cha" },
  ],
};

/**
 * Every substitution the character currently qualifies for, from granted class
 * features, feats, and picked oracle revelations.
 *
 * Class-feature grants respect archetype swaps for the same reason
 * `collect.ts` does — a feature an archetype traded away must not keep
 * applying — and are gated on the character having reached the granting level.
 *
 * The revelation loop mirrors `collect.ts`'s own oracle-revelation loop
 * exactly: gated on the character actually having oracle levels and a chosen
 * mystery, scoped to `doc.build.oracleRevelations` entries whose
 * `mysteryTag` matches that mystery (a stale pick from a since-changed
 * mystery emits nothing). Like that loop, it applies no archetype-swap
 * filtering — `collect.ts`'s revelation loop has none either, since this
 * table doesn't model any archetype trading a revelation away.
 */
export function collectAbilitySubstitutions(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
  registry: Readonly<Record<string, readonly AbilitySubstitutionDef[]>> = ABILITY_SUBSTITUTIONS,
): ActiveAbilitySubstitution[] {
  const found: ActiveAbilitySubstitution[] = [];

  const consider = (name: string) => {
    const defs = registry[featNameSlug(name)];
    if (!defs) return;
    for (const def of defs) {
      if (def.condition !== undefined && !(tryEvaluateFormula(def.condition, rollData) ?? 0)) {
        continue;
      }
      found.push({ ...def, source: name });
    }
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

  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleMystery) {
    for (const revelationId of doc.build.oracleRevelations ?? []) {
      const revelation = ORACLE_REVELATIONS[revelationId];
      if (!revelation || revelation.mysteryTag !== doc.build.oracleMystery) continue;
      consider(revelation.name);
    }
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

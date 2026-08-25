/**
 * The Weapon Finesse family — feats that swap Dexterity in for Strength on a
 * specific weapon's attack or damage line.
 *
 * These are SUBSTITUTIONS, not bonuses, so none of them can be a `Change`
 * (see `ability-substitution.ts`'s opening note for why). They also can't live
 * in `ABILITY_SUBSTITUTIONS` itself: every entry there applies to the whole
 * character, while each of these is scoped to one weapon TYPE, which that
 * registry deliberately has no predicate for. What they map onto instead is
 * the per-weapon `attackAbility`/`damageAbility` fields the sheet already
 * carries — this module answers, for one weapon, whether a feat the character
 * owns flips either of those to Dex, and `computeWeaponAttacks` applies it.
 *
 * The precedent is Rogue (Unchained)'s Finesse Training and the Gun Training
 * family (`rogueFinesseTrainingMatches` in `compute.ts`, `gunTrainingMatches`
 * in `gun-training.ts`): a class feature whose whole content is "Dex to damage
 * with these weapons" auto-applies rather than making the player hand-flip a
 * field for something the rules grant outright. A feat with the same content
 * gets the same treatment.
 *
 * ## Why "only when Dex is actually better"
 *
 * Every feat here is written as a permission ("you CAN add your Dexterity
 * modifier instead of your Strength modifier"), never a requirement, so a
 * character is free to keep swinging off Strength. Auto-promoting
 * unconditionally would therefore be able to LOWER a Str-heavy character's
 * numbers the moment they picked the feat up, which is the one outcome an
 * automatic default must never produce. The promotion is gated on the Dex
 * modifier being strictly larger; a player who wants the other reading (or
 * who is in one of the situations below) sets the per-weapon field by hand,
 * which always wins.
 *
 * ## What is deliberately NOT detected
 *
 * The grace feats all suspend themselves while two-weapon fighting, using
 * flurry of blows, or with the off hand otherwise occupied. The sheet models
 * one weapon line at a time and has no "what is in the other hand right now"
 * state, so the only part of that this module can honestly test is the
 * weapon's own `damageMultiplier`: 1.5 means it is being wielded two-handed
 * and 0.5 means it is the off-hand weapon of a two-weapon pair, and neither
 * qualifies (see {@link DexWeaponFeatDef.requiresOneHanded}). A character
 * genuinely fighting with two weapons at a ×1 multiplier still gets the
 * substitution and has to turn it off by hand — the alternative, refusing to
 * apply a feat most characters who take it benefit from constantly, is the
 * worse default.
 */

import type { AbilityId, CharacterDoc, RefData, WeaponInstance } from "@pf1/schema";

import { featNameSlug } from "./feat-effects.js";

/** Which of a weapon's two ability-driven lines a substitution reaches. */
export type DexWeaponSlot = "attack" | "damage";

/**
 * How a def decides whether a given weapon is one of its weapons.
 *
 * - A list of `WeaponInstance.group` slugs — the same free-text, one-weapon
 *   tag Weapon Focus matches on. Every single-weapon feat here (rapier,
 *   scimitar, starknife, spiked chain) uses this.
 * - `"finessable"` — Weapon Finesse's own set: "a light weapon, rapier, whip,
 *   or spiked chain". Light-ness isn't stored on the `WeaponInstance`, so it
 *   is resolved through `weaponId` against the vendored catalog's
 *   `weaponSubtype`; a hand-entered custom weapon has no `weaponId` and
 *   therefore never auto-matches (the player sets the field by hand — the
 *   same honest fallback `rogueFinesseTrainingMatches` takes for a weapon it
 *   can't identify).
 * - `"choice"` — the weapon the player picked for the feat, read from
 *   `build.featChoices` / `build.extraFeats[].choiceId`, which store a
 *   `group` slug (Slashing Grace).
 */
export type DexWeaponScope = readonly string[] | "finessable" | "choice";

export interface DexWeaponFeatDef {
  /** Display name, used verbatim as the provenance label on the sheet. */
  name: string;
  slots: readonly DexWeaponSlot[];
  scope: DexWeaponScope;
  /**
   * True when the feat's text requires the weapon to be wielded in one hand.
   * Blocks the substitution on a weapon set to a two-handed (×1.5) or
   * off-hand (×0.5) damage multiplier — see the module note on what else
   * can't be detected.
   */
  requiresOneHanded?: boolean;
  /**
   * Another feat that must also be owned. Only Weapon Finesse (Mythic) needs
   * one: its benefit is scoped to "when using Weapon Finesse", so it does
   * nothing on its own.
   */
  requiresFeat?: string;
}

/**
 * Clean-room from the published rules, keyed by feat name slug (see
 * {@link featNameSlug}) for the same stability reason `feat-effects.ts`
 * documents.
 *
 * Weapon Finesse's own entry covers the attack side only; the damage side of
 * the family is what each grace feat adds on top, one weapon type at a time.
 */
export const DEX_WEAPON_FEATS: Readonly<Record<string, DexWeaponFeatDef>> = {
  // CRB p.136: "With a light weapon, rapier, whip, or spiked chain made for a
  // creature of your size category, you may use your Dexterity modifier
  // instead of your Strength modifier on attack rolls." Attack only — the
  // feat says nothing about damage, which is exactly what the grace feats
  // below exist to grant.
  "weapon-finesse": { name: "Weapon Finesse", slots: ["attack"], scope: "finessable" },
  // Mythic Adventures: "When using Weapon Finesse, you may also use your
  // Dexterity modifier instead of your Strength modifier on your damage
  // rolls." Same weapon set as Weapon Finesse, damage side, and inert without
  // it. No one-handed clause — a finessed spiked chain is two-handed by
  // definition and still qualifies.
  "weapon-finesse-mythic": {
    name: "Weapon Finesse (Mythic)",
    slots: ["damage"],
    scope: "finessable",
    requiresFeat: "weapon-finesse",
  },
  // Ultimate Combat: "When wielding a rapier one-handed, you can add your
  // Dexterity modifier instead of your Strength modifier to that weapon's
  // damage."
  "fencing-grace": {
    name: "Fencing Grace",
    slots: ["damage"],
    scope: ["rapier"],
    requiresOneHanded: true,
  },
  // Ultimate Combat: same sentence as Fencing Grace with "starknife" in
  // place of "rapier". No explicit "one-handed" wording, but the same
  // "any time another hand is otherwise occupied" clause, which the
  // multiplier check is this engine's readable half of.
  "starry-grace": {
    name: "Starry Grace",
    slots: ["damage"],
    scope: ["starknife"],
    requiresOneHanded: true,
  },
  // Ultimate Combat: "Choose one kind of light or one-handed slashing weapon
  // ... When wielding your chosen weapon one-handed ... you can add your
  // Dexterity modifier instead of your Strength modifier to that weapon's
  // damage." The chosen weapon is the featChoices pick.
  "slashing-grace": {
    name: "Slashing Grace",
    slots: ["damage"],
    scope: "choice",
    requiresOneHanded: true,
  },
  // Inner Sea World Guide: "When wielding a scimitar with one hand, you can
  // use your Dexterity modifier instead of your Strength modifier on melee
  // attack and damage rolls." The only member of the family that moves both
  // lines.
  "dervish-dance": {
    name: "Dervish Dance",
    slots: ["attack", "damage"],
    scope: ["scimitar"],
    requiresOneHanded: true,
  },
  // Chronicle of Legends: "When wielding a spiked chain one-handed, you can
  // add your Dexterity modifier instead of your Strength modifier to that
  // weapon's damage."
  "dance-of-chains": {
    name: "Dance of Chains",
    slots: ["damage"],
    scope: ["spiked-chain"],
    requiresOneHanded: true,
  },
};

/** Weapon types Weapon Finesse names outright, alongside every light weapon. */
const FINESSABLE_GROUPS: ReadonlySet<string> = new Set(["rapier", "whip", "spiked-chain"]);

/** One owned feat, paired with the weapon slug the player chose for it (if any). */
interface OwnedFeat {
  slug: string;
  choiceId?: string;
}

/** Every feat instance on the build — `build.feats` plus `build.extraFeats`, mirroring `proficiency.ts`. */
function ownedFeats(doc: CharacterDoc, refData: RefData): OwnedFeat[] {
  const out: OwnedFeat[] = [];
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    out.push({ slug: featNameSlug(feat.name), choiceId: doc.build.featChoices?.[featId] });
  }
  for (const instance of doc.build.extraFeats ?? []) {
    const feat = refData.feats[instance.featId];
    if (!feat) continue;
    out.push({ slug: featNameSlug(feat.name), choiceId: instance.choiceId });
  }
  return out;
}

/**
 * True when `w` is one of the weapons Weapon Finesse names: a light weapon,
 * or a rapier/whip/spiked chain. "Light" lives on the vendored catalog entry
 * (`WeaponRef.weaponSubtype`), not on the instance, so it needs the
 * `weaponId` back-pointer; a custom weapon without one falls back to the
 * named-group check alone.
 */
function isFinessable(w: WeaponInstance, refData: RefData): boolean {
  const group = (w.group ?? "").trim().toLowerCase();
  if (FINESSABLE_GROUPS.has(group)) return true;
  const ref = w.weaponId ? refData.weapons[w.weaponId] : undefined;
  return ref?.weaponSubtype === "light";
}

/** True when `def`'s weapon scope covers `w`. */
function scopeMatches(
  def: DexWeaponFeatDef,
  owned: OwnedFeat,
  w: WeaponInstance,
  refData: RefData,
): boolean {
  if (def.scope === "finessable") return isFinessable(w, refData);
  const group = (w.group ?? "").trim().toLowerCase();
  if (!group) return false;
  if (def.scope === "choice") return owned.choiceId?.trim().toLowerCase() === group;
  return def.scope.includes(group);
}

/**
 * Which of `w`'s ability lines a feat the character owns promotes to Dex, and
 * which feat is responsible (its name becomes the provenance label on the
 * sheet's component list, so a player can see WHY the line reads Dexterity).
 *
 * Melee only — nothing in this family applies to a ranged attack (Dex is
 * already the ranged attack ability, and ranged Dex damage is the Gun
 * Training family's business). Returns an empty object for a character with
 * none of the feats, which is the overwhelmingly common case.
 */
export function dexWeaponFeatSources(
  doc: CharacterDoc,
  refData: RefData,
  w: WeaponInstance,
  abilityMods: Readonly<Record<AbilityId, number>>,
): { attack?: string; damage?: string } {
  if ((w.category ?? "melee") !== "melee") return {};
  // The permission-not-requirement gate — see the module note.
  if (abilityMods.dex <= abilityMods.str) return {};
  const feats = ownedFeats(doc, refData);
  if (feats.length === 0) return {};
  const slugs = new Set(feats.map((f) => f.slug));
  const oneHanded = (w.damageMultiplier ?? 1) === 1;
  const out: { attack?: string; damage?: string } = {};
  for (const owned of feats) {
    const def = DEX_WEAPON_FEATS[owned.slug];
    if (!def) continue;
    if (def.requiresFeat && !slugs.has(def.requiresFeat)) continue;
    if (def.requiresOneHanded && !oneHanded) continue;
    if (!scopeMatches(def, owned, w, refData)) continue;
    for (const slot of def.slots) {
      // First match wins. Two feats granting the same slot on the same weapon
      // (Dervish Dance and Weapon Finesse both reaching a scimitar's attack
      // line) substitute the identical Dex modifier, so the only thing at
      // stake is which name the sheet shows as the reason.
      if (out[slot] === undefined) out[slot] = def.name;
    }
  }
  return out;
}

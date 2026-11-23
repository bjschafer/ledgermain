/**
 * Hand-authored extra `Change[]` appended to a small, named set of vendored
 * ITEMS whose own `changes[]` are empty despite their published description
 * granting a real numeric effect — the `Item` counterpart to `buff-effects.ts`'s
 * `BUFF_CHANGE_PATCHES` (same "vendored gap, patched clean-room" posture, same
 * reason for keying by name rather than the vendored id: a content hash that
 * can shift on a data-pipeline rebuild). Applied by `collect.ts`'s equipped-
 * items loop alongside the item's own vendored `changes[]` — no new wiring
 * needed once an entry exists here.
 *
 * Bracers of Armor (+1 through +8, CRB p. 460): "Bracers of armor surround
 * the wearer with an invisible but tangible field of force, granting an
 * armor bonus of +1 to +8, just as though he were wearing armor" — confirmed
 * against aonprd.com. All eight vendored entries
 * (`Bracers of Armor +1` .. `+8`) carry an empty `changes[]`, so equipping
 * one currently grants nothing. `aac` (armor AC) is this engine's existing
 * target for a magic item's armor-type AC bonus — already exercised by the
 * vendored Robe of the Archmagi (`+[[5]]` via `{ target: "aac", type:
 * "untyped" }`), so this rides the same existing, tested consumer rather
 * than inventing a new one.
 *
 * "Bracers of armor and ordinary armor do not stack" is enforced by
 * `computeAc()`, not here: `ac-bonus-types.ts` normalizes every untyped `aac`
 * bonus onto the real `armor` bonus type, so worn armor and these compete for
 * the highest like any other same-type pair.
 *
 * Immunities: worn or held items whose text grants a standing immunity get
 * `imm.<damage type>` / `immEffect.<slug>` changes (slugs from
 * `EFFECT_IMMUNITY_LABELS`, `defenses.ts`), so they count only while
 * equipped. Left out on purpose: grants narrower than any slug (one named
 * poison, inhaled poisons only, sleep from mind-affecting effects only),
 * activated or consumed grants, multi-piece set bonuses, grants gated on
 * alignment or a ceremony, and confusion (Talons of Leng, the Doom Idol of
 * Ib), which has no slug. The Periapt of Proof Against Paralysis is not an
 * immunity at all: it trades paralysis for fatigue.
 */

import type { Change } from "@pf1/schema";

function bracersOfArmor(bonus: number): Change[] {
  return [{ formula: String(bonus), target: "aac", type: "untyped" }];
}

function imm(...targets: string[]): Change[] {
  return targets.map((target) => ({ formula: "1", target, type: "untyped" }));
}

export const ITEM_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  "Bracers of Armor +1": bracersOfArmor(1),
  "Bracers of Armor +2": bracersOfArmor(2),
  "Bracers of Armor +3": bracersOfArmor(3),
  "Bracers of Armor +4": bracersOfArmor(4),
  "Bracers of Armor +5": bracersOfArmor(5),
  "Bracers of Armor +6": bracersOfArmor(6),
  "Bracers of Armor +7": bracersOfArmor(7),
  "Bracers of Armor +8": bracersOfArmor(8),

  // "The wearer is immune to poison"
  "Periapt of Proof against Poison": imm("immEffect.poison"),
  // "This stone grants you immunity to poison"
  "Gamboge Nodule": imm("immEffect.poison"),
  // "The shield's bearer is immune to poison"
  "Savith's Iron": imm("immEffect.poison"),
  // "The wearer is immune to all disease"
  "Periapt of Health": imm("immEffect.disease"),
  // "The wearer of the helm is immune to fear effects"
  "Grim Helm": imm("immEffect.fear"),
  // "As long as the wielder carries the nightmare rod in his hand, he is
  // immune to fear effects"
  "Nightmare Rod": imm("immEffect.fear"),
  // "grants the wearer immunity to fear effects and pain effects" (no pain slug)
  "Pendant of the First Tears": imm("immEffect.fear"),
  // "the wearer is immune to bleed damage while wearing a ring of regeneration"
  "Ring of Regeneration": imm("immEffect.bleed"),
  // "immunity to bleed effects"
  "Rimeheart Amulet": imm("immEffect.bleed"),
  // "immune to continuous damage from bleed attacks"
  "Quicksilver Blood": imm("immEffect.bleed"),
  // "The density hammer's wielder is immune to petrification effects"
  "Density Hammer": imm("immEffect.petrification"),
  // "The wearer gains immunity to polymorph effects"
  Tarnhelm: imm("immEffect.polymorph"),
  // "immunity to energy draining effects of any kind"
  "The Gluttonous Tome": imm("immEffect.energyDrain"),
  // "immune to mind-affecting effects unless she chooses otherwise"
  "Scintillating Garment": imm("immEffect.mindAffecting"),
  // "grant the wearer immunity to mind-affecting effects"
  "Stannum Crown": imm("immEffect.mindAffecting"),
  // "immune to possession and mental control (including charm and compulsion
  // effects like command and charm person)"
  "Mind Buttressing": imm("immEffect.charm", "immEffect.compulsion"),
  // "While bearing the weapon, the wielder is immune to all enchantment effects"
  "Sword of Lust, Asheia": imm("immEffect.enchantment"),
  // "immunity to gaze attacks"
  Aegis: imm("immEffect.gazeAttacks"),
  // "granting him immunity to being flanked"
  "Vudran Ashak Helmet": imm("immEffect.flanking"),
  // "immunity to fire and poison, immunity to mind-affecting effects"
  "Crown of Infernal Majesty": imm("imm.fire", "immEffect.poison", "immEffect.mindAffecting"),
  // "The wearer is immune to electricity and poison"
  "Demon Prince Armor": imm("imm.electricity", "immEffect.poison"),
  // "The wearer also gains immunity to electricity and poison"
  "Glabrezu Claw": imm("imm.electricity", "immEffect.poison"),
  // "immunity to electricity and poison"
  "Mythic Amulet of the Abyss": imm("imm.electricity", "immEffect.poison"),
  // "The wearer of the helm is immune to acid"
  "Horns of Naraga": imm("imm.acid"),
  // "The torc grants its wearer immunity to cold"
  "Torc of Kostchtchie": imm("imm.cold"),
  // "While carried in one hand, the rod grants its wielder immunity to cold
  // and electricity"
  "Storm Kindler's Rod": imm("imm.cold", "imm.electricity"),
};

/**
 * Shared primary/secondary natural-attack classification + math (PF1
 * Combat "Natural Attacks" — verified against aonprd.com during authoring
 * for issue #68): a creature making a full attack with more than one KIND of
 * natural weapon (e.g. a bite plus 2 claws) resolves every attack in the
 * same round, but not all at the same bonus — exactly one kind is the
 * creature's PRIMARY attack (full base attack bonus, full Strength modifier
 * on damage) and every other kind is a SECONDARY attack (base attack bonus
 * MINUS 5, only HALF the creature's Strength modifier on damage). Verified
 * quotes (aonprd.com "Combat" rules, Natural Attacks):
 *   - "Attacks with secondary natural attacks are made using your base
 *     attack bonus minus 5."
 *   - "...you only add half your Strength modifier on damage rolls [with
 *     secondary attacks]."
 *   - "Some natural attacks are denoted as secondary natural attacks, such
 *     as tails and wings."
 * A creature with only ONE kind of natural attack (regardless of `count` —
 * e.g. a wolf's single bite, or a horse's two hooves) has nothing to be
 * secondary TO, so every instance of it stays primary — confirmed against
 * aonprd.com's own Wolf stat block (`Melee bite +2 (1d6+1)`: base attack
 * bonus + full Strength modifier, no reduction, no ×1.5 multiplier either —
 * see below for why this module does NOT apply a ×1.5 "single natural
 * attack" bonus).
 *
 * Multiattack (bonus feat automatically granted once a companion/eidolon has
 * 3+ natural attacks — {@link ANIMAL_COMPANION_PROGRESSION}'s/
 * {@link EIDOLON_PROGRESSION}'s own "Multiattack" milestone) softens the
 * secondary penalty from −5 to −2 (verified against aonprd.com's Multiattack
 * feat text: "The creature's secondary attacks with natural weapons take
 * only a −2 penalty").
 *
 * Deliberately NOT modeled: CRB Combat's "If you possess only one natural
 * attack... you add 1-1/2 times your Strength bonus" line. That provision
 * governs a CHARACTER (or humanoid-turned-natural-attacker) making a single
 * natural attack as their whole round's action, in place of an iterative
 * weapon/unarmed routine — a PC combat CHOICE, not a property of a
 * creature's fixed attack routine. It does not describe how a companion,
 * eidolon, or Bestiary creature's own baseline attack routine is built (the
 * verified Wolf stat block above confirms real creatures with one attack
 * form get NO multiplier), so it's out of scope here.
 *
 * Which attack NAMES are primary vs secondary isn't independently
 * re-derived per species — it reuses the exact classification this codebase
 * already established (and verified against aonprd.com/d20pfsrd.com) in
 * `eidolon.ts`'s evolution flavor text during issue #65: "Bite"/"Claws"/
 * "Gore"/"Slam"/"Sting" are primary-type natural weapons; "Hooves"/
 * "Pincers"/"Tail Slap"/"Tentacle"/"Wing Buffet" are secondary-type ones —
 * matching the Bestiary's own named examples of secondary weapons ("tails
 * and wings", quoted above). A creature may have SEVERAL primary-type
 * attack forms at once (a bear's Bite + 2 Claws), and every one of them is
 * made at full base attack bonus with full Strength — the classification is
 * per KIND, never "one primary per routine" (verified against aonprd.com's
 * grizzly bear stat block: `2 claws +7 (1d6+5 plus grab), bite +6 (1d6+5)`,
 * bite and claws both at full BAB, the +1 gap being the bear's own Weapon
 * Focus (claw); the Universal Monster Rules' Natural Attacks table likewise
 * types each attack form independently).
 *
 * Strength-to-damage scaling for a secondary attack ("half your Strength
 * modifier"): only a POSITIVE modifier is halved; a Strength PENALTY applies
 * in full, unscaled. The rule text doesn't disambiguate the negative case,
 * but this is the standard reading used consistently elsewhere for
 * Strength-modifier multipliers (e.g. the two-handed weapon ×1.5 bonus is
 * likewise never applied to a penalty) and matches how every digital PF1
 * implementation this project has observed behaves (a behavioral-oracle
 * comparison, not copied code — see DESIGN §6); documented here as this
 * project's adopted interpretation rather than left ambiguous.
 */

export type NaturalAttackType = "primary" | "secondary";

/**
 * First-word attack names classified as PRIMARY-type natural weapons (see
 * module doc comment). Anything not in this set (hooves, pincers, tail
 * slaps, tentacles, wing buffets, constrict, ...) is secondary-type.
 */
const PRIMARY_ATTACK_NAMES: ReadonlySet<string> = new Set([
  "bite",
  "claw",
  "claws",
  "gore",
  "slam",
  "sting",
  "talon",
  "talons",
]);

function firstWord(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? "").toLowerCase();
}

/** Classify one attack NAME by {@link PRIMARY_ATTACK_NAMES} (case-insensitive, first word only). */
function isPrimaryTypeName(name: string): boolean {
  return PRIMARY_ATTACK_NAMES.has(firstWord(name));
}

/**
 * Classify every attack in a species'/base-form's attack list into primary
 * vs secondary (see module doc comment): a single distinct attack form is
 * always primary regardless of name or count; with 2+ distinct forms, each
 * is classified independently by name — a creature with several
 * primary-type forms (bear: Bite + Claws) keeps ALL of them primary.
 */
export function classifyNaturalAttacks<T extends { name: string }>(
  attacks: readonly T[],
): (T & { attackType: NaturalAttackType })[] {
  const distinctNames = new Set(attacks.map((a) => a.name));
  if (distinctNames.size <= 1) {
    return attacks.map((a) => ({ ...a, attackType: "primary" as const }));
  }
  return attacks.map((a) => ({
    ...a,
    attackType: isPrimaryTypeName(a.name) ? ("primary" as const) : ("secondary" as const),
  }));
}

/** Secondary attacks' base-attack-bonus penalty: −5 normally, −2 with Multiattack (see module doc comment). */
export function secondaryAttackPenalty(hasMultiattack: boolean): number {
  return hasMultiattack ? -2 : -5;
}

/**
 * The attack-roll bonus for one attack, given the creature's already-computed
 * base bonus (BAB + ability mod + size + any shared-buff attack bonus —
 * every existing caller already sums these), applying the secondary penalty
 * when `attackType === "secondary"`.
 */
export function naturalAttackBonus(
  baseBonus: number,
  attackType: NaturalAttackType,
  hasMultiattack: boolean,
): number {
  return attackType === "secondary"
    ? baseBonus + secondaryAttackPenalty(hasMultiattack)
    : baseBonus;
}

/**
 * Half a Strength modifier for a secondary attack's damage — only a
 * POSITIVE modifier is halved (rounded down); a penalty applies in full (see
 * module doc comment).
 */
function halfStrMod(strMod: number): number {
  return strMod > 0 ? Math.floor(strMod / 2) : strMod;
}

/**
 * The Strength-derived damage addend for one attack: the full modifier for
 * a primary attack, {@link halfStrMod} for a secondary one.
 */
export function naturalAttackDamageBonus(strMod: number, attackType: NaturalAttackType): number {
  return attackType === "secondary" ? halfStrMod(strMod) : strMod;
}

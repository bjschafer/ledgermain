/**
 * PF1 has no such thing as an *untyped* armor bonus: a bonus delivered through
 * the `aac` / `sac` / `nac` targets IS the armor / shield / natural-armor
 * bonus, and same-type bonuses take the highest rather than summing (CRB
 * p. 562, "Bonus Types").
 *
 * The vendored data spells that type inconsistently — worn armor carries no
 * type at all, Mage Armor and the Shield spell say `base`, Bracers of Armor
 * and the Robe of the Archmagi say `untyped` — and both `untyped` and `base`
 * would otherwise land in separate always-summing groups (`stacking.ts` exempts
 * `untyped` from the highest-wins rule by design), so a mage in a chain shirt
 * with bracers up would add all three. Normalizing them onto one real
 * bonus-type name puts them in a single competing group, and makes the loser
 * strike through in the breakdown next to whatever beat it.
 *
 * A type the source *did* set (`enh`, `alchemical`, `racial`, …) is left
 * alone: those are genuinely different bonus types and stack with the armor
 * bonus itself, which is how magic vestment, barkskin, and an amulet of
 * natural armor are supposed to work.
 */

const AC_BONUS_TYPE: Readonly<Record<string, string>> = {
  aac: "armor",
  sac: "shield",
  nac: "natural",
};

const UNTYPED_AC_BONUS = new Set(["untyped", "base", ""]);

/** The real bonus-type name for a change on `target`, or `type` unchanged. */
export function acBonusType(target: string, type: string): string {
  const named = AC_BONUS_TYPE[target];
  return named !== undefined && UNTYPED_AC_BONUS.has(type.toLowerCase()) ? named : type;
}

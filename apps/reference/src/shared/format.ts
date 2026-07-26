/**
 * Small display formatters shared by the index generator and the detail views,
 * so a weapon's crit notation (say) reads identically in a result row and in
 * its own stat block.
 */

const SCHOOL_NAME: Record<string, string> = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
  uni: "Universal",
};

/** Full school name for a vendored 3-letter abbreviation; unknown codes pass through. */
export function schoolName(abbrev: string | undefined): string | null {
  if (!abbrev) return null;
  return SCHOOL_NAME[abbrev] ?? abbrev;
}

/**
 * PF1 crit notation: a natural-20-only threat range is written as the multiplier
 * alone (`×2`), a widened one spells the range out (`19–20/×2`). Defaults match
 * the schema's (20 / ×2).
 */
export function formatCrit(critRange: number | undefined, critMult: number | undefined): string {
  const range = critRange ?? 20;
  const mult = critMult ?? 2;
  return range < 20 ? `${range}–20/×${mult}` : `×${mult}`;
}

/** Price in gp with thousands separators, e.g. `8,000 gp`. Fractions keep 2 dp. */
export function formatPrice(price: number | undefined): string | null {
  if (price === undefined) return null;
  const digits = Number.isInteger(price) ? 0 : 2;
  return `${price.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} gp`;
}

/** Weight in pounds, e.g. `1 lb.`, `4.5 lb.`. */
export function formatWeight(weight: number | undefined): string | null {
  if (weight === undefined) return null;
  return `${weight} lb.`;
}

/** A signed integer with an explicit `+`, e.g. `+4`, `-2`, `+0`. */
export function signed(n: number): string {
  return n < 0 ? String(n) : `+${n}`;
}

/** Join the non-empty parts with the site's separator dot. */
export function joinDot(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join(" · ");
}

const PROFICIENCY_LABEL: Record<string, string> = {
  simple: "simple",
  martial: "martial",
  exotic: "exotic",
  lightArmor: "light armor",
  mediumArmor: "medium armor",
  heavyArmor: "heavy armor",
  lightShield: "light shield",
  heavyShield: "heavy shield",
  towerShield: "tower shield",
  shield: "shield",
};

export function proficiencyLabel(proficiency: string | undefined): string | null {
  if (!proficiency) return null;
  return PROFICIENCY_LABEL[proficiency] ?? proficiency;
}

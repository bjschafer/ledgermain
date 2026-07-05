/**
 * Consumable magic items (issue #36): potions, scrolls, and wands.
 *
 * Foundry's pf1 system ships **no** static potion/scroll/wand item documents —
 * it generates them at runtime from the spell compendium (the vendored
 * `items` pack has none, so the gear picker's magic-item list never offered a
 * "Potion of Cure Light Wounds"). We do the same thing here, purely on the
 * client: derive consumable entries from the already-loaded `RefData.spells`
 * using the standard Pathfinder magic-item-creation pricing tables.
 *
 * These entries are **display + inventory only** — no engine mechanics. When
 * the player picks one, it's added as a self-contained custom gear item
 * (name/price on the `ItemInstance`, plus `charges` for wands), so nothing
 * needs to be vendored into `items.json` (which would bloat by thousands of
 * rows) and `compute()` is untouched. A consumable never toggles a buff or
 * changes a derived number; drinking a potion is the player applying the
 * corresponding buff by hand, exactly as before.
 *
 * ### Pricing (PF1 Core Rulebook, Magic Item Creation)
 *
 * The market price of the cheapest ("minimum caster level") version:
 *
 * | kind   | formula                    | 0-level factor |
 * |--------|----------------------------|----------------|
 * | potion | spell level × CL × 50 gp   | ½              |
 * | scroll | spell level × CL × 25 gp   | ½              |
 * | wand   | spell level × CL × 750 gp  | ½              |
 *
 * where CL is the minimum caster level able to cast the spell at that level:
 * `max(1, 2·level − 1)` (and 1 for a 0-level cantrip). A 0-level spell is
 * priced as if level ½. Wands hold 50 charges.
 *
 * ### Eligibility
 *
 * - **Potion**: spell level ≤ 3 **and** range personal or touch. That's the
 *   textbook RAW line and keeps the archetypal potions (cure wounds, mage
 *   armor, shield, bull's strength, invisibility, protection from evil…) while
 *   excluding area/ranged spells (no "Potion of Fireball"). Known gap: a few
 *   Paizo-printed close-range personal-target potions (Enlarge/Reduce Person)
 *   are dropped — including all `close`-range spells would flood the list with
 *   attack/utility spells that aren't potions, so those are left to the
 *   "+ Add custom gear" fallback.
 * - **Scroll**: spell level ≤ 9 (every spell qualifies).
 * - **Wand**: spell level ≤ 4.
 */

import type { Spell } from "@pf1/schema";

export type ConsumableKind = "potion" | "scroll" | "wand";

export interface ConsumableKindDef {
  kind: ConsumableKind;
  /** Plural noun for the picker heading, e.g. "Potions". */
  label: string;
  /** Prefix for the generated item name, e.g. "Potion of". */
  namePrefix: string;
  /** gp per (spell level × caster level). */
  priceFactor: number;
  /** Highest spell level this kind can hold. */
  maxSpellLevel: number;
  /** Charges a fresh item of this kind carries (wands only). */
  charges?: number;
}

export const CONSUMABLE_KINDS: readonly ConsumableKindDef[] = [
  { kind: "potion", label: "Potions", namePrefix: "Potion of", priceFactor: 50, maxSpellLevel: 3 },
  { kind: "scroll", label: "Scrolls", namePrefix: "Scroll of", priceFactor: 25, maxSpellLevel: 9 },
  {
    kind: "wand",
    label: "Wands",
    namePrefix: "Wand of",
    priceFactor: 750,
    maxSpellLevel: 4,
    charges: 50,
  },
];

/** A generated, marketable consumable derived from one spell. */
export interface ConsumableEntry {
  /** Stable synthetic id, e.g. "potion:001poiyujbqv24z0". */
  id: string;
  kind: ConsumableKind;
  spellId: string;
  spellName: string;
  /** Item name, e.g. "Potion of Cure Light Wounds". */
  name: string;
  /** Effective spell level used for pricing (0 = cantrip). */
  spellLevel: number;
  /** Minimum caster level able to cast the spell at `spellLevel`. */
  casterLevel: number;
  /** Market price in gp (may be fractional, e.g. 12.5 for a 0-level scroll). */
  price: number;
  /** Charges a fresh item carries (wands only). */
  charges?: number;
}

const LEARN_CONTEXTS = ["class", "domain", "bloodline", "subdomain"] as const;

/**
 * The spell level a consumable is priced from: the lowest level any class,
 * domain, or bloodline learns the spell at (the cheapest version is what a
 * market offers). Falls back to the spell's nominal `level` when no list
 * carries it.
 */
export function effectiveSpellLevel(spell: Spell): number {
  let min = Infinity;
  for (const key of LEARN_CONTEXTS) {
    const map = spell.learnedAt[key];
    if (!map) continue;
    for (const lvl of Object.values(map)) {
      if (typeof lvl === "number" && lvl < min) min = lvl;
    }
  }
  return Number.isFinite(min) ? min : spell.level;
}

/** Minimum caster level to cast a spell of `level` (1 for a 0-level cantrip). */
export function minCasterLevel(level: number): number {
  return Math.max(1, 2 * level - 1);
}

/**
 * Market price of the minimum-CL version. A 0-level spell is priced as level ½
 * per the item-creation tables.
 */
export function consumablePrice(kind: ConsumableKind, level: number): number {
  const def = CONSUMABLE_KINDS.find((k) => k.kind === kind);
  if (!def) return 0;
  const factor = level === 0 ? 0.5 : level;
  return factor * minCasterLevel(level) * def.priceFactor;
}

/** True when a spell's every ranged action targets personal or touch range. */
function isPersonalOrTouch(spell: Spell): boolean {
  let sawRange = false;
  for (const action of spell.actions) {
    const units = action.range?.units;
    if (!units) continue;
    sawRange = true;
    if (units !== "personal" && units !== "touch") return false;
  }
  return sawRange;
}

/** Whether `spell` can be made into a consumable of `kind`. */
export function isConsumableEligible(spell: Spell, kind: ConsumableKind): boolean {
  const def = CONSUMABLE_KINDS.find((k) => k.kind === kind);
  if (!def) return false;
  const level = effectiveSpellLevel(spell);
  if (level > def.maxSpellLevel) return false;
  if (kind === "potion" && !isPersonalOrTouch(spell)) return false;
  return true;
}

/**
 * Build the full list of `kind` consumables from the vendored spells, sorted by
 * name. The caller filters by search query and slices for display.
 */
export function generateConsumables(
  spells: Record<string, Spell>,
  kind: ConsumableKind,
): ConsumableEntry[] {
  const def = CONSUMABLE_KINDS.find((k) => k.kind === kind);
  if (!def) return [];
  const out: ConsumableEntry[] = [];
  for (const spell of Object.values(spells)) {
    if (!isConsumableEligible(spell, kind)) continue;
    const level = effectiveSpellLevel(spell);
    out.push({
      id: `${kind}:${spell.id}`,
      kind,
      spellId: spell.id,
      spellName: spell.name,
      name: `${def.namePrefix} ${spell.name}`,
      spellLevel: level,
      casterLevel: minCasterLevel(level),
      price: consumablePrice(kind, level),
      ...(def.charges != null ? { charges: def.charges } : {}),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

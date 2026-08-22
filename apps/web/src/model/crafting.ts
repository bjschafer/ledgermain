/**
 * Item-creation support for the consumables picker: which of potions/scrolls/
 * wands this character may craft, from which spells, at what caster level, and
 * for what cost.
 *
 * This is add-time arithmetic, not a crafting subsystem. Nothing here is
 * stored, tracked, or advanced day by day; a crafted item lands in `build.gear`
 * exactly like a bought one. What the feat buys you is a filtered list, half
 * price, and the three numbers you would otherwise look up by hand.
 *
 * ### The rules being applied (PF1 Core Rulebook, Magic Item Creation)
 *
 * - Cost to create is **half** the item's market price. Material components
 *   are paid on top, in full, and are not halved. The vendored spell data
 *   carries only a `components.material` boolean with no gp value, so a spell
 *   with one is flagged and left for the player to price.
 * - Spellcraft DC is `5 + the item's caster level`.
 * - Potions and scrolls take 2 hours when the base price is 250 gp or less,
 *   otherwise 1 day per 1,000 gp. Wands have no short-form clause: always
 *   1 day per 1,000 gp, minimum 1 day.
 * - The creator must be able to cast the spell, which fixes both the spell
 *   level (the level on *their* class list) and the floor on caster level.
 *   The ceiling is their own caster level.
 */

import type { CharacterDoc, DerivedSheet, RefData, Spell } from "@pf1/schema";

import { casterLevelForClass, CASTER_KIND, effectiveCasterClassLevel } from "./casterLevel.js";
import {
  type ConsumableKind,
  consumableKindDef,
  consumablePriceAt,
  effectiveSpellLevel,
  isConsumableEligibleAt,
  minCasterLevel,
} from "./consumables.js";
import { featInstances, grantedFeats } from "./feats.js";
import { castableSpellsFor } from "./knownSpells.js";
import { casterClassesOf } from "./spellcasting.js";

/** The item-creation feat that unlocks each consumable kind. */
export interface ItemCreationFeatDef {
  kind: ConsumableKind;
  featName: string;
  /** Caster level the feat itself requires, for the "why is this greyed out" hint. */
  featCasterLevel: number;
}

export const ITEM_CREATION_FEATS: readonly ItemCreationFeatDef[] = [
  { kind: "potion", featName: "Brew Potion", featCasterLevel: 3 },
  { kind: "scroll", featName: "Scribe Scroll", featCasterLevel: 1 },
  { kind: "wand", featName: "Craft Wand", featCasterLevel: 5 },
];

export function itemCreationFeatFor(kind: ConsumableKind): ItemCreationFeatDef | undefined {
  return ITEM_CREATION_FEATS.find((f) => f.kind === kind);
}

/**
 * Which consumable kinds this character holds the item-creation feat for.
 * Counts class-granted feats (a wizard's free Scribe Scroll, the Rune domain's)
 * alongside chosen ones, matched by name since that is what both sides expose.
 */
export function craftableKinds(doc: CharacterDoc, refData: RefData): Set<ConsumableKind> {
  const held = new Set<string>();
  for (const inst of featInstances(doc)) {
    const name = refData.feats[inst.featId]?.name;
    if (name) held.add(name.toLowerCase());
  }
  for (const g of grantedFeats(doc, refData)) held.add(g.featName.toLowerCase());

  const out = new Set<ConsumableKind>();
  for (const def of ITEM_CREATION_FEATS) {
    if (held.has(def.featName.toLowerCase())) out.add(def.kind);
  }
  return out;
}

/** One caster class a character could craft from. */
export interface CraftSource {
  classTag: string;
  /** Display name from RefData, e.g. "Wizard". */
  label: string;
  /** The crafter's own caster level in this class — the ceiling on what they may make. */
  casterLevel: number;
  /** Magic tradition, for the scroll/wand label. Absent for classes with no classification. */
  tradition?: "arcane" | "divine" | "psychic";
  /** Spell id -> the level this class casts it at. */
  spells: Map<string, number>;
}

/**
 * Every caster class on the document that can actually cast right now, in
 * `identity.classes` order. A class whose caster level is still 0 (a paladin
 * below 4th, a bloodrager below 4th) is dropped: it can craft nothing.
 */
export function craftSources(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
): CraftSource[] {
  const out: CraftSource[] = [];
  for (const { tag } of casterClassesOf(doc, refData)) {
    const classLevel = effectiveCasterClassLevel(doc, refData, tag);
    const casterLevel = casterLevelForClass(tag, classLevel);
    if (casterLevel <= 0) continue;
    const { byId } = castableSpellsFor(doc, refData, sheet, tag);
    if (byId.size === 0) continue;
    const tradition = CASTER_KIND[tag];
    out.push({
      classTag: tag,
      label: Object.values(refData.classes).find((c) => c.tag === tag)?.name ?? tag,
      casterLevel,
      ...(tradition ? { tradition } : {}),
      spells: byId,
    });
  }
  return out;
}

/** Cost in gp to create an item of `marketPrice`: half, always. */
export function craftCost(marketPrice: number): number {
  return marketPrice / 2;
}

/** The Spellcraft DC to create an item of caster level `casterLevel`. */
export function craftDC(casterLevel: number): number {
  return 5 + casterLevel;
}

/**
 * How long creation takes. Potions and scrolls priced at 250 gp or less are
 * the 2-hour case; everything else is 1 day per 1,000 gp of base price, never
 * less than a day.
 */
export function craftTimeLabel(kind: ConsumableKind, marketPrice: number): string {
  if (kind !== "wand" && marketPrice <= 250) return "2 hours";
  const days = Math.max(1, Math.ceil(marketPrice / 1000));
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * The caster level to build an item at. `"min"` is the cheapest legal version;
 * a number is the player's pick, clamped between the minimum for that spell
 * level and the crafter's own caster level.
 */
export type CasterLevelChoice = "min" | number;

export function resolveCraftCasterLevel(
  spellLevel: number,
  choice: CasterLevelChoice,
  maxCasterLevel: number,
): number {
  const min = minCasterLevel(spellLevel);
  if (choice === "min") return min;
  return Math.min(Math.max(choice, min), Math.max(maxCasterLevel, min));
}

/** One craftable consumable, priced for this character. */
export interface CraftEntry {
  id: string;
  kind: ConsumableKind;
  spellId: string;
  spellName: string;
  /** Item name, with the tradition and any above-minimum caster level folded in. */
  name: string;
  /** The level this crafter casts the spell at. */
  spellLevel: number;
  casterLevel: number;
  minCasterLevel: number;
  /** Market price at `casterLevel` — what the item is worth once made. */
  price: number;
  /** Half of `price`: what creating it costs. */
  cost: number;
  dc: number;
  time: string;
  charges?: number;
  /** The spell has a material component whose cost is paid on top, in full. */
  needsMaterial: boolean;
  /** False when the crafter can't cast this spell (shown only on request). */
  castable: boolean;
}

/**
 * Build the craftable list for one class and kind, sorted by name.
 *
 * `includeUncastable` widens the list to every spell in the game, priced from
 * its cheapest list level, for the table that lets another caster stand in
 * (Cooperative Crafting, a hired NPC, a friend who owes you). Those rows carry
 * `castable: false` so the UI can warn rather than block, matching the soft
 * posture the feat-prereq checker already takes.
 */
export function generateCraftEntries(
  source: CraftSource,
  spells: Record<string, Spell>,
  kind: ConsumableKind,
  choice: CasterLevelChoice,
  includeUncastable = false,
): CraftEntry[] {
  const def = consumableKindDef(kind);
  if (!def) return [];
  const out: CraftEntry[] = [];

  for (const spell of Object.values(spells)) {
    const listLevel = source.spells.get(spell.id);
    const castable = listLevel !== undefined;
    if (!castable && !includeUncastable) continue;
    const spellLevel = listLevel ?? effectiveSpellLevel(spell);
    if (!isConsumableEligibleAt(spell, kind, spellLevel)) continue;

    const min = minCasterLevel(spellLevel);
    const casterLevel = castable
      ? resolveCraftCasterLevel(spellLevel, choice, source.casterLevel)
      : min;
    const price = consumablePriceAt(kind, spellLevel, casterLevel);
    out.push({
      id: `${kind}:${source.classTag}:${spell.id}`,
      kind,
      spellId: spell.id,
      spellName: spell.name,
      name: craftedItemName(def.namePrefix, spell.name, kind, source.tradition, casterLevel, min),
      spellLevel,
      casterLevel,
      minCasterLevel: min,
      price,
      cost: craftCost(price),
      dc: craftDC(casterLevel),
      time: craftTimeLabel(kind, price),
      ...(def.charges != null ? { charges: def.charges } : {}),
      needsMaterial: spell.components.material === true,
      castable,
    });
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * The name a crafted item carries into `build.gear`. Scrolls and wands take
 * their tradition, because whether a divine scroll is on your list decides
 * whether you need Use Magic Device to read it; potions are use-activated by
 * anyone and take none. The caster level is appended only when it is above the
 * minimum, so the ordinary case stays "Scroll of Fireball".
 */
export function craftedItemName(
  namePrefix: string,
  spellName: string,
  kind: ConsumableKind,
  tradition: CraftSource["tradition"],
  casterLevel: number,
  min: number,
): string {
  const parts: string[] = [];
  if (kind !== "potion" && tradition) parts.push(tradition);
  if (casterLevel > min) parts.push(`CL ${casterLevel}`);
  const suffix = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `${namePrefix} ${spellName}${suffix}`;
}

/**
 * Groups the flat `build.gear` list into display categories (Armor & Shields,
 * Potions & Consumables, Magic Items, Adventuring Gear, Other) and surfaces
 * the wear slot a resolved item claims, so the gear panel reads as sections
 * instead of one add-order list mixing a backpack with a suit of armor and a
 * wand.
 *
 * Categorization is display-only, same posture as `model/rarity.ts`: it never
 * touches `compute` or any derived number, and a miscategorized item is a
 * cosmetic annoyance, not a rules bug.
 *
 * Bucket rules, in display order:
 * - **Armor & Shields**: any `WornArmor` instance, or a linked item whose
 *   `subType` is `"armor"`.
 * - **Potions & Consumables**: linked items whose `subType` is one of
 *   `potion`/`poison`/`food`/`remedy`/`herb`/`misc` (the last catches the
 *   vendored alchemical splash items, e.g. Ghast Retch Flask, filed under a
 *   generic `misc` tag), plus the self-contained potions/scrolls/wands
 *   `model/consumables.ts` generates (no `itemId`, name like "Potion of Cure
 *   Light Wounds" — recognized by the same name prefix the generator uses).
 * - **Magic Items**: linked items whose `subType` is one of
 *   `wondrous`/`artifact`/`rod`/`staff`/`weapon` (a named magic weapon added
 *   via the item picker, not a `WeaponInstance`) or the vendored `other` tag
 *   (which the pipeline uses for a handful of metamagic rods, not a
 *   meaningful "not armor/consumable/gear" catch-all).
 * - **Adventuring Gear**: every other linked item (`gear`, `adventuring`,
 *   `tool`, `clothing`, and the long tail of small mundane subtypes, plus
 *   items with no `subType` at all, e.g. a plain Backpack).
 * - **Other**: free-text custom gear with no `itemId` and no recognizable
 *   consumable name.
 */

import type { Item, ItemInstance, RefData } from "@pf1/schema";

import { CONSUMABLE_KINDS } from "./consumables.js";
import { type CategoryGroup, groupByCategory } from "./grouping.js";

export type GearCategory = "armor" | "consumables" | "magic" | "adventuring" | "other";

/** Display order for the gear panel's group headers. */
export const GEAR_CATEGORY_ORDER: readonly GearCategory[] = [
  "armor",
  "consumables",
  "magic",
  "adventuring",
  "other",
];

export const GEAR_CATEGORY_LABEL: Readonly<Record<GearCategory, string>> = {
  armor: "Armor & Shields",
  consumables: "Potions & Consumables",
  magic: "Magic Items",
  adventuring: "Adventuring Gear",
  other: "Other",
};

const MAGIC_SUBTYPES = new Set(["wondrous", "artifact", "rod", "staff", "weapon", "other"]);
const CONSUMABLE_SUBTYPES = new Set(["potion", "poison", "food", "remedy", "herb", "misc"]);

/** True for a name `model/consumables.ts` would generate, e.g. "Potion of Cure Light Wounds". */
function isGeneratedConsumableName(name: string): boolean {
  return CONSUMABLE_KINDS.some((k) => name.startsWith(`${k.namePrefix} `));
}

/** The display category for one gear instance, given its resolved RefData item (if any). */
export function gearItemCategory(inst: ItemInstance, refData: RefData): GearCategory {
  if (inst.armor) return "armor";
  const itemDef: Item | undefined = inst.itemId ? refData.items[inst.itemId] : undefined;
  if (itemDef) {
    const subType = itemDef.subType;
    if (subType === "armor") return "armor";
    if (subType && CONSUMABLE_SUBTYPES.has(subType)) return "consumables";
    if (subType && MAGIC_SUBTYPES.has(subType)) return "magic";
    return "adventuring";
  }
  if (inst.name && isGeneratedConsumableName(inst.name)) return "consumables";
  return "other";
}

/** One gear row paired with its stable index into `build.gear`, for callbacks after grouping. */
export interface IndexedGear {
  inst: ItemInstance;
  index: number;
}

/**
 * Group `build.gear` into ordered, labeled sections, preserving add order
 * within each. Each item carries its original array index so the caller's
 * edit/remove/equip callbacks (which address gear by index) keep working
 * unchanged after the list is split into groups.
 */
export function groupGearByCategory(
  gear: readonly ItemInstance[],
  refData: RefData,
): CategoryGroup<IndexedGear, GearCategory>[] {
  const entries: IndexedGear[] = gear.map((inst, index) => ({ inst, index }));
  return groupByCategory(
    entries,
    (e) => gearItemCategory(e.inst, refData),
    GEAR_CATEGORY_ORDER,
    (c) => GEAR_CATEGORY_LABEL[c],
  );
}

/**
 * Raw `Item.slot`/`WornArmor.slot` strings, straight from the vendored data,
 * are messy: alongside the canonical PF1 magic-item slots (neck, ring, head,
 * shoulders, chest, body, belt, headband, wrists, hands, feet, eyes, plus
 * armor/shield for worn armor) there are one-off synonyms, typos, and
 * ambiguous multi-slot notes ("neck, ring, or none", "see text"). This maps
 * the recognizable synonyms onto a canonical slot and drops everything
 * ambiguous or compound to `undefined` (no badge) rather than guess wrong.
 */
const SLOT_ALIASES: Readonly<Record<string, string>> = {
  amulet: "neck",
  "neck or shoulders": "neck",
  "neck (but see text)": "neck",
  "none or neck": "neck",
  "neck or none (see text)": "neck",
  waist: "belt",
  eye: "eyes",
  face: "eyes",
  "armor (barding)": "armor",
  "arm or wrist": "wrists",
  cloak: "shoulders",
  shoulder: "shoulders",
};

/** Canonical slots a badge is shown for. `weapon`/`rod`/`held`-style tags are wielded, not worn, and are excluded. */
const RECOGNIZED_SLOTS = new Set([
  "neck",
  "ring",
  "head",
  "armor",
  "shoulders",
  "hands",
  "feet",
  "body",
  "belt",
  "headband",
  "wrists",
  "eyes",
  "shield",
  "chest",
  "clothing",
]);

export const SLOT_LABEL: Readonly<Record<string, string>> = {
  neck: "Neck",
  ring: "Ring",
  head: "Head",
  armor: "Armor",
  shoulders: "Shoulders",
  hands: "Hands",
  feet: "Feet",
  body: "Body",
  belt: "Belt",
  headband: "Headband",
  wrists: "Wrists",
  eyes: "Eyes",
  shield: "Shield",
  chest: "Chest",
  clothing: "Clothing",
};

/**
 * Canonical slot for a raw `Item.slot`/`WornArmor.slot` value, or `undefined`
 * for `"slotless"`, an unrecognized/ambiguous string, or a blank/absent slot.
 */
export function normalizeSlot(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().toLowerCase();
  if (!key || key === "slotless") return undefined;
  const canonical = SLOT_ALIASES[key] ?? key;
  return RECOGNIZED_SLOTS.has(canonical) ? canonical : undefined;
}

/**
 * The wear slot a gear instance occupies, or `undefined` when it has none
 * (mundane gear, a free-text custom entry, or an unrecognized/ambiguous raw
 * slot string). Worn armor/shields read their canonical slot straight off
 * `WornArmor.slot`; linked items go through {@link normalizeSlot}.
 */
export function gearItemSlot(inst: ItemInstance, refData: RefData): string | undefined {
  if (inst.armor) return inst.armor.slot;
  const itemDef = inst.itemId ? refData.items[inst.itemId] : undefined;
  return normalizeSlot(itemDef?.slot);
}

/** Slots exempt from the equipped-conflict check: not a one-per-character body slot in practice. */
const CONFLICT_EXEMPT_SLOTS = new Set(["clothing"]);
const RING_SLOT = "ring";
/** PF1 lets a character wear two rings (one per hand) before it's a real conflict. */
const RING_ALLOWANCE = 2;

/**
 * Indices into `gear` of every equipped item sharing a body slot with more
 * equipped items than that slot allows (2 for rings, 1 otherwise) — a soft
 * signal only, per PF1's one-item-per-slot rule (rings excepted). Never
 * blocks equipping; the caller decides how to show it.
 */
export function gearSlotConflicts(gear: readonly ItemInstance[], refData: RefData): Set<number> {
  const bySlot = new Map<string, number[]>();
  gear.forEach((inst, index) => {
    if (!inst.equipped) return;
    const slot = gearItemSlot(inst, refData);
    if (!slot || CONFLICT_EXEMPT_SLOTS.has(slot)) return;
    const indices = bySlot.get(slot);
    if (indices) indices.push(index);
    else bySlot.set(slot, [index]);
  });
  const conflicts = new Set<number>();
  for (const [slot, indices] of bySlot) {
    const allowance = slot === RING_SLOT ? RING_ALLOWANCE : 1;
    if (indices.length > allowance) {
      for (const i of indices) conflicts.add(i);
    }
  }
  return conflicts;
}

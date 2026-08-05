/**
 * Gear categorization (`model/gearCategories.ts`): bucketing a flat
 * `build.gear` list into Armor & Shields / Potions & Consumables / Magic
 * Items / Adventuring Gear / Other, plus wear-slot normalization and the
 * equipped-slot conflict check. Verified against the real vendored item slice
 * via `loadRefData()`, same posture as `rarity.test.ts`.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { ItemInstance } from "@pf1/schema";

import {
  gearItemCategory,
  gearItemSlot,
  gearSlotConflicts,
  groupGearByCategory,
  normalizeSlot,
} from "../src/model/gearCategories.js";

const ref = loadRefData();

// Concrete vendored ids used as fixtures below.
const RING_OF_PROTECTION = "0AIz2Gk74uaiLQIh"; // wondrous, slot ring
const ABROGALIAN_CORSET = "mi:abrogalian_corset"; // subType armor, slot armor
const ABSORBING_SHIELD = "mi:absorbing_shield"; // subType armor, slot shield
const SNAKE_OIL = "3V5aC0PcNcsBCEPh"; // subType potion
const GHAST_RETCH_FLASK = "2PN3qewFLwGkAfIv"; // subType misc (alchemical splash)
const ROPE = "qlmtnppwxkubqyhp"; // subType adventuring
const BACKPACK_COMMON = "lSCPUK5Ea6R0t4fz"; // no subType at all
const ABAT_NE = "mi:abat_ne_the_blackstone_mace"; // subType weapon, slot weapon
const METAMAGIC_ROD = Object.values(ref.items).find(
  (i) => i.subType === "other" && i.name.includes("Metamagic Rod"),
)!.id; // subType "other" -- a mislabeled rod, still a magic item
const BELT_ITEM = Object.values(ref.items).find((i) => i.slot === "waist")!.id;
const AMULET_ITEM = Object.values(ref.items).find((i) => i.slot === "amulet")!.id;
const EYE_ITEM = Object.values(ref.items).find((i) => i.slot === "eye")!.id;
const BARDING_ITEM = Object.values(ref.items).find((i) => i.slot === "armor (barding)")!.id;

function itemInst(itemId: string, opts?: Partial<ItemInstance>): ItemInstance {
  return { itemId, equipped: true, ...opts };
}

describe("gearItemCategory", () => {
  it("buckets worn armor/shield instances as armor regardless of itemId", () => {
    const inst: ItemInstance = { equipped: true, armor: { slot: "armor", ac: 4 } };
    expect(gearItemCategory(inst, ref)).toBe("armor");
    const shield: ItemInstance = { equipped: true, armor: { slot: "shield", ac: 2 } };
    expect(gearItemCategory(shield, ref)).toBe("armor");
  });

  it("buckets a linked item whose subType is armor as armor", () => {
    expect(gearItemCategory(itemInst(ABROGALIAN_CORSET), ref)).toBe("armor");
    expect(gearItemCategory(itemInst(ABSORBING_SHIELD), ref)).toBe("armor");
  });

  it("buckets potions, alchemical splash items, and generated consumable names as consumables", () => {
    expect(gearItemCategory(itemInst(SNAKE_OIL), ref)).toBe("consumables");
    expect(gearItemCategory(itemInst(GHAST_RETCH_FLASK), ref)).toBe("consumables");
    expect(
      gearItemCategory({ equipped: true, name: "Potion of Cure Light Wounds", price: 50 }, ref),
    ).toBe("consumables");
    expect(gearItemCategory({ equipped: true, name: "Scroll of Fireball" }, ref)).toBe(
      "consumables",
    );
    expect(gearItemCategory({ equipped: true, name: "Wand of Magic Missile" }, ref)).toBe(
      "consumables",
    );
  });

  it("buckets wondrous items, rings, and named magic weapons as magic items", () => {
    expect(gearItemCategory(itemInst(RING_OF_PROTECTION), ref)).toBe("magic");
    expect(gearItemCategory(itemInst(ABAT_NE), ref)).toBe("magic");
    expect(gearItemCategory(itemInst(METAMAGIC_ROD), ref)).toBe("magic");
  });

  it("buckets mundane gear (rope, a plain backpack with no subType) as adventuring gear", () => {
    expect(gearItemCategory(itemInst(ROPE), ref)).toBe("adventuring");
    expect(gearItemCategory(itemInst(BACKPACK_COMMON), ref)).toBe("adventuring");
  });

  it("buckets an unresolvable custom item (no itemId, no recognizable name) as other", () => {
    expect(gearItemCategory({ equipped: true, name: "Grandma's Locket" }, ref)).toBe("other");
  });
});

describe("groupGearByCategory", () => {
  it("orders sections Armor & Shields, Potions & Consumables, Magic Items, Adventuring Gear, Other", () => {
    const gear: ItemInstance[] = [
      { equipped: true, name: "Custom Trinket" },
      itemInst(ROPE),
      itemInst(RING_OF_PROTECTION),
      itemInst(SNAKE_OIL),
      { equipped: true, armor: { slot: "armor", ac: 4 } },
    ];
    const groups = groupGearByCategory(gear, ref);
    expect(groups.map((g) => g.category)).toEqual([
      "armor",
      "consumables",
      "magic",
      "adventuring",
      "other",
    ]);
  });

  it("preserves add order within a section and keeps each item's original gear index", () => {
    const gear: ItemInstance[] = [itemInst(ROPE), itemInst(BACKPACK_COMMON)];
    const [group] = groupGearByCategory(gear, ref);
    expect(group?.items.map((e) => e.index)).toEqual([0, 1]);
    expect(group?.items.map((e) => e.inst.itemId)).toEqual([ROPE, BACKPACK_COMMON]);
  });

  it("omits empty sections", () => {
    const groups = groupGearByCategory([itemInst(ROPE)], ref);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.category).toBe("adventuring");
  });
});

describe("normalizeSlot", () => {
  it("maps the documented messy stragglers onto a canonical slot", () => {
    expect(normalizeSlot("amulet")).toBe("neck");
    expect(normalizeSlot("neck or shoulders")).toBe("neck");
    expect(normalizeSlot("waist")).toBe("belt");
    expect(normalizeSlot("eye")).toBe("eyes");
    expect(normalizeSlot("face")).toBe("eyes");
    expect(normalizeSlot("armor (barding)")).toBe("armor");
  });

  it("passes canonical slots through unchanged", () => {
    for (const slot of ["neck", "ring", "head", "armor", "shoulders", "shield", "chest"]) {
      expect(normalizeSlot(slot)).toBe(slot);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeSlot(" Amulet ")).toBe("neck");
    expect(normalizeSlot("WAIST")).toBe("belt");
  });

  it("treats slotless and absent as no slot", () => {
    expect(normalizeSlot("slotless")).toBeUndefined();
    expect(normalizeSlot(undefined)).toBeUndefined();
    expect(normalizeSlot("")).toBeUndefined();
  });

  it("drops ambiguous multi-slot and held/wielded strings rather than guessing", () => {
    expect(normalizeSlot("neck, ring, or none")).toBeUndefined();
    expect(normalizeSlot("see text")).toBeUndefined();
    expect(normalizeSlot("weapon")).toBeUndefined();
    expect(normalizeSlot("rod")).toBeUndefined();
  });
});

describe("gearItemSlot", () => {
  it("reads a worn armor/shield's canonical slot directly", () => {
    expect(gearItemSlot({ equipped: true, armor: { slot: "armor", ac: 4 } }, ref)).toBe("armor");
    expect(gearItemSlot({ equipped: true, armor: { slot: "shield", ac: 2 } }, ref)).toBe("shield");
  });

  it("normalizes a linked item's real vendored straggler slot values", () => {
    expect(gearItemSlot(itemInst(BELT_ITEM), ref)).toBe("belt");
    expect(gearItemSlot(itemInst(AMULET_ITEM), ref)).toBe("neck");
    expect(gearItemSlot(itemInst(EYE_ITEM), ref)).toBe("eyes");
    expect(gearItemSlot(itemInst(BARDING_ITEM), ref)).toBe("armor");
  });

  it("returns undefined for mundane gear and unresolvable custom entries", () => {
    expect(gearItemSlot(itemInst(ROPE), ref)).toBeUndefined();
    expect(gearItemSlot({ equipped: true, name: "Custom Trinket" }, ref)).toBeUndefined();
  });
});

describe("gearSlotConflicts", () => {
  it("flags two equipped items in the same body slot", () => {
    const gear: ItemInstance[] = [
      { equipped: true, armor: { slot: "armor", ac: 4 } },
      itemInst(ABROGALIAN_CORSET), // also slot "armor"
    ];
    const conflicts = gearSlotConflicts(gear, ref);
    expect(conflicts).toEqual(new Set([0, 1]));
  });

  it("does not flag a single item in a slot", () => {
    const gear: ItemInstance[] = [{ equipped: true, armor: { slot: "armor", ac: 4 } }];
    expect(gearSlotConflicts(gear, ref).size).toBe(0);
  });

  it("does not flag items in different slots", () => {
    const gear: ItemInstance[] = [
      { equipped: true, armor: { slot: "armor", ac: 4 } },
      { equipped: true, armor: { slot: "shield", ac: 2 } },
    ];
    expect(gearSlotConflicts(gear, ref).size).toBe(0);
  });

  it("ignores unequipped items entirely", () => {
    const gear: ItemInstance[] = [
      { equipped: true, armor: { slot: "armor", ac: 4 } },
      { equipped: false, armor: { slot: "armor", ac: 6 } },
    ];
    expect(gearSlotConflicts(gear, ref).size).toBe(0);
  });

  it("allows two equipped rings before flagging a conflict", () => {
    const gear: ItemInstance[] = [itemInst(RING_OF_PROTECTION), itemInst(RING_OF_PROTECTION)];
    expect(gearSlotConflicts(gear, ref).size).toBe(0);
  });

  it("flags a third equipped ring", () => {
    const gear: ItemInstance[] = [
      itemInst(RING_OF_PROTECTION),
      itemInst(RING_OF_PROTECTION),
      itemInst(RING_OF_PROTECTION),
    ];
    expect(gearSlotConflicts(gear, ref)).toEqual(new Set([0, 1, 2]));
  });
});

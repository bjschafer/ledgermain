/**
 * Unit tests for gear-related doc transitions: addGearItem, addWornArmor,
 * setGearEquipped, removeGear, plus issue #16 additions (quantity, charges,
 * custom gear, money).
 */
import { describe, expect, it } from "bun:test";

import type { ArmorRef, WornArmor } from "@pf1/schema";

import {
  addCustomGearItem,
  addGearItem,
  addWornArmor,
  addWornArmorFromRef,
  createEmptyDoc,
  removeGear,
  setGearCharges,
  setGearDetails,
  setGearEquipped,
  setGearQuantity,
  setMoney,
  updateGearItem,
} from "../src/model/doc.js";

function doc() {
  return createEmptyDoc("t");
}

const CHAINMAIL: WornArmor = { slot: "armor", ac: 4, maxDex: 3, acp: -2, type: 2 };
const SHIELD: WornArmor = { slot: "shield", ac: 2, acp: 0 };

// ---------------------------------------------------------------------------
// addGearItem
// ---------------------------------------------------------------------------
describe("addGearItem()", () => {
  it("appends an item instance with the given itemId, equipped by default", () => {
    const d = addGearItem(doc(), "ring-of-protection");
    expect(d.build.gear).toHaveLength(1);
    const inst = d.build.gear[0]!;
    expect(inst.itemId).toBe("ring-of-protection");
    expect(inst.equipped).toBe(true);
  });

  it("can add multiple items (no deduplication)", () => {
    const d = addGearItem(addGearItem(doc(), "item-a"), "item-a");
    expect(d.build.gear).toHaveLength(2);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addGearItem(d, "ring-of-protection");
    expect(d.build.gear).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addWornArmor
// ---------------------------------------------------------------------------
describe("addWornArmor()", () => {
  it("appends an armor instance, equipped by default", () => {
    const d = addWornArmor(doc(), CHAINMAIL, "Chainmail");
    expect(d.build.gear).toHaveLength(1);
    const inst = d.build.gear[0]!;
    expect(inst.equipped).toBe(true);
    expect(inst.name).toBe("Chainmail");
    expect(inst.armor).toEqual(CHAINMAIL);
    expect(inst.itemId).toBeUndefined();
  });

  it("allows both armor and shield to coexist", () => {
    let d = addWornArmor(doc(), CHAINMAIL, "Breastplate");
    d = addWornArmor(d, SHIELD, "Heavy Steel Shield");
    expect(d.build.gear).toHaveLength(2);
    expect(d.build.gear[0]!.armor?.slot).toBe("armor");
    expect(d.build.gear[1]!.armor?.slot).toBe("shield");
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addWornArmor(d, CHAINMAIL, "Chainmail");
    expect(d.build.gear).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// addWornArmorFromRef
// ---------------------------------------------------------------------------
const FULL_PLATE: ArmorRef = {
  id: "h65qEp22nsyRoeRa",
  name: "Full Plate",
  uuid: "Compendium.pf1.armors-and-shields.Item.h65qEp22nsyRoeRa",
  slot: "armor",
  ac: 9,
  maxDex: 1,
  acp: 6,
  weightClass: 3,
  proficiency: "heavyArmor",
};
const COMP_BUCKLER: ArmorRef = {
  id: "gsE0PAOmCwivue5A",
  name: "Buckler",
  uuid: "Compendium.pf1.armors-and-shields.Item.gsE0PAOmCwivue5A",
  slot: "shield",
  ac: 1,
  acp: 1,
};

describe("addWornArmorFromRef()", () => {
  it("snapshots Full Plate onto a WornArmor (ACP negated, weightClass → type)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE);
    expect(d.build.gear).toHaveLength(1);
    const inst = d.build.gear[0]!;
    expect(inst.equipped).toBe(true);
    expect(inst.armorId).toBe("h65qEp22nsyRoeRa");
    expect(inst.name).toBe("Full Plate");
    expect(inst.armor).toEqual({
      slot: "armor",
      ac: 9,
      maxDex: 1,
      acp: -6,
      type: 3,
    } satisfies WornArmor);
    // never sets itemId (base armor lives in RefData.armors, not .items)
    expect(inst.itemId).toBeUndefined();
  });

  it("omits type for shields (slot identifies them; engine derives armor.type from body armor only)", () => {
    const d = addWornArmorFromRef(doc(), COMP_BUCKLER);
    const inst = d.build.gear[0]!;
    expect(inst.armor).toEqual({ slot: "shield", ac: 1, acp: -1 });
    expect(inst.armorId).toBe("gsE0PAOmCwivue5A");
  });

  it("omits ACP entirely when the ref carries none", () => {
    const padded: ArmorRef = {
      ...COMP_BUCKLER,
      id: "x",
      name: "Padded",
      slot: "armor",
      ac: 1,
      acp: undefined,
    };
    const d = addWornArmorFromRef(doc(), padded);
    expect(d.build.gear[0]!.armor).toEqual({ slot: "armor", ac: 1 });
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addWornArmorFromRef(d, FULL_PLATE);
    expect(d.build.gear).toHaveLength(0);
  });

  it("applies mithral: weight class 3→2, maxDex 1→3, acp 6→3, name prefixed", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 0, "mithral");
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Mithral Full Plate");
    expect(inst.armor).toEqual({
      slot: "armor",
      ac: 9,
      material: "mithral",
      maxDex: 3,
      acp: -3,
      type: 2,
    } satisfies WornArmor);
  });

  it("applies +3 enhancement: name suffix, enhancement field set", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 3);
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Full Plate +3");
    expect(inst.armor!.enhancement).toBe(3);
  });

  it("combines mithral + enhancement: 'Mithral Full Plate +3'", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 3, "mithral");
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Mithral Full Plate +3");
    expect(inst.armor!.enhancement).toBe(3);
    expect(inst.armor!.material).toBe("mithral");
    expect(inst.armor!.maxDex).toBe(3); // 1 + 2 mithral
    // -(6 - 3 mithral - 1 masterwork-implied-by-enhancement, B3)
    expect(inst.armor!.acp).toBe(-2);
    expect(inst.armor!.type).toBe(2); // 3 - 1 mithral
  });

  it("adamantine is display-only (no stat modifiers)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 0, "adamantine");
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Adamantine Full Plate");
    expect(inst.armor!.material).toBe("adamantine");
    // stats unchanged from base
    expect(inst.armor!.maxDex).toBe(1);
    expect(inst.armor!.acp).toBe(-6);
    expect(inst.armor!.type).toBe(3);
  });

  it("steel is the default (no prefix, no material field)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 0, "steel");
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Full Plate");
    expect(inst.armor!.material).toBeUndefined();
  });

  it("stores armor abilities (all display-only)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 2, "mithral", [
      "light-fortification",
      "ghost-touch",
    ]);
    const inst = d.build.gear[0]!;
    expect(inst.armor!.abilities).toEqual(["light-fortification", "ghost-touch"]);
    expect(inst.armor!.enhancement).toBe(2);
    expect(inst.armor!.material).toBe("mithral");
    // abilities don't modify stats (all display-only for armor)
    expect(inst.armor!.ac).toBe(9);
    expect(inst.armor!.maxDex).toBe(3); // mithral +2
  });

  it("no abilities → no abilities field on the WornArmor", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE);
    expect(d.build.gear[0]!.armor!.abilities).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // masterwork (B3)
  // -------------------------------------------------------------------------
  const CHAIN_SHIRT: ArmorRef = {
    id: "chain-shirt",
    name: "Chain Shirt",
    uuid: "Compendium.pf1.armors-and-shields.Item.chainShirt",
    slot: "armor",
    ac: 4,
    maxDex: 4,
    acp: 2,
    weightClass: 1,
    proficiency: "lightArmor",
  };
  const BREASTPLATE: ArmorRef = {
    id: "breastplate",
    name: "Breastplate",
    uuid: "Compendium.pf1.armors-and-shields.Item.breastplate",
    slot: "armor",
    ac: 6,
    maxDex: 3,
    acp: 4,
    weightClass: 2,
    proficiency: "mediumArmor",
  };
  const PADDED: ArmorRef = {
    id: "padded",
    name: "Padded",
    uuid: "Compendium.pf1.armors-and-shields.Item.padded",
    slot: "armor",
    ac: 1,
    maxDex: 8,
    acp: 0,
    weightClass: 1,
    proficiency: "lightArmor",
  };

  it("masterwork chain shirt: ACP -2 reduced to -1, name prefixed", () => {
    const d = addWornArmorFromRef(doc(), CHAIN_SHIRT, 0, undefined, undefined, true);
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Masterwork Chain Shirt");
    expect(inst.armor!.acp).toBe(-1);
    expect(inst.armor!.masterwork).toBe(true);
  });

  it("masterwork breastplate: ACP -4 reduced to -3", () => {
    const d = addWornArmorFromRef(doc(), BREASTPLATE, 0, undefined, undefined, true);
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Masterwork Breastplate");
    expect(inst.armor!.acp).toBe(-3);
  });

  it("+1 breastplate (no explicit masterwork flag): ACP still reduced to -3, masterwork not stored", () => {
    const d = addWornArmorFromRef(doc(), BREASTPLATE, 1);
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Breastplate +1");
    expect(inst.armor!.acp).toBe(-3);
    expect(inst.armor!.masterwork).toBeUndefined();
  });

  it("masterwork name prefix present at +0, absent at +1 (implied instead)", () => {
    const atZero = addWornArmorFromRef(doc(), CHAIN_SHIRT, 0, undefined, undefined, true);
    expect(atZero.build.gear[0]!.name).toBe("Masterwork Chain Shirt");

    const atPlusOne = addWornArmorFromRef(doc(), CHAIN_SHIRT, 1, undefined, undefined, true);
    expect(atPlusOne.build.gear[0]!.name).toBe("Chain Shirt +1");
    expect(atPlusOne.build.gear[0]!.armor!.masterwork).toBeUndefined();
  });

  it("masterwork armor with 0 base ACP stays clamped at 0 (no acp key)", () => {
    const d = addWornArmorFromRef(doc(), PADDED, 0, undefined, undefined, true);
    const inst = d.build.gear[0]!;
    expect(inst.armor!.acp).toBeUndefined();
    expect(inst.armor!.masterwork).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setGearEquipped
// ---------------------------------------------------------------------------
describe("setGearEquipped()", () => {
  it("unequips a gear item at the given index", () => {
    const d = setGearEquipped(addGearItem(doc(), "item-a"), 0, false);
    expect(d.build.gear[0]!.equipped).toBe(false);
  });

  it("re-equips a previously unequipped item", () => {
    const unequipped = setGearEquipped(addGearItem(doc(), "item-a"), 0, false);
    const reequipped = setGearEquipped(unequipped, 0, true);
    expect(reequipped.build.gear[0]!.equipped).toBe(true);
  });

  it("only modifies the specified index", () => {
    let d = addGearItem(doc(), "item-a");
    d = addGearItem(d, "item-b");
    d = setGearEquipped(d, 0, false);
    expect(d.build.gear[0]!.equipped).toBe(false);
    expect(d.build.gear[1]!.equipped).toBe(true);
  });

  it("is a no-op for out-of-range index", () => {
    const d = addGearItem(doc(), "item-a");
    expect(setGearEquipped(d, 5, false)).toBe(d);
    expect(setGearEquipped(d, -1, false)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addGearItem(doc(), "item-a");
    setGearEquipped(d, 0, false);
    expect(d.build.gear[0]!.equipped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeGear
// ---------------------------------------------------------------------------
describe("removeGear()", () => {
  it("removes the item at the given index", () => {
    const d = removeGear(addGearItem(doc(), "item-a"), 0);
    expect(d.build.gear).toHaveLength(0);
  });

  it("removes only the specified item when multiple exist", () => {
    let d = addGearItem(doc(), "item-a");
    d = addGearItem(d, "item-b");
    d = addGearItem(d, "item-c");
    d = removeGear(d, 1);
    expect(d.build.gear).toHaveLength(2);
    expect(d.build.gear[0]!.itemId).toBe("item-a");
    expect(d.build.gear[1]!.itemId).toBe("item-c");
  });

  it("is a no-op for out-of-range index", () => {
    const d = addGearItem(doc(), "item-a");
    expect(removeGear(d, 5)).toBe(d);
    expect(removeGear(d, -1)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addGearItem(doc(), "item-a");
    removeGear(d, 0);
    expect(d.build.gear).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateGearItem
// ---------------------------------------------------------------------------
describe("updateGearItem()", () => {
  it("patches armor stats + name on the gear item at the given index", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 2, "mithral");
    const updated = updateGearItem(d, 0, {
      armor: { ...d.build.gear[0]!.armor!, enhancement: 3 },
      name: "Mithral Full Plate +3",
    });
    expect(updated.build.gear[0]!.armor!.enhancement).toBe(3);
    expect(updated.build.gear[0]!.name).toBe("Mithral Full Plate +3");
    // other fields preserved
    expect(updated.build.gear[0]!.armor!.ac).toBe(9);
    expect(updated.build.gear[0]!.armorId).toBe("h65qEp22nsyRoeRa");
  });

  it("clamps armor enhancement to [0, 10]", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE);
    const updated = updateGearItem(d, 0, {
      armor: { ...d.build.gear[0]!.armor!, enhancement: 99 },
    });
    expect(updated.build.gear[0]!.armor!.enhancement).toBe(10);
  });

  it("is a no-op for out-of-range index", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE);
    expect(updateGearItem(d, 5, { name: "x" })).toBe(d);
    expect(updateGearItem(d, -1, { name: "x" })).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 2);
    updateGearItem(d, 0, { name: "changed" });
    expect(d.build.gear[0]!.name).toBe("Full Plate +2");
  });

  it("drops masterwork once enhancement becomes positive (B3 invariant)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 0, undefined, undefined, true);
    expect(d.build.gear[0]!.armor!.masterwork).toBe(true);
    const updated = updateGearItem(d, 0, {
      armor: { ...d.build.gear[0]!.armor!, enhancement: 2 },
    });
    expect(updated.build.gear[0]!.armor!.masterwork).toBeUndefined();
    expect(updated.build.gear[0]!.armor!.enhancement).toBe(2);
  });

  // -------------------------------------------------------------------------
  // arcane spell failure (ASF) snapshot + mithral -10% (issue #8)
  // -------------------------------------------------------------------------
  const FULL_PLATE_ASF: ArmorRef = { ...FULL_PLATE, asf: 35 };

  it("snapshots ASF from the ref", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE_ASF);
    expect(d.build.gear[0]!.armor!.asf).toBe(35);
  });

  it("mithral reduces ASF by 10%", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE_ASF, 0, "mithral");
    expect(d.build.gear[0]!.armor!.asf).toBe(25);
  });

  it("adamantine does not affect ASF (display-only material)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE_ASF, 0, "adamantine");
    expect(d.build.gear[0]!.armor!.asf).toBe(35);
  });

  it("mithral never reduces ASF below 0 (0 is omitted, same convention as ACP/weight)", () => {
    const lowAsf: ArmorRef = { ...FULL_PLATE, id: "y", asf: 5 };
    const d = addWornArmorFromRef(doc(), lowAsf, 0, "mithral");
    expect(d.build.gear[0]!.armor!.asf).toBeUndefined();
  });

  it("omits ASF entirely when the ref carries none", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE); // no asf field
    expect(d.build.gear[0]!.armor!.asf).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// armor special-ability +10 cap (issue #8) — mirrors the weapon invariant
// ---------------------------------------------------------------------------
describe("armor special abilities are capped at +10 combined bonus-equivalent (issue #8)", () => {
  it("keeps abilities whose combined cost + enhancement is within budget", () => {
    // light-fortification(+1) + medium-fortification(+3) + heavy-fortification(+5) = 9,
    // plus enhancement 1 = 10 exactly at the cap.
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 1, undefined, [
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
    ]);
    expect(d.build.gear[0]!.armor!.abilities).toEqual([
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
    ]);
  });

  it("truncates abilities beyond the +10 cap, keeping earliest-selected first", () => {
    // Same three (cost 9) plus armor-ghost-touch (+3) would total 12 against
    // a budget of 9 (enhancement 1) — the last one is dropped.
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 1, undefined, [
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
      "armor-ghost-touch",
    ]);
    expect(d.build.gear[0]!.armor!.abilities).toEqual([
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
    ]);
  });

  it("drops all abilities when enhancement is 0 (a mundane suit can't carry a special ability)", () => {
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 0, undefined, ["light-fortification"]);
    expect(d.build.gear[0]!.armor!.abilities).toBeUndefined();
  });

  it("addWornArmor() (hand-entered) enforces the same cap", () => {
    const overCap: WornArmor = {
      slot: "armor",
      ac: 9,
      enhancement: 1,
      abilities: ["light-fortification", "medium-fortification", "heavy-fortification", "bashing"],
    };
    const d = addWornArmor(doc(), overCap, "Custom Full Plate");
    // budget = 10 - 1 = 9; light(1) + medium(3) + heavy(5) = 9 exactly, bashing(1) dropped.
    expect(d.build.gear[0]!.armor!.abilities).toEqual([
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
    ]);
  });

  it("updateGearItem() re-enforces the cap when enhancement is lowered", () => {
    // enhancement 1, budget 9: light(1) + medium(3) + heavy(5) = 9, exact fit.
    const d = addWornArmorFromRef(doc(), FULL_PLATE, 1, undefined, [
      "light-fortification",
      "medium-fortification",
      "heavy-fortification",
    ]);
    expect(d.build.gear[0]!.armor!.abilities).toHaveLength(3);
    // Lower enhancement to 0: abilities require enhancement >= 1, so all are dropped
    // (re-evaluated against the new enhancement, not trusted as already valid).
    const loweredToZero = updateGearItem(d, 0, {
      armor: { ...d.build.gear[0]!.armor!, enhancement: 0 },
    });
    expect(loweredToZero.build.gear[0]!.armor!.abilities).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// addCustomGearItem (issue #16)
// ---------------------------------------------------------------------------
describe("addCustomGearItem()", () => {
  it("appends a free-text gear entry with weight/price/quantity", () => {
    const d = addCustomGearItem(doc(), "Arrows", { weight: 0.15, price: 0.05, quantity: 20 });
    expect(d.build.gear).toHaveLength(1);
    const inst = d.build.gear[0]!;
    expect(inst.name).toBe("Arrows");
    expect(inst.equipped).toBe(true);
    expect(inst.weight).toBe(0.15);
    expect(inst.price).toBe(0.05);
    expect(inst.quantity).toBe(20);
    expect(inst.itemId).toBeUndefined();
  });

  it("omits quantity when it's the implicit default of 1", () => {
    const d = addCustomGearItem(doc(), "Rope", { weight: 10 });
    expect(d.build.gear[0]!.quantity).toBeUndefined();
  });

  it("omits weight/price when zero or absent", () => {
    const d = addCustomGearItem(doc(), "Trinket");
    expect(d.build.gear[0]!.weight).toBeUndefined();
    expect(d.build.gear[0]!.price).toBeUndefined();
  });

  it("stores charges for a self-contained consumable (a generated wand, #36)", () => {
    const d = addCustomGearItem(doc(), "Wand of Cure Light Wounds", { price: 750, charges: 50 });
    const inst = d.build.gear[0]!;
    expect(inst.charges).toBe(50);
    expect(inst.price).toBe(750);
    // A potion carries no charges.
    const p = addCustomGearItem(doc(), "Potion of Cure Light Wounds", { price: 50 });
    expect(p.build.gear[0]!.charges).toBeUndefined();
  });

  it("trims the name and is a no-op for a blank name", () => {
    const trimmed = addCustomGearItem(doc(), "  Rations  ");
    expect(trimmed.build.gear[0]!.name).toBe("Rations");
    const blank = addCustomGearItem(doc(), "   ");
    expect(blank.build.gear).toHaveLength(0);
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    addCustomGearItem(d, "Arrows", { quantity: 20 });
    expect(d.build.gear).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// setGearQuantity (issue #16)
// ---------------------------------------------------------------------------
describe("setGearQuantity()", () => {
  it("sets a quantity on a gear entry", () => {
    const d = setGearQuantity(addGearItem(doc(), "arrow"), 0, 20);
    expect(d.build.gear[0]!.quantity).toBe(20);
  });

  it("deletes the key when set back to 1 (the implicit default)", () => {
    const withQty = setGearQuantity(addGearItem(doc(), "arrow"), 0, 20);
    const back = setGearQuantity(withQty, 0, 1);
    expect(back.build.gear[0]!.quantity).toBeUndefined();
  });

  it("clamps to [0, 99999]", () => {
    const d = setGearQuantity(addGearItem(doc(), "arrow"), 0, -5);
    expect(d.build.gear[0]!.quantity).toBe(0);
    const over = setGearQuantity(addGearItem(doc(), "arrow"), 0, 1_000_000);
    expect(over.build.gear[0]!.quantity).toBe(99999);
  });

  it("is a no-op for out-of-range index", () => {
    const d = addGearItem(doc(), "arrow");
    expect(setGearQuantity(d, 5, 3)).toBe(d);
    expect(setGearQuantity(d, -1, 3)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addGearItem(doc(), "arrow");
    setGearQuantity(d, 0, 20);
    expect(d.build.gear[0]!.quantity).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setGearCharges (issue #16)
// ---------------------------------------------------------------------------
describe("setGearCharges()", () => {
  it("sets charges used on a gear entry", () => {
    const d = setGearCharges(addGearItem(doc(), "staff-of-healing"), 0, 3);
    expect(d.build.gear[0]!.chargesUsed).toBe(3);
  });

  it("deletes the key when set back to 0 (full charges)", () => {
    const withCharges = setGearCharges(addGearItem(doc(), "staff-of-healing"), 0, 3);
    const back = setGearCharges(withCharges, 0, 0);
    expect(back.build.gear[0]!.chargesUsed).toBeUndefined();
  });

  it("clamps negative/NaN input to 0", () => {
    const d = setGearCharges(addGearItem(doc(), "staff-of-healing"), 0, -3);
    expect(d.build.gear[0]!.chargesUsed).toBeUndefined();
  });

  it("is a no-op for out-of-range index", () => {
    const d = addGearItem(doc(), "staff-of-healing");
    expect(setGearCharges(d, 5, 3)).toBe(d);
  });
});

// ---------------------------------------------------------------------------
// setGearDetails — post-creation editing of any non-armor gear row
// ---------------------------------------------------------------------------
describe("setGearDetails()", () => {
  const BASE = { name: "Wand", quantity: 1, weight: 0, price: 0, charges: 0, chargesUsed: 0 };

  it("rewrites a hand-entered wand's cap and spent charges", () => {
    // The import case: a wand that came in as "47 charges" is really a
    // 50-charge wand with 3 used.
    const d = addCustomGearItem(doc(), "Wand of Cure Light Wounds", { charges: 47 });
    const edited = setGearDetails(d, 0, {
      ...BASE,
      name: "Wand of Cure Light Wounds",
      charges: 50,
      chargesUsed: 3,
    });
    expect(edited.build.gear[0]).toMatchObject({ charges: 50, chargesUsed: 3 });
  });

  it("clamps charges used to the cap", () => {
    const d = addCustomGearItem(doc(), "Wand", { charges: 50 });
    const edited = setGearDetails(d, 0, { ...BASE, charges: 50, chargesUsed: 99 });
    expect(edited.build.gear[0]!.chargesUsed).toBe(50);
  });

  it("deletes zero/default keys so a RefData-linked item falls back to the reference", () => {
    const d = setGearDetails(addGearItem(doc(), "staff-of-healing"), 0, {
      ...BASE,
      name: "Staff of Healing",
    });
    const inst = d.build.gear[0]!;
    expect(inst.itemId).toBe("staff-of-healing");
    expect(inst.quantity).toBeUndefined();
    expect(inst.weight).toBeUndefined();
    expect(inst.price).toBeUndefined();
    expect(inst.charges).toBeUndefined();
    expect(inst.chargesUsed).toBeUndefined();
  });

  it("overrides weight/price/name on a RefData-linked item", () => {
    const d = setGearDetails(addGearItem(doc(), "arrow"), 0, {
      ...BASE,
      name: "Cold Iron Arrows",
      quantity: 20,
      weight: 0.15,
      price: 0.2,
    });
    expect(d.build.gear[0]).toMatchObject({
      itemId: "arrow",
      name: "Cold Iron Arrows",
      quantity: 20,
      weight: 0.15,
      price: 0.2,
    });
  });

  it("drops a blank name rather than storing an empty string", () => {
    const d = setGearDetails(addCustomGearItem(doc(), "Rope"), 0, { ...BASE, name: "   " });
    expect(d.build.gear[0]!.name).toBeUndefined();
  });

  it("is a no-op for out-of-range index", () => {
    const d = addCustomGearItem(doc(), "Rope");
    expect(setGearDetails(d, 5, BASE)).toBe(d);
    expect(setGearDetails(d, -1, BASE)).toBe(d);
  });

  it("does not mutate the original doc", () => {
    const d = addCustomGearItem(doc(), "Rope");
    setGearDetails(d, 0, { ...BASE, name: "Silk Rope", weight: 5 });
    expect(d.build.gear[0]).toEqual({ equipped: true, name: "Rope" });
  });
});

// ---------------------------------------------------------------------------
// setMoney (issue #16)
// ---------------------------------------------------------------------------
describe("setMoney()", () => {
  it("sets one denomination", () => {
    const d = setMoney(doc(), "gp", 150);
    expect(d.live.money).toEqual({ gp: 150 });
  });

  it("accumulates multiple denominations independently", () => {
    let d = setMoney(doc(), "gp", 150);
    d = setMoney(d, "sp", 20);
    d = setMoney(d, "pp", 2);
    expect(d.live.money).toEqual({ gp: 150, sp: 20, pp: 2 });
  });

  it("setting a denomination to 0 removes that key", () => {
    const withGp = setMoney(doc(), "gp", 150);
    const cleared = setMoney(withGp, "gp", 0);
    expect(cleared.live.money).toBeUndefined();
  });

  it("clamps negative/NaN input to 0 (removes the key)", () => {
    const d = setMoney(doc(), "cp", -5);
    expect(d.live.money).toBeUndefined();
  });

  it("does not mutate the original doc", () => {
    const d = doc();
    setMoney(d, "gp", 100);
    expect(d.live.money).toBeUndefined();
  });
});

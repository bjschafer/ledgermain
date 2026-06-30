/**
 * Unit tests for gear-related doc transitions: addGearItem, addWornArmor,
 * setGearEquipped, removeGear.
 */
import { describe, expect, it } from "bun:test";

import type { ArmorRef, WornArmor } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
	addGearItem,
	addWornArmor,
	addWornArmorFromRef,
	removeGear,
	setGearEquipped,
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

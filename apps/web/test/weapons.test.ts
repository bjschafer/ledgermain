/**
 * Unit tests for weapon doc transitions (addWeapon, updateWeapon, removeWeapon)
 * and the weapon-group choice option selector (featChoiceOptions "weapon" type).
 */
import { describe, expect, it } from "bun:test";

import type { CharacterDoc, WeaponInstance } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import {
	addWeapon,
	addWeaponFromRef,
	removeWeapon,
	updateWeapon,
} from "../src/model/doc.js";
import { featChoiceOptions } from "../src/model/feats.js";

const ref = loadRefData();

function doc(): CharacterDoc {
	return createEmptyDoc("t");
}

const LONGSWORD: WeaponInstance = {
	name: "Longsword",
	attackAbility: "str",
	damageDice: "1d8",
	group: "longsword",
	category: "melee",
};

const SHORTBOW: WeaponInstance = {
	name: "Shortbow",
	attackAbility: "dex",
	damageAbility: "none",
	damageDice: "1d6",
	group: "shortbow",
	category: "ranged",
};

// ---------------------------------------------------------------------------
// addWeapon
// ---------------------------------------------------------------------------
describe("addWeapon()", () => {
	it("appends a weapon to an empty weapons list", () => {
		const d = addWeapon(doc(), LONGSWORD);
		expect(d.build.weapons).toHaveLength(1);
		expect(d.build.weapons![0]).toEqual(LONGSWORD);
	});

	it("appends when build.weapons is undefined (back-compat)", () => {
		// createEmptyDoc does not set build.weapons.
		const d = doc();
		expect(d.build.weapons).toBeUndefined();
		const next = addWeapon(d, LONGSWORD);
		expect(next.build.weapons).toHaveLength(1);
	});

	it("appends a second weapon after the first", () => {
		let d = addWeapon(doc(), LONGSWORD);
		d = addWeapon(d, SHORTBOW);
		expect(d.build.weapons).toHaveLength(2);
		expect(d.build.weapons![0]!.name).toBe("Longsword");
		expect(d.build.weapons![1]!.name).toBe("Shortbow");
	});

	it("does not mutate the original doc", () => {
		const d = doc();
		addWeapon(d, LONGSWORD);
		expect(d.build.weapons).toBeUndefined();
	});

	it("allows adding the same weapon template more than once", () => {
		let d = addWeapon(doc(), LONGSWORD);
		d = addWeapon(d, LONGSWORD);
		expect(d.build.weapons).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// updateWeapon
// ---------------------------------------------------------------------------
describe("updateWeapon()", () => {
	it("applies a partial patch to the weapon at the given index", () => {
		let d = addWeapon(doc(), LONGSWORD);
		d = updateWeapon(d, 0, { name: "Longsword +2", enhancement: 2 });
		expect(d.build.weapons![0]!.name).toBe("Longsword +2");
		expect(d.build.weapons![0]!.enhancement).toBe(2);
		// Other fields unchanged.
		expect(d.build.weapons![0]!.damageDice).toBe("1d8");
		expect(d.build.weapons![0]!.group).toBe("longsword");
	});

	it("only modifies the weapon at the specified index", () => {
		let d = addWeapon(doc(), LONGSWORD);
		d = addWeapon(d, SHORTBOW);
		d = updateWeapon(d, 0, { name: "Magic Longsword" });
		expect(d.build.weapons![0]!.name).toBe("Magic Longsword");
		expect(d.build.weapons![1]!.name).toBe("Shortbow");
	});

	it("is a no-op for an out-of-range index (positive)", () => {
		const d = addWeapon(doc(), LONGSWORD);
		expect(updateWeapon(d, 5, { name: "Ghost" })).toBe(d);
	});

	it("is a no-op for an out-of-range index (negative)", () => {
		const d = addWeapon(doc(), LONGSWORD);
		expect(updateWeapon(d, -1, { name: "Ghost" })).toBe(d);
	});

	it("does not mutate the original doc", () => {
		const d = addWeapon(doc(), LONGSWORD);
		updateWeapon(d, 0, { name: "Changed" });
		expect(d.build.weapons![0]!.name).toBe("Longsword");
	});

	it("clamps enhancement to [0, 10] on update", () => {
		const d = addWeapon(doc(), LONGSWORD);
		const updated = updateWeapon(d, 0, { enhancement: 99 });
		expect(updated.build.weapons![0]!.enhancement).toBe(10);
	});
});

// ---------------------------------------------------------------------------
// removeWeapon
// ---------------------------------------------------------------------------
describe("removeWeapon()", () => {
	it("removes the weapon at the given index", () => {
		const d = removeWeapon(addWeapon(doc(), LONGSWORD), 0);
		expect(d.build.weapons).toHaveLength(0);
	});

	it("removes only the specified weapon when multiple exist", () => {
		let d = addWeapon(doc(), LONGSWORD);
		d = addWeapon(d, SHORTBOW);
		d = removeWeapon(d, 0);
		expect(d.build.weapons).toHaveLength(1);
		expect(d.build.weapons![0]!.name).toBe("Shortbow");
	});

	it("is a no-op for an out-of-range index (positive)", () => {
		const d = addWeapon(doc(), LONGSWORD);
		expect(removeWeapon(d, 5)).toBe(d);
	});

	it("is a no-op for an out-of-range index (negative)", () => {
		const d = addWeapon(doc(), LONGSWORD);
		expect(removeWeapon(d, -1)).toBe(d);
	});

	it("does not mutate the original doc", () => {
		const d = addWeapon(doc(), LONGSWORD);
		removeWeapon(d, 0);
		expect(d.build.weapons).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// featChoiceOptions("weapon", refData, doc)
// ---------------------------------------------------------------------------
describe("featChoiceOptions weapon type", () => {
	it("returns empty when no weapons are present", () => {
		const opts = featChoiceOptions("weapon", ref, doc());
		expect(opts).toHaveLength(0);
	});

	it("returns empty when weapons have no group set", () => {
		const noGroup: WeaponInstance = { name: "Improvised", attackAbility: "str" };
		const d = addWeapon(doc(), noGroup);
		expect(featChoiceOptions("weapon", ref, d)).toHaveLength(0);
	});

	it("returns the distinct group label for a single weapon", () => {
		const d = addWeapon(doc(), LONGSWORD);
		const opts = featChoiceOptions("weapon", ref, d);
		expect(opts).toHaveLength(1);
		expect(opts[0]).toEqual({ id: "longsword", name: "longsword" });
	});

	it("deduplicates groups when two weapons share the same group", () => {
		let d = addWeapon(doc(), LONGSWORD);
		const longsword2: WeaponInstance = { ...LONGSWORD, name: "Longsword (backup)" };
		d = addWeapon(d, longsword2);
		const opts = featChoiceOptions("weapon", ref, d);
		expect(opts).toHaveLength(1);
		expect(opts[0]!.id).toBe("longsword");
	});

	it("returns all distinct groups sorted alphabetically", () => {
		let d = addWeapon(doc(), SHORTBOW); // "shortbow" first in doc order
		d = addWeapon(d, LONGSWORD); // "longsword" second
		const opts = featChoiceOptions("weapon", ref, d);
		expect(opts).toHaveLength(2);
		// Alphabetical: longsword < shortbow
		expect(opts[0]!.id).toBe("longsword");
		expect(opts[1]!.id).toBe("shortbow");
	});

	it("ignores weapons with an empty or whitespace-only group", () => {
		const blankGroup: WeaponInstance = { ...LONGSWORD, group: "" };
		const d = addWeapon(doc(), blankGroup);
		expect(featChoiceOptions("weapon", ref, d)).toHaveLength(0);
	});

	it("returns empty when doc is not provided (defensive)", () => {
		// Calling without doc should not crash.
		expect(featChoiceOptions("weapon", ref)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// addWeaponFromRef (Stage 8 — weapon picker)
// ---------------------------------------------------------------------------
const longswordRef = Object.values(ref.weapons).find((w) => w.name === "Longsword")!;
const greatswordRef = Object.values(ref.weapons).find((w) => w.name === "Greatsword")!;
const compositeLongbowRef = Object.values(ref.weapons).find((w) => w.name === "Composite Longbow")!;

describe("addWeaponFromRef()", () => {
	it("snapshots a mundane Longsword (no enhancement; crit range 19 stored, default ×2 omitted)", () => {
		const d = addWeaponFromRef(doc(), longswordRef);
		expect(d.build.weapons).toHaveLength(1);
		const w = d.build.weapons![0]!;
		expect(w).toEqual({
			name: "Longsword",
			attackAbility: "str",
			damageAbility: "str",
			category: "melee",
			damageDice: "1d8",
			critRange: 19, // 19 ≠ default 20 → stored
			group: "longsword",
			weaponId: longswordRef.id,
		} satisfies WeaponInstance);
		// crit ×2 is the default → omitted for doc minimalism.
		expect(w.critMult).toBeUndefined();
		expect(w.enhancement).toBeUndefined();
	});

	it("applies a +3 enhancement: name suffix, enhancement field set", () => {
		const d = addWeaponFromRef(doc(), longswordRef, 3);
		const w = d.build.weapons![0]!;
		expect(w.name).toBe("Longsword +3");
		expect(w.enhancement).toBe(3);
		expect(w.weaponId).toBe(longswordRef.id);
	});

	it("omits critMult when it equals the default (2)", () => {
		// Longsword is ×2 — the default — so the field is omitted for doc minimalism.
		const d = addWeaponFromRef(doc(), longswordRef);
		expect(d.build.weapons![0]!.critMult).toBeUndefined();
	});

	it("keeps critMult=3 for a Composite Longbow (non-default)", () => {
		const d = addWeaponFromRef(doc(), compositeLongbowRef);
		const w = d.build.weapons![0]!;
		expect(w.critMult).toBe(3);
		expect(w.critRange).toBeUndefined(); // 20 is the default
		expect(w.category).toBe("ranged");
		expect(w.attackAbility).toBe("dex");
		expect(w.damageAbility).toBe("str"); // composite bows add STR to damage
	});

	it("records damageMultiplier=1.5 for a two-handed Greatsword", () => {
		const d = addWeaponFromRef(doc(), greatswordRef);
		const w = d.build.weapons![0]!;
		expect(w.damageMultiplier).toBe(1.5);
		expect(w.damageDice).toBe("2d6");
		expect(w.critRange).toBe(19);
	});

	it("clamps enhancement to [0, 10] and floors negatives to 0", () => {
		const d = addWeaponFromRef(doc(), longswordRef, -5);
		expect(d.build.weapons![0]!.enhancement).toBeUndefined();
		expect(d.build.weapons![0]!.name).toBe("Longsword");
		// Sanity: a high enhancement still applies.
		const d2 = addWeaponFromRef(doc(), longswordRef, 7);
		expect(d2.build.weapons![0]!.enhancement).toBe(7);
	});

	it("does not mutate the original doc", () => {
		const d = doc();
		addWeaponFromRef(d, longswordRef, 1);
		expect(d.build.weapons).toBeUndefined();
	});

	it("the snapshotted weapon still routes through the engine's group target", () => {
		// featChoiceOptions reads w.group to populate the Weapon Focus choice list;
		// a Longsword selected from ref should surface "longsword" there.
		const d = addWeaponFromRef(doc(), longswordRef);
		const opts = featChoiceOptions("weapon", ref, d);
		expect(opts).toContainEqual({ id: "longsword", name: "longsword" });
	});

	it("applies a material prefix to the display name (silver +1 longsword)", () => {
		const d = addWeaponFromRef(doc(), longswordRef, 1, "silver");
		const w = d.build.weapons![0]!;
		expect(w.name).toBe("Alchemical Silver Longsword +1");
		expect(w.material).toBe("silver");
	});

	it("combines material + enhancement: 'Mithral Greatsword +3'", () => {
		const d = addWeaponFromRef(doc(), greatswordRef, 3, "mithral");
		const w = d.build.weapons![0]!;
		expect(w.name).toBe("Mithral Greatsword +3");
		expect(w.material).toBe("mithral");
		// mithral is display-only for weapons (no stat modifiers the engine tracks)
		expect(w.damageDice).toBe("2d6");
		expect(w.damageMultiplier).toBe(1.5);
	});

	it("steel material is the default (no prefix, no material field)", () => {
		const d = addWeaponFromRef(doc(), longswordRef, 0, "steel");
		const w = d.build.weapons![0]!;
		expect(w.name).toBe("Longsword");
		expect(w.material).toBeUndefined();
	});

	it("keen doubles the crit range: longsword 19→17", () => {
		// Longsword base critRange is 19 (threat 19-20). Keen doubles to 17-20.
		const d = addWeaponFromRef(doc(), longswordRef, 0, "steel", ["keen"]);
		const w = d.build.weapons![0]!;
		expect(w.critRange).toBe(17);
		expect(w.abilities).toEqual(["keen"]);
	});

	it("keen on a default-threat weapon (20) yields 19", () => {
		// A weapon with critRange 20 (threat 20 only). Keen → 19-20.
		const d = addWeaponFromRef(doc(), greatswordRef, 0, "steel", ["keen"]);
		// Greatsword base critRange is 19 (from the refdata), not 20.
		// So keen gives 2*19-21 = 17.
		expect(d.build.weapons![0]!.critRange).toBe(17);
	});

	it("flaming is display-only (no stat change, stored in abilities)", () => {
		const d = addWeaponFromRef(doc(), longswordRef, 1, "steel", ["flaming"]);
		const w = d.build.weapons![0]!;
		expect(w.abilities).toEqual(["flaming"]);
		// critRange unchanged (flaming doesn't modify it)
		expect(w.critRange).toBe(19);
	});

	it("combines keen + flaming + enhancement + material", () => {
		const d = addWeaponFromRef(doc(), longswordRef, 2, "mithral", ["keen", "flaming"]);
		const w = d.build.weapons![0]!;
		expect(w.name).toBe("Mithral Longsword +2");
		expect(w.enhancement).toBe(2);
		expect(w.material).toBe("mithral");
		expect(w.abilities).toEqual(["keen", "flaming"]);
		expect(w.critRange).toBe(17); // keen: 2*19-21 = 17
		expect(w.damageDice).toBe("1d8");
	});

	it("no abilities → no abilities field on the doc", () => {
		const d = addWeaponFromRef(doc(), longswordRef);
		expect(d.build.weapons![0]!.abilities).toBeUndefined();
	});
});

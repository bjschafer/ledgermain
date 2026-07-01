/**
 * Unit tests for the weapon/armor ability helpers: the +10 enhancement-
 * equivalent cap, the "burst" abilities' prerequisite on their base energy
 * ability, and the shared selection helpers the builder UI drives off of.
 */
import { describe, expect, it } from "bun:test";

import {
	abilitySelectable,
	sanitizeAbilities,
	toggleAbilitySelection,
	totalBonusEquivalent,
} from "../src/model/abilities.js";

describe("totalBonusEquivalent()", () => {
	it("sums bonusEquivalent across ability ids", () => {
		expect(totalBonusEquivalent(["keen", "flaming"])).toBe(2); // 1 + 1
		expect(totalBonusEquivalent(["speed"])).toBe(3);
	});

	it("returns 0 for undefined or empty input", () => {
		expect(totalBonusEquivalent(undefined)).toBe(0);
		expect(totalBonusEquivalent([])).toBe(0);
	});

	it("ignores unknown ids", () => {
		expect(totalBonusEquivalent(["not-a-real-ability"])).toBe(0);
	});
});

describe("sanitizeAbilities()", () => {
	it("keeps a valid combination unchanged", () => {
		expect(sanitizeAbilities(["keen", "flaming"], 2)).toEqual(["keen", "flaming"]);
	});

	it("truncates to fit the +10 combined-bonus cap, keeping earliest first", () => {
		// keen(1) + flaming(1) = 2, but only 1 point of budget remains at enh=9.
		expect(sanitizeAbilities(["keen", "flaming"], 9)).toEqual(["keen"]);
	});

	it("drops flaming-burst without flaming present (unmet prerequisite)", () => {
		expect(sanitizeAbilities(["flaming-burst"], 5)).toEqual([]);
	});

	it("keeps flaming-burst when flaming is also selected", () => {
		expect(sanitizeAbilities(["flaming", "flaming-burst"], 5)).toEqual(["flaming", "flaming-burst"]);
	});

	it("drops icy-burst without frost, and shocking-burst without shock", () => {
		expect(sanitizeAbilities(["icy-burst"], 5)).toEqual([]);
		expect(sanitizeAbilities(["shocking-burst"], 5)).toEqual([]);
	});

	it("re-checks prerequisites after budget truncation drops the base ability", () => {
		// enh=8 leaves 2 points of budget. Input order puts flaming-burst(2) before
		// flaming(1): flaming-burst is kept first (uses the whole budget), then
		// flaming is truncated for lack of remaining budget — which then makes
		// flaming-burst's prerequisite unmet, so it must also be dropped.
		expect(sanitizeAbilities(["flaming-burst", "flaming"], 8)).toEqual([]);
	});
});

describe("abilitySelectable()", () => {
	it("is false for any ability when enhancement is 0", () => {
		expect(abilitySelectable([], "keen", 0)).toBe(false);
	});

	it("is true for a plain ability once enhancement is >= 1", () => {
		expect(abilitySelectable([], "keen", 1)).toBe(true);
	});

	it("is false for flaming-burst until flaming is already selected", () => {
		expect(abilitySelectable([], "flaming-burst", 5)).toBe(false);
		expect(abilitySelectable(["flaming"], "flaming-burst", 5)).toBe(true);
	});

	it("is false when adding would exceed the +10 cap", () => {
		// enh=9 leaves 1 point of budget; speed (no prerequisite) costs 3.
		expect(abilitySelectable([], "speed", 9)).toBe(false);
	});

	it("is always true for an already-selected ability (so it can be toggled off)", () => {
		// Even though enhancement is 0 here, an already-selected ability must
		// remain clickable to deselect.
		expect(abilitySelectable(["keen"], "keen", 0)).toBe(true);
	});
});

describe("toggleAbilitySelection()", () => {
	it("adds an ability when selectable", () => {
		expect(toggleAbilitySelection([], "keen", 1)).toEqual(["keen"]);
	});

	it("is a no-op when the ability isn't selectable (enhancement 0)", () => {
		expect(toggleAbilitySelection([], "keen", 0)).toEqual([]);
	});

	it("is a no-op when the prerequisite isn't selected", () => {
		expect(toggleAbilitySelection([], "flaming-burst", 5)).toEqual([]);
	});

	it("is a no-op when it would exceed the +10 cap", () => {
		expect(toggleAbilitySelection(["keen"], "speed", 9)).toEqual(["keen"]); // 1 + 3 > 10 - 9
	});

	it("removes an already-selected ability", () => {
		expect(toggleAbilitySelection(["keen", "flaming"], "keen", 5)).toEqual(["flaming"]);
	});

	it("cascades: removing a prerequisite also removes its dependent", () => {
		const selected = ["flaming", "flaming-burst"];
		expect(toggleAbilitySelection(selected, "flaming", 5)).toEqual([]);
	});

	it("cascade only affects the dependent, not unrelated abilities", () => {
		const selected = ["flaming", "flaming-burst", "keen"];
		expect(toggleAbilitySelection(selected, "flaming", 5)).toEqual(["keen"]);
	});
});

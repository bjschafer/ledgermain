/**
 * Tests for `setAbilityIncreaseCount` — the absolute-count setter backing the
 * ability-increase stepper. It must preserve other abilities' assignments and
 * never exceed the global `floor(totalLevel / 4)` budget.
 */
import { describe, expect, it } from "bun:test";

import {
	addClass,
	createEmptyDoc,
	setAbilityIncreaseCount,
	setClassLevel,
} from "../src/model/doc.js";

function doc() {
	// Level 4 ⇒ one allowed ability increase.
	let d = createEmptyDoc("t");
	d = addClass(d, "fighter");
	d = setClassLevel(d, "fighter", 4);
	return d;
}

function count(d: ReturnType<typeof doc>, ab: string): number {
	return (d.build.abilityIncreases ?? []).filter((a) => a === ab).length;
}

describe("setAbilityIncreaseCount()", () => {
	it("adds entries up to the requested count", () => {
		const d = setAbilityIncreaseCount(doc(), "str", 1);
		expect(count(d, "str")).toBe(1);
		expect(d.build.abilityIncreases).toHaveLength(1);
	});

	it("is a no-op when the count already matches", () => {
		const a = setAbilityIncreaseCount(doc(), "str", 1);
		const b = setAbilityIncreaseCount(a, "str", 1);
		expect(b).toBe(a);
	});

	it("removes entries when the count is lowered", () => {
		const a = setAbilityIncreaseCount(doc(), "str", 1);
		const b = setAbilityIncreaseCount(a, "str", 0);
		expect(count(b, "str")).toBe(0);
		expect(b.build.abilityIncreases).toHaveLength(0);
	});

	it("preserves other abilities' assignments", () => {
		const a = setAbilityIncreaseCount(doc(), "str", 1);
		const b = setAbilityIncreaseCount(a, "dex", 0);
		expect(count(b, "str")).toBe(1);
		expect(count(b, "dex")).toBe(0);
	});

	it("clamps to the global budget, leaving other abilities intact", () => {
		// Level 4 ⇒ budget of 1. Requesting 3 for str must clamp to 1.
		const d = setAbilityIncreaseCount(doc(), "str", 3);
		expect(count(d, "str")).toBe(1);
		expect(d.build.abilityIncreases).toHaveLength(1);
	});

	it("respects room left after other abilities' assignments", () => {
		// Spend the single budget on dex, then ask for str.
		const a = setAbilityIncreaseCount(doc(), "dex", 1);
		const b = setAbilityIncreaseCount(a, "str", 1);
		// No room left for str — count stays 0, dex preserved.
		expect(count(b, "str")).toBe(0);
		expect(count(b, "dex")).toBe(1);
	});

	it("clamps a negative count to zero", () => {
		const d = setAbilityIncreaseCount(doc(), "str", -5);
		expect(count(d, "str")).toBe(0);
	});
});

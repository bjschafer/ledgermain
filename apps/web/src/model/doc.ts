/**
 * Pure, framework-agnostic transitions over a {@link CharacterDoc}. Every
 * function returns a NEW document (no mutation), so they are trivially unit-
 * testable without a DOM and safe to use as React state reducers. The builder UI
 * is a thin view over these; persistence (Dexie) and recompute (engine) live
 * elsewhere. Mirrors DESIGN.md §3.1.
 */
import type {
	AbilityId,
	CharacterDoc,
	ItemInstance,
	SkillId,
} from "@pf1/schema";

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

/** A fresh, valid level-0 document with default scores and no choices made. */
export function createEmptyDoc(id: string): CharacterDoc {
	return {
		schemaVersion: 1,
		id,
		ownerId: "local",
		version: 1,
		updatedAt: new Date().toISOString(),
		identity: { name: "New Adventurer", race: "", classes: [] },
		abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
		build: {
			feats: [],
			skillRanks: {},
			classFeatureChoices: [],
			spells: { known: [], prepared: [] },
			gear: [],
		},
		live: {
			hp: { current: 0, temp: 0, nonlethal: 0 },
			conditions: [],
			activeBuffs: [],
			resources: {},
		},
	};
}

export { ABILITY_IDS };

export function setName(doc: CharacterDoc, name: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, name } };
}

export function setAlignment(
	doc: CharacterDoc,
	alignment: string,
): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, alignment } };
}

export function setDeity(doc: CharacterDoc, deity: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, deity } };
}

export function setGender(doc: CharacterDoc, gender: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, gender } };
}

export function setAge(doc: CharacterDoc, age: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, age } };
}

export function setHeight(doc: CharacterDoc, height: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, height } };
}

export function setWeight(doc: CharacterDoc, weight: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, weight } };
}

export function setAppearance(
	doc: CharacterDoc,
	appearance: string,
): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, appearance } };
}

export function setAbility(
	doc: CharacterDoc,
	ability: AbilityId,
	value: number,
): CharacterDoc {
	const clamped = clampInt(value, 1, 50);
	return { ...doc, abilities: { ...doc.abilities, [ability]: clamped } };
}

export function setRace(doc: CharacterDoc, raceId: string): CharacterDoc {
	const identity = { ...doc.identity, race: raceId };
	delete identity.flexibleAbility;
	return { ...doc, identity };
}

/**
 * Set or clear the flexible +2 ability choice (Human / Half-Elf / Half-Orc).
 * When `ability` is null, the key is removed so a stale choice never lingers.
 */
export function setFlexibleAbility(
	doc: CharacterDoc,
	ability: AbilityId | null,
): CharacterDoc {
	const identity = { ...doc.identity };
	if (ability === null) {
		delete identity.flexibleAbility;
	} else {
		identity.flexibleAbility = ability;
	}
	return { ...doc, identity };
}

/** Add a class at level 1 (no-op if the tag is already present). */
export function addClass(doc: CharacterDoc, tag: string): CharacterDoc {
	if (doc.identity.classes.some((c) => c.tag === tag)) return doc;
	const classes = [...doc.identity.classes, { tag, level: 1 }];
	const favoredClass = doc.identity.favoredClass ?? tag;
	return { ...doc, identity: { ...doc.identity, classes, favoredClass } };
}

export function removeClass(doc: CharacterDoc, tag: string): CharacterDoc {
	const classes = doc.identity.classes.filter((c) => c.tag !== tag);
	return { ...doc, identity: { ...doc.identity, classes } };
}

export function setClassLevel(
	doc: CharacterDoc,
	tag: string,
	level: number,
): CharacterDoc {
	const lvl = clampInt(level, 1, 20);
	const classes = doc.identity.classes.map((c) =>
		c.tag === tag ? { ...c, level: lvl } : c,
	);
	return { ...doc, identity: { ...doc.identity, classes } };
}

export function setFavoredClass(doc: CharacterDoc, tag: string): CharacterDoc {
	return { ...doc, identity: { ...doc.identity, favoredClass: tag } };
}

export function setSkillRank(
	doc: CharacterDoc,
	skill: SkillId,
	ranks: number,
): CharacterDoc {
	const r = clampInt(ranks, 0, totalLevel(doc));
	const next = { ...doc.build.skillRanks };
	if (r <= 0) delete next[skill];
	else next[skill] = r;
	return { ...doc, build: { ...doc.build, skillRanks: next } };
}

export function toggleFeat(doc: CharacterDoc, featId: string): CharacterDoc {
	const has = doc.build.feats.includes(featId);
	const feats = has
		? doc.build.feats.filter((f) => f !== featId)
		: [...doc.build.feats, featId];
	return { ...doc, build: { ...doc.build, feats } };
}

export function toggleKnownSpell(
	doc: CharacterDoc,
	spellId: string,
): CharacterDoc {
	const known = doc.build.spells.known;
	const has = known.includes(spellId);
	const next = has ? known.filter((s) => s !== spellId) : [...known, spellId];
	return {
		...doc,
		build: { ...doc.build, spells: { ...doc.build.spells, known: next } },
	};
}

export function setGear(doc: CharacterDoc, gear: ItemInstance[]): CharacterDoc {
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Set or clear the user's maximum-HP override (e.g. rolled HP).
 * When `value` is null, NaN, or <= 0, the override key is removed entirely so
 * the engine falls back to the rules-average. Otherwise the value is stored as a
 * clamped positive integer (1..100000).
 */
export function setMaxHpOverride(
	doc: CharacterDoc,
	value: number | null,
): CharacterDoc {
	if (value === null || Number.isNaN(value) || value <= 0) {
		const build = { ...doc.build };
		delete build.maxHpOverride;
		return { ...doc, build };
	}
	const clamped = clampInt(value, 1, 100000);
	return { ...doc, build: { ...doc.build, maxHpOverride: clamped } };
}

/**
 * Set the HP calculation mode. `"average"` (default) uses PF1 standard averages;
 * `"max"` maximises every die; `"rolled"` uses per-level rolls stored in `hpRolls`.
 */
export function setHpMode(
	doc: CharacterDoc,
	mode: "average" | "max" | "rolled",
): CharacterDoc {
	return {
		...doc,
		build: {
			...doc.build,
			settings: { ...doc.build.settings, hpMode: mode },
		},
	};
}

/**
 * Store a rolled HP value for character level `charLevel` (1-based).
 * Level 1 is always maxed by the engine regardless of the stored value, but the
 * value is still recorded so the UI can display it.
 * `value` is clamped to 1..100.
 */
export function setHpRoll(
	doc: CharacterDoc,
	charLevel: number,
	value: number,
): CharacterDoc {
	if (charLevel < 1) return doc;
	const clamped = clampInt(value, 1, 100);
	const rolls = [...(doc.build.hpRolls ?? [])];
	rolls[charLevel - 1] = clamped;
	return { ...doc, build: { ...doc.build, hpRolls: rolls } };
}

/**
 * Toggle the FCB house-rule. When true, each favored-class level can grant
 * both +1 HP and +1 skill rank simultaneously via the `"both"` option.
 */
export function setFcbHouserule(
	doc: CharacterDoc,
	enabled: boolean,
): CharacterDoc {
	return {
		...doc,
		build: {
			...doc.build,
			settings: { ...doc.build.settings, fcbHouserule: enabled },
		},
	};
}

/**
 * Override the maximum number of hero points the character may hold.
 * `null` or <= 0 removes the override, falling back to the default (3).
 */
export function setHeroPointsCap(
	doc: CharacterDoc,
	cap: number | null,
): CharacterDoc {
	if (cap === null || Number.isNaN(cap) || cap <= 0) {
		const settings = { ...doc.build.settings };
		delete settings.heroPointsCap;
		return { ...doc, build: { ...doc.build, settings } };
	}
	const clamped = clampInt(cap, 1, 999);
	return {
		...doc,
		build: {
			...doc.build,
			settings: { ...doc.build.settings, heroPointsCap: clamped },
		},
	};
}

/** Allowlisted keys for manual stat overrides. */
export const STAT_OVERRIDE_KEYS = [
	"hp.max",
	"ac.normal",
	"speeds.land",
	"initiative.total",
	"bab",
	"cmd",
	"cmb",
	"saves.fort.total",
	"saves.ref.total",
	"saves.will.total",
] as const;

export type StatOverrideKey = (typeof STAT_OVERRIDE_KEYS)[number];

/**
 * Set or clear a manual override for a derived stat. `key` must be in the
 * allowlist; `value` null removes the override. Values are stored as-is
 * (the engine applies the override and appends provenance in the breakdown).
 */
export function setStatOverride(
	doc: CharacterDoc,
	key: StatOverrideKey,
	value: number | null,
): CharacterDoc {
	const overrides = { ...(doc.build.settings?.statOverrides ?? {}) };
	if (value === null || Number.isNaN(value)) {
		delete overrides[key];
	} else {
		overrides[key] = value;
	}
	return {
		...doc,
		build: {
			...doc.build,
			settings: { ...doc.build.settings, statOverrides: overrides },
		},
	};
}

/**
 * Set the favored-class bonus choice for a specific character-level slot (0-based
 * index). In Standard mode the valid choices are `"hp"`, `"skill"`, `"other"`;
 * in house-rule mode `"both"` and `"alternate"` are also available.
 * Out-of-range indices are silently ignored.
 */
export function setFavoredClassBonus(
	doc: CharacterDoc,
	levelIndex: number,
	choice: "hp" | "skill" | "other" | "both" | "alternate",
): CharacterDoc {
	if (levelIndex < 0) return doc;
	const arr = [...(doc.build.favoredClassBonus ?? [])];
	arr[levelIndex] = choice;
	return { ...doc, build: { ...doc.build, favoredClassBonus: arr } };
}

/** Total character level (sum of class levels). */
export function totalLevel(doc: CharacterDoc): number {
	return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

/**
 * Append `ability` to `build.abilityIncreases` if the current length is below
 * `floor(totalLevel / 4)`. Returns the doc unchanged when the budget is
 * exhausted (so callers can always call unconditionally).
 */
export function addAbilityIncrease(
	doc: CharacterDoc,
	ability: AbilityId,
): CharacterDoc {
	const allowed = Math.floor(totalLevel(doc) / 4);
	const current = doc.build.abilityIncreases ?? [];
	if (current.length >= allowed) return doc;
	return {
		...doc,
		build: { ...doc.build, abilityIncreases: [...current, ability] },
	};
}

/**
 * Remove the LAST occurrence of `ability` from `build.abilityIncreases`.
 * No-op if that ability has no entries.
 */
export function removeAbilityIncrease(
	doc: CharacterDoc,
	ability: AbilityId,
): CharacterDoc {
	const current = doc.build.abilityIncreases ?? [];
	const lastIdx = current.lastIndexOf(ability);
	if (lastIdx === -1) return doc;
	const next = [...current.slice(0, lastIdx), ...current.slice(lastIdx + 1)];
	return { ...doc, build: { ...doc.build, abilityIncreases: next } };
}

/**
 * Set the number of `ability` entries in `build.abilityIncreases` to `count`,
 * preserving every other ability's assignments. `count` is clamped to
 * `[0, remainingBudget]` so the global `floor(totalLevel / 4)` cap can never be
 * exceeded. Used by the ability-increase stepper, which presents an absolute
 * count per ability.
 */
export function setAbilityIncreaseCount(
	doc: CharacterDoc,
	ability: AbilityId,
	count: number,
): CharacterDoc {
	const allowed = Math.floor(totalLevel(doc) / 4);
	const current = doc.build.abilityIncreases ?? [];
	const others = current.filter((a) => a !== ability);
	const room = Math.max(0, allowed - others.length);
	const target = clampInt(count, 0, room);
	const have = current.length - others.length;
	if (target === have) return doc;
	return {
		...doc,
		build: {
			...doc.build,
			abilityIncreases: [...others, ...Array(target).fill(ability)],
		},
	};
}

function clampInt(n: number, min: number, max: number): number {
	if (Number.isNaN(n)) return min;
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

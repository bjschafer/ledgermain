/**
 * Pure, framework-agnostic transitions over a {@link CharacterDoc}. Every
 * function returns a NEW document (no mutation), so they are trivially unit-
 * testable without a DOM and safe to use as React state reducers. The builder UI
 * is a thin view over these; persistence (Dexie) and recompute (engine) live
 * elsewhere. Mirrors DESIGN.md §3.1.
 */
import type {
	AbilityId,
	ArmorRef,
	CharacterDoc,
	ItemInstance,
	SkillId,
	WeaponInstance,
	WeaponRef,
	WornArmor,
} from "@pf1/schema";

import { applyAbilitiesToWeapon } from "./abilities.js";
import { applyMaterialToArmor, MATERIALS } from "./materials.js";

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

/** A fresh, valid level-0 document with default scores and no choices made. */
export function createEmptyDoc(id: string): CharacterDoc {
	return {
		schemaVersion: 2,
		id,
		ownerId: "local",
		version: 1,
		updatedAt: new Date().toISOString(),
		identity: { name: "New Adventurer", race: "", classes: [] },
		abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
		build: {
			feats: [],
			skillRanks: {},
			clericDomains: [],
			archetypes: [],
			classFeatureChoices: [],
			spells: { known: [] },
			gear: [],
		},
		live: {
			hp: { current: 0, temp: 0, nonlethal: 0 },
			conditions: [],
			activeBuffs: [],
			resources: {},
			spells: { prepared: [] },
		},
	};
}

/**
 * Normalize a document loaded from persistence to the current shape. Older docs
 * stored `build.spells.prepared` (always empty/unused) and lacked `live.spells`;
 * this moves preparation to live state. v2 adds `build.clericDomains` and
 * `PreparedSpell.kind` (defaulting to `"normal"` for pre-existing entries —
 * domain slot support for clerics). Idempotent and non-destructive.
 */
export function migrateDoc(doc: CharacterDoc): CharacterDoc {
	const build = doc.build as typeof doc.build & {
		spells?: { known?: string[]; prepared?: unknown };
	};
	const known = build.spells?.known ?? [];
	let next = doc;
	let changed = false;

	if (!doc.live.spells) {
		next = { ...next, live: { ...next.live, spells: { prepared: [] } } };
		changed = true;
	}
	// Drop any legacy `build.spells.prepared`, keeping only `known`.
	if (build.spells && "prepared" in build.spells) {
		next = { ...next, build: { ...next.build, spells: { known } } };
		changed = true;
	}
	// v2: ensure `clericDomains` exists (default empty). No schemaVersion bump
	// here — the field is optional; this just backfills the canonical empty
	// array so downstream `includes` checks don't crash on older docs.
	if (!next.build.clericDomains) {
		next = { ...next, build: { ...next.build, clericDomains: [] } };
		changed = true;
	}
	// Same treatment for `archetypes` (Stage 11.3) — optional, backfilled to `[]`.
	if (!next.build.archetypes) {
		next = { ...next, build: { ...next.build, archetypes: [] } };
		changed = true;
	}
	// `PreparedSpell.kind` is optional and defaults to "normal" — existing
	// prepared entries need no rewrite; tracker code treats absent as normal.

	return changed ? next : doc;
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

/**
 * Set the cleric's chosen domain tags (PF1 normally two; UI caps at two here).
 * Pass `[]` to clear. Tags must match keys in `refData.domainSpellLists`; no
 * validation here (pure model layer — the builder picker gates the choices).
 * Replaces the whole list (not add-remove) to keep domain swapping simple.
 */
export function setClericDomains(
	doc: CharacterDoc,
	domains: string[],
): CharacterDoc {
	const trimmed = domains.filter((d) => typeof d === "string" && d.length > 0);
	return {
		...doc,
		build: { ...doc.build, clericDomains: trimmed.slice(0, 2) },
	};
}

/**
 * Set the chosen archetype ids (keys into `refData.archetypes`). Replaces the
 * whole list, same shape as `setClericDomains`. No conflict validation here —
 * the model layer stays free-choice; the engine's `resolveClassFeatures`
 * applies swaps last-wins if two chosen archetypes ever overlap a slot.
 */
export function setArchetypes(
	doc: CharacterDoc,
	archetypes: string[],
): CharacterDoc {
	const trimmed = archetypes.filter((a) => typeof a === "string" && a.length > 0);
	return { ...doc, build: { ...doc.build, archetypes: trimmed } };
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

	let build = { ...doc.build, feats };

	// When removing a feat, also clear its choice so stale entries don't accumulate
	// in featChoices (e.g. if the player later re-adds a different instance of the feat).
	if (has && doc.build.featChoices?.[featId] !== undefined) {
		const featChoices = { ...doc.build.featChoices };
		delete featChoices[featId];
		build = { ...build, featChoices };
	}

	return { ...doc, build };
}

export function toggleKnownSpell(
	doc: CharacterDoc,
	spellId: string,
): CharacterDoc {
	const known = doc.build.spells.known;
	const has = known.includes(spellId);
	const next = has ? known.filter((s) => s !== spellId) : [...known, spellId];
	const withKnown: CharacterDoc = {
		...doc,
		build: { ...doc.build, spells: { ...doc.build.spells, known: next } },
	};
	// Removing a spell from the spellbook invalidates any prepared instances of
	// it — prune them so the prepared loadout never references unknown spells.
	if (has && doc.live.spells?.prepared.some((p) => p.spellId === spellId)) {
		return {
			...withKnown,
			live: {
				...withKnown.live,
				spells: {
					prepared: doc.live.spells.prepared.filter((p) => p.spellId !== spellId),
				},
			},
		};
	}
	return withKnown;
}

export function setGear(doc: CharacterDoc, gear: ItemInstance[]): CharacterDoc {
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a magic item (by RefData id) to gear, equipped by default.
 * No deduplication — the user may carry multiple copies of the same item.
 */
export function addGearItem(doc: CharacterDoc, itemId: string): CharacterDoc {
	const gear = [...doc.build.gear, { itemId, equipped: true }];
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a manually-entered worn armor or shield. `name` is the user-supplied
 * display label (e.g. "Chainmail +1"). The item is equipped by default.
 */
export function addWornArmor(
	doc: CharacterDoc,
	armor: WornArmor,
	name: string,
): CharacterDoc {
	const gear = [...doc.build.gear, { equipped: true, armor, name }];
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a worn armor or shield selected from `RefData.armors`. Snapshots the
 * physical stats onto a new `WornArmor` (negating ACP, since the schema stores
 * penalties as negative and the ref keeps the source magnitude), and records
 * the `armorId` for display + future re-sync. Optional `enhancement` and
 * `material` apply modifiers at pick-time (mithral: weight class shift, maxDex
 * +2, ACP −3). Optional `abilities` are stored for display (all armor abilities
 * are display-only). No deduplication.
 */
export function addWornArmorFromRef(
	doc: CharacterDoc,
	armor: ArmorRef,
	enhancement: number = 0,
	material?: string,
	abilities?: string[],
): CharacterDoc {
	const ref = applyMaterialToArmor(armor, material);
	const enh = clampInt(enhancement, 0, 10);
	const matName = material && material !== "steel" ? MATERIALS[material]?.name ?? null : null;
	const name = [
		matName,
		armor.name,
		...(enh > 0 ? [`+${enh}`] : []),
	].filter(Boolean).join(" ");

	const worn: WornArmor = {
		slot: ref.slot,
		ac: ref.ac,
		...(enh > 0 ? { enhancement: enh } : {}),
		...(material && material !== "steel" ? { material } : {}),
		...(ref.maxDex != null ? { maxDex: ref.maxDex } : {}),
		...(ref.acp ? { acp: -ref.acp } : {}),
		...(ref.weightClass ? { type: ref.weightClass } : {}),
		...(abilities && abilities.length > 0 ? { abilities } : {}),
	};
	const inst: ItemInstance = {
		equipped: true,
		armor: worn,
		armorId: armor.id,
		name,
	};
	const gear = [...doc.build.gear, inst];
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Toggle the equipped flag for the gear item at `index`.
 * Out-of-range indices are silently ignored.
 */
export function setGearEquipped(
	doc: CharacterDoc,
	index: number,
	equipped: boolean,
): CharacterDoc {
	if (index < 0 || index >= doc.build.gear.length) return doc;
	const gear = doc.build.gear.map((inst, i) =>
		i === index ? { ...inst, equipped } : inst,
	);
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Remove the gear item at `index`. Out-of-range indices are silently ignored.
 */
export function removeGear(doc: CharacterDoc, index: number): CharacterDoc {
	if (index < 0 || index >= doc.build.gear.length) return doc;
	const gear = doc.build.gear.filter((_, i) => i !== index);
	return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Partially update the gear item at `index`. Merges a `Partial<ItemInstance>`
 * patch — can update `armor`, `name`, `equipped`, etc. Out-of-range indices
 * are silently ignored. Armor enhancement is clamped to [0, 10] when present.
 */
export function updateGearItem(
	doc: CharacterDoc,
	index: number,
	patch: Partial<ItemInstance>,
): CharacterDoc {
	if (index < 0 || index >= doc.build.gear.length) return doc;
	const current = doc.build.gear[index]!;
	const merged: ItemInstance = { ...current, ...patch };
	if (merged.armor?.enhancement != null) {
		merged.armor = { ...merged.armor, enhancement: clampInt(merged.armor.enhancement, 0, 10) };
	}
	const gear = doc.build.gear.map((g, i) => (i === index ? merged : g));
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
 * Toggle whether the character uses hero points at all. When disabled, the
 * tracker hides the hero-points panel and the cap override is ignored. The
 * live pool is left untouched so re-enabling restores the previous count.
 */
export function setHeroPointsEnabled(
	doc: CharacterDoc,
	enabled: boolean,
): CharacterDoc {
	return {
		...doc,
		build: {
			...doc.build,
			settings: { ...doc.build.settings, heroPointsEnabled: enabled },
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

/**
 * Set the GM-grant skill-rank addend (homebrew). `null` deletes the sub-key,
 * falling back to a 0 addend. Clamped to [-999, 999] (negative allows a GM
 * to claw back ranks). Mirrors `setHeroPointsCap` for symmetry/clamp posture.
 */
export function setGmGrantSkillRanks(
	doc: CharacterDoc,
	n: number | null,
): CharacterDoc {
	return setGmGrant(doc, "skillRanks", n);
}

/**
 * Set the GM-grant feat-slot addend (homebrew). Same posture as
 * `setGmGrantSkillRanks`.
 */
export function setGmGrantFeatSlots(
	doc: CharacterDoc,
	n: number | null,
): CharacterDoc {
	return setGmGrant(doc, "featSlots", n);
}

function setGmGrant(
	doc: CharacterDoc,
	key: "skillRanks" | "featSlots",
	n: number | null,
): CharacterDoc {
	const current = doc.build.gmGrants ?? {};
	if (n === null || Number.isNaN(n)) {
		if (!(key in current)) {
			return { ...doc, build: { ...doc.build, gmGrants: current } };
		}
		const next = { ...current };
		delete next[key];
		const cleaned = Object.keys(next).length === 0 ? undefined : next;
		return { ...doc, build: { ...doc.build, gmGrants: cleaned } };
	}
	const clamped = clampInt(n, -999, 999);
	return {
		...doc,
		build: {
			...doc.build,
			gmGrants: { ...current, [key]: clamped },
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

/**
 * Append a weapon to `build.weapons`. The new entry is always added at the end.
 * No deduplication — the same weapon template may be added multiple times.
 */
export function addWeapon(doc: CharacterDoc, weapon: WeaponInstance): CharacterDoc {
	const weapons = [...(doc.build.weapons ?? []), weapon];
	return { ...doc, build: { ...doc.build, weapons } };
}

/**
 * Append a weapon selected from `RefData.weapons`, overlaying a user-chosen
 * enhancement bonus, optional special material, and optional magical abilities.
 * Snapshots the ref's physical stats onto a `WeaponInstance` (the engine reads
 * those fields directly; `weaponId` is a display + re-sync pointer only). The
 * display name gets a material prefix ("Silver Longsword") and " +N" suffix
 * when enhancement is positive. Zero-value optionals (matching engine defaults)
 * are omitted so the doc stays minimal. Material is display-only for weapons.
 * Keen (if selected) doubles the crit range at pick-time; other abilities are
 * display-only.
 */
export function addWeaponFromRef(
	doc: CharacterDoc,
	weapon: WeaponRef,
	enhancement: number = 0,
	material?: string,
	abilities?: string[],
): CharacterDoc {
	const ref = applyAbilitiesToWeapon(weapon, abilities);
	const enh = clampInt(enhancement, 0, 10);
	const matName = material && material !== "steel" ? MATERIALS[material]?.name ?? null : null;
	const name = [
		matName,
		weapon.name,
		...(enh > 0 ? [`+${enh}`] : []),
	].filter(Boolean).join(" ");
	const instance: WeaponInstance = {
		name,
		attackAbility: ref.attackAbility,
		damageAbility: ref.damageAbility,
		category: ref.category,
		...(enh > 0 ? { enhancement: enh } : {}),
		...(material && material !== "steel" ? { material } : {}),
		...(abilities && abilities.length > 0 ? { abilities } : {}),
		...(ref.damageDice ? { damageDice: ref.damageDice } : {}),
		...(ref.critRange && ref.critRange !== 20 ? { critRange: ref.critRange } : {}),
		...(ref.critMult && ref.critMult !== 2 ? { critMult: ref.critMult } : {}),
		...(ref.damageMultiplier && ref.damageMultiplier !== 1
			? { damageMultiplier: ref.damageMultiplier }
			: {}),
		...(ref.group ? { group: ref.group } : {}),
		weaponId: weapon.id,
	};
	const weapons = [...(doc.build.weapons ?? []), instance];
	return { ...doc, build: { ...doc.build, weapons } };
}

/**
 * Partially update the weapon at `index` with the given `patch`. Enhancement
 * is clamped to [0, 10]. Out-of-range indices are silently ignored.
 */
export function updateWeapon(
	doc: CharacterDoc,
	index: number,
	patch: Partial<WeaponInstance>,
): CharacterDoc {
	const weapons = doc.build.weapons ?? [];
	if (index < 0 || index >= weapons.length) return doc;
	const merged = { ...weapons[index]!, ...patch };
	if (merged.enhancement != null) {
		merged.enhancement = clampInt(merged.enhancement, 0, 10);
	}
	return {
		...doc,
		build: {
			...doc.build,
			weapons: weapons.map((w, i) => (i === index ? merged : w)),
		},
	};
}

/**
 * Remove the weapon at `index`. Out-of-range indices are silently ignored.
 */
export function removeWeapon(doc: CharacterDoc, index: number): CharacterDoc {
	const weapons = doc.build.weapons ?? [];
	if (index < 0 || index >= weapons.length) return doc;
	return {
		...doc,
		build: {
			...doc.build,
			weapons: weapons.filter((_, i) => i !== index),
		},
	};
}

function clampInt(n: number, min: number, max: number): number {
	if (Number.isNaN(n)) return min;
	return Math.max(min, Math.min(max, Math.trunc(n)));
}

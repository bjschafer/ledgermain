/**
 * Ranger situational selections — pure doc transitions + helpers, framework-
 * agnostic and unit-tested without a DOM (same split as the other `model/`
 * modules). The rules tables and level→slot math live in `@pf1/engine`
 * (`ranger.ts`); this module owns the build-doc edits and the feat-picker
 * prerequisite-bypass lookup.
 *
 * Favored Enemy / Favored Terrain bonuses are situational and surface through
 * saved-roll attachments (see `model/savedRolls.ts`), never as always-on
 * modifiers. All choices are free / soft-validated — nothing here hard-blocks.
 */

import type { CharacterDoc, DerivedSheet, RefData, SavedRollRangerRef } from "@pf1/schema";
import {
	COMBAT_STYLES,
	FAVORED_ENEMY_TYPES,
	FAVORED_TERRAIN_TYPES,
	favoredBonusBudget,
	favoredEnemySlots,
	favoredTerrainSlots,
	featNameSlug,
	rangerLevel,
} from "@pf1/engine";

export {
	COMBAT_STYLES,
	FAVORED_ENEMY_TYPES,
	FAVORED_TERRAIN_TYPES,
	favoredBonusBudget,
	favoredEnemySlots,
	favoredTerrainSlots,
	rangerLevel,
} from "@pf1/engine";

/** True when the character has any ranger levels (gate for the pickers). */
export function isRanger(doc: CharacterDoc): boolean {
	return rangerLevel(doc) > 0;
}

/** A favored-enemy / favored-terrain row on the build doc. */
export type FavoredEntry = { type: string; bonus: number };

/** The default bonus a freshly-added favored enemy/terrain starts at (CRB: +2). */
const DEFAULT_BONUS = 2;

function replaceEnemies(doc: CharacterDoc, list: FavoredEntry[]): CharacterDoc {
	return { ...doc, build: { ...doc.build, favoredEnemies: list } };
}

function replaceTerrains(doc: CharacterDoc, list: FavoredEntry[]): CharacterDoc {
	return { ...doc, build: { ...doc.build, favoredTerrains: list } };
}

/* --------------------------------------------------------------- enemies -- */

export function addFavoredEnemy(doc: CharacterDoc, type = ""): CharacterDoc {
	return replaceEnemies(doc, [...(doc.build.favoredEnemies ?? []), { type, bonus: DEFAULT_BONUS }]);
}

export function removeFavoredEnemy(doc: CharacterDoc, index: number): CharacterDoc {
	return replaceEnemies(
		doc,
		(doc.build.favoredEnemies ?? []).filter((_, i) => i !== index),
	);
}

export function setFavoredEnemyType(doc: CharacterDoc, index: number, type: string): CharacterDoc {
	return replaceEnemies(
		doc,
		(doc.build.favoredEnemies ?? []).map((e, i) => (i === index ? { ...e, type } : e)),
	);
}

export function setFavoredEnemyBonus(doc: CharacterDoc, index: number, bonus: number): CharacterDoc {
	const clamped = Number.isFinite(bonus) ? Math.max(0, Math.round(bonus)) : 0;
	return replaceEnemies(
		doc,
		(doc.build.favoredEnemies ?? []).map((e, i) => (i === index ? { ...e, bonus: clamped } : e)),
	);
}

/* -------------------------------------------------------------- terrains -- */

export function addFavoredTerrain(doc: CharacterDoc, type = ""): CharacterDoc {
	return replaceTerrains(doc, [...(doc.build.favoredTerrains ?? []), { type, bonus: DEFAULT_BONUS }]);
}

export function removeFavoredTerrain(doc: CharacterDoc, index: number): CharacterDoc {
	return replaceTerrains(
		doc,
		(doc.build.favoredTerrains ?? []).filter((_, i) => i !== index),
	);
}

export function setFavoredTerrainType(doc: CharacterDoc, index: number, type: string): CharacterDoc {
	return replaceTerrains(
		doc,
		(doc.build.favoredTerrains ?? []).map((e, i) => (i === index ? { ...e, type } : e)),
	);
}

export function setFavoredTerrainBonus(doc: CharacterDoc, index: number, bonus: number): CharacterDoc {
	const clamped = Number.isFinite(bonus) ? Math.max(0, Math.round(bonus)) : 0;
	return replaceTerrains(
		doc,
		(doc.build.favoredTerrains ?? []).map((e, i) => (i === index ? { ...e, bonus: clamped } : e)),
	);
}

/* ----------------------------------------------------------- combat style -- */

/** Set (or clear, with `null`) the ranger combat style tag. Free-choice. */
export function setCombatStyle(doc: CharacterDoc, id: string | null): CharacterDoc {
	return { ...doc, build: { ...doc.build, combatStyle: id ?? undefined } };
}

/**
 * The set of `featNameSlug`s whose prerequisites the feat picker should waive
 * because they belong to the ranger's chosen combat style tree (CRB: a ranger
 * selecting a combat-style bonus feat need not meet the normal prerequisites).
 * Empty when no style is chosen or the character isn't a ranger.
 */
export function combatStyleFeatSlugs(doc: CharacterDoc): ReadonlySet<string> {
	if (!isRanger(doc) || !doc.build.combatStyle) return new Set();
	const style = COMBAT_STYLES.find((s) => s.id === doc.build.combatStyle);
	return new Set(style?.featSlugs ?? []);
}

/**
 * Soft-validation summary for a favored list: how many slots the ranger's level
 * grants, the total +2-increment bonus budget, how many are currently used, and
 * how much bonus has been assigned. The UI shows this as a hint; nothing here
 * enforces it (hybrid soft-warning posture).
 */
export interface FavoredBudget {
	slots: number;
	chosen: number;
	bonusBudget: number;
	bonusAssigned: number;
}

function summarize(list: FavoredEntry[], slots: number): FavoredBudget {
	return {
		slots,
		chosen: list.length,
		bonusBudget: favoredBonusBudget(slots),
		bonusAssigned: list.reduce((sum, e) => sum + e.bonus, 0),
	};
}

export function favoredEnemyBudget(doc: CharacterDoc): FavoredBudget {
	return summarize(doc.build.favoredEnemies ?? [], favoredEnemySlots(rangerLevel(doc)));
}

export function favoredTerrainBudget(doc: CharacterDoc): FavoredBudget {
	return summarize(doc.build.favoredTerrains ?? [], favoredTerrainSlots(rangerLevel(doc)));
}

/**
 * Whether a feat (by id) is a combat-style feat whose prereqs are waived for
 * this character. `refData` resolves the feat's display name → slug. Convenience
 * wrapper over {@link combatStyleFeatSlugs} for per-feat checks.
 */
export function isCombatStyleFeat(doc: CharacterDoc, refData: RefData, featId: string): boolean {
	const name = refData.feats[featId]?.name;
	if (!name) return false;
	return combatStyleFeatSlugs(doc).has(featNameSlug(name));
}

const ENEMY_LABELS = new Map(FAVORED_ENEMY_TYPES.map((c) => [c.id, c.label]));
const TERRAIN_LABELS = new Map(FAVORED_TERRAIN_TYPES.map((c) => [c.id, c.label]));

/**
 * The character's favored enemies + terrains as saved-roll-attachable refs
 * (kind + type + display name), sourced from `sheet.ranger`. Empty for
 * non-rangers or a ranger who hasn't chosen any. Used by the Saved Rolls panel
 * to offer "+ favored enemy/terrain" attachments.
 */
export function attachableRangerBonuses(sheet: DerivedSheet): SavedRollRangerRef[] {
	const r = sheet.ranger;
	if (!r) return [];
	const label = (map: Map<string, string>, type: string) => map.get(type) ?? type;
	return [
		...r.favoredEnemies
			.filter((e) => e.type)
			.map((e): SavedRollRangerRef => ({
				kind: "favored-enemy",
				type: e.type,
				name: label(ENEMY_LABELS, e.type),
			})),
		...r.favoredTerrains
			.filter((e) => e.type)
			.map((e): SavedRollRangerRef => ({
				kind: "favored-terrain",
				type: e.type,
				name: label(TERRAIN_LABELS, e.type),
			})),
	];
}

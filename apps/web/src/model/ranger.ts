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
  type CombatStyle,
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

export function setFavoredEnemyBonus(
  doc: CharacterDoc,
  index: number,
  bonus: number,
): CharacterDoc {
  const clamped = Number.isFinite(bonus) ? Math.max(0, Math.round(bonus)) : 0;
  return replaceEnemies(
    doc,
    (doc.build.favoredEnemies ?? []).map((e, i) => (i === index ? { ...e, bonus: clamped } : e)),
  );
}

/* -------------------------------------------------------------- terrains -- */

export function addFavoredTerrain(doc: CharacterDoc, type = ""): CharacterDoc {
  return replaceTerrains(doc, [
    ...(doc.build.favoredTerrains ?? []),
    { type, bonus: DEFAULT_BONUS },
  ]);
}

export function removeFavoredTerrain(doc: CharacterDoc, index: number): CharacterDoc {
  return replaceTerrains(
    doc,
    (doc.build.favoredTerrains ?? []).filter((_, i) => i !== index),
  );
}

export function setFavoredTerrainType(
  doc: CharacterDoc,
  index: number,
  type: string,
): CharacterDoc {
  return replaceTerrains(
    doc,
    (doc.build.favoredTerrains ?? []).map((e, i) => (i === index ? { ...e, type } : e)),
  );
}

export function setFavoredTerrainBonus(
  doc: CharacterDoc,
  index: number,
  bonus: number,
): CharacterDoc {
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
 * How a ranger archetype constrains the normal free-choice combat style pick
 * (issue #59): some archetypes lock the ranger into one specific style
 * (Bow Nomad → Archery, Elemental Envoy → the archetype-exclusive Elemental
 * style, ...), one narrows the choice to a short list (Toxophilite: Archery
 * or Crossbow), and two replace the whole bonus-feat-tree mechanism with an
 * unrelated subsystem (Trophy Hunter's gunslinger grit/deeds, Poison
 * Darter's rogue talents/alchemist discoveries) that this project doesn't
 * model as a `CombatStyle` feat list at all.
 */
export type RangerStyleRestriction =
  | { kind: "free" }
  | { kind: "locked"; styleId: string }
  | { kind: "restricted"; styleIds: readonly string[] }
  | { kind: "suppressed" };

interface ArchetypeStyleRule {
  /** Fully replaces the free choice — the picker shows this style only, disabled. */
  lockedStyleId?: string;
  /** Narrows the free choice to this subset — the picker still lets the player pick among these. */
  allowedStyleIds?: readonly string[];
  /** Replaces the combat-style bonus-feat mechanism with something this project doesn't model as a feat list. */
  suppressed?: true;
}

/**
 * Ranger archetype id (`RefData.archetypes` key) -> how it constrains the
 * combat style pick. Hand-verified against each archetype's own vendored
 * `description` prose (see `archetype-features.json`) and, for Elemental
 * Envoy/Wave Warden, the two new archetype-exclusive `COMBAT_STYLES` entries
 * authored for issue #59 (`@pf1/engine` `ranger.ts`). Only archetypes
 * present in the vendored slice are listed — see the issue #59 audit for the
 * full inventory of ranger archetypes that were checked but don't restrict
 * the style pick (most archetypes leave Combat Style Feat untouched).
 *
 * Not covered here: Sword-Devil's "Second Combat Style" (11th level) adds a
 * SECOND free style pick on top of the first rather than restricting the
 * first — `CharacterDoc.build.combatStyle` is a single field, so modeling a
 * second concurrent style is out of scope for this map (reported as a known
 * limitation, issue #59).
 */
const RANGER_ARCHETYPE_STYLE_RULES: Readonly<Record<string, ArchetypeStyleRule>> = {
  // Locked to a single CRB/UC style — the archetype's own prose names it outright.
  "ranger:bow-nomad": { lockedStyleId: "archery" },
  "ranger:hooded-champion": { lockedStyleId: "archery" },
  "ranger:horse-lord": { lockedStyleId: "mounted-combat" },
  "ranger:ilsurian-archer": { lockedStyleId: "archery" },
  "ranger:shapeshifter": { lockedStyleId: "natural-weapon" },
  "ranger:stormwalker": { lockedStyleId: "archery" },
  // Locked to the archetype-exclusive style authored for this archetype.
  "ranger:elemental-envoy": { lockedStyleId: "elemental" },
  "ranger:wave-warden": { lockedStyleId: "aquatic-prowess" },
  // Narrowed, not locked — the archetype's prose offers a choice of two.
  "ranger:toxophilite": { allowedStyleIds: ["archery", "crossbow"] },
  // Replaces the mechanism entirely with something not modeled as a feat list.
  "ranger:trophy-hunter": { suppressed: true },
  "ranger:poison-darter": { suppressed: true },
};

/**
 * The active constraint (if any) a chosen ranger archetype places on the
 * combat style pick. `"free"` (no archetype restriction) covers both a plain
 * CRB ranger and a ranger whose archetype leaves Combat Style Feat
 * untouched. Only the first recognized ranger archetype found in
 * `doc.build.archetypes` is consulted — a character with two archetypes that
 * both restrict style is a corner case no vendored ranger archetype pairing
 * currently produces.
 */
export function rangerStyleRestriction(doc: CharacterDoc): RangerStyleRestriction {
  for (const archetypeId of doc.build.archetypes ?? []) {
    const rule = RANGER_ARCHETYPE_STYLE_RULES[archetypeId];
    if (!rule) continue;
    if (rule.suppressed) return { kind: "suppressed" };
    if (rule.lockedStyleId) return { kind: "locked", styleId: rule.lockedStyleId };
    if (rule.allowedStyleIds) return { kind: "restricted", styleIds: rule.allowedStyleIds };
  }
  return { kind: "free" };
}

/**
 * The combat style id that actually governs the character's bonus-feat
 * prereq waiver right now: an archetype lock overrides whatever
 * `doc.build.combatStyle` holds (stale data from before the archetype was
 * added, or simply never cleared), a suppressed archetype means no style
 * applies regardless of stored value, and otherwise it's the player's free
 * choice (still narrowed to the archetype's allowed subset by the picker UI,
 * but that narrowing isn't re-validated here — same soft-warning posture as
 * the rest of this module).
 */
export function effectiveCombatStyleId(doc: CharacterDoc): string | undefined {
  const restriction = rangerStyleRestriction(doc);
  if (restriction.kind === "suppressed") return undefined;
  if (restriction.kind === "locked") return restriction.styleId;
  return doc.build.combatStyle;
}

/**
 * Style ids only reachable by locking into a granting archetype (issue #59's
 * "elemental"/"aquatic-prowess" additions to `@pf1/engine`'s
 * `COMBAT_STYLES`) — excluded from the free-choice picker so a plain ranger
 * (or one with an unrelated archetype) can't select a style their character
 * has no access to.
 */
const ARCHETYPE_EXCLUSIVE_STYLE_IDS: ReadonlySet<string> = new Set([
  "elemental",
  "aquatic-prowess",
]);

/**
 * The combat styles selectable in the picker right now, given the character's
 * archetype restriction: exactly one (disabled) for `"locked"`, the narrowed
 * subset for `"restricted"`, none for `"suppressed"`, or every style except
 * the archetype-exclusive ones for `"free"`. Drives `RangerPicker`'s
 * dropdown so the UI never offers a choice the character's archetype
 * forbids.
 */
export function rangerSelectableStyles(doc: CharacterDoc): readonly CombatStyle[] {
  const restriction = rangerStyleRestriction(doc);
  switch (restriction.kind) {
    case "locked":
      return COMBAT_STYLES.filter((s) => s.id === restriction.styleId);
    case "restricted":
      return COMBAT_STYLES.filter((s) => restriction.styleIds.includes(s.id));
    case "suppressed":
      return [];
    case "free":
      return COMBAT_STYLES.filter((s) => !ARCHETYPE_EXCLUSIVE_STYLE_IDS.has(s.id));
  }
}

/**
 * The set of `featNameSlug`s whose prerequisites the feat picker should waive
 * because they belong to the ranger's chosen combat style tree (CRB: a ranger
 * selecting a combat-style bonus feat need not meet the normal prerequisites).
 * Empty when no style applies (non-ranger, no style chosen, or a suppressed
 * archetype) — uses {@link effectiveCombatStyleId}, not the raw stored field,
 * so an archetype-locked style is honored even if `doc.build.combatStyle`
 * disagrees.
 */
export function combatStyleFeatSlugs(doc: CharacterDoc): ReadonlySet<string> {
  if (!isRanger(doc)) return new Set();
  const styleId = effectiveCombatStyleId(doc);
  if (!styleId) return new Set();
  const style = COMBAT_STYLES.find((s) => s.id === styleId);
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
      .map(
        (e): SavedRollRangerRef => ({
          kind: "favored-enemy",
          type: e.type,
          name: label(ENEMY_LABELS, e.type),
        }),
      ),
    ...r.favoredTerrains
      .filter((e) => e.type)
      .map(
        (e): SavedRollRangerRef => ({
          kind: "favored-terrain",
          type: e.type,
          name: label(TERRAIN_LABELS, e.type),
        }),
      ),
  ];
}

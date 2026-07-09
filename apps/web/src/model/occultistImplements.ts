/**
 * Pure occultist Implements/Focus Powers transitions (issue #65), mirroring
 * `model/oracleRevelations.ts`'s shape for the budget math and
 * `model/vigilanteTalents.ts`'s shape for having TWO independent budgeted
 * pools in one module — plus the live Mental Focus investment/Physical
 * Enhancement ability setters, since both are tightly coupled to this same
 * subsystem (see `@pf1/schema` `character.ts`'s
 * `occultistFocusInvested`/`occultistPhysicalEnhancementAbility` doc
 * comments).
 *
 * `build.occultistImplements` is UNLIKE every other budgeted picker in this
 * codebase: PF1 RAW ("Implements") lets an occultist select the SAME school
 * more than once (to learn an extra spell from it), so it's a MULTISET, not
 * a set — `addOccultistImplement`/`removeOccultistImplement` push/pop one
 * occurrence rather than toggling. `knownOccultistSchoolTags` collapses it
 * back to the distinct tags actually known (for scoping the Focus Power menu
 * and for the engine's base/resonant-power grants — see
 * `@pf1/engine` `archetypes.ts`'s occultist block).
 *
 * Implement-school budget (verified verbatim against aonprd.com's
 * "Implements" class feature): 2 at 1st level, +1 at 2nd and every 4
 * occultist levels thereafter (2nd, 6th, 10th, 14th, 18th — six picks total,
 * max 7 distinct schools by 18th if none are repeated). No "Extra Implement"
 * feat exists in the vendored slice (confirmed) — this budget is never
 * feat-boosted.
 *
 * Focus-power budget (verified verbatim against aonprd.com's "Focus Powers"
 * class feature): 1 at 1st level (beyond the two automatic base powers), +1
 * at 3rd and every 2 levels thereafter (3rd, 5th, ..., 19th — ten picks
 * total by 19th), plus one per "Extra Focus Power" feat taken (confirmed
 * present in the vendored slice) — counted by OCCURRENCE, same convention
 * `expectedOracleRevelationCount` uses for "Extra Revelation".
 *
 * This module never blocks: taking more than the expected count on either
 * budget is a soft warning only, matching the project's hybrid posture on
 * feat/trait/skill budgets.
 */

import { findOccultistFocusPower } from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";

/** The occultist's class level (0 for a non-occultist, or a stale/multiclassed doc). */
export function occultistLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "occultist")?.level ?? 0;
}

/* ------------------------------------------------------------ implements */

/** How many copies of `tag` are currently chosen (0 if none). */
export function occultistImplementCount(doc: CharacterDoc, tag: string): number {
  return (doc.build.occultistImplements ?? []).filter((t) => t === tag).length;
}

/** Add one occurrence of an implement school tag (always appends — a multiset, not a set). */
export function addOccultistImplement(doc: CharacterDoc, tag: string): CharacterDoc {
  const occultistImplements = [...(doc.build.occultistImplements ?? []), tag];
  return { ...doc, build: { ...doc.build, occultistImplements } };
}

/** Remove ONE occurrence of an implement school tag (the last one added). No-op if none present. */
export function removeOccultistImplement(doc: CharacterDoc, tag: string): CharacterDoc {
  const current = doc.build.occultistImplements ?? [];
  const idx = current.lastIndexOf(tag);
  if (idx === -1) return doc;
  const occultistImplements = [...current.slice(0, idx), ...current.slice(idx + 1)];
  return { ...doc, build: { ...doc.build, occultistImplements } };
}

/** Total implement picks (a multiset count — repeats count individually, matching the budget). */
export function chosenOccultistImplementCount(doc: CharacterDoc): number {
  return (doc.build.occultistImplements ?? []).length;
}

/** The DISTINCT school tags currently known — collapses the multiset for scoping purposes. */
export function knownOccultistSchoolTags(doc: CharacterDoc): string[] {
  return [...new Set(doc.build.occultistImplements ?? [])];
}

/** Levels at which an occultist learns an ADDITIONAL implement school beyond the 2 granted at 1st. */
const IMPLEMENT_EXTRA_LEVELS: readonly number[] = [2, 6, 10, 14, 18];

/**
 * The number of implement picks (multiset entries) an occultist is expected
 * to have at their current level: 2 at 1st, +1 per threshold in
 * {@link IMPLEMENT_EXTRA_LEVELS} reached. Returns 0 for a non-occultist.
 */
export function expectedOccultistImplementCount(doc: CharacterDoc): number {
  const level = occultistLevel(doc);
  if (level <= 0) return 0;
  return 2 + IMPLEMENT_EXTRA_LEVELS.filter((threshold) => level >= threshold).length;
}

export function occultistImplementsNeedWarning(doc: CharacterDoc): boolean {
  return chosenOccultistImplementCount(doc) > expectedOccultistImplementCount(doc);
}

/* ---------------------------------------------------------- focus powers */

export function hasOccultistFocusPower(doc: CharacterDoc, id: string): boolean {
  return (doc.build.occultistFocusPowers ?? []).includes(id);
}

/** Add or remove a focus-power id (`"<schoolTag>:<slug>"`). No-op add if already present. */
export function toggleOccultistFocusPower(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.occultistFocusPowers ?? [];
  const has = current.includes(id);
  const occultistFocusPowers = has ? current.filter((p) => p !== id) : [...current, id];
  return { ...doc, build: { ...doc.build, occultistFocusPowers } };
}

/**
 * The number of chosen focus powers that resolve against a CURRENTLY known
 * school (see file doc comment) — a raw `.length` would over-count a
 * leftover pick from a since-abandoned implement school.
 */
export function chosenOccultistFocusPowerCount(doc: CharacterDoc): number {
  const known = new Set(knownOccultistSchoolTags(doc));
  return (doc.build.occultistFocusPowers ?? []).filter((id) => {
    const found = findOccultistFocusPower(id);
    return found !== undefined && known.has(found.school.tag);
  }).length;
}

/** Levels at which an occultist selects a focus power from the full school menus (beyond the 1st-level base powers). */
const FOCUS_POWER_LEVELS: readonly number[] = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

function baseFocusPowerCount(level: number): number {
  if (level <= 0) return 0;
  return FOCUS_POWER_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Focus Power" feat are in `doc.build.feats` —
 * matched by name (feat ids are opaque RefData keys), counted by occurrence
 * since the feat is stackable, same convention `expectedOracleRevelationCount`
 * relies on for "Extra Revelation".
 */
function extraFocusPowerFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Focus Power") count++;
  }
  return count;
}

/**
 * The number of focus powers an occultist is expected to know at their
 * current level: the base progression plus one per "Extra Focus Power" feat.
 * Returns 0 for a non-occultist.
 */
export function expectedOccultistFocusPowerCount(doc: CharacterDoc, refData: RefData): number {
  const level = occultistLevel(doc);
  if (level <= 0) return 0;
  return baseFocusPowerCount(level) + extraFocusPowerFeatCount(doc, refData);
}

export function occultistFocusPowersNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenOccultistFocusPowerCount(doc) > expectedOccultistFocusPowerCount(doc, refData);
}

/* ------------------------------------------------------------- live state */

/**
 * Set (clamped to >= 0) how many Mental Focus points are currently invested
 * in a known implement (`live.occultistFocusInvested[tag]`). A value of 0
 * removes the key entirely (matches `live.resources`' "absent = 0" sparse
 * convention). Does NOT validate against the actual Mental Focus pool max
 * (soft posture — see that field's schema doc comment); the UI shows
 * remaining/overspent as a hint only.
 */
export function setOccultistFocusInvested(
  doc: CharacterDoc,
  tag: string,
  points: number,
): CharacterDoc {
  const clamped = Math.max(0, Math.floor(points || 0));
  const current = doc.live.occultistFocusInvested ? { ...doc.live.occultistFocusInvested } : {};
  if (clamped === 0) {
    delete current[tag];
  } else {
    current[tag] = clamped;
  }
  return { ...doc, live: { ...doc.live, occultistFocusInvested: current } };
}

/** Total Mental Focus points currently invested across every implement (for an over-budget hint). */
export function totalOccultistFocusInvested(doc: CharacterDoc): number {
  return Object.values(doc.live.occultistFocusInvested ?? {}).reduce((sum, n) => sum + n, 0);
}

/**
 * Set the Transmutation implement's Physical Enhancement target ability
 * (`live.occultistPhysicalEnhancementAbility`) — only meaningful with 3+
 * focus invested in Transmutation (see that field's schema doc comment).
 */
export function setOccultistPhysicalEnhancementAbility(
  doc: CharacterDoc,
  ability: AbilityId,
): CharacterDoc {
  return { ...doc, live: { ...doc.live, occultistPhysicalEnhancementAbility: ability } };
}

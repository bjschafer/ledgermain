/**
 * Pure kineticist Elemental Focus / Expanded Element / Wild Talent
 * transitions (issue #65), mirroring `model/occultistImplements.ts`'s shape:
 * a single-choice setter for the primary element (like `setCavalierOrder`),
 * two single-choice setters for the 7th/15th Expanded Element picks, and a
 * toggle-list for `build.kineticistWildTalents` with TWO independently
 * budgeted cadences (infusions vs. utility talents) living in one field —
 * the same "one field, a helper disambiguates" shape
 * `chosenOccultistFocusPowerCount` uses for `occultistFocusPowers`.
 *
 * Infusion budget (verified verbatim against aonprd.com's Kineticist class
 * table): 1st, 3rd, 5th, 9th, 11th, 13th, 17th, 19th — 8 total by 19th.
 * Utility wild talent budget: 2nd, 4th, 6th, 8th, 10th, 12th, 14th, 16th,
 * 18th, 20th — 10 total by 20th. No "Extra Wild Talent"-style feat exists
 * in the vendored slice (confirmed) — neither budget is ever feat-boosted.
 *
 * This module never blocks: taking more than the expected count on either
 * budget, or picking a talent above the character's effective-level gate
 * (`minKineticistLevelForTalent`), is a soft warning only, matching the
 * project's hybrid posture on feat/trait/skill budgets.
 */

import { minKineticistLevelForTalent, resolveKineticistWildTalent } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

/** The kineticist's class level (0 for a non-kineticist, or a stale/multiclassed doc). */
export function kineticistLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
}

/* --------------------------------------------------------------- element */

export function setKineticistElement(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, kineticistElement: trimmed.length > 0 ? trimmed : undefined },
  };
}

/** Kineticist level threshold each Expanded Element pick index becomes available at. */
export const EXPANDED_ELEMENT_LEVELS: readonly [7, 15] = [7, 15];

/** Set (or clear, passing `null`) the Expanded Element pick at `index` (0 = 7th level, 1 = 15th). */
export function setKineticistExpandedElement(
  doc: CharacterDoc,
  index: 0 | 1,
  tag: string | null,
): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  const current = [...(doc.build.kineticistExpandedElements ?? [])];
  while (current.length <= index) current.push("");
  current[index] = trimmed;
  // Trim trailing empty slots so an unset index-1 doesn't linger as "".
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  return {
    ...doc,
    build: { ...doc.build, kineticistExpandedElements: current.length > 0 ? current : undefined },
  };
}

/** The distinct known element tags: primary + any Expanded Element picks, deduped. */
export function knownKineticistElements(doc: CharacterDoc): string[] {
  const tags = [doc.build.kineticistElement, ...(doc.build.kineticistExpandedElements ?? [])];
  return [...new Set(tags.filter((t): t is string => !!t))];
}

/* ---------------------------------------------------------- wild talents */

export function hasKineticistWildTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.kineticistWildTalents ?? []).includes(id);
}

/** Add or remove a wild talent id. No-op add if already present (no duplicates). */
export function toggleKineticistWildTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.kineticistWildTalents ?? [];
  const has = current.includes(talentId);
  const kineticistWildTalents = has
    ? current.filter((t) => t !== talentId)
    : [...current, talentId];
  return { ...doc, build: { ...doc.build, kineticistWildTalents } };
}

/**
 * How many CHOSEN talent ids resolve to the given category (unresolvable/
 * stale ids don't count) — resolves against BOTH the hand-authored table AND
 * the vendored catalog's infusion/utility subset (issue #74 Phase 3b), so a
 * vendored-only pick counts towards its own budget too.
 */
export function chosenKineticistTalentCount(
  doc: CharacterDoc,
  refData: RefData,
  category: "infusion" | "utility",
): number {
  return (doc.build.kineticistWildTalents ?? []).filter(
    (id) => resolveKineticistWildTalent(id, refData)?.category === category,
  ).length;
}

const INFUSION_LEVELS: readonly number[] = [1, 3, 5, 9, 11, 13, 17, 19];
const UTILITY_LEVELS: readonly number[] = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

export function expectedKineticistTalentCount(
  doc: CharacterDoc,
  category: "infusion" | "utility",
): number {
  const level = kineticistLevel(doc);
  if (level <= 0) return 0;
  const thresholds = category === "infusion" ? INFUSION_LEVELS : UTILITY_LEVELS;
  return thresholds.filter((t) => level >= t).length;
}

export function kineticistTalentsNeedWarning(
  doc: CharacterDoc,
  refData: RefData,
  category: "infusion" | "utility",
): boolean {
  return (
    chosenKineticistTalentCount(doc, refData, category) >
    expectedKineticistTalentCount(doc, category)
  );
}

/**
 * True when `talentId` is above the effective-level gate for the
 * character's current kineticist level (soft warning only — see file doc
 * comment). False (never "below level") for an unresolvable id. Resolves
 * against both the hand-authored table and the vendored catalog (issue #74
 * Phase 3b) — the vendored `level` field IS a real level gate for this
 * subsystem, unlike rage powers' (see `KineticWildTalent.level`'s doc
 * comment).
 */
export function kineticistTalentBelowLevel(
  doc: CharacterDoc,
  refData: RefData,
  talentId: string,
): boolean {
  const talent = resolveKineticistWildTalent(talentId, refData);
  if (!talent) return false;
  const level = kineticistLevel(doc);
  if (level <= 0) return false;
  return level < minKineticistLevelForTalent(talent.level);
}

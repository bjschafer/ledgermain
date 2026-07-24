/**
 * Pure alternate-racial-trait transitions (issue #35). Traits are just ids in
 * `build.racialTraits`, mirroring `toggleTrait` in `model/traits.ts` — the
 * engine's `RACIAL_TRAITS` table maps each to its mechanical `changes`,
 * `suppressTargets`, and `contextNotes`, applied through the same
 * change-collection path as character traits (see `@pf1/engine` `collect.ts`).
 *
 * This module never blocks. Two alternates that replace the same standard trait
 * conflict (you only have one Sure-Footed to trade away), but — matching the
 * project's hybrid soft-warning posture (`model/traits.ts`, archetype conflict
 * warnings for issue #5) — that is surfaced as a warning, never enforced.
 */

import type { CharacterDoc, RacialTrait, RefData } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";
import { alternateRacialTraitsForRace, RACIAL_TRAITS } from "@pf1/engine";

import { ABILITY_NAMES, skillName, SKILL_NAMES } from "./names.js";

export function hasRacialTrait(doc: CharacterDoc, id: string): boolean {
  return (doc.build.racialTraits ?? []).includes(id);
}

/** Add or remove an alternate racial trait id. No-op add if already present. */
export function toggleRacialTrait(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.racialTraits ?? [];
  const has = current.includes(id);
  const racialTraits = has ? current.filter((t) => t !== id) : [...current, id];
  return { ...doc, build: { ...doc.build, racialTraits } };
}

/** The alternate racial traits available for the character's current race. */
export function availableRacialTraits(doc: CharacterDoc, refData: RefData) {
  const raceName = refData.races[doc.identity.race]?.name;
  return raceName ? alternateRacialTraitsForRace(raceName) : [];
}

/**
 * The set of `Race.change` targets suppressed by the character's active
 * alternate racial traits (issue #35). The engine's `collect.ts` applies this
 * to the computed sheet, but the feat/skill BUDGETS in `model/feats.ts` and
 * `model/skills.ts` read `race.changes` (`bonusFeats`/`bonusSkillRanks`)
 * directly — outside `compute()` — so they consult this helper to keep the
 * displayed budget in sync when a swap removes the standard trait (e.g. Human
 * Focused Study drops the bonus feat; Eye for Talent drops the extra skill
 * rank). Only traits belonging to the current race are considered.
 */
export function suppressedRaceTargets(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const suppressed = new Set<string>();
  for (const id of doc.build.racialTraits ?? []) {
    const t = RACIAL_TRAITS[id];
    if (!t || t.race !== raceName) continue;
    for (const target of t.suppressTargets ?? []) suppressed.add(target);
  }
  return suppressed;
}

/**
 * Chosen alternate-racial-trait ids that replace the same standard trait as
 * another chosen one — a conflict, since a race only has one of each standard
 * trait to trade. Returns the set of offending ids (so the picker can flag
 * each). Only considers traits belonging to the current race; a stale id from a
 * race change is ignored.
 */
export function conflictingRacialTraitIds(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const chosen = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is typeof t & {} => t != null && t.race === raceName);

  // Map each replaced standard-trait name to the chosen alternates that claim it.
  const byReplaced = new Map<string, string[]>();
  for (const t of chosen) {
    for (const replaced of t.replaces) {
      const list = byReplaced.get(replaced) ?? [];
      list.push(t.id);
      byReplaced.set(replaced, list);
    }
  }

  const conflicts = new Set<string>();
  for (const ids of byReplaced.values()) {
    if (ids.length > 1) for (const id of ids) conflicts.add(id);
  }
  return conflicts;
}

/* ------------------------------------------ vendored racial traits (#74) -- */

/**
 * Everything below scopes `RefData.racialTraits` — the ~80-race vendored
 * catalog from the `pf1-content` fill plan — which is deliberately kept
 * separate from the hand-authored table above rather than merged into one
 * list. See `RacialTrait`'s doc comment in `@pf1/schema` for why a vendored
 * pick never suppresses a standard trait the way a hand-authored one does.
 */

/** Loose match for de-duping a vendored entry against a hand-authored one by name. */
function normalizeTraitName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "") // strip a trailing "(Sylph)"/"(Human)" disambiguator
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * The vendored alternate racial traits available for the character's current
 * race, minus any whose name already matches a hand-authored `RACIAL_TRAITS`
 * entry for that race — the hand-authored version is the one to pick for
 * those (it enforces the swap; see `availableRacialTraits`), so surfacing
 * both would just be a confusing duplicate with different guarantees.
 * Alphabetical by name (unlike the hand-authored list, this can run to
 * dozens of entries per race — Elf alone vendors 63).
 */
export function availableVendoredRacialTraits(doc: CharacterDoc, refData: RefData): RacialTrait[] {
  const race = refData.races[doc.identity.race];
  if (!race) return [];
  const handAuthoredNames = new Set(
    alternateRacialTraitsForRace(race.name).map((t) => normalizeTraitName(t.name)),
  );
  return Object.values(refData.racialTraits)
    .filter(
      (rt) => rt.race.includes(race.name) && !handAuthoredNames.has(normalizeTraitName(rt.name)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function hasVendoredRacialTrait(doc: CharacterDoc, id: string): boolean {
  return (doc.build.vendoredRacialTraits ?? []).includes(id);
}

/**
 * Add or remove a vendored alternate racial trait id. No-op add if already
 * present. Removing also drops the trait's `openChanges` target picks — they
 * are meaningless without it, and a re-add should start from a clean slate
 * rather than silently reapplying targets chosen for a build ago.
 */
export function toggleVendoredRacialTrait(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.vendoredRacialTraits ?? [];
  const has = current.includes(id);
  const vendoredRacialTraits = has ? current.filter((t) => t !== id) : [...current, id];
  const build = { ...doc.build, vendoredRacialTraits };
  if (has && build.vendoredRacialTraitTargets?.[id] !== undefined) {
    const { [id]: _dropped, ...rest } = build.vendoredRacialTraitTargets;
    build.vendoredRacialTraitTargets = rest;
  }
  return { ...doc, build };
}

/**
 * Set (or clear, with `null`) the target of one of a vendored trait's
 * `openChanges` — the "choose one" blanks the source ships untargeted. Slots
 * are positional against `RacialTrait.openChanges`; earlier unfilled slots are
 * padded with `""` so slot 2 can be chosen before slot 1 (the engine treats
 * both the empty string and a missing slot as "not chosen").
 */
export function setVendoredRacialTraitTarget(
  doc: CharacterDoc,
  id: string,
  slotIndex: number,
  target: string | null,
): CharacterDoc {
  const current = doc.build.vendoredRacialTraitTargets?.[id] ?? [];
  const next = [...current];
  while (next.length <= slotIndex) next.push("");
  next[slotIndex] = target ?? "";
  return {
    ...doc,
    build: {
      ...doc.build,
      vendoredRacialTraitTargets: {
        ...doc.build.vendoredRacialTraitTargets,
        [id]: next,
      },
    },
  };
}

export interface OpenChangeTargetOption {
  /** A `Change.target` string — `"cha"`, `"skill.prf.sing"`. */
  value: string;
  label: string;
  /** `<optgroup>` heading. */
  group: string;
}

/**
 * What an `openChanges` slot can be pointed at. Every published "choose one"
 * racial trait names either an ability score ("one ability other than
 * Charisma") or a skill ("one Craft, Perform, or Profession skill", "a
 * Knowledge skill") — the source's `instructions` prose says which, but only
 * as prose, so the full list is offered and the prose (folded into the shown
 * description) is what tells the player which subset is legal. The character's
 * own Craft/Perform/Profession instances are included so a pick can land on
 * "Perform (sing)" rather than the bare parent skill.
 */
export function openChangeTargetOptions(doc: CharacterDoc): OpenChangeTargetOption[] {
  const abilities = ABILITY_IDS.map((id) => ({
    value: id,
    label: ABILITY_NAMES[id],
    group: "Ability score",
  }));
  const skillIds = new Set<string>([
    ...Object.keys(SKILL_NAMES),
    ...Object.keys(doc.build.skillRanks ?? {}),
  ]);
  const skills = [...skillIds]
    .map((id) => ({ value: `skill.${id}`, label: skillName(id), group: "Skill" }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...abilities, ...skills];
}

/** The chosen target for one `openChanges` slot, or `""` when unchosen. */
export function vendoredRacialTraitTarget(
  doc: CharacterDoc,
  id: string,
  slotIndex: number,
): string {
  return doc.build.vendoredRacialTraitTargets?.[id]?.[slotIndex] ?? "";
}

/**
 * Chosen vendored traits (for the current race) with an `openChanges` slot
 * still unfilled — that change grants nothing until a target is named, so the
 * picker flags it. Advisory like everything else here; never a block.
 */
export function unfilledVendoredRacialTraitTargets(
  doc: CharacterDoc,
  refData: RefData,
): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const unfilled = new Set<string>();
  for (const id of doc.build.vendoredRacialTraits ?? []) {
    const trait = refData.racialTraits[id];
    if (!trait || raceName === undefined || !trait.race.includes(raceName)) continue;
    const open = trait.openChanges ?? [];
    if (open.some((_, i) => vendoredRacialTraitTarget(doc, id, i) === "")) unfilled.add(id);
  }
  return unfilled;
}

/**
 * Total Race Builder point cost of the chosen vendored traits for the current
 * race. Advisory display only: the published RP budget is a race-CONSTRUCTION
 * tool, and swapping in an alternate is supposed to be roughly cost-neutral
 * against the standard trait it replaces — which the pack doesn't cost — so
 * there is no honest budget to check this against. Entries the source didn't
 * tag contribute nothing, hence `tagged` (a total over 4 of 9 picks means
 * something different from a total over 9 of 9).
 */
export function vendoredRacialTraitPoints(
  doc: CharacterDoc,
  refData: RefData,
): { total: number; tagged: number; chosen: number } {
  const raceName = refData.races[doc.identity.race]?.name;
  let total = 0;
  let tagged = 0;
  let chosen = 0;
  for (const id of doc.build.vendoredRacialTraits ?? []) {
    const trait = refData.racialTraits[id];
    if (!trait || raceName === undefined || !trait.race.includes(raceName)) continue;
    chosen++;
    if (trait.racePoints === undefined) continue;
    tagged++;
    total += trait.racePoints;
  }
  return { total, tagged, chosen };
}

/**
 * Pure alternate-racial-trait transitions. Traits are just ids in
 * `build.racialTraits`, mirroring `toggleTrait` in `model/traits.ts` — the
 * engine's `RACIAL_TRAITS` table maps each to its mechanical `changes`,
 * `suppressTargets`, and `contextNotes`, applied through the same
 * change-collection path as character traits (see `@pf1/engine` `collect.ts`).
 *
 * The one thing this module does enforce is the standard-trait budget: you
 * only have one Sure-Footed to trade away, so two alternates that replace it
 * can't coexist. That's a structural signal rather than a prose prereq, so it
 * gets the hard-block half of the project's hybrid posture. See
 * {@link racialTraitConflicts}.
 */

import type { CharacterDoc, RacialTrait, RefData } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";
import {
  alternateRacialTraitsForRace,
  RACIAL_TRAITS,
  vendoredTraitSuppressNoteFragments,
  vendoredTraitSuppressTargets,
} from "@pf1/engine";

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
 * alternate racial traits. The engine's `collect.ts` applies this to the
 * computed sheet, but the feat/skill BUDGETS in `model/feats.ts` and
 * `model/skills.ts` read `race.changes` (`bonusFeats`/`bonusSkillRanks`)
 * directly — outside `compute` — so they consult this helper to keep the
 * displayed budget in sync when a swap removes the standard trait (e.g. Human
 * Focused Study drops the bonus feat; Eye for Talent drops the extra skill
 * rank). Only traits belonging to the current race are considered. Vendored
 * picks suppress through the engine's `VENDORED_STANDARD_TRAIT_TARGETS` map
 * exactly as `collect.ts` does (e.g. Human Dual Talent retires both budgets).
 */
export function suppressedRaceTargets(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const suppressed = new Set<string>();
  for (const id of doc.build.racialTraits ?? []) {
    const t = RACIAL_TRAITS[id];
    if (!t || t.race !== raceName) continue;
    for (const target of t.suppressTargets ?? []) suppressed.add(target);
  }
  if (raceName) {
    for (const id of doc.build.vendoredRacialTraits ?? []) {
      const t = refData.racialTraits[id];
      if (!t || !t.race.includes(raceName)) continue;
      for (const target of vendoredTraitSuppressTargets(t, raceName)) suppressed.add(target);
    }
  }
  return suppressed;
}

/** One of the race's standard-trait reminders, with retirement status for display. */
export interface RaceStandardTraitNote {
  target: string;
  text: string;
  /** Name of the active alternate racial trait that retired this note, when one has. */
  retiredBy?: string;
}

/**
 * The race's standard-trait reminders (`Race.contextNotes`) for display,
 * annotated with which active alternate racial trait retired each one — a
 * standard trait modeled only as prose (Dwarf's Stonecunning, Svirfneblin's
 * Hatred, etc.) with no computed number of its own. Unites both suppression
 * axes the engine tracks: a hand-authored alternate's `suppressNotes` and a
 * vendored pick's {@link vendoredTraitSuppressNoteFragments}. Every note is
 * kept in the returned list (never dropped) so a retirement can be shown as a
 * struck-through "retired by X" cue instead of the note silently
 * disappearing mid-session — the same posture `Provenance`/`ClassFeaturesList`
 * use for an overridden bonus or a swapped-out class feature, rather than the
 * engine's own `raceContextNotesFor`, which just drops the note outright for
 * numeric-pipeline consumers that have no such display.
 */
export function raceStandardTraitNotes(
  doc: CharacterDoc,
  refData: RefData,
): RaceStandardTraitNote[] {
  const race = refData.races[doc.identity.race];
  if (!race) return [];
  const raceName = race.name;
  const activeHandAuthored = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is NonNullable<typeof t> => t != null && t.race === raceName);
  const activeVendored = (doc.build.vendoredRacialTraits ?? [])
    .map((id) => refData.racialTraits[id])
    .filter((t): t is RacialTrait => t != null && t.race.includes(raceName));

  return race.contextNotes.map((note) => {
    const handAuthoredMatch = activeHandAuthored.find((t) =>
      (t.suppressNotes ?? []).some((fragment) => note.text.includes(fragment)),
    );
    const vendoredMatch = activeVendored.find((t) =>
      vendoredTraitSuppressNoteFragments(t, raceName).some((fragment) =>
        note.text.includes(fragment),
      ),
    );
    const retiredBy = handAuthoredMatch?.name ?? vendoredMatch?.name;
    return retiredBy
      ? { target: note.target, text: note.text, retiredBy }
      : { target: note.target, text: note.text };
  });
}

/* --------------------------------------- standard-trait double-claims -- */

/** One alternate (either catalog) reduced to what it claims from the race. */
interface TraitClaim {
  id: string;
  name: string;
  /** Standard-trait names it trades away. */
  replaces: string[];
}

/** Match "Elven Magic" across the two catalogs' independent spellings. */
function normalizeStandardTraitName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Every alternate on offer for the current race, both catalogs, as claims. */
function raceTraitClaims(doc: CharacterDoc, refData: RefData): TraitClaim[] {
  const raceName = refData.races[doc.identity.race]?.name;
  if (raceName === undefined) return [];
  const handAuthored = alternateRacialTraitsForRace(raceName).map((t) => ({
    id: t.id,
    name: t.name,
    replaces: t.replaces,
  }));
  const vendored = Object.values(refData.racialTraits)
    .filter((t) => t.race.includes(raceName))
    .map((t) => ({ id: t.id, name: t.name, replaces: t.replacedTraitNames }));
  return [...handAuthored, ...vendored];
}

/** Which of the race's alternates the character has taken, from both catalogs. */
function chosenRaceTraitIds(doc: CharacterDoc): Set<string> {
  return new Set([...(doc.build.racialTraits ?? []), ...(doc.build.vendoredRacialTraits ?? [])]);
}

/** A standard trait already traded away, and the alternate that took it. */
export interface StandardTraitClaimConflict {
  /** The standard trait's name as this alternate spells it. */
  standardTrait: string;
  /** Name of the already-chosen alternate that claimed it. */
  claimedBy: string;
}

/**
 * For each of the race's alternates (BOTH catalogs), the standard traits it
 * would double-claim against an alternate the character has already taken. A
 * race has exactly one of each standard trait to trade, so two alternates that
 * replace the same one can't coexist: this is a structural signal, not a prose
 * prereq, so the pickers block on it rather than warning (`RaceSection`,
 * `VendoredRacialTraitPicker`).
 *
 * An entry for a trait the character has *already* taken means it collides with
 * a different chosen one, which only survives in docs built before the block
 * existed. Those keep the warning treatment and stay removable; a trait never
 * conflicts with itself.
 *
 * Traits from the two catalogs are compared against each other by standard-trait
 * name, so hand-authored Dreamspeaker blocks vendored Silent Hunter (both trade
 * Elven Magic) even though the catalogs share no ids. Stale ids from a race
 * change carry no claim.
 */
export function racialTraitConflicts(
  doc: CharacterDoc,
  refData: RefData,
): Map<string, StandardTraitClaimConflict[]> {
  const claims = raceTraitClaims(doc, refData);
  const chosen = chosenRaceTraitIds(doc);

  // Standard-trait name -> the chosen alternates that have traded it away.
  const claimedBy = new Map<string, TraitClaim[]>();
  for (const claim of claims) {
    if (!chosen.has(claim.id)) continue;
    for (const replaced of claim.replaces) {
      const key = normalizeStandardTraitName(replaced);
      claimedBy.set(key, [...(claimedBy.get(key) ?? []), claim]);
    }
  }

  const conflicts = new Map<string, StandardTraitClaimConflict[]>();
  for (const claim of claims) {
    const hits: StandardTraitClaimConflict[] = [];
    for (const replaced of claim.replaces) {
      const other = claimedBy
        .get(normalizeStandardTraitName(replaced))
        ?.find((c) => c.id !== claim.id);
      if (other) hits.push({ standardTrait: replaced, claimedBy: other.name });
    }
    if (hits.length > 0) conflicts.set(claim.id, hits);
  }
  return conflicts;
}

/** Tooltip/aria copy for a blocked or conflicting pick. */
export function racialTraitConflictReason(hits: StandardTraitClaimConflict[]): string {
  return hits
    .map((h) => `${h.claimedBy} already replaces ${h.standardTrait}`)
    .join("; ")
    .concat(".");
}

/* ------------------------------------------ vendored racial traits -- */

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

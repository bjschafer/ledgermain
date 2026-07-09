/**
 * Pure transitions + derivation wrapper for a tracked eidolon
 * (`doc.build.eidolon` / `doc.live.eidolon` — see the schema doc comments on
 * those fields, and `@pf1/engine` `eidolon.ts` for the derivation rules).
 * Mirrors `model/phantom.ts`'s shape closely; the differences are the base
 * form in place of an Emotional Focus, the evolution-pool spend in place of
 * automatic ability-score-increase slots, and the summoned/dismissed toggle
 * in place of a manifestation-state toggle.
 */

import {
  buildRollData,
  deriveEidolon,
  EIDOLON_BASE_FORMS,
  EIDOLON_EVOLUTIONS,
  eidolonProgressionRow,
  eidolonSummonerLevel,
  type DerivedEidolon,
} from "@pf1/engine";
import type { CharacterDoc, EidolonEvolutionPick, RefData } from "@pf1/schema";

/** Set (or replace) the tracked eidolon's base form + name. Trims blank names to "Eidolon". */
export function setEidolon(doc: CharacterDoc, baseForm: string, name: string): CharacterDoc {
  const trimmedName = name.trim() || "Eidolon";
  const current = doc.build.eidolon;
  const build = { ...current, baseForm, name: trimmedName, evolutions: current?.evolutions ?? [] };
  return { ...doc, build: { ...doc.build, eidolon: build } };
}

/** Update the tracked eidolon's free-text notes. No-ops if there's no eidolon yet. */
export function setEidolonNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.eidolon) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      eidolon: { ...doc.build.eidolon, notes: trimmed.length > 0 ? trimmed : undefined },
    },
  };
}

/** Remove the tracked eidolon entirely (build choice + live state both clear). */
export function clearEidolon(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.eidolon;
  const live = { ...doc.live };
  delete live.eidolon;
  return { ...doc, build, live };
}

/** Append one evolution pick (`{ id, choice? }`) to the eidolon's evolution list. No-ops if there's no eidolon yet. */
export function addEidolonEvolution(doc: CharacterDoc, id: string, choice?: string): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const evolutions: EidolonEvolutionPick[] = [...current.evolutions, { id, choice }];
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Remove one occurrence of an evolution pick at `index` (not by id — a
 * repeatable evolution like "Ability Increase" may appear more than once
 * with different `choice`s, so index-based removal is the only unambiguous
 * one, mirroring `occultistImplements.ts`'s multiset-removal posture). No-ops
 * if there's no eidolon yet or the index is out of range.
 */
export function removeEidolonEvolution(doc: CharacterDoc, index: number): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  if (index < 0 || index >= current.evolutions.length) return doc;
  const evolutions = current.evolutions.filter((_, i) => i !== index);
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Set the `choice` on an already-chosen evolution pick at `index` (e.g.
 * retargeting an "Ability Increase" pick to a different ability after the
 * fact). No-ops if there's no eidolon yet or the index is out of range.
 */
export function setEidolonEvolutionChoice(
  doc: CharacterDoc,
  index: number,
  choice: string,
): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  if (index < 0 || index >= current.evolutions.length) return doc;
  const evolutions = current.evolutions.map((p, i) => (i === index ? { ...p, choice } : p));
  return { ...doc, build: { ...doc.build, eidolon: { ...current, evolutions } } };
}

/**
 * Remove the LAST occurrence of evolution `id` from the pick list (the
 * builder's "−" stepper button on a repeatable evolution — mirrors
 * `occultistImplements.ts`'s `removeOccultistImplement`'s "remove one copy"
 * shape, just index-derived here instead of count-keyed). No-ops if there's
 * no eidolon yet or `id` isn't currently picked.
 */
export function removeLastEidolonEvolution(doc: CharacterDoc, id: string): CharacterDoc {
  const current = doc.build.eidolon;
  if (!current) return doc;
  const lastIndex = current.evolutions.map((p) => p.id).lastIndexOf(id);
  if (lastIndex < 0) return doc;
  return removeEidolonEvolution(doc, lastIndex);
}

/** How many times evolution `id` currently appears in the eidolon's pick list. */
export function eidolonEvolutionCount(doc: CharacterDoc, id: string): number {
  return (doc.build.eidolon?.evolutions ?? []).filter((p) => p.id === id).length;
}

function withEidolonLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["eidolon"]>>,
): CharacterDoc {
  return { ...doc, live: { ...doc.live, eidolon: { ...doc.live.eidolon, ...patch } } };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the eidolon's HP pool. */
export function applyEidolonDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.eidolon?.damage ?? 0;
  return withEidolonLive(doc, { damage: current + dmg });
}

/** Heal the eidolon's HP, floored at 0 damage (never below full health). */
export function healEidolon(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.eidolon?.damage ?? 0;
  return withEidolonLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the eidolon. */
export function addEidolonNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.eidolon?.nonlethal ?? 0;
  return withEidolonLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the eidolon, floored at 0. */
export function healEidolonNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.eidolon?.nonlethal ?? 0;
  return withEidolonLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the eidolon (e.g. alongside the master's own Rest action). */
export function restEidolon(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.eidolon && !doc.build.eidolon) return doc;
  return withEidolonLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the eidolon. */
export function isSharedWithEidolon(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.eidolon?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the eidolon's derived sheet (Share Spells). */
export function toggleSharedBuffEidolon(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.eidolon?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withEidolonLive(doc, { sharedBuffIds });
}

/** Whether the eidolon is currently summoned (materially present) — `live.eidolon.summoned`, defaulting to `true`. */
export function isEidolonSummoned(doc: CharacterDoc): boolean {
  return doc.live.eidolon?.summoned ?? true;
}

/** Toggle the eidolon's summoned/dismissed state. Display-only bookkeeping — see `EidolonLiveState.summoned`'s schema doc comment. No-ops if there's no eidolon yet. */
export function toggleEidolonSummoned(doc: CharacterDoc): CharacterDoc {
  if (!doc.build.eidolon) return doc;
  return withEidolonLive(doc, { summoned: !isEidolonSummoned(doc) });
}

/**
 * Total evolution points currently spent (sum of `build.eidolon.evolutions`'
 * resolved costs — unresolved ids contribute 0, matching `deriveEidolon`'s
 * own soft-skip posture).
 */
export function eidolonEvolutionPointsSpent(doc: CharacterDoc): number {
  const picks = doc.build.eidolon?.evolutions ?? [];
  return picks.reduce((sum, p) => sum + (EIDOLON_EVOLUTIONS[p.id]?.cost ?? 0), 0);
}

/** The evolution pool available at the eidolon's current summoner level (0 if there's no eidolon/no summoner levels). */
export function eidolonEvolutionPointsAvailable(doc: CharacterDoc): number {
  const level = eidolonSummonerLevel(doc);
  if (level <= 0) return 0;
  return eidolonProgressionRow(level).evolutionPool;
}

/** True when spent evolution points exceed the available pool — soft warning only, never blocks a pick (same posture as `traits`/`racialTraits`). */
export function eidolonEvolutionPoolNeedsWarning(doc: CharacterDoc): boolean {
  return eidolonEvolutionPointsSpent(doc) > eidolonEvolutionPointsAvailable(doc);
}

/**
 * Derive the tracked eidolon's full stat block from the character document,
 * or `undefined` if there's no eidolon (no `build.eidolon`, an unknown base
 * form id, or 0 summoner levels — see `@pf1/engine` `deriveEidolon`'s doc
 * comment). Like a companion or phantom, the eidolon has its own HD/BAB/
 * saves, so it needs no master `DerivedSheet` inputs — only enough roll-data
 * context to evaluate any shared buffs' formulas.
 */
export function deriveEidolonSheet(
  doc: CharacterDoc,
  refData: RefData,
): DerivedEidolon | undefined {
  if (!doc.build.eidolon) return undefined;
  const rollData = buildRollData(doc, refData);
  return deriveEidolon(doc, rollData);
}

export { EIDOLON_BASE_FORMS, EIDOLON_EVOLUTIONS, eidolonSummonerLevel };

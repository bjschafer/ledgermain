/**
 * Pure transitions + derivation wrapper for a tracked familiar
 * (`doc.build.familiar` / `doc.live.familiar` — see the schema doc comments
 * on those fields, and `@pf1/engine` `familiar.ts` for the derivation rules).
 * Mirrors `model/hp.ts`'s damage/heal shape for the familiar's own HP pool.
 */

import {
  BASE_FAMILIARS,
  buildRollData,
  CONDITION_LADDERS,
  deriveFamiliar,
  type DerivedFamiliar,
} from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData, ResolvedStat } from "@pf1/schema";

import { toggleConditionIn } from "./conditions.js";

/** Set (or replace) the tracked familiar's species + name. Trims blank names to "Familiar". */
export function setFamiliar(doc: CharacterDoc, speciesId: string, name: string): CharacterDoc {
  const trimmedName = name.trim() || "Familiar";
  return {
    ...doc,
    build: { ...doc.build, familiar: { ...doc.build.familiar, speciesId, name: trimmedName } },
  };
}

/** Update the tracked familiar's free-text notes. No-ops if there's no familiar yet. */
export function setFamiliarNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.familiar) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      familiar: { ...doc.build.familiar, notes: trimmed.length > 0 ? trimmed : undefined },
    },
  };
}

/** Remove the tracked familiar entirely (build choice + live state both clear). */
export function clearFamiliar(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.familiar;
  const live = { ...doc.live };
  delete live.familiar;
  return { ...doc, build, live };
}

function withFamiliarLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["familiar"]>>,
): CharacterDoc {
  return {
    ...doc,
    live: { ...doc.live, familiar: { ...doc.live.familiar, ...patch } },
  };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the familiar's HP pool. */
export function applyFamiliarDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.familiar?.damage ?? 0;
  return withFamiliarLive(doc, { damage: current + dmg });
}

/** Heal the familiar's HP, floored at 0 damage (never below full health). */
export function healFamiliar(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.familiar?.damage ?? 0;
  return withFamiliarLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the familiar. */
export function addFamiliarNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.familiar?.nonlethal ?? 0;
  return withFamiliarLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the familiar, floored at 0. */
export function healFamiliarNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.familiar?.nonlethal ?? 0;
  return withFamiliarLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the familiar (e.g. alongside the master's own Rest action). */
export function restFamiliar(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.familiar && !doc.build.familiar) return doc;
  return withFamiliarLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether the familiar's OWN condition `id` is currently active (independent of the master's `live.conditions`). */
export function hasFamiliarCondition(doc: CharacterDoc, id: string): boolean {
  return (doc.live.familiar?.conditions ?? []).includes(id);
}

/** The familiar's active condition id, if any, that supersedes `id` on its `CONDITION_LADDERS` ladder (mirrors `model/conditions.ts`'s `supersedingCondition`, scoped to the familiar's own list). */
export function familiarSupersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = CONDITION_LADDERS.find((ladder) => ladder.includes(id));
  if (!pos) return undefined;
  const index = pos.indexOf(id);
  const conditions = doc.live.familiar?.conditions ?? [];
  return pos.slice(index + 1).find((sibling) => conditions.includes(sibling));
}

/** True when the familiar's condition `id` is implied by a stricter active sibling (see `familiarSupersedingCondition`) — the UI shows it as covered rather than independently toggleable. */
export function isFamiliarConditionImplied(doc: CharacterDoc, id: string): boolean {
  return familiarSupersedingCondition(doc, id) !== undefined;
}

/**
 * Toggle one of the familiar's OWN active conditions (`live.familiar.conditions`)
 * — reuses `model/conditions.ts`'s `toggleConditionIn` for the same
 * ladder-aware auto-upgrade/implied-condition behavior the master's own
 * `live.conditions` gets, just scoped to the familiar's separate array.
 * No-ops if there's no familiar yet.
 */
export function toggleFamiliarCondition(doc: CharacterDoc, id: string): CharacterDoc {
  if (!doc.build.familiar) return doc;
  const conditions = toggleConditionIn(doc.live.familiar?.conditions ?? [], id);
  return withFamiliarLive(doc, { conditions });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the familiar. */
export function isSharedWithFamiliar(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.familiar?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the familiar's derived sheet. */
export function toggleSharedBuff(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.familiar?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withFamiliarLive(doc, { sharedBuffIds });
}

/** Set whether the familiar is within arm's reach (Alertness benefit — see schema doc comment). */
export function setFamiliarInReach(doc: CharacterDoc, inReach: boolean): CharacterDoc {
  return { ...doc, live: { ...doc.live, familiarInReach: inReach } };
}

/** Extract a `ResolvedStat`'s BASE component (pre-ability-modifier tabled value) — see `compute.ts`'s `computeSave`. */
function baseComponent(stat: ResolvedStat): number {
  return stat.components.find((c) => c.type === "base")?.value ?? 0;
}

/**
 * Derive the tracked familiar's full stat block from the character's already-
 * computed master `DerivedSheet`, or `undefined` if there's no familiar.
 * Reconstructs a roll-data context for evaluating shared-buff formulas from
 * the master's own final abilities/speeds/BAB (see `@pf1/engine` `familiar.ts`'s
 * doc comment on why a slight approximation here — post-buff speeds rather
 * than race-base — is an acceptable v1 simplification: shared buffs only ever
 * target AC/saves/skills with plain-number formulas in practice).
 */
export function deriveFamiliarSheet(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
): DerivedFamiliar | undefined {
  if (!doc.build.familiar) return undefined;
  const rollData = buildRollData(doc, refData, sheet.abilities, sheet.speeds, sheet.bab);
  return deriveFamiliar(
    doc,
    {
      maxHp: sheet.hp.max,
      bab: sheet.bab,
      baseSaves: {
        fort: baseComponent(sheet.saves.fort),
        ref: baseComponent(sheet.saves.ref),
        will: baseComponent(sheet.saves.will),
      },
    },
    rollData,
  );
}

export { BASE_FAMILIARS };

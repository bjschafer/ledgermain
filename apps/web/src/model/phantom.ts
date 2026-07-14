/**
 * Pure transitions + derivation wrapper for a tracked phantom
 * (`doc.build.phantom` / `doc.live.phantom` — see the schema doc comments on
 * those fields, and `@pf1/engine` `phantom.ts` for the derivation rules).
 * Mirrors `model/companion.ts`'s shape closely; the differences are the
 * Emotional Focus in place of a species/source, the size choice, and the
 * manifestation-state toggle unique to phantoms.
 */

import {
  buildRollData,
  CONDITION_LADDERS,
  derivePhantom,
  EMOTIONAL_FOCI,
  phantomAbilityIncreaseSlots,
  type DerivedPhantom,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc, PhantomBuild, RefData } from "@pf1/schema";

import { toggleConditionIn } from "./conditions.js";

/** Set (or replace) the tracked phantom's Emotional Focus + name. Trims blank names to "Phantom". */
export function setPhantom(doc: CharacterDoc, focus: string, name: string): CharacterDoc {
  const trimmedName = name.trim() || "Phantom";
  const current = doc.build.phantom;
  const build: PhantomBuild = { ...current, focus, name: trimmedName };
  return { ...doc, build: { ...doc.build, phantom: build } };
}

/** Update the tracked phantom's free-text notes. No-ops if there's no phantom yet. */
export function setPhantomNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.phantom) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      phantom: { ...doc.build.phantom, notes: trimmed.length > 0 ? trimmed : undefined },
    },
  };
}

/** Set the tracked phantom's size ("sm" | "med" | "lg"). No-ops if there's no phantom yet. */
export function setPhantomSize(
  doc: CharacterDoc,
  size: NonNullable<PhantomBuild["size"]>,
): CharacterDoc {
  if (!doc.build.phantom) return doc;
  return { ...doc, build: { ...doc.build, phantom: { ...doc.build.phantom, size } } };
}

/** Remove the tracked phantom entirely (build choice + live state both clear). */
export function clearPhantom(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.phantom;
  const live = { ...doc.live };
  delete live.phantom;
  return { ...doc, build, live };
}

/**
 * Set the ability the player has assigned to the ASI slot at `slotIndex` (0 =
 * the spiritualist-level-5 increase, 1 = level 10, 2 = level 15 — see
 * `PhantomBuild.abilityIncreases`'s doc comment). Extends the array with
 * `"cha"` defaults for any earlier unset slot so indices stay stable. No-ops
 * if there's no phantom yet.
 */
export function setPhantomAbilityIncrease(
  doc: CharacterDoc,
  slotIndex: number,
  ability: AbilityId,
): CharacterDoc {
  const current = doc.build.phantom;
  if (!current) return doc;
  const existing = current.abilityIncreases ?? [];
  const next = [...existing];
  while (next.length <= slotIndex) next.push("cha");
  next[slotIndex] = ability;
  return { ...doc, build: { ...doc.build, phantom: { ...current, abilityIncreases: next } } };
}

function withPhantomLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["phantom"]>>,
): CharacterDoc {
  return { ...doc, live: { ...doc.live, phantom: { ...doc.live.phantom, ...patch } } };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the phantom's HP pool. */
export function applyPhantomDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.phantom?.damage ?? 0;
  return withPhantomLive(doc, { damage: current + dmg });
}

/** Heal the phantom's HP, floored at 0 damage (never below full health). */
export function healPhantom(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.phantom?.damage ?? 0;
  return withPhantomLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the phantom. */
export function addPhantomNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.phantom?.nonlethal ?? 0;
  return withPhantomLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the phantom, floored at 0. */
export function healPhantomNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.phantom?.nonlethal ?? 0;
  return withPhantomLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the phantom (e.g. alongside the master's own Rest action). */
export function restPhantom(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.phantom && !doc.build.phantom) return doc;
  return withPhantomLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether the phantom's OWN condition `id` is currently active (independent of the spiritualist's `live.conditions`). */
export function hasPhantomCondition(doc: CharacterDoc, id: string): boolean {
  return (doc.live.phantom?.conditions ?? []).includes(id);
}

/** The phantom's active condition id, if any, that supersedes `id` on its `CONDITION_LADDERS` ladder (mirrors `model/conditions.ts`'s `supersedingCondition`, scoped to the phantom's own list). */
export function phantomSupersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = CONDITION_LADDERS.find((ladder) => ladder.includes(id));
  if (!pos) return undefined;
  const index = pos.indexOf(id);
  const conditions = doc.live.phantom?.conditions ?? [];
  return pos.slice(index + 1).find((sibling) => conditions.includes(sibling));
}

/** True when the phantom's condition `id` is implied by a stricter active sibling (see `phantomSupersedingCondition`) — the UI shows it as covered rather than independently toggleable. */
export function isPhantomConditionImplied(doc: CharacterDoc, id: string): boolean {
  return phantomSupersedingCondition(doc, id) !== undefined;
}

/**
 * Toggle one of the phantom's OWN active conditions (`live.phantom.conditions`)
 * — reuses `model/conditions.ts`'s `toggleConditionIn` for the same
 * ladder-aware auto-upgrade/implied-condition behavior the spiritualist's own
 * `live.conditions` gets, just scoped to the phantom's separate array.
 * No-ops if there's no phantom yet.
 */
export function togglePhantomCondition(doc: CharacterDoc, id: string): CharacterDoc {
  if (!doc.build.phantom) return doc;
  const conditions = toggleConditionIn(doc.live.phantom?.conditions ?? [], id);
  return withPhantomLive(doc, { conditions });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the phantom. */
export function isSharedWithPhantom(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.phantom?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the phantom's derived sheet. */
export function toggleSharedBuffPhantom(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.phantom?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withPhantomLive(doc, { sharedBuffIds });
}

/**
 * Set the phantom's current manifestation state (`"ectoplasmic" |
 * "incorporeal" | "confined"`). Display-only bookkeeping — see
 * `PhantomLiveState.manifestation`'s doc comment for why this doesn't change
 * `derivePhantom`'s numeric stat block. No-ops if there's no phantom yet.
 */
export function setPhantomManifestation(
  doc: CharacterDoc,
  manifestation: "ectoplasmic" | "incorporeal" | "confined",
): CharacterDoc {
  if (!doc.build.phantom) return doc;
  return withPhantomLive(doc, { manifestation });
}

/**
 * Derive the tracked phantom's full stat block from the character document,
 * or `undefined` if there's no phantom (no `build.phantom`, or an unknown
 * Emotional Focus id — see `@pf1/engine` `derivePhantom`'s doc comment).
 * Like a companion, the phantom has its own HD/BAB/saves, so it needs no
 * master `DerivedSheet` inputs — only enough roll-data context to evaluate
 * any shared buffs' formulas.
 */
export function derivePhantomSheet(
  doc: CharacterDoc,
  refData: RefData,
): DerivedPhantom | undefined {
  if (!doc.build.phantom) return undefined;
  const rollData = buildRollData(doc, refData);
  return derivePhantom(doc, rollData);
}

export { EMOTIONAL_FOCI, phantomAbilityIncreaseSlots };

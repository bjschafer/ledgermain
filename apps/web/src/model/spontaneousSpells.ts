/**
 * Pure transitions for a spontaneous caster's daily slot tracking.
 *
 * A spontaneous caster (e.g. sorcerer) knows a fixed set of spells and can
 * cast any of them by expending a slot of the appropriate level. This module
 * tracks how many slots have been used at each level today (`live.spells.slotsUsed`).
 *
 * No spell-selection transitions live here — `build.spells.known` is the
 * source of truth for which spells the character knows; see `doc.ts` for
 * `toggleKnownSpell`. This module is only about spending and restoring slots.
 */

import type { CharacterDoc } from "@pf1/schema";

import type { CasterModel } from "./spellcasting.js";
import { spellSlotsByLevel } from "./spellcasting.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slotsUsed(doc: CharacterDoc): Record<number, number> {
  return doc.live.spells?.slotsUsed ?? {};
}

function withSlotsUsed(doc: CharacterDoc, used: Record<number, number>): CharacterDoc {
  return {
    ...doc,
    live: {
      ...doc.live,
      spells: {
        prepared: doc.live.spells?.prepared ?? [],
        slotsUsed: used,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * How many slots have been used today at `spellLevel`. Returns 0 when none
 * have been used or the document pre-dates spontaneous tracking.
 */
export function slotsUsedAtLevel(doc: CharacterDoc, spellLevel: number): number {
  return slotsUsed(doc)[spellLevel] ?? 0;
}

/**
 * Per-level slot status for display: used, total available, and remaining.
 * Levels with total = 0 are included so the UI can show "— / 0" for debug
 * but callers typically filter them out.
 */
export interface SpontaneousLevelStatus {
  level: number;
  used: number;
  total: number;
  remaining: number;
}

/**
 * Compute all accessible spell levels for a spontaneous caster, including how
 * many slots have been used/remain today.
 */
export function spontaneousSlotStatus(
  doc: CharacterDoc,
  model: CasterModel,
  classLevel: number,
  abilityMod: number,
): SpontaneousLevelStatus[] {
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);
  const used = slotsUsed(doc);
  return slots.map(({ level, total }) => {
    const usedCount = used[level] ?? 0;
    return {
      level,
      used: usedCount,
      total,
      remaining: Math.max(0, total - usedCount),
    };
  });
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Spend one slot of `spellLevel`. Clamped so used cannot exceed total slots
 * available. Returns the same doc reference when no change occurs (slot
 * already at maximum or no access).
 */
export function castSpontaneousSlot(
  doc: CharacterDoc,
  model: CasterModel,
  classLevel: number,
  abilityMod: number,
  spellLevel: number,
): CharacterDoc {
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);
  const entry = slots.find((s) => s.level === spellLevel);
  if (!entry || entry.total <= 0) return doc;
  const current = slotsUsed(doc);
  const used = current[spellLevel] ?? 0;
  if (used >= entry.total) return doc; // already maxed
  return withSlotsUsed(doc, { ...current, [spellLevel]: used + 1 });
}

/**
 * Restore one slot of `spellLevel` (undo a cast). No-op when used count is
 * already 0. Returns the same doc reference when nothing changes.
 */
export function restoreSpontaneousSlot(
  doc: CharacterDoc,
  spellLevel: number,
): CharacterDoc {
  const current = slotsUsed(doc);
  const used = current[spellLevel] ?? 0;
  if (used <= 0) return doc;
  const next = { ...current, [spellLevel]: used - 1 };
  if (next[spellLevel] === 0) delete next[spellLevel];
  return withSlotsUsed(doc, next);
}

/**
 * New day: reset all used slots to zero. Returns the same doc reference when
 * no slots were used.
 */
export function resetSpontaneousSlots(doc: CharacterDoc): CharacterDoc {
  const current = slotsUsed(doc);
  if (Object.keys(current).length === 0) return doc;
  return withSlotsUsed(doc, {});
}

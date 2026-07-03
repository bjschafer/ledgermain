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
 *
 * Every function takes an optional `classTag` (issue #22 multiclass support):
 * it is the *stored* class tag (see `model/spellcasting.ts` `storedClassTag`)
 * — `undefined` for the primary caster class (or the only one, on a
 * single-caster document), tracked in the legacy flat `slotsUsed`; any other
 * caster class (e.g. the sorcerer half of a bard/sorcerer multiclass) tracks
 * its usage independently in `slotsUsedByClass[classTag]`. Omitting
 * `classTag` reproduces pre-multiclass behavior exactly.
 */

import type { CharacterDoc } from "@pf1/schema";

import type { CasterModel } from "./spellcasting.js";
import { spellSlotsByLevel } from "./spellcasting.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slotsUsed(doc: CharacterDoc, classTag?: string): Record<number, number> {
  if (classTag) return doc.live.spells?.slotsUsedByClass?.[classTag] ?? {};
  return doc.live.spells?.slotsUsed ?? {};
}

function withSlotsUsed(
  doc: CharacterDoc,
  used: Record<number, number>,
  classTag?: string,
): CharacterDoc {
  const prepared = doc.live.spells?.prepared ?? [];
  if (classTag) {
    return {
      ...doc,
      live: {
        ...doc.live,
        spells: {
          prepared,
          ...(doc.live.spells?.slotsUsed !== undefined
            ? { slotsUsed: doc.live.spells.slotsUsed }
            : {}),
          slotsUsedByClass: { ...doc.live.spells?.slotsUsedByClass, [classTag]: used },
        },
      },
    };
  }
  return {
    ...doc,
    live: {
      ...doc.live,
      spells: {
        prepared,
        slotsUsed: used,
        ...(doc.live.spells?.slotsUsedByClass !== undefined
          ? { slotsUsedByClass: doc.live.spells.slotsUsedByClass }
          : {}),
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
export function slotsUsedAtLevel(doc: CharacterDoc, spellLevel: number, classTag?: string): number {
  return slotsUsed(doc, classTag)[spellLevel] ?? 0;
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
  classTag?: string,
): SpontaneousLevelStatus[] {
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);
  const used = slotsUsed(doc, classTag);
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
  classTag?: string,
): CharacterDoc {
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);
  const entry = slots.find((s) => s.level === spellLevel);
  if (!entry || entry.total <= 0) return doc;
  const current = slotsUsed(doc, classTag);
  const used = current[spellLevel] ?? 0;
  if (used >= entry.total) return doc; // already maxed
  return withSlotsUsed(doc, { ...current, [spellLevel]: used + 1 }, classTag);
}

/**
 * Restore one slot of `spellLevel` (undo a cast). No-op when used count is
 * already 0. Returns the same doc reference when nothing changes.
 */
export function restoreSpontaneousSlot(
  doc: CharacterDoc,
  spellLevel: number,
  classTag?: string,
): CharacterDoc {
  const current = slotsUsed(doc, classTag);
  const used = current[spellLevel] ?? 0;
  if (used <= 0) return doc;
  const next = { ...current, [spellLevel]: used - 1 };
  if (next[spellLevel] === 0) delete next[spellLevel];
  return withSlotsUsed(doc, next, classTag);
}

/**
 * New day: reset all used slots to zero. Returns the same doc reference when
 * no slots were used.
 */
export function resetSpontaneousSlots(doc: CharacterDoc, classTag?: string): CharacterDoc {
  const current = slotsUsed(doc, classTag);
  if (Object.keys(current).length === 0) return doc;
  return withSlotsUsed(doc, {}, classTag);
}

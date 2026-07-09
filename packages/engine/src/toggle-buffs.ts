/**
 * Shared shape for a hand-authored, non-vendored toggleable effect surfaced
 * on a `DerivedResourcePool` row (issue #65: inquisitor Judgments, skald
 * Inspired Rage — see `judgments.ts` / `raging-song.ts`).
 *
 * This is the "no vendored buff exists" counterpart to `linkedBuffIds`
 * (`resources.ts`'s `DerivedResourcePool.linkedBuffIds`, resolved from a real
 * `RefData.buffs` entry via a vendored `grantsBuffs` UUID): Judgment's
 * `grantsBuffs` UUIDs point at `class-abilities` pack entries that were never
 * pulled into the data pipeline at all (not buffs, and not vendored), and
 * Inspired Rage carries no `grantsBuffs` UUIDs whatsoever. `tableOptions` is
 * the engine-authored substitute for exactly that gap — a small clean-room
 * table of `Change[]`/`ContextNote[]`, toggled client-side via
 * `ActiveBuff.effectTag` matching (`apps/web/src/model/buffs.ts`'s
 * `toggleTableBuff`) rather than `ActiveBuff.buffId` (which is documented as
 * "source buff id from RefData.buffs" — a contract a hand-authored option
 * doesn't satisfy).
 *
 * `changes[]` formulas are evaluated exactly like any other active buff's
 * (`collect.ts`'s active-buffs pass) against the character's full roll data,
 * so `@classes.<tag>.level`-shaped formulas resolve correctly without any
 * `casterLevel`/`@item.level` plumbing.
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface ToggleBuffOption {
  /** Stable id, globally unique across every table — becomes `ActiveBuff.effectTag` when toggled on. */
  id: string;
  /** Display label (also becomes the resulting `ActiveBuff.name`). */
  name: string;
  /** Typed modifiers this option applies when active. */
  changes: Change[];
  /** Non-mechanical reminders (nested choices, unmodeled riders, ...). */
  contextNotes?: ContextNote[];
}

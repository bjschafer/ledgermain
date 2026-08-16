/**
 * Shared types for the per-shard per-day activation tables in this directory.
 * Kept separate so an agent adding entries to a shard never touches this
 * file — only `index.ts` merges shards.
 *
 * What this table is: hand-authored, self-facing activation effects for
 * vendored class features (and domain/school/inquisition granted powers)
 * whose `uses.maxFormula` already derives a `DerivedResourcePool` row — the
 * pool-spend toggle pattern (`ki-spends.ts`, `arcane-spends.ts`, ...)
 * generalized past `resources.ts`'s named per-tag branches: any pool row can
 * carry activation toggles, keyed by the vendored feature's pack id, with no
 * per-feature dispatch code.
 *
 * What belongs here: a numeric effect the character gets on their OWN sheet
 * while the ability is active, expressible as typed `Change`s. What does
 * not: ally-only or enemy-facing effects, extra attacks and other action
 * economy, spell-like-ability grants, choice-from-a-list activations with no
 * stored pick to key from, and abilities whose vendored feature carries no
 * `uses.maxFormula` (no pool row ever derives, so there is no surface to
 * attach to).
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface PerDayActivationDef {
  /**
   * Stable kebab-case id suffix, unique within the feature — the surfaced
   * toggle's id (and thus `ActiveBuff.effectTag`) is
   * `perDay:<featureId>:<slug>`.
   */
  slug: string;
  /** Display label for the toggle (becomes the resulting `ActiveBuff.name`). */
  name: string;
  /**
   * Minimum level in the GRANTING class before the toggle appears. Omit when
   * the grant's own level gate suffices (the pool row only derives once the
   * feature is granted).
   */
  minLevel?: number;
  /**
   * Only attach when the granting class matches. Required whenever a
   * `changes[]` formula references `@classes.<tag>.level` — vendored features
   * can be shared across classes, and toggle formulas evaluate against full
   * character roll data with no `@class.unlevel` granting-class context (see
   * `toggle-buffs.ts`), so an explicit class path must be guarded by the
   * class it names. Prefer flat numbers where the rules allow.
   */
  classTag?: string;
  /** Typed modifiers this activation applies while toggled on. Never empty. */
  changes: Change[];
  /**
   * Cost/action/duration reminder and any unmodeled riders. Convention
   * (matching every other pool toggle table): state the action type, the
   * duration, and that the pool is not auto-decremented by the toggle.
   */
  contextNotes?: ContextNote[];
}

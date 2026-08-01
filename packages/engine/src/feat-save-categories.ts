/**
 * Hand-authored category-scoped save bonuses for feats whose benefit the
 * published text states as "+N on saves against X" — the feat counterpart of
 * `class-feature-effects.ts` and `buff-effects.ts`.
 *
 * Why this is a separate table rather than more entries in `FEAT_EFFECTS` or
 * either extracted table: those three form a PRECEDENCE CHAIN
 * (`resolveFeatEffect` takes the first hit and stops), so exactly one entry
 * per feat can ever win. A feat that grants both an unconditional bonus and a
 * scoped save bonus could not express both there without one shadowing the
 * other. `collect.ts` emits this table ADDITIVELY, alongside whatever
 * `resolveFeatEffect` returns, so the two compose.
 *
 * That also means the double-count check is on the author, not the resolver:
 * before adding a slug here, confirm the feat's existing entry (if it has one)
 * doesn't already emit an `allSavingThrows` change covering the same bonus.
 * The test file enforces this.
 *
 * Keyed by `featNameSlug(feat.name)`, matching every other feat table.
 *
 * A feat classified "situational" in `feat-classification.ts` is a CANDIDATE
 * here, not a disqualification: most were classified that way precisely
 * because the bonus applies only against a kind of effect, which is the gap
 * `Change.saveCategories` exists to close. Those classification tables are an
 * audit record of what was read, not a live gate, and are left alone.
 */

import type { FeatChange } from "./feat-effects.js";

export const FEAT_SAVE_CATEGORY_CHANGES: Readonly<Record<string, readonly FeatChange[]>> = {};

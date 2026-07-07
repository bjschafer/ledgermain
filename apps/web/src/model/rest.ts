/**
 * The single "new day" rest action (issue #30) — composes the independent
 * per-module rest transitions that used to live behind separate panel
 * buttons (HP's "Rest ⤿", Resources' "Rest (full)", Prepared Spells'/
 * spontaneous casting's per-class "New day") into one call, and wires in
 * ability damage's natural healing (issue #18), which had no daily event to
 * hook until now.
 *
 * This module does not reimplement any of the underlying rules — it only
 * imports and chains the existing pure transitions from `model/hp.ts`,
 * `model/afflictions.ts`, `model/resources.ts`, `model/preparedSpells.ts`,
 * and `model/spontaneousSpells.ts`, in this order:
 *
 *   1. HP — `restHp`, respecting `doc.build.settings.restMode` (issue #32):
 *      `"full"` (default, absent = full) heals straight to max; `"natural"`
 *      heals 1 HP × character level (PF1 RAW night's-rest rate, capped at
 *      max — full 2×level bed rest is out of scope for v1). Nonlethal and
 *      temp HP are cleared either way — see `restHp`'s doc comment.
 *   2. Ability damage — `restAbilityDamage`: -1 per damaged ability. Drain
 *      and penalties are untouched (see that function's doc comment).
 *   3. Resources — `restAllResources`: every stored pool's `used` resets so
 *      remaining uses match its refill value (`max` for almost every pool;
 *      Arcane Reservoir's is lower per RAW — issue #43). Requires `refData`
 *      to derive pools; without it, falls back to the old always-full reset.
 *   4. Spells — `restPreparedSpells` + `resetSpontaneousSlots`, once per
 *      caster class (issue #22 multiclass support) when `refData` is given,
 *      so a multiclass character's prepared loadout AND spontaneous slots
 *      reset for every caster class, not just the primary one.
 *
 * Deliberately left untouched:
 *   - Temporary negative levels: PF1 RAW removes one only after a successful
 *     Fortitude save made 24 hours after it was gained — a save rolled at the
 *     table, not something this app can adjudicate. Instead of guessing,
 *     `restNewDay` surfaces `tempNegativeLevelReminder` so the UI can prompt
 *     the player to roll the save and clear it by hand if it succeeds.
 *   - Permanent negative levels: never removed by rest (need restoration
 *     magic).
 *   - Active buffs: buff durations are round-based, and whether a character
 *     "sleeps through" an active buff's remaining duration is a table
 *     judgment (e.g. a paused encounter vs. genuinely resting 8 hours) that
 *     this app doesn't model — left alone by design, not an oversight.
 */
import { deriveResourcePools, type DerivedResourcePool } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { getNegativeLevels, restAbilityDamage } from "./afflictions.js";
import { restHp } from "./hp.js";
import { restPreparedSpells } from "./preparedSpells.js";
import { remaining, restAllResources } from "./resources.js";
import { casterClassesOf, storedClassTag } from "./spellcasting.js";
import { resetSpontaneousSlots } from "./spontaneousSpells.js";

export interface RestNewDayResult {
  doc: CharacterDoc;
  /**
   * True when the character has one or more temporary negative levels: the
   * UI should remind the player that a Fortitude save (24h after each was
   * gained, PF1 RAW) is needed to remove them — `restNewDay` never clears
   * them itself.
   */
  tempNegativeLevelReminder: boolean;
  /**
   * Compact, one-line, dot-separated receipt of what this rest actually
   * changed (see {@link newDaySummary}) — empty string when nothing did
   * (e.g. a character already at full HP with nothing expended). Buffs are
   * never part of this: `restNewDay` deliberately leaves `activeBuffs`
   * untouched (see the module doc comment above), so there is never a
   * "buffs cleared" segment to report.
   */
  summary: string;
}

function expendedPreparedCount(doc: CharacterDoc): number {
  return (doc.live.spells?.prepared ?? []).filter((p) => p.expended).length;
}

function totalSlotsUsed(doc: CharacterDoc): number {
  const spells = doc.live.spells;
  if (!spells) return 0;
  let n = 0;
  for (const used of Object.values(spells.slotsUsed ?? {})) n += used;
  for (const byClass of Object.values(spells.slotsUsedByClass ?? {})) {
    for (const used of Object.values(byClass)) n += used;
  }
  return n;
}

/**
 * Same as {@link expendedPreparedCount}, scoped to one caster class's stored
 * `classTag` (`model/spellcasting.ts` `storedClassTag` — `undefined` for the
 * primary caster class).
 */
function expendedPreparedCountForClass(doc: CharacterDoc, classTag: string | undefined): number {
  return (doc.live.spells?.prepared ?? []).filter(
    (p) => p.expended && (p.classTag ?? undefined) === classTag,
  ).length;
}

/** Same as {@link totalSlotsUsed}, scoped to one caster class's stored `classTag`. */
function slotsUsedForClass(doc: CharacterDoc, classTag: string | undefined): number {
  const spells = doc.live.spells;
  if (!spells) return 0;
  const used =
    classTag === undefined ? (spells.slotsUsed ?? {}) : (spells.slotsUsedByClass?.[classTag] ?? {});
  let n = 0;
  for (const count of Object.values(used)) n += count;
  return n;
}

/**
 * One caster class's "New day" receipt segment for {@link newDaySummary}'s
 * per-class breakdown — e.g. `"Wizard: 3 prepared spells reset"`,
 * `"Sorcerer: 2 slots restored"`, or both comma-joined for a hybrid caster
 * (e.g. arcanist, which has both a daily prepared loadout and a separate
 * spontaneous slot pool — see `model/spellcasting.ts`'s `CasterModel` doc
 * comment). `null` when neither changed for this class.
 */
function classSpellSegment(
  before: CharacterDoc,
  after: CharacterDoc,
  name: string,
  classTag: string | undefined,
): string | null {
  const preparedReset =
    expendedPreparedCountForClass(before, classTag) -
    expendedPreparedCountForClass(after, classTag);
  const slotsRestored = slotsUsedForClass(before, classTag) - slotsUsedForClass(after, classTag);
  const parts: string[] = [];
  if (preparedReset > 0) {
    parts.push(`${preparedReset} prepared spell${preparedReset === 1 ? "" : "s"} reset`);
  }
  if (slotsRestored > 0) {
    parts.push(`${slotsRestored} slot${slotsRestored === 1 ? "" : "s"} restored`);
  }
  if (parts.length === 0) return null;
  return `${name}: ${parts.join(", ")}`;
}

/**
 * Compact, dot-separated receipt of what actually changed between `before`
 * and `after`, for the "New day" toast (issue: feedback/toasts+undo audit
 * slice). Compares the two docs directly rather than re-deriving from
 * `restNewDay`'s internals, so it also works standalone for the narrower
 * per-class "New day" ghost buttons in the Spells panel (which only call
 * `restPreparedSpells`/`resetSpontaneousSlots`, not the full `restNewDay`) —
 * those just won't have an HP/resource-pool segment since neither changed.
 *
 * Segments that didn't change are omitted entirely (an already-full
 * character clicking "New day" with nothing expended gets `""`, not a wall
 * of unchanged "0 -> 0"s). `pools` (from `deriveResourcePools`) supplies
 * display names for resource pools; omit it and changed pools still show,
 * keyed by their raw id.
 *
 * `casterClasses` (issue #63) breaks the spell segment out per caster class
 * instead of a single combined count — e.g. `"Cleric: 1 prepared spell
 * reset"` and `"Sorcerer: 1 slot restored"` as separate segments for a
 * cleric/sorcerer multiclass, rather than one opaque "2 spell slots
 * refreshed". Pass the document's caster classes (see
 * `model/spellcasting.ts`'s `casterClassesOf`/`storedClassTag`) with a
 * display `name` each; omit it (as the narrower per-class "New day" ghost
 * buttons do — their before/after diff is already scoped to one class, so
 * the combined count and a per-class breakdown would say the same thing) to
 * fall back to the original single combined segment.
 */
export function newDaySummary(
  before: CharacterDoc,
  after: CharacterDoc,
  pools?: readonly Pick<DerivedResourcePool, "id" | "name">[],
  casterClasses?: readonly { classTag: string | undefined; name: string }[],
): string {
  const segments: string[] = [];

  if (before.live.hp.current !== after.live.hp.current) {
    segments.push(`HP ${before.live.hp.current}→${after.live.hp.current}`);
  }

  if (casterClasses && casterClasses.length > 0) {
    for (const { classTag, name } of casterClasses) {
      const segment = classSpellSegment(before, after, name, classTag);
      if (segment) segments.push(segment);
    }
  } else {
    const slotsRefreshed =
      expendedPreparedCount(before) -
      expendedPreparedCount(after) +
      (totalSlotsUsed(before) - totalSlotsUsed(after));
    if (slotsRefreshed > 0) {
      segments.push(`${slotsRefreshed} spell slot${slotsRefreshed === 1 ? "" : "s"} refreshed`);
    }
  }

  const poolNameById = new Map((pools ?? []).map((p) => [p.id, p.name]));
  const refreshedPools: string[] = [];
  for (const [id, pool] of Object.entries(after.live.resources)) {
    const beforePool = before.live.resources[id];
    if (!beforePool || beforePool.used === pool.used) continue;
    refreshedPools.push(`${poolNameById.get(id) ?? id} ${remaining(pool)}/${pool.max}`);
  }
  if (refreshedPools.length > 0) segments.push(refreshedPools.join(", "));

  if (before.live.hp.temp > 0 && after.live.hp.temp === 0) segments.push("temp HP cleared");
  if (before.live.hp.nonlethal > 0 && after.live.hp.nonlethal === 0) {
    segments.push("nonlethal healed");
  }

  return segments.join(" · ");
}

/**
 * Apply a full "new day" rest to `doc`. `derived` supplies max HP and
 * character level (for `restHp`'s natural-mode heal rate) — omit it to skip
 * the HP reset (e.g. a caller that only cares about the other effects).
 * `refData` lets spell-slot resets
 * cover every caster class on a multiclass document — omit it to reset only
 * the primary/flat spell fields (matches pre-multiclass behavior).
 */
export function restNewDay(
  doc: CharacterDoc,
  derived?: DerivedSheet,
  refData?: RefData,
): RestNewDayResult {
  let next = doc;

  if (derived) {
    const mode = doc.build.settings?.restMode ?? "full";
    next = restHp(next, derived.hp.max, { mode, level: derived.level });
  }

  next = restAbilityDamage(next);
  const pools = refData ? deriveResourcePools(next, refData, derived?.abilities) : undefined;
  next = restAllResources(next, pools);

  let casterClasses: { classTag: string | undefined; name: string }[] | undefined;
  if (refData) {
    const classDefs = Object.values(refData.classes);
    casterClasses = [];
    for (const { tag } of casterClassesOf(next, refData)) {
      const classTag = storedClassTag(next, refData, tag);
      next = restPreparedSpells(next, classTag);
      next = resetSpontaneousSlots(next, classTag);
      casterClasses.push({
        classTag,
        name: classDefs.find((c) => c.tag === tag)?.name ?? tag,
      });
    }
  } else {
    next = restPreparedSpells(next);
    next = resetSpontaneousSlots(next);
  }

  return {
    doc: next,
    tempNegativeLevelReminder: getNegativeLevels(next).temporary > 0,
    summary: newDaySummary(doc, next, pools, casterClasses),
  };
}

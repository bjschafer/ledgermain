/**
 * Shared types for the hand-authored bardic-performance system: the base CRB
 * table (`bardic-performances.ts`), the skald raging-song table
 * (`raging-song.ts`), and the per-archetype variant shards in this directory.
 *
 * Lives in its own module (not `bardic-performances.ts`) so shard files can
 * import types without a runtime cycle: `bardic-performances.ts` imports the
 * merged variant table from `./index.js`, which imports the shards, which
 * import only from here.
 */

import type { Change, ContextNote } from "@pf1/schema";

/** Shared reminder attached to every performance toggle — the pool is not auto-decremented. */
export const MAINTAIN_NOTE: ContextNote = {
  target: "allChecks",
  text: "Maintaining a performance costs 1 round from the Bardic Performance pool per round it stays active. This pool is not auto-decremented while a toggle here is on; track your own rounds spent.",
};

export interface BardicPerformanceDef {
  /** Slug, e.g. "countersong" — prefixed to become the `ToggleBuffOption.id`. */
  tag: string;
  name: string;
  /** One-line rules summary (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Class level this performance type is gained at. */
  minLevel: number;
  changes: Change[];
  contextNotes?: ContextNote[];
}

/**
 * One archetype's edits to its base class's performance toggle list: base
 * performance types it takes away (replaced or simply lost), plus the
 * archetype-specific performance types it grants instead.
 *
 * Pure reflavors with unchanged numbers still get their own def here (with the
 * archetype's name and text) so the toggle list matches what's on the
 * character's sheet, not the base class's.
 */
export interface ArchetypePerformanceVariant {
  /** Vendored `Archetype.id`, e.g. "bard:court-bard" (keys `RefData.archetypes`). */
  archetypeId: string;
  /**
   * Base performance `tag`s this archetype removes — must match tags in the
   * base table (`BARD_PERFORMANCES` for bard, the raging-song tag list for
   * skald). Enforced by a drift-guard test.
   */
  removesTags?: string[];
  /**
   * Bard only: this archetype replaces Inspire Courage, which is NOT in the
   * hand table (it rides the vendored linked buff on the pool feature —
   * see `bardic-performances.ts`'s doc comment). Setting this makes
   * `resources.ts` drop that linked buff from the Bardic Performance pool.
   */
  removesInspireCourage?: boolean;
  /** Archetype-specific performance types, each level-gated by its own `minLevel`. */
  performances: BardicPerformanceDef[];
}

/**
 * Merge helper shared by the bard and skald toggle factories: base defs minus
 * every active variant's `removesTags`, plus every active variant's own
 * level-qualified performances. Variant option ids are
 * `<prefix>:<archetype-slug>:<tag>` (slug = the archetype id after the class
 * prefix) so two archetypes' same-named tags can't collide.
 */
export function mergePerformanceDefs(
  base: readonly BardicPerformanceDef[],
  variants: readonly ArchetypePerformanceVariant[],
  activeArchetypeIds: readonly string[],
  classLevel: number,
): { def: BardicPerformanceDef; idSuffix: string }[] {
  const active = variants.filter((v) => activeArchetypeIds.includes(v.archetypeId));
  const removed = new Set(active.flatMap((v) => v.removesTags ?? []));
  const merged = base
    .filter((d) => !removed.has(d.tag) && d.minLevel <= classLevel)
    .map((def) => ({ def, idSuffix: def.tag }));
  for (const v of active) {
    const slug = v.archetypeId.split(":")[1] ?? v.archetypeId;
    for (const def of v.performances) {
      if (def.minLevel <= classLevel) merged.push({ def, idSuffix: `${slug}:${def.tag}` });
    }
  }
  return merged;
}

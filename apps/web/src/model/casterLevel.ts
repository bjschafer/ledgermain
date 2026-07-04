/**
 * Caster-level helpers. PF1 caster level is *per casting class*, never summed
 * across classes, and for a few classes it diverges from class level (e.g.
 * paladin/ranger don't cast until 4th level). The vendored Class type doesn't
 * carry a casting progression, so this module is the single seam where a
 * data-driven version can later replace the tag-keyed table below.
 *
 * Note: the engine's `@cl` roll-data field (packages/engine/src/rolldata.ts)
 * holds the parallel assumption for formula evaluation and is intentionally
 * separate — keep both in sync when extending this.
 */
import type { CharacterDoc } from "@pf1/schema";

/** Tags of classes recognised as casters in the Stage 1 data slice. */
const FULL_CASTER_TAGS = new Set(["wizard", "cleric", "sorcerer", "druid", "oracle", "arcanist"]);

/**
 * Per-class caster level. Defaults to class level for full casters and 0 for
 * non-casters. Classes whose CL diverges from class level (paladin, ranger,
 * ...) get an explicit override here when they're added to the vendored slice.
 */
export function casterLevelForClass(tag: string, classLevel: number): number {
  if (!FULL_CASTER_TAGS.has(tag)) return 0;
  return classLevel;
}

/** A character's highest single-class caster level — used for feat prereqs. */
export function casterLevel(doc: CharacterDoc): number {
  let cl = 0;
  for (const c of doc.identity.classes) {
    cl = Math.max(cl, casterLevelForClass(c.tag, c.level));
  }
  return cl;
}

/** Whether a class tag is recognised as a caster at all. */
export function isCasterTag(tag: string): boolean {
  return FULL_CASTER_TAGS.has(tag);
}

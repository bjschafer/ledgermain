/**
 * Caster level for prerequisite checks. The vendored Class type doesn't carry a
 * casting progression, so we recognise the full-caster tags in the Stage 1 slice
 * and use class level as CL (single-class assumption, matching the engine's `@cl`
 * note). Kept tiny and isolated so a data-driven version can replace it later.
 */
import type { CharacterDoc } from "@pf1/schema";

const FULL_CASTER_TAGS = new Set(["wizard", "cleric", "sorcerer", "druid", "oracle"]);

export function casterLevel(doc: CharacterDoc): number {
  let cl = 0;
  for (const c of doc.identity.classes) {
    if (FULL_CASTER_TAGS.has(c.tag)) cl = Math.max(cl, c.level);
  }
  return cl;
}

export function isCasterTag(tag: string): boolean {
  return FULL_CASTER_TAGS.has(tag);
}

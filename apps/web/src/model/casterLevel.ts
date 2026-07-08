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
const FULL_CASTER_TAGS = new Set([
  "wizard",
  "cleric",
  "sorcerer",
  "druid",
  "oracle",
  "arcanist",
  "magus",
  "alchemist",
  "investigator",
  "inquisitor",
  "summoner",
  "skald",
  "witch",
  "shaman",
  "warpriest",
  "hunter",
  // Psychic (Occult Adventures): int-based spontaneous FULL 9-level caster,
  // CL = class level from 1st level on with no late-start gate — a plain
  // member of this set like sorcerer/oracle. (Medium, its Occult Adventures
  // sibling, is deliberately NOT here: like bloodrager it casts nothing at
  // all before 4th level, so this module's binary "classLevel or 0" switch
  // would wrongly report CL 1-3 for a low-level medium — see the bloodrager
  // note below for the precedent. Kineticist casts no spells at all.)
  "psychic",
]);

/**
 * Per-class caster level. Defaults to class level for full casters and 0 for
 * non-casters. Classes whose CL diverges from class level (paladin, ranger,
 * ...) get an explicit override here when they're added to the vendored slice.
 *
 * Warpriest and hunter (ACG) both cast starting at 1st level with CL equal to
 * class level throughout (verified on aonprd.com — neither has the "-3"-style
 * divergence paladin/ranger do), so they're plain members of
 * `FULL_CASTER_TAGS` like cleric/druid/oracle.
 *
 * Bloodrager is deliberately NOT added here despite ALSO having a
 * numerically-correct-once-casting-starts CL of exactly `classLevel` (no -3
 * offset) — confirmed via PF1 Core Rulebook ch.9's default caster-level rule
 * plus an official Paizo designer ruling (Owen K.C. Stephens / Mark Seifter:
 * a bloodrager's minimum caster level for 1st-level spells is 4, not 1,
 * i.e. NOT `paladinLevel - 3`-style). But bloodragers cast NO spells at all
 * before 4th level, and this module only has a binary "is this tag a caster"
 * switch (flat `classLevel` or `0`) — no level-gating. Adding bloodrager here
 * would wrongly report a nonzero caster level at levels 1-3 (e.g. CL 2 at
 * class level 2, with zero actual spellcasting). Leaving it out (same
 * posture as paladin/ranger, whose CL genuinely does diverge) is the
 * conservative choice until this module grows a level-gated override shape;
 * a future fix should NOT copy paladin/ranger's `-3` formula for bloodrager.
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

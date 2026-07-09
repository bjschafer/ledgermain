/**
 * Caster-level helpers. PF1 caster level is *per casting class*, never summed
 * across classes, and for a few classes it diverges from class level (e.g.
 * paladin/ranger don't cast until 4th level, using a `classLevel - 3`
 * formula from then on). The vendored Class type doesn't carry a casting
 * progression, so this module is the single seam where a data-driven version
 * can later replace the tag-keyed tables below.
 *
 * Note: the engine's `@cl` roll-data field (packages/engine/src/rolldata.ts)
 * holds the parallel assumption for formula evaluation and is intentionally
 * separate — keep both in sync when extending this. As of issue #65
 * (bloodrager/medium), `rolldata.ts`'s `cl: maxClassLevel` already agrees
 * with this module's level-gated bloodrager/medium entries below WITHOUT
 * needing a code change there: `buildRollData`'s doc comment already flags
 * `cl` as a "single-class assumption for Stage 2" (`maxClassLevel`, no -3-
 * style offset applied for ANY class, including paladin/ranger) — for a
 * single-classed bloodrager/medium, `maxClassLevel` already equals
 * `classLevel` with no offset, matching `LEVEL_GATED_CASTER_TAGS`'s "CL =
 * classLevel once the gate is reached" rule exactly. The only place `@cl`
 * could read wrong below the gate level is inside a bloodrager/medium spell
 * formula — but `tables.ts`'s `BLOODRAGER_SPELLS_PER_DAY`/
 * `MEDIUM_SPELLS_PER_DAY`/`*_SPELLS_KNOWN` already return `null`/zero below
 * the gate, so no such formula is ever evaluated pre-gate in practice.
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
  "summonerUnchained",
  "skald",
  "witch",
  "shaman",
  "warpriest",
  "hunter",
  "mesmerist",
  "occultist",
  "spiritualist",
  // Psychic (Occult Adventures): int-based spontaneous FULL 9-level caster,
  // CL = class level from 1st level on with no late-start gate — a plain
  // member of this set like sorcerer/oracle. (Medium, its Occult Adventures
  // sibling, is a `LEVEL_GATED_CASTER_TAGS` entry instead — see below.
  // Kineticist casts no spells at all.)
  "psychic",
]);

/**
 * Classes whose caster level is exactly `classLevel` (no `-3`-style offset)
 * ONCE a minimum class level is reached, but cast NOTHING at all below that
 * level — a shape `FULL_CASTER_TAGS`'s binary "classLevel or 0" switch can't
 * represent (it would wrongly report a nonzero CL at levels below the gate,
 * with zero actual spellcasting to back it up).
 *
 * - **Bloodrager** (ACG): gate = 4th level. Confirmed via PF1 Core Rulebook
 *   ch.9's default caster-level rule plus an official Paizo designer ruling
 *   (Owen K.C. Stephens / Mark Seifter: a bloodrager's minimum caster level
 *   for 1st-level spells is 4, not 1 — i.e. NOT `bloodragerLevel - 3`-style;
 *   see also `packages/engine/src/tables.ts`'s `BLOODRAGER_SPELLS_PER_DAY`
 *   doc comment, which cites the same ruling for the spells-per-day table).
 * - **Medium** (Occult Adventures): gate = 4th level, verified on aonprd.com
 *   — a medium's spells-per-day table (`MEDIUM_SPELLS_PER_DAY` in
 *   `tables.ts`) starts at 4th level with the same "nothing before, flat
 *   `classLevel` from then on" shape as bloodrager, not psychic's "casts
 *   from 1st" shape.
 *
 * A future class added here must NOT copy paladin/ranger's `-3` offset
 * formula — this table is strictly for the "late start, then flat
 * `classLevel`" shape, not the "late start, then `classLevel - N`" shape.
 */
const LEVEL_GATED_CASTER_TAGS: Readonly<Record<string, number>> = {
  bloodrager: 4,
  medium: 4,
};

/**
 * Per-class caster level. Defaults to class level for full casters, 0 for
 * non-casters, and (for `LEVEL_GATED_CASTER_TAGS` entries) 0 below the gate
 * level then class level from the gate on. Classes whose CL diverges from
 * class level by an OFFSET (paladin, ranger, ...) still get an explicit
 * override here when they're added to the vendored slice — this module's two
 * tables don't yet cover that shape.
 *
 * Warpriest and hunter (ACG) both cast starting at 1st level with CL equal to
 * class level throughout (verified on aonprd.com — neither has the "-3"-style
 * divergence paladin/ranger do), so they're plain members of
 * `FULL_CASTER_TAGS` like cleric/druid/oracle.
 *
 * Mesmerist, occultist, and spiritualist (Occult Adventures) all cast psychic
 * spells starting at 1st level with CL equal to class level throughout (no
 * "-3"-style divergence — verified on aonprd.com, same as warpriest/hunter
 * above), so they're plain members of `FULL_CASTER_TAGS` too.
 */
export function casterLevelForClass(tag: string, classLevel: number): number {
  if (FULL_CASTER_TAGS.has(tag)) return classLevel;
  const gate = LEVEL_GATED_CASTER_TAGS[tag];
  if (gate !== undefined && classLevel >= gate) return classLevel;
  return 0;
}

/** A character's highest single-class caster level — used for feat prereqs. */
export function casterLevel(doc: CharacterDoc): number {
  let cl = 0;
  for (const c of doc.identity.classes) {
    cl = Math.max(cl, casterLevelForClass(c.tag, c.level));
  }
  return cl;
}

/** Whether a class tag is recognised as a caster at all (regardless of current level-gating). */
export function isCasterTag(tag: string): boolean {
  return FULL_CASTER_TAGS.has(tag) || tag in LEVEL_GATED_CASTER_TAGS;
}

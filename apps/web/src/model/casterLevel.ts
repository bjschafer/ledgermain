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
 *
 * Issue #66 chunk 2 (prestige casting advancement — Eldritch Knight, Mystic
 * Theurge, and any future "+1 level of existing spellcasting class" prestige
 * class) extends this module with `effectiveCasterClassLevel` /
 * `effectiveCasterLevel` / `castingAdvancementBonus` / `CASTER_KIND` /
 * `eligibleAdvancementTargets` below. The distinction that matters everywhere
 * else in the codebase: a caller that needs a class's NUMBERS (spells per
 * day/known/prepared, CL for display or feat prereqs) should route the class
 * level it feeds into the functions above through `effectiveCasterClassLevel`
 * first; a caller computing a class-FEATURE grant tied to the class's own
 * real level (bloodline/mystery/patron/discipline/spirit bonus spells known,
 * domain access, etc.) must keep using the RAW `identity.classes` level — see
 * each such call site's own comment for why (advancement grants table
 * numbers only, never accelerates a class feature).
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

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

// ---------------------------------------------------------------------------
// Prestige casting advancement (issue #66 chunk 2)
// ---------------------------------------------------------------------------

/**
 * Caster "kind" classification (arcane / divine / psychic) — used to validate
 * a prestige class's casting-advancement slot target (`Class.castingAdvancement`
 * in `@pf1/schema`'s `refdata.ts`): an `"arcane"`/`"divine"` slot may only
 * advance a class of the matching kind; an `"any"` slot accepts any of the
 * three (see `slotAcceptsKind` below for why).
 *
 * Deliberately broader than `FULL_CASTER_TAGS`/`LEVEL_GATED_CASTER_TAGS`
 * above: this module's own caster-LEVEL tables don't yet model bard, paladin,
 * or ranger (their CL diverges from class level and hasn't been wired in —
 * see `casterLevelForClass`'s doc comment), but `CASTER_MODELS` in
 * `model/spellcasting.ts` already treats all three as real casters with a
 * spells-per-day table, so they need a KIND here regardless of this module's
 * own CL-modeling gap.
 *
 * Cross-check against `ARCANE_CASTER_TAGS` in `packages/engine/src/compute.ts`
 * (used for arcane-spell-failure display): every tag marked `"arcane"` here —
 * wizard, sorcerer, bard, magus, witch, arcanist, bloodrager, summoner,
 * summonerUnchained, skald — is also in that set. The two lists answer
 * different questions (ASF display vs. advancement-target eligibility) but
 * describe the same underlying "is this class arcane" fact and must never
 * diverge on membership.
 *
 * Alchemist and investigator are deliberately ABSENT even though both are in
 * `FULL_CASTER_TAGS` above: PF1 RAW has them prepare "extracts", not spells,
 * from a "formula book", not a spellbook — a prestige casting-advancement
 * slot targets an "existing spellcasting class", which neither is. A slot
 * pointed at either always contributes 0 (see `castingAdvancementBonus`'s
 * `CASTER_KIND` guard).
 */
export const CASTER_KIND: Readonly<Record<string, "arcane" | "divine" | "psychic">> = {
  // Arcane
  wizard: "arcane",
  sorcerer: "arcane",
  bard: "arcane",
  magus: "arcane",
  witch: "arcane",
  arcanist: "arcane",
  bloodrager: "arcane",
  summoner: "arcane",
  summonerUnchained: "arcane",
  skald: "arcane",
  // Divine
  cleric: "divine",
  druid: "divine",
  paladin: "divine",
  ranger: "divine",
  oracle: "divine",
  inquisitor: "divine",
  shaman: "divine",
  warpriest: "divine",
  hunter: "divine",
  // Psychic (Occult Adventures)
  psychic: "psychic",
  medium: "psychic",
  mesmerist: "psychic",
  occultist: "psychic",
  spiritualist: "psychic",
};

/**
 * Whether a casting-advancement slot of `slotKind` may target `targetTag`.
 * `"arcane"`/`"divine"` slots require an exact `CASTER_KIND` match. An
 * `"any"` slot (RAW: "+1 level of existing spellcasting class", no kind
 * restriction in the printed text — e.g. Loremaster) accepts arcane, divine,
 * OR psychic: psychic casters postdate the classes that print `"any"` slots,
 * but nothing in the RAW text of an `"any"` slot excludes them either, so
 * this errs permissive there while `"arcane"`/`"divine"` slots stay strict
 * (a Mystic Theurge's arcane slot must never accept a psychic class — its
 * text names "arcane spellcasting class" explicitly). A target with no
 * `CASTER_KIND` entry at all (a non-caster, or an extract-preparer like
 * alchemist/investigator) is never compatible with any slot kind.
 */
function slotAcceptsKind(slotKind: "arcane" | "divine" | "any", targetTag: string): boolean {
  const kind = CASTER_KIND[targetTag];
  if (!kind) return false;
  return slotKind === "any" || kind === slotKind;
}

/** First `RefData.classes` entry whose `tag` matches, or `undefined` — classes are keyed by Foundry id, not tag. */
function classDefByTag(refData: RefData, tag: string) {
  return Object.values(refData.classes).find((c) => c.tag === tag);
}

/**
 * The bonus effective class level `targetTag` gains from every prestige
 * class + slot on the document whose STORED choice points at it (see
 * `CharacterDoc.build.castingAdvancement`'s doc comment in `@pf1/schema`
 * `character.ts` for the storage shape). Defensive by construction: a stale
 * target (the target class was removed from the build since the choice was
 * made), a target of the wrong kind for its slot (garbage written directly to
 * the doc, or a kind that changed after a `refData` update), or a target not
 * on `identity.classes` at all all contribute exactly 0 — invalid/stale
 * stored state must never inflate a character's numbers.
 */
export function castingAdvancementBonus(
  doc: CharacterDoc,
  refData: RefData,
  targetTag: string,
): number {
  if (!CASTER_KIND[targetTag]) return 0;
  if (!doc.identity.classes.some((c) => c.tag === targetTag)) return 0;

  let bonus = 0;
  for (const prestige of doc.identity.classes) {
    const classDef = classDefByTag(refData, prestige.tag);
    const slots = classDef?.castingAdvancement;
    if (!slots) continue;
    const chosen = doc.build.castingAdvancement?.[prestige.tag];
    if (!chosen) continue;
    slots.forEach((slot, i) => {
      if (chosen[i] !== targetTag) return;
      if (!slotAcceptsKind(slot.kind, targetTag)) return;
      bonus += slot.levels.filter((level) => level <= prestige.level).length;
    });
  }
  return bonus;
}

/**
 * `tag`'s effective class level: its own level from `identity.classes` plus
 * `castingAdvancementBonus`, clamped to 20 (every progression table in
 * `packages/engine/src/tables.ts` has exactly 20 rows — a level above that
 * has nowhere to read from). This is an EFFECTIVE CLASS LEVEL, not a caster
 * level — feed it through `casterLevelForClass(tag, ...)` for a class whose
 * CL diverges from class level, or straight into a spells-per-day/known/
 * prepared table (those already encode a class's own late-start gate, e.g.
 * bloodrager below 4th, from the raw class-level column).
 *
 * Returns 0 for a class the document doesn't have at all, same as
 * `castingAdvancementBonus` — advancement alone never manufactures a nonzero
 * level for a class the character doesn't actually have.
 */
export function effectiveCasterClassLevel(
  doc: CharacterDoc,
  refData: RefData,
  tag: string,
): number {
  const own = doc.identity.classes.find((c) => c.tag === tag)?.level ?? 0;
  if (own === 0) return 0;
  return Math.min(20, own + castingAdvancementBonus(doc, refData, tag));
}

/**
 * Highest single-class caster level across the document, advancement-aware
 * (issue #66 chunk 2) — the `refData`-aware counterpart to `casterLevel`
 * above, for callers (e.g. `PrereqContext.casterLevel`) that need feat
 * caster-level prerequisites to see a prestige class's advancement. A Wizard
 * 5 / Eldritch Knight 1 (EK slot 0 → wizard) reads CL 6 here even though the
 * plain `casterLevel(doc)` (still used anywhere `refData` isn't in scope)
 * reads CL 5.
 */
export function effectiveCasterLevel(doc: CharacterDoc, refData: RefData): number {
  let cl = 0;
  for (const c of doc.identity.classes) {
    cl = Math.max(cl, casterLevelForClass(c.tag, effectiveCasterClassLevel(doc, refData, c.tag)));
  }
  return cl;
}

/**
 * Valid target class tags for `prestigeTag`'s slot `slotIndex`: every class on
 * `identity.classes` (other than the prestige class itself — which can never
 * target itself, since prestige classes carry no `CASTER_KIND` entry of their
 * own) that is a real caster of a kind the slot accepts. Exported for the
 * chunk-3 builder UI's target picker; the same `slotAcceptsKind` check
 * `castingAdvancementBonus` uses, so a stored choice this function would
 * reject is exactly the choice that contributes 0 there.
 */
export function eligibleAdvancementTargets(
  doc: CharacterDoc,
  refData: RefData,
  prestigeTag: string,
  slotIndex: number,
): string[] {
  const slot = classDefByTag(refData, prestigeTag)?.castingAdvancement?.[slotIndex];
  if (!slot) return [];
  return doc.identity.classes
    .map((c) => c.tag)
    .filter((tag) => tag !== prestigeTag && slotAcceptsKind(slot.kind, tag));
}

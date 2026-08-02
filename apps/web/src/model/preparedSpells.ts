/**
 * Pure transitions for a prepared caster's daily loadout (`live.spells.prepared`).
 *
 * Three distinct verbs keep the spell pipeline legible:
 *   - the spellbook (`build.spells.known`) is managed in the builder (Add/Remove);
 *   - the loadout here is *prepared* from that spellbook (Prepare/Unprepare);
 *   - prepared instances are *cast* during play (expend), and a *rest* un-expends
 *     the whole loadout without disturbing what is prepared.
 *
 * Each prepared instance is independent, so the same spell can occupy several
 * slots. Operations that target a single instance take its array index, which is
 * stable within one render of the prepared list.
 */

import { metamagicDef, shamanSpiritMagicSlotLevels } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, PreparedSpell, RefData, Spell } from "@pf1/schema";

import { normalizeAlignmentCode } from "./names.js";
import { chosenOccultistImplementCount } from "./occultistImplements.js";
import {
  casterClassesOf,
  casterModelFor,
  channelSpellLine,
  type ChannelSpellLine,
  isElementalSchoolTag,
  knownSpellsFor,
  setKnownSpellsFor,
  storedClassTag,
  unlockedSpellLevels,
} from "./spellcasting.js";

function withPrepared(doc: CharacterDoc, prepared: PreparedSpell[]): CharacterDoc {
  return {
    ...doc,
    live: {
      ...doc.live,
      spells: {
        prepared,
        // Preserve spontaneous slot-usage fields: a multiclass character (e.g.
        // cleric/sorcerer) can have BOTH a prepared loadout AND spontaneous
        // slots meaningful at once, one per caster class.
        ...(doc.live.spells?.slotsUsed !== undefined
          ? { slotsUsed: doc.live.spells.slotsUsed }
          : {}),
        ...(doc.live.spells?.slotsUsedByClass !== undefined
          ? { slotsUsedByClass: doc.live.spells.slotsUsedByClass }
          : {}),
      },
    },
  };
}

/**
 * The current prepared loadout (empty for docs without `live.spells`),
 * across every caster class. Callers that care about one class's loadout
 * should filter by `(p.classTag ?? primaryCasterClassTag(doc, refData)) ===
 * classTag`; the index into THIS array is what `removePreparedAt`/
 * `setExpendedAt` expect, so filter without discarding the original index
 * (e.g. `preparedSpells(doc).forEach((p, index) => { if (!matches) return; ... })`).
 */
export function preparedSpells(doc: CharacterDoc): PreparedSpell[] {
  return doc.live.spells?.prepared ?? [];
}

/**
 * Append one un-expended prepared instance of `spellId` (normal slot).
 * `classTag` is the *stored* class tag (see `model/spellcasting.ts`
 * `storedClassTag`) — `undefined` for the primary caster class, so a
 * single-caster document's prepared entries are shaped exactly as before
 * multiclass support.
 */
export function prepareSpell(doc: CharacterDoc, spellId: string, classTag?: string): CharacterDoc {
  // `kind: "normal"` is the default per schema; omit so older docs/tests that
  // assert the bare shape continue to pass. Domain entries explicitly set it.
  return withPrepared(doc, [
    ...preparedSpells(doc),
    { spellId, expended: false, ...(classTag ? { classTag } : {}) },
  ]);
}

/**
 * Append one un-expended prepared instance of `spellId` into a domain slot.
 * Clerics may prepare a domain spell in a domain slot (one per accessible spell
 * level TOTAL, not per chosen domain — a second domain only widens which
 * spells may fill that one slot); the caller is responsible for the capacity check.
 * `classTag` is the stored class tag (see {@link prepareSpell}) — domain
 * slots only ever apply to a cleric class, but a cleric/X multiclass still
 * needs to tag its instances when cleric isn't the primary class.
 */
export function prepareDomainSpell(
  doc: CharacterDoc,
  spellId: string,
  classTag?: string,
): CharacterDoc {
  return withPrepared(doc, [
    ...preparedSpells(doc),
    { spellId, expended: false, kind: "domain", ...(classTag ? { classTag } : {}) },
  ]);
}

/**
 * Append one un-expended prepared instance of `spellId` into a specialist
 * wizard's bonus school slot. One per accessible spell level (1–9); the
 * caller is responsible for the capacity check (see {@link schoolSlotCapacity})
 * and for restricting the offered spell to the wizard's school (see
 * {@link isSchoolSlotEligible}). `classTag` is the stored class tag (see
 * {@link prepareSpell}).
 */
export function prepareSchoolSpell(
  doc: CharacterDoc,
  spellId: string,
  classTag?: string,
): CharacterDoc {
  return withPrepared(doc, [
    ...preparedSpells(doc),
    { spellId, expended: false, kind: "school", ...(classTag ? { classTag } : {}) },
  ]);
}

/**
 * Remove one prepared instance of `spellId`, preferring an un-expended one so a
 * decrement doesn't silently discard a still-available slot. Optional `kind`
 * restricts the removal to that slot kind (e.g. only a domain slot). `classTag`
 * (the stored class tag, see {@link prepareSpell}) restricts the removal to
 * that caster class — `undefined` matches only the primary class's instances
 * so a same-named spell prepared by a different class in the loadout is never
 * touched. No-op if none are prepared matching all the given filters.
 */
export function unprepareSpell(
  doc: CharacterDoc,
  spellId: string,
  kind?: "normal" | "domain" | "school",
  classTag?: string,
): CharacterDoc {
  const list = preparedSpells(doc);
  const matchesKind = (p: PreparedSpell) => kind === undefined || (p.kind ?? "normal") === kind;
  const matchesClass = (p: PreparedSpell) => (p.classTag ?? undefined) === classTag;
  let idx = list.findIndex(
    (p) => p.spellId === spellId && !p.expended && matchesKind(p) && matchesClass(p),
  );
  if (idx < 0) {
    idx = list.findIndex((p) => p.spellId === spellId && matchesKind(p) && matchesClass(p));
  }
  if (idx < 0) return doc;
  return withPrepared(
    doc,
    list.filter((_, i) => i !== idx),
  );
}

/** Remove the prepared instance at `index`. */
export function removePreparedAt(doc: CharacterDoc, index: number): CharacterDoc {
  const list = preparedSpells(doc);
  if (index < 0 || index >= list.length) return doc;
  return withPrepared(
    doc,
    list.filter((_, i) => i !== index),
  );
}

/** Set the `expended` flag of the prepared instance at `index` (cast / undo). */
export function setExpendedAt(doc: CharacterDoc, index: number, expended: boolean): CharacterDoc {
  const list = preparedSpells(doc);
  if (index < 0 || index >= list.length || list[index]!.expended === expended) return doc;
  return withPrepared(
    doc,
    list.map((p, i) => (i === index ? { ...p, expended } : p)),
  );
}

// ---------------------------------------------------------------------------
// Metamagic — applied per prepared instance.
// ---------------------------------------------------------------------------

/** Replace the prepared instance at `index` with `next`, dropping an empty `metamagic` array. */
function replacePreparedAt(
  doc: CharacterDoc,
  index: number,
  next: (p: PreparedSpell) => PreparedSpell,
): CharacterDoc {
  const list = preparedSpells(doc);
  if (index < 0 || index >= list.length) return doc;
  return withPrepared(
    doc,
    list.map((p, i) => {
      if (i !== index) return p;
      const updated = next(p);
      // Normalize: never persist an empty metamagic array (keeps the earlier shape).
      if (updated.metamagic && updated.metamagic.length === 0) {
        const { metamagic: _drop, ...rest } = updated;
        return rest;
      }
      return updated;
    }),
  );
}

/**
 * Toggle a metamagic feat on the prepared instance at `index`: adds it (with a
 * variable feat's default `levels`) if absent, removes it if present. No-op if
 * `slug` isn't a modeled metamagic feat. The caller is responsible for the
 * "would the resulting slot level exceed the caster's max slot" gate (the
 * model stays permissive; the UI enforces the cap).
 */
export function togglePreparedMetamagic(
  doc: CharacterDoc,
  index: number,
  slug: string,
): CharacterDoc {
  const def = metamagicDef(slug);
  if (!def) return doc;
  return replacePreparedAt(doc, index, (p) => {
    const current = p.metamagic ?? [];
    if (current.some((m) => m.slug === slug)) {
      return { ...p, metamagic: current.filter((m) => m.slug !== slug) };
    }
    const entry: AppliedMetamagic = def.variable ? { slug, levels: def.slotIncrease } : { slug };
    return { ...p, metamagic: [...current, entry] };
  });
}

/**
 * Set the chosen level increase of an already-applied VARIABLE metamagic
 * (Heighten/Reach) on the prepared instance at `index`. Clamped to at least 1.
 * No-op if the feat isn't applied, isn't variable, or `slug` is unmodeled.
 */
export function setPreparedMetamagicLevels(
  doc: CharacterDoc,
  index: number,
  slug: string,
  levels: number,
): CharacterDoc {
  const def = metamagicDef(slug);
  if (!def?.variable) return doc;
  const clamped = Math.max(1, Math.round(levels));
  return replacePreparedAt(doc, index, (p) => {
    const current = p.metamagic ?? [];
    if (!current.some((m) => m.slug === slug)) return p;
    return {
      ...p,
      metamagic: current.map((m) => (m.slug === slug ? { ...m, levels: clamped } : m)),
    };
  });
}

/**
 * Rest / new day: clear every `expended` flag, keeping the loadout intact.
 * `classTag` (the stored class tag, see {@link prepareSpell}) restricts the
 * reset to that caster class only — a multiclass character's other prepared
 * class(es) are untouched, so each class's "New day" button only rests its
 * own loadout.
 */
export function restPreparedSpells(doc: CharacterDoc, classTag?: string): CharacterDoc {
  const list = preparedSpells(doc);
  const matches = (p: PreparedSpell) => (p.classTag ?? undefined) === classTag;
  if (!list.some((p) => p.expended && matches(p))) return doc;
  return withPrepared(
    doc,
    list.map((p) => (matches(p) ? { ...p, expended: false } : p)),
  );
}

/**
 * Empty the loadout for one caster class (e.g. to re-prepare from scratch).
 * `classTag` (the stored class tag, see {@link prepareSpell}) restricts the
 * clear to that class; a multiclass character's other prepared class(es)
 * survive.
 */
export function clearPrepared(doc: CharacterDoc, classTag?: string): CharacterDoc {
  const list = preparedSpells(doc);
  const toKeep = list.filter((p) => (p.classTag ?? undefined) !== classTag);
  if (toKeep.length === list.length) return doc;
  return withPrepared(doc, toKeep);
}

// ---------------------------------------------------------------------------
// Spontaneous casting exceptions (cleric cure/inflict, druid summon nature's
// ally — CRB p.40-41/51 "Spontaneous Casting"). Both let a prepared caster
// "lose" a prepared spell (never an orison or domain/nature-bond-domain
// spell) to cast, instead, any spell of the relevant name-defined line (see
// `model/spellcasting.channelSpellLine`) of the SAME LEVEL OR LOWER. RAW is a
// genuine substitution at the moment of casting — the loadout itself never
// changes, only which slot gets spent — so the only doc-state this needs is
// the ordinary expend-a-slot transition (`setExpendedAt`); the "model" work
// here is entirely about resolving WHICH spells are legal substitutes.
// ---------------------------------------------------------------------------

const GOOD_ALIGNMENT_CODES = new Set(["LG", "NG", "CG"]);
const EVIL_ALIGNMENT_CODES = new Set(["LE", "NE", "CE"]);

/**
 * Which spontaneous-casting line a cleric's Spontaneous Casting exception
 * converts to, or `undefined` when unresolved (see below). PF1 RAW (CRB
 * p.51, verbatim): a good cleric (or one who worships a good deity) always
 * converts to cure spells; an evil cleric (or one who worships an evil
 * deity) always to inflict; "a cleric who is neither good nor evil and whose
 * deity is neither good nor evil can convert spells to either cure spells or
 * inflict spells (player's choice). Once the player makes this choice, it
 * cannot be reversed."
 *
 * Resolved from `identity.alignment` first (no per-class deity-alignment
 * mapping exists in the vendored data — same gap `alignment.ts` documents
 * for cleric's OWN alignment restriction — so this reads the character's
 * personal alignment, matching RAW's "or whose deity is" fallback in
 * practice for the overwhelming majority of characters, who share their
 * deity's alignment). Falls back to `build.clericChannelAlignment` — the
 * neutral-cleric build choice — whenever the alignment doesn't resolve to an
 * unambiguous good or evil code (a true-neutral alignment, OR no
 * alignment/an unrecognized one set at all, so the mechanic never silently
 * vanishes just because the player hasn't filled in Identity yet).
 */
export function clericSpontaneousAlignment(doc: CharacterDoc): "cure" | "inflict" | undefined {
  const code = doc.identity.alignment ? normalizeAlignmentCode(doc.identity.alignment) : undefined;
  if (code && GOOD_ALIGNMENT_CODES.has(code)) return "cure";
  if (code && EVIL_ALIGNMENT_CODES.has(code)) return "inflict";
  return doc.build.clericChannelAlignment;
}

/** Set (or clear) the neutral-cleric cure/inflict build choice (see {@link clericSpontaneousAlignment}). */
export function setClericChannelAlignment(
  doc: CharacterDoc,
  alignment: "cure" | "inflict" | null,
): CharacterDoc {
  return { ...doc, build: { ...doc.build, clericChannelAlignment: alignment ?? undefined } };
}

/** Set (or clear) the oracle's one-time cure/inflict spells-known choice (see `model/spellcasting.oracleChannelSpellsKnown`). */
export function setOracleChannelAlignment(
  doc: CharacterDoc,
  alignment: "cure" | "inflict" | null,
): CharacterDoc {
  return { ...doc, build: { ...doc.build, oracleChannelAlignment: alignment ?? undefined } };
}

/**
 * Which {@link ChannelSpellLine}(s) `casterTag`'s Spontaneous Casting
 * exception may convert a prepared spell into, for `doc`. A druid always
 * gets exactly `["summonNature"]` (not alignment-gated — every druid has the
 * same exception, CRB p.40-41). A cleric gets the one line
 * {@link clericSpontaneousAlignment} resolves to, or — when that's
 * `undefined` (a true-neutral or not-yet-specified cleric who hasn't made
 * the one-time build choice) — BOTH lines, so the exception stays usable
 * rather than disappearing behind an unmade choice; this is the one
 * deliberately permissive spot in an otherwise RAW-exact mechanic. Every
 * other caster gets `[]` — the exception simply doesn't exist for them.
 */
export function spontaneousConversionLines(
  doc: CharacterDoc,
  casterTag: string,
): ChannelSpellLine[] {
  if (casterTag === "druid") return ["summonNature"];
  if (casterTag === "cleric") {
    const alignment = clericSpontaneousAlignment(doc);
    return alignment ? [alignment] : ["cure", "inflict"];
  }
  return [];
}

export interface SpontaneousConversionOption {
  /** Which spell line this candidate belongs to (only meaningful for a cleric offered both, per {@link spontaneousConversionLines}). */
  kind: ChannelSpellLine;
  id: string;
  name: string;
  level: number;
}

/**
 * Legal spontaneous-conversion substitutes for a prepared slot of
 * `maxLevel` (PF1 RAW: "same spell level or lower") — the full cross product
 * of {@link spontaneousConversionLines} and {@link channelSpellLine}, sorted
 * by level then name. Empty for a caster with no exception, or a cleric
 * whose resolved line(s) have no vendored spells at `maxLevel` or below
 * (shouldn't happen for any level ≥1, since Cure/Inflict Light Wounds and
 * Summon Nature's Ally I are all 1st-level).
 */
export function spontaneousConversionOptions(
  doc: CharacterDoc,
  refData: RefData,
  casterTag: string,
  maxLevel: number,
): SpontaneousConversionOption[] {
  const out: SpontaneousConversionOption[] = [];
  for (const kind of spontaneousConversionLines(doc, casterTag)) {
    for (const sp of channelSpellLine(refData, kind, maxLevel)) out.push({ kind, ...sp });
  }
  return out;
}

/**
 * Cast the prepared instance at `index` as a spontaneous conversion (see
 * {@link spontaneousConversionOptions}) instead of its own prepared spell.
 * RAW spends the SLOT, not the specific prepared spell, so this is
 * mechanically identical to an ordinary cast — a thin, self-documenting
 * alias for {@link setExpendedAt} rather than new doc state. The caller
 * picks which substitute was cast (from `spontaneousConversionOptions`) only
 * to tell the player what happened (e.g. a toast); the doc itself doesn't
 * record which specific cure/inflict/summon spell filled the slot, same as
 * it doesn't record which specific damage type a Resist Energy cast on
 * someone else affected.
 */
export function castPreparedAsConversion(doc: CharacterDoc, index: number): CharacterDoc {
  return setExpendedAt(doc, index, true);
}

// ---------------------------------------------------------------------------
// Shaman Spirit Magic bonus spontaneous-cast slots (ACG "Spirit Magic").
//
// Distinct from the ordinary spontaneous-slot pool in `model/spontaneousSpells.ts`:
// that module tracks a REAL caster class's per-day slots against its own
// per-day/known tables (keyed by that class's own tag/classTag). This pool
// belongs to no `identity.classes` entry at all — it's a shaman-only bonus
// mechanic layered ON TOP of her ordinary prepared loadout — so it's tracked
// here, under a synthetic key (`"shaman:spiritMagic"`) in the SAME
// `live.spells.slotsUsedByClass` storage `spontaneousSpells.ts` uses (that
// field only requires a string key, never validated against
// `identity.classes`), rather than inventing a parallel schema field.
// ---------------------------------------------------------------------------

const SPIRIT_MAGIC_POOL_KEY = "shaman:spiritMagic";

function spiritMagicSlotsUsed(doc: CharacterDoc): Record<number, number> {
  return doc.live.spells?.slotsUsedByClass?.[SPIRIT_MAGIC_POOL_KEY] ?? {};
}

function withSpiritMagicSlotsUsed(doc: CharacterDoc, used: Record<number, number>): CharacterDoc {
  const prepared = doc.live.spells?.prepared ?? [];
  return {
    ...doc,
    live: {
      ...doc.live,
      spells: {
        prepared,
        ...(doc.live.spells?.slotsUsed !== undefined
          ? { slotsUsed: doc.live.spells.slotsUsed }
          : {}),
        slotsUsedByClass: { ...doc.live.spells?.slotsUsedByClass, [SPIRIT_MAGIC_POOL_KEY]: used },
      },
    },
  };
}

export interface SpiritMagicSlotStatus {
  level: number;
  /** 0 or 1 — RAW grants exactly one Spirit Magic slot per accessible spell level. */
  used: number;
  remaining: number;
}

/**
 * Spirit Magic slot status at every level `shamanLevel` can cast (see
 * `@pf1/engine`'s `shamanSpiritMagicSlotLevels`) — one bonus spontaneous slot
 * per level, castable only from the chosen spirit's Spirit Magic list
 * (`model/spellcasting.ts`'s `shamanSpiritSpellsKnown`).
 */
export function shamanSpiritMagicSlotStatus(
  doc: CharacterDoc,
  shamanLevel: number,
): SpiritMagicSlotStatus[] {
  const used = spiritMagicSlotsUsed(doc);
  return shamanSpiritMagicSlotLevels(shamanLevel).map((level) => {
    const u = (used[level] ?? 0) > 0 ? 1 : 0;
    return { level, used: u, remaining: 1 - u };
  });
}

/** Spend the Spirit Magic slot at `spellLevel`. No-op if already used or the level isn't accessible at `shamanLevel`. */
export function castSpiritMagicSlot(
  doc: CharacterDoc,
  shamanLevel: number,
  spellLevel: number,
): CharacterDoc {
  if (!shamanSpiritMagicSlotLevels(shamanLevel).includes(spellLevel)) return doc;
  const used = spiritMagicSlotsUsed(doc);
  if ((used[spellLevel] ?? 0) >= 1) return doc;
  return withSpiritMagicSlotsUsed(doc, { ...used, [spellLevel]: 1 });
}

/** Restore (undo) the Spirit Magic slot at `spellLevel`. No-op if not spent. */
export function restoreSpiritMagicSlot(doc: CharacterDoc, spellLevel: number): CharacterDoc {
  const used = spiritMagicSlotsUsed(doc);
  if ((used[spellLevel] ?? 0) === 0) return doc;
  const next = { ...used };
  delete next[spellLevel];
  return withSpiritMagicSlotsUsed(doc, next);
}

/** New day: restore every spent Spirit Magic slot. Returns the same doc reference when none were spent. */
export function resetSpiritMagicSlots(doc: CharacterDoc): CharacterDoc {
  const used = spiritMagicSlotsUsed(doc);
  if (Object.keys(used).length === 0) return doc;
  return withSpiritMagicSlotsUsed(doc, {});
}

// ---------------------------------------------------------------------------
// Occultist known-spell cap (implement schools).
// ---------------------------------------------------------------------------

/**
 * Occultist known-spell cap per spell level (Occult Adventures "Implements"
 * class feature, verified verbatim on aonprd.com): "For each implement
 * school he learns to use, he can add one spell of each level he can cast to
 * his list of spells known, chosen from that school's spell list... If he
 * selects the same implement school multiple times, he adds one spell of
 * each level from that school's list for each time he has selected that
 * school." The cap at every level she can currently cast (0-9, including
 * knacks — `CASTER_MODELS.occultist`'s own doc comment confirms knacks are
 * granted per implement school too, not a separate free-cantrip pool) is
 * therefore simply her total implement-school PICK COUNT — a multiset, so
 * repeats count individually (same convention
 * `occultistImplements.chosenOccultistImplementCount` uses for its own
 * budget) — uniform across every accessible level, never varying by level
 * the way a normal spells-known table does.
 *
 * `CASTER_MODELS.occultist` deliberately has no `knownProgression` (no
 * generic SRD "Spells Known" table exists for this class at all), so
 * `spellsKnownLimitsByLevel` can't express this cap — it only takes a class
 * level, never a build-choice-dependent `doc`. This is the occultist-specific
 * replacement callers should use instead, wherever they'd otherwise call
 * `spellsKnownLimitsByLevel` for occultist's known-spell picker.
 *
 * Same soft-warning posture as every other spells-known cap in this app
 * (sorcerer, bard, ...): advisory only — the caller is responsible for never
 * hard-blocking a pick past it.
 *
 * Unlike a table-driven `spellsKnownLimitsByLevel` cap, this one is derived
 * directly from which spell levels are castable at all — so it's threaded
 * through {@link unlockedSpellLevels} (rather than the RAW-only
 * `accessibleSpellLevels`) so the early-bonus-spells homebrew's early levels
 * get an implement-school known-spell slot too, same as every other level.
 * `abilityMod`/`earlyBonusSpells` are optional so existing RAW-only callers
 * are unaffected.
 */
export function occultistKnownSpellLimitsByLevel(
  doc: CharacterDoc,
  classLevel: number,
  abilityMod?: number,
  earlyBonusSpells?: "toSecond" | "all",
): { level: number; limit: number }[] {
  const model = casterModelFor("occultist");
  if (!model) return [];
  const cap = chosenOccultistImplementCount(doc);
  return unlockedSpellLevels(model, classLevel, abilityMod ?? 0, earlyBonusSpells).map((level) => ({
    level,
    limit: cap,
  }));
}

/**
 * spellId -> spell level for `casterTag`, inverted from the class spell list.
 * Used to bucket known/prepared spells by level for display and slot accounting.
 */
export function spellLevelMap(refData: RefData, casterTag: string): Map<string, number> {
  const map = new Map<string, number>();
  const list = refData.spellLists[casterTag];
  if (!list) return map;
  for (const [lvl, ids] of Object.entries(list)) {
    for (const id of ids) map.set(id, Number(lvl));
  }
  return map;
}

/**
 * spellId -> spell level for the given domain tags, inverted from the domain
 * spell lists. Used to bucket domain-slot prepared spells by level and to
 * validate that a spell prepared in a domain slot belongs to one of the
 * caster's chosen domains. `variant` selects the source: `"cleric"` (default)
 * reads `domainSpellLists`/`subdomainSpellLists`; `"druid"` reads
 * `druidDomainSpellLists` (a druid's nature-bond domain, which the two Vermin/
 * Ruins name collisions make distinct from the cleric list — see
 * `RefData.druidDomainSpellLists`). Empty if none of `domainTags` are
 * vendored. When a spell appears at differing levels, the lowest wins.
 */
export function domainSpellLevelMap(
  refData: RefData,
  domainTags: readonly string[],
  variant: "cleric" | "druid" = "cleric",
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tag of domainTags) {
    const list =
      variant === "druid"
        ? refData.druidDomainSpellLists[tag]
        : (refData.domainSpellLists[tag] ?? refData.subdomainSpellLists[tag]);
    if (!list) continue;
    for (const [lvl, ids] of Object.entries(list)) {
      const n = Number(lvl);
      for (const id of ids) {
        const existing = map.get(id);
        if (existing === undefined || n < existing) map.set(id, n);
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Wizard specialization schools — bonus school slot + opposition cost.
// ---------------------------------------------------------------------------

/**
 * Every spell id on an elemental school's bonus-slot list, flattened across
 * levels. Empty for a standard school tag or an unvendored one.
 */
function elementalSchoolSpellIds(refData: RefData, tag: string): Set<string> {
  const out = new Set<string>();
  for (const ids of Object.values(refData.elementalSchoolSpellLists[tag] ?? {})) {
    for (const id of ids) out.add(id);
  }
  return out;
}

/**
 * True when `spell` is on the wizard's specialty school list: `spell.school ===
 * build.wizardSchool` for a standard school, or membership in
 * `refData.elementalSchoolSpellLists` for an elemental one (whose spells span
 * many `Spell.school` values — see `ElementalSchoolTag`).
 */
function isInSchoolList(spell: Spell, school: string, refData: RefData): boolean {
  return isElementalSchoolTag(school)
    ? elementalSchoolSpellIds(refData, school).has(spell.id)
    : spell.school === school;
}

/**
 * True when `spell` may be prepared in the wizard's bonus school slot: it must
 * be on the specialty school's list (see {@link isInSchoolList}) AND already be
 * in the wizard's spellbook (`build.spells.known`, or its `byClass["wizard"]`
 * list for a multiclass wizard who isn't the primary caster class — see
 * `model/spellcasting.ts` `knownSpellsFor`) — PF1 RAW, the bonus slot is not a
 * free pick from the whole school, only from spells the wizard has actually
 * learned. Always false for a Universalist or when no school is chosen —
 * Universalists get no bonus school slot (PF1 RAW correction: their
 * compensation is arcane-school powers, deferred to Stage 4).
 */
export function isSchoolSlotEligible(spell: Spell, doc: CharacterDoc, refData: RefData): boolean {
  const school = doc.build.wizardSchool;
  if (!school || school === "uni") return false;
  if (!isInSchoolList(spell, school, refData)) return false;
  return knownSpellsFor(doc, refData, "wizard").includes(spell.id);
}

/**
 * How many normal slots preparing `spell` costs: 1 normally, 2 when it's
 * opposed (PF1 RAW — opposition spells always count double against the daily
 * prepared limit). A standard specialist opposes two schools by `spell.school`
 * (`build.wizardOppositionSchools`); an elemental specialist opposes a single
 * element (`build.wizardOppositionElement`), whose spells are its own
 * bonus-slot list rather than a `Spell.school` value. Non-wizards (neither
 * field set) always cost 1.
 */
export function oppositionCost(spell: Spell, doc: CharacterDoc, refData: RefData): number {
  const element = doc.build.wizardOppositionElement;
  if (element && isElementalSchoolTag(doc.build.wizardSchool)) {
    return elementalSchoolSpellIds(refData, element).has(spell.id) ? 2 : 1;
  }
  const opposition = doc.build.wizardOppositionSchools ?? [];
  if (opposition.length === 0) return 1;
  return spell.school && opposition.includes(spell.school) ? 2 : 1;
}

/**
 * A specialist wizard gets exactly one bonus school slot per accessible spell
 * level 1–9 (never cantrips, never a Universalist). Mirrors the cleric's
 * one-domain-slot-per-level capacity in `DomainSlotsSection`.
 */
export function schoolSlotCapacity(level: number): number {
  return level >= 1 && level <= 9 ? 1 : 0;
}

/**
 * Full class spell list for `casterTag`, grouped by level and sorted by name
 * within each level. Pass `excludeCantrips` to drop level 0 (for casters that
 * grant cantrips for free elsewhere via {@link import("./spellcasting.js").grantedCantrips}).
 * Used by both the builder's read-only class-list reference and the tracker's
 * prepare-from-class-list picker (for casters with `preparesFromClassList`),
 * so the two surfaces can never disagree about what's on the list.
 */
export function classSpellsByLevel(
  refData: RefData,
  casterTag: string,
  opts?: { excludeCantrips?: boolean },
): Map<number, { id: string; name: string }[]> {
  const map = new Map<number, { id: string; name: string }[]>();
  const list = refData.spellLists[casterTag];
  if (!list) return map;
  for (const [lvl, ids] of Object.entries(list)) {
    const n = Number(lvl);
    if (opts?.excludeCantrips && n === 0) continue;
    const entries: { id: string; name: string }[] = [];
    for (const id of ids) {
      const sp = refData.spells[id];
      if (sp) entries.push({ id, name: sp.name });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    map.set(n, entries);
  }
  return map;
}

/**
 * Strip granted cantrips from a caster class's known list and dedupe them in
 * `live.spells.prepared` for casters whose model grants all cantrips for free.
 * Runs once per caster class on the document (multiclass support — e.g. a
 * cleric/wizard multiclass reconciles both independently), so one class's
 * cantrips are never pruned by another's.
 *
 * Cantrips are derived from the class spell list instead of stored in the
 * spellbook, so any previously-stored cantrip ids in `known` are orphans.
 * Prepared cantrips do take slots and survive — but a cantrip cast at will
 * never needs more than one slot, so duplicate prepared instances are collapsed
 * to the first occurrence (per class — the same spell id prepared for two
 * different classes, e.g. a spell on both the cleric and wizard lists, is
 * deduped independently for each).
 *
 * Idempotent; returns the same doc reference when nothing changes. Call after
 * {@link migrateDoc} at load time (this needs RefData, which the pure doc
 * migration does not).
 */
export function reconcileGrantedCantrips(doc: CharacterDoc, refData: RefData): CharacterDoc {
  let next = doc;
  for (const { tag } of casterClassesOf(doc, refData)) {
    next = reconcileGrantedCantripsForClass(next, refData, tag);
  }
  return next;
}

function reconcileGrantedCantripsForClass(
  doc: CharacterDoc,
  refData: RefData,
  casterTag: string,
): CharacterDoc {
  const model = casterModelFor(casterTag);
  if (!model?.grantsAllCantrips) return doc;
  const cantrips = refData.spellLists[casterTag]?.[0];
  if (!cantrips || cantrips.length === 0) return doc;
  const cantripSet = new Set(cantrips);
  const classTag = storedClassTag(doc, refData, casterTag);

  const known = knownSpellsFor(doc, refData, casterTag);
  const nextKnown = known.filter((id) => !cantripSet.has(id));

  const prepared = doc.live.spells?.prepared ?? [];
  const seen = new Set<string>();
  const nextPrepared = prepared.filter((p) => {
    if ((p.classTag ?? undefined) !== classTag) return true; // other classes untouched
    if (!cantripSet.has(p.spellId)) return true;
    if (seen.has(p.spellId)) return false;
    seen.add(p.spellId);
    return true;
  });

  if (nextKnown.length === known.length && nextPrepared.length === prepared.length) {
    return doc;
  }
  const withKnown = setKnownSpellsFor(doc, refData, casterTag, nextKnown);
  return withPrepared(withKnown, nextPrepared);
}

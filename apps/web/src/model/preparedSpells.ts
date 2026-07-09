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

import { metamagicDef } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, PreparedSpell, RefData, Spell } from "@pf1/schema";

import {
  casterClassesOf,
  casterModelFor,
  knownSpellsFor,
  setKnownSpellsFor,
  storedClassTag,
} from "./spellcasting.js";

function withPrepared(doc: CharacterDoc, prepared: PreparedSpell[]): CharacterDoc {
  return {
    ...doc,
    live: {
      ...doc.live,
      spells: {
        prepared,
        // Preserve spontaneous slot-usage fields: a multiclass character (e.g.
        // cleric/sorcerer, issue #22) can have BOTH a prepared loadout AND
        // spontaneous slots meaningful at once, one per caster class.
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
 * level per chosen domain); the caller is responsible for the capacity check.
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
// Metamagic (issue #71) — applied per prepared instance.
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
      // Normalize: never persist an empty metamagic array (keeps pre-#71 shape).
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
 * spellId -> spell level for the given domain tags, inverted from
 * `refData.domainSpellLists`. Used to bucket domain-slot prepared spells by
 * level and to validate that a spell prepared in a domain slot belongs to one
 * of the cleric's chosen domains. Empty if none of `domainTags` are vendored.
 * When a spell appears in more than one chosen domain at differing levels,
 * the lowest level wins (rare; canonical domains agree on level-by-level).
 */
export function domainSpellLevelMap(
  refData: RefData,
  domainTags: readonly string[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tag of domainTags) {
    const list = refData.domainSpellLists[tag];
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
 * True when `spell` may be prepared in the wizard's bonus school slot: it must
 * match the wizard's specialty school (`spell.school === build.wizardSchool`)
 * AND already be in the wizard's spellbook (`build.spells.known`, or its
 * `byClass["wizard"]` list for a multiclass wizard who isn't the primary
 * caster class — see `model/spellcasting.ts` `knownSpellsFor`) — PF1 RAW, the
 * bonus slot is not a free pick from the whole school, only from spells the
 * wizard has actually learned. Always false for a Universalist or when no
 * school is chosen — Universalists get no bonus school slot (PF1 RAW
 * correction: their compensation is arcane-school powers, deferred to Stage 4).
 */
export function isSchoolSlotEligible(spell: Spell, doc: CharacterDoc, refData: RefData): boolean {
  const school = doc.build.wizardSchool;
  if (!school || school === "uni") return false;
  if (spell.school !== school) return false;
  return knownSpellsFor(doc, refData, "wizard").includes(spell.id);
}

/**
 * How many normal slots preparing `spell` costs: 1 normally, 2 when
 * `spell.school` is one of the wizard's chosen opposition schools (PF1 RAW —
 * opposition-school spells always count double against the daily prepared
 * limit). Non-wizards (no `wizardOppositionSchools` set) always cost 1.
 */
export function oppositionCost(spell: Spell, doc: CharacterDoc): number {
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
 * Runs once per caster class on the document (issue #22 multiclass support —
 * e.g. a cleric/wizard multiclass reconciles both independently), so one
 * class's cantrips are never pruned by another's.
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

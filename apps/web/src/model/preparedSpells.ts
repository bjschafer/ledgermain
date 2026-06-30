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

import type { CharacterDoc, PreparedSpell, RefData } from "@pf1/schema";

import { casterModelFor } from "./spellcasting.js";

function withPrepared(doc: CharacterDoc, prepared: PreparedSpell[]): CharacterDoc {
  return { ...doc, live: { ...doc.live, spells: { prepared } } };
}

/** The current prepared loadout (empty for docs without `live.spells`). */
export function preparedSpells(doc: CharacterDoc): PreparedSpell[] {
  return doc.live.spells?.prepared ?? [];
}

/** Append one un-expended prepared instance of `spellId` (normal slot). */
export function prepareSpell(doc: CharacterDoc, spellId: string): CharacterDoc {
  // `kind: "normal"` is the default per schema; omit so older docs/tests that
  // assert the bare shape continue to pass. Domain entries explicitly set it.
  return withPrepared(doc, [...preparedSpells(doc), { spellId, expended: false }]);
}

/**
 * Append one un-expended prepared instance of `spellId` into a domain slot.
 * Clerics may prepare a domain spell in a domain slot (one per accessible spell
 * level per chosen domain); the caller is responsible for the capacity check.
 */
export function prepareDomainSpell(doc: CharacterDoc, spellId: string): CharacterDoc {
  return withPrepared(doc, [
    ...preparedSpells(doc),
    { spellId, expended: false, kind: "domain" },
  ]);
}

/**
 * Remove one prepared instance of `spellId`, preferring an un-expended one so a
 * decrement doesn't silently discard a still-available slot. Optional `kind`
 * restricts the removal to that slot kind (e.g. only a domain slot). No-op if
 * none are prepared of the matching kind.
 */
export function unprepareSpell(
  doc: CharacterDoc,
  spellId: string,
  kind?: "normal" | "domain",
): CharacterDoc {
  const list = preparedSpells(doc);
  const matchesKind = (p: PreparedSpell) => kind === undefined || (p.kind ?? "normal") === kind;
  let idx = list.findIndex((p) => p.spellId === spellId && !p.expended && matchesKind(p));
  if (idx < 0) idx = list.findIndex((p) => p.spellId === spellId && matchesKind(p));
  if (idx < 0) return doc;
  return withPrepared(doc, list.filter((_, i) => i !== idx));
}

/** Remove the prepared instance at `index`. */
export function removePreparedAt(doc: CharacterDoc, index: number): CharacterDoc {
  const list = preparedSpells(doc);
  if (index < 0 || index >= list.length) return doc;
  return withPrepared(doc, list.filter((_, i) => i !== index));
}

/** Set the `expended` flag of the prepared instance at `index` (cast / undo). */
export function setExpendedAt(
  doc: CharacterDoc,
  index: number,
  expended: boolean,
): CharacterDoc {
  const list = preparedSpells(doc);
  if (index < 0 || index >= list.length || list[index]!.expended === expended) return doc;
  return withPrepared(
    doc,
    list.map((p, i) => (i === index ? { ...p, expended } : p)),
  );
}

/** Rest / new day: clear every `expended` flag, keeping the loadout intact. */
export function restPreparedSpells(doc: CharacterDoc): CharacterDoc {
  const list = preparedSpells(doc);
  if (!list.some((p) => p.expended)) return doc;
  return withPrepared(
    doc,
    list.map((p) => ({ ...p, expended: false })),
  );
}

/** Empty the entire loadout (e.g. to re-prepare from scratch). */
export function clearPrepared(doc: CharacterDoc): CharacterDoc {
  return preparedSpells(doc).length === 0 ? doc : withPrepared(doc, []);
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

/**
 * Strip granted cantrips from `build.spells.known` and dedupe them in
 * `live.spells.prepared` for casters whose model grants all cantrips for free.
 *
 * Cantrips are derived from the class spell list instead of stored in the
 * spellbook, so any previously-stored cantrip ids in `known` are orphans.
 * Prepared cantrips do take slots and survive — but a cantrip cast at will
 * never needs more than one slot, so duplicate prepared instances are collapsed
 * to the first occurrence.
 *
 * Idempotent; returns the same doc reference when nothing changes. Call after
 * {@link migrateDoc} at load time (this needs RefData, which the pure doc
 * migration does not).
 */
export function reconcileGrantedCantrips(
  doc: CharacterDoc,
  refData: RefData,
): CharacterDoc {
  const casterTag = doc.identity.classes
    .map((c) => c.tag)
    .find((t) => refData.spellLists[t]);
  if (!casterTag) return doc;
  const model = casterModelFor(casterTag);
  if (!model?.grantsAllCantrips) return doc;
  const cantrips = refData.spellLists[casterTag]?.[0];
  if (!cantrips || cantrips.length === 0) return doc;
  const cantripSet = new Set(cantrips);

  const known = doc.build.spells.known;
  const nextKnown = known.filter((id) => !cantripSet.has(id));

  const prepared = doc.live.spells?.prepared ?? [];
  const seen = new Set<string>();
  const nextPrepared = prepared.filter((p) => {
    if (!cantripSet.has(p.spellId)) return true;
    if (seen.has(p.spellId)) return false;
    seen.add(p.spellId);
    return true;
  });

  if (
    nextKnown.length === known.length &&
    nextPrepared.length === prepared.length
  ) {
    return doc;
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      spells: { ...doc.build.spells, known: nextKnown },
    },
    live: {
      ...doc.live,
      spells: { prepared: nextPrepared },
    },
  };
}

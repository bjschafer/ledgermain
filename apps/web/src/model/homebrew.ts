/**
 * Homebrew races/feats (v1): user-authored entries stored inside the doc
 * (`CharacterDoc.build.homebrew`, see its doc comment for why) and overlaid
 * onto vendored `RefData` at compute time. Every homebrew entity is keyed by
 * a `hb-`-prefixed id (see {@link homebrewId}) so it can never collide with a
 * vendored RefData id — the overlay is then just a shallow spread.
 */
import type { CharacterDoc, Feat, Race, RefData } from "@pf1/schema";

import { removeFeatInstance, setRace } from "./doc.js";
import { localId } from "./ids.js";

/** A fresh, session-unique homebrew id (`hb-...`) — never collides with a vendored id. */
export function homebrewId(): string {
  return `hb-${localId()}`;
}

/** True for any id produced by {@link homebrewId} — lets the UI badge homebrew entries. */
export function isHomebrewId(id: string): boolean {
  return id.startsWith("hb-");
}

/**
 * Overlay `doc.build.homebrew` onto `refData`. Returns `refData` UNCHANGED
 * (same reference) when the doc has no homebrew entries — cheap by design,
 * since the app recomputes on every doc change (see `state/useCharacter.ts`).
 * Otherwise returns a shallow copy with homebrew races/feats spread on top
 * (never shadowing anything: homebrew ids are `hb-`-prefixed and vendored
 * ids never are).
 */
export function resolveRefData(doc: CharacterDoc, refData: RefData): RefData {
  const homebrew = doc.build.homebrew;
  if (!homebrew || (!homebrew.races && !homebrew.feats)) return refData;
  return {
    ...refData,
    races: homebrew.races ? { ...refData.races, ...homebrew.races } : refData.races,
    feats: homebrew.feats ? { ...refData.feats, ...homebrew.feats } : refData.feats,
  };
}

/** Drops `build.homebrew` entirely once both its `races`/`feats` maps are empty, matching the schema's back-compat "optional/absent = none" posture. */
function pruneHomebrew(
  homebrew: NonNullable<CharacterDoc["build"]["homebrew"]>,
): CharacterDoc["build"]["homebrew"] {
  if (!homebrew.races && !homebrew.feats) return undefined;
  return homebrew;
}

/** Add or overwrite a homebrew race definition under `id` (use {@link homebrewId} for new entries). */
export function upsertHomebrewRace(doc: CharacterDoc, id: string, race: Race): CharacterDoc {
  const homebrew = doc.build.homebrew ?? {};
  return {
    ...doc,
    build: {
      ...doc.build,
      homebrew: { ...homebrew, races: { ...homebrew.races, [id]: race } },
    },
  };
}

/**
 * Remove a homebrew race definition. If it's the doc's currently-selected
 * `identity.race`, resets the race selection through the same cleanup
 * {@link setRace} applies on any race change (clears `flexibleAbility`,
 * `favoredClass2`, `racialTraits`) — a deleted race definition can't be left
 * selected any more than a swap to a different vendored race could.
 */
export function removeHomebrewRace(doc: CharacterDoc, id: string): CharacterDoc {
  const homebrew = doc.build.homebrew;
  if (!homebrew?.races?.[id]) return doc;
  const races = { ...homebrew.races };
  delete races[id];
  let next: CharacterDoc = {
    ...doc,
    build: {
      ...doc.build,
      homebrew: pruneHomebrew({
        ...homebrew,
        races: Object.keys(races).length > 0 ? races : undefined,
      }),
    },
  };
  if (doc.identity.race === id) next = setRace(next, "");
  return next;
}

/** Add or overwrite a homebrew feat definition under `id` (use {@link homebrewId} for new entries). */
export function upsertHomebrewFeat(doc: CharacterDoc, id: string, feat: Feat): CharacterDoc {
  const homebrew = doc.build.homebrew ?? {};
  return {
    ...doc,
    build: {
      ...doc.build,
      homebrew: { ...homebrew, feats: { ...homebrew.feats, [id]: feat } },
    },
  };
}

/**
 * Remove a homebrew feat definition. Strips EVERY instance of it from the
 * doc's feat list — the primary slot (`build.feats`/`build.featChoices`, via
 * {@link removeFeatInstance}) and any repeatable-feat extra instances
 * (`build.extraFeats`) — since a feat with no definition left in RefData
 * can't stay selected in any slot.
 */
export function removeHomebrewFeat(doc: CharacterDoc, id: string): CharacterDoc {
  const homebrew = doc.build.homebrew;
  if (!homebrew?.feats?.[id]) return doc;
  const feats = { ...homebrew.feats };
  delete feats[id];
  let next: CharacterDoc = {
    ...doc,
    build: {
      ...doc.build,
      homebrew: pruneHomebrew({
        ...homebrew,
        feats: Object.keys(feats).length > 0 ? feats : undefined,
      }),
    },
  };

  // Drop every extra instance first (removeFeatInstance's no-`instanceId`
  // form promotes the first extra into the primary slot instead of clearing
  // it, which is right for a normal removal but wrong here — the feat itself
  // no longer exists, so nothing should be left selected in any slot).
  for (const extra of next.build.extraFeats ?? []) {
    if (extra.featId === id) next = removeFeatInstance(next, id, extra.instanceId);
  }
  if (next.build.feats.includes(id)) next = removeFeatInstance(next, id);
  return next;
}

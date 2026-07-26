/**
 * The only module that knows how reference data reaches the browser. Two fetches
 * exist in this app: the index (once, at startup) and the single shard holding
 * whichever entry the player opened. Both are memoised — an in-flight promise is
 * cached, not just its result, so a fast double-click never fetches twice.
 */

import type { ConditionDef } from "@pf1/engine";
import type { ArmorRef, Feat, Item, Spell, WeaponRef } from "@pf1/schema";

import { bucketForId, shardPath } from "../shared/bucketing.js";
import type { CollectionId } from "../shared/collections.js";
import { decodeIndex, type EncodedIndex, type RefIndex } from "../shared/indexCodec.js";

const BASE = `${import.meta.env.BASE_URL}ref`;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

let indexCache: Promise<RefIndex> | undefined;

/** Load (and memoise) the search index. */
export function loadIndex(): Promise<RefIndex> {
  if (!indexCache) {
    indexCache = getJson<EncodedIndex>("index.json").then(decodeIndex);
  }
  return indexCache;
}

/** The full entry shape for each collection, keyed by collection id. */
export interface EntryByCollection {
  spells: Spell;
  feats: Feat;
  weapons: WeaponRef;
  armors: ArmorRef;
  items: Item;
  conditions: ConditionDef;
}

export type AnyEntry = EntryByCollection[CollectionId];

const shardCache = new Map<string, Promise<Record<string, AnyEntry>>>();

/**
 * Fetch the one shard that can hold `id` and return the entry, or `null` when
 * the id isn't there (a stale bookmark, or a hand-edited URL).
 */
export async function loadEntry<C extends CollectionId>(
  index: RefIndex,
  collection: C,
  id: string,
): Promise<EntryByCollection[C] | null> {
  const numBuckets = index.buckets[collection] ?? 1;
  const path = shardPath(collection, bucketForId(id, numBuckets));
  let shard = shardCache.get(path);
  if (!shard) {
    shard = getJson<Record<string, AnyEntry>>(path);
    shardCache.set(path, shard);
  }
  const entries = await shard;
  return (entries[id] as EntryByCollection[C] | undefined) ?? null;
}

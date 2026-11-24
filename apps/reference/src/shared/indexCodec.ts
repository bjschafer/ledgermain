/**
 * The wire format for `ref/index.json` — the site's single upfront download, so
 * every byte here is paid by every visitor before the first keystroke.
 *
 * Columnar rather than an array of objects: repeating `{"id":…,"name":…}` keys
 * ~8,000 times costs more than the data. The two low-cardinality columns
 * (collection code, spell level) are run-length encoded, which is nearly free
 * because the generator emits entries grouped by collection.
 */

import { type CollectionId, collectionAt, collectionCode } from "./collections.js";

/** A decoded index row — everything a result list needs, and nothing more. */
export interface IndexEntry {
  id: string;
  name: string;
  collection: CollectionId;
  /** Pre-formatted one-line summary (see `facets.ts`). */
  facet: string;
  /** Spell level for spells; `-1` for every other collection. */
  level: number;
  /**
   * Set on a row that names a section inside its entry rather than the entry
   * itself (a rules page's "Use a Scroll" paragraph): the `data-section` id
   * the detail page scrolls to.
   */
  anchor?: string;
}

export interface IndexMeta {
  /** Foundry content core version, e.g. "13.351". */
  contentVersion: string;
  /** Pinned dataset version, e.g. "11.11+10b87c070c86". */
  dataVersion: string;
  generatedAt: string;
}

/** The decoded index: rows plus everything the client needs to reach a shard. */
export interface RefIndex {
  meta: IndexMeta;
  entries: IndexEntry[];
  /** Shard count per collection — the modulus for `bucketForId`. */
  buckets: Record<string, number>;
  /** Condition ladders (mildest → severest), mirrored so the client skips the engine. */
  ladders: string[][];
  /** Id of the rules contents page, which `#/rules` opens. */
  rulesRoot: string;
}

/** The on-disk shape. Field names are short because they ship uncompressed keys. */
export interface EncodedIndex {
  v: 1;
  meta: IndexMeta;
  buckets: Record<string, number>;
  ladders: string[][];
  rulesRoot: string;
  ids: string[];
  names: string[];
  facets: string[];
  /** Run-length encoded collection codes: `[value, runLength, value, runLength, …]`. */
  coll: number[];
  /** Run-length encoded spell levels, `-1` outside `spells`. */
  levels: number[];
  /**
   * Which rows carry an `anchor`, as gaps from the previous such row (the
   * first from -1), paired index-for-index with `anchors`. Gaps, because the
   * anchored rows sit together and absolute row numbers cost five digits each.
   */
  anchorGaps: number[];
  anchors: string[];
}

/** `[value, runLength, …]`. Values repeat far more often than they vary here. */
export function rleEncode(values: readonly number[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    const lastIndex = out.length - 1;
    if (out.length > 0 && out[lastIndex - 1] === value) {
      out[lastIndex] = (out[lastIndex] ?? 0) + 1;
    } else {
      out.push(value, 1);
    }
  }
  return out;
}

export function rleDecode(encoded: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < encoded.length; i += 2) {
    const value = encoded[i] ?? 0;
    const run = encoded[i + 1] ?? 0;
    for (let n = 0; n < run; n++) out.push(value);
  }
  return out;
}

export function encodeIndex(index: RefIndex): EncodedIndex {
  const anchorGaps: number[] = [];
  const anchors: string[] = [];
  let previous = -1;
  index.entries.forEach((e, row) => {
    if (e.anchor === undefined) return;
    anchorGaps.push(row - previous);
    anchors.push(e.anchor);
    previous = row;
  });
  return {
    v: 1,
    meta: index.meta,
    buckets: index.buckets,
    ladders: index.ladders,
    rulesRoot: index.rulesRoot,
    ids: index.entries.map((e) => e.id),
    names: index.entries.map((e) => e.name),
    facets: index.entries.map((e) => e.facet),
    coll: rleEncode(index.entries.map((e) => collectionCode(e.collection))),
    levels: rleEncode(index.entries.map((e) => e.level)),
    anchorGaps,
    anchors,
  };
}

export function decodeIndex(encoded: EncodedIndex): RefIndex {
  const coll = rleDecode(encoded.coll);
  const levels = rleDecode(encoded.levels);
  const anchorAt = new Map<number, string>();
  let row = -1;
  encoded.anchorGaps.forEach((gap, i) => {
    row += gap;
    anchorAt.set(row, encoded.anchors[i] ?? "");
  });
  const entries: IndexEntry[] = [];
  for (let i = 0; i < encoded.ids.length; i++) {
    const collection = collectionAt(coll[i] ?? -1);
    // An unknown collection code means the index outran this build of the client;
    // dropping the row keeps the rest of the site usable.
    if (!collection) continue;
    const entry: IndexEntry = {
      id: encoded.ids[i] ?? "",
      name: encoded.names[i] ?? "",
      collection,
      facet: encoded.facets[i] ?? "",
      level: levels[i] ?? -1,
    };
    const anchor = anchorAt.get(i);
    if (anchor !== undefined) entry.anchor = anchor;
    entries.push(entry);
  }
  return {
    meta: encoded.meta,
    entries,
    buckets: encoded.buckets,
    ladders: encoded.ladders,
    rulesRoot: encoded.rulesRoot,
  };
}

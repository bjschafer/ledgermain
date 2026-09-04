/**
 * Client-side store for the fetched RefData collections, so a return visit
 * paints the sheet without re-downloading ~20 MB of JSON. That download is the
 * only thing between a phone on venue wifi and a blank sheet, and it buys
 * nothing: the dataset changes only when the vendored data is bumped.
 *
 * Keyed per file by its sha256 from `meta.json`'s `hashes`, not by the dataset
 * version, so a bump that touches one collection refetches that one file and
 * keeps the rest. `meta.json` carries the keys and so is never stored here.
 *
 * Every operation degrades to a miss. Storage can be absent (private browsing)
 * or full, and a cache that can't be read or written must cost the player
 * nothing beyond the download they would have paid anyway. A half-written
 * cache is likewise safe: rows are independent, so an interrupted write just
 * means fewer hits next time.
 */
import Dexie, { type Table } from "dexie";

interface CachedCollection {
  /** `<file>@<sha256>` — a changed collection lands on a new row instead of overwriting. */
  key: string;
  /**
   * The unparsed response text. Strings round-trip through IndexedDB far more
   * cheaply than a structured clone of a few hundred thousand small objects.
   */
  json: string;
}

class RefDataCacheDb extends Dexie {
  collections!: Table<CachedCollection, string>;

  constructor() {
    super("pf1-refdata");
    this.version(1).stores({ collections: "key" });
  }
}

// Constructed lazily: this module is imported in environments with no
// IndexedDB (tests, SSR-style tooling) that never open the cache.
let handle: RefDataCacheDb | undefined;

function openDb(): RefDataCacheDb | undefined {
  if (typeof indexedDB === "undefined") return undefined;
  if (!handle) handle = new RefDataCacheDb();
  return handle;
}

/** Row key for one collection file at one content hash. */
export function cacheKey(file: string, hash: string): string {
  return `${file}@${hash}`;
}

/** Stored rows that the current dataset no longer wants — previous bumps' collections. */
export function planPrune(stored: readonly string[], wanted: ReadonlySet<string>): string[] {
  return stored.filter((key) => !wanted.has(key));
}

export interface RefDataCache {
  /** The stored text for `file`, or `undefined` on a miss. Yields it once. */
  get(file: string): string | undefined;
  /** Offer freshly fetched text for storing. Written by `flush()`. */
  put(file: string, json: string): void;
  /** Store what was offered and drop superseded rows. Fire-and-forget. */
  flush(): void;
}

/** Read the rows matching `hashes` and hand back a cache the loader can read through. */
export async function openRefDataCache(hashes: Record<string, string>): Promise<RefDataCache> {
  const keys = new Map(Object.entries(hashes).map(([file, hash]) => [file, cacheKey(file, hash)]));
  const db = openDb();
  const hits = new Map<string, string>();
  if (db) {
    try {
      const files = [...keys.keys()];
      const rows = await db.collections.bulkGet(files.map((file) => keys.get(file) as string));
      rows.forEach((row, i) => {
        if (row) hits.set(files[i] as string, row.json);
      });
    } catch {
      // An unreadable cache is just a cold load.
    }
  }

  const pending: CachedCollection[] = [];
  return {
    get(file) {
      const json = hits.get(file);
      // Parsed once; drop our reference so the text can be collected while the
      // remaining collections are still being read.
      hits.delete(file);
      return json;
    },
    put(file, json) {
      const key = keys.get(file);
      if (key) pending.push({ key, json });
    },
    flush() {
      void write(db, pending, new Set(keys.values()));
    },
  };
}

/**
 * Wrap a text fetcher so a collection is read from `store` when it has one, and
 * offered back to it when it isn't. A row that won't parse is treated as a miss:
 * a corrupt cache must cost a download, never the load.
 */
export function cachedJson(
  store: RefDataCache,
  fetchText: (file: string) => Promise<string>,
): <T>(file: string) => Promise<T> {
  return async <T>(file: string): Promise<T> => {
    const cached = store.get(file);
    if (cached !== undefined) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Fall through to the network.
      }
    }
    const text = await fetchText(file);
    const parsed = JSON.parse(text) as T;
    store.put(file, text);
    return parsed;
  };
}

async function write(
  db: RefDataCacheDb | undefined,
  pending: CachedCollection[],
  wanted: ReadonlySet<string>,
): Promise<void> {
  if (!db) return;
  try {
    if (pending.length > 0) await db.collections.bulkPut(pending);
    const stale = planPrune(await db.collections.toCollection().primaryKeys(), wanted);
    if (stale.length > 0) await db.collections.bulkDelete(stale);
  } catch {
    // Full or unwritable storage costs the player only the next download.
  } finally {
    pending.length = 0;
  }
}

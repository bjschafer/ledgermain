/**
 * Content-addressed shard placement, shared verbatim by the build-time generator
 * and the browser. The search index carries no per-entry shard pointer: the
 * client recomputes `bucketForId` from the id it already has in the URL, which
 * keeps the one upfront download as small as possible.
 *
 * Both sides must agree exactly, so the arithmetic is written to stay in 32-bit
 * unsigned range (`Math.imul` + `>>> 0`) rather than trusting JS number coercion.
 */

/** 32-bit FNV-1a of a UTF-16 code-unit sequence. Ids are ASCII, so this is stable. */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Entries per shard. ~32 keeps a spell shard around 50 KB — one quick fetch. */
export const ENTRIES_PER_BUCKET = 32;

/** How many shards a collection of `count` entries is split into (never zero). */
export function bucketCount(count: number): number {
  return Math.max(1, Math.ceil(count / ENTRIES_PER_BUCKET));
}

/** Which shard of `numBuckets` holds `id`. */
export function bucketForId(id: string, numBuckets: number): number {
  if (numBuckets <= 1) return 0;
  return fnv1a(id) % numBuckets;
}

/** Path of a shard file, relative to the generated `ref/` root. */
export function shardPath(collection: string, bucket: number): string {
  return `shards/${collection}/${bucket}.json`;
}

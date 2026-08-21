/**
 * Build the reference site's static payload from the committed vendored data in
 * `packages/data-pipeline/data/`: one columnar search index plus hash-bucketed
 * entry shards, written to `public/ref/` (gitignored — the source of truth stays
 * in the data package). Runs via predev/prebuild.
 *
 * The split exists so the site downloads exactly two things: the index (once, up
 * front) and the ~32-entry shard holding whatever the player clicked. Nothing
 * records which shard an entry is in — the client recomputes `bucketForId` from
 * the id in the URL, which is why `src/shared/bucketing.ts` is imported here
 * rather than reimplemented.
 *
 * Also copies the repo-root `OGL.txt` and `NOTICE.md` into `public/` so the
 * deployed site can serve the Open Game License and the mixed-license notice at
 * runtime (REQUIRED by OGL Sec. 10 whenever Open Game Content is distributed,
 * and by Paizo's Community Use Policy for attribution).
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CONDITIONS, CONDITION_LADDERS } from "../../../packages/engine/src/conditions.js";
import type {
  ArmorRef,
  Feat,
  Item,
  Monster,
  MonsterTemplate,
  RefDataMeta,
  Spell,
  WeaponRef,
} from "@pf1/schema";

import { bucketCount, bucketForId } from "../src/shared/bucketing.js";
import type { CollectionId } from "../src/shared/collections.js";
import {
  armorFacet,
  conditionFacet,
  featFacet,
  itemFacet,
  monsterFacet,
  monsterTemplateFacet,
  spellFacet,
  weaponFacet,
} from "../src/shared/facets.js";
import { encodeIndex, type IndexEntry, type RefIndex } from "../src/shared/indexCodec.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const dataDir = join(repoRoot, "packages/data-pipeline/data");
const publicDir = join(here, "../public");
const refDir = join(publicDir, "ref");

function readCollection<T>(file: string): Record<string, T> {
  return JSON.parse(readFileSync(join(dataDir, file), "utf8")) as Record<string, T>;
}

const meta = JSON.parse(readFileSync(join(dataDir, "meta.json"), "utf8")) as RefDataMeta;

rmSync(refDir, { recursive: true, force: true });
mkdirSync(refDir, { recursive: true });

const indexEntries: IndexEntry[] = [];
const buckets: Record<string, number> = {};
let shardsWritten = 0;

/**
 * Index one collection and write its shards. Entries are walked in sorted-id
 * order purely so the output is byte-stable across runs.
 */
function emit<T extends { id: string; name: string }>(
  collection: CollectionId,
  entries: Record<string, T>,
  facet: (entry: T) => string,
  level?: (entry: T) => number,
): void {
  const ids = Object.keys(entries).sort();
  const numBuckets = bucketCount(ids.length);
  buckets[collection] = numBuckets;

  const shards: Record<string, T>[] = Array.from({ length: numBuckets }, () => ({}));
  for (const id of ids) {
    const entry = entries[id];
    if (!entry) continue;
    indexEntries.push({
      id,
      name: entry.name,
      collection,
      facet: facet(entry),
      level: level ? level(entry) : -1,
    });
    const shard = shards[bucketForId(id, numBuckets)];
    if (shard) shard[id] = entry;
  }

  const shardDir = join(refDir, "shards", collection);
  mkdirSync(shardDir, { recursive: true });
  shards.forEach((shard, bucket) => {
    writeFileSync(join(shardDir, `${bucket}.json`), JSON.stringify(shard));
    shardsWritten++;
  });
}

emit<Spell>("spells", readCollection("spells.json"), spellFacet, (spell) => spell.level);
emit<Feat>("feats", readCollection("feats.json"), featFacet);
emit<WeaponRef>("weapons", readCollection("weapons.json"), weaponFacet);
emit<ArmorRef>("armors", readCollection("armors.json"), armorFacet);
emit<Item>("items", readCollection("items.json"), itemFacet);
// Conditions have no vendored JSON: they are the engine's hand-authored
// clean-room table, emitted here as an ordinary collection.
emit("conditions", CONDITIONS, conditionFacet);
// The two sidecar collections (emitted beside RefData, never RefData keys).
emit<Monster>("monsters", readCollection("monsters.json"), monsterFacet);
emit<MonsterTemplate>(
  "monster-templates",
  readCollection("monster-templates.json"),
  monsterTemplateFacet,
);

const index: RefIndex = {
  meta: {
    contentVersion: meta.contentVersion,
    dataVersion: meta.dataVersion,
    generatedAt: new Date().toISOString(),
  },
  entries: indexEntries,
  buckets,
  ladders: CONDITION_LADDERS.map((ladder) => [...ladder]),
};

const indexJson = JSON.stringify(encodeIndex(index));
writeFileSync(join(refDir, "index.json"), indexJson);

// Ship the OGL + NOTICE alongside the data so the deployed site is compliant.
for (const file of ["OGL.txt", "NOTICE.md", "LICENSE"]) {
  copyFileSync(join(repoRoot, file), join(publicDir, file));
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`[build-ref-index] ${indexEntries.length} entries, ${shardsWritten} shards`);
console.log(`[build-ref-index] index.json ${kb(Buffer.byteLength(indexJson))} -> ${refDir}`);
console.log(`[build-ref-index] also copied OGL.txt, NOTICE.md, LICENSE -> ${publicDir}`);

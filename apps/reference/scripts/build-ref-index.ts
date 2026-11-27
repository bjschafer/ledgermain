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
 * Collections whose vendored ids are opaque Foundry ids (spells, feats, gear)
 * are re-keyed here by name slug, so their URLs read `#/spells/mage-armor`.
 * The engine and saved characters keep the Foundry ids; only this payload
 * uses the slugs.
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
  FeatRef,
  Item,
  Monster,
  MonsterTemplate,
  RefDataMeta,
  RuleEntry,
  SourceRef,
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
  ruleFacet,
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

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Re-key a collection by name slug, mapping each Foundry id to its URL id.
 * Every entry in a name clash gets its first source's id appended, so no URL
 * depends on which of them sorts first.
 */
function readBySlug<T extends { id: string; name: string; sources?: SourceRef[] }>(
  file: string,
): { entries: Record<string, T>; urlIds: Map<string, string> } {
  const vendored = Object.values(readCollection<T>(file));
  const nameCount = new Map<string, number>();
  for (const e of vendored) nameCount.set(slug(e.name), (nameCount.get(slug(e.name)) ?? 0) + 1);
  const entries: Record<string, T> = {};
  const urlIds = new Map<string, string>();
  for (const e of vendored) {
    const base = slug(e.name);
    const source = e.sources?.[0]?.id;
    const id = nameCount.get(base)! > 1 && source ? `${base}-${slug(source)}` : base;
    if (!base || id in entries) {
      throw new Error(
        `[build-ref-index] no unique URL id in ${file} for "${e.name}" (got "${id}")`,
      );
    }
    entries[id] = { ...e, id };
    urlIds.set(e.id, id);
  }
  return { entries, urlIds };
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

const spells = readBySlug<Spell>("spells.json").entries;

// Only the tags some spell lists: the index ships this map to every visitor.
const spellClassTags = new Set(
  Object.values(spells).flatMap((s) => Object.keys(s.learnedAt.class)),
);
const classNames: Record<string, string> = {};
for (const cls of Object.values(readCollection<{ tag: string; name: string }>("classes.json"))) {
  if (spellClassTags.has(cls.tag)) classNames[cls.tag] = cls.name;
}

const feats = readBySlug<Feat>("feats.json");
const featLink = (ref: FeatRef): FeatRef => {
  const id = feats.urlIds.get(ref.id);
  if (!id) throw new Error(`[build-ref-index] feat prerequisite "${ref.name}" names no feat`);
  return { ...ref, id };
};
for (const feat of Object.values(feats.entries)) {
  const p = feat.prerequisites;
  p.feats = p.feats.map(featLink);
  if (p.featsAnyOf) p.featsAnyOf = p.featsAnyOf.map((group) => group.map(featLink));
}

emit<Spell>(
  "spells",
  spells,
  (spell) => spellFacet(spell, classNames),
  (spell) => spell.level,
);
emit<Feat>("feats", feats.entries, featFacet);
emit<WeaponRef>("weapons", readBySlug<WeaponRef>("weapons.json").entries, weaponFacet);
emit<ArmorRef>("armors", readBySlug<ArmorRef>("armors.json").entries, armorFacet);
emit<Item>("items", readBySlug<Item>("items.json").entries, itemFacet);
// Conditions have no vendored JSON: they are the engine's hand-authored
// clean-room table, emitted here as an ordinary collection.
emit("conditions", CONDITIONS, conditionFacet);
// The sidecar collections (emitted beside RefData, never RefData keys).
emit<Monster>("monsters", readCollection("monsters.json"), monsterFacet);
emit<MonsterTemplate>(
  "monster-templates",
  readCollection("monster-templates.json"),
  monsterTemplateFacet,
);

const rules = readCollection<RuleEntry>("rules.json");
emit<RuleEntry>("rules", rules, ruleFacet);

// The contents page is the one entry no other page lists as a child.
const childIds = new Set(Object.values(rules).flatMap((rule) => rule.children.map((c) => c.id)));
const rulesRoots = Object.keys(rules).filter((id) => !childIds.has(id));
if (rulesRoots.length !== 1) throw new Error(`expected one rules root, found ${rulesRoots.length}`);
const rulesRoot = rulesRoots[0]!;

/**
 * Section titles found on more pages than this ("Check", "Action", "Try
 * Again" on every skill) name a kind of paragraph, not a rule, and would bury
 * the specific ones in results. They stay linked from their own page.
 */
const GENERIC_SECTION_PAGES = 3;
const pagesWithTitle = new Map<string, number>();
for (const rule of Object.values(rules)) {
  for (const title of new Set(rule.sections.map((s) => s.title.toLowerCase()))) {
    pagesWithTitle.set(title, (pagesWithTitle.get(title) ?? 0) + 1);
  }
}
// Section rows share their page's id (and so its shard), after every page row.
for (const id of Object.keys(rules).sort()) {
  const rule = rules[id]!;
  for (const section of rule.sections) {
    const title = section.title.toLowerCase();
    if ((pagesWithTitle.get(title) ?? 0) > GENERIC_SECTION_PAGES) continue;
    if (title === rule.name.toLowerCase()) continue;
    indexEntries.push({
      id,
      name: section.title,
      collection: "rules",
      facet: `in ${rule.name}`,
      level: -1,
      anchor: section.id,
    });
  }
}

const index: RefIndex = {
  meta: {
    contentVersion: meta.contentVersion,
    dataVersion: meta.dataVersion,
    generatedAt: new Date().toISOString(),
  },
  entries: indexEntries,
  buckets,
  ladders: CONDITION_LADDERS.map((ladder) => [...ladder]),
  rulesRoot,
  rulesChapters: rules[rulesRoot]!.children.map((c) => c.id),
  classNames,
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

import { join } from "node:path";

import type { Monster } from "@pf1/schema";

import {
  newMonsterParseStats,
  parseMonsterEntry,
  type MonsterParseStats,
} from "../util/monsterStatblock.js";
import {
  pfDataCatalogEntries,
  pfDataSourceRefs,
  readPfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/**
 * Id scheme: a single-statblock entry keeps its dictionary key; each block of
 * a multi-`::mh` entry (the elemental size ladders and a dozen others) gets
 * `<key>--<slug of the block's own name>`. No bare-key block exists for a
 * multi entry — designating one size as "the" earth elemental would be
 * arbitrary, and the reference site's search finds each block by its own name.
 */
function blockId(key: string, blockName: string, blockCount: number): string {
  if (blockCount === 1) return key;
  const slug = blockName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${key}--${slug}`;
}

function preferFullerName(entryName: string, headerName: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  if (norm(headerName) !== norm(entryName) && norm(headerName).includes(norm(entryName))) {
    return headerName;
  }
  return entryName;
}

function transformEntry(key: string, entry: PfDataEntry, stats: MonsterParseStats): Monster[] {
  const parsed = parseMonsterEntry(entry, stats);
  if (parsed === undefined) return [];
  const shared = {
    ...(parsed.descriptionHtml !== undefined ? { description: parsed.descriptionHtml } : {}),
    ...(parsed.specialAbilitiesHtml !== undefined
      ? { specialAbilitiesHtml: parsed.specialAbilitiesHtml }
      : {}),
  };
  return parsed.blocks.map(({ name, monster }) => {
    const id = blockId(key, name, parsed.blocks.length);
    return {
      ...shared,
      ...monster,
      id,
      uuid: `pfdata:monster:${id}`,
      // Between the dictionary entry's name and the `::mh` label, prefer
      // whichever subsumes the other: the entry name carries the family
      // parenthetical players search by ("Bralani (Azata)" over "Bralani"),
      // but the header carries a qualifying prefix the entry drops ("Mythic
      // Aboleth" over "Aboleth"). Multi-statblock entries always need their
      // per-block label ("Small Earth Elemental").
      name: parsed.blocks.length === 1 ? preferFullerName(entry.name ?? name, name) : name,
      // Prefer the block's own page-precise `::minfo source` ref; fall back to
      // the entry's plain book list.
      sources: monster.sources ?? pfDataSourceRefs(entry),
    };
  });
}

/**
 * Transform the monster dictionaries (`SLICE.monsterFiles`) into the vendored
 * `Monster[]` catalog — see `util/monsterStatblock.ts` for the parsing
 * postures. Returns the parse stats alongside so `normalize` can log them and
 * the vendored-output tests can pin the failure counters.
 */
export function transformMonsters(
  pfDataJsonDir: string,
  files: readonly string[],
): { monsters: Monster[]; stats: MonsterParseStats } {
  const stats = newMonsterParseStats();
  const monsters: Monster[] = [];
  for (const file of files) {
    const dict = readPfDataDictionary(join(pfDataJsonDir, `${file}.json`));
    for (const [key, entry] of pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS })) {
      monsters.push(...transformEntry(key, entry, stats));
    }
  }
  return { monsters, stats };
}

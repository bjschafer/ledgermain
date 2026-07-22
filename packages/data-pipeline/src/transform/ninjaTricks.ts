import type { NinjaTrick } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_ninja_tricks.json` dictionary entry to a `NinjaTrick` — mirrors `transformRagePower`. */
function transformNinjaTrick(id: string, entry: PfDataEntry): NinjaTrick {
  return {
    id,
    uuid: `pfdata:ninja-trick:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full ninja-trick dictionary into the vendored `NinjaTrick[]` catalog. */
export function transformNinjaTricks(dict: PfDataDictionary): NinjaTrick[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformNinjaTrick(id, entry),
  );
}

import type { RogueTalent } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_rogue_talents.json` dictionary entry to a `RogueTalent` — mirrors `transformRagePower`. */
function transformRogueTalent(id: string, entry: PfDataEntry): RogueTalent {
  return {
    id,
    uuid: `pfdata:rogue-talent:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full rogue-talent dictionary into the vendored `RogueTalent[]` catalog. */
export function transformRogueTalents(dict: PfDataDictionary): RogueTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformRogueTalent(id, entry),
  );
}

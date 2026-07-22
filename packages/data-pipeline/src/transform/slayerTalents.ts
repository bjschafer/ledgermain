import type { SlayerTalent } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_slayer_talents.json` dictionary entry to a `SlayerTalent` — mirrors `transformRagePower`. */
function transformSlayerTalent(id: string, entry: PfDataEntry): SlayerTalent {
  return {
    id,
    uuid: `pfdata:slayer-talent:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full slayer-talent dictionary into the vendored `SlayerTalent[]` catalog. */
export function transformSlayerTalents(dict: PfDataDictionary): SlayerTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformSlayerTalent(id, entry),
  );
}

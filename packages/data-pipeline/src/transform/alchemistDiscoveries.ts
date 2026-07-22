import type { AlchemistDiscovery } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_discoveries.json` dictionary entry to an `AlchemistDiscovery`, mirroring `transformRagePower`. */
function transformAlchemistDiscovery(id: string, entry: PfDataEntry): AlchemistDiscovery {
  return {
    id,
    uuid: `pfdata:alchemist-discovery:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full alchemist-discovery dictionary into the vendored `AlchemistDiscovery[]` catalog. */
export function transformAlchemistDiscoveries(dict: PfDataDictionary): AlchemistDiscovery[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformAlchemistDiscovery(id, entry),
  );
}

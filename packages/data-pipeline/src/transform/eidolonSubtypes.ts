import type { EidolonSubtype } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_unchained_eidolons.json` dictionary entry to an `EidolonSubtype`. */
function transformEidolonSubtype(id: string, entry: PfDataEntry): EidolonSubtype {
  return {
    id,
    uuid: `pfdata:eidolon-subtype:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full eidolon-subtype dictionary into the vendored `EidolonSubtype[]` catalog. */
export function transformEidolonSubtypes(dict: PfDataDictionary): EidolonSubtype[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformEidolonSubtype(id, entry),
  );
}

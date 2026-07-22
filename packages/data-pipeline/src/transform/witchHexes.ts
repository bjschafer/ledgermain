import type { WitchHex } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel, structurally indistinguishable from a real entry. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps the source's `category` ("hex" | "majorhex" | "grandhex") to this project's tier convention — see `WitchHex.tier`'s doc comment for the empirical validation behind this. */
function tierFromCategory(category: string | undefined): "hex" | "major" | "grand" {
  if (category === "majorhex") return "major";
  if (category === "grandhex") return "grand";
  return "hex";
}

/** Maps one `json/class_ability_hexes.json` dictionary entry to a `WitchHex` — the only witch-hex-specific piece of this import, mirroring `transformRagePower`. */
function transformWitchHex(id: string, entry: PfDataEntry): WitchHex {
  return {
    id,
    uuid: `pfdata:witch-hex:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    tier: tierFromCategory(entry.category),
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full witch-hex dictionary into the vendored `WitchHex[]` catalog. */
export function transformWitchHexes(dict: PfDataDictionary): WitchHex[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformWitchHex(id, entry),
  );
}

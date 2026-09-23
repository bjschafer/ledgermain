import type { MagusArcana } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataHeaderNameSuffix,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel, structurally indistinguishable from a real entry. The one `redirect` alias (`greater_arcane_redoubt` -> `arcane_redoubt_greater`) is already dropped generically. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_magus_arcana.json` dictionary entry to a
 * `MagusArcana`. This source has no top-level `nameSuffix` field (unlike rage
 * powers/hexes): every entry opens, past its citation, with its own
 * `::ab[Name (Su):]{...}` ability, whose label carries the suffix.
 */
function transformMagusArcanum(id: string, entry: PfDataEntry): MagusArcana {
  return {
    id,
    uuid: `pfdata:magus-arcana:${id}`,
    name: entry.name!,
    nameSuffix: pfDataHeaderNameSuffix(entry.description),
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full magus-arcana dictionary into the vendored `MagusArcana[]` catalog. */
export function transformMagusArcana(dict: PfDataDictionary): MagusArcana[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMagusArcanum(id, entry),
  );
}

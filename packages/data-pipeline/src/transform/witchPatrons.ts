import type { WitchPatron } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel. */
const SKIP_KEYS = new Set(["not_found"]);

function isPatronCategory(value: string | undefined): value is "basic" | "unique" {
  return value === "basic" || value === "unique";
}

/**
 * Maps one `json/class_ability_patrons.json` dictionary entry to a
 * `WitchPatron`. Unlike the mystery/curse/spirit/bloodline imports in this
 * same wave, this file's entries carry no leading `## Name`/`‹SOURCE ...›`
 * header lines — a "basic" patron's `description` is just its bare 9-spell
 * progression line — so no `pfDataBodyLines` stripping is needed here.
 */
function transformWitchPatron(id: string, entry: PfDataEntry): WitchPatron {
  return {
    id,
    uuid: `pfdata:witch-patron:${id}`,
    name: entry.name!,
    category: isPatronCategory(entry.category) ? entry.category : undefined,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full witch-patron dictionary into the vendored `WitchPatron[]` catalog. */
export function transformWitchPatrons(dict: PfDataDictionary): WitchPatron[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformWitchPatron(id, entry),
  );
}

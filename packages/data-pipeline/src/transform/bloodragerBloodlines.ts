import type { BloodragerBloodline } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_bloodrager_bloodlines.json` dictionary entry
 * to a `BloodragerBloodline`. This file's bonus-feat/bonus-spell/power
 * blocks use the dataset's structured `::ab[Name]{l=N ...}`/
 * `::list[Label]{...}` directives (rendered to readable prose by the shared
 * reader — see `util/pfdata.ts`), unlike every other catalog in this wave.
 */
function transformBloodragerBloodline(id: string, entry: PfDataEntry): BloodragerBloodline {
  return {
    id,
    uuid: `pfdata:bloodrager-bloodline:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full bloodrager-bloodline dictionary into the vendored `BloodragerBloodline[]` catalog. */
export function transformBloodragerBloodlines(dict: PfDataDictionary): BloodragerBloodline[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformBloodragerBloodline(id, entry),
  );
}

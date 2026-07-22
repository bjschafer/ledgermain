import type { SorcererBloodline } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * See `pfDataCatalogEntries`'s doc comment — the dataset's "not found"
 * sentinel. The one `kobold` -> `kobold_sorcerer` redirect is already
 * dropped generically (has no `description` of its own).
 */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_sorcerer_bloodlines.json` dictionary entry to
 * a `SorcererBloodline`. A bloodline's Wildblooded Mutation variants (a
 * `::h3[...]` sub-heading, see `util/pfdata.ts`) stay inline in the rendered
 * prose rather than becoming their own entries — same posture as a
 * mystery's inline "### Revelations" section.
 */
function transformSorcererBloodline(id: string, entry: PfDataEntry): SorcererBloodline {
  return {
    id,
    uuid: `pfdata:sorcerer-bloodline:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full sorcerer-bloodline dictionary into the vendored `SorcererBloodline[]` catalog. */
export function transformSorcererBloodlines(dict: PfDataDictionary): SorcererBloodline[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformSorcererBloodline(id, entry),
  );
}

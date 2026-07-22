import type { PhrenicAmplification } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_phrenic_amplifications.json` dictionary entry to a `PhrenicAmplification` — mirrors `transformRagePower`, renaming the source's `"MajorAmp"` category to this project's `"basic" | "major"` tier convention. */
function transformPhrenicAmplification(id: string, entry: PfDataEntry): PhrenicAmplification {
  return {
    id,
    uuid: `pfdata:phrenic-amplification:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    tier: entry.category === "MajorAmp" ? "major" : "basic",
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full phrenic-amplification dictionary into the vendored `PhrenicAmplification[]` catalog. */
export function transformPhrenicAmplifications(dict: PfDataDictionary): PhrenicAmplification[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformPhrenicAmplification(id, entry),
  );
}

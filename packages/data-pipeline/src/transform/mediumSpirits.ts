import type { MediumSpirit } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_spirits.json` dictionary entry to a `MediumSpirit` — same "## Name" + "‹SOURCE ...›" header shape `arcanistExploits.ts`/`occultistImplements.ts` strip. */
function transformMediumSpirit(id: string, entry: PfDataEntry): MediumSpirit {
  return {
    id,
    uuid: `pfdata:medium-spirit:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/**
 * Transform the full Medium legendary-spirit dictionary into the vendored
 * `MediumSpirit[]` catalog. NOT the shaman-spirit file (`json/
 * class_ability_shaman_spirits.json` is a separate, sibling dataset file —
 * see `MediumSpirit`'s doc comment for the empirical check that
 * distinguishes them).
 */
export function transformMediumSpirits(dict: PfDataDictionary): MediumSpirit[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMediumSpirit(id, entry),
  );
}

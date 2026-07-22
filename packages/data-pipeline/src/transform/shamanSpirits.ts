import type { ShamanSpirit } from "@pf1/schema";

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
 * Maps one `json/class_ability_shaman_spirits.json` dictionary entry to a
 * `ShamanSpirit` — NOT `class_ability_spirits.json` (the unrelated medium
 * "spirit" catalog). Its per-hex menu ("Hexes:"/spirit-ability/greater/true
 * sections) is blockquoted in the source; the shared reader flattens
 * blockquotes to plain paragraphs (see `util/pfdata.ts`), so it renders as a
 * readable list without a stable per-hex key to split on.
 */
function transformShamanSpirit(id: string, entry: PfDataEntry): ShamanSpirit {
  return {
    id,
    uuid: `pfdata:shaman-spirit:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full shaman-spirit dictionary into the vendored `ShamanSpirit[]` catalog. */
export function transformShamanSpirits(dict: PfDataDictionary): ShamanSpirit[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformShamanSpirit(id, entry),
  );
}

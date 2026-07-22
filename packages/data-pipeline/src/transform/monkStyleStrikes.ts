import type { MonkStyleStrike } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_style_strikes.json` dictionary entry to a `MonkStyleStrike` — no `nameSuffix`/`category`/`level` fields exist in this subsystem file, unlike most others. */
function transformMonkStyleStrike(id: string, entry: PfDataEntry): MonkStyleStrike {
  return {
    id,
    uuid: `pfdata:monk-style-strike:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full Monk (Unchained) style-strike dictionary into the vendored `MonkStyleStrike[]` catalog. */
export function transformMonkStyleStrikes(dict: PfDataDictionary): MonkStyleStrike[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMonkStyleStrike(id, entry),
  );
}

import type { MonkKiPower } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_ki_powers.json` dictionary entry to a `MonkKiPower`, mirroring `transformRagePower`. */
function transformMonkKiPower(id: string, entry: PfDataEntry): MonkKiPower {
  return {
    id,
    uuid: `pfdata:monk-ki-power:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full Monk (Unchained) ki-power dictionary into the vendored `MonkKiPower[]` catalog. */
export function transformMonkKiPowers(dict: PfDataDictionary): MonkKiPower[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMonkKiPower(id, entry),
  );
}

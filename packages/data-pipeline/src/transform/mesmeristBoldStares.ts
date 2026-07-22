import type { MesmeristBoldStare } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_stares.json` dictionary entry to a `MesmeristBoldStare` — no tier/category field on this source (see `MesmeristBoldStare` doc comment), so this is a straight name+description+sources copy. */
function transformMesmeristBoldStare(id: string, entry: PfDataEntry): MesmeristBoldStare {
  return {
    id,
    uuid: `pfdata:mesmerist-bold-stare:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full bold-stare dictionary into the vendored `MesmeristBoldStare[]` catalog. */
export function transformMesmeristBoldStares(dict: PfDataDictionary): MesmeristBoldStare[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMesmeristBoldStare(id, entry),
  );
}

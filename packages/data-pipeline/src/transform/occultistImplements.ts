import type { OccultistImplement } from "@pf1/schema";

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

/** Maps one `json/class_ability_implements.json` dictionary entry to an `OccultistImplement` — same "## Name" + "‹SOURCE ...›" header shape `arcanistExploits.ts` strips, but no ability-type suffix to parse out (a school isn't an Ex/Su/Sp ability). */
function transformOccultistImplement(id: string, entry: PfDataEntry): OccultistImplement {
  return {
    id,
    uuid: `pfdata:occultist-implement:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full occultist-implement dictionary into the vendored `OccultistImplement[]` catalog. */
export function transformOccultistImplements(dict: PfDataDictionary): OccultistImplement[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformOccultistImplement(id, entry),
  );
}

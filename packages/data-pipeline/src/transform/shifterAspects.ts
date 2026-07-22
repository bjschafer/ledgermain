import type { ShifterAspect } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_aspects.json` dictionary entry to a
 * `ShifterAspect` — no `category`/`level` fields exist in this subsystem
 * file. Every entry's `description` opens with a `## <Name>` header +
 * `‹SOURCE …›` citation line (unlike rage powers/discoveries), stripped via
 * `pfDataBodyLines` — see that function's doc comment.
 */
function transformShifterAspect(id: string, entry: PfDataEntry): ShifterAspect {
  return {
    id,
    uuid: `pfdata:shifter-aspect:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full shifter-aspect dictionary into the vendored `ShifterAspect[]` catalog. */
export function transformShifterAspects(dict: PfDataDictionary): ShifterAspect[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformShifterAspect(id, entry),
  );
}

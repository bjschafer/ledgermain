import type { PsychicDiscipline } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_disciplines.json` dictionary entry to a `PsychicDiscipline` — a straight name+description+sources copy (see `PsychicDiscipline` doc comment for why this is prose-only row data, never a mechanics source). */
function transformPsychicDiscipline(id: string, entry: PfDataEntry): PsychicDiscipline {
  return {
    id,
    uuid: `pfdata:psychic-discipline:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full psychic-discipline dictionary into the vendored `PsychicDiscipline[]` catalog. */
export function transformPsychicDisciplines(dict: PfDataDictionary): PsychicDiscipline[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformPsychicDiscipline(id, entry),
  );
}

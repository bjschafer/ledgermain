import type { InvestigatorTalent } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** Same dataset "not found" sentinel every subsystem file carries — see `ragePowers.ts`'s identical constant. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_investigator_talents.json` dictionary entry
 * to an `InvestigatorTalent` — this file's shape is IDENTICAL to rage
 * powers' (`name`/`nameSuffix`/`category`/`level`/`compilationSources`/
 * `description`, all as their own dictionary fields), so the mapping is the
 * same one-to-one field copy `transformRagePower` does.
 */
function transformInvestigatorTalent(id: string, entry: PfDataEntry): InvestigatorTalent {
  return {
    id,
    uuid: `pfdata:investigator-talent:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full investigator-talent dictionary into the vendored `InvestigatorTalent[]` catalog. */
export function transformInvestigatorTalents(dict: PfDataDictionary): InvestigatorTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformInvestigatorTalent(id, entry),
  );
}

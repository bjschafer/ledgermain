import type { VigilanteSocialTalent, VigilanteTalent } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_vigilante_talents.json` dictionary entry to a `VigilanteTalent` — mirrors `transformRagePower`. */
function transformVigilanteTalent(id: string, entry: PfDataEntry): VigilanteTalent {
  return {
    id,
    uuid: `pfdata:vigilante-talent:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full vigilante-talent dictionary into the vendored `VigilanteTalent[]` catalog. */
export function transformVigilanteTalents(dict: PfDataDictionary): VigilanteTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformVigilanteTalent(id, entry),
  );
}

/** Maps one `json/class_ability_social_talents.json` dictionary entry to a `VigilanteSocialTalent` — separate pool, same source shape. */
function transformVigilanteSocialTalent(id: string, entry: PfDataEntry): VigilanteSocialTalent {
  return {
    id,
    uuid: `pfdata:vigilante-social-talent:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full vigilante-social-talent dictionary into the vendored `VigilanteSocialTalent[]` catalog. */
export function transformVigilanteSocialTalents(dict: PfDataDictionary): VigilanteSocialTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformVigilanteSocialTalent(id, entry),
  );
}

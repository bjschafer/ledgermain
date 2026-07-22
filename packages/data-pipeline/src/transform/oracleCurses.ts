import type { OracleCurse } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * See `pfDataCatalogEntries`'s doc comment — the dataset's "not found"
 * sentinel. This is `class_ability_curses.json` (oracle's curses) — NOT the
 * dataset's top-level `curses.json`, which is an unrelated spell/monster-
 * ability affliction catalog (verified: its entries are `::aff[...]` stat
 * blocks like "Baleful Polymorph Spell", nothing to do with the Oracle
 * class feature).
 */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_curses.json` dictionary entry to an `OracleCurse`. */
function transformOracleCurse(id: string, entry: PfDataEntry): OracleCurse {
  return {
    id,
    uuid: `pfdata:oracle-curse:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full oracle-curse dictionary into the vendored `OracleCurse[]` catalog. */
export function transformOracleCurses(dict: PfDataDictionary): OracleCurse[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformOracleCurse(id, entry),
  );
}

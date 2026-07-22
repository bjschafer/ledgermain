import type { OracleMystery } from "@pf1/schema";

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
 * Maps one `json/class_ability_mysteries.json` dictionary entry to an
 * `OracleMystery`. Every real entry opens `description` with its own `##
 * Name` header and a `‹SOURCE ...›` citation line, both redundant with
 * `name`/`sources` (stripped via `pfDataBodyLines` — see that function's doc
 * comment). A mystery's revelations are NOT split out here (see
 * `OracleMystery`'s doc comment) — they stay inline in `description`'s
 * prose, under their own "### Revelations" heading (rendered as a bold
 * paragraph divider by the shared reader, not parsed further).
 */
function transformOracleMystery(id: string, entry: PfDataEntry): OracleMystery {
  return {
    id,
    uuid: `pfdata:oracle-mystery:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full oracle-mystery dictionary into the vendored `OracleMystery[]` catalog. */
export function transformOracleMysteries(dict: PfDataDictionary): OracleMystery[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformOracleMystery(id, entry),
  );
}

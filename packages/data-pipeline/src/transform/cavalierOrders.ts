import type { CavalierOrder } from "@pf1/schema";

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
 * Maps one `json/class_ability_orders.json` dictionary entry to a
 * `CavalierOrder` — no `category`/`level` fields exist in this subsystem
 * file. Every entry's `description` opens with a `## Order of the X`
 * header + `‹SOURCE …›` citation line (unlike rage powers/discoveries),
 * stripped via `pfDataBodyLines` — see that function's doc comment.
 */
function transformCavalierOrder(id: string, entry: PfDataEntry): CavalierOrder {
  return {
    id,
    uuid: `pfdata:cavalier-order:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(pfDataBodyLines(entry.description!)),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full cavalier/samurai order dictionary into the vendored `CavalierOrder[]` catalog. NOT the Hellknight order chassis (`class_ability_hellknight_orders.json`) — a different, unrelated subsystem. */
export function transformCavalierOrders(dict: PfDataDictionary): CavalierOrder[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformCavalierOrder(id, entry),
  );
}

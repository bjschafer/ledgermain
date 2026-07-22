import type { ShamanHex } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * Keys to drop from `json/class_ability_shaman_hexes.json` beyond the
 * dataset's own "not found" sentinel: `witch_hex` is structurally a real
 * catalog entry (has its own `name`/`description`) but isn't actually a hex —
 * it's the Advanced Class Guide rule text stating a shaman may instead pick
 * any non-major/non-grand WITCH hex, using shaman level as witch level. That
 * rule already exists in this app as `@pf1/engine` `witch-hexes.ts`'s
 * catalog; including it here as a pickable "hex" would let a player add a
 * meta-rule statement as if it were a real ability.
 */
const SKIP_KEYS = new Set(["not_found", "witch_hex"]);

/** Maps one `json/class_ability_shaman_hexes.json` dictionary entry to a `ShamanHex` — the only shaman-hex-specific piece of this import, mirroring `transformWitchHex`. */
function transformShamanHex(id: string, entry: PfDataEntry): ShamanHex {
  return {
    id,
    uuid: `pfdata:shaman-hex:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full general shaman-hex dictionary into the vendored `ShamanHex[]` catalog. */
export function transformShamanHexes(dict: PfDataDictionary): ShamanHex[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformShamanHex(id, entry),
  );
}

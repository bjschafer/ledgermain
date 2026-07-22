import type { RagePower } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * Rage powers whose vendored key resolves to a real dictionary entry, but
 * which isn't a usable catalog item — the dataset's own "not found"
 * sentinel. Structurally indistinguishable from a real entry (it has a
 * `name`/`description` of its own, `{ name: "Unknown", description: ["##
 * Error", ...] }`), so `isPfDataCatalogEntry` can't filter it generically;
 * named explicitly per file, per that function's doc comment.
 */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Maps one `json/class_ability_rage_powers.json` dictionary entry to a
 * `RagePower` — the only rage-power-specific piece of this import; every
 * other concern (junk-key filtering, markdown -> HTML, cross-ref
 * resolution, source-book refs) is the generic `util/pfdata.ts` reader.
 */
function transformRagePower(id: string, entry: PfDataEntry): RagePower {
  return {
    id,
    uuid: `pfdata:rage-power:${id}`,
    name: entry.name!,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    level: entry.level,
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full rage-power dictionary into the vendored `RagePower[]` catalog. */
export function transformRagePowers(dict: PfDataDictionary): RagePower[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformRagePower(id, entry),
  );
}

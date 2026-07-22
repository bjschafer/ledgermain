import type { MesmeristTrick } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `ragePowers.ts`'s `SKIP_KEYS` doc comment — the dataset's own "not found" sentinel, per file. */
const SKIP_KEYS = new Set(["not_found"]);

/** Maps one `json/class_ability_tricks.json` dictionary entry to a `MesmeristTrick` — mirrors `transformRagePower`. */
function transformMesmeristTrick(id: string, entry: PfDataEntry): MesmeristTrick {
  return {
    id,
    uuid: `pfdata:mesmerist-trick:${id}`,
    name: entry.name!,
    // The source's own category is either "trick" or "masterfultrick" — a
    // handful of entries carry neither (verified: none in the current slice),
    // defaulted to the base tier rather than dropped.
    tier: entry.category === "masterfultrick" ? "masterful" : "trick",
    description: pfDataDescriptionToHtml(entry.description!),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full mesmerist-trick dictionary into the vendored `MesmeristTrick[]` catalog. */
export function transformMesmeristTricks(dict: PfDataDictionary): MesmeristTrick[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMesmeristTrick(id, entry),
  );
}

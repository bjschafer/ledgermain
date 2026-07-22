import type { MagusArcana } from "@pf1/schema";

import {
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel, structurally indistinguishable from a real entry. The one `redirect` alias (`greater_arcane_redoubt` -> `arcane_redoubt_greater`) is already dropped generically. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Every one of this file's 64 real entries opens its `description` with a
 * `**Name (Ex/Su/Sp):**` bold header restating the entry's own `name` (this
 * source has no top-level `nameSuffix` field, unlike rage powers/hexes) —
 * verified against the full non-junk slice. Strips that header from the
 * first description line (returning the rest of that line, never empty —
 * also verified) and pulls the trailing `(Ex/Su/Sp)` out of it as the
 * suffix.
 */
const HEADER_RE = /^\*\*(.+?)\*\*:?\s*/;
const SUFFIX_RE = /\s*(\([A-Za-z]+\))\s*$/;

function stripNameHeader(lines: string[]): { nameSuffix?: string; lines: string[] } {
  const first = lines[0];
  if (first === undefined) return { lines };
  const headerMatch = HEADER_RE.exec(first);
  if (!headerMatch) return { lines };

  const inner = headerMatch[1]!.replace(/:$/, "");
  const suffixMatch = SUFFIX_RE.exec(inner);
  const nameSuffix = suffixMatch?.[1];
  const rest = first.slice(headerMatch[0].length);
  return { nameSuffix, lines: [rest, ...lines.slice(1)] };
}

/** Maps one `json/class_ability_magus_arcana.json` dictionary entry to a `MagusArcana` — the only magus-arcana-specific piece of this import (beyond the header-parsing above, needed because this source's shape differs from rage powers'/hexes'). */
function transformMagusArcanum(id: string, entry: PfDataEntry): MagusArcana {
  const { nameSuffix, lines } = stripNameHeader(entry.description!);
  return {
    id,
    uuid: `pfdata:magus-arcana:${id}`,
    name: entry.name!,
    nameSuffix,
    description: pfDataDescriptionToHtml(lines),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full magus-arcana dictionary into the vendored `MagusArcana[]` catalog. */
export function transformMagusArcana(dict: PfDataDictionary): MagusArcana[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformMagusArcanum(id, entry),
  );
}

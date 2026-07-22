/**
 * The GENERAL shaman hex catalog (issue #74 Phase 3b) — the Advanced Class
 * Guide's own "Shaman Hexes" table, available to any shaman regardless of
 * spirit (see `RefData.shamanHexes`/`ShamanHex`'s doc comment in
 * `@pf1/schema`). Distinct from `shaman-spirits.ts`'s `ShamanSpiritHex` (the
 * 5 hexes each of the 8 spirits individually grants — hand-authored, not
 * vendored anywhere in this source): there is no hand-authored table for
 * THIS catalog to overlay, so unlike `witch-hexes.ts`/`magus-arcana.ts` there
 * is nothing to merge — every entry here is vendored-only and `displayOnly`.
 *
 * `ShamanHexPicker` renders this catalog as a second, spirit-independent
 * section alongside the existing per-spirit hex list, sharing the same
 * `doc.build.shamanHexes` id array (the vendored ids here are the bare
 * dataset slugs, e.g. `"chant"` — disjoint from `ShamanSpiritHex`'s
 * `<spiritTag>:<camelCaseName>` ids by construction, so no collision risk in
 * that shared array).
 */

import type { RefData } from "@pf1/schema";

/** Cheap HTML->text preview for a picker row (this catalog has no hand-authored `summary` to fall back on — see the file doc comment). */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** One browsable row of the general shaman-hex catalog — always display-only (see file doc comment). */
export interface ShamanGeneralHexEntry {
  id: string;
  name: string;
  nameSuffix?: string;
  /** Plain-text preview, for the picker's summary line. */
  summary: string;
  description?: string;
}

function toEntry(entry: {
  id: string;
  name: string;
  nameSuffix?: string;
  description?: string;
}): ShamanGeneralHexEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    summary: plainTextPreview(entry.description ?? ""),
    description: entry.description,
  };
}

/** The full general-shaman-hex catalog, in vendored order. Recomputes from `refData.shamanHexes` on every call — callers should memoize on `refData`, same convention as `mergedRagePowerCatalog`/`mergedWitchHexCatalog`. */
export function mergedShamanHexCatalog(refData: RefData): ShamanGeneralHexEntry[] {
  return Object.values(refData.shamanHexes ?? {}).map(toEntry);
}

/** Resolve a picked general-shaman-hex id to its (always display-only) entry, for `archetypes.ts`'s Class Features list. */
export function resolveGeneralShamanHex(
  id: string,
  refData: RefData,
): ShamanGeneralHexEntry | undefined {
  const entry = refData.shamanHexes?.[id];
  return entry ? toEntry(entry) : undefined;
}

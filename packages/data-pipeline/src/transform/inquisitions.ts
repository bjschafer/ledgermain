import type { ClassFeature, ClassFeatureGrant, Inquisition } from "@pf1/schema";

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
 * `**Name (Ex/Su/Sp):** power text…` or the occasional `**Name** power
 * text…` (no colon at all — a handful of entries, e.g. Imprisonment's
 * "Divine Prison", omit it) — a granted power's own bold-led paragraph. The
 * "**Deities** …" and "**Granted Powers:** …" lines every entry also opens
 * with share this exact shape; `NON_POWER_HEADERS` is what tells those two
 * apart from a real power. Every paragraph in this subsystem file is ONE
 * `description` array element (verified against the full 39-entry catalog —
 * no soft-wrap continuation lines the way most other Pf Data files use), so
 * a single-line match is enough; no block-joining needed.
 */
const BOLD_LEAD_RE = /^\*\*([^*]+?)\*\*\s*(.*)$/;
const NON_POWER_HEADERS = new Set(["deities", "granted powers"]);
const ABILITY_TYPE_SUFFIX_RE = /\s*\((Ex|Su|Sp)\)\s*$/i;
/**
 * The power's OWN class-level gate, stated in its prose ("At 8th level,
 * …"). NOT `PfDataEntry.level` — that field is an unrelated within-chain
 * tier marker this file never sets for inquisitions (see `Inquisition`'s doc
 * comment in `@pf1/schema`). Absent for a power's first-level appearance,
 * which the source states with no level prefix at all — treated as level 0
 * to match how `Domain.features` levels an unstated first power.
 */
const LEVEL_GATE_RE = /\bAt (\d+)(?:st|nd|rd|th) level\b/i;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True for a bold-led line that names a real granted power, not the "Deities"/"Granted Powers" headers sharing the same lead shape. */
function isPowerLine(line: string): boolean {
  const m = BOLD_LEAD_RE.exec(line);
  if (!m) return false;
  const header = m[1]!.replace(/:$/, "").trim().toLowerCase();
  return !NON_POWER_HEADERS.has(header);
}

/**
 * Split one inquisition's body lines into its granted-power paragraphs and
 * everything else (flavor prose, the "Deities"/"Granted Powers" header
 * lines, blank separators) — the latter becomes the `Inquisition`'s own
 * `description`. Two entries (Black Powder, Spellkiller) carry no power
 * lines at all — their whole granted-powers text folds into one flat
 * paragraph, which stays in `flavor` and is never lost.
 */
function splitPowerLines(bodyLines: string[]): { flavor: string[]; powerLines: string[] } {
  const flavor: string[] = [];
  const powerLines: string[] = [];
  for (const raw of bodyLines) {
    if (isPowerLine(raw.trim())) {
      powerLines.push(raw);
    } else {
      flavor.push(raw);
    }
  }
  return { flavor, powerLines };
}

/** Parse one granted-power line into its name/ability-type/level-gate metadata plus rendered HTML. */
function parsePower(raw: string): {
  name: string;
  abilityType?: string;
  level: number;
  html: string;
} {
  const m = BOLD_LEAD_RE.exec(raw.trim())!;
  const header = m[1]!.replace(/:$/, "").trim();
  const rest = m[2]!.trim();
  const typeMatch = ABILITY_TYPE_SUFFIX_RE.exec(header);
  const name = header.replace(ABILITY_TYPE_SUFFIX_RE, "").trim();
  const levelMatch = LEVEL_GATE_RE.exec(rest);
  return {
    name,
    ...(typeMatch ? { abilityType: typeMatch[1]!.toLowerCase() } : {}),
    level: levelMatch ? Number(levelMatch[1]) : 0,
    html: pfDataDescriptionToHtml([raw]),
  };
}

function transformInquisition(
  id: string,
  entry: PfDataEntry,
  classFeatures: ClassFeature[],
  featureIds: Set<string>,
): Inquisition {
  const bodyLines = pfDataBodyLines(entry.description!);
  const { flavor, powerLines } = splitPowerLines(bodyLines);
  const sources = pfDataSourceRefs(entry);

  const features: ClassFeatureGrant[] = powerLines.map((raw) => {
    const power = parsePower(raw);
    const featureId = `inquisition-power:${id}:${slug(power.name)}`;
    if (featureIds.has(featureId)) {
      throw new Error(`duplicate inquisition power feature id: ${featureId}`);
    }
    featureIds.add(featureId);
    const uuid = `pfdata:${featureId}`;

    classFeatures.push({
      id: featureId,
      name: power.name,
      uuid,
      description: power.html,
      ...(sources ? { sources } : {}),
      ...(power.abilityType ? { abilityType: power.abilityType } : {}),
      subType: "classFeat",
      changes: [],
      grantsBuffs: [],
    });

    return { level: power.level, uuid, featureId, name: power.name, resolved: true };
  });

  return {
    id,
    uuid: `pfdata:inquisition:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(flavor),
    sources,
    tag: id,
    features,
  };
}

/**
 * Transform the full `json/class_ability_inquisitions.json` dictionary into
 * the vendored `Inquisition[]` catalog, pushing a synthesized `ClassFeature`
 * per granted power onto `classFeatures` (mutated in place — same convention
 * as `transform/subdomainPowers.ts`, which likewise has no Foundry document
 * to resolve these powers against).
 */
export function transformInquisitions(
  dict: PfDataDictionary,
  classFeatures: ClassFeature[],
): Inquisition[] {
  const featureIds = new Set(classFeatures.map((f) => f.id));
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformInquisition(id, entry, classFeatures, featureIds),
  );
}

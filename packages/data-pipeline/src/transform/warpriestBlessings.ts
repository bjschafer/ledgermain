import type { Blessing, ClassFeature } from "@pf1/schema";

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

/** `**Deities:** ‹faith/Gozreh›, ‹faith/Shelyn›` — every real entry's first prose line after the header/citation. */
const DEITIES_LINE_RE = /^\*\*Deities:\*\*\s*(.*)$/;
const FAITH_REF_RE = /‹faith\/([^›]+)›/g;

/**
 * Parse a blessing's "**Deities:** ..." line into the deity names it lists,
 * when it names any. Four entries (Earthquake, Flood, Tornado, Wildfire)
 * state a conditional rule instead of a deity list ("Evil deities that offer
 * the ‹‹Water›› blessing or nonevil deities with disasters in their
 * portfolios") — no `‹faith/...›` refs to extract, so those return
 * `undefined` rather than an empty, misleadingly-structured array.
 */
export function parseBlessingDeities(bodyLines: string[]): string[] | undefined {
  const line = bodyLines.find((l) => DEITIES_LINE_RE.test(l.trim()));
  if (!line) return undefined;
  const names = [...line.matchAll(FAITH_REF_RE)].map((m) => m[1]!);
  return names.length > 0 ? names : undefined;
}

/**
 * `**Zephyr's Gift (minor):** At 1st level, ...` — the bolded name+tier label
 * opening a blessing's minor/major power paragraph. The colon sits INSIDE the
 * bold markers (`(minor):**`, not `(minor)**:`), which is the easy part of
 * this to get backwards.
 */
const POWER_LINE_RE = /^\*\*(.+?)\s*\((minor|major)\):?\*\*\s*(.*)$/i;

/** A power name + prose, before the `featureId` its owning `Blessing` attaches once its id is known. */
interface ParsedPower {
  name: string;
  description: string;
}

/**
 * Parse a blessing's minor and major power out of its body lines. Takes the
 * FIRST minor/major match of each kind: a handful of entries (Community,
 * Healing, Liberation, Nobility) carry a second, later minor/major pair from
 * a "Healer's Handbook" splatbook replacement blessing (its own `### Name`
 * subsection, e.g. Cooperation replacing Community's minor power) — those
 * stay folded into the full `description` prose rather than promoted to
 * `minorPower`/`majorPower`, which are reserved for the base ACG blessing
 * every warpriest with that pick actually has.
 */
export function parseBlessingPowers(bodyLines: string[]): {
  minor: ParsedPower;
  major: ParsedPower;
} {
  let minor: ParsedPower | undefined;
  let major: ParsedPower | undefined;
  for (const raw of bodyLines) {
    const m = POWER_LINE_RE.exec(raw.trim());
    if (!m) continue;
    const power: ParsedPower = {
      name: m[1]!.trim(),
      description: pfDataDescriptionToHtml([m[3]!]),
    };
    if (m[2]!.toLowerCase() === "minor") minor ??= power;
    else major ??= power;
    if (minor && major) break;
  }
  if (!minor || !major) {
    throw new Error("blessing entry is missing its minor and/or major power line");
  }
  return { minor, major };
}

/**
 * Maps one `json/class_ability_blessings.json` dictionary entry to a
 * `Blessing`. Every real entry opens `description` with its own `## Name`
 * header and a `‹SOURCE ...›` citation line, stripped via `pfDataBodyLines`
 * (same shape as `oracleMysteries.ts`/`cavalierOrders.ts`) before the
 * deity list and power paragraphs are parsed out of what remains.
 */
function transformBlessing(id: string, entry: PfDataEntry): Blessing {
  const bodyLines = pfDataBodyLines(entry.description!);
  const { minor, major } = parseBlessingPowers(bodyLines);
  return {
    id,
    uuid: `pfdata:blessing:${id}`,
    name: entry.name!,
    description: pfDataDescriptionToHtml(bodyLines),
    sources: pfDataSourceRefs(entry),
    deities: parseBlessingDeities(bodyLines),
    minorPower: { ...minor, featureId: blessingPowerFeatureId(id, "minor") },
    majorPower: { ...major, featureId: blessingPowerFeatureId(id, "major") },
  };
}

/** Transform the full blessing dictionary into the vendored `Blessing[]` catalog. */
export function transformBlessings(dict: PfDataDictionary): Blessing[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformBlessing(id, entry),
  );
}

/** Deterministic `RefData.classFeatures` id for one blessing's power tier — every `BlessingPower.featureId` is exactly this. */
function blessingPowerFeatureId(blessingId: string, tier: "minor" | "major"): string {
  return `blessing-power:${blessingId}:${tier}`;
}

/**
 * Register each blessing's minor/major power as its own `ClassFeature` stub
 * (mirrors `subdomainPowers.ts`'s registration of a subdomain's replacement
 * powers) — this is what lets `ClassFeaturesList` show the granted power's
 * full prose (via `RefData.classFeatures[featureId].description`) rather
 * than just a name, the same way a domain's granted powers do. `changes: []`
 * / `grantsBuffs: []`: no hand-authored mechanics, matching this subsystem's
 * prose-only posture.
 */
export function blessingClassFeatures(blessings: readonly Blessing[]): ClassFeature[] {
  const out: ClassFeature[] = [];
  for (const b of blessings) {
    for (const power of [b.minorPower, b.majorPower]) {
      out.push({
        id: power.featureId,
        uuid: `pfdata:${power.featureId}`,
        name: power.name,
        description: power.description,
        ...(b.sources ? { sources: b.sources } : {}),
        subType: "classFeat",
        changes: [],
        grantsBuffs: [],
      });
    }
  }
  return out;
}

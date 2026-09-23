import type { Blessing, ClassFeature } from "@pf1/schema";

import {
  parseDirectiveProps,
  parsePfDataAbility,
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** See `pfDataCatalogEntries`'s doc comment — the dataset's "not found" sentinel. */
const SKIP_KEYS = new Set(["not_found"]);

/** `@HL[Deities:] ‹faith/Gozreh›, ‹faith/Shelyn›` — every real entry's first prose line after the header/citation. */
const DEITIES_LINE_RE = /^@HL\[Deities:\]\s*(.*)$/;
const FAITH_REF_RE = /‹faith\/([^›]+)›/g;

/**
 * Parse a blessing's Deities line into the deity names it lists, when it
 * names any. Four entries (Earthquake, Flood, Tornado, Wildfire) state a
 * conditional rule instead of a deity list ("Evil deities that offer the
 * ‹blessing/Air› blessing or nonevil deities with disasters in their
 * portfolios") — no `‹faith/...›` refs to extract, so those return
 * `undefined` rather than an empty, misleadingly-structured array.
 */
export function parseBlessingDeities(bodyLines: string[]): string[] | undefined {
  const line = bodyLines.find((l) => DEITIES_LINE_RE.test(l.trim()));
  if (!line) return undefined;
  const names = [...line.matchAll(FAITH_REF_RE)].map((m) => m[1]!);
  return names.length > 0 ? names : undefined;
}

/** `Zephyr's Gift (minor)` — the tier rides in the directive's label, not a prop. */
const TIER_LABEL_RE = /^(.+?)\s*\((minor|major)\)$/i;

/**
 * The fenced form, `:::ab{title="Serpent Fang (major)" ...}` ... `:::`, used
 * when a power's prose needs more than one block (Scalykind's venom).
 */
const AB_FENCE_OPEN_RE = /^:::ab\{(.*)\}$/;

/** A power name + prose, before the `featureId` its owning `Blessing` attaches once its id is known. */
interface ParsedPower {
  name: string;
  description: string;
}

type Tier = "minor" | "major";

/** Each power in body order, from either `::ab[Name (tier)]{...}` or a fenced `:::ab{title=...}` block. */
function blessingPowers(bodyLines: string[]): (ParsedPower & { tier: Tier })[] {
  const out: (ParsedPower & { tier: Tier })[] = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i]!.trim();
    let label: string | undefined;
    let description: string | undefined;
    const leaf = parsePfDataAbility(line);
    const fence = AB_FENCE_OPEN_RE.exec(line);
    if (leaf) {
      label = leaf.name;
      description = leaf.bodyHtml;
    } else if (fence) {
      const title = parseDirectiveProps(fence[1]!).title;
      const close = bodyLines.findIndex((l, j) => j > i && l.trim() === ":::");
      const end = close < 0 ? bodyLines.length : close;
      label = typeof title === "string" ? title : undefined;
      description = pfDataDescriptionToHtml(bodyLines.slice(i + 1, end));
      i = end;
    }
    const tier = label ? TIER_LABEL_RE.exec(label) : null;
    if (!tier || description === undefined) continue;
    out.push({
      name: tier[1]!.trim(),
      description,
      tier: tier[2]!.toLowerCase() as Tier,
    });
  }
  return out;
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
  const powers = blessingPowers(bodyLines);
  const first = (tier: Tier): ParsedPower | undefined => {
    const p = powers.find((x) => x.tier === tier);
    return p && { name: p.name, description: p.description };
  };
  const minor = first("minor");
  const major = first("major");
  if (!minor || !major) {
    throw new Error("blessing entry is missing its minor and/or major power line");
  }
  return { minor, major };
}

/** The source spells this label `ReplacementBlessing`; spaced out for display. */
function descriptionLines(bodyLines: string[]): string[] {
  return bodyLines.map((line) =>
    line.replace("@HL[ReplacementBlessing:]", "@HL[Replacement Blessing:]"),
  );
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
    description: pfDataDescriptionToHtml(descriptionLines(bodyLines)),
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

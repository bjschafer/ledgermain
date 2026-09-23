import type { ClassFeature, ClassFeatureGrant, Inquisition } from "@pf1/schema";

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

const ABILITY_TYPE_SUFFIX_RE = /\s*\((Ex|Su|Sp)\)\s*$/i;
const AB_FENCE_OPEN_RE = /^:::ab\{(.*)\}$/;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The power's own class-level gate: the directive's `l=` when it states one,
 * else the first `lNN=` stage key (Faithful Steed's `l8=`/`l16=` is an
 * 8th-level power). NOT `PfDataEntry.level` — that field is an unrelated
 * within-chain tier marker this file never sets for inquisitions (see
 * `Inquisition`'s doc comment in `@pf1/schema`). Level 0 for a power with
 * neither, matching how `Domain.features` levels an unstated first power.
 */
function powerLevel(props: Record<string, string | true>): number {
  if (typeof props.l === "string") return Number(props.l);
  const stages = Object.keys(props)
    .map((k) => /^l(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  return stages.length > 0 ? Math.min(...stages) : 0;
}

interface ParsedPower {
  name: string;
  abilityType?: string;
  level: number;
  lines: string[];
}

/**
 * Split one inquisition's body lines into its granted powers and everything
 * else (the Associated Deities row, the Granted Powers heading, flavor
 * prose) — the latter becomes the `Inquisition`'s own `description`. A power
 * is an `::ab[Name (Ex)]{...}` directive; one flagged `next`, leaf or fenced
 * `:::ab{next ...}` ... `:::`, is reference text for the power above it
 * (Anger's Divine Anger quoting the barbarian's Rage) and folds into that
 * power's prose. Two entries (Black Powder, Spellkiller) carry no power
 * directives at all — their whole granted-powers text stays in `flavor`.
 */
function splitPowers(bodyLines: string[]): { flavor: string[]; powers: ParsedPower[] } {
  const flavor: string[] = [];
  const powers: ParsedPower[] = [];
  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i]!;
    const fence = AB_FENCE_OPEN_RE.exec(raw.trim());
    const ability = parsePfDataAbility(raw);
    const current = powers.at(-1);
    if (fence && parseDirectiveProps(fence[1]!).next && current) {
      const close = bodyLines.findIndex((l, j) => j > i && l.trim() === ":::");
      const end = close < 0 ? bodyLines.length : close;
      current.lines.push("", ...bodyLines.slice(i, end + 1));
      i = end;
    } else if (ability?.props.next && current) {
      current.lines.push("", raw);
    } else if (ability) {
      const typeMatch = ABILITY_TYPE_SUFFIX_RE.exec(ability.name);
      powers.push({
        name: ability.name.replace(ABILITY_TYPE_SUFFIX_RE, "").trim(),
        ...(typeMatch ? { abilityType: typeMatch[1]!.toLowerCase() } : {}),
        level: powerLevel(ability.props),
        lines: [raw],
      });
    } else {
      flavor.push(raw);
    }
  }
  return { flavor, powers };
}

function transformInquisition(
  id: string,
  entry: PfDataEntry,
  classFeatures: ClassFeature[],
  featureIds: Set<string>,
): Inquisition {
  const bodyLines = pfDataBodyLines(entry.description!);
  const { flavor, powers } = splitPowers(bodyLines);
  const sources = pfDataSourceRefs(entry);

  const features: ClassFeatureGrant[] = powers.map((power) => {
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
      description: pfDataDescriptionToHtml(power.lines),
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

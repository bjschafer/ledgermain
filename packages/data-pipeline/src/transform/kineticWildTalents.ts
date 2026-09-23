import type { KineticInfusionKind, KineticWildTalent, KineticWildTalentKind } from "@pf1/schema";

import {
  parseDirectiveProps,
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataHeaderNameSuffix,
  pfDataSourceRefs,
  type PfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/** Same dataset "not found" sentinel every subsystem file carries — see `ragePowers.ts`'s identical constant. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * Unlike every other Phase 3 subsystem file, `class_ability_kinetic_talents
 * .json` carries NO `category`/`level`/`compilationSources` dictionary
 * fields at all (confirmed: every catalog entry has exactly `name`/
 * `sources`/`topLink`/`description`) — the structured fields live in a
 * `::kinetics{el=fire type="utility (Su)" l=3 burn=1 ...}` directive inside
 * the description instead. Present on every one of the 278 catalog entries,
 * with `l=0` standing for a blast or defense talent's "no spell level".
 */
const STAT_DIRECTIVE_RE = /^::kinetics\{(.*)\}$/;

interface ParsedStatLine {
  elements: string[];
  typeRaw: string;
  level?: number;
  burn: number;
  /** The directive's remaining props, rebuilt as the prose rows the talent reads with. */
  rows: string[];
}

function parseStatLine(description: string[]): ParsedStatLine | undefined {
  for (const line of description) {
    const m = STAT_DIRECTIVE_RE.exec(line.trim());
    if (!m) continue;
    const props = parseDirectiveProps(m[1]!);
    const prop = (key: string): string | undefined =>
      typeof props[key] === "string" && props[key] !== "" ? props[key] : undefined;
    const level = Number(prop("l") ?? 0);
    const row = (...cells: [string, string | undefined][]) =>
      cells
        .filter((c): c is [string, string] => c[1] !== undefined)
        .map(([label, v]) => `**${label}** ${v}`)
        .join("; ");
    const rows = [
      row(["Prerequisite", prop("prereq")]),
      row(["Associated Blasts", prop("assoc")]),
      row(["Blast Type", prop("btype")], ["Damage", prop("dmg")]),
      row(["Saving Throw", prop("save")], ["SR", prop("sr")]),
    ].filter((r) => r !== "");
    return {
      elements: (prop("el") ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      typeRaw: prop("type") ?? "",
      level: level > 0 ? level : undefined,
      burn: Number(prop("burn") ?? 0),
      rows,
    };
  }
  return undefined;
}

/**
 * `typeRaw` is `"<kind phrase>[ (suffix)]"` — e.g. `"utility (Su)"`, `"form
 * infusion"` (several infusions state no suffix at all — verified against
 * their own markdown header, which also has none for those entries; NOT a
 * parse failure). Splits the kind phrase into `kind`/`infusionKind` and
 * returns any trailing suffix.
 */
function parseKind(typeRaw: string): {
  kind: KineticWildTalentKind;
  infusionKind?: KineticInfusionKind;
  suffix?: string;
} {
  const m = /^(.*?)(?:\s*\(([A-Za-z]+)\))?$/.exec(typeRaw);
  const phrase = (m?.[1] ?? typeRaw).trim();
  const suffix = m?.[2] ? `(${m[2]})` : undefined;
  switch (phrase) {
    case "form infusion":
      return { kind: "infusion", infusionKind: "form", suffix };
    case "substance infusion":
      return { kind: "infusion", infusionKind: "substance", suffix };
    case "utility":
      return { kind: "utility", suffix };
    case "defense":
      return { kind: "defense", suffix };
    case "simple blast":
      return { kind: "simpleBlast", suffix };
    case "composite blast":
      return { kind: "compositeBlast", suffix };
    default:
      // Defensive only — every entry in the pinned slice matches one of the
      // phrases above (see file doc comment); a future data update
      // introducing a new phrase lands here rather than crashing the build.
      return { kind: "unclassified", suffix };
  }
}

function transformKineticWildTalent(id: string, entry: PfDataEntry): KineticWildTalent {
  const stat = parseStatLine(entry.description!);
  const { kind, infusionKind, suffix } = stat
    ? parseKind(stat.typeRaw)
    : { kind: "unclassified" as const, infusionKind: undefined, suffix: undefined };
  return {
    id,
    uuid: `pfdata:kinetic-talent:${id}`,
    name: entry.name!,
    nameSuffix: suffix ?? pfDataHeaderNameSuffix(entry.description),
    kind,
    infusionKind,
    elements: stat?.elements ?? [],
    level: stat?.level,
    burn: stat?.burn ?? 0,
    // The directive's element/type/level/burn are redundant with the fields
    // above, so only its prerequisite, associated-blast, damage, and save
    // props come back as prose rows (useful text this app doesn't otherwise
    // carry), in place of the directive line.
    description: pfDataDescriptionToHtml(
      pfDataBodyLines(entry.description!).flatMap((line) =>
        STAT_DIRECTIVE_RE.test(line.trim()) ? (stat?.rows ?? []) : [line],
      ),
    ),
    sources: pfDataSourceRefs(entry),
  };
}

/** Transform the full kinetic-wild-talent dictionary into the vendored `KineticWildTalent[]` catalog. */
export function transformKineticWildTalents(dict: PfDataDictionary): KineticWildTalent[] {
  return pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS }).map(([id, entry]) =>
    transformKineticWildTalent(id, entry),
  );
}

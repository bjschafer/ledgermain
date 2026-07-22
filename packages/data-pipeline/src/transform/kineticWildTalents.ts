import type { KineticInfusionKind, KineticWildTalent, KineticWildTalentKind } from "@pf1/schema";

import {
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
 * `sources`/`topLink`/`description`) — the source's OWN renderer instead
 * bakes a stat-line into the description text itself, as a consistent
 * markdown line reading `**Element** fire; **Type** utility (Su); **Level**
 * 3; **Burn** 1` (or, for a simple/composite blast/defense talent, `**Level**
 * -` — no spell level). Verified present on EVERY ONE of the 278 catalog
 * entries (not just a majority), always with clean, unambiguous field
 * values (no "variable"/"0 or 1" burn text to simplify, no `Level` entry
 * missing its number for an infusion/utility talent) — so this parse is the
 * reliable source of truth for `KineticWildTalent`'s structured fields,
 * not a best-effort fallback.
 */
const STAT_LINE_RE =
  /\*\*Element\*\*\s*([^;]+);\s*\*\*Type\*\*\s*([^;]+);\s*\*\*Level\*\*\s*([^;]+);\s*\*\*Burn\*\*\s*([^\s;]+)/;

interface ParsedStatLine {
  elements: string[];
  typeRaw: string;
  level?: number;
  burn: number;
}

function parseStatLine(description: string[]): ParsedStatLine | undefined {
  for (const line of description) {
    const m = STAT_LINE_RE.exec(line);
    if (!m) continue;
    const elements = m[1]!.split(",").map((e) => e.trim().toLowerCase());
    const levelRaw = m[3]!.trim();
    return {
      elements,
      typeRaw: m[2]!.trim(),
      level: levelRaw === "-" ? undefined : Number(levelRaw),
      burn: Number(m[4]!.trim()),
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
    // Header + `‹SOURCE …›` line stripped by `pfDataBodyLines` (redundant
    // with `name`/`nameSuffix`/`sources`, see that helper's doc comment);
    // the stat-line itself (`**Element** …; **Burn** …`) is ALSO stripped
    // here — redundant with `elements`/`kind`/`level`/`burn` above, unlike
    // the "Associated Blasts"/"Prerequisite"/"Saving Throw" lines that can
    // follow it, which stay (useful prose this app doesn't otherwise carry).
    description: pfDataDescriptionToHtml(
      pfDataBodyLines(entry.description!).filter((line) => !STAT_LINE_RE.test(line)),
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

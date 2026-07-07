/**
 * Pathbuilder 1e importer — reads the "Export JSON" custom-format blob
 * produced by the community Pathbuilder app for Pathfinder 1e.
 *
 * PROVENANCE / BEST-EFFORT WARNING: no published schema for Pathbuilder 1e's
 * export was found. Web search only turned up documentation and sample field
 * paths for the unrelated, differently-shaped Pathbuilder *2e* JSON (e.g.
 * `build.abilities.str`, `build.proficiencies.<skill>`); Pathbuilder 1e is a
 * separate app by a different-vintage codebase and we have no confirmed
 * sample of its actual export. This importer is therefore written
 * defensively against an *unknown* JSON shape: every logical field is looked
 * up through the small `FIELD_PATHS` table below, trying several plausible
 * key names/locations (bare top-level key, and the same key nested under a
 * `"build"` wrapper, mirroring how Pathbuilder 2e nests things) in order.
 * If someone supplies a real Pathbuilder 1e export, correcting the mapping
 * should be a matter of editing `FIELD_PATHS` in this one place — nothing
 * downstream needs to change. This is personal-use tooling, not a
 * compatibility promise.
 *
 * UPDATE (issue #3): a real Pathbuilder 1e export sample finally turned up —
 * and it's not JSON at all. Pathbuilder 1e's only export option renders a
 * Bestiary-style HTML "stat block"; see `importPathbuilderHtml.ts` for the
 * importer written against that confirmed real sample. This module's JSON
 * path remains entirely speculative (no evidence Pathbuilder 1e ever emits
 * JSON) — kept around in case some other export mode surfaces later, but the
 * HTML importer is the one to reach for in practice.
 */
import type { RefData } from "@pf1/schema";

import {
  buildDocFromExternalData,
  emptyExternalData,
  matchAbilityId,
  type ExternalCharacterData,
} from "./externalImport.js";

/** Candidate object-path lists tried in order; first defined value wins. See module doc comment. */
const FIELD_PATHS = {
  name: [["name"], ["character", "name"], ["build", "name"]],
  race: [["race"], ["ancestry"], ["build", "race"], ["build", "ancestry"]],
  alignment: [["alignment"], ["build", "alignment"]],
  deity: [["deity"], ["build", "deity"]],
  gender: [["gender"], ["build", "gender"]],
  age: [["age"], ["build", "age"]],
  abilities: [["abilities"], ["attributes"], ["build", "abilities"], ["build", "attributes"]],
  classes: [["classes"], ["build", "classes"]],
  className: [["class"], ["build", "class"]],
  level: [["level"], ["build", "level"]],
  feats: [["feats"], ["build", "feats"]],
  skills: [["skills"], ["proficiencies"], ["build", "skills"], ["build", "proficiencies"]],
  languages: [["languages"], ["build", "languages"]],
  gear: [
    ["gear"],
    ["equipment"],
    ["inventory"],
    ["build", "gear"],
    ["build", "equipment"],
    ["build", "inventory"],
  ],
  money: [["money"], ["gold"], ["build", "money"], ["build", "gold"]],
} as const satisfies Record<string, readonly (readonly string[])[]>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(obj: unknown, path: readonly string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function firstPath(obj: unknown, paths: readonly (readonly string[])[]): unknown {
  for (const path of paths) {
    const value = getPath(obj, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** A list of `{name}`-shaped records, from either an array of strings or an array of objects. */
function asNameList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") names.push(entry);
    else if (isPlainObject(entry)) {
      const name = asString(entry.name) ?? asString(entry.Name);
      if (name) names.push(name);
    }
  }
  return names;
}

function parseAbilities(value: unknown): ExternalCharacterData["abilities"] {
  const out: ExternalCharacterData["abilities"] = {};
  if (!isPlainObject(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    const ability = matchAbilityId(key);
    const score =
      asNumber(raw) ?? (isPlainObject(raw) ? asNumber(raw.score ?? raw.value) : undefined);
    if (ability && score != null) out[ability] = score;
  }
  return out;
}

/**
 * Classes may appear as an array (`[{name, level}]` or `[{name, levels}]`),
 * an object map (`{ "Fighter": 5 }`), or a single top-level `class`/`level`
 * pair (a non-multiclass export). All three are supported defensively.
 */
function parseClasses(
  value: unknown,
  singleClassName: string | undefined,
  singleLevel: number | undefined,
): { name: string; level: number }[] {
  const out: { name: string; level: number }[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isPlainObject(entry)) {
        const name = asString(entry.name) ?? asString(entry.Name) ?? asString(entry.className);
        const level = asNumber(entry.level) ?? asNumber(entry.levels) ?? asNumber(entry.Level);
        if (name) out.push({ name, level: level ?? 1 });
      } else if (typeof entry === "string") {
        out.push({ name: entry, level: 1 });
      }
    }
  } else if (isPlainObject(value)) {
    for (const [name, level] of Object.entries(value)) {
      const lvl = asNumber(level);
      if (name) out.push({ name, level: lvl ?? 1 });
    }
  }
  if (out.length === 0 && singleClassName) {
    out.push({ name: singleClassName, level: singleLevel ?? 1 });
  }
  return out;
}

/**
 * Skills as an object map (`{ "Acrobatics": 5 }` or `{ "Acrobatics": { ranks:
 * 5 } }`) or an array of `{name, ranks}` records.
 */
function parseSkills(value: unknown): { name: string; ranks: number }[] {
  const out: { name: string; ranks: number }[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (isPlainObject(entry)) {
        const name = asString(entry.name) ?? asString(entry.Name);
        const ranks = asNumber(entry.ranks) ?? asNumber(entry.rank) ?? asNumber(entry.value);
        if (name) out.push({ name, ranks: ranks ?? 0 });
      }
    }
  } else if (isPlainObject(value)) {
    for (const [name, raw] of Object.entries(value)) {
      const ranks =
        asNumber(raw) ?? (isPlainObject(raw) ? asNumber(raw.ranks ?? raw.rank) : undefined);
      if (name) out.push({ name, ranks: ranks ?? 0 });
    }
  }
  return out;
}

/** Gear as an array of strings or `{name, quantity}`-shaped records. */
function parseGear(value: unknown): { name: string; quantity?: number }[] {
  const out: { name: string; quantity?: number }[] = [];
  if (!Array.isArray(value)) return out;
  for (const entry of value) {
    if (typeof entry === "string") out.push({ name: entry });
    else if (isPlainObject(entry)) {
      const name = asString(entry.name) ?? asString(entry.Name) ?? asString(entry.item);
      const quantity = asNumber(entry.quantity) ?? asNumber(entry.qty) ?? asNumber(entry.count);
      if (name) out.push({ name, quantity });
    }
  }
  return out;
}

function parseMoney(value: unknown): ExternalCharacterData["money"] {
  const out: ExternalCharacterData["money"] = {};
  if (!isPlainObject(value)) return out;
  const pp = asNumber(value.pp ?? value.platinum);
  const gp = asNumber(value.gp ?? value.gold);
  const sp = asNumber(value.sp ?? value.silver);
  const cp = asNumber(value.cp ?? value.copper);
  if (pp != null) out.pp = pp;
  if (gp != null) out.gp = gp;
  if (sp != null) out.sp = sp;
  if (cp != null) out.cp = cp;
  return out;
}

/**
 * Reduce a raw, unknown-shaped Pathbuilder 1e JSON export to {@link
 * ExternalCharacterData}. Throws only when `raw` isn't even a JSON object
 * (nothing recognizable to try) — every individual field is optional.
 */
export function pathbuilderJsonToIntermediate(raw: unknown): ExternalCharacterData {
  if (!isPlainObject(raw)) {
    throw new Error("That file doesn't look like a Pathbuilder export (expected a JSON object).");
  }
  const data = emptyExternalData();
  data.name = asString(firstPath(raw, FIELD_PATHS.name));
  data.race = asString(firstPath(raw, FIELD_PATHS.race));
  data.alignment = asString(firstPath(raw, FIELD_PATHS.alignment));
  data.deity = asString(firstPath(raw, FIELD_PATHS.deity));
  data.gender = asString(firstPath(raw, FIELD_PATHS.gender));
  data.age = asString(firstPath(raw, FIELD_PATHS.age));
  data.abilities = parseAbilities(firstPath(raw, FIELD_PATHS.abilities));
  data.classes = parseClasses(
    firstPath(raw, FIELD_PATHS.classes),
    asString(firstPath(raw, FIELD_PATHS.className)),
    asNumber(firstPath(raw, FIELD_PATHS.level)),
  );
  data.feats = asNameList(firstPath(raw, FIELD_PATHS.feats));
  data.skills = parseSkills(firstPath(raw, FIELD_PATHS.skills));
  data.languages = asNameList(firstPath(raw, FIELD_PATHS.languages));
  data.gear = parseGear(firstPath(raw, FIELD_PATHS.gear));
  data.money = parseMoney(firstPath(raw, FIELD_PATHS.money));
  return data;
}

/**
 * Parse a Pathbuilder 1e export and produce a `CharacterDoc` + {@link
 * ImportReport}. See the module doc comment for the shape assumptions this
 * makes and their (lack of) provenance.
 */
export function importPathbuilderJson(raw: unknown, refData: RefData) {
  const data = pathbuilderJsonToIntermediate(raw);
  return buildDocFromExternalData(data, refData, "pathbuilder");
}

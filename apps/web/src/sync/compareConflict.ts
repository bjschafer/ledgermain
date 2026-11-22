/**
 * What tells two conflicting copies of a character apart, in play language,
 * so the player can pick one without remembering which device did what.
 *
 * Two parts. The headline rows are the numbers someone recognizes a copy by
 * (HP, AC, buffs up), some from `compute()`. Everything else comes from a
 * generic walk of both documents, so a field added to `CharacterDoc` shows up
 * here without anyone remembering to list it; only labels and id-to-name
 * lookups are hand-written.
 *
 * It is a two-way comparison. Without the copy both devices last agreed on,
 * "this copy has Power Attack" can't say which side added or removed it.
 */
import { CONDITIONS, classByTag, compute } from "@pf1/engine";
import type { AbilityId, CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { resolveRefData } from "../model/homebrew.js";
import { migrateDoc } from "../model/migrations.js";
import { ABILITY_NAMES, SAVE_ABBR, signed, skillName } from "../model/names.js";
import { formatGp, purseGp } from "../model/purchase.js";

export interface CompareRow {
  label: string;
  local: string;
  remote: string;
}

export interface CompareSection {
  title: string;
  rows: CompareRow[];
}

export interface ConflictComparison {
  /** Recognizable stats that differ between the copies. */
  headline: CompareRow[];
  /** Every other difference, grouped by part of the character. */
  sections: CompareSection[];
}

/** Sync bookkeeping: differs between any two copies and never means an edit. */
const ENVELOPE: Record<string, true> = {
  schemaVersion: true,
  id: true,
  ownerId: true,
  version: true,
  updatedAt: true,
  savedOn: true,
};

/** Already shown as a headline row, so the generic walk skips them. */
const IN_HEADLINE: Record<string, true> = {
  "identity.classes": true,
  "live.hp": true,
  "live.conditions": true,
  "live.activeBuffs": true,
  "live.money": true,
  "live.xp": true,
};

const SECTION_ORDER = ["identity", "abilities", "build", "live"];
const SECTION_TITLES: Record<string, string> = {
  identity: "Identity",
  abilities: "Ability scores",
  build: "Build",
  live: "Play state",
};

/** Keys whose humanized camelCase would read wrong. */
const KEY_LABELS: Record<string, string> = {
  activeBuffs: "Buffs",
  bonusLanguages: "Languages",
  conditionRounds: "Condition rounds",
  extraFeats: "Bonus feats",
  gmGrants: "GM grants",
  hp: "Hit points",
  hpMode: "HP mode",
  hpRolls: "HP rolls",
  maxHpOverride: "Max HP override",
  skillRanks: "Skill ranks",
  slotsUsed: "Spell slots used",
  slotsUsedByClass: "Spell slots used",
  xp: "XP",
};

/** Longest stretch of free text shown in a cell. */
const EXCERPT = 60;

type Names = (key: string) => string | undefined;

const indexCache = new WeakMap<RefData, Map<string, string>>();

/**
 * Every named reference-data entry by id, plus classes by tag and conditions
 * by id. Compendium ids are random 16-character strings, so one flat index
 * can't mistake a feat for a spell.
 */
function nameIndex(refData: RefData): Map<string, string> {
  const cached = indexCache.get(refData);
  if (cached) return cached;
  const index = new Map<string, string>();
  for (const table of Object.values(refData)) {
    if (!table || typeof table !== "object") continue;
    for (const [id, entry] of Object.entries(table as Record<string, unknown>)) {
      const name = (entry as { name?: unknown } | null)?.name;
      if (typeof name === "string" && !index.has(id)) index.set(id, name);
    }
  }
  for (const cls of Object.values(refData.classes)) {
    if (!index.has(cls.tag)) index.set(cls.tag, cls.name);
  }
  for (const condition of Object.values(CONDITIONS)) index.set(condition.id, condition.name);
  indexCache.set(refData, index);
  return index;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!deepEqual(a[key], b[key])) return false;
    return true;
  }
  return false;
}

function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function keyLabel(key: string, parent: string | undefined, names: Names): string {
  if (parent === "skillRanks") return skillName(key);
  if (key in ABILITY_NAMES) return ABILITY_NAMES[key as AbilityId];
  if (/^\d+$/.test(key) && (parent === "slotsUsed" || parent?.startsWith("slotsUsed")))
    return `Level ${key}`;
  return KEY_LABELS[key] ?? names(key) ?? humanize(key);
}

/** What an array entry is called, so the two copies' entries can be paired. */
function entryLabel(entry: unknown, names: Names): string {
  if (!isPlainObject(entry)) return formatScalar(entry, names);
  if (typeof entry["name"] === "string" && entry["name"]) return entry["name"];
  for (const key of ["itemId", "armorId", "weaponId", "spellId", "buffId", "featId"]) {
    const id = entry[key];
    if (typeof id === "string") return names(id) ?? id;
  }
  return "Entry";
}

function formatScalar(value: unknown, names: Names): string {
  if (value === undefined || value === null) return "not set";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value === "") return "blank";
    return names(value) ?? (value.length > EXCERPT ? `${value.slice(0, EXCERPT)}…` : value);
  }
  if (isPlainObject(value) && typeof value["used"] === "number" && typeof value["max"] === "number")
    return `${value["used"]} of ${value["max"]} used`;
  return "set";
}

/**
 * Two long texts side by side, cut to the stretch where they first part ways,
 * so an edit at the end of a long note isn't hidden behind identical openings.
 */
function excerpts(a: string, b: string): [string, string] {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  const start = Math.max(0, i - 20);
  const cut = (s: string) =>
    `${start > 0 ? "…" : ""}${s.slice(start, start + EXCERPT)}${s.length > start + EXCERPT ? "…" : ""}`;
  return [cut(a), cut(b)];
}

interface Seg {
  key: string;
  label: string;
}

interface Walk {
  names: Names;
  rows: { section: string; row: CompareRow }[];
}

function push(path: Seg[], local: string, remote: string, walk: Walk): void {
  const section = path[0]?.key ?? "";
  const label = path
    .slice(1)
    .map((s) => s.label)
    .join(" › ");
  walk.rows.push({
    section,
    row: { label: label || (SECTION_TITLES[section] ?? humanize(section)), local, remote },
  });
}

function joinOr(items: string[], empty: string): string {
  return items.length > 0 ? items.join(", ") : empty;
}

function diffArray(path: Seg[], a: unknown[], b: unknown[], walk: Walk): void {
  const { names } = walk;
  const restA = [...a];
  const restB = [...b];
  for (let i = restA.length - 1; i >= 0; i -= 1) {
    const match = restB.findIndex((y) => deepEqual(restA[i], y));
    if (match >= 0) {
      restA.splice(i, 1);
      restB.splice(match, 1);
    }
  }
  const scalars = [...a, ...b].every((x) => !isPlainObject(x) && !Array.isArray(x));
  if (scalars) {
    // Lists of ids (feats, spells known) are sets: show what each copy has
    // that the other lacks. Anything else (HP rolls, per-level picks) is
    // positional, so show both lists whole.
    const ids = [...a, ...b].every((x) => typeof x === "string" && names(x) !== undefined);
    if (ids) {
      if (restA.length === 0 && restB.length === 0) return;
      push(
        path,
        joinOr(
          restA.map((x) => formatScalar(x, names)),
          "nothing extra",
        ),
        joinOr(
          restB.map((x) => formatScalar(x, names)),
          "nothing extra",
        ),
        walk,
      );
    } else {
      push(
        path,
        joinOr(
          a.map((x) => formatScalar(x, names)),
          "none",
        ),
        joinOr(
          b.map((x) => formatScalar(x, names)),
          "none",
        ),
        walk,
      );
    }
    return;
  }
  // Entries both copies have under the same name are compared field by field
  // ("Potion of Cure Light Wounds › Quantity: 3 vs 1"); the rest are listed.
  const onlyA: string[] = [];
  for (const x of restA) {
    const label = entryLabel(x, names);
    const match = restB.findIndex((y) => entryLabel(y, names) === label);
    if (match < 0) {
      onlyA.push(label);
      continue;
    }
    const [y] = restB.splice(match, 1);
    diffValue([...path, { key: label, label }], x, y, walk);
  }
  const onlyB = restB.map((y) => entryLabel(y, names));
  if (onlyA.length > 0 || onlyB.length > 0)
    push(path, joinOr(onlyA, "nothing extra"), joinOr(onlyB, "nothing extra"), walk);
}

function diffValue(path: Seg[], a: unknown, b: unknown, walk: Walk): void {
  if (deepEqual(a, b)) return;
  const key = path.at(-1)?.key;
  if (key === "portrait") {
    push(path, a ? "a picture" : "no picture", b ? "a different picture" : "no picture", walk);
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    diffArray(path, Array.isArray(a) ? a : [], Array.isArray(b) ? b : [], walk);
    return;
  }
  const leaf = (v: unknown) => !isPlainObject(v) || formatScalar(v, walk.names) !== "set";
  if ((isPlainObject(a) || isPlainObject(b)) && !(leaf(a) && leaf(b))) {
    const ra = isPlainObject(a) ? a : {};
    const rb = isPlainObject(b) ? b : {};
    const keys = [...new Set([...Object.keys(ra), ...Object.keys(rb)])].sort();
    for (const k of keys) {
      if (path.length === 0 && ENVELOPE[k]) continue;
      const dotted = [...path.map((s) => s.key), k].join(".");
      if (IN_HEADLINE[dotted]) continue;
      const label = keyLabel(k, key, walk.names);
      diffValue([...path, { key: k, label }], ra[k], rb[k], walk);
    }
    return;
  }
  if (typeof a === "string" && typeof b === "string" && Math.max(a.length, b.length) > EXCERPT) {
    const [ea, eb] = excerpts(a, b);
    push(path, ea, eb, walk);
    return;
  }
  push(path, formatScalar(a, walk.names), formatScalar(b, walk.names), walk);
}

function classSummary(doc: CharacterDoc, refData: RefData): string {
  return joinOr(
    doc.identity.classes.map((c) => `${classByTag(refData, c.tag)?.name ?? c.tag} ${c.level}`),
    "no class",
  ).replaceAll(", ", " / ");
}

function hpText(doc: CharacterDoc, sheet: DerivedSheet | undefined): string {
  const { current, temp, nonlethal } = doc.live.hp;
  const parts = [sheet ? `${current} / ${sheet.hp.max}` : String(current)];
  if (temp > 0) parts.push(`${temp} temp`);
  if (nonlethal > 0) parts.push(`${nonlethal} nonlethal`);
  return parts.join(", ");
}

function safeCompute(doc: CharacterDoc, refData: RefData): DerivedSheet | undefined {
  try {
    return compute(doc, refData);
  } catch {
    return undefined;
  }
}

/** Compare a conflict's two copies. `refData` is the vendored data, before homebrew. */
export function compareConflict(
  localRaw: CharacterDoc,
  remoteRaw: CharacterDoc,
  refData: RefData,
): ConflictComparison {
  // The other device may have written an older schema; compare like with like.
  const local = migrateDoc(localRaw);
  const remote = migrateDoc(remoteRaw);
  const localRef = resolveRefData(local, refData);
  const remoteRef = resolveRefData(remote, refData);
  const localIndex = nameIndex(localRef);
  const remoteIndex = nameIndex(remoteRef);
  const names: Names = (key) => localIndex.get(key) ?? remoteIndex.get(key);
  const localSheet = safeCompute(local, localRef);
  const remoteSheet = safeCompute(remote, remoteRef);

  const headline: CompareRow[] = [];
  const row = (label: string, l: string, r: string) => {
    if (l !== r) headline.push({ label, local: l, remote: r });
  };
  row("Classes", classSummary(local, localRef), classSummary(remote, remoteRef));
  row("Hit points", hpText(local, localSheet), hpText(remote, remoteSheet));
  if (localSheet && remoteSheet) {
    const ac = (s: DerivedSheet) =>
      `${s.ac.normal}, touch ${s.ac.touch}, flat-footed ${s.ac.flatFooted}`;
    const saves = (s: DerivedSheet) =>
      (["fort", "ref", "will"] as const)
        .map((k) => `${SAVE_ABBR[k]} ${signed(s.saves[k].total)}`)
        .join(", ");
    const attack = (s: DerivedSheet) =>
      `Melee ${signed(s.attack.melee.total)}, ranged ${signed(s.attack.ranged.total)}`;
    row("AC", ac(localSheet), ac(remoteSheet));
    row("Saves", saves(localSheet), saves(remoteSheet));
    row("Attack", attack(localSheet), attack(remoteSheet));
  }
  const conditions = (d: CharacterDoc) =>
    joinOr(d.live.conditions.map((id) => CONDITIONS[id]?.name ?? id).sort(), "none");
  const buffs = (d: CharacterDoc) =>
    joinOr(
      d.live.activeBuffs.map((b) => (b.paused ? `${b.name} (paused)` : b.name)).sort(),
      "none",
    );
  row("Conditions", conditions(local), conditions(remote));
  row("Buffs", buffs(local), buffs(remote));
  row("Money", `${formatGp(purseGp(local))} gp`, `${formatGp(purseGp(remote))} gp`);
  row("XP", String(local.live.xp ?? 0), String(remote.live.xp ?? 0));

  const walk: Walk = { names, rows: [] };
  diffValue([], local, remote, walk);
  const present = new Set(walk.rows.map((r) => r.section));
  const order = [...SECTION_ORDER, ...[...present].filter((s) => !SECTION_ORDER.includes(s))];
  const sections = order
    .filter((section) => present.has(section))
    .map((section) => ({
      title: SECTION_TITLES[section] ?? humanize(section),
      rows: walk.rows.filter((r) => r.section === section).map((r) => r.row),
    }));
  return { headline, sections };
}

/**
 * How much older or newer the other device's copy is than this device's,
 * e.g. "15 days earlier". Empty when either timestamp doesn't parse.
 */
export function describeGap(localIso: string, remoteIso: string): string {
  const ms = Date.parse(remoteIso) - Date.parse(localIso);
  if (Number.isNaN(ms)) return "";
  const abs = Math.abs(ms);
  if (abs < 60_000) return "at about the same time";
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const [n, unit] =
    minutes < 60 ? [minutes, "minute"] : hours < 48 ? [hours, "hour"] : [days, "day"];
  return `${n} ${unit}${n === 1 ? "" : "s"} ${ms < 0 ? "earlier" : "later"}`;
}

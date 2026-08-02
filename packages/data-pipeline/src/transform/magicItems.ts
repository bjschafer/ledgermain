/**
 * Magic-item catalog import from Pf Data 1e's `magic_*.json` files.
 *
 * Foundry's `items` pack carries 189 wondrous items, 2 rods and 1 staff — about
 * 5% of the published magic-item catalog — because it vendors only the gear its
 * own automation covers. Pf Data 1e carries the rest, in the same flat
 * dictionary shape every other subsystem import already reads.
 *
 * Standard catalog-import posture (the same one rage powers/hexes/talents use):
 * the catalog comes from data, mechanics stay hand-authored as a per-id
 * overlay, and an imported entry that nothing models is display-only rather
 * than approximated. Every entry here therefore lands with an empty
 * `changes[]`; the `M` badge in the gear picker is what tells a player which
 * items actually move numbers. `normalize.ts` drops any import whose name
 * already exists in the pack or in `SUPPLEMENTAL_ITEMS`, so a vendored entry
 * keeps its real `changes[]` and a hand-authored one keeps its id.
 *
 * Every entry's prose opens with a fixed stat block:
 *
 * ```text
 * ## Boots of the Cat
 *
 * ‹SOURCE Ultimate Equipment/229›
 * **Aura** faint transmutation; **CL** 1st
 * **Slot** feet; **Price** 1,000 gp; **Weight** 1 lb.
 * ```
 *
 * 4,060 of the 4,107 entries carry a `**Slot**` line, which is also what
 * separates the two kinds of thing in these files: a slot ending in "quality"
 * ("weapon quality", "armor/shield quality") is a weapon/armor *special
 * ability* (flaming, keen, fortification) — a property you buy onto a weapon,
 * not a thing you carry — so those are returned separately and never reach the
 * gear picker.
 */

import type { Item, SourceRef } from "@pf1/schema";

import {
  pfDataBodyLines,
  pfDataCatalogEntries,
  pfDataDescriptionToHtml,
  pfDataSourceRefs,
  readPfDataDictionary,
  type PfDataEntry,
} from "../util/pfdata.js";

/**
 * A weapon/armor special ability (`**Slot** weapon quality`), split out of the
 * item stream. Priced in enhancement-bonus equivalents rather than gp, which is
 * why it can't be an {@link Item}.
 */
export interface MagicItemAbility {
  id: string;
  name: string;
  /** Which of weapon / armor / shield the ability can be applied to. */
  appliesTo: ("weapon" | "armor" | "shield")[];
  /** Enhancement-equivalent cost ("+1 bonus" -> 1), absent when priced in flat gp. */
  bonusEquivalent?: number;
  /** Flat gp surcharge, for the handful priced that way instead. */
  price?: number;
  cl?: number;
  aura?: string;
  description: string;
  sources?: SourceRef[];
}

/**
 * Which `magic_*.json` file an entry came from decides its `subType`, since the
 * prose itself never states the kind. Anything unlisted falls through to
 * "wondrous", which is what the bulk of these files hold.
 */
const SUBTYPE_BY_FILE: Record<string, string> = {
  magic_rod: "rod",
  magic_staff: "staff",
  magic_weapon: "weapon",
  magic_weapon2: "weapon",
  magic_armor: "armor",
  magic_artifact: "artifact",
  magic_artifact2: "artifact",
  magic_artifact3: "artifact",
};

/** Foundry's own school codes, so an imported aura reads the same as a vendored one. */
const SCHOOL_CODES: Record<string, string> = {
  abjuration: "abj",
  conjuration: "con",
  divination: "div",
  enchantment: "enc",
  evocation: "evo",
  illusion: "ill",
  necromancy: "nec",
  transmutation: "trs",
  universal: "uni",
};

/**
 * pfdata writes "none" for a slotless item; Foundry writes "slotless". Every
 * other slot name is already shared vocabulary, so it passes through.
 *
 * "none" only means the PF1 *slotless* category for a wondrous item. On a
 * sword, a suit of armor, a staff or an artifact it just means the question
 * doesn't apply, and labelling a Holy Avenger "slotless" in the picker would
 * read as a rules claim rather than a blank.
 */
function normalizeSlot(raw: string, subType: string): string | undefined {
  const slot = raw.trim().toLowerCase();
  if (slot === "" || slot === "-" || slot === "—") return undefined;
  if (slot !== "none") return slot;
  return subType === "wondrous" ? "slotless" : undefined;
}

/**
 * "1,000 gp" -> 1000, "1 gp" -> 1. Returns undefined for the non-numeric forms
 * the source uses freely ("-", "varies", "+1 bonus", "see text"), which is a
 * real answer for an artifact rather than a parse failure.
 */
function parsePrice(raw: string): number | undefined {
  const m = /([\d,]+(?:\.\d+)?)\s*gp/i.exec(raw);
  if (!m?.[1]) return undefined;
  const value = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

/** "1 lb." -> 1, "1/2 lb." -> 0.5, "5 lbs." -> 5; "-"/"&mdash" -> undefined. */
function parseWeight(raw: string): number | undefined {
  const fraction = /(\d+)\s*\/\s*(\d+)\s*lb/i.exec(raw);
  if (fraction?.[1] && fraction[2]) {
    const value = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(value) ? value : undefined;
  }
  const m = /([\d,]+(?:\.\d+)?)\s*lb/i.exec(raw);
  if (!m?.[1]) return undefined;
  const value = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

/** "**CL** 5th" -> 5. "varies" and the rest yield undefined. */
function parseCl(raw: string): number | undefined {
  const m = /(\d+)\s*(?:st|nd|rd|th)?/.exec(raw.trim());
  if (!m?.[1]) return undefined;
  const value = Number(m[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/**
 * "faint transmutation" -> "trs". A compound aura ("conjuration and
 * transmutation") has no single code and is kept as prose, which is exactly
 * what the vendored pack does with its own handful of them.
 */
function parseAura(raw: string): string | undefined {
  const text = raw
    .trim()
    .toLowerCase()
    .replace(/^(faint|moderate|strong|overwhelming)\s+/, "");
  if (text === "" || text === "-") return undefined;
  return SCHOOL_CODES[text] ?? text;
}

/** Pull `**Label** value` out of the stat block, tolerating `;`-joined pairs on one line. */
function statField(lines: string[], label: string): string | undefined {
  const re = new RegExp(`\\*\\*${label}\\*\\*\\s*([^;\\n]*)`, "i");
  for (const line of lines) {
    const m = re.exec(line);
    if (m?.[1] !== undefined) return m[1].trim();
  }
  return undefined;
}

const STAT_LINE_RE = /\*\*(?:Aura|CL|Slot|Price|Weight)\*\*/;
const CONSTRUCTION_RE = /^###\s+Construction\b/i;

/**
 * The stat block and the crafting appendix are both redundant with the fields
 * parsed out of them, so the rendered description keeps only the actual rules
 * prose — matching how the vendored pack's descriptions read.
 */
function prosePartOf(body: string[]): string[] {
  const out: string[] = [];
  for (const line of body) {
    if (CONSTRUCTION_RE.test(line.trim())) break;
    if (STAT_LINE_RE.test(line)) continue;
    out.push(line);
  }
  while (out[0]?.trim() === "") out.shift();
  while (out.length > 0 && out[out.length - 1]?.trim() === "") out.pop();
  return out;
}

const SOURCE_LINE_RE = /‹SOURCE\s+([^›]*)›/;

/**
 * The `‹SOURCE Book/page;Book/page›` line, which carries page numbers the
 * entry's own `sources` list doesn't. Falls back to that list when absent.
 */
function sourcesOf(entry: PfDataEntry): SourceRef[] | undefined {
  const line = (entry.description ?? []).find((l) => SOURCE_LINE_RE.test(l));
  const m = line ? SOURCE_LINE_RE.exec(line) : null;
  if (!m?.[1]) return pfDataSourceRefs(entry);

  const refs: SourceRef[] = [];
  for (const part of m[1].split(";")) {
    const slash = part.lastIndexOf("/");
    const book = (slash === -1 ? part : part.slice(0, slash)).trim();
    const page = slash === -1 ? "" : part.slice(slash + 1).trim();
    if (book === "") continue;
    refs.push({
      id: book
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      ...(/^\d+$/.test(page) ? { pages: page } : {}),
    });
  }
  return refs.length > 0 ? refs : pfDataSourceRefs(entry);
}

/** "+1 bonus" -> 1. */
function parseBonusEquivalent(raw: string): number | undefined {
  const m = /\+(\d+)\s*bonus/i.exec(raw);
  return m?.[1] ? Number(m[1]) : undefined;
}

function abilityAppliesTo(slot: string): ("weapon" | "armor" | "shield")[] {
  const out: ("weapon" | "armor" | "shield")[] = [];
  if (slot.includes("weapon")) out.push("weapon");
  if (slot.includes("armor")) out.push("armor");
  if (slot.includes("shield")) out.push("shield");
  return out.length > 0 ? out : ["weapon"];
}

/**
 * The dataset's "requested entry not found" sentinels: structurally valid
 * entries (they have a name and a description of their own) that describe
 * nothing, so `isPfDataCatalogEntry` can't filter them generically.
 */
const SKIP_KEYS = new Set(["not_found"]);

export interface MagicItemImport {
  items: Item[];
  abilities: MagicItemAbility[];
}

/**
 * Read every `magic_*.json` file in `jsonDir` into items + special abilities.
 * `files` is the caller's explicit list (basenames without `.json`) so a new
 * upstream file can't silently start or stop contributing on a data bump.
 */
export function transformMagicItems(jsonDir: string, files: readonly string[]): MagicItemImport {
  const items: Item[] = [];
  const abilities: MagicItemAbility[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const dict = readPfDataDictionary(`${jsonDir}/${file}.json`);
    const subType = SUBTYPE_BY_FILE[file] ?? "wondrous";

    for (const [key, entry] of pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS })) {
      const name = entry.name;
      if (name === undefined) continue;
      // The same item is listed in more than one file where its slot is
      // ambiguous ("neck or shoulders"); first file listed wins.
      if (seen.has(key)) continue;
      seen.add(key);

      const body = pfDataBodyLines(entry.description ?? []);
      const rawSlot = statField(body, "Slot") ?? "";
      const description = pfDataDescriptionToHtml(prosePartOf(body));
      const cl = parseCl(statField(body, "CL") ?? "");
      const aura = parseAura(statField(body, "Aura") ?? "");
      const sources = sourcesOf(entry);

      if (rawSlot.toLowerCase().includes("quality")) {
        const rawPrice = statField(body, "Price") ?? "";
        abilities.push({
          id: `ability:${key}`,
          name,
          appliesTo: abilityAppliesTo(rawSlot.toLowerCase()),
          bonusEquivalent: parseBonusEquivalent(rawPrice),
          price: parsePrice(rawPrice),
          cl,
          aura,
          description,
          sources,
        });
        continue;
      }

      items.push({
        id: `mi:${key}`,
        name,
        uuid: `magic-item:${key}`,
        description,
        sources,
        subType,
        slot: normalizeSlot(rawSlot, subType),
        price: parsePrice(statField(body, "Price") ?? ""),
        weight: parseWeight(statField(body, "Weight") ?? ""),
        cl,
        changes: [],
        contextNotes: [],
        aura: aura ? { school: aura } : undefined,
      });
    }
  }

  return { items, abilities };
}

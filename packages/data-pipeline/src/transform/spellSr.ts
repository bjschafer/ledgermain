import { join } from "node:path";

import type { Spell } from "@pf1/schema";

import { parseDirectiveProps, pfDataCatalogEntries, readPfDataDictionary } from "../util/pfdata.js";

/**
 * The 16 `spells*.json` dictionary files under the pinned Pf Data 1e clone's
 * `json/` dir (`spells.json`, then `spells2.json` .. `spells16.json` — no
 * `spells1.json`). Each is a flat slug-keyed dictionary in the same shape
 * every other subsystem file uses (see `util/pfdata.ts`), split across files
 * purely for the upstream repo's own storage reasons.
 */
const SPELL_FILE_NAMES = [
  "spells.json",
  ...Array.from({ length: 15 }, (_, i) => `spells${i + 2}.json`),
];

/** Only `spells.json` carries the dataset's "not found" sentinel key. */
const SKIP_KEYS = new Set(["not_found"]);

/**
 * A handful of PFDATA spell names that don't literally match their Foundry
 * counterpart, verified individually by cross-checking each pair's source
 * book + page number (both sides cite the identical page):
 * "Judgement"/"Judgment" and "Unshakeable"/"Unshakable" are spelling variants,
 * "Asphixiation" is a PFDATA typo for "Asphyxiation", and "Malediction (Hero
 * Points)" is Foundry's "Malediction (APG)" under a different disambiguator
 * (both cite Advanced Player's Guide p.324). Never add an entry here on a
 * name-similarity guess alone — confirm the source/page match first.
 */
const NAME_ALIASES: Record<string, string> = {
  "Judgement Undone": "Judgment Undone",
  "Hasten Judgement": "Hasten Judgment",
  "Unshakeable Zeal": "Unshakable Zeal",
  "Phantasmal Asphixiation": "Phantasmal Asphyxiation",
  "Malediction (Hero Points)": "Malediction (APG)",
};

/** Lowercased, whitespace-collapsed — matches the two sources' shared spelling of a name verbatim. */
function exactKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Letters/digits only, with a leading "Mass"/"Greater"/"Lesser" modifier moved
 * to the end — PFDATA prints these as a name PREFIX ("Mass Cure Light
 * Wounds"), Foundry as a comma-suffix ("Cure Light Wounds, Mass"). Fallback
 * key tried only when `exactKey` doesn't resolve, so it never overrides a
 * source that already spells a name the Foundry way (e.g. both sources have
 * independent "Flash Fire"/"Flashfire" and "Peace Bond"/"Peacebond" entries;
 * matching on `exactKey` first keeps those four spells distinct instead of
 * colliding on one reordered key).
 */
function reorderKey(name: string): string {
  const words =
    name
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.slice() ?? [];
  if (words.length > 0 && ["mass", "greater", "lesser"].includes(words[0]!)) {
    words.push(words.shift()!);
  }
  return words.join("");
}

const SPELL_DIRECTIVE_RE = /^::spell\{([^}]*)\}$/;

/**
 * Reads the SR display text off an entry's FIRST `::spell{...}` directive
 * line (a multi-tier entry like Beast Shape or Summon Monster nests one
 * `::spell{}` block per tier under one dictionary key; only the first tier's
 * SR is read — the name won't match a vendored spell anyway, see
 * `NAME_ALIASES` doc comment for the general "don't guess" posture). Returns
 * `undefined` when the directive carries no SR token at all — never
 * fabricated.
 *
 * Token grammar, verified against aonprd.com's printed SR line for a sample
 * of each shape: `srY` -> "yes", `srN` -> "no", `srObject` -> "yes (object)"
 * (Shout, Telekinetic Sphere, Conjuration Foil, Mirror Polish, Burning
 * Disarm all print exactly "yes (object)"; `srObject` always accompanies
 * `srY` in this dataset, so it's checked first and wins). A standalone
 * `harmless` flag alongside `srY`/`srN` appends " (harmless)" (Stoneskin,
 * Haste print "yes (harmless)"; Absorbing Barrier prints "no (harmless)").
 * Free-text `sr="..."` (e.g. Cure Light Wounds' "yes (harmless); see text")
 * passes through verbatim and never combines with the flag tokens (verified:
 * no entry in the pinned dataset carries both).
 */
export function extractSpellSr(description: string[] | undefined): string | undefined {
  if (!description) return undefined;
  for (const line of description) {
    const m = SPELL_DIRECTIVE_RE.exec(line.trim());
    if (!m) continue;
    const props = parseDirectiveProps(m[1]!);
    if (typeof props.sr === "string") return props.sr;
    if (props.srObject === true) return "yes (object)";
    const harmlessSuffix = props.harmless === true ? " (harmless)" : "";
    if (props.srY === true) return `yes${harmlessSuffix}`;
    if (props.srN === true) return `no${harmlessSuffix}`;
    return undefined;
  }
  return undefined;
}

/**
 * Attaches `Spell.sr` display text to the vendored spell catalog by NAME match
 * against the "Pf Data 1e" `spells*.json` dictionaries — the pinned Foundry
 * pack's own `system.sr` is upstream-dead (never `true` in any vendored spell,
 * see `SCHEMA_VERSION`'s v18 note), so this is the only source of the field.
 * Mutates `spells` in place; unmatched vendored spells simply keep `sr` unset
 * rather than guessing. Logs a matched/unmatched summary to the build console
 * (not thrown — PFDATA legitimately omits a handful of spells Foundry has, and
 * vice versa, so drift here isn't a hard error the way a missing hand-authored
 * supplement name would be).
 */
export function applySpellSrSupplements(spells: Spell[], pfDataJsonDir: string): void {
  const addTo = (index: Map<string, Spell[]>, key: string, spell: Spell) => {
    let list = index.get(key);
    if (!list) {
      list = [];
      index.set(key, list);
    }
    list.push(spell);
  };

  const byExact = new Map<string, Spell[]>();
  const byReorder = new Map<string, Spell[]>();
  for (const spell of spells) {
    addTo(byExact, exactKey(spell.name), spell);
    addTo(byReorder, reorderKey(spell.name), spell);
  }

  let matched = 0;
  let assigned = 0;
  const unmatched: string[] = [];

  for (const fileName of SPELL_FILE_NAMES) {
    const dict = readPfDataDictionary(join(pfDataJsonDir, fileName));
    for (const [, entry] of pfDataCatalogEntries(dict, { skipKeys: SKIP_KEYS })) {
      const name = NAME_ALIASES[entry.name!] ?? entry.name!;

      let candidates = byExact.get(exactKey(name));
      if (!candidates || candidates.length !== 1) {
        const reordered = byReorder.get(reorderKey(name));
        if (reordered && reordered.length === 1) candidates = reordered;
      }
      if (!candidates || candidates.length !== 1) {
        unmatched.push(entry.name!);
        continue;
      }

      matched++;
      const sr = extractSpellSr(entry.description);
      if (sr !== undefined) {
        candidates[0]!.sr = sr;
        assigned++;
      }
    }
  }

  console.log(
    `[spellSr] matched ${matched} PFDATA spell entries by name (${unmatched.length} unmatched); assigned sr to ${assigned} vendored spells`,
  );
  if (unmatched.length > 0) {
    console.log(`[spellSr] unmatched: ${unmatched.join(", ")}`);
  }
}

/**
 * Clean-room PF1 witch patron table (Advanced Player's Guide + Ultimate
 * Magic): hand-authored from the published rules (verified against
 * aonprd.com's Witch Patrons index — each entry below cites its source book),
 * mirroring `oracle-mysteries.ts`'s posture for oracle mysteries — a patron's
 * ONLY structured mechanical content is its bonus spell list (one spell added
 * to the familiar's known spells at witch level 2, 4, 6,..., 18, per APG's
 * Patron Spells class feature); everything else about a patron (its narrative
 * theme) is flavor text, not modeled.
 *
 * Data provenance — UNLIKE `oracle-mysteries.ts`'s `bonusSpells`, which
 * copies real vendored Foundry spell `_id`s straight out of the mystery's
 * `@UUID[...]` prose references, a witch patron's bonus-spell list is NOT
 * embedded anywhere in the vendored Foundry data pack as structured data
 * (the Witch class def only links the generic "Patron Spells" stub
 * `ClassFeature`) — but the vendored PROSE for most patrons spells its
 * progression out in a parseable `<level> - <spell>` list (see "vendored
 * catalog overlay" below), so `bonusSpells` here carries only a spell NAME
 * (no `id`) — `model/spellcasting.patronSpellsKnown` (apps/web) resolves
 * each name against `RefData.spells` at runtime by exact case-insensitive
 * name match, degrading gracefully to a name-only display entry when the
 * vendored spell slice doesn't carry that spell — same "unresolvable
 * id/name is tolerated, never thrown" posture `oracle-mysteries.ts`'s own
 * bonusSpells resolution and `resolveGrantsBuffs` (resources.ts) already
 * use.
 *
 * Scope of THIS table: the 17 Advanced Player's Guide / Ultimate Magic
 * "core" patrons with a verifiable, source-cited, complete 9-spell
 * progression: Agility, Animals, Deception, Elements, Endurance, Healing
 * (UM), Light (UM), Moon (UM), Plague, Strength, Transformation, Trickery,
 * Water, Wisdom, Shadow, Time (UM), Vengeance (UM). These stay authoritative
 * over the vendored-parsed progression below on a name collision (hand
 * verification against the published book beats prose extraction). The
 * remaining ~35 "basic" published patrons (a plain 9-spell progression, no
 * hand-authored entry here) get their progression from the parser instead;
 * see `mergedWitchPatronCatalog`'s doc comment for that and for the 9
 * "unique" themed patrons, which are NOT a 9-spell progression at all.
 */

import type { RefData, SourceRef, WitchPatron } from "@pf1/schema";

export interface WitchPatronBonusSpell {
  /** Witch class level at which this spell is added to the familiar's known list (2, 4, ..., 18). */
  level: number;
  /** Display name — resolved against `RefData.spells` by name at runtime (see file doc comment); no vendored id to carry. */
  name: string;
}

export interface WitchPatronDef {
  /** Matches `doc.build.witchPatron` keys. */
  tag: string;
  name: string;
  /** One bonus spell known at witch level 2, 4, 6, ..., 18 (ascending). */
  bonusSpells: WitchPatronBonusSpell[];
}

function spells(...names: string[]): WitchPatronBonusSpell[] {
  return names.map((name, i) => ({ level: 2 * (i + 1), name }));
}

const PATRON_LIST: WitchPatronDef[] = [
  {
    tag: "agility",
    name: "Agility",
    bonusSpells: spells(
      "Jump",
      "Cat's Grace",
      "Haste",
      "Freedom of Movement",
      "Polymorph",
      "Mass Cat's Grace",
      "Ethereal Jaunt",
      "Animal Shapes",
      "Shapechange",
    ),
  },
  {
    tag: "animals",
    name: "Animals",
    bonusSpells: spells(
      "Charm Animal",
      "Speak with Animals",
      "Dominate Animal",
      "Summon Nature's Ally IV",
      "Animal Growth",
      "Antilife Shell",
      "Beast Shape IV",
      "Animal Shapes",
      "Summon Nature's Ally IX",
    ),
  },
  {
    tag: "deception",
    name: "Deception",
    bonusSpells: spells(
      "Ventriloquism",
      "Invisibility",
      "Blink",
      "Confusion",
      "Passwall",
      "Programmed Image",
      "Mass Invisibility",
      "Scintillating Pattern",
      "Time Stop",
    ),
  },
  {
    tag: "elements",
    name: "Elements",
    bonusSpells: spells(
      "Shocking Grasp",
      "Flaming Sphere",
      "Fireball",
      "Wall of Ice",
      "Flame Strike",
      "Freezing Sphere",
      "Vortex",
      "Fire Storm",
      "Meteor Swarm",
    ),
  },
  {
    tag: "endurance",
    name: "Endurance",
    bonusSpells: spells(
      "Endure Elements",
      "Bear's Endurance",
      "Protection from Energy",
      "Spell Immunity",
      "Spell Resistance",
      "Mass Bear's Endurance",
      "Greater Restoration",
      "Iron Body",
      "Miracle",
    ),
  },
  {
    // Ultimate Magic.
    tag: "healing",
    name: "Healing",
    bonusSpells: spells(
      "Remove Fear",
      "Lesser Restoration",
      "Remove Disease",
      "Restoration",
      "Cleanse",
      "Pillar of Life",
      "Greater Restoration",
      "Mass Cure Critical Wounds",
      "True Resurrection",
    ),
  },
  {
    // Ultimate Magic.
    tag: "light",
    name: "Light",
    bonusSpells: spells(
      "Dancing Lantern",
      "Continual Flame",
      "Daylight",
      "Rainbow Pattern",
      "Fire Snake",
      "Sirocco",
      "Sunbeam",
      "Sunburst",
      "Fiery Body",
    ),
  },
  {
    // Ultimate Magic.
    tag: "moon",
    name: "Moon",
    bonusSpells: spells(
      "Darkness",
      "Darkvision",
      "Owl's Wisdom",
      "Moonstruck",
      "Aspect of the Wolf",
      "Control Water",
      "Lunar Veil",
      "Horrid Wilting",
      "Meteor Swarm",
    ),
  },
  {
    tag: "plague",
    name: "Plague",
    bonusSpells: spells(
      "Detect Undead",
      "Command Undead",
      "Contagion",
      "Animate Dead",
      "Giant Vermin",
      "Create Undead",
      "Control Undead",
      "Create Greater Undead",
      "Energy Drain",
    ),
  },
  {
    tag: "strength",
    name: "Strength",
    bonusSpells: spells(
      "Divine Favor",
      "Bull's Strength",
      "Greater Magic Weapon",
      "Divine Power",
      "Righteous Might",
      "Mass Bull's Strength",
      "Giant Form I",
      "Giant Form II",
      "Shapechange",
    ),
  },
  {
    tag: "transformation",
    name: "Transformation",
    bonusSpells: spells(
      "Jump",
      "Bear's Endurance",
      "Beast Shape I",
      "Beast Shape II",
      "Beast Shape III",
      "Form of the Dragon I",
      "Form of the Dragon II",
      "Form of the Dragon III",
      "Shapechange",
    ),
  },
  {
    tag: "trickery",
    name: "Trickery",
    bonusSpells: spells(
      "Animate Rope",
      "Mirror Image",
      "Major Image",
      "Hallucinatory Terrain",
      "Mirage Arcana",
      "Mislead",
      "Reverse Gravity",
      "Screen",
      "Time Stop",
    ),
  },
  {
    tag: "water",
    name: "Water",
    bonusSpells: spells(
      "Bless Water",
      "Slipstream",
      "Water Breathing",
      "Control Water",
      "Geyser",
      "Elemental Body III",
      "Elemental Body IV",
      "Seamantle",
      "Tsunami",
    ),
  },
  {
    tag: "wisdom",
    name: "Wisdom",
    bonusSpells: spells(
      "Shield of Faith",
      "Owl's Wisdom",
      "Magic Vestment",
      "Lesser Globe of Invulnerability",
      "Dream",
      "Globe of Invulnerability",
      "Spell Turning",
      "Protection from Spells",
      "Mage's Disjunction",
    ),
  },
  {
    tag: "shadow",
    name: "Shadow",
    bonusSpells: spells(
      "Silent Image",
      "Darkness",
      "Deeper Darkness",
      "Shadow Conjuration",
      "Shadow Evocation",
      "Shadow Walk",
      "Greater Shadow Conjuration",
      "Greater Shadow Evocation",
      "Shades",
    ),
  },
  {
    // Ultimate Magic.
    tag: "time",
    name: "Time",
    bonusSpells: spells(
      "Ventriloquism",
      "Silence",
      "Haste",
      "Threefold Aspect",
      "Teleport",
      "Disintegrate",
      "Expend",
      "Temporal Stasis",
      "Time Stop",
    ),
  },
  {
    // Ultimate Magic.
    tag: "vengeance",
    name: "Vengeance",
    bonusSpells: spells(
      "Burning Hands",
      "Burning Gaze",
      "Pain Strike",
      "Shout",
      "Symbol of Pain",
      "Mass Pain Strike",
      "Phantasmal Revenge",
      "Incendiary Cloud",
      "Winds of Vengeance",
    ),
  },
];

export const WITCH_PATRONS: Record<string, WitchPatronDef> = Object.fromEntries(
  PATRON_LIST.map((p) => [p.tag, p]),
);

export const WITCH_PATRON_TAGS: readonly string[] = PATRON_LIST.map((p) => p.tag);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.witchPatrons` is the FULL published catalog (61 entries after junk
 * filtering) — same "catalog from data, mechanics as overlay" pattern as
 * `rage-powers.ts`'s `mergedRagePowerCatalog`, but unlike most of that
 * pattern's siblings, the vendored PROSE itself carries the progression for
 * most entries, so this overlay does real extraction rather than pure
 * display passthrough:
 *
 * - The 52 `category: "basic"` entries each spell a 9-spell progression as a
 *   `"2nd - jump, 4th - cat's grace, ..."` list in their first paragraph.
 *   `parseVendoredPatronSpells` extracts it; a match against the 17
 *   hand-verified patrons above (by normalized name) keeps the hand table's
 *   entry instead (it can carry a judgment call the raw prose doesn't, e.g.
 *   simplifying "elemental body III (water only)" to "Elemental Body III").
 *   The other ~35 basic patrons get the parsed progression directly, which
 *   is enough to stop being `displayOnly`.
 * - The 9 `category: "unique"` entries are patron TEMPLATES, not a 9-spell
 *   list: each grants a named hex at 1st level, imposes a drawback, and
 *   restricts the witch to a small set of "Available Patron Themes" whose
 *   own bonus-spell list applies with a few "Spell Changes" overrides layered
 *   on top. `parseVendoredPatronThemeInfo` extracts that structure into
 *   `MergedWitchPatronEntry.themeInfo` for display; it is deliberately NOT
 *   turned into a `bonusSpells` progression (there isn't one without a theme
 *   sub-choice this app doesn't yet collect), so these stay `displayOnly`.
 *
 * Both parsers degrade to an empty result on unrecognized prose shape
 * (a future data bump reformatting the source) rather than throwing — the
 * entry then just falls back to plain display-only prose, same tolerance
 * posture the file doc comment above describes for spell-name resolution.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 17 hand-authored
 * patrons): all 17 matched a vendored `"basic"` entry by normalized name (the
 * vendored dictionary keys ARE this table's own `tag`s, verified) — no
 * aliasing needed.
 */

const WITCH_PATRON_NAME_ALIASES: Record<string, string> = {};

function normalizePatronName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** One `<strong>Spell Changes:</strong>` override row on a `"unique"` patron template — display text only, not resolved against `RefData.spells` (see `WitchPatronThemeInfo` doc comment). */
export interface WitchPatronSpellChange {
  level: number;
  text: string;
}

/** Structured read of a `"unique"` patron's template prose (the hex it grants, its drawback, which themes it restricts you to, and the spell overrides it layers on the chosen theme). Informational only — applying it (picking a theme, swapping in the overridden spells) is left to the player; see `mergedWitchPatronCatalog`'s doc comment for why this app doesn't model it as a real progression. */
export interface WitchPatronThemeInfo {
  grantedHex: string;
  drawback: string;
  availableThemes: string[];
  spellChanges: WitchPatronSpellChange[];
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry (parsed or plain display-only). */
export interface MergedWitchPatronEntry extends WitchPatronDef {
  /** Vendored "basic"/"unique" grouping, when present. */
  category?: "basic" | "unique";
  description?: string;
  sources?: SourceRef[];
  /** Set only for a `"unique"` themed patron template (see `WitchPatronThemeInfo`). */
  themeInfo?: WitchPatronThemeInfo;
  /** True when this entry has no bonus-spell progression at all (a `"unique"` template, or a `"basic"` entry whose prose didn't match the parser's expected shape) — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

/** `Foundry`/"Pf Data 1e" spell-naming convention for a modified base spell: `"<Base>, <Modifier>"` (e.g. "Confusion, Lesser", "Bull's Strength, Mass") rather than English word order. Tried as a fallback when the plain word-order name doesn't resolve. */
const SPELL_MODIFIER_PREFIXES = ["Greater Communal", "Greater", "Lesser", "Mass", "Communal"];

/** Patron prose that names a spell the compendium files under a different title. Keyed by the lowercased prose name. */
const SPELL_NAME_ALIASES: Record<string, string> = { geas: "Geas/Quest" };

const TITLE_CASE_SMALL_WORDS = new Set([
  "of",
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "on",
  "at",
  "to",
]);

/** Capitalizes each word (skipping leading punctuation, e.g. `"(good"` → `"(Good"`), lower-casing minor connector words (except as the first word) and upper-casing bare roman-numeral words (`iii` → `III`) — good enough for display; exact resolution against `RefData.spells` is case-insensitive regardless (see `resolveVendoredSpellName`). */
function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word, i) => {
      if (word.length === 0) return word;
      const core = word.replace(/[^a-zA-Z]/g, "");
      if (core.length > 0 && /^[ivx]+$/i.test(core)) return word.replace(core, core.toUpperCase());
      if (i > 0 && TITLE_CASE_SMALL_WORDS.has(core.toLowerCase())) return word.toLowerCase();
      const m = word.match(/^([^a-zA-Z]*)([a-zA-Z])(.*)$/);
      return m ? `${m[1]}${m[2]!.toUpperCase()}${m[3]!.toLowerCase()}` : word;
    })
    .join(" ");
}

function capitalizeFirst(text: string): string {
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

const spellIndexCache = new WeakMap<RefData, Map<string, string>>();
function spellNameIndex(refData: RefData): Map<string, string> {
  let index = spellIndexCache.get(refData);
  if (!index) {
    index = new Map();
    for (const sp of Object.values(refData.spells)) index.set(sp.name.toLowerCase(), sp.name);
    spellIndexCache.set(refData, index);
  }
  return index;
}

/**
 * Resolve a raw parsed spell name to the exact vendored spell name it will
 * round-trip through `apps/web`'s `patronSpellsKnown` (a dumb, exact,
 * case-insensitive lookup) — or a best-effort Title Case fallback when it
 * doesn't resolve at all (same graceful-degradation posture the file doc
 * comment above documents).
 *
 * A trailing parenthetical qualifier (`"elemental body III (water only)"`)
 * is always dropped: no vendored spell name carries one, so keeping it would
 * only ever break the lookup, and the 17-patron hand table already sets this
 * precedent (Water's own "Elemental Body III" entry drops the same
 * qualifier). What's left is tried as-is, then in the vendored data's own
 * `"<Base>, <Modifier>"` order (`SPELL_MODIFIER_PREFIXES`) for the common
 * case where the prose says "greater X" but the spell is filed as "X,
 * Greater".
 */
function resolveVendoredSpellName(refData: RefData, raw: string): string {
  const index = spellNameIndex(refData);
  const cleaned = raw.replace(/\.$/, "").trim();
  const stripped = cleaned.replace(/\s*\([^)]*\)\s*$/, "").trim();

  const direct = index.get(stripped.toLowerCase());
  if (direct) return direct;

  const alias = SPELL_NAME_ALIASES[stripped.toLowerCase()];
  if (alias) {
    const aliased = index.get(alias.toLowerCase());
    if (aliased) return aliased;
  }

  for (const prefix of SPELL_MODIFIER_PREFIXES) {
    if (stripped.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
      const rest = stripped.slice(prefix.length).trim();
      const swapped = index.get(`${rest}, ${prefix}`.toLowerCase());
      if (swapped) return swapped;
    }
  }

  return titleCase(stripped);
}

/** One `<level>(st|nd|rd|th) - <name>` list entry, as extracted verbatim (not yet spell-name-resolved). */
/**
 * Two shapes, because the vendored source changed its own. The published prose
 * form is `"2nd - jump, 4th - cat's grace"`; the dataset later moved these
 * progressions into a level-keyed directive, which the pipeline renders as
 * `"Level 2: Jump; Level 4: Cat's grace"`. Both are accepted so a patron's
 * progression survives whichever side of that change the pin sits on.
 */
function extractLevelList(text: string): { level: number; raw: string }[] {
  const body = text.replace(/\.\s*(\[\^\w+])?\s*$/, "").trim();
  const prose = /(\d+)(?:st|nd|rd|th)\s*-\s*(.+?)(?=,\s*\d+(?:st|nd|rd|th)\s*-|$)/g;
  const fromProse = [...body.matchAll(prose)].map((m) => ({
    level: Number(m[1]),
    raw: m[2]!.trim(),
  }));
  if (fromProse.length > 0) return fromProse;

  const rendered = /\bLevel\s+(\d+):\s*(.+?)(?=;\s*Level\s+\d+:|;?\s*$)/g;
  return [...body.matchAll(rendered)].map((m) => ({
    level: Number(m[1]),
    raw: m[2]!.trim(),
  }));
}

function firstParagraphText(html: string): string | undefined {
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  return m ? m[1]!.replace(/<[^>]+>/g, "").trim() : undefined;
}

/**
 * Extract a `"basic"` patron's 9-spell bonus progression from its vendored
 * description's first paragraph (`"2nd - jump, 4th - cat's grace, ..."`).
 * Returns `[]` if the paragraph doesn't match that shape at all.
 */
export function parseVendoredPatronSpells(
  refData: RefData,
  description: string,
): WitchPatronBonusSpell[] {
  const text = firstParagraphText(description);
  if (!text) return [];
  return extractLevelList(text).map((entry) => ({
    level: entry.level,
    name: resolveVendoredSpellName(refData, entry.raw),
  }));
}

/**
 * Extract a `"unique"` patron template's structured fields: the hex it
 * grants at 1st level, its drawback, its "Available Patron Themes" list, and
 * its "Spell Changes" overrides. Returns `undefined` if the description
 * doesn't match the expected three-paragraph shape.
 */
export function parseVendoredPatronThemeInfo(
  description: string,
): WitchPatronThemeInfo | undefined {
  const paragraphs = [...description.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1]!.replace(/<[^>]+>/g, "").trim(),
  );
  const first = paragraphs[0];
  if (!first) return undefined;

  // Two shapes, because the vendored source changed its own. The published
  // prose form runs the granted hex and its cost together in one sentence
  // ("You gain the ward hex at 1st level, but your patron holds you to a
  // higher standard: ..."). The dataset later split them into separate
  // directive props, which the pipeline renders as neighbouring sentences in a
  // single paragraph, with the cost stated first.
  const joined = first.match(/You gain the (.+?) hex at 1st level,?\s*but\s+(.+)$/i);
  const split = joined
    ? undefined
    : (first.match(/You gain the (.+?) hex at 1st level\.?/i) ?? undefined);
  if (!joined && !split) return undefined;

  const grantedHexRaw = (joined ?? split)![1]!;
  // In the split shape the drawback is whatever prose sits outside the hex
  // sentence, the level list and the labelled sections.
  const drawbackRaw = joined
    ? joined[2]!
    : first
        .replace(/You gain the .+? hex at 1st level\.?/i, " ")
        .replace(/\bLevel\s+\d+:[\s\S]*$/, " ")
        .replace(/\b(?:Available Patron Themes|Patron Spells):[\s\S]*$/i, " ")
        .replace(/\s+/g, " ")
        .trim();
  if (drawbackRaw === "") return undefined;

  const themesP = paragraphs.find((p) => /Available Patron Themes:/i.test(p));
  const availableThemes = themesP
    ? themesP
        .replace(/.*Available Patron Themes:\s*/i, "")
        // The rendered shape continues into the next labelled section rather
        // than ending the paragraph; stop at it.
        .replace(/\b(?:Patron Spells|Spell Changes):[\s\S]*$/i, "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const changesP =
    paragraphs.find((p) => /Spell Changes:/i.test(p)) ??
    paragraphs.find((p) => /\bLevel\s+\d+:/.test(p));
  const spellChanges = changesP
    ? extractLevelList(
        changesP
          .replace(/.*Spell Changes:\s*/i, "")
          .replace(/\b(?:Available Patron Themes|Patron Spells):[\s\S]*$/i, ""),
      ).map((entry) => ({
        level: entry.level,
        text: titleCase(entry.raw),
      }))
    : [];

  return {
    grantedHex: titleCase(grantedHexRaw.trim()),
    drawback: capitalizeFirst(drawbackRaw),
    availableThemes,
    spellChanges,
  };
}

/**
 * The hand table writes a modified spell in English word order ("Mass Cat's
 * Grace"), while the compendium files it as `"<Base>, <Modifier>"`. Both
 * spellings go through the same resolver the vendored prose does, so a hand
 * entry resolves to a real spell rather than degrading to a name-only display
 * entry (see `resolveVendoredSpellName`).
 */
function withResolvedSpellNames(def: WitchPatronDef, refData: RefData): WitchPatronDef {
  return {
    ...def,
    bonusSpells: def.bonusSpells.map((sp) => ({
      level: sp.level,
      name: resolveVendoredSpellName(refData, sp.name),
    })),
  };
}

function vendoredPatronToDef(entry: WitchPatron, refData: RefData): MergedWitchPatronEntry {
  if (entry.category === "unique") {
    return {
      tag: entry.id,
      name: entry.name,
      bonusSpells: [],
      category: entry.category,
      description: entry.description,
      sources: entry.sources,
      themeInfo: entry.description ? parseVendoredPatronThemeInfo(entry.description) : undefined,
      displayOnly: true,
    };
  }
  const bonusSpells = entry.description
    ? parseVendoredPatronSpells(refData, entry.description)
    : [];
  return {
    tag: entry.id,
    name: entry.name,
    bonusSpells,
    category: entry.category,
    description: entry.description,
    sources: entry.sources,
    displayOnly: bonusSpells.length === 0,
  };
}

/** Resolve a picked patron tag (`doc.build.witchPatron`) to its definition — hand-authored table first, falling back to the vendored catalog (parsed or plain display-only) for a tag that only exists there. */
export function resolveWitchPatron(
  tag: string,
  refData: RefData,
): MergedWitchPatronEntry | undefined {
  const hand = WITCH_PATRONS[tag];
  if (hand) return { ...withResolvedSpellNames(hand, refData), displayOnly: false };
  const vendored = refData.witchPatrons?.[tag];
  return vendored ? vendoredPatronToDef(vendored, refData) : undefined;
}

/** The full picker-browsable catalog: every vendored patron, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedWitchPatronCatalog(refData: RefData): MergedWitchPatronEntry[] {
  const handByNormName = new Map<string, WitchPatronDef>();
  for (const p of PATRON_LIST) {
    handByNormName.set(normalizePatronName(WITCH_PATRON_NAME_ALIASES[p.tag] ?? p.name), p);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedWitchPatronEntry[] = [];
  for (const v of Object.values(refData.witchPatrons ?? {})) {
    const handMatch = handByNormName.get(normalizePatronName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...withResolvedSpellNames(handMatch, refData),
        category: v.category,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredPatronToDef(v, refData));
    }
  }
  for (const p of PATRON_LIST) {
    if (!usedHandTags.has(p.tag))
      merged.push({ ...withResolvedSpellNames(p, refData), displayOnly: false });
  }
  return merged;
}

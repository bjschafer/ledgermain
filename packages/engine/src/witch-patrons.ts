/**
 * Clean-room PF1 witch patron table (Advanced Player's Guide + Ultimate
 * Magic, issue #65): hand-authored from the published rules (verified
 * against aonprd.com's Witch Patrons index — each entry below cites its
 * source book), mirroring `oracle-mysteries.ts`'s posture for oracle
 * mysteries — a patron's ONLY structured mechanical content is its bonus
 * spell list (one spell added to the familiar's known spells at witch level
 * 2, 4, 6, ..., 18, per APG's Patron Spells class feature); everything else
 * about a patron (its narrative theme) is flavor text, not modeled.
 *
 * Data provenance — UNLIKE `oracle-mysteries.ts`'s `bonusSpells`, which
 * copies real vendored Foundry spell `_id`s straight out of the mystery's
 * `@UUID[...]` prose references, a witch patron's bonus-spell list is NOT
 * embedded anywhere in the vendored Foundry data pack at all (the Witch
 * class def only links the generic "Patron Spells" stub `ClassFeature`, no
 * per-patron breakdown — confirmed: `class-features.json` carries no
 * per-patron entries). So `bonusSpells` here carries only a spell NAME (no
 * `id`) — `model/spellcasting.patronSpellsKnown` (apps/web) resolves each
 * name against `RefData.spells` at runtime by exact case-insensitive name
 * match, degrading gracefully to a name-only display entry when the
 * vendored spell slice doesn't carry that spell (a few of the higher-level
 * patron spells, e.g. "Giant Form II", are outside the pipeline's current
 * slice) — same "unresolvable id/name is tolerated, never thrown" posture
 * `oracle-mysteries.ts`'s own bonusSpells resolution and
 * `resolveGrantsBuffs` (resources.ts) already use.
 *
 * Scope: the 15 Advanced Player's Guide / Ultimate Magic "core" patrons with
 * a verifiable, source-cited, complete 9-spell progression: Agility,
 * Animals, Deception, Elements, Endurance, Healing (UM), Light (UM), Moon
 * (UM), Plague, Strength, Transformation, Trickery, Water, Wisdom, Shadow
 * — plus Time and Ultimate Magic's Vengeance (17 total). Explicitly OUT OF
 * SCOPE: "Protection" (a real patron, but from Heroes of the High Court, a
 * later splatbook — not APG/UM); "Wards" and "Portals" (not real PF1 witch
 * patrons at all — checked against AoN's full 52-patron index, no such
 * entries exist in any PF1 sourcebook; likely a mix-up with another game's
 * patron themes). Later-splatbook patrons beyond these 17 are deferred,
 * same posture as `oracle-mysteries.ts`'s "10 APG core mysteries only" scope
 * note.
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
      "Greater Globe of Invulnerability",
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
 * Issue #74 Phase 3c: `RefData.witchPatrons` is the FULL published catalog
 * (61 entries after junk filtering), prose only — same "catalog from data,
 * mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified 17-core-patron table above
 * stays authoritative for the bonus-spell progression; this section merges
 * the two for browsing.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 17 hand-authored
 * patrons): all 17 matched a vendored entry by normalized name (the
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

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedWitchPatronEntry extends WitchPatronDef {
  /** Vendored "basic"/"unique" grouping, when present. */
  category?: "basic" | "unique";
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only patron with no hand-authored bonus-spell progression — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredPatronToDef(entry: WitchPatron): MergedWitchPatronEntry {
  return {
    tag: entry.id,
    name: entry.name,
    bonusSpells: [],
    category: entry.category,
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked patron tag (`doc.build.witchPatron`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveWitchPatron(
  tag: string,
  refData: RefData,
): MergedWitchPatronEntry | undefined {
  const hand = WITCH_PATRONS[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = refData.witchPatrons?.[tag];
  return vendored ? vendoredPatronToDef(vendored) : undefined;
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
        ...handMatch,
        category: v.category,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredPatronToDef(v));
    }
  }
  for (const p of PATRON_LIST) {
    if (!usedHandTags.has(p.tag)) merged.push({ ...p, displayOnly: false });
  }
  return merged;
}

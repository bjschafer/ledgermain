/**
 * Hand-authored PF1 language vocabulary and per-race bonus-language options,
 * clean-room from the Core Rulebook "Languages" table and the Advanced Race
 * Guide / featured-race "Languages" entries (via the d20pfsrd SRD mirror).
 * Covers Common, the widespread racial tongues, the standard exotic/planar
 * set, and the named Golarion regional and ancient human languages.
 *
 * This is a vocabulary for the bonus-language picker, not a cap: a player
 * may still type any language not listed here (`model/languages.ts`
 * `setBonusLanguages` stays unvalidated free text).
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

export type LanguageCategory = "common" | "racial" | "exotic";

export interface LanguageEntry {
  /** Lowercase id. Matches the vendored `Race.languages` id where one exists (e.g. `"elven"`). */
  id: string;
  name: string;
  category: LanguageCategory;
  /** True for a language no character may take as a bonus-language pick (e.g. Druidic). */
  secret?: boolean;
  /** Short "typically spoken by" note shown in the picker. */
  spokenBy?: string;
}

export const LANGUAGE_CATALOG: readonly LanguageEntry[] = [
  {
    id: "common",
    name: "Common",
    category: "common",
    spokenBy: "Traders and most civilized folk of the Inner Sea region.",
  },

  {
    id: "draconic",
    name: "Draconic",
    category: "racial",
    spokenBy: "Dragons, kobolds, and reptilian humanoids; also the tongue of old magical texts.",
  },
  { id: "dwarven", name: "Dwarven", category: "racial", spokenBy: "Dwarves." },
  { id: "elven", name: "Elven", category: "racial", spokenBy: "Elves and half-elves." },
  { id: "giant", name: "Giant", category: "racial", spokenBy: "Ogres, giants, and trolls." },
  { id: "gnoll", name: "Gnoll", category: "racial", spokenBy: "Gnolls." },
  { id: "gnome", name: "Gnome", category: "racial", spokenBy: "Gnomes." },
  {
    id: "goblin",
    name: "Goblin",
    category: "racial",
    spokenBy: "Goblins, hobgoblins, and bugbears.",
  },
  { id: "halfling", name: "Halfling", category: "racial", spokenBy: "Halflings." },
  { id: "orc", name: "Orc", category: "racial", spokenBy: "Orcs and half-orcs." },
  { id: "sylvan", name: "Sylvan", category: "racial", spokenBy: "Fey creatures." },

  {
    id: "abyssal",
    name: "Abyssal",
    category: "exotic",
    spokenBy: "Demons and other chaotic evil outsiders.",
  },
  {
    id: "aklo",
    name: "Aklo",
    category: "exotic",
    spokenBy: "Aberrations and degenerate humanoids; considered sinister to speak.",
  },
  {
    id: "aquan",
    name: "Aquan",
    category: "exotic",
    spokenBy: "Creatures of the elemental Plane of Water.",
  },
  {
    id: "auran",
    name: "Auran",
    category: "exotic",
    spokenBy: "Creatures of the elemental Plane of Air.",
  },
  {
    id: "celestial",
    name: "Celestial",
    category: "exotic",
    spokenBy: "Angels and other good-aligned outsiders.",
  },
  {
    id: "druidic",
    name: "Druidic",
    category: "exotic",
    secret: true,
    spokenBy: "Druids only; never taught to outsiders.",
  },
  {
    id: "ignan",
    name: "Ignan",
    category: "exotic",
    spokenBy: "Creatures of the elemental Plane of Fire.",
  },
  {
    id: "infernal",
    name: "Infernal",
    category: "exotic",
    spokenBy: "Devils and other lawful evil outsiders.",
  },
  {
    id: "terran",
    name: "Terran",
    category: "exotic",
    spokenBy: "Creatures of the elemental Plane of Earth.",
  },
  {
    id: "undercommon",
    name: "Undercommon",
    category: "exotic",
    spokenBy: "Drow, duergar, and other denizens of the Darklands.",
  },
  {
    id: "necril",
    name: "Necril",
    category: "exotic",
    spokenBy: "Ghouls and other undead who retain the power of speech.",
  },
  {
    id: "drowsign",
    name: "Drow Sign Language",
    category: "exotic",
    spokenBy: "A silent, gestural code used by drow.",
  },

  {
    id: "thassilonian",
    name: "Thassilonian",
    category: "exotic",
    spokenBy: "A dead language of ancient Thassilon, still studied by scholars and rune-casters.",
  },
  {
    id: "varisian",
    name: "Varisian",
    category: "exotic",
    spokenBy: "The Varisian people and their wandering caravans.",
  },
  {
    id: "osiriani",
    name: "Osiriani",
    category: "exotic",
    spokenBy: "The most widespread human language of southern Garund.",
  },
  {
    id: "polyglot",
    name: "Polyglot",
    category: "exotic",
    spokenBy: "A family of related dialects spoken by the tribes of the Mwangi Expanse.",
  },
  {
    id: "shadowtongue",
    name: "Shadowtongue",
    category: "exotic",
    spokenBy: "Natives of the Shadow Plane and those who linger there.",
  },
  {
    id: "tien",
    name: "Tien",
    category: "exotic",
    spokenBy: "The Tian Xia peoples of the Successor States.",
  },
  {
    id: "vudrani",
    name: "Vudrani",
    category: "exotic",
    spokenBy: "The Vudrani people of distant Vudra.",
  },
  {
    id: "kelish",
    name: "Kelish",
    category: "exotic",
    spokenBy: "The Kelish people of the Padishah Empire of Kelesh.",
  },
  {
    id: "skald",
    name: "Skald",
    category: "exotic",
    spokenBy: "The Ulfen people of the Lands of the Linnorm Kings.",
  },
  {
    id: "hallit",
    name: "Hallit",
    category: "exotic",
    spokenBy: "The Kellid people of the Realm of the Mammoth Lords.",
  },
];

const CATALOG_BY_ID = new Map(LANGUAGE_CATALOG.map((entry) => [entry.id, entry]));

/** Catalog entry for a language id (case-insensitive), or `undefined` if not cataloged. */
export function catalogLanguage(id: string): LanguageEntry | undefined {
  return CATALOG_BY_ID.get(id.toLowerCase());
}

/**
 * A race's bonus-language options: a fixed catalog-id list for a race with a
 * published closed list (e.g. Dwarf), or `"any"` for a race whose players may
 * choose any non-secret language (Human, Half-Elf — the CRB "high
 * Intelligence" clause). Keyed by race *name* rather than the vendored
 * Foundry id, matching the convention in `racialTraits.ts`/`@pf1/engine`
 * `racial-traits.ts`: the hand-authored table survives a refdata bump even if
 * a race's hash id changes, since the name doesn't.
 *
 * A race with no entry here defaults to `"any"` too (never an empty picker).
 */
export type RaceBonusLanguages = readonly string[] | "any";

const RACE_BONUS_LANGUAGES: Readonly<Record<string, RaceBonusLanguages>> = {
  Dwarf: ["giant", "gnome", "goblin", "orc", "terran", "undercommon"],
  Elf: ["celestial", "draconic", "gnoll", "gnome", "goblin", "orc", "sylvan"],
  Gnome: ["draconic", "dwarven", "elven", "giant", "goblin", "orc"],
  Halfling: ["dwarven", "elven", "gnome", "goblin"],
  "Half-Elf": "any",
  // Verified against two SRD sources: unlike Human/Half-Elf, Half-Orc's
  // bonus languages are a fixed CRB list, not an open "any" choice.
  "Half-Orc": ["abyssal", "draconic", "giant", "gnoll", "goblin"],
  Human: "any",

  Aasimar: ["draconic", "dwarven", "elven", "gnome", "halfling", "sylvan"],
  Catfolk: ["elven", "gnoll", "gnome", "goblin", "halfling", "orc", "sylvan"],
  Drow: ["abyssal", "aklo", "aquan", "common", "draconic", "drowsign", "gnome", "goblin"],
  Kobold: ["common", "dwarven", "gnome", "undercommon"],
  Orc: ["dwarven", "giant", "gnoll", "goblin", "undercommon"],
  Ratfolk: [
    "aklo",
    "draconic",
    "dwarven",
    "gnoll",
    "gnome",
    "goblin",
    "halfling",
    "orc",
    "undercommon",
  ],
  Tiefling: [
    "abyssal",
    "draconic",
    "dwarven",
    "elven",
    "gnome",
    "goblin",
    "halfling",
    "infernal",
    "orc",
  ],
};

/** The character's race's bonus-language options (by name lookup through `refData`). */
export function bonusLanguageOptionsForRace(
  doc: CharacterDoc,
  refData: RefData,
): RaceBonusLanguages {
  const raceName = refData.races[doc.identity.race]?.name;
  if (!raceName) return "any";
  return RACE_BONUS_LANGUAGES[raceName] ?? "any";
}

/**
 * Hand-authored Summon Monster I-IX and Summon Nature's Ally I-IX creature
 * lists, Core Rulebook only (no splatbook additions), mapped to the vendored
 * bestiary in `packages/data-pipeline/data/monsters.json`. Source: the PRPG
 * Core Rulebook's "Table: Summon Monster" (pg. 350) and "Table: Summon
 * Nature's Ally" (pg. 351), cross-checked against both the current and the
 * legacy Archives of Nethys reproductions of those tables.
 *
 * Count rule (Summon Monster III, functionally identical for Summon Nature's
 * Ally at every level once the wording is adjusted for the spell name):
 * "This spell functions like summon monster I, except that you can summon
 * one creature from the 3rd-level list, 1d3 creatures of the same kind from
 * the 2nd-level list, or 1d4+1 creatures of the same kind from the
 * 1st-level list." From 4th level up the low end generalizes to "a
 * lower-level list" (since more than one qualifies), e.g. Summon Monster IV:
 * "...one creature from the 4th-level list, 1d3 creatures of the same kind
 * from the 3rd-level list, or 1d4+1 creatures of the same kind from a
 * lower-level list."
 *
 * Asterisk rule (Summon Monster only; printed as the table's footnote):
 * "This creature is summoned with the celestial template if you are good,
 * or the fiendish template if you are evil; you may choose either if you
 * are neutral." Summon Nature's Ally carries no asterisk/template column.
 *
 * ID MAPPING NOTES (judgment calls, all cross-checked against the printed
 * creature name and the linked bestiary page on the source tables):
 * - "Elemental (Small/Medium/Large/Huge/greater/elder)" and "Mephit (any)"
 *   let the caster pick air/earth/fire/water (or, for mephits, any of the
 *   several elemental mephit types) at the time of casting. The corpus has
 *   no generic "elemental" statblock (only per-element, per-size entries),
 *   so every "Elemental (Size)" row keeps its printed label and carries the
 *   four core elements as cast-time `variants`. The corpus DOES carry a
 *   single generic "mephit" entry (Bestiary pg. 202, "effect based on type"
 *   breath weapon) which is an exact match for "Mephit (any)".
 * - "Ant, giant (worker/soldier/drone)": the corpus's single `ant_giant_ant`
 *   statblock is explicitly the soldier-caste stat line ("The statistics
 *   given above are for soldier ants"; the entry's own description carries
 *   the worker and drone variants as simple templates), so all three caste
 *   rows map to it, with a note on the worker and drone rows.
 * - "Bebelith" (Summon Monster VII) is printed that way on both the current
 *   and legacy Archives of Nethys tables, but the corpus's (and the Bestiary
 *   index's) spelling is "Bebilith". The label keeps the table's printed
 *   spelling; `monsterId` points at the real statblock.
 * - "Ape" maps to the corpus's `ape_gorilla` ("Gorilla (Ape)", Bestiary pg.
 *   17): the description text ("An adult male ape is 8 feet tall...")
 *   confirms it's the Bestiary's "Ape" entry under a different display name.
 * - "Mastodon (elephant)" is spelled that way on Summon Monster VII's own
 *   table; the same creature is spelled "Mastadon (elephant)" on Summon
 *   Nature's Ally VII's own table (both from the legacy PRD reproduction).
 *   Each spell's list keeps its own table's printed spelling rather than
 *   silently normalizing across spells.
 */

export interface SummonVariant {
  label: string;
  /** Key into packages/data-pipeline/data/monsters.json. */
  monsterId: string;
}

export interface SummonListEntry {
  /** Printed creature name from the table, e.g. "Dire rat". */
  label: string;
  /** Key into packages/data-pipeline/data/monsters.json, or null when the printed row is a cast-time choice (see `variants`). */
  monsterId: string | null;
  /** Summon Monster asterisk: summoned with the celestial or fiendish (or entropic/resolute) template. */
  templated?: boolean;
  /** Printed qualifier worth keeping, e.g. alignment/plane notes from the table. */
  note?: string;
  /** Cast-time choice within one printed row: an "Elemental (Small)" casting picks one element. */
  variants?: readonly SummonVariant[];
}

/**
 * The corpus's per-element elemental keys are mechanical:
 * `<element>_elemental--<tier>_<element>_elemental` for all four core
 * elements at all six tiers (Small/Medium/Large/Huge/greater/elder).
 */
function elementalVariants(
  tier: "small" | "medium" | "large" | "huge" | "greater" | "elder",
): readonly SummonVariant[] {
  return (["air", "earth", "fire", "water"] as const).map((element) => ({
    label: `${element.charAt(0).toUpperCase()}${element.slice(1)} elemental`,
    monsterId: `${element}_elemental--${tier}_${element}_elemental`,
  }));
}

export type SummonSpell = "sm" | "sna";

export const SUMMON_LISTS: Record<SummonSpell, Record<number, readonly SummonListEntry[]>> = {
  sm: {
    // Summon Monster I, Table: Summon Monster, 1st Level: 8 rows.
    1: [
      { label: "Dire rat*", monsterId: "rat_dire_rat", templated: true },
      { label: "Dog*", monsterId: "dog", templated: true },
      { label: "Dolphin*", monsterId: "dolphin", templated: true },
      { label: "Eagle*", monsterId: "eagle", templated: true },
      { label: "Fire beetle*", monsterId: "beetle_fire_beetle", templated: true },
      { label: "Poisonous frog*", monsterId: "frog_poison_frog", templated: true },
      { label: "Pony (horse)*", monsterId: "horse_pony", templated: true },
      { label: "Viper (snake)*", monsterId: "familiar_viper", templated: true },
    ],
    // Summon Monster II, Table: Summon Monster, 2nd Level: 12 rows.
    2: [
      {
        label: "Ant, giant (worker)*",
        monsterId: "ant_giant_ant",
        templated: true,
        note: "Statblock is the soldier caste; the entry description covers the worker and drone variants.",
      },
      {
        label: "Elemental (Small)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("small"),
      },
      { label: "Giant centipede*", monsterId: "centipede_giant_centipede", templated: true },
      { label: "Giant frog*", monsterId: "frog_giant_frog", templated: true },
      { label: "Giant spider*", monsterId: "spider_giant_spider", templated: true },
      { label: "Goblin dog*", monsterId: "goblin_dog", templated: true },
      { label: "Horse*", monsterId: "horse", templated: true },
      { label: "Hyena*", monsterId: "hyena", templated: true },
      { label: "Lemure (devil)", monsterId: "devil_lemure", note: "Evil, Lawful" },
      { label: "Octopus*", monsterId: "octopus", templated: true },
      { label: "Squid*", monsterId: "squid", templated: true },
      { label: "Wolf*", monsterId: "wolf", templated: true },
    ],
    // Summon Monster III, Table: Summon Monster, 3rd Level: 15 rows.
    3: [
      { label: "Ant, giant (soldier)*", monsterId: "ant_giant_ant", templated: true },
      { label: "Ape*", monsterId: "ape_gorilla", templated: true },
      { label: "Aurochs (herd animal)*", monsterId: "herd_animal_aurochs", templated: true },
      { label: "Boar*", monsterId: "boar", templated: true },
      { label: "Cheetah*", monsterId: "cat_cheetah", templated: true },
      { label: "Constrictor snake*", monsterId: "snake_constrictor_snake", templated: true },
      { label: "Crocodile*", monsterId: "crocodile", templated: true },
      { label: "Dire bat*", monsterId: "bat_dire_bat", templated: true },
      { label: "Dretch (demon)", monsterId: "demon_dretch", note: "Chaotic, Evil" },
      { label: "Electric eel*", monsterId: "eel_electric_eel", templated: true },
      { label: "Lantern archon", monsterId: "archon_lantern_archon", note: "Good, Lawful" },
      { label: "Leopard (cat)*", monsterId: "cat_leopard", templated: true },
      { label: "Monitor lizard*", monsterId: "lizard_monitor_lizard", templated: true },
      { label: "Shark*", monsterId: "shark", templated: true },
      { label: "Wolverine*", monsterId: "wolverine", templated: true },
    ],
    // Summon Monster IV, Table: Summon Monster, 4th Level: 16 rows.
    4: [
      {
        label: "Ant, giant (drone)*",
        monsterId: "ant_giant_ant",
        templated: true,
        note: "Statblock is the soldier caste; the entry description covers the worker and drone variants.",
      },
      { label: "Bison (herd animal)*", monsterId: "herd_animal_bison", templated: true },
      { label: "Deinonychus (dinosaur)*", monsterId: "dinosaur_deinonychus", templated: true },
      { label: "Dire ape*", monsterId: "ape_dire_ape_gigantopithecus", templated: true },
      { label: "Dire boar*", monsterId: "boar_dire_boar_daeodon", templated: true },
      { label: "Dire wolf*", monsterId: "wolf_dire_wolf", templated: true },
      {
        label: "Elemental (Medium)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("medium"),
      },
      { label: "Giant scorpion*", monsterId: "scorpion_giant_scorpion", templated: true },
      { label: "Giant wasp*", monsterId: "wasp_giant_wasp", templated: true },
      { label: "Grizzly bear*", monsterId: "bear_grizzly_bear", templated: true },
      { label: "Hell hound", monsterId: "hell_hound", note: "Evil, Lawful" },
      { label: "Hound archon", monsterId: "archon_hound_archon", note: "Good, Lawful" },
      { label: "Lion*", monsterId: "lion", templated: true },
      { label: "Mephit (any)", monsterId: "mephit", note: "Elemental" },
      { label: "Pteranodon (dinosaur)*", monsterId: "dinosaur_pteranodon", templated: true },
      { label: "Rhinoceros*", monsterId: "rhinoceros", templated: true },
    ],
    // Summon Monster V, Table: Summon Monster, 5th Level: 12 rows.
    5: [
      { label: "Ankylosaurus (dinosaur)*", monsterId: "dinosaur_ankylosaurus", templated: true },
      { label: "Babau (demon)", monsterId: "demon_babau", note: "Chaotic, Evil" },
      { label: "Bearded devil", monsterId: "devil_bearded_devil_barbazu", note: "Evil, Lawful" },
      { label: "Bralani azata", monsterId: "azata_bralani", note: "Chaotic, Good" },
      { label: "Dire lion*", monsterId: "lion_dire_lion_spotted_lion", templated: true },
      {
        label: "Elemental (Large)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("large"),
      },
      { label: "Giant moray eel*", monsterId: "eel_giant_moray_eel", templated: true },
      { label: "Kyton", monsterId: "kyton", note: "Evil, Lawful" },
      { label: "Orca (dolphin)*", monsterId: "dolphin_orca", templated: true },
      { label: "Salamander", monsterId: "salamander", note: "Evil" },
      { label: "Woolly rhinoceros*", monsterId: "rhinoceros_woolly_rhinoceros", templated: true },
      { label: "Xill", monsterId: "xill", note: "Evil, Lawful" },
    ],
    // Summon Monster VI, Table: Summon Monster, 6th Level: 12 rows.
    6: [
      { label: "Dire bear*", monsterId: "bear_dire_bear_cave_bear", templated: true },
      { label: "Dire tiger*", monsterId: "tiger_dire_tiger_smilodon", templated: true },
      { label: "Elasmosaurus (dinosaur)*", monsterId: "dinosaur_elasmosaurus", templated: true },
      {
        label: "Elemental (Huge)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("huge"),
      },
      { label: "Elephant*", monsterId: "elephant", templated: true },
      { label: "Erinyes (devil)", monsterId: "devil_erinyes", note: "Evil, Lawful" },
      { label: "Giant octopus*", monsterId: "octopus_giant_octopus", templated: true },
      { label: "Invisible stalker", monsterId: "invisible_stalker", note: "Air" },
      { label: "Lillend azata", monsterId: "azata_lillend", note: "Chaotic, Good" },
      { label: "Shadow demon", monsterId: "demon_shadow_demon", note: "Chaotic, Evil" },
      { label: "Succubus (demon)", monsterId: "demon_succubus", note: "Chaotic, Evil" },
      { label: "Triceratops (dinosaur)*", monsterId: "dinosaur_triceratops", templated: true },
    ],
    // Summon Monster VII, Table: Summon Monster, 7th Level: 11 rows.
    7: [
      { label: "Bebelith", monsterId: "bebilith", note: "Chaotic, Evil" },
      { label: "Bone devil", monsterId: "devil_bone_devil_osyluth", note: "Evil, Lawful" },
      { label: "Brachiosaurus (dinosaur)*", monsterId: "dinosaur_brachiosaurus", templated: true },
      { label: "Dire crocodile*", monsterId: "crocodile_dire_crocodile", templated: true },
      { label: "Dire shark*", monsterId: "shark_dire_shark_megalodon", templated: true },
      {
        label: "Elemental (greater)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("greater"),
      },
      { label: "Giant squid*", monsterId: "squid_giant_squid", templated: true },
      { label: "Mastodon (elephant)*", monsterId: "elephant_mastodon", templated: true },
      { label: "Roc*", monsterId: "roc", templated: true },
      { label: "Tyrannosaurus (dinosaur)*", monsterId: "dinosaur_tyrannosaurus", templated: true },
      { label: "Vrock (demon)", monsterId: "demon_vrock", note: "Chaotic, Evil" },
    ],
    // Summon Monster VIII, Table: Summon Monster, 8th Level: 3 rows.
    8: [
      { label: "Barbed devil", monsterId: "devil_barbed_devil_hamatula", note: "Evil, Lawful" },
      {
        label: "Elemental (elder)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("elder"),
      },
      { label: "Hezrou (demon)", monsterId: "demon_hezrou", note: "Chaotic, Evil" },
    ],
    // Summon Monster IX, Table: Summon Monster, 9th Level: 6 rows.
    9: [
      { label: "Astral Deva (angel)", monsterId: "angel_astral_deva", note: "Good" },
      { label: "Ghaele azata", monsterId: "azata_ghaele", note: "Chaotic, Good" },
      { label: "Glabrezu (demon)", monsterId: "demon_glabrezu", note: "Chaotic, Evil" },
      { label: "Ice devil", monsterId: "devil_ice_devil_gelugon", note: "Evil, Lawful" },
      { label: "Nalfeshnee (demon)", monsterId: "demon_nalfeshnee", note: "Chaotic, Evil" },
      { label: "Trumpet archon", monsterId: "archon_trumpet_archon", note: "Good, Lawful" },
    ],
  },
  sna: {
    // Summon Nature's Ally I, Table: Summon Nature's Ally, 1st Level: 11 rows.
    1: [
      { label: "Dire rat", monsterId: "rat_dire_rat" },
      { label: "Dog", monsterId: "dog" },
      { label: "Dolphin", monsterId: "dolphin" },
      { label: "Eagle", monsterId: "eagle" },
      { label: "Giant centipede", monsterId: "centipede_giant_centipede" },
      { label: "Fire beetle", monsterId: "beetle_fire_beetle" },
      { label: "Mite (gremlin)", monsterId: "mite" },
      { label: "Poisonous frog", monsterId: "frog_poison_frog" },
      { label: "Pony (horse)", monsterId: "horse_pony" },
      { label: "Stirge", monsterId: "stirge" },
      { label: "Viper (snake)", monsterId: "familiar_viper" },
    ],
    // Summon Nature's Ally II, Table: Summon Nature's Ally, 2nd Level: 10 rows.
    2: [
      {
        label: "Ant, giant (worker)",
        monsterId: "ant_giant_ant",
        note: "Statblock is the soldier caste; the entry description covers the worker and drone variants.",
      },
      {
        label: "Elemental (Small)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("small"),
      },
      { label: "Giant frog", monsterId: "frog_giant_frog" },
      { label: "Giant spider", monsterId: "spider_giant_spider" },
      { label: "Goblin Dog", monsterId: "goblin_dog" },
      { label: "Horse", monsterId: "horse" },
      { label: "Hyena", monsterId: "hyena" },
      { label: "Octopus", monsterId: "octopus" },
      { label: "Squid", monsterId: "squid" },
      { label: "Wolf", monsterId: "wolf" },
    ],
    // Summon Nature's Ally III, Table: Summon Nature's Ally, 3rd Level: 14 rows.
    3: [
      { label: "Ant, giant (soldier)", monsterId: "ant_giant_ant" },
      { label: "Ape", monsterId: "ape_gorilla" },
      { label: "Aurochs (herd animal)", monsterId: "herd_animal_aurochs" },
      { label: "Boar", monsterId: "boar" },
      { label: "Cheetah", monsterId: "cat_cheetah" },
      { label: "Constrictor snake", monsterId: "snake_constrictor_snake" },
      { label: "Crocodile", monsterId: "crocodile" },
      { label: "Dire bat", monsterId: "bat_dire_bat" },
      { label: "Electric Eel", monsterId: "eel_electric_eel" },
      { label: "Giant crab", monsterId: "crab_giant_crab" },
      { label: "Leopard (cat)", monsterId: "cat_leopard" },
      { label: "Monitor lizard", monsterId: "lizard_monitor_lizard" },
      { label: "Shark", monsterId: "shark" },
      { label: "Wolverine", monsterId: "wolverine" },
    ],
    // Summon Nature's Ally IV, Table: Summon Nature's Ally, 4th Level: 19 rows.
    4: [
      {
        label: "Ant, giant (drone)",
        monsterId: "ant_giant_ant",
        note: "Statblock is the soldier caste; the entry description covers the worker and drone variants.",
      },
      { label: "Bison (herd animal)", monsterId: "herd_animal_bison" },
      { label: "Deinonychus (dinosaur)", monsterId: "dinosaur_deinonychus" },
      { label: "Dire ape", monsterId: "ape_dire_ape_gigantopithecus" },
      { label: "Dire boar", monsterId: "boar_dire_boar_daeodon" },
      { label: "Dire wolf", monsterId: "wolf_dire_wolf" },
      {
        label: "Elemental (Medium)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("medium"),
      },
      { label: "Giant scorpion", monsterId: "scorpion_giant_scorpion" },
      { label: "Giant stag beetle", monsterId: "beetle_giant_stag_beetle" },
      { label: "Giant wasp", monsterId: "wasp_giant_wasp" },
      { label: "Griffon", monsterId: "griffon" },
      { label: "Grizzly bear", monsterId: "bear_grizzly_bear" },
      { label: "Lion", monsterId: "lion" },
      { label: "Mephit (any)", monsterId: "mephit", note: "Elemental" },
      { label: "Owlbear", monsterId: "owlbear" },
      { label: "Pteranodon (dinosaur)", monsterId: "dinosaur_pteranodon" },
      { label: "Rhinoceros", monsterId: "rhinoceros" },
      { label: "Satyr", monsterId: "satyr" },
      { label: "Tiger", monsterId: "tiger" },
    ],
    // Summon Nature's Ally V, Table: Summon Nature's Ally, 5th Level: 10 rows.
    5: [
      { label: "Ankylosaurus (dinosaur)", monsterId: "dinosaur_ankylosaurus" },
      { label: "Cyclops", monsterId: "cyclops" },
      { label: "Dire lion", monsterId: "lion_dire_lion_spotted_lion" },
      { label: "Dolphin (orca)", monsterId: "dolphin_orca" },
      {
        label: "Elemental (Large)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("large"),
      },
      { label: "Ettin", monsterId: "ettin" },
      { label: "Giant moray eel", monsterId: "eel_giant_moray_eel" },
      { label: "Girallon", monsterId: "girallon" },
      { label: "Manticore", monsterId: "manticore" },
      { label: "Woolly rhinoceros", monsterId: "rhinoceros_woolly_rhinoceros" },
    ],
    // Summon Nature's Ally VI, Table: Summon Nature's Ally, 6th Level: 11 rows.
    6: [
      { label: "Bulette", monsterId: "bulette" },
      { label: "Dire bear", monsterId: "bear_dire_bear_cave_bear" },
      { label: "Dire tiger", monsterId: "tiger_dire_tiger_smilodon" },
      { label: "Elasmosaurus (dinosaur)", monsterId: "dinosaur_elasmosaurus" },
      {
        label: "Elemental (Huge)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("huge"),
      },
      { label: "Elephant", monsterId: "elephant" },
      { label: "Giant octopus", monsterId: "octopus_giant_octopus" },
      { label: "Hill giant", monsterId: "giant_hill_giant" },
      { label: "Stegosaurus (dinosaur)", monsterId: "dinosaur_stegosaurus" },
      { label: "Stone giant", monsterId: "giant_stone_giant", note: "Earth" },
      { label: "Triceratops (dinosaur)", monsterId: "dinosaur_triceratops" },
    ],
    // Summon Nature's Ally VII, Table: Summon Nature's Ally, 7th Level: 10 rows.
    7: [
      { label: "Brachiosaurus (dinosaur)", monsterId: "dinosaur_brachiosaurus" },
      { label: "Dire crocodile", monsterId: "crocodile_dire_crocodile" },
      { label: "Dire shark", monsterId: "shark_dire_shark_megalodon" },
      {
        label: "Elemental (greater)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("greater"),
      },
      { label: "Fire giant", monsterId: "giant_fire_fire_giant", note: "Fire" },
      { label: "Frost giant", monsterId: "giant_frost_frost_giant", note: "Cold" },
      { label: "Giant squid", monsterId: "squid_giant_squid" },
      { label: "Mastadon (elephant)", monsterId: "elephant_mastodon" },
      { label: "Roc", monsterId: "roc" },
      { label: "Tyrannosaurus (dinosaur)", monsterId: "dinosaur_tyrannosaurus" },
    ],
    // Summon Nature's Ally VIII, Table: Summon Nature's Ally, 8th Level: 3 rows.
    8: [
      { label: "Cloud giant", monsterId: "giant_cloud_giant", note: "Air" },
      {
        label: "Elemental (elder)",
        monsterId: null,
        note: "Elemental",
        variants: elementalVariants("elder"),
      },
      { label: "Purple worm", monsterId: "purple_worm" },
    ],
    // Summon Nature's Ally IX, Table: Summon Nature's Ally, 9th Level: 2 rows.
    9: [
      { label: "Pixie (w/irresistible dance and sleep arrows)", monsterId: "pixie" },
      { label: "Storm giant", monsterId: "giant_storm_giant" },
    ],
  },
};

export const SUMMON_SPELL_LABEL: Record<SummonSpell, string> = {
  sm: "Summon Monster",
  sna: "Summon Nature's Ally",
};

/** How many creatures a casting yields, by how far below the spell's level the chosen list is. */
export const SUMMON_COUNTS = { sameLevel: "1", oneLower: "1d3", twoOrMoreLower: "1d4+1" } as const;

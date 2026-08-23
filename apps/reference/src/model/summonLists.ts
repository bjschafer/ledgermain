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
  /** The row is printed with this template already on it ("Celestial dog", "Young frost giant"); the helper applies it, no picker. */
  template?: "celestial" | "fiendish" | "young";
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

/**
 * Alternate creature lists drawn from IN ADDITION to the standard table.
 *
 * Three are alignment-gated feats for Summon Monster: Summon Good Monster
 * (Pathfinder Player Companion: Champions of Purity, pg. 33), Summon Neutral
 * Monster (Champions of Balance, pg. 33), Summon Evil Monster (Champions of
 * Corruption, pg. 33). Each feat's table is reproduced from the Archives of
 * Nethys FeatDisplay page for that feat; labels keep the printed creature
 * name and alignment, superscript source markers dropped.
 *
 * Two are the Adventure Path "alternative summoning options": creatures
 * individual Paizo Adventure Paths opened up to summoners of a particular
 * god, cult, or region (snakes for a serpent-god's clerics, Irrisen's
 * giants, and so on), compiled per level for Summon Monster and Summon
 * Nature's Ally on the OGL d20pfsrd spell pages with the AP number as the
 * source. They are campaign options, not core, so they sit behind one
 * "Alternative Summoning Options" toggle rather than a feat; each row carries
 * its AP number as the note. Rows the compilation marks with an asterisk
 * take the Summon Monster alignment template; rows it marks "young" get the
 * Young template applied (its own reading of the AP text, flagged as such).
 *
 * Rows printed as "Celestial X" / "Fiendish X" map to the base creature with
 * `template` set, since the bestiary has no separate statblock for them. A
 * row whose creature the vendored bestiary lacks keeps its printed label with
 * a null id and a note; the helper renders it inert rather than guessing at a
 * stand-in.
 *
 * Per-list riders (Diehard for the good list, the Will bonus for the neutral
 * list, the standard-action casting note for the evil list) live with the
 * adjust module and the summon page; this file is only the tables.
 */

export type SummonAltList = "good" | "neutral" | "evil" | "ap-sm" | "ap-sna";

export interface SummonAltListDef {
  /** Feat name (or "Alternative Summoning Options"), as the section heading. */
  label: string;
  /** Which spell's table this extends. */
  spell: SummonSpell;
  /** Toggle slug in the URL's feats list: the sheet's featNameSlug of the feat name, or the AP toggle. */
  toggleSlug: string;
  source: string;
  /** Levels with no alternatives are simply absent. */
  levels: Record<number, readonly SummonListEntry[]>;
}

const NOT_IN_BESTIARY = "Not in the bestiary data; use the printed statblock.";

/** One toggle covers both spells' Adventure Path lists: it is a campaign-level switch, not a feat. */
export const AP_ALTERNATIVES_SLUG = "ap-alternatives";

const EXTRAPLANAR = "Gains the extraplanar subtype; otherwise as printed.";

function ap(n: number, extra?: string): string {
  return extra ? `Adventure Path #${n}. ${extra}` : `Adventure Path #${n}`;
}

export const SUMMON_ALT_LISTS: Record<SummonAltList, SummonAltListDef> = {
  good: {
    label: "Summon Good Monster",
    spell: "sm",
    toggleSlug: "summon-good-monster",
    source: "Champions of Purity pg. 33",
    levels: {
      // 1st Level: 6 rows.
      1: [
        { label: "Celestial dog (NG)", monsterId: "dog", template: "celestial" },
        { label: "Celestial dolphin (NG)", monsterId: "dolphin", template: "celestial" },
        { label: "Celestial eagle (NG)", monsterId: "eagle", template: "celestial" },
        {
          label: "Celestial fire beetle (NG)",
          monsterId: "beetle_fire_beetle",
          template: "celestial",
        },
        { label: "Celestial pony (NG)", monsterId: "horse_pony", template: "celestial" },
        { label: "Celestial viper (NG)", monsterId: "familiar_viper", template: "celestial" },
      ],
      // 2nd Level: 5 rows.
      2: [
        { label: "Celestial octopus (NG)", monsterId: "octopus", template: "celestial" },
        { label: "Celestial wolf (NG)", monsterId: "wolf", template: "celestial" },
        { label: "Faun (CG)", monsterId: "faun" },
        { label: "Grig (NG)", monsterId: "grig", note: "Summoned without its fiddle ability." },
        { label: "Pseudodragon (NG)", monsterId: "pseudodragon" },
      ],
      // 3rd Level: 6 rows.
      3: [
        { label: "Blink dog (LG)", monsterId: "blink_dog" },
        { label: "Celestial shark (NG)", monsterId: "shark", template: "celestial" },
        { label: "Foo dog (NG)", monsterId: null, note: NOT_IN_BESTIARY },
        { label: "Lantern archon (LG)", monsterId: "archon_lantern_archon" },
        { label: "Lyrakien azata (CG)", monsterId: "azata_lyrakien" },
        { label: "Silvanshee agathion (NG)", monsterId: "agathion_silvanshee" },
      ],
      // 4th Level: 7 rows.
      4: [
        { label: "Celestial dire wolf (NG)", monsterId: "wolf_dire_wolf", template: "celestial" },
        {
          label: "Celestial giant eagle (NG)",
          monsterId: "eagle_giant_eagle",
          template: "celestial",
        },
        { label: "Celestial pegasus (CG)", monsterId: "pegasus", template: "celestial" },
        { label: "Faerie dragon (NG)", monsterId: "dragon_other_faerie_dragon" },
        { label: "Foo lion (NG)", monsterId: null, note: NOT_IN_BESTIARY },
        { label: "Hound archon (LG)", monsterId: "archon_hound_archon" },
        { label: "Pixie (NG)", monsterId: "pixie" },
      ],
      // 5th Level: 5 rows.
      5: [
        { label: "Bralani azata (CG)", monsterId: "azata_bralani" },
        { label: "Celestial orca (NG)", monsterId: "dolphin_orca", template: "celestial" },
        { label: "Djinni (CG)", monsterId: "genie_djinni" },
        { label: "Unicorn (CG)", monsterId: "unicorn" },
        { label: "Vulpinal agathion (NG)", monsterId: "agathion_vulpinal" },
      ],
      // 6th Level: 5 rows.
      6: [
        {
          label: "Celestial giant octopus (NG)",
          monsterId: "octopus_giant_octopus",
          template: "celestial",
        },
        { label: "Kirin (LG)", monsterId: "kirin" },
        { label: "Legion archon (LG)", monsterId: "archon_legion_archon" },
        // Printed "(LG)" on the feat table; the Bestiary lillend is CG, and the
        // statblock is what the player reads, so the label follows it.
        { label: "Lillend azata (CG)", monsterId: "azata_lillend" },
        { label: "Wood giant (CG)", monsterId: "giant_wood_giant" },
      ],
      // 7th Level: 7 rows.
      7: [
        {
          label: "Celestial dire shark (NG)",
          monsterId: "shark_dire_shark_megalodon",
          template: "celestial",
        },
        { label: "Celestial roc (NG)", monsterId: "roc", template: "celestial" },
        { label: "Movanic deva (NG)", monsterId: "angel_movanic_deva" },
        { label: "Shedu (LG)", monsterId: "shedu" },
        { label: "Shield archon (LG)", monsterId: "archon_shield_archon" },
        { label: "Treant (NG)", monsterId: "treant" },
        {
          label: "Young bronze dragon (LG)",
          monsterId: "dragon_metallic_bronze_young_bronze_dragon",
        },
      ],
      // 8th Level: 5 rows.
      8: [
        { label: "Cloud giant (NG)", monsterId: "giant_cloud_giant" },
        { label: "Dragon horse (NG)", monsterId: "dragon_horse" },
        { label: "Lammasu (LG)", monsterId: "lammasu" },
        { label: "Monadic deva (NG)", monsterId: "angel_monadic_deva" },
        { label: "Young gold dragon (LG)", monsterId: "dragon_metallic_gold_young_gold_dragon" },
      ],
      // 9th Level: 6 rows.
      9: [
        { label: "Astral deva (NG)", monsterId: "angel_astral_deva" },
        { label: "Couatl (LG)", monsterId: "couatl" },
        { label: "Ghaele azata (CG)", monsterId: "azata_ghaele" },
        { label: "Leonal agathion (NG)", monsterId: "agathion_leonal" },
        { label: "Storm giant (CG)", monsterId: "giant_storm_giant" },
        { label: "Trumpet archon (LG)", monsterId: "archon_trumpet_archon" },
      ],
    },
  },
  neutral: {
    label: "Summon Neutral Monster",
    spell: "sm",
    toggleSlug: "summon-neutral-monster",
    source: "Champions of Balance pg. 33",
    levels: {
      // 1st Level: 2 rows.
      1: [
        { label: "Sprite (CN)", monsterId: "sprite" },
        { label: "Stirge (N)", monsterId: "stirge" },
      ],
      // 2nd Level: 2 rows.
      2: [
        { label: "Atomie (CN)", monsterId: "atomie" },
        { label: "Brownie (N)", monsterId: "brownie" },
      ],
      // 3rd Level: 5 rows.
      3: [
        { label: "Arbiter (inevitable) (LN)", monsterId: "inevitable_arbiter" },
        { label: "Nosoi (psychopomp) (N)", monsterId: "psychopomp_nosoi" },
        { label: "Paracletus (aeon) (N)", monsterId: "aeon_paracletus" },
        { label: "Thoqqua (N)", monsterId: "thoqqua" },
        { label: "Voidworm (protean) (CN)", monsterId: "protean_voidworm" },
      ],
      // 4th Level: 6 rows.
      4: [
        { label: "D'ziriak (N)", monsterId: "dziriak" },
        { label: "Magmin (CN)", monsterId: "magmin" },
        { label: "Mephit (any) (N)", monsterId: "mephit" },
        { label: "Satyr (CN)", monsterId: "satyr" },
        { label: "Shae (N)", monsterId: "shae" },
        { label: "Viduus (psychopomp) (N)", monsterId: "psychopomp_viduus" },
      ],
      // 5th Level: 4 rows.
      5: [
        { label: "Catrina (psychopomp) (N)", monsterId: "psychopomp_catrina" },
        { label: "Mercane (LN)", monsterId: "mercane" },
        { label: "Rast (N)", monsterId: "rast" },
        { label: "Tojanida (N)", monsterId: "tojanida" },
      ],
      // 6th Level: 5 rows.
      6: [
        { label: "Chaos beast (CN)", monsterId: "chaos_beast" },
        { label: "Invisible stalker (N)", monsterId: "invisible_stalker" },
        { label: "Naunet (protean) (CN)", monsterId: "protean_naunet" },
        { label: "Theletos (aeon) (N)", monsterId: "aeon_theletos" },
        { label: "Vanth (psychopomp) (N)", monsterId: "psychopomp_vanth" },
      ],
      // 7th Level: 4 rows.
      7: [
        { label: "Axiomite (LN)", monsterId: "axiomite" },
        { label: "Jyoti (N)", monsterId: "jyoti" },
        { label: "Shoki (psychopomp) (N)", monsterId: "psychopomp_shoki" },
        { label: "Zelekhut (inevitable) (LN)", monsterId: "inevitable_zelekhut" },
      ],
      // 8th Level: 1 row.
      8: [{ label: "Imentesh (protean) (CN)", monsterId: "protean_imentesh" }],
      // 9th Level: 3 rows.
      9: [
        { label: "Akhana (aeon) (N)", monsterId: "aeon_akhana" },
        { label: "Morrigna (psychopomp)", monsterId: "psychopomp_morrigna" },
        { label: "Valkyrie (CN)", monsterId: "valkyrie" },
      ],
    },
  },
  evil: {
    label: "Summon Evil Monster",
    spell: "sm",
    toggleSlug: "summon-evil-monster",
    source: "Champions of Corruption pg. 33",
    levels: {
      // 1st Level: 6 rows.
      1: [
        { label: "Fiendish dire rat (NE)", monsterId: "rat_dire_rat", template: "fiendish" },
        {
          label: "Fiendish fire beetle (NE)",
          monsterId: "beetle_fire_beetle",
          template: "fiendish",
        },
        {
          label: "Fiendish ghost scorpion (NE)",
          monsterId: "scorpion_ghost_scorpion",
          template: "fiendish",
        },
        { label: "Fiendish pony (NE)", monsterId: "horse_pony", template: "fiendish" },
        { label: "Fiendish stingray (NE)", monsterId: "ray_stingray", template: "fiendish" },
        { label: "Fiendish vulture (NE)", monsterId: "vulture", template: "fiendish" },
      ],
      // 2nd Level: 7 rows.
      2: [
        { label: "Damned petitioner (LE)", monsterId: null, note: NOT_IN_BESTIARY },
        { label: "Fiendish squid (NE)", monsterId: "squid", template: "fiendish" },
        { label: "Fuath (gremlin, CE)", monsterId: "gremlin_fuath" },
        { label: "Hunted petitioner (NE)", monsterId: null, note: NOT_IN_BESTIARY },
        { label: "Larvae petitioner (CE)", monsterId: null, note: NOT_IN_BESTIARY },
        { label: "Lemure (devil, LE)", monsterId: "devil_lemure" },
        { label: "Pugwampi (gremlin, NE)", monsterId: "gremlin_pugwampi" },
      ],
      // 3rd Level: 7 rows.
      3: [
        { label: "Augur (kyton, LE)", monsterId: "kyton_augur" },
        { label: "Cacodaemon (daemon, NE)", monsterId: "daemon_cacodaemon" },
        { label: "Doru (div, NE)", monsterId: "div_doru" },
        { label: "Dretch (demon, CE)", monsterId: "demon_dretch" },
        { label: "Fiendish shark (NE)", monsterId: "shark", template: "fiendish" },
        { label: "Howler (CE)", monsterId: "howler" },
        { label: "Tripurasura (asura, LE)", monsterId: "asura_tripurasura" },
      ],
      // 4th Level: 7 rows.
      4: [
        { label: "Aghash (div, NE)", monsterId: "div_aghash" },
        { label: "Hell hound (LE)", monsterId: "hell_hound" },
        { label: "Kelpie (NE)", monsterId: "kelpie" },
        { label: "Schir (demon, CE)", monsterId: "demon_schir" },
        { label: "Spring-heeled Jack (CE)", monsterId: "spring_heeled_jack" },
        { label: "Yeth hound (NE)", monsterId: "yeth_hound" },
        { label: "Zebub (devil, LE)", monsterId: "devil_accuser_devil_zebub" },
      ],
      // 5th Level: 7 rows.
      5: [
        { label: "Babau (demon, CE)", monsterId: "demon_babau" },
        { label: "Barbazu (devil, LE)", monsterId: "devil_bearded_devil_barbazu" },
        { label: "Evangelist (kyton, LE)", monsterId: "kyton" },
        {
          label: "Fiendish giant moray eel (NE)",
          monsterId: "eel_giant_moray_eel",
          template: "fiendish",
        },
        { label: "Lurker in light (NE)", monsterId: "lurker_in_light" },
        { label: "Salamander (CE)", monsterId: "salamander" },
        { label: "Shadow mastiff (NE)", monsterId: "shadow_mastiff" },
      ],
      // 6th Level: 7 rows.
      6: [
        { label: "Efreeti (genie, LE)", monsterId: "genie_efreeti" },
        { label: "Erinyes (devil, LE)", monsterId: "devil_erinyes" },
        {
          label: "Fiendish giant octopus (NE)",
          monsterId: "octopus_giant_octopus",
          template: "fiendish",
        },
        { label: "Pairaka (div, NE)", monsterId: "div_pairaka" },
        { label: "Shadow demon (CE)", monsterId: "demon_shadow_demon" },
        { label: "Soul eater (NE)", monsterId: "soul_eater" },
        { label: "Succubus (demon, CE)", monsterId: "demon_succubus" },
      ],
      // 7th Level: 7 rows.
      7: [
        { label: "Bebilith (CE)", monsterId: "bebilith" },
        { label: "Bogeyman (NE)", monsterId: "bogeyman" },
        { label: "Leukodaemon (daemon, NE)", monsterId: "daemon_leukodaemon" },
        { label: "Nuckelavee (NE)", monsterId: "nuckelavee" },
        { label: "Osyluth (devil, LE)", monsterId: "devil_bone_devil_osyluth" },
        { label: "Sacristan (kyton, LE)", monsterId: "kyton_sacristan" },
        { label: "Vrock (demon, CE)", monsterId: "demon_vrock" },
      ],
      // 8th Level: 7 rows.
      8: [
        { label: "Baregara (CE)", monsterId: "baregara" },
        { label: "Dorvae (NE)", monsterId: "dorvae" },
        { label: "Hamatula (devil, LE)", monsterId: "devil_barbed_devil_hamatula" },
        { label: "Hezrou (demon, CE)", monsterId: "demon_hezrou" },
        { label: "Meladaemon (daemon, NE)", monsterId: "daemon_meladaemon" },
        { label: "Rusalka (NE)", monsterId: "rusalka" },
        {
          label: "Young adult green dragon (LE)",
          monsterId: null,
          note: "The bestiary data has the young and adult green dragon only; use the printed young adult statblock.",
        },
      ],
      // 9th Level: 7 rows.
      9: [
        { label: "Ankou (LE)", monsterId: "ankou" },
        { label: "Nalfeshnee (demon, CE)", monsterId: "demon_nalfeshnee" },
        { label: "Derghodaemon (daemon, NE)", monsterId: "daemon_derghodaemon" },
        { label: "Gelugon (devil, LE)", monsterId: "devil_ice_devil_gelugon" },
        { label: "Glabrezu (demon, CE)", monsterId: "demon_glabrezu" },
        { label: "Sepid (div, NE)", monsterId: "div_sepid" },
        { label: "Thanadaemon (daemon, NE)", monsterId: "daemon_thanadaemon" },
      ],
    },
  },
  "ap-sm": {
    label: "Alternative Summoning Options",
    spell: "sm",
    toggleSlug: AP_ALTERNATIVES_SLUG,
    source: "various Adventure Paths, via d20pfsrd",
    levels: {
      // 1st Level Alternatives: 1 row.
      1: [
        {
          label: "Bloody human skeleton",
          monsterId: null,
          note: ap(47, `${EXTRAPLANAR} ${NOT_IN_BESTIARY}`),
        },
      ],
      // 2nd Level Alternatives: 7 rows.
      2: [
        { label: "Akata", monsterId: "akata", note: ap(64) },
        { label: "Elk*", monsterId: "herd_animal_elk", templated: true, note: ap(32) },
        { label: "Grig", monsterId: "grig", note: ap(50, EXTRAPLANAR) },
        { label: "Hell hound", monsterId: "hell_hound", note: ap(29, "Evil, Lawful") },
        { label: "Merfolk*", monsterId: "merfolk", templated: true, note: ap(38) },
        { label: "Reefclaw", monsterId: "reefclaw", note: ap(55) },
        {
          label: "Venomous snake*",
          monsterId: "snake_venomous_snake",
          templated: true,
          note: ap(42),
        },
      ],
      // 3rd Level Alternatives: 7 rows.
      3: [
        { label: "Blink dog*", monsterId: "blink_dog", templated: true, note: ap(41) },
        { label: "Choker", monsterId: "choker", note: ap(23, EXTRAPLANAR) },
        { label: "Dire boar*", monsterId: "boar_dire_boar_daeodon", templated: true, note: ap(32) },
        {
          label: "Human natural wererat rogue 2",
          monsterId: null,
          note: ap(59, `${EXTRAPLANAR} ${NOT_IN_BESTIARY}`),
        },
        {
          label: "Iron cobra (no poison)",
          monsterId: "iron_cobra",
          note: ap(35, `${EXTRAPLANAR} Summoned without its poison.`),
        },
        { label: "Nosoi psychopomp", monsterId: "psychopomp_nosoi", note: ap(44) },
        { label: "Silvanshee agathion", monsterId: "agathion_silvanshee", note: ap(50, "Good") },
      ],
      // 4th Level Alternatives: 7 rows.
      4: [
        { label: "Amphisbaena", monsterId: "amphisbaena", note: ap(42) },
        {
          label: "Cerberi",
          monsterId: "cerberi",
          note: ap(
            29,
            "Evil, Lawful. The AP prints the name as Cerberai; this is the closest statblock.",
          ),
        },
        { label: "Choker", monsterId: "choker", note: ap(59, EXTRAPLANAR) },
        { label: "Giant mantis*", monsterId: "mantis_giant_mantis", templated: true, note: ap(53) },
        {
          label: "Gibbering mouther*",
          monsterId: "gibbering_mouther",
          templated: true,
          note: ap(23),
        },
        { label: "Grick*", monsterId: "grick", templated: true, note: ap(23) },
        { label: "Tiger*", monsterId: "tiger", templated: true, note: ap(53) },
      ],
      // 5th Level Alternatives: 5 rows.
      5: [
        {
          label: "Emperor cobra*",
          monsterId: "snake_emperor_cobra",
          templated: true,
          note: ap(42),
        },
        { label: "Cloaker*", monsterId: "cloaker", templated: true, note: ap(41) },
        { label: "Merrow, saltwater", monsterId: "merrow_saltwater_merrow", note: ap(55) },
        { label: "Shadow mastiff", monsterId: "shadow_mastiff", note: ap(59, "Evil") },
        { label: "Vulpinal agathion", monsterId: "agathion_vulpinal", note: ap(50, "Good") },
      ],
      // 6th Level Alternatives: 6 rows.
      6: [
        { label: "Bulette", monsterId: "bulette", note: ap(35, EXTRAPLANAR) },
        { label: "Chaos beast", monsterId: "chaos_beast", note: ap(64, "Chaotic") },
        { label: "Griffon*", monsterId: "griffon", templated: true, note: ap(26) },
        { label: "Mothman", monsterId: "mothman", note: ap(64, EXTRAPLANAR) },
        { label: "Tylosaurus (dinosaur)", monsterId: "dinosaur_tylosaurus", note: ap(55) },
        { label: "Vanth psychopomp", monsterId: "psychopomp_vanth", note: ap(44) },
      ],
      // 7th Level Alternatives: 5 rows.
      7: [
        { label: "Behir", monsterId: "behir", note: ap(35, EXTRAPLANAR) },
        {
          label: "Daughter of the Dead",
          monsterId: "daughter_of_urgathoa",
          note: ap(
            47,
            `${EXTRAPLANAR} Bestiary 3 prints this creature as the daughter of Urgathoa.`,
          ),
        },
        { label: "Emkrah", monsterId: null, note: ap(23, NOT_IN_BESTIARY) },
        {
          label: "Giant anaconda*",
          monsterId: "snake_giant_anaconda",
          templated: true,
          note: ap(42),
        },
        {
          label: "Young frost giant*",
          monsterId: "giant_frost_frost_giant",
          templated: true,
          template: "young",
          note: ap(
            38,
            "The AP names the creature only; reading it as the Young template is the compilation's.",
          ),
        },
      ],
      // 8th Level Alternatives: 3 rows.
      8: [
        {
          label: "Frost giant*",
          monsterId: "giant_frost_frost_giant",
          templated: true,
          note: ap(38),
        },
        { label: "Gorgon", monsterId: "gorgon", note: ap(35, EXTRAPLANAR) },
        {
          label: "Young cloud giant*",
          monsterId: "giant_cloud_giant",
          templated: true,
          template: "young",
          note: ap(
            38,
            "The AP names the creature only; reading it as the Young template is the compilation's.",
          ),
        },
      ],
      // 9th Level Alternatives: 2 rows.
      9: [
        { label: "Cloud giant*", monsterId: "giant_cloud_giant", templated: true, note: ap(38) },
        {
          label: "Young storm giant*",
          monsterId: "giant_storm_giant",
          templated: true,
          template: "young",
          note: ap(
            38,
            "The AP names the creature only; reading it as the Young template is the compilation's.",
          ),
        },
      ],
    },
  },
  "ap-sna": {
    label: "Alternative Summoning Options",
    spell: "sna",
    toggleSlug: AP_ALTERNATIVES_SLUG,
    source: "various Adventure Paths, via d20pfsrd",
    levels: {
      // 2nd Level Alternatives: 5 rows.
      2: [
        { label: "Axe beak", monsterId: "axe_beak", note: ap(75) },
        {
          label: "Celestial elk",
          monsterId: "herd_animal_elk",
          template: "celestial",
          note: ap(32),
        },
        { label: "Dire badger", monsterId: "badger_dire_badger", note: ap(75) },
        { label: "Giant porcupine", monsterId: "porcupine_giant_porcupine", note: ap(75) },
        {
          label: "Venomous snake*",
          monsterId: "snake_venomous_snake",
          templated: true,
          note: ap(42),
        },
      ],
      // 3rd Level Alternatives: 1 row.
      3: [
        {
          label: "Celestial dire boar",
          monsterId: "boar_dire_boar_daeodon",
          template: "celestial",
          note: ap(32),
        },
      ],
      // 4th Level Alternatives: 5 rows.
      4: [
        { label: "Amphisbaena", monsterId: "amphisbaena", note: ap(42) },
        { label: "Giant chameleon lizard", monsterId: "lizard_giant_chameleon", note: ap(75) },
        { label: "Giant skunk", monsterId: "skunk_giant_skunk", note: ap(75) },
        { label: "Seaweed leshy", monsterId: "leshy_seaweed_leshy", note: ap(75) },
        { label: "Giant vulture", monsterId: "vulture_giant_vulture", note: ap(75) },
      ],
      // 5th Level Alternatives: 4 rows.
      5: [
        {
          label: "Emperor cobra*",
          monsterId: "snake_emperor_cobra",
          templated: true,
          note: ap(42),
        },
        { label: "Giant owl", monsterId: "owl_giant_owl", note: ap(75) },
        { label: "Giant gar", monsterId: "gar", note: ap(75) },
        { label: "Merrow, saltwater (NE)", monsterId: "merrow_saltwater_merrow", note: ap(55) },
      ],
      // 6th Level Alternatives: 2 rows.
      6: [
        { label: "Shambling mound", monsterId: "shambling_mound", note: ap(75) },
        { label: "Tylosaurus (dinosaur) (N)", monsterId: "dinosaur_tylosaurus", note: ap(55) },
      ],
      // 7th Level Alternatives: 3 rows.
      7: [
        {
          label: "Giant anaconda*",
          monsterId: "snake_giant_anaconda",
          templated: true,
          note: ap(42),
        },
        { label: "Giant flytrap", monsterId: "giant_flytrap", note: ap(75) },
        { label: "Giant snapping turtle", monsterId: "turtle_giant_snapping_turtle", note: ap(75) },
      ],
    },
  },
};

export const SUMMON_ALT_LIST_ORDER: readonly SummonAltList[] = [
  "good",
  "neutral",
  "evil",
  "ap-sm",
  "ap-sna",
];

/**
 * Archetype features from every other class (barbarian, bloodrager, brawler,
 * fighter, inquisitor, vigilante, ...) that modify the tracked
 * companion/mount — one wave shard of `COMPANION_EFFECT_ARCHETYPE_FEATURES`
 * (see `index.ts`). Keys are archetype-feature classification keys; verify
 * every number against the vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const OTHER_CLASS_COMPANION_EFFECTS: Readonly<Record<string, ArchetypeCompanionEffect>> = {
  // ── alchemist:winged-marauder ──
  // "a winged marauder acquires a flying mount as an animal companion...
  // The marauder's effective druid level is equal to his alchemist level."
  "alchemist:winged-marauder:flying-beast-tamer:1": {
    archetypeId: "alchemist:winged-marauder",
    minLevel: 1,
    source: "Flying Beast Tamer",
    level: { grants: true, mode: "classLevel", classTag: "alchemist", offset: 0 },
  },

  // ── barbarian:mad-dog ──
  // "a mad dog gains the service of an animal companion, using the
  // barbarian's level as her effective druid level."
  "barbarian:mad-dog:war-beast:1": {
    archetypeId: "barbarian:mad-dog",
    minLevel: 1,
    source: "War Beast",
    level: { grants: true, mode: "classLevel", classTag: "barbarian", offset: 0 },
  },

  // ── barbarian:mounted-fury ──
  // "the mounted fury gains the service of a feral mount... using the
  // barbarian's level -4 as her effective druid level." (The +2 morale
  // Strength bonus the same feature grants "whenever a barbarian is raging
  // while mounted on her bestial mount" stays unwired — gated on a live
  // rage-and-mounted state this engine doesn't track.)
  "barbarian:mounted-fury:bestial-mount:5": {
    archetypeId: "barbarian:mounted-fury",
    minLevel: 5,
    source: "Bestial Mount",
    level: { grants: true, mode: "classLevel", classTag: "barbarian", offset: -4 },
  },
  // "The speed of any mount the barbarian rides is increased by 10 feet."
  // Unconditional (unlike Shoanti Burn Rider's once-per-rage Flame Runner
  // below), so it's a plain untyped speed Change.
  "barbarian:mounted-fury:fast-rider:1": {
    archetypeId: "barbarian:mounted-fury",
    minLevel: 1,
    source: "Fast Rider",
    changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
  },

  // ── barbarian:shoanti-burn-rider ──
  // "a burn rider gains a loyal mount... her effective druid level is equal
  // to her Shoanti burn rider level - 3." (Flame Runner's speed boost is
  // once-per-rage and activated, not a passive bonus — stays unwired.)
  "barbarian:shoanti-burn-rider:mount:4": {
    archetypeId: "barbarian:shoanti-burn-rider",
    minLevel: 4,
    source: "Mount",
    level: { grants: true, mode: "classLevel", classTag: "barbarian", offset: -3 },
  },

  // ── barbarianUnchained:mad-dog ── (vendored text is byte-identical to
  // chained barbarian's mad-dog — see barbarianUnchained.ts's own module
  // doc comment for how that was verified.)
  "barbarianUnchained:mad-dog:war-beast:1": {
    archetypeId: "barbarianUnchained:mad-dog",
    minLevel: 1,
    source: "War Beast",
    level: { grants: true, mode: "classLevel", classTag: "barbarianUnchained", offset: 0 },
  },

  // ── barbarianUnchained:mounted-fury ──
  "barbarianUnchained:mounted-fury:bestial-mount:5": {
    archetypeId: "barbarianUnchained:mounted-fury",
    minLevel: 5,
    source: "Bestial Mount",
    level: { grants: true, mode: "classLevel", classTag: "barbarianUnchained", offset: -4 },
  },
  "barbarianUnchained:mounted-fury:fast-rider:1": {
    archetypeId: "barbarianUnchained:mounted-fury",
    minLevel: 1,
    source: "Fast Rider",
    changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
  },

  // ── barbarianUnchained:shoanti-burn-rider ──
  "barbarianUnchained:shoanti-burn-rider:mount:4": {
    archetypeId: "barbarianUnchained:shoanti-burn-rider",
    minLevel: 4,
    source: "Mount",
    level: { grants: true, mode: "classLevel", classTag: "barbarianUnchained", offset: -3 },
  },

  // ── bloodrager:bloodrider ──
  // "The speed of any mount the bloodrager rides increases by 10 feet."
  "bloodrager:bloodrider:fast-rider:1": {
    archetypeId: "bloodrager:bloodrider",
    minLevel: 1,
    source: "Fast Rider",
    changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
  },
  // "the bloodrider gains the service of a feral mount... using the
  // bloodrager's level - 4 as his effective druid level." (Its +2 morale
  // Strength "whenever a bloodrider is bloodraging" and Blood Bond's
  // bloodline-sharing at 9th both stay unwired — rage-state-gated and
  // share-ability mechanics respectively.)
  "bloodrager:bloodrider:feral-mount:5": {
    archetypeId: "bloodrager:bloodrider",
    minLevel: 5,
    source: "Feral Mount",
    level: { grants: true, mode: "classLevel", classTag: "bloodrager", offset: -4 },
  },

  // ── brawler:wild-child ──
  // "A wild child can begin play with any of the animals available to a
  // druid. The wild child uses his brawler level as his effective druid
  // level."
  "brawler:wild-child:animal-companion:1": {
    archetypeId: "brawler:wild-child",
    minLevel: 1,
    source: "Animal Companion",
    level: { grants: true, mode: "classLevel", classTag: "brawler", offset: 0 },
  },
  // "his animal companion also learns a trick to make use of this combat
  // maneuver... This bonus trick doesn't count against the animal
  // companion's total tricks known." Only the 3rd-level tier is captured —
  // bonusTricks is a flat count, and the later 7th/11th/15th/19th tiers
  // (each training one more maneuver, and its own bonus trick) aren't
  // scaled for here.
  "brawler:wild-child:maneuver-training:3": {
    archetypeId: "brawler:wild-child",
    minLevel: 3,
    source: "Maneuver Training",
    bonusTricks: 1,
  },

  // ── inquisitor:sacred-huntsmaster ──
  // "This ability works as the hunter class feature of the same name, using
  // her inquisitor level as her hunter level." — same 1:1 formula as the
  // hunter's own base Animal Companion (baseCompanionEffectiveLevel's
  // "hunter-companion" source).
  "inquisitor:sacred-huntsmaster:animal-companion:1": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    minLevel: 1,
    source: "Animal Companion",
    level: { grants: true, mode: "classLevel", classTag: "inquisitor", offset: 0 },
  },

  // ── kineticist:cinderlands-adept ──
  // "her effective druid level is equal to her cinterlands adept level -3"
  // [sic, vendored typo for "cinderlands"].
  "kineticist:cinderlands-adept:mount:4": {
    archetypeId: "kineticist:cinderlands-adept",
    minLevel: 4,
    source: "Mount",
    level: { grants: true, mode: "classLevel", classTag: "kineticist", offset: -3 },
  },

  // ── vigilante:mounted-fury ──
  // "This mount functions as a druid's animal companion, using the mounted
  // fury's vigilante level as his effective druid level." Granted at 1st
  // level (the classification table's ":0" id suffix marks an unnumbered
  // tier in the vendored table, not level 0). The 3rd-level teamwork-feat
  // sharing and 5th-level startling-appearance sharing this same feature
  // grants stay unwired — behavior/ability riders, not flat numbers.
  "vigilante:mounted-fury:mount:0": {
    archetypeId: "vigilante:mounted-fury",
    minLevel: 1,
    source: "Mount",
    level: { grants: true, mode: "classLevel", classTag: "vigilante", offset: 0 },
  },

  // ── warpriest:divine-commander ──
  // "This mount functions as a druid's animal companion, using the divine
  // commander's level as her effective druid level." Same ":0" / 1st-level
  // convention as vigilante's Mount above.
  "warpriest:divine-commander:mount:0": {
    archetypeId: "warpriest:divine-commander",
    minLevel: 1,
    source: "Mount",
    level: { grants: true, mode: "classLevel", classTag: "warpriest", offset: 0 },
  },
};

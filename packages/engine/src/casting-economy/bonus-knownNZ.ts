import type { BonusKnownSpellsDef } from "./types.js";

/**
 * Fixed bonus-known-spell grants from archetype features, classes N–Z by
 * class tag, keyed by vendored `archetypeFeatures` pack id. See
 * `BonusKnownSpellsDef` in `types.ts` for the charter (fixed schedules only;
 * player-chosen additions are residue).
 *
 * The oracle "Bonus Spell" rows below all replace the mystery's own bonus
 * spell at the same oracle level; that schedule fixes the spell level a
 * bonus spell is treated as (1st at 2nd oracle level, 2nd at 4th, ...9th at
 * 18th) independent of the named spell's level on any other class's list,
 * so `spellLevel` is set explicitly throughout rather than left to fall
 * back to the spell's nominal level.
 */
export const ARCHETYPE_BONUS_KNOWN_SPELLS_NZ: Readonly<Record<string, BonusKnownSpellsDef>> = {
  "oracle:community-guardian:bonus-spell:2": {
    spells: [
      { spell: "Bless Water", atLevel: 2, spellLevel: 1 },
      { spell: "Consecrate", atLevel: 4, spellLevel: 2 },
      { spell: "Remove Disease", atLevel: 6, spellLevel: 3 },
      { spell: "Hallow", atLevel: 10, spellLevel: 5 },
      { spell: "Heroes' Feast", atLevel: 12, spellLevel: 6 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 6, 10, 12],
  },
  "oracle:divine-numerologist:bonus-spell:10": {
    spells: [
      { spell: "Prying Eyes", atLevel: 10, spellLevel: 5 },
      { spell: "Numerological Evocation", atLevel: 12, spellLevel: 6 },
      { spell: "Arcane Sight, Greater", atLevel: 14, spellLevel: 7 },
      { spell: "Moment of Prescience", atLevel: 16, spellLevel: 8 },
      { spell: "Foresight", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [10, 12, 14, 16, 18],
  },
  "oracle:elementalist-oracle:bonus-spell:4": {
    spells: [
      { spell: "Elemental Touch", atLevel: 4, spellLevel: 2 },
      { spell: "Protection from Energy", atLevel: 6, spellLevel: 3 },
      { spell: "Elemental Body I", atLevel: 8, spellLevel: 4 },
      { spell: "Summon Monster V", atLevel: 10, spellLevel: 5 },
      { spell: "Elemental Body III", atLevel: 12, spellLevel: 6 },
      { spell: "Elemental Swarm", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [4, 6, 8, 10, 12, 18],
    note: "Summon Monster V is restricted to elementals only; the summon-list restriction isn't enforced here.",
  },
  "oracle:enlightened-philosopher:bonus-spell:4": {
    spells: [
      { spell: "Owl's Wisdom", atLevel: 4, spellLevel: 2 },
      { spell: "Water Walk", atLevel: 6, spellLevel: 3 },
      { spell: "Discern Lies", atLevel: 8, spellLevel: 4 },
      { spell: "True Seeing", atLevel: 10, spellLevel: 5 },
      { spell: "Wind Walk", atLevel: 12, spellLevel: 6 },
      { spell: "Ethereal Jaunt", atLevel: 14, spellLevel: 7 },
      { spell: "Moment of Prescience", atLevel: 16, spellLevel: 8 },
      { spell: "Astral Projection", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [4, 6, 8, 10, 12, 14, 16, 18],
  },
  "oracle:hermit:bonus-spell:4": {
    spells: [
      { spell: "Blindness/Deafness", atLevel: 4, spellLevel: 2 },
      { spell: "Crushing Despair", atLevel: 8, spellLevel: 4 },
      { spell: "Wall of Force", atLevel: 12, spellLevel: 6 },
      { spell: "Maze", atLevel: 16, spellLevel: 8 },
    ],
    replacesMysteryBonusSpellLevels: [4, 8, 12, 16],
  },
  "oracle:inerrant-voice:bonus-spell:4": {
    spells: [
      { spell: "Shield Other", atLevel: 2, spellLevel: 1 },
      { spell: "Augury", atLevel: 4, spellLevel: 2 },
      { spell: "Divination", atLevel: 8, spellLevel: 4 },
      { spell: "Vision", atLevel: 14, spellLevel: 7 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 8, 14],
  },
  "oracle:keleshite-prophet:bonus-spell:6": {
    spells: [
      { spell: "Clairaudience/Clairvoyance", atLevel: 6, spellLevel: 3 },
      { spell: "Prying Eyes", atLevel: 10, spellLevel: 5 },
      { spell: "True Seeing", atLevel: 12, spellLevel: 6 },
      { spell: "Prediction of Failure", atLevel: 16, spellLevel: 8 },
      { spell: "Foresight", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [6, 10, 12, 16, 18],
  },
  "oracle:ocean-s-echo:bonus-spell:4": {
    spells: [
      { spell: "Sound Burst", atLevel: 4, spellLevel: 2 },
      { spell: "Shout", atLevel: 8, spellLevel: 4 },
      { spell: "Song of Discord", atLevel: 10, spellLevel: 5 },
      { spell: "Shout, Greater", atLevel: 12, spellLevel: 6 },
      { spell: "Pied Piping", atLevel: 14, spellLevel: 7 },
    ],
    replacesMysteryBonusSpellLevels: [4, 8, 10, 12, 14],
  },
  "oracle:planar-oracle:bonus-spell:2": {
    spells: [
      { spell: "Endure Elements", atLevel: 2, spellLevel: 1 },
      { spell: "Elemental Speech", atLevel: 4, spellLevel: 2 },
      { spell: "Tongues", atLevel: 6, spellLevel: 3 },
      { spell: "Planar Adaptation", atLevel: 8, spellLevel: 4 },
      { spell: "Plane Shift", atLevel: 10, spellLevel: 5 },
      { spell: "Planar Adaptation, Mass", atLevel: 12, spellLevel: 6 },
      { spell: "Shadow Walk", atLevel: 14, spellLevel: 7 },
      { spell: "Etherealness", atLevel: 16, spellLevel: 8 },
      { spell: "Gate", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18],
  },
  "oracle:possessed-oracle:bonus-spell:2": {
    spells: [
      { spell: "Ventriloquism", atLevel: 2, spellLevel: 1 },
      { spell: "Spider Climb", atLevel: 4, spellLevel: 2 },
      { spell: "Screech", atLevel: 6, spellLevel: 3 },
      { spell: "Sleepwalk", atLevel: 8, spellLevel: 4 },
      { spell: "Telekinesis", atLevel: 10, spellLevel: 5 },
      { spell: "Animate Objects", atLevel: 12, spellLevel: 6 },
      { spell: "Divine Vessel", atLevel: 16, spellLevel: 8 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 6, 8, 10, 12, 16],
  },
  "oracle:psychic-searcher:bonus-spell:4": {
    spells: [
      { spell: "Augury", atLevel: 4, spellLevel: 2 },
      { spell: "Locate Object", atLevel: 6, spellLevel: 3 },
      { spell: "Divination", atLevel: 8, spellLevel: 4 },
      { spell: "Find the Path", atLevel: 12, spellLevel: 6 },
      { spell: "Discern Location", atLevel: 16, spellLevel: 8 },
      { spell: "Foresight", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [4, 6, 8, 12, 16, 18],
  },
  "oracle:purifier:bonus-spell:2": {
    spells: [
      { spell: "Veil of Heaven", atLevel: 2, spellLevel: 1 },
      { spell: "Confess", atLevel: 4, spellLevel: 2 },
      { spell: "Cast Out", atLevel: 6, spellLevel: 3 },
      { spell: "Denounce", atLevel: 8, spellLevel: 4 },
      { spell: "Dispel Evil", atLevel: 10, spellLevel: 5 },
      { spell: "Banishment", atLevel: 12, spellLevel: 6 },
      { spell: "Holy Word", atLevel: 14, spellLevel: 7 },
      { spell: "Mind Blank", atLevel: 16, spellLevel: 8 },
      { spell: "Freedom", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 6, 8, 10, 12, 14, 16, 18],
  },
  "oracle:reincarnated-oracle:bonus-spell:2": {
    spells: [
      { spell: "See Alignment", atLevel: 2, spellLevel: 1 },
      { spell: "Detect Thoughts", atLevel: 4, spellLevel: 2 },
      { spell: "Contact Other Plane", atLevel: 10, spellLevel: 5 },
      { spell: "Moment of Prescience", atLevel: 16, spellLevel: 8 },
      { spell: "Overwhelming Presence", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 10, 16, 18],
  },
  "oracle:river-soul:bonus-spell:2": {
    spells: [
      { spell: "Hydraulic Push", atLevel: 2, spellLevel: 1 },
      { spell: "Hydraulic Torrent", atLevel: 6, spellLevel: 3 },
      { spell: "Control Water", atLevel: 8, spellLevel: 4 },
      { spell: "Cone of Cold", atLevel: 10, spellLevel: 5 },
      { spell: "World Wave", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 6, 8, 10, 18],
  },
  "oracle:seer:bonus-spell:4": {
    spells: [
      { spell: "Detect Thoughts", atLevel: 4, spellLevel: 2 },
      { spell: "Clairaudience/Clairvoyance", atLevel: 6, spellLevel: 3 },
      { spell: "Scrying", atLevel: 8, spellLevel: 4 },
      { spell: "True Seeing", atLevel: 10, spellLevel: 5 },
      { spell: "Legend Lore", atLevel: 12, spellLevel: 6 },
      { spell: "Scrying, Greater", atLevel: 14, spellLevel: 7 },
      { spell: "Vision", atLevel: 16, spellLevel: 8 },
      { spell: "Foresight", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [4, 6, 8, 10, 12, 14, 16, 18],
  },
  "oracle:shigenjo:bonus-spell:2": {
    spells: [
      { spell: "True Strike", atLevel: 2, spellLevel: 1 },
      { spell: "Alter Self", atLevel: 4, spellLevel: 2 },
      { spell: "Divine Power", atLevel: 8, spellLevel: 4 },
      { spell: "Magic Jar", atLevel: 12, spellLevel: 6 },
      { spell: "Ki Shout", atLevel: 14, spellLevel: 7 },
      { spell: "Moment of Prescience", atLevel: 16, spellLevel: 8 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 8, 12, 14, 16],
  },
  "oracle:stargazer:bonus-spell:2": {
    spells: [
      { spell: "Faerie Fire", atLevel: 2, spellLevel: 1 },
      { spell: "Glitterdust", atLevel: 4, spellLevel: 2 },
      { spell: "Guiding Star", atLevel: 6, spellLevel: 3 },
      { spell: "Wandering Star Motes", atLevel: 8, spellLevel: 4 },
      { spell: "Meteor Swarm", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 4, 6, 8, 18],
  },
  "oracle:tree-soul:bonus-spell:2": {
    spells: [
      { spell: "Warp Wood", atLevel: 2, spellLevel: 1 },
      { spell: "Tree Stride", atLevel: 10, spellLevel: 5 },
      { spell: "Ironwood", atLevel: 12, spellLevel: 6 },
      { spell: "Changestaff", atLevel: 14, spellLevel: 7 },
      { spell: "Repel Metal or Stone", atLevel: 16, spellLevel: 8 },
      { spell: "Siege of Trees, Greater", atLevel: 18, spellLevel: 9 },
    ],
    replacesMysteryBonusSpellLevels: [2, 10, 12, 14, 16, 18],
  },
  "paladin:pearl-seeker:vision-magic:4": {
    spells: [
      { spell: "Slipstream", atLevel: 7, spellLevel: 1 },
      { spell: "Ride the Waves", atLevel: 10, spellLevel: 2 },
      { spell: "Fluid Form", atLevel: 13, spellLevel: 3 },
      { spell: "Seamantle", atLevel: 16, spellLevel: 4 },
    ],
  },
  "psychic:psychic-duelist:psychic-duel-acumen:4": {
    spells: [{ spell: "Instigate Psychic Duel", atLevel: 4 }],
  },
  "skald:red-tongue:seed-of-discord:1": {
    spells: [
      { spell: "Doom", atLevel: 1, spellLevel: 1 },
      { spell: "Castigate", atLevel: 4, spellLevel: 2 },
      { spell: "Charm Monster", atLevel: 7, spellLevel: 3 },
      { spell: "Denounce", atLevel: 10, spellLevel: 4 },
      { spell: "Command, Greater", atLevel: 13, spellLevel: 5 },
      { spell: "Eagle's Splendor, Mass", atLevel: 16, spellLevel: 6 },
    ],
  },
  "sorcerer:razmiran-priest:lay-healer:3": {
    spells: [
      { spell: "Aid", atLevel: 3, spellLevel: 2 },
      { spell: "Remove Disease", atLevel: 5, spellLevel: 3 },
    ],
  },
  "spiritualist:hag-haunted:death-curse:0": {
    spells: [
      { spell: "Bestow Curse", atLevel: 6, spellLevel: 3 },
      { spell: "Curse, Major", atLevel: 16, spellLevel: 6 },
    ],
  },
  "summoner:morphic-savant:chaos-magic:2": {
    spells: [
      { spell: "Protection from Law", atLevel: 1, spellLevel: 1 },
      { spell: "Shard of Chaos", atLevel: 4, spellLevel: 2 },
      { spell: "Magic Circle against Law", atLevel: 7, spellLevel: 3 },
      { spell: "Chaos Hammer", atLevel: 10, spellLevel: 4 },
      { spell: "Dispel Law", atLevel: 13, spellLevel: 5 },
      { spell: "Word of Chaos", atLevel: 16, spellLevel: 6 },
    ],
  },
  "summoner:unwavering-conduit:law-magic:0": {
    spells: [
      { spell: "Protection from Chaos", atLevel: 1, spellLevel: 1 },
      { spell: "Arrow of Law", atLevel: 4, spellLevel: 2 },
      { spell: "Magic Circle against Chaos", atLevel: 7, spellLevel: 3 },
      { spell: "Order's Wrath", atLevel: 10, spellLevel: 4 },
      { spell: "Dispel Chaos", atLevel: 13, spellLevel: 5 },
      { spell: "Dictum", atLevel: 16, spellLevel: 6 },
    ],
  },
  "wizard:undead-master:reanimator:1": {
    spells: [
      { spell: "Repair Undead", atLevel: 1 },
      { spell: "Animate Dead, Lesser", atLevel: 3 },
      { spell: "Animate Dead", atLevel: 5 },
      { spell: "Undead Anatomy I", atLevel: 7 },
      { spell: "Create Undead", atLevel: 9 },
      { spell: "Undeath to Death", atLevel: 11 },
      { spell: "Create Greater Undead", atLevel: 13 },
      { spell: "Undead Anatomy IV", atLevel: 15 },
      { spell: "Cursed Earth", atLevel: 17 },
    ],
  },
};

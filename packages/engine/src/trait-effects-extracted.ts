/**
 * Machine-extracted effects for vendored character traits whose upstream
 * `changes` array is empty — the trait counterpart to
 * `feat-effects-extracted-community.ts`, produced the same way: parallel
 * classification agents over the full prose-only catalog (1,547 entries),
 * every draft machine-verified (provenance must be a verbatim substring of
 * the vendored description; targets/types/formulas against a fixed
 * vocabulary) and hand-reviewed against the full published text before
 * landing.
 *
 * Keyed by vendored trait id (`RefData.traits` key), folded in by
 * `traits.ts`'s `vendoredTraitToDef` — so the picker, `collectModifiers`,
 * and `traitGrantedClassSkills` all see the supplemented entry with no
 * extra lookups. The hand-authored `TRAITS` table still wins outright on a
 * name collision (`mergedTraits`), so nothing here can double-apply.
 *
 * The honesty bar matches the rest of the catalog work: only
 * unconditional, always-on, self-targeting numbers. Scoped clauses ("vs.
 * fear", "checks made to gather information") stay prose, covered by the
 * vendored contextNotes most of these entries already carry. A named
 * Craft/Profession/Perform instance ("Profession (sailor) is always a
 * class skill for you") wires the same as any other fixed skill target —
 * `skill.<prefix>.<slug>` for the bonus, `<prefix>.<slug>` in `classSkills`
 * for the grant — since `compute.ts` has targeted individual parameterized
 * instances since 2026-07. A bare-family `classSkills` id (e.g. `prf`) is
 * used only for whole-family grants ("Perform is always a class skill for
 * you") — compute()'s baseId fallback then covers every instance. What
 * still stays prose is a player-CHOSEN Craft/Perform/Profession subskill
 * ("one Perform skill of your choice"): the trait text names no fixed
 * instance for the engine to target.
 */

import type { Change } from "@pf1/schema";

import type { PickChoice } from "./rage-powers.js";

export interface ExtractedTraitEntry {
  /** Typed modifiers for the unconditional clause(s). */
  changes?: readonly Change[];
  /** Fixed class-skill grants (base skill ids), see `TraitDef.classSkills`. */
  classSkills?: readonly string[];
  /**
   * Verbatim contiguous substring of the vendored description covering the
   * promoted clause — the drift guard `test/traitEffectsExtracted.test.ts`
   * re-checks against the live vendored data.
   */
  provenance: string;
}

export const TRAIT_EFFECTS_EXTRACTED: Readonly<Record<string, ExtractedTraitEntry>> = {
  // Abendego Pilot (Eye of Abendego; Sylph): Promoted the unconditional +2 Profession (sailor) trait bonus; the wind-force perception benefit stays prose (not a numeric target).
  ggGeZU7iH0vmOunL: {
    changes: [{ target: "skill.pro.sailor", type: "trait", formula: "2" }],
    provenance: "You gain a +2 trait bonus on Profession (sailor) checks",
  },
  // Affable: Class-skill grant is unconditional; the +2 Diplomacy bonus is scoped to gathering information and stays prose.
  "4h9t6ATa7kAGbAPe": {
    classSkills: ["dip", "klo"],
    provenance: "Diplomacy and Knowledge (local) are always class skills for you.",
  },
  // Almost Human (Half-Orc): Disguise becomes a class skill; the +4 Disguise bonus is scoped to passing as human and stays prose.
  Izrqpqg5WFuHM6uH: {
    classSkills: ["dis"],
    provenance: "Disguise is always a class skill for you",
  },
  // Among Humans (Kitsune): Disguise becomes a class skill; the +2 Disguise bonus is scoped to appearing human via change shape and stays prose.
  MyCRKzVmC7lVbpea: {
    classSkills: ["dis"],
    provenance: "Disguise is always a class skill for you",
  },
  // Animal Friend (Gnome): Handle Animal becomes a class skill; the +1 Will save bonus is conditional on an animal being within 30 feet and stays prose.
  lSsuLyOhj7rAq627: {
    classSkills: ["han"],
    provenance: "Handle Animal is always a class skill for you",
  },
  // Anuli Engineer (Anuli): Promoted the unconditional class-skill grant; the scoped Perception bonus for stonework/traps/hidden doors stays prose.
  TmPiivdEGEJ64yEq: {
    classSkills: ["ken"],
    provenance: "Knowledge (engineering) is always a class skill for you.",
  },
  // Azlanti Scholar (Ruins of Azlant): Promoted the unconditional +1 trait bonus on Knowledge (history), Knowledge (local), and Use Magic Device; the single class-skill pick among the three and the bonus language stay prose.
  gu5atbcLaiYnSQHU: {
    changes: [
      { target: "skill.khi", type: "trait", formula: "1" },
      { target: "skill.klo", type: "trait", formula: "1" },
      { target: "skill.umd", type: "trait", formula: "1" },
    ],
    provenance:
      "You gain a +1 trait bonus on Knowledge (history), Knowledge (local), and Use Magic Device checks",
  },
  // Barroom Talespinner (Skull and Shackles): Promoted the unconditional +1 Diplomacy trait bonus; the player-chosen Perform category, the ambiguous class-skill pick, and the once-per-week pirate-tale bonus stay prose.
  "4lfTLUDjiOP2pNd9": {
    changes: [{ target: "skill.dip", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Diplomacy checks and one category of Perform checks",
  },
  // Battlefield Surgeon (Zon-Kuthon): Unconditional class skill grant promoted; extra treat-deadly-wounds use stays prose (not a numeric target).
  "7qHhApg7OMSlk3e7": {
    classSkills: ["hea"],
    provenance: "Heal becomes a class skill for you",
  },
  // Brastlewark Businessman (Gnome): Promoted the unconditional +2 Craft (alchemy) trait bonus (the compendium description's own "update the target" authoring note is what this promotion does).
  KzD0s3ZhLGxc3I1X: {
    changes: [{ target: "skill.crf.alchemy", type: "trait", formula: "2" }],
    provenance: "You gain a +2 trait bonus on all Craft (alchemy) checks.",
  },
  // Brewmaster (Dwarf): Promoted the unconditional +1 trait bonus on Profession (brewer) and Craft (alchemy); the Diplomacy penalty stays prose (scoped to dwarves aware of the family's brewing secrets).
  Z9OexI16JgRSwWQW: {
    changes: [
      { target: "skill.pro.brewer", type: "trait", formula: "1" },
      { target: "skill.crf.alchemy", type: "trait", formula: "1" },
    ],
    provenance: "You gain a +1 trait bonus on Profession (brewer) and Craft (alchemy) checks",
  },
  // Bruising Intellect: Class-skill grant is unconditional; the Int-for-Cha substitution on Intimidate checks isn't an expressible bonus target and stays prose.
  HhRkiJqhqVFp5E9b: {
    classSkills: ["int"],
    provenance: "Intimidate is always a class skill for you",
  },
  // Call of the Longships (Lands of the Linnorm Kings): Promoted the unconditional +1 Profession (sailor) trait bonus; the ship-combat attack bonus stays prose (scoped to being onboard ships).
  A0Qr8Ddtl9BIFSpD: {
    changes: [{ target: "skill.pro.sailor", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Profession (sailor) checks",
  },
  // Canon of Coin: Promoted the unconditional Appraise class-skill grant; the coin-threshold Will save bonus stays prose (conditional on carried wealth).
  a0215TXPc6uiHg7g: {
    classSkills: ["apr"],
    provenance: "Appraise is a class skill for you.",
  },
  // Cavern Survivor (Nar-Voth): Promoted the unconditional class-skill grant; the scoped Survival bonus for subterranean wilderness stays prose.
  JOjJLmckTIt3hBKY: {
    classSkills: ["sur"],
    provenance: "Survival is a class skill for you.",
  },
  // Child of Infamy (Council of Thieves): Both the +1 Perform (act) trait bonus and its class-skill grant are unconditional; the starting-gold nest egg stays prose (no wealth target).
  "249AUN4KpTJ853lW": {
    changes: [{ target: "skill.prf.act", type: "trait", formula: "1" }],
    classSkills: ["prf.act"],
    provenance:
      "You gain a +1 trait bonus on Perform (act) skill checks, and the skill is always considered a class skill for you.",
  },
  // Chillblight Emissary (Irrisen): Promoted the unconditional DR 1/cold iron; the sickened-if-struck-by-cold-iron downside stays prose.
  eEVQkUofjHC1jjMX: {
    changes: [{ target: "dr.cold-iron", type: "untyped", formula: "1" }],
    provenance: "You gain DR 1/cold iron",
  },
  // Chip on the Shoulder: Class-skill grant is unconditional; the +2 Intimidate bonus is scoped to a creature that just failed an Intimidate check against you and stays prose.
  "0EfNTNcwjFr5BjyX": {
    classSkills: ["int"],
    provenance: "Intimidate becomes a class skill for you.",
  },
  // Demented Inventor (Half-Orc, Orc): Both the +2 Craft (weapons) trait bonus and its class-skill grant are unconditional; promoted both.
  kb1xWDivKkshwHNS: {
    changes: [{ target: "skill.crf.weapons", type: "trait", formula: "2" }],
    classSkills: ["crf.weapons"],
    provenance:
      "You gain a +2 trait bonus on Craft (weapons) checks, and it becomes a class skill.",
  },
  // Destined Diplomat: Class-skill grant is unconditional; the +2 Diplomacy bonus is scoped to outsiders and stays prose.
  vwNrscHqopeUqRKv: {
    classSkills: ["dip"],
    provenance: "Diplomacy is always a class skill for you.",
  },
  // Diva in Training (Hell's Rebels): Promoted the unconditional 'all Perform skills are class skills' grant; the +1 bonus to one player-chosen Perform type and the language-dependent spell DC bonus (no target) stay prose.
  CPeVws9xK3wmRPcr: {
    classSkills: ["prf"],
    provenance: "all Perform skills are class skills for you",
  },
  // Divine Confidante: Promoted the unconditional Sense Motive class-skill grant; the scoped +3 hunch bonus stays prose.
  IHQlzOmTVIwJzRJq: {
    classSkills: ["sen"],
    provenance: "Sense Motive is a class skill for you.",
  },
  // Excellent Penmanship: Class-skill grant is unconditional; the forgery DC and the written-message Bluff/Diplomacy/Intimidate bonus lack modeled targets and stay prose.
  G8mq4sMz2tnvCCa3: {
    classSkills: ["lin"],
    provenance: "Linguistics is always a class skill for you.",
  },
  // Faithful Artist (Desna): Promoted the unconditional 'Perform is always a class skill' grant; the +1 bonus stays prose since the text names no fixed Perform instance ("to one Perform skill").
  "6dJhGTcypLMHvghH": {
    classSkills: ["prf"],
    provenance: "Perform is always a class skill for you.",
  },
  // Fatal Trapper (Zyphus): Promoted the unconditional +1 Craft (traps) trait bonus; the Disable Device bonus stays prose (scoped to disabling traps).
  "0BjV14Bc6cvyHi3N": {
    changes: [{ target: "skill.crf.traps", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Craft (traps) checks",
  },
  // Fixer of Odds (Second Darkness): Promoted the unconditional +1 Profession (gambling) trait bonus; the hidden-object search benefit and starting gear stay prose (no target).
  u9yVXpe9U8Ysxaiv: {
    changes: [{ target: "skill.pro.gambling", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Profession (gambling) checks",
  },
  // Flames of Hell (Any Archdevil): Promoted the unconditional +1 channel-energy save DC trait bonus onto abilityDC.channel (ability-dcs.ts); previously blocked on a stale claim that no channel-DC target exists.
  TfCzuODwDA5uUD1F: {
    changes: [{ target: "abilityDC.channel", type: "trait", formula: "1" }],
    provenance:
      "Add 1 to the DC of saving throws made to resist the effects of your channel energy ability.",
  },
  // Folgrit's Bounty (Folgrit): Promoted the unconditional +1 Profession (cook) trait bonus; the nourishing-meal ability stays prose (not a numeric target).
  ZkmQ9OBNeWLFHLNA: {
    changes: [{ target: "skill.pro.cook", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Profession (cook) checks",
  },
  // Footsteps of Aganhei (Crown of the World): Promoted the unconditional Survival class-skill grant; the Fortitude bonus stays prose since it's scoped to resisting cold weather.
  Fo3R2smFAwUr9CLP: {
    classSkills: ["sur"],
    provenance: "Survival is a class skill for you",
  },
  // Freedom Fighter (Halfling): Promoted the unconditional Escape Artist class-skill grant; the +1 bonus is scoped to escaping capture/helping a slave escape, so it stays prose.
  O0lIKhzjIO3JCc3M: {
    classSkills: ["esc"],
    provenance: "Escape Artist is always a class skill for you",
  },
  // Godclaw Disciple (Lawful): Promoted the unconditional Knowledge (religion) class-skill grant; the scoped +2 lawful-deity-lore bonus stays prose.
  F2kamRzSb1xLQyGZ: {
    classSkills: ["kre"],
    provenance: "Additionally, Knowledge (religion) is a class skill for you.",
  },
  // Godless Resolve (Bachuan, Rahadoum, or Touvette; Bard): Promoted the unconditional Heal class-skill grant; the +2 Heal bonus stays prose since it's scoped to stabilizing and stopping bleeding.
  boACTUcQVpLp6X9Q: {
    classSkills: ["hea"],
    provenance: "Heal is a class skill for you",
  },
  // Guerrilla Mender (Nirmathas): Promoted the unconditional Heal class-skill grant; the +1 save bonus stays prose since it applies to an ally, not the character.
  KDLMtcFlc3jgjmYv: {
    classSkills: ["hea"],
    provenance: "Heal is a class skill for you.",
  },
  // Harvester: Promoted the unconditional +1 trait bonus, which the text names on both Profession (tanner) and Profession (trapper); the no-ranks-needed and poison-handling benefits stay prose (no matching target).
  bMt5gOoMWO7XV8wc: {
    changes: [
      { target: "skill.pro.tanner", type: "trait", formula: "1" },
      { target: "skill.pro.trapper", type: "trait", formula: "1" },
    ],
    provenance: "You gain a +1 trait bonus on Profession (tanner) or Profession (trapper) checks",
  },
  // Honor-Driven (Human; Ulfen): Both the +1 Sense Motive bonus and its class-skill grant are unconditional; promoted both.
  "1ALI2ug0pdesx8oA": {
    changes: [{ target: "skill.sen", type: "trait", formula: "1" }],
    classSkills: ["sen"],
    provenance:
      "You gain a +1 trait bonus on Sense Motive checks, and Sense Motive is always a class skill for you.",
  },
  // Infernal Influence (Human): the fire resistance is unconditional; the Fortitude bonus is scoped to poison.
  Z1JWoQqFHyR515rZ: {
    changes: [
      { target: "eres.fire", type: "untyped", formula: "1" },
      { target: "fort", type: "trait", formula: "1", saveCategories: ["poison"] },
    ],
    provenance: "You gain fire resistance 1 and a +1 trait bonus on Fortitude saves against poison",
  },
  // Intense Artist (Shelyn): Promoted the unconditional 'Perform is always a class skill' grant; the +1 bonus stays prose since the text names no fixed instance ("two Perform skills of your choice").
  n0JoCK18sDFA8HIu: {
    classSkills: ["prf"],
    provenance: "Perform is always a class skill for you.",
  },
  // Jungle Native (Mwangi Expanse; Grippli): Promoted the unconditional Survival class-skill grant; the disease/poison save and jungle-terrain initiative bonuses stay prose since both are scoped.
  vZKFL8BM3kID6Qtd: {
    classSkills: ["sur"],
    provenance: "Survival is a class skill for you",
  },
  // Lettered (Halfling): Promoted the unconditional class-skill grant; the +1 bonus is scoped to deciphering unfamiliar writing, so it stays prose.
  s8icn7k6NRIXwcnb: {
    classSkills: ["lin"],
    provenance: "Linguistics is a class skill for you",
  },
  // Librarian (Dark Archive): Promoted the unconditional +1 bonus, which the text names on both Linguistics and Profession (librarian); the choice of which becomes a class skill, plus the once-per-day reading bonus, stay prose.
  DvDOCRNLk3zHSOht: {
    changes: [
      { target: "skill.lin", type: "trait", formula: "1" },
      { target: "skill.pro.librarian", type: "trait", formula: "1" },
    ],
    provenance: "You gain a +1 bonus on Linguistics or Profession (librarian) checks",
  },
  // Lillend's Harp (Aasimar; Musetouched): Promoted the unconditional +1 Perform (string) trait bonus; the bardic-performance +2 upgrade stays prose (conditional).
  BzPMPtnn0DK2cnQJ: {
    changes: [{ target: "skill.prf.string", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Perform (string) checks",
  },
  // Lost Origins (Any City): Promoted the unconditional Knowledge (local) class-skill grant; the take-10 ability isn't a numeric Change and stays prose.
  b4VkNVrZ0xNL9f5W: {
    classSkills: ["klo"],
    provenance: "Knowledge (local) is always a class skill for you",
  },
  // Marked by Nature's Magic (Skinwalker): Promoted the unconditional class-skill grant; both the Diplomacy and Knowledge (nature) bonuses are scoped to fey, so they stay prose.
  Ots6NMyC4CQzKiP8: {
    classSkills: ["kna"],
    provenance: "Knowledge (nature) is always a class skill for you.",
  },
  // Merchant: Class-skill grant is unconditional; the +1 Appraise/Sense Motive bonus is scoped to bargaining and stays prose.
  yuTHO1r0s5k9p61G: {
    classSkills: ["apr"],
    provenance: "Appraise is always a class skill for you.",
  },
  // Merchant's Child (Katapesh): Both the Appraise skill bonus and its class-skill status are unconditional.
  qc0NCRGE5HPZe4HC: {
    changes: [{ target: "skill.apr", type: "trait", formula: "1" }],
    classSkills: ["apr"],
    provenance:
      "You gain a +1 trait bonus on Appraise checks, and Appraise is always a class skill for you.",
  },
  // Mwangi Herbal Tradition (Mwangi Expanse): Promoted the unconditional Heal class-skill grant; the +4 Heal bonus stays prose since it's scoped to long-term care.
  "6rh4DWIxDUAJCvB8": {
    classSkills: ["hea"],
    provenance: "Heal is a class skill for you",
  },
  // Oenopion Alchemist (Nex): Promoted the unconditional +1 Craft (alchemy) trait bonus.
  h3Y7yYus5bF3z90S: {
    changes: [{ target: "skill.crf.alchemy", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Craft (alchemy) checks.",
  },
  // Operatic (Human; Chelaxian): Promoted the unconditional +1 Perform (sing) trait bonus; the ancient-Azlanti Linguistics bonus stays prose (scoped to deciphering that language).
  ftX8GMIMMfVZC3KF: {
    changes: [{ target: "skill.prf.sing", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Perform (sing) checks.",
  },
  // Perfectionist's Brew: Promoted the unconditional +2 Craft (alchemy) trait bonus; the Spellcraft half stays prose since it's scoped to brewing potions.
  Rrh1oZjG47Wf4kTv: {
    changes: [{ target: "skill.crf.alchemy", type: "trait", formula: "2" }],
    provenance: "You gain a +2 trait bonus on all Craft (alchemy) checks",
  },
  // Red Silk Frankness: Class-skill grant is unconditional; the +5 Diplomacy bonus is scoped to overlooking offensive/illegal acts and stays prose.
  r1GEcZjFl3C0XPrq: {
    classSkills: ["dip"],
    provenance: "Diplomacy is always a class skill for you.",
  },
  // Resourceful Alchemy (Thuvia): Promoted the unconditional +2 Craft (alchemy) trait bonus; the +3-while-crafting upgrade stays prose (conditional increase).
  EKFHTQbIXCxGvk7k: {
    changes: [{ target: "skill.crf.alchemy", type: "trait", formula: "2" }],
    provenance: "You gain a +2 trait bonus on Craft (alchemy) skill checks.",
  },
  // Resourceful Scavenger (Numeria): Promoted the unconditional Appraise class-skill grant; the Perception bonus stays prose since it's scoped to searching for valuables.
  VOPq7Q1Q8KYTZXLJ: {
    classSkills: ["apr"],
    provenance: "Appraise is always a class skill for you",
  },
  // Rude Songs (Goblin): Promoted the unconditional class-skill grant (Perform); the +2 Perform (song) bonus stays prose, scoped to being heard and understood by an opponent.
  fH4GY0bWSbG3ZFaz: {
    classSkills: ["prf"],
    provenance: "Perform is always a class skill for you.",
  },
  // Savant (Kitharodian Academy): Grants Perform generally as a class skill, unconditional; the +2 bonus stays prose since the text names no fixed performance type ("chose a performance type").
  jZma1Ler6jlkkXpK: {
    classSkills: ["prf"],
    provenance: "Perform is always a class skill for you.",
  },
  // Self-Taught Scholar: Linguistics becomes a class skill; the +1 Linguistics (unfamiliar languages) and +1 Spellcraft (decipher scroll writing) clauses are both scoped to specific check purposes and stay prose.
  aOv56xnx4t40XmJj: {
    classSkills: ["lin"],
    provenance: "Linguistics is always a class skill for you",
  },
  // Sharp Eyes (Tundra): Unconditional immunity to the dazzled condition (immEffect slug added for it).
  "3MzxKmBEyL0P5jy0": {
    changes: [{ target: "immEffect.dazzled", type: "untyped", formula: "1" }],
    provenance: "You are immune to the dazzled condition.",
  },
  // Ship Aptitude (The Shackles): Both the +1 Profession (sailor) trait bonus and its class-skill grant are unconditional; promoted both.
  gTR3igg1FAccvQYh: {
    changes: [{ target: "skill.pro.sailor", type: "trait", formula: "1" }],
    classSkills: ["pro.sailor"],
    provenance:
      "You gain a +1 trait bonus on Profession (sailor) checks, and Profession (sailor) becomes a class skill for you.",
  },
  // Smuggler: Fixed (non-choice) class skill grant promoted; the +3 Sleight of Hand bonus stays prose since it's scoped to checks made to hide an object.
  UczVHzdFNZl5TZH5: {
    classSkills: ["slt"],
    provenance: "Sleight of Hand is a class skill for you.",
  },
  // Snake Bleeder (Nagajor): Promoted the unconditional 'Craft (alchemy) becomes a class skill' grant; the +2 bonus stays prose since it's scoped to brewing poisons.
  M8cmb4Kf5YXTNsMS: {
    classSkills: ["crf.alchemy"],
    provenance: "Craft (alchemy) becomes a class skill for you.",
  },
  // Snake Handler (Osirion; Apep or Wadjet): Unconditional class skill grant promoted; +2 Fort vs poison stays prose (scoped to poison).
  TKqNhJ93s1chfjU5: {
    classSkills: ["han"],
    provenance: "Handle Animal is always a class skill for you.",
  },
  // Soaring Sprinter: Class skill grant promoted; the +2 Acrobatics bonus stays prose (scoped to balance/jump checks only).
  lWmZ6Lq0BY4hXku2: {
    classSkills: ["acr"],
    provenance: "Acrobatics becomes a class skill for you",
  },
  // Statuesque (Oread): Promoted the unconditional class-skill grant; the +2 Disguise bonus stays prose (scoped to disguising as the chosen stone type).
  E5BnaRSFcRTBEXac: {
    classSkills: ["dis"],
    provenance: "Disguise becomes a class skill for you",
  },
  // Street Wary (Any City): Unconditional class skill grant promoted; +2 Sense Motive stays prose (scoped to getting a hunch).
  gxqfCYfs0CZ1xRl8: {
    classSkills: ["sen"],
    provenance: "Sense Motive is always a class skill for you",
  },
  // Student of Faith (Rise of the Runelords): Promoted the unconditional +1 channel-energy save DC trait bonus; the +1 caster-level bonus on cure spells stays unmodeled (cl is a real Change target elsewhere in the vendored data but isn't folded into any sheet number, see traits.ts).
  wuIVOJSw3KzSjEqQ: {
    changes: [{ target: "abilityDC.channel", type: "trait", formula: "1" }],
    provenance:
      "whenever you channel energy, you gain a +1 trait bonus to the save DC of your channeled energy.",
  },
  // Swamp Rebel (Wanshou): Unconditional class skill grant promoted; +2 Stealth stays prose (scoped to swampy terrain).
  XEcvPIy23VWciRCO: {
    classSkills: ["ste"],
    provenance: "Stealth becomes a class skill for you",
  },
  // Terrifying Lunge (Skinwalker; Werecrocodile-Kin): Promoted the unconditional class-skill grant; the once-per-day demoralize-as-swift-action benefit stays prose.
  aiCMy7zUX7enO10K: {
    classSkills: ["int"],
    provenance: "Intimidate becomes a class skill for you.",
  },
  // The Newlyweds: Class skill grant promoted; the +2 Diplomacy bonus stays prose (scoped to romantically-attracted targets).
  IxmTohfeXP7fUaom: {
    classSkills: ["dip"],
    provenance: "Diplomacy becomes a class skill for you",
  },
  // The Pack: Class skill grant promoted; the +2 Handle Animal bonus stays prose (scoped to teaching tricks).
  dBo1536hNOcsVrka: {
    classSkills: ["han"],
    provenance: "Handle Animal becomes a class skill for you",
  },
  // The Thrush: Both the +1 Perform (sing) bonus and its class-skill grant are unconditional; promoted both.
  WlNEKSh0Q9SwK68w: {
    changes: [{ target: "skill.prf.sing", type: "trait", formula: "1" }],
    classSkills: ["prf.sing"],
    provenance:
      "You gain a +1 bonus on Perform (sing) checks, and Perform (sing) becomes a class skill for you.",
  },
  // Tiger Brigadier (Bachuan): Unconditional class skill grant promoted; +2 Intimidate stays prose (scoped to older creatures).
  jwX5qzs9NjCDFnwW: {
    classSkills: ["int"],
    provenance: "Intimidate becomes a class skill for you",
  },
  // Trap Savvy (Darklands): Promoted the unconditional +1 Craft (traps) trait bonus; the AC/save bonus against traps stays prose (scoped to trap attacks/effects).
  mirSz0FfZTpdcxIw: {
    changes: [{ target: "skill.crf.traps", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Craft (traps) checks",
  },
  // Tribal Guide (Kobold): Promoted the unconditional class-skill grant; the extra-creatures Survival benefit stays prose.
  oHfnyDog5dLH6Ixb: {
    classSkills: ["sur"],
    provenance: "Survival is a class skill for you.",
  },
  // Underbridge Dweller (Varisia; Magnimar): Unconditional class skill grant promoted; +2 Perception stays prose (scoped to dim light).
  Dnk8zlgndsSaf4fF: {
    classSkills: ["per"],
    provenance: "Perception is always a class skill for you",
  },
  // Unnatural Presence (Old Cults): Promoted the unconditional Intimidate class-skill grant; the demoralize-animals/vermin ability stays prose.
  UA9mXIBlcuIJBbay: {
    classSkills: ["int"],
    provenance: "Intimidate is a class skill for you.",
  },
  // Unnatural Revenge: Class-skill grant is unconditional; the +2 Intimidate bonus is scoped to animal/fey/plant creatures and stays prose.
  FpXMpLEpMy45EEYL: {
    classSkills: ["int"],
    provenance: "Intimidate is always a class skill for you.",
  },
  // Urban Acolyte: Promoted the unconditional Knowledge (local) class-skill grant; the subdomain choice stays prose.
  KVXZlBpGnO8dyAsG: {
    classSkills: ["klo"],
    provenance: "You gain Knowledge (local) as a class skill.",
  },
  // Venicaan Medic (Qadira): Unconditional class skill grant promoted; +2 Heal stays prose (scoped to diseases/poisons).
  "2EkVPhPdBAK7oAoN": {
    classSkills: ["hea"],
    provenance: "Heal is always a class skill for you",
  },
  // Warsmith (Dwarf): Promoted the unconditional class-skill grant; the damage bonus against stone/metal/earth materials stays prose (situational).
  AJaJokX6zzw6bidi: {
    classSkills: ["ken"],
    provenance: "Knowledge (engineering) is a class skill for you.",
  },
  // Wild Domesticator (Half-Elf): Promoted the unconditional class-skill grant; the +2 training bonus and bonus trick stay prose (scoped to training an animal).
  oCDyAeVb9CJXQWnO: {
    classSkills: ["han"],
    provenance: "Handle Animal is always a class skill for you.",
  },
  // Young Reformer (War for the Crown): Promoted the unconditional +1 trait bonus on Disable Device and Knowledge (local); the ambiguous class-skill pick between the two and the once-per-day Knowledge (local) substitution stay prose.
  WcpFffrOiCJaH59Z: {
    changes: [
      { target: "skill.dev", type: "trait", formula: "1" },
      { target: "skill.klo", type: "trait", formula: "1" },
    ],
    provenance: "You gain a +1 trait bonus on Disable Device and Knowledge (local) checks",
  },
};

/**
 * `"craft" | "perform" | "profession"` — the same fixed vocabulary as a
 * feat's family choice type (`feat-effects.ts`'s `ChoiceFeatEntry.choice`),
 * reused verbatim so a trait's family axis and a feat's never drift.
 */
export type TraitChoiceFamily = "craft" | "perform" | "profession";

/** A choose-one trait selection, see {@link TRAIT_CHOICES}. */
export interface TraitChoiceEntry {
  /**
   * Either a fixed named-option list (dropdown prompt + option list, same
   * shape rage powers use), or a family axis whose options are the
   * character's OWN Craft/Perform/Profession skill instances — enumerated
   * web-side from `doc.build.skillRanks`, since an instance id like
   * `"crf.alchemy"` can't be known ahead of time the way a fixed option list
   * requires (the trait-choice analog of a feat's `"craft"` / `"perform"` /
   * `"profession"` choice type). A trait whose text spans more than one
   * family ("a Craft, Perform, or Profession skill of your choice") lists
   * every family it draws from; the picker enumerates across all of them.
   */
  choice: PickChoice | { families: readonly TraitChoiceFamily[]; label: string };
  /**
   * Per-option class-skill grants, keyed by option id — the choice-driven
   * counterpart to `ExtractedTraitEntry.classSkills`, consumed by
   * `traitGrantedClassSkills` once a pick is stored. Only meaningful when
   * `choice` is the fixed-option-list shape.
   */
  choiceClassSkills?: Readonly<Record<string, readonly string[]>>;
  /**
   * Per-option typed modifiers, keyed by option id — consumed in
   * `collect.ts`'s trait loop exactly like `ExtractedTraitEntry.changes`,
   * gated on `doc.build.pickChoices["trait:<traitId>"]`. Only meaningful
   * when `choice` is the fixed-option-list shape.
   */
  choiceChanges?: Readonly<Record<string, readonly Change[]>>;
  /**
   * For a family-shaped `choice`: produces the Change(s) for the player's
   * own picked instance id (e.g. `"crf.alchemy"`) — the trait-choice analog
   * of `ChoiceFeatEntry.build(choiceId)` (`feat-effects.ts`), since the
   * instance id can't be enumerated ahead of time the way `choiceChanges`'s
   * fixed option map requires.
   */
  familyChangeTemplate?: (instanceId: string) => readonly Change[];
  /** Family-shaped counterpart to `choiceClassSkills` — same reasoning. */
  familyClassSkillTemplate?: (instanceId: string) => readonly string[];
}

/**
 * `choiceClassSkills` for the common "whichever option is picked becomes a
 * class skill" shape — every option id maps to itself, so the class-skill
 * grant always matches the chosen skill.
 */
function classSkillPerOption(
  options: readonly { id: string }[],
): Record<string, readonly string[]> {
  return Object.fromEntries(options.map((o) => [o.id, [o.id]]));
}

/**
 * `choiceChanges` for the common "whichever option is picked gets the same
 * flat trait bonus" shape — every option id becomes its own `skill.<id>`
 * target.
 */
function flatBonusPerOption(
  options: readonly { id: string }[],
  formula: string,
): Record<string, readonly Change[]> {
  return Object.fromEntries(
    options.map((o) => [o.id, [{ target: `skill.${o.id}`, type: "trait", formula }]]),
  );
}

/**
 * Builds a fixed-menu `TraitChoiceEntry` for the majority shape in this
 * table: "choose X, Y, or Z" where the picked skill becomes a class skill
 * and/or gets a flat trait bonus, with option ids doubling as `skill.<id>`
 * targets (see {@link classSkillPerOption}/{@link flatBonusPerOption}).
 * Entries whose two options grant DIFFERENT kinds of benefit (e.g. Drug
 * Addict's Knowledge bonus vs. a Fortitude save bonus) are hand-authored
 * instead, since the per-option map isn't uniform.
 */
function skillChoiceEntry(
  label: string,
  options: readonly { id: string; label: string }[],
  config: { classSkill?: boolean; bonusFormula?: string },
): TraitChoiceEntry {
  const entry: TraitChoiceEntry = { choice: { label, options } };
  if (config.classSkill) entry.choiceClassSkills = classSkillPerOption(options);
  if (config.bonusFormula) entry.choiceChanges = flatBonusPerOption(options, config.bonusFormula);
  return entry;
}

/**
 * The 10 Knowledge subtypes (PF1 CRB) — the fixed menu for a trait whose
 * text says "choose any Knowledge skill". Unlike Craft/Perform/Profession,
 * Knowledge subtypes are a closed, engine-known vocabulary (`skill.k*`
 * targets already used throughout this table), so "any Knowledge skill" is
 * a fixed-menu choice, not a family/own-instance one.
 */
const KNOWLEDGE_SKILLS: readonly { id: string; label: string }[] = [
  { id: "kar", label: "Knowledge (arcana)" },
  { id: "kdu", label: "Knowledge (dungeoneering)" },
  { id: "ken", label: "Knowledge (engineering)" },
  { id: "kge", label: "Knowledge (geography)" },
  { id: "khi", label: "Knowledge (history)" },
  { id: "klo", label: "Knowledge (local)" },
  { id: "kna", label: "Knowledge (nature)" },
  { id: "kno", label: "Knowledge (nobility)" },
  { id: "kpl", label: "Knowledge (planes)" },
  { id: "kre", label: "Knowledge (religion)" },
];

/**
 * `familyChangeTemplate` for the common "flat trait bonus to whichever
 * Craft/Perform/Profession instance is picked" shape.
 */
function flatFamilyBonus(formula: string): (instanceId: string) => readonly Change[] {
  return (instanceId) => [{ target: `skill.${instanceId}`, type: "trait", formula }];
}

/** `familyClassSkillTemplate` for "the picked instance becomes a class skill" — the instance id IS the class-skill id. */
function familyClassSkill(instanceId: string): readonly string[] {
  return [instanceId];
}

/**
 * Hand-authored table for traits whose fixed-menu choice RAW locks in when
 * the trait is taken (a skill-vs-skill class-skill grant, an own-instance
 * Craft/Perform/Profession pick). The player's selection lives in
 * `doc.build.pickChoices["trait:<traitId>"]`, same posture as the rage-power
 * `choice`/`choiceChanges` pattern this mirrors: no stored pick, or a stale
 * option id, emits nothing. Separate from `TraitDef`/`ExtractedTraitEntry`
 * (rather than a field there) since a hand-authored `TRAITS` entry could
 * just as easily need this axis — keeping it name-space-keyed by trait id
 * lets one table serve both catalogs.
 *
 * A trait offering a choice between two DIFFERENT benefit shapes (a skill
 * bonus in one branch, a save bonus in the other) is hand-authored directly
 * rather than through `skillChoiceEntry`; the option ids then name the
 * benefit ("addicted-friend"), not a skill.
 *
 * A trait's choice tied to campaign flavor (which of two named NPCs is the
 * character's best friend, which of several in-fiction "questions" the
 * character picks) is flattened to just the mechanical skill choice the
 * flavor gates — the flavor itself isn't tracked anywhere on the sheet, so
 * recording it here would be unusable trivia.
 */
export const TRAIT_CHOICES: Readonly<Record<string, TraitChoiceEntry>> = {
  // Deep Cover: "Bluff or Disguise (your choice) is a class skill for you."
  // The always-on "take 10 to assume/maintain your cover identity" clause
  // for both skills stays prose (already carried as vendored contextNotes).
  "9QVXtD2lZkIzyBt5": {
    choice: {
      label: "Class skill",
      options: [
        { id: "blf", label: "Bluff" },
        { id: "dis", label: "Disguise" },
      ],
    },
    choiceClassSkills: { blf: ["blf"], dis: ["dis"] },
  },

  // Ancient Historian: "Choose either Knowledge (history) or Linguistics.
  // That skill becomes a class skill for you" — the bonus language stays
  // prose (no language-known target).
  HF99WVZ2z8QpQ55n: skillChoiceEntry(
    "Class skill",
    [
      { id: "khi", label: "Knowledge (history)" },
      { id: "lin", label: "Linguistics" },
    ],
    { classSkill: true },
  ),

  // Antiquities Smuggler: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  tcVTjbd9IzRKoB8c: skillChoiceEntry(
    "Class skill",
    [
      { id: "apr", label: "Appraise" },
      { id: "blf", label: "Bluff" },
      { id: "slt", label: "Sleight of Hand" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Arcane Scholar: both the +1 bonus and class-skill grant are
  // unconditional across both options.
  BFxpg1EJ0iDaMerr: skillChoiceEntry(
    "Class skill",
    [
      { id: "kar", label: "Knowledge (arcana)" },
      { id: "spl", label: "Spellcraft" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Athletic: the +1 bonus to the chosen skill is unconditional; the
  // level-scaling armor-check-penalty reduction stays prose (see the
  // matching TRAIT_PROMOTION_BLOCKERS entry).
  vu5DPmp9Rhtsv4L7: skillChoiceEntry(
    "Skill",
    [
      { id: "acr", label: "Acrobatics" },
      { id: "clm", label: "Climb" },
      { id: "swm", label: "Swim" },
    ],
    { bonusFormula: "1" },
  ),

  // Bandit: both the +1 bonus and class-skill grant are unconditional
  // across all three options.
  vcxXn1UJsH0lmdxx: skillChoiceEntry(
    "Class skill",
    [
      { id: "esc", label: "Escape Artist" },
      { id: "int", label: "Intimidate" },
      { id: "ste", label: "Stealth" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Best Friend: RAW ties the skill choice to which NPC (Ameiko/Sandru) is
  // the character's best friend, but the NPC pick isn't tracked anywhere on
  // the sheet — flattened to the mechanical skill choice it gates. The
  // attack-roll bonus against foes threatening the friend stays prose
  // (scoped, and depends on the same untracked NPC pick).
  UWmFY5dlVf4ihZzV: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "blf", label: "Bluff" },
    ],
    { classSkill: true, bonusFormula: "2" },
  ),

  // Captain's Blade: the class-skill grant is unconditional; the +1 bonus
  // is scoped to being aboard a vessel and stays prose.
  "6qNkPwLOppYYEoKG": skillChoiceEntry(
    "Class skill",
    [
      { id: "acr", label: "Acrobatics" },
      { id: "clm", label: "Climb" },
    ],
    { classSkill: true },
  ),

  // Clan Artisan: both the +2 bonus and class-skill grant are unconditional
  // for the chosen Craft instance.
  JxJr7ofe0yC95eDJ: {
    choice: { families: ["craft"], label: "Craft skill" },
    familyChangeTemplate: flatFamilyBonus("2"),
    familyClassSkillTemplate: familyClassSkill,
  },

  // Conspiracy Hunter: both the +1 bonus and class-skill grant are
  // unconditional across all six options.
  NqrxCiaPQcgE6Ir1: skillChoiceEntry(
    "Class skill",
    [
      { id: "blf", label: "Bluff" },
      { id: "dip", label: "Diplomacy" },
      { id: "klo", label: "Knowledge (local)" },
      { id: "per", label: "Perception" },
      { id: "sen", label: "Sense Motive" },
      { id: "ste", label: "Stealth" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Criminal: both the +1 bonus and class-skill grant are unconditional
  // across all three options.
  Qj7YQSJBSAdtotyi: skillChoiceEntry(
    "Class skill",
    [
      { id: "dev", label: "Disable Device" },
      { id: "int", label: "Intimidate" },
      { id: "slt", label: "Sleight of Hand" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Criminal Roots: the class-skill grant is unconditional; both directional
  // bonuses (+2 vs criminals / -2 vs law-abiding citizens for Diplomacy, +2
  // vs law-abiding citizens for Intimidate) are scoped and stay prose.
  RaDdRoDgqpqht14i: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "int", label: "Intimidate" },
    ],
    { classSkill: true },
  ),

  // Crocodile Swim: the class-skill grant is unconditional; the +2 bonus is
  // scoped to swimming underwater at half speed or less and stays prose.
  eZZ8d8ZDWD0WtluA: skillChoiceEntry(
    "Class skill",
    [
      { id: "swm", label: "Swim" },
      { id: "ste", label: "Stealth" },
    ],
    { classSkill: true },
  ),

  // Darklands Trader: the class-skill grant is unconditional; both bonuses
  // are scoped (subterranean trade / subterranean creatures) and stay prose.
  zGc6FMFSliXxASGn: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "kdu", label: "Knowledge (dungeoneering)" },
    ],
    { classSkill: true },
  ),

  // Drug Addict: a choice between two DIFFERENT benefit shapes (a Knowledge
  // skill bonus + class skill, or a flat Fortitude save bonus) — hand-
  // authored since the per-option map isn't uniform.
  ox1UTgNrZAGHFm6C: {
    choice: {
      label: "Benefit",
      options: [
        { id: "addicted-friend", label: "Addicted Friend (Knowledge [local])" },
        { id: "personal-addiction", label: "Personal Addiction (Fortitude saves)" },
      ],
    },
    choiceClassSkills: { "addicted-friend": ["klo"] },
    choiceChanges: {
      "addicted-friend": [{ target: "skill.klo", type: "trait", formula: "1" }],
      "personal-addiction": [{ target: "fort", type: "trait", formula: "1" }],
    },
  },

  // Eager Performer: the +1 bonus to the chosen Perform instance is
  // unconditional; the enchantment-spell DC bonus has no modeled target and
  // stays prose.
  yAJ5AiuQ7VjXcE57: {
    choice: { families: ["perform"], label: "Perform skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Ear for Music: the +1 bonus to the chosen Perform instance is
  // unconditional; the Knowledge (local) bonus is scoped to local art/music
  // and stays prose.
  Ti2NJqJGlR2V6kkR: {
    choice: { families: ["perform"], label: "Perform category" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Exchange Agent: both the +1 bonus and class-skill grant are
  // unconditional across all four options; the bonus language stays prose.
  GK6bsGYZmHqmeVIP: skillChoiceEntry(
    "Class skill",
    [
      { id: "han", label: "Handle Animal" },
      { id: "kge", label: "Knowledge (geography)" },
      { id: "lin", label: "Linguistics" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Extremely Fashionable: the class-skill grant is unconditional; the +1
  // bonus is scoped to wearing 150gp+ clothing/jewelry and stays prose.
  bFnoGpzagyh3XaiJ: skillChoiceEntry(
    "Class skill",
    [
      { id: "blf", label: "Bluff" },
      { id: "dip", label: "Diplomacy" },
      { id: "int", label: "Intimidate" },
    ],
    { classSkill: true },
  ),

  // Eye of the Father: the +1 bonus to the chosen Craft instance is
  // unconditional.
  moclT0r65vok8IGF: {
    choice: { families: ["craft"], label: "Craft skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Fashionable: the class-skill grant is unconditional; the +1 bonus is
  // scoped to wearing 80gp+ clothing/jewelry and stays prose.
  l0VpMJxS7dwcZC2p: skillChoiceEntry(
    "Class skill",
    [
      { id: "blf", label: "Bluff" },
      { id: "dip", label: "Diplomacy" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true },
  ),

  // Fey Mediator: the class-skill grant is unconditional (bonus language
  // stays prose).
  JPDir28iBA15cfmU: skillChoiceEntry(
    "Class skill",
    [
      { id: "blf", label: "Bluff" },
      { id: "dip", label: "Diplomacy" },
      { id: "kna", label: "Knowledge (nature)" },
    ],
    { classSkill: true },
  ),

  // Fiend Blood: both the +1 bonus and class-skill grant are unconditional
  // across all three options.
  oCZtSfu7f9E3KzEd: skillChoiceEntry(
    "Class skill",
    [
      { id: "blf", label: "Bluff" },
      { id: "int", label: "Intimidate" },
      { id: "kpl", label: "Knowledge (planes)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Foster Child: both the +2 bonus and class-skill grant are unconditional
  // across any Knowledge subtype; the attack-roll bonus vs. foes threatening
  // the adoptive mother stays prose (scoped).
  zrbKrP4BTsL6H7Z2: skillChoiceEntry("Knowledge skill", KNOWLEDGE_SKILLS, {
    classSkill: true,
    bonusFormula: "2",
  }),

  // Framed: a choice between two backstory branches (Dropout/Family Honor)
  // that both resolve to the same shape (a +1 bonus + class skill on a
  // named skill) — flattened to the mechanical skill choice.
  VUOfSY91afNk3jP3: skillChoiceEntry(
    "Class skill",
    [
      { id: "spl", label: "Spellcraft" },
      { id: "blf", label: "Bluff" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Hwan Artist: both the +1 bonus and class-skill grant are unconditional
  // for the chosen Perform instance.
  VLZ4HsXD2ofvrrnt: {
    choice: { families: ["perform"], label: "Perform skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
    familyClassSkillTemplate: familyClassSkill,
  },

  // Imperial Soldier: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  "6OpE9s4ISLffIXFU": skillChoiceEntry(
    "Class skill",
    [
      { id: "hea", label: "Heal" },
      { id: "int", label: "Intimidate" },
      { id: "rid", label: "Ride" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Indentured Blacksmith: both the +1 bonus and class-skill grant are
  // unconditional for either named Craft subtype.
  sIKYG512BdRbtROD: skillChoiceEntry(
    "Class skill",
    [
      { id: "crf.armor", label: "Craft (armor)" },
      { id: "crf.weapons", label: "Craft (weapons)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Influence: both the +1 bonus and class-skill grant are unconditional
  // across all three options.
  "5P5X8CEltfkvh05t": skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "int", label: "Intimidate" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Insider Knowledge: both the +1 bonus and class-skill grant are
  // unconditional across both options.
  "1Rk3X3Mp4OPSI3eX": skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "klo", label: "Knowledge (local)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Jenivere Crew: both the +1 bonus and class-skill grant are unconditional
  // across all six options.
  lCvkltyrJy58VUlY: skillChoiceEntry(
    "Class skill",
    [
      { id: "acr", label: "Acrobatics" },
      { id: "clm", label: "Climb" },
      { id: "kna", label: "Knowledge (nature)" },
      { id: "kge", label: "Knowledge (geography)" },
      { id: "swm", label: "Swim" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Love Lost: a choice between two backstory branches (All Alone/Orphaned)
  // that both resolve to the same shape (a +1 bonus + class skill on a
  // named skill) — flattened to the mechanical skill choice.
  YraEYEO6Uk4631AF: skillChoiceEntry(
    "Class skill",
    [
      { id: "int", label: "Intimidate" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Mentored: the +1 bonus to the chosen Craft/Perform/Profession instance
  // is unconditional; the +1 aid-another bonus has no matching target and
  // stays prose.
  "6DNJXAzSS3gjCfNU": {
    choice: {
      families: ["craft", "perform", "profession"],
      label: "Craft, Perform, or Profession skill",
    },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Militia Veteran: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  q7Yn8LrdhIZDmaFI: skillChoiceEntry(
    "Class skill",
    [
      { id: "pro.soldier", label: "Profession (soldier)" },
      { id: "rid", label: "Ride" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Missing Child: a choice between two DIFFERENT benefit shapes (two class
  // skills with no bonus, or a flat Will save bonus with no class skill) —
  // hand-authored since the per-option map isn't uniform.
  "17mo4Jjxp01HsKnN": {
    choice: {
      label: "Benefit",
      options: [
        { id: "missing-sibling", label: "Missing Sibling (Diplomacy + Sense Motive class skills)" },
        { id: "missing-child", label: "Missing Son or Daughter (+1 Will saves)" },
      ],
    },
    choiceClassSkills: { "missing-sibling": ["dip", "sen"] },
    choiceChanges: {
      "missing-child": [{ target: "will", type: "trait", formula: "1" }],
    },
  },

  // Natural Negotiator: the class-skill grant is unconditional (bonus
  // language stays prose).
  hW5fCziKoigBBaEw: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "han", label: "Handle Animal" },
    ],
    { classSkill: true },
  ),

  // Nightstalls Navigator: the class-skill grant is unconditional; the +2
  // bonus is scoped (gathering information / recalling criminal activity)
  // and stays prose.
  fhCUhy3sAwL6yqe2: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "klo", label: "Knowledge (local)" },
    ],
    { classSkill: true },
  ),

  // Nirmathi Militia: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  "2xZIcouMacp69nia": skillChoiceEntry(
    "Class skill",
    [
      { id: "pro.soldier", label: "Profession (soldier)" },
      { id: "rid", label: "Ride" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Obnoxious: both the +1 bonus and class-skill grant are unconditional
  // across all four named Perform subtypes.
  "8d0wj44WfW4FalFk": skillChoiceEntry(
    "Class skill",
    [
      { id: "prf.act", label: "Perform (act)" },
      { id: "prf.comedy", label: "Perform (comedy)" },
      { id: "prf.oratory", label: "Perform (oratory)" },
      { id: "prf.sing", label: "Perform (sing)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Observant: both the +1 bonus and class-skill grant are unconditional
  // across both options.
  mN0oMRntDWY0RS2O: skillChoiceEntry(
    "Class skill",
    [
      { id: "per", label: "Perception" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Performance Artist: both the +1 bonus and class-skill grant are
  // unconditional for the chosen Perform instance.
  uuC76sH2BLdP32hu: {
    choice: { families: ["perform"], label: "Perform type" },
    familyChangeTemplate: flatFamilyBonus("1"),
    familyClassSkillTemplate: familyClassSkill,
  },

  // Pioneer: the +1 bonus to the chosen skill is unconditional (no
  // class-skill grant in the text); the free starting horse stays prose.
  BOr7byk7DKy82ktZ: skillChoiceEntry(
    "Skill",
    [
      { id: "clm", label: "Climb" },
      { id: "han", label: "Handle Animal" },
      { id: "kna", label: "Knowledge (nature)" },
      { id: "per", label: "Perception" },
      { id: "rid", label: "Ride" },
      { id: "sur", label: "Survival" },
      { id: "swm", label: "Swim" },
    ],
    { bonusFormula: "1" },
  ),

  // Proper Training: both the +1 bonus and class-skill grant are
  // unconditional across both options.
  RPvqNLAqKYYyYgKN: skillChoiceEntry(
    "Class skill",
    [
      { id: "kge", label: "Knowledge (geography)" },
      { id: "khi", label: "Knowledge (history)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Regional Influence - Korvosa: the +1 bonus to the chosen Profession
  // instance is unconditional; the Infernal-language / conditional
  // Diplomacy bonus stays prose.
  UNEA8OGKTfw7UdSb: {
    choice: { families: ["profession"], label: "Profession skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Regional Influence - Magnimar: the +1 bonus to the chosen Profession
  // instance is unconditional; the random Varisian Idol has no target and
  // stays prose.
  PEF5ztrAhR9wRIOa: {
    choice: { families: ["profession"], label: "Profession skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Resourceful (Ruins of Azlant): the +1 bonus to the chosen Craft/
  // Profession instance is unconditional; the magic-item-crafting-time
  // formula isn't in the allowed formula shapes and stays prose.
  lQImhTgz83PtuqTq: {
    choice: { families: ["craft", "profession"], label: "Craft or Profession skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // River Navigator: the class-skill grant is unconditional; the +1 bonus is
  // scoped to lakes/rivers navigation and stays prose.
  TGgaGH1R6y2a2h50: skillChoiceEntry(
    "Class skill",
    [
      { id: "sur", label: "Survival" },
      { id: "pro.sailor", label: "Profession (sailor)" },
    ],
    { classSkill: true },
  ),

  // Rousing Oratory: the class-skill grant is unconditional across all four
  // named Perform subtypes; the once-per-day fear-save bonus is a limited
  // resource and stays prose.
  bmqio2OUbI5wr63c: skillChoiceEntry(
    "Class skill",
    [
      { id: "prf.act", label: "Perform (act)" },
      { id: "prf.comedy", label: "Perform (comedy)" },
      { id: "prf.oratory", label: "Perform (oratory)" },
      { id: "prf.sing", label: "Perform (sing)" },
    ],
    { classSkill: true },
  ),

  // Sacred Orienteer: the class-skill grant is unconditional; the once-per-
  // day +2 bonus is a limited resource and stays prose.
  SZKvxA7z5d5buqZj: skillChoiceEntry(
    "Class skill",
    [
      { id: "kge", label: "Knowledge (geography)" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true },
  ),

  // Savanna Child: both the +1 bonus and class-skill grant are unconditional
  // across all three options.
  sAbofD3PaNMuCxW3: skillChoiceEntry(
    "Class skill",
    [
      { id: "han", label: "Handle Animal" },
      { id: "kna", label: "Knowledge (nature)" },
      { id: "rid", label: "Ride" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Secret Knowledge: both the permanent +2 bonus and class-skill grant are
  // unconditional across any Knowledge subtype.
  OGSwFuCBoB2ouaw7: skillChoiceEntry("Knowledge skill", KNOWLEDGE_SKILLS, {
    classSkill: true,
    bonusFormula: "2",
  }),

  // Secrets of the Sphinx: the class-skill grant is unconditional across any
  // Knowledge subtype; the once-per-day +2 bonus is a limited resource and
  // stays prose.
  wbPR6KmhVPml7OJ5: skillChoiceEntry("Knowledge skill", KNOWLEDGE_SKILLS, { classSkill: true }),

  // Shared Ancestors: the class-skill grant is unconditional; the +1 bonus
  // is scoped to creatures sharing the character's type/subtype and stays
  // prose.
  uL1GXmNtwAumM7mW: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "khi", label: "Knowledge (history)" },
      { id: "klo", label: "Knowledge (local)" },
      { id: "kno", label: "Knowledge (nobility)" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true },
  ),

  // Shoanti Tribesman: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  ZBGxphjICOSSmJpJ: skillChoiceEntry(
    "Class skill",
    [
      { id: "clm", label: "Climb" },
      { id: "sur", label: "Survival" },
      { id: "swm", label: "Swim" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Simple Disciple: the +1 bonus to the chosen Craft/Profession instance is
  // unconditional (no class-skill grant in the text).
  kSWn6n85f2LXcdaf: {
    choice: { families: ["craft", "profession"], label: "Craft or Profession skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Sophisticated Citizen: the class-skill grant is unconditional (bonus
  // language stays prose).
  st7jCOWVZl2ZIdXU: skillChoiceEntry(
    "Class skill",
    [
      { id: "kge", label: "Knowledge (geography)" },
      { id: "klo", label: "Knowledge (local)" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true },
  ),

  // Style Sage: both the +1 bonus and class-skill grant are unconditional
  // across both options; the +1 Diplomacy bonus is scoped (monk lore) and
  // stays prose.
  ihyCI3SlWPQ0vrxz: skillChoiceEntry(
    "Class skill",
    [
      { id: "klo", label: "Knowledge (local)" },
      { id: "khi", label: "Knowledge (history)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Tattooed Focus: both the +2 bonus and class-skill grant are
  // unconditional for the chosen Craft/Perform/Profession instance.
  Y99VFesddmNwLMaq: {
    choice: {
      families: ["craft", "perform", "profession"],
      label: "Craft, Perform, or Profession skill",
    },
    familyChangeTemplate: flatFamilyBonus("2"),
    familyClassSkillTemplate: familyClassSkill,
  },

  // Teacher's Pet: both the +2 bonus and class-skill grant are unconditional
  // across any Knowledge subtype.
  YcrEc7YFQb3etpNV: skillChoiceEntry("Knowledge skill", KNOWLEDGE_SKILLS, {
    classSkill: true,
    bonusFormula: "2",
  }),

  // The Stranger: the class-skill grant is unconditional; the +1 bonus is
  // scoped to gathering information and stays prose.
  dXEOBz7U0qUejTF0: skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "klo", label: "Knowledge (local)" },
    ],
    { classSkill: true },
  ),

  // Trade Talk: the +1 bonus to the chosen Craft/Profession instance is
  // unconditional; the Bluff/Sense Motive bonus is scoped (dealing with
  // people in that craft/profession's context) and stays prose.
  yNxu4hza4zvZsacK: {
    choice: { families: ["craft", "profession"], label: "Craft or Profession skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Treasure Mapper: the class-skill grant is unconditional; the +2 bonus is
  // scoped to navigating with a map/chart and stays prose.
  z1t64ka0ea7Jbvqk: skillChoiceEntry(
    "Class skill",
    [
      { id: "sur", label: "Survival" },
      { id: "pro.sailor", label: "Profession (sailor)" },
    ],
    { classSkill: true },
  ),

  // Trouper: the +1 bonus to the chosen Perform instance is unconditional;
  // the save bonus vs. Perform-reliant abilities is scoped and stays prose.
  nT9MNZhXWIvzAa5D: {
    choice: { families: ["perform"], label: "Perform skill" },
    familyChangeTemplate: flatFamilyBonus("1"),
  },

  // Unwelcome Business: both the +1 bonus and class-skill grant are
  // unconditional across both options; the species-specific Disguise
  // exemption stays prose.
  P9yTZ3R8nMJnuCeo: skillChoiceEntry(
    "Class skill",
    [
      { id: "dis", label: "Disguise" },
      { id: "slt", label: "Sleight of Hand" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Urban Sleuth: RAW nests a "focus question" choice ahead of the
  // Knowledge-skill choice, but only the FINAL Knowledge skill affects the
  // sheet (the once-per-day reroll ability stays prose, scoped to the
  // question's own pair) — flattened to the four reachable Knowledge
  // subtypes.
  LrK0lPy2YCpx5kEZ: skillChoiceEntry(
    "Class skill",
    [
      { id: "kar", label: "Knowledge (arcana)" },
      { id: "kpl", label: "Knowledge (planes)" },
      { id: "khi", label: "Knowledge (history)" },
      { id: "klo", label: "Knowledge (local)" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Vagabond Child: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  "8xC24OEPHzEpa6Sv": skillChoiceEntry(
    "Class skill",
    [
      { id: "dev", label: "Disable Device" },
      { id: "esc", label: "Escape Artist" },
      { id: "slt", label: "Sleight of Hand" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // Wary: the class-skill grant is unconditional; the +1 bonus is scoped to
  // opposed checks and stays prose.
  sOp5mGcos8QiNBgS: skillChoiceEntry(
    "Class skill",
    [
      { id: "per", label: "Perception" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true },
  ),

  // Wisdom in the Flesh: the class-skill grant is unconditional across every
  // Strength/Dexterity-based skill (PF1 has no Constitution-based skill);
  // the Wisdom-for-that-ability substitution isn't an additive bonus and
  // stays prose.
  CbX5iMc8v5obzSO5: skillChoiceEntry(
    "Class skill",
    [
      { id: "clm", label: "Climb" },
      { id: "swm", label: "Swim" },
      { id: "acr", label: "Acrobatics" },
      { id: "dev", label: "Disable Device" },
      { id: "esc", label: "Escape Artist" },
      { id: "fly", label: "Fly" },
      { id: "rid", label: "Ride" },
      { id: "slt", label: "Sleight of Hand" },
      { id: "ste", label: "Stealth" },
    ],
    { classSkill: true },
  ),

  // Witness to Nature's Cruelty: the class-skill grant is unconditional; the
  // +1 bonus is scoped to checks made on behalf of others and stays prose.
  nFUnPDfh1S8GP6kC: skillChoiceEntry(
    "Class skill",
    [
      { id: "hea", label: "Heal" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true },
  ),

  // World Traveler: both the +1 bonus and class-skill grant are
  // unconditional across all three options.
  "31bcAnnrcuQ2BOCN": skillChoiceEntry(
    "Class skill",
    [
      { id: "dip", label: "Diplomacy" },
      { id: "klo", label: "Knowledge (local)" },
      { id: "sen", label: "Sense Motive" },
    ],
    { classSkill: true, bonusFormula: "1" },
  ),

  // World-Weary: the class-skill grant is unconditional (no flat bonus in
  // the text); the aid-another AC upgrade stays prose.
  XPYysJL6CgpILlRe: skillChoiceEntry(
    "Class skill",
    [
      { id: "apr", label: "Appraise" },
      { id: "hea", label: "Heal" },
      { id: "khi", label: "Knowledge (history)" },
      { id: "sen", label: "Sense Motive" },
      { id: "sur", label: "Survival" },
    ],
    { classSkill: true },
  ),
};

/**
 * Prose-only traits the sweep found to carry a genuinely unconditional
 * published number that still cannot be promoted — each value names the
 * missing axis, so future mechanism work can find its candidates here
 * (the same inline-blocker convention the class-subsystem tables use). A
 * fixed skill-vs-skill choice, or an own-instance Craft/Perform/Profession
 * pick, is what `TRAIT_CHOICES` above already covers — what remains here is
 * a choice `TRAIT_CHOICES`' two shapes can't record (a multi-select "pick
 * two of these four", a fully open "any skill" choice, a save-category pick,
 * an ability-score-substitution mechanic, or a choice tangled with an
 * untracked sub-pick like favored enemy or racial heritage), a bonus scoped
 * to a specific circumstance rather than unconditional, or a caster-level /
 * concentration / channel-DC / per-day-resource number with no sheet target.
 *
 * Everything else in the prose-only catalog is situational by its own
 * text and is not listed: display-only is the default, not a blocker.
 */
export const TRAIT_PROMOTION_BLOCKERS: Readonly<Record<string, string>> = {
  // Alabaster Odalisque (Jalmeray)
  hEGGJ7aXifksH1i4: "player-choice skill target (two Charisma-based skills)",
  // Alchemical Adept
  Vef8nEILiKKTeS98:
    "scoped to Craft (alchemy) checks made to craft alchemical items, not unconditional",
  // Alchemical Intuition
  SrTIed0khcWjOSH5:
    "once-per-day resource bonus equal to Charisma modifier, not a flat expressible number",
  // Alchemical Prodigy (Thuvia)
  IHbJ1eBqJI94yvUv: "no target for effective alchemist level / extract duration",
  // Ascendant Recollection
  AONVPiyrMqBpvDUY:
    "Effective sorcerer-level bonus to a bloodline power; caster-level-style value has no target.",
  // Athletic (Ruins of Azlant)
  vu5DPmp9Rhtsv4L7:
    "the level-scaling armor-check-penalty reduction on Acrobatics/Climb/Swim checks isn't in the allowed formula shapes",
  // Athletic Champion (War for the Crown)
  R0v0Gjlc2mR1IDjy: "player choice of skills (pick two of Climb/Diplomacy/Perception/Swim)",
  // Audrahni's Ally (Return of the Runelords)
  rw9a3EK6h62WVIo5:
    "player/GM choice of which saving throw (Fortitude/Reflex/Will) the bonus applies to",
  // Berserker of the Society (Barbarian, Pathfinder Society)
  KlwS1tJ7WyRBohli: "unconditional rage-rounds increase has no resource-pool target",
  // Bladed Magic
  Pd6vVQCaRD8nQO0H:
    "scoped to Craft checks made to craft magic or masterwork weapons, not unconditional",
  // Boarded in the Shackles (Serpent's Skull)
  "12bZB6ikwM5D8sE6": "player choice of saving-throw category",
  // Brevoy Bandit (Mivon)
  Z4oPfA7oHukblDCv:
    "player-choice Profession skill and ability score; adds the chosen ability's modifier, not an expressible flat bonus",
  // Chosen Child (Po Li)
  "7rIYvovfydKLMJ52": "starting wealth is not a modeled target",
  // Coin Hoarder (Mindspin Mountains)
  lReYaGNTl1SEPczq: "starting wealth is not a modeled target",
  // Cunning Liar (Any City)
  unv2smjzMnDXHpcr: "ability-substitution mechanic, not an additive bonus",
  // Distance Aptitude
  "6ZGdu6NbIl8nuRcc":
    "Unconditional caster level bonus (spell/SLA range); caster level has no target.",
  // Dockside Brawler (Skull and Shackles)
  BvOs10q0JnObynEk:
    "weapon-specific damage bonus (brass knuckles/improvised weapons only), no per-weapon target",
  // Empathic Diplomat (Qadira, Osirion)
  OBuaWV4mNvcYfOkr: "ability-substitution mechanic, not an additive bonus",
  // Enduring Spellcraft (Human; Azlanti)
  VWCiAgcpksSqAgHm: "unconditional caster level bonus has no modelable target",
  // Exalted of the Society (Cleric, Pathfinder Society)
  K9jDY7MNr8t7Lcue:
    "Extra daily channel-energy use; no resource-count target for bonus daily uses.",
  // Family Trade
  QCTPDU21TE7P7bSe: "Class skill grant is a player choice of skill, not expressible.",
  // Focused Burn
  "9yeh2oXP6rvnMYN7":
    "Bomb fire-damage bonus scales with the bomb's own damage dice; not an allowed formula shape.",
  // Freedom Fighter (Shokuro)
  hl4mVwmHWZmr6giU: "attack bonus restricted to improvised weapons; no per-weapon-type target axis",
  // Half-Forgotten Secrets (Dhampir; Ajibachana)
  XBBpInwgEwEF3oxJ: "player-choice class skill (two Knowledge skills of your choice)",
  // Heirloom Weapon
  ZwrTOQ8E9LLIuU7D:
    "Player-chosen benefit (proficiency, AoO bonus, or maneuver bonus) tied to one specific named weapon; no weapon-specific target.",
  // Honored Fist of the Society (Monk, Pathfinder Society)
  X3y66cCksYNc6BXv: "unconditional ki-pool increase has no resource-pool target",
  // Iadaran Illusionist (Kyonin)
  Rd7slvsJEXaGO2j5: "caster level check bonus; no CL-check target axis",
  // Insatiable
  JVm2TQpldUHQxyoN:
    "Unconditional 10% price increase and doubled food/water needs have no matching cost/consumption target.",
  // Inspired by Greatness (Carrion Crown)
  NnfHhF5ZSjLNqNDU: "caster level bonus for one chosen spell, no CL target",
  // Knowing the Enemy
  XwfVSmvP6cN3zjxn:
    "class skill depends on the character's favored-enemy choice, not resolvable from trait text alone",
  // Kwanlai Believer (Kwanlai)
  AnqZ2VVdYfcaXJZ4: "concentration check bonus; no concentration-check target axis",
  // Maestro of the Society (Bard, Pathfinder Society)
  foQQ5u7PzJ2ZtS4b: "bardic performance rounds/day has no modeled target axis",
  // Magic's Might (Yuelral)
  NBsYSWdn835899p1:
    "unconditional +1 on caster level checks to overcome spell resistance - no caster-level target on the allowlist",
  // Mechanical Expertise (Alkenstar)
  G9VCGvbhixzz5ocJ:
    "mixed choice: two fixed skills (Disable Device, Knowledge engineering) plus an open Craft-any option - no single axis spans a fixed menu and an own-instance family together",
  // Mizu Ki Hikari Rebel (Chu Ye)
  Bw67YegF2jNCVz9g: "damage bonus restricted to unarmed attacks; no per-weapon-type target axis",
  // Monk Weapon Skill
  p14IPgYSoWNp37pW: "damage bonus tied to a single chosen weapon; no per-weapon target",
  // Natural-Born Leader (UC)
  wY5KDtUyDsWlj5Du: "Leadership score bonus has no modeled target axis",
  // Patient Calm
  DWgmQjRRmUmf7HYM:
    "player-chosen Craft or Profession skill; a take-10-as-12 substitution isn't an additive bonus",
  // Persecuted Expatriate (Tiefling)
  Tp5CXwQJL66jiC4e:
    "skill bonus and class skill both depend on an untracked fiendish-heritage sub-choice",
  // Quain Martial Artist (Quain)
  AHa3d1lBwHGmgWXx: "damage bonus restricted to unarmed strikes; no per-weapon-type target axis",
  // Quantium University Graduate (Nex)
  AiQXAMQMzR9YCl4r: "concentration check bonus; no concentration-check target axis",
  // Rebel Leader (Shokuro)
  HdmuSpkIKOS1AKYo: "Leadership score bonus; no target axis",
  // Roving Range
  hwHQDXLXjdtIGg7S: "unconditional range-increment increase has no expressible target",
  // Sacred Conduit
  gQ9RoYriwgWKTIjz:
    "Vendored reprint of the hand-authored Sacred Conduit trait (traits.ts); the +1 channel-energy save DC bonus is already wired there, so this duplicate stays unwired to avoid double-applying.",
  // Scion of Legend (Return of the Runelords)
  A7IyTMzJRauORoEt:
    "player choice of skill, open-ended (tied to a prior-campaign hero's skill ranks)",
  // Spirit Animal (Realm of the Mammoth Lords)
  "5rG5y8dJgZTtzp1C":
    "player-choice save target (Fortitude/Reflex/Will) determined at trait selection",
  // Spirit Lodge Dreamer (Human; Erutaki)
  wCRZAyjbEScwWQuN: "unconditional concealment miss-chance reduction has no matching target axis",
  // Sword Scion (Kingmaker)
  Vw1ZVONnNwzQeNDN:
    "weapon-specific attack/combat-maneuver bonus (longsword/Aldori dueling sword only), no per-weapon target",
  // Swordlord's Page (Brevoy)
  c7KTLpVRSrEyrXDN: "crit-confirmation attack bonus has no target",
  // Tongue of Many Towns (Human; Garundi)
  okbK9lLi7MigjPmX: "unconditional bonus applies to a player-chosen 2 of 3 named skills",
  // Traveler of a Hundred Lands
  j4zXyyxLBieQTBNb: "Player-choice class skills (choose any two).",
  // Undaunted
  Ekfuo8nna0m8mVVM:
    "Raises the DC others need to demoralize the character; not covered by any roll-bonus target.",
  // Varisian Wanderer (Varisia)
  NDyPeRHGBkbnxkYv:
    "player choice among three skills, one of which (Perform) is itself an open subtype choice",
  // Voices of Solid Things (Witchmarket)
  "1skwhiG9As8txeOS":
    "player-choice class skill plus an ability-score substitution mechanic with no expressible target",
  // Weapon Training (Human; Ulfen)
  QSe1ejZnAuOnirnY:
    "unconditional damage bonus scoped to a named weapon list; no weapon-specific damage target",
  // Younger Sibling (Jade Regent)
  P1kILufZo4OkTrBf:
    "player choice of saving throw (Will/Fortitude/Reflex), tied to which sibling NPC is chosen",
};

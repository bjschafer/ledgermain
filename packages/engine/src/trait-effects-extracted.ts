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
 * fear", "checks made to gather information", one named
 * Craft/Profession/Perform instance) stay prose, covered by the vendored
 * contextNotes most of these entries already carry. A bare-family
 * `classSkills` id (e.g. `prf`) is used only for whole-family grants
 * ("Perform is always a class skill for you") — compute()'s baseId
 * fallback then covers every instance, which is exactly what those grants
 * mean.
 */

import type { Change } from "@pf1/schema";

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
  // Barroom Talespinner (Skull and Shackles): Promoted the unconditional +1 Diplomacy trait bonus; the chosen Perform category (parameterized subskill), the ambiguous class-skill pick, and the once-per-week pirate-tale bonus stay prose.
  "4lfTLUDjiOP2pNd9": {
    changes: [{ target: "skill.dip", type: "trait", formula: "1" }],
    provenance: "You gain a +1 trait bonus on Diplomacy checks and one category of Perform checks",
  },
  // Battlefield Surgeon (Zon-Kuthon): Unconditional class skill grant promoted; extra treat-deadly-wounds use stays prose (not a numeric target).
  "7qHhApg7OMSlk3e7": {
    classSkills: ["hea"],
    provenance: "Heal becomes a class skill for you",
  },
  // Bruising Intellect: Class-skill grant is unconditional; the Int-for-Cha substitution on Intimidate checks isn't an expressible bonus target and stays prose.
  HhRkiJqhqVFp5E9b: {
    classSkills: ["int"],
    provenance: "Intimidate is always a class skill for you",
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
  // Destined Diplomat: Class-skill grant is unconditional; the +2 Diplomacy bonus is scoped to outsiders and stays prose.
  vwNrscHqopeUqRKv: {
    classSkills: ["dip"],
    provenance: "Diplomacy is always a class skill for you.",
  },
  // Diva in Training (Hell's Rebels): Promoted the unconditional 'all Perform skills are class skills' grant; the +1 bonus to one chosen Perform type (parameterized subskill) and the language-dependent spell DC bonus (no target) stay prose.
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
  // Red Silk Frankness: Class-skill grant is unconditional; the +5 Diplomacy bonus is scoped to overlooking offensive/illegal acts and stays prose.
  r1GEcZjFl3C0XPrq: {
    classSkills: ["dip"],
    provenance: "Diplomacy is always a class skill for you.",
  },
  // Resourceful Scavenger (Numeria): Promoted the unconditional Appraise class-skill grant; the Perception bonus stays prose since it's scoped to searching for valuables.
  VOPq7Q1Q8KYTZXLJ: {
    classSkills: ["apr"],
    provenance: "Appraise is always a class skill for you",
  },
  // Rude Songs (Goblin): Promoted the unconditional class-skill grant (Perform); the +2 Perform (song) bonus stays prose (conditional on being heard and understood, and subskill-specific).
  fH4GY0bWSbG3ZFaz: {
    classSkills: ["prf"],
    provenance: "Perform is always a class skill for you.",
  },
  // Savant (Kitharodian Academy): Grants Perform generally as a class skill, unconditional; the +2 bonus is scoped to a player-chosen performance type (parameterized subskill) and stays prose.
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
  // Smuggler: Fixed (non-choice) class skill grant promoted; the +3 Sleight of Hand bonus stays prose since it's scoped to checks made to hide an object.
  UczVHzdFNZl5TZH5: {
    classSkills: ["slt"],
    provenance: "Sleight of Hand is a class skill for you.",
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
  // Tiger Brigadier (Bachuan): Unconditional class skill grant promoted; +2 Intimidate stays prose (scoped to older creatures).
  jwX5qzs9NjCDFnwW: {
    classSkills: ["int"],
    provenance: "Intimidate becomes a class skill for you",
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
 * Prose-only traits the sweep found to carry a genuinely unconditional
 * published number that still cannot be promoted — each value names the
 * missing axis, so future mechanism work can find its candidates here
 * (the same inline-blocker convention the class-subsystem tables use).
 * The recurring blockers: a choose-one skill or class-skill pick that no
 * trait choice axis records, a bonus scoped to one named
 * Craft/Profession/Perform instance, and caster-level / concentration /
 * channel-DC / per-day-resource numbers with no sheet target.
 *
 * Everything else in the prose-only catalog is situational by its own
 * text and is not listed: display-only is the default, not a blocker.
 */
export const TRAIT_PROMOTION_BLOCKERS: Readonly<Record<string, string>> = {
  // Abendego Pilot (Eye of Abendego; Sylph)
  ggGeZU7iH0vmOunL: "parameterized subskill (Profession (sailor))",
  // Alabaster Odalisque (Jalmeray)
  hEGGJ7aXifksH1i4: "player-choice skill target (two Charisma-based skills)",
  // Alchemical Adept
  Vef8nEILiKKTeS98: "Craft (alchemy) is a parameterized subskill, not expressible.",
  // Alchemical Intuition
  SrTIed0khcWjOSH5: "Craft (alchemy) is a parameterized subskill, not expressible.",
  // Alchemical Prodigy (Thuvia)
  IHbJ1eBqJI94yvUv: "no target for effective alchemist level / extract duration",
  // Ancient Historian (Scarab Sages)
  HF99WVZ2z8QpQ55n: "Player-choice class skill (Knowledge history or Linguistics).",
  // Antiquities Smuggler (Osirion)
  tcVTjbd9IzRKoB8c: "player-choice class skill (Appraise/Bluff/Sleight of Hand)",
  // Arcane Scholar
  BFxpg1EJ0iDaMerr: "Player-choice skill and class skill (Knowledge arcana or Spellcraft).",
  // Ascendant Recollection
  AONVPiyrMqBpvDUY:
    "Effective sorcerer-level bonus to a bloodline power; caster-level-style value has no target.",
  // Athletic (Ruins of Azlant)
  vu5DPmp9Rhtsv4L7:
    "player choice of skill (Acrobatics/Climb/Swim) for the flat bonus; the ACP-reduction formula also isn't in the allowed formula shapes",
  // Athletic Champion (War for the Crown)
  R0v0Gjlc2mR1IDjy: "player choice of skills (pick two of Climb/Diplomacy/Perception/Swim)",
  // Audrahni's Ally (Return of the Runelords)
  rw9a3EK6h62WVIo5:
    "player/GM choice of which saving throw (Fortitude/Reflex/Will) the bonus applies to",
  // Bandit (River Kingdoms)
  vcxXn1UJsH0lmdxx: "player-choice class skill (Escape Artist/Intimidate/Stealth)",
  // Berserker of the Society (Barbarian, Pathfinder Society)
  KlwS1tJ7WyRBohli: "unconditional rage-rounds increase has no resource-pool target",
  // Best Friend (Jade Regent)
  UWmFY5dlVf4ihZzV:
    "player choice of skill (Diplomacy or Bluff), tied to which companion NPC is chosen",
  // Bladed Magic
  Pd6vVQCaRD8nQO0H: "Craft-check bonus is a parameterized subskill (no generic Craft target).",
  // Boarded in the Shackles (Serpent's Skull)
  "12bZB6ikwM5D8sE6": "player choice of saving-throw category",
  // Brastlewark Businessman (Gnome)
  KzD0s3ZhLGxc3I1X: "unconditional +2 on Craft (alchemy) checks is a parameterized subskill",
  // Brevoy Bandit (Mivon)
  Z4oPfA7oHukblDCv: "player-choice ability score plus parameterized Profession skill",
  // Brewmaster (Dwarf)
  Z9OexI16JgRSwWQW:
    "unconditional +1 on Profession (brewer) and Craft (alchemy) checks is a parameterized subskill; the Diplomacy penalty is scoped to dwarves aware of the family's brewing secrets",
  // Call of the Longships (Lands of the Linnorm Kings)
  A0Qr8Ddtl9BIFSpD: "parameterized subskill (Profession (sailor))",
  // Captain's Blade (Liberty's Edge)
  "6qNkPwLOppYYEoKG": "Player-choice class skill (Acrobatics or Climb).",
  // Child of Infamy (Council of Thieves)
  "249AUN4KpTJ853lW": "parameterized subskill (Perform (act))",
  // Chosen Child (Po Li)
  "7rIYvovfydKLMJ52": "starting wealth is not a modeled target",
  // Clan Artisan (Xa Hoi)
  JxJr7ofe0yC95eDJ: "parameterized subskill (chosen Craft)",
  // Coin Hoarder (Mindspin Mountains)
  lReYaGNTl1SEPczq: "starting wealth is not a modeled target",
  // Conspiracy Hunter (Council of Thieves)
  NqrxCiaPQcgE6Ir1: "player choice of skill (one of six listed)",
  // Criminal
  Qj7YQSJBSAdtotyi: "player-choice class skill (Disable Device/Intimidate/Sleight of Hand)",
  // Criminal Roots
  RaDdRoDgqpqht14i: "player-choice class skill (Diplomacy or Intimidate)",
  // Crocodile Swim (Skinwalker; Werecrocodile-Kin)
  eZZ8d8ZDWD0WtluA: "player-choice class skill (Swim or Stealth, your choice)",
  // Cunning Liar (Any City)
  unv2smjzMnDXHpcr: "ability-substitution mechanic, not an additive bonus",
  // Darklands Trader
  zGc6FMFSliXxASGn: "player-choice class skill (Diplomacy or Knowledge dungeoneering)",
  // Deep Cover
  "9QVXtD2lZkIzyBt5": "player-choice class skill (Bluff or Disguise)",
  // Demented Inventor (Half-Orc, Orc)
  kb1xWDivKkshwHNS: "parameterized subskill (Craft (weapons))",
  // Distance Aptitude
  "6ZGdu6NbIl8nuRcc":
    "Unconditional caster level bonus (spell/SLA range); caster level has no target.",
  // Dockside Brawler (Skull and Shackles)
  BvOs10q0JnObynEk:
    "weapon-specific damage bonus (brass knuckles/improvised weapons only), no per-weapon target",
  // Drug Addict (Curse of the Crimson Throne)
  ox1UTgNrZAGHFm6C:
    "player choice between a Knowledge (local) skill bonus and a Fortitude save bonus",
  // Eager Performer (Rise of the Runelords)
  yAJ5AiuQ7VjXcE57:
    "parameterized Perform subskill plus a spell save DC bonus, neither has a modeled target",
  // Ear for Music (Shelyn)
  Ti2NJqJGlR2V6kkR:
    "unconditional +1 trait bonus scoped to one chosen Perform category - parameterized subskill",
  // Empathic Diplomat (Qadira, Osirion)
  OBuaWV4mNvcYfOkr: "ability-substitution mechanic, not an additive bonus",
  // Enduring Spellcraft (Human; Azlanti)
  VWCiAgcpksSqAgHm: "unconditional caster level bonus has no modelable target",
  // Exalted of the Society (Cleric, Pathfinder Society)
  K9jDY7MNr8t7Lcue:
    "Extra daily channel-energy use; no resource-count target for bonus daily uses.",
  // Exchange Agent (Shattered Star)
  GK6bsGYZmHqmeVIP:
    "player choice of skill (Handle Animal/Knowledge geography/Linguistics/Survival)",
  // Extremely Fashionable
  bFnoGpzagyh3XaiJ: "Player-choice class skill (Bluff, Diplomacy, or Intimidate).",
  // Eye of the Father (Torag)
  moclT0r65vok8IGF:
    "unconditional +1 trait bonus scoped to one chosen Craft skill - parameterized subskill",
  // Faithful Artist (Desna)
  "6dJhGTcypLMHvghH":
    "unconditional Perform bonus and class-skill grant both scoped to a single Perform subskill - parameterized subskill",
  // Family Trade
  QCTPDU21TE7P7bSe: "Class skill grant is a player choice of skill, not expressible.",
  // Fashionable (Sovereign Court)
  l0VpMJxS7dwcZC2p: "Player-choice class skill (Bluff, Diplomacy, or Sense Motive).",
  // Fatal Trapper (Zyphus)
  "0BjV14Bc6cvyHi3N": "unconditional +1 trait bonus on Craft (traps) - parameterized subskill",
  // Fey Mediator (Grungir Forest)
  JPDir28iBA15cfmU: "player-choice class skill (Bluff, Diplomacy, or Knowledge nature)",
  // Fiend Blood (Any)
  oCZtSfu7f9E3KzEd: "player-choice class skill (Bluff, Intimidate, or Knowledge (planes))",
  // Fixer of Odds (Second Darkness)
  u9yVXpe9U8Ysxaiv: "parameterized subskill (Profession (gambling))",
  // Flames of Hell (Any Archdevil)
  TfCzuODwDA5uUD1F:
    "unconditional +1 to channel energy save DC - no channel-DC target on the allowlist",
  // Focused Burn
  "9yeh2oXP6rvnMYN7":
    "Bomb fire-damage bonus scales with the bomb's own damage dice; not an allowed formula shape.",
  // Folgrit's Bounty (Folgrit)
  ZkmQ9OBNeWLFHLNA: "unconditional +1 trait bonus on Profession (cook) - parameterized subskill",
  // Foster Child (Jade Regent)
  zrbKrP4BTsL6H7Z2: "player choice of skill (any Knowledge)",
  // Framed (Curse of the Crimson Throne)
  VUOfSY91afNk3jP3: "player choice of skill (Spellcraft or Bluff)",
  // Freedom Fighter (Shokuro)
  hl4mVwmHWZmr6giU: "attack bonus restricted to improvised weapons; no per-weapon-type target axis",
  // Half-Forgotten Secrets (Dhampir; Ajibachana)
  XBBpInwgEwEF3oxJ: "player-choice class skill (two Knowledge skills of your choice)",
  // Harvester
  bMt5gOoMWO7XV8wc: "parameterized subskill (Profession tanner or trapper)",
  // Heirloom Weapon
  ZwrTOQ8E9LLIuU7D:
    "Player-chosen benefit (proficiency, AoO bonus, or maneuver bonus) tied to one specific named weapon; no weapon-specific target.",
  // Honored Fist of the Society (Monk, Pathfinder Society)
  X3y66cCksYNc6BXv: "unconditional ki-pool increase has no resource-pool target",
  // Hwan Artist (Hwanggot)
  VLZ4HsXD2ofvrrnt: "parameterized subskill: player-chosen Perform",
  // Iadaran Illusionist (Kyonin)
  Rd7slvsJEXaGO2j5: "caster level check bonus; no CL-check target axis",
  // Imperial Soldier (Molthune)
  "6OpE9s4ISLffIXFU": "player-choice class skill (Heal, Intimidate, or Ride)",
  // Indentured Blacksmith (Kaoling)
  sIKYG512BdRbtROD: "parameterized subskill: player-chosen Craft (armor or weapons)",
  // Influence
  "5P5X8CEltfkvh05t": "player-choice class skill (Diplomacy/Intimidate/Sense Motive)",
  // Insatiable
  JVm2TQpldUHQxyoN:
    "Unconditional 10% price increase and doubled food/water needs have no matching cost/consumption target.",
  // Insider Knowledge (Grand Lodge)
  "1Rk3X3Mp4OPSI3eX": "Player-choice skill and class skill (Diplomacy or Knowledge local).",
  // Inspired by Greatness (Carrion Crown)
  NnfHhF5ZSjLNqNDU: "caster level bonus for one chosen spell, no CL target",
  // Intense Artist (Shelyn)
  n0JoCK18sDFA8HIu:
    "unconditional Perform bonus and class-skill grant both scoped to Perform subskills - parameterized subskill",
  // Jenivere Crew (Serpent's Skull)
  lCvkltyrJy58VUlY: "player choice of skill (one of six listed)",
  // Knowing the Enemy
  XwfVSmvP6cN3zjxn:
    "class skill depends on the character's favored-enemy choice, not resolvable from trait text alone",
  // Kwanlai Believer (Kwanlai)
  AnqZ2VVdYfcaXJZ4: "concentration check bonus; no concentration-check target axis",
  // Librarian (Dark Archive)
  DvDOCRNLk3zHSOht:
    "Player-choice skill including a parameterized Profession (librarian) subskill.",
  // Lillend's Harp (Aasimar; Musetouched)
  BzPMPtnn0DK2cnQJ: "parameterized subskill (Perform (string))",
  // Love Lost (Curse of the Crimson Throne)
  YraEYEO6Uk4631AF: "player choice of skill (Intimidate or Survival)",
  // Maestro of the Society (Bard, Pathfinder Society)
  foQQ5u7PzJ2ZtS4b: "bardic performance rounds/day has no modeled target axis",
  // Magic's Might (Yuelral)
  NBsYSWdn835899p1:
    "unconditional +1 on caster level checks to overcome spell resistance - no caster-level target on the allowlist",
  // Mechanical Expertise (Alkenstar)
  G9VCGvbhixzz5ocJ:
    "player-choice class skill (Craft any, Disable Device, or Knowledge engineering)",
  // Mentored
  "6DNJXAzSS3gjCfNU": "parameterized subskill (player-chosen Craft/Perform/Profession)",
  // Militia Veteran (Any Town or Village)
  q7Yn8LrdhIZDmaFI: "player-choice class skill (Profession soldier, Ride, or Survival)",
  // Missing Child (Curse of the Crimson Throne)
  "17mo4Jjxp01HsKnN":
    "player choice between a class-skill grant (Diplomacy/Sense Motive) and a Will save bonus",
  // Mizu Ki Hikari Rebel (Chu Ye)
  Bw67YegF2jNCVz9g: "damage bonus restricted to unarmed attacks; no per-weapon-type target axis",
  // Monk Weapon Skill
  p14IPgYSoWNp37pW: "damage bonus tied to a single chosen weapon; no per-weapon target",
  // Natural Negotiator (The Concordance)
  hW5fCziKoigBBaEw: "Player-choice class skill (Diplomacy or Handle Animal).",
  // Natural-Born Leader (UC)
  wY5KDtUyDsWlj5Du: "Leadership score bonus has no modeled target axis",
  // Nightstalls Navigator
  fhCUhy3sAwL6yqe2: "player-choice class skill (Diplomacy or Knowledge local)",
  // Nirmathi Militia (Nirmathas)
  "2xZIcouMacp69nia": "player-choice class skill (Profession soldier, Ride, or Survival)",
  // Obnoxious
  "8d0wj44WfW4FalFk": "parameterized subskill (player-chosen Perform type)",
  // Observant (Grand Lodge)
  mN0oMRntDWY0RS2O: "Player-choice skill and class skill (Perception or Sense Motive).",
  // Oenopion Alchemist (Nex)
  h3Y7yYus5bF3z90S: "parameterized subskill: Craft (alchemy)",
  // Operatic (Human; Chelaxian)
  ftX8GMIMMfVZC3KF: "unconditional bonus scoped to Perform (sing), a parameterized subskill",
  // Patient Calm
  DWgmQjRRmUmf7HYM: "Player-chosen Craft/Profession subskill; parameterized and not expressible.",
  // Perfectionist's Brew
  Rrh1oZjG47Wf4kTv:
    "unconditional +2 on Craft (alchemy) checks is a parameterized subskill; the Spellcraft half is scoped to brewing potions",
  // Performance Artist (Taldor Faction)
  uuC76sH2BLdP32hu:
    "Parameterized Perform subskill chosen by the player, granted as both bonus and class skill.",
  // Persecuted Expatriate (Tiefling)
  Tp5CXwQJL66jiC4e:
    "skill bonus and class skill both depend on an untracked fiendish-heritage sub-choice",
  // Pioneer (Kingmaker)
  BOr7byk7DKy82ktZ: "player choice of skill (one of seven listed)",
  // Proper Training (Grand Lodge)
  RPvqNLAqKYYyYgKN: "Player-choice class skill (Knowledge geography or Knowledge history).",
  // Quain Martial Artist (Quain)
  AHa3d1lBwHGmgWXx: "damage bonus restricted to unarmed strikes; no per-weapon-type target axis",
  // Quantium University Graduate (Nex)
  AiQXAMQMzR9YCl4r: "concentration check bonus; no concentration-check target axis",
  // Rebel Leader (Shokuro)
  HdmuSpkIKOS1AKYo: "Leadership score bonus; no target axis",
  // Regional Influence - Korvosa (Varisia)
  UNEA8OGKTfw7UdSb: "parameterized subskill: player-chosen Profession",
  // Regional Influence - Magnimar (Varisia)
  PEF5ztrAhR9wRIOa: "parameterized subskill: player-chosen Profession",
  // Resourceful (Ruins of Azlant)
  lQImhTgz83PtuqTq: "parameterized subskill (Craft/Profession), also player-chosen",
  // Resourceful Alchemy (Thuvia)
  EKFHTQbIXCxGvk7k: "parameterized subskill: Craft (alchemy)",
  // River Navigator (River Kingdoms)
  TGgaGH1R6y2a2h50: "player-choice class skill (Survival or Profession sailor)",
  // Rousing Oratory (Liberty's Edge)
  bmqio2OUbI5wr63c:
    "Class skill grant tied to a player-chosen Perform variant (act, comedy, oratory, or sing).",
  // Roving Range
  hwHQDXLXjdtIGg7S: "unconditional range-increment increase has no expressible target",
  // Sacred Conduit
  gQ9RoYriwgWKTIjz: "Channeled-energy save DC bonus; DC has no matching target.",
  // Sacred Orienteer (Elion)
  SZKvxA7z5d5buqZj:
    "class skill grant is a player choice between Knowledge (geography) and Survival - player-choice class skill",
  // Savanna Child (Plains)
  sAbofD3PaNMuCxW3: "player-choice class skill (Handle Animal, Knowledge nature, or Ride)",
  // Scion of Legend (Return of the Runelords)
  A7IyTMzJRauORoEt:
    "player choice of skill, open-ended (tied to a prior-campaign hero's skill ranks)",
  // Secret Knowledge (Norgorber)
  OGSwFuCBoB2ouaw7:
    "unconditional bonus and class skill both apply to a player-chosen Knowledge skill - player-choice class skill",
  // Secrets of the Sphinx (Scarab Sages)
  wbPR6KmhVPml7OJ5: "Player-choice class skill (any one Knowledge skill).",
  // Shared Ancestors (Myr)
  uL1GXmNtwAumM7mW:
    "class skill grant is a player choice among five listed skills - player-choice class skill",
  // Ship Aptitude (The Shackles)
  gTR3igg1FAccvQYh:
    "parameterized subskill (Profession: sailor) for both the bonus and the class-skill grant",
  // Shoanti Tribesman (Varisia)
  ZBGxphjICOSSmJpJ: "player-choice class skill (Climb/Survival/Swim)",
  // Simple Disciple
  kSWn6n85f2LXcdaf: "parameterized subskill (player-chosen Craft or Profession)",
  // Snake Bleeder (Nagajor)
  M8cmb4Kf5YXTNsMS: "parameterized subskill (Craft: alchemy)",
  // Sophisticated Citizen (Absalom)
  st7jCOWVZl2ZIdXU: "player-choice class skill (Knowledge geography/local or Sense Motive)",
  // Spirit Animal (Realm of the Mammoth Lords)
  "5rG5y8dJgZTtzp1C":
    "player-choice save target (Fortitude/Reflex/Will) determined at trait selection",
  // Spirit Lodge Dreamer (Human; Erutaki)
  wCRZAyjbEScwWQuN: "unconditional concealment miss-chance reduction has no matching target axis",
  // Student of Faith (Rise of the Runelords)
  wuIVOJSw3KzSjEqQ:
    "caster level (cure spells) and channeled-energy save DC bonuses, neither has a modeled target",
  // Style Sage
  ihyCI3SlWPQ0vrxz: "player-choice class skill (Knowledge local or Knowledge history)",
  // Sword Scion (Kingmaker)
  Vw1ZVONnNwzQeNDN:
    "weapon-specific attack/combat-maneuver bonus (longsword/Aldori dueling sword only), no per-weapon target",
  // Swordlord's Page (Brevoy)
  c7KTLpVRSrEyrXDN: "crit-confirmation attack bonus has no target",
  // Tattooed Focus (Human; Varisian)
  Y99VFesddmNwLMaq:
    "bonus and class skill apply to a player-chosen Craft/Perform/Profession subskill",
  // Teacher's Pet (Carrion Crown)
  YcrEc7YFQb3etpNV: "player choice of skill (any Knowledge)",
  // The Stranger
  dXEOBz7U0qUejTF0: "player-choice class skill (Diplomacy or Knowledge [local])",
  // The Thrush
  WlNEKSh0Q9SwK68w: "parameterized subskill (Perform [sing] bonus and class-skill grant)",
  // Tongue of Many Towns (Human; Garundi)
  okbK9lLi7MigjPmX: "unconditional bonus applies to a player-chosen 2 of 3 named skills",
  // Trade Talk (Half-Elf, Human-Raised)
  yNxu4hza4zvZsacK: "unconditional bonus applies to a player-chosen Craft or Profession subskill",
  // Trap Savvy (Darklands)
  mirSz0FfZTpdcxIw: "parameterized subskill (Craft: traps)",
  // Traveler of a Hundred Lands
  j4zXyyxLBieQTBNb: "Player-choice class skills (choose any two).",
  // Treasure Mapper (Ilizmagorti)
  z1t64ka0ea7Jbvqk: "player-choice skill (Survival or Profession: sailor)",
  // Trouper (Sczarni Faction)
  nT9MNZhXWIvzAa5D: "Parameterized Perform subskill chosen by the player.",
  // Undaunted
  Ekfuo8nna0m8mVVM:
    "Raises the DC others need to demoralize the character; not covered by any roll-bonus target.",
  // Unwelcome Business
  P9yTZ3R8nMJnuCeo: "player-choice class skill (Disguise or Sleight of Hand)",
  // Urban Sleuth (Hell's Rebels)
  LrK0lPy2YCpx5kEZ:
    "player choice of skill, nested (focus question, then one of two Knowledge subtypes)",
  // Vagabond Child (Urban)
  "8xC24OEPHzEpa6Sv": "player-choice class skill (Disable Device/Escape Artist/Sleight of Hand)",
  // Varisian Wanderer (Varisia)
  NDyPeRHGBkbnxkYv: "player-choice class skill (Perform/Profession: fortuneteller/Sleight of Hand)",
  // Voices of Solid Things (Witchmarket)
  "1skwhiG9As8txeOS":
    "player-choice class skill plus an ability-score substitution mechanic with no expressible target",
  // Wary (Daggermark)
  sOp5mGcos8QiNBgS: "player-choice class skill (Perception or Sense Motive)",
  // Weapon Training (Human; Ulfen)
  QSe1ejZnAuOnirnY:
    "unconditional damage bonus scoped to a named weapon list; no weapon-specific damage target",
  // Wisdom in the Flesh (Irori)
  CbX5iMc8v5obzSO5:
    "class skill grant is a player choice among Strength/Constitution/Dexterity-based skills - player-choice class skill",
  // Witness to Nature's Cruelty (Human; Kellid)
  nFUnPDfh1S8GP6kC: "player-choice class skill (Heal or Survival)",
  // World Traveler (Human)
  "31bcAnnrcuQ2BOCN":
    "player-choice class skill and skill-bonus target (Diplomacy/K.local/Sense Motive)",
  // World-Weary (Ironfang Invasion)
  XPYysJL6CgpILlRe: "player-choice class skill (one of five listed)",
  // Younger Sibling (Jade Regent)
  P1kILufZo4OkTrBf:
    "player choice of saving throw (Will/Fortitude/Reflex), tied to which sibling NPC is chosen",
};

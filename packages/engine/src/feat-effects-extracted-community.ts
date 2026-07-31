/**
 * Machine-extracted feat effects for the community pf1-content pack — the
 * companion table to feat-effects-extracted.ts, produced by the community
 * classification sweep (see feat-classification-community.ts's header for
 * the full methodology). Same ExtractedFeatEntry shape and the same
 * precedence rule: resolveFeatEffect consults the hand-verified FEAT_EFFECTS
 * first, then FEAT_EFFECTS_EXTRACTED, then this table, so a hand-authored
 * entry for any slug here always wins and double-application is impossible.
 *
 * Every entry's provenance is a verbatim contiguous substring of the vendored
 * feat description (machine-checked), and every draft was hand-reviewed
 * against the full description before landing. "high" confidence throughout:
 * each is an unconditional published number whose shape already exists in the
 * hand-verified tables (flat/rank-gated skill bonuses, energy resistance,
 * immunity, speeds, carry capacity, CMD, initiative, SR).
 *
 * Style feats: the printed style rules only stance-gate clauses prefixed
 * "While using this style" (and follow-up feats that list a style feat as a
 * prerequisite); unprefixed benefit sentences apply unconditionally. The
 * style-feat entries here (dragonfly/monkey/snake/barracuda) carry exactly
 * those unprefixed clauses and nothing else.
 *
 * Feats whose text also grants a fixed class skill ("Knowledge (nobility) is
 * always a class skill for you") carry it in `classSkills`, consumed by
 * compute()'s class-skill union so the +3 trained bonus lands.
 */

import type { ExtractedFeatEntry } from "./feat-effects-extracted.js";

export const FEAT_EFFECTS_EXTRACTED_COMMUNITY: Readonly<Record<string, ExtractedFeatEntry>> = {
  // Grants a flat, permanent spell resistance equal to 5 + character level while the curse persists.
  accursed: {
    type: "static",
    changes: [{ target: "spellResist", type: "untyped", formula: "5 + @attributes.hd.total" }],
    confidence: "high",
    provenance: "You gain spell resistance equal to 5 + your character level",
  },
  // Grants a flat, unconditional +4 bonus to CMD.
  "advanced-defensive-combat-training": {
    type: "static",
    changes: [{ target: "cmd", type: "untyped", formula: "4" }],
    confidence: "high",
    provenance: "You gain a +4 bonus to your CMD.",
  },
  // Unconditional +10 feet swim speed increase.
  "aquatic-ancestry": {
    type: "static",
    changes: [{ target: "swimSpeed", type: "untyped", formula: "10" }],
    confidence: "high",
    provenance: "Your swim speed increases by +10 feet.",
  },
  // Unconditional +2 bonus on Swim checks (the underwater melee-penalty removal is situational and not part of this draft).
  "aquatic-combatant": {
    type: "static",
    changes: [{ target: "skill.swm", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance: "You gain a +2 bonus on Swim checks",
  },
  // The published text really does say the +5 competence bonus "increases" to
  // +4 at 10+ Hit Dice (AoN corroborates the vendored text verbatim).
  // Implemented literally rather than guessing at the intended errata.
  "bag-of-bones": {
    type: "static",
    changes: [
      {
        target: "skill.esc",
        type: "competence",
        formula: "if(gte(@attributes.hd.total, 10), 4, 5)",
      },
    ],
    confidence: "high",
    provenance:
      "gain a +5 competence bonus on Escape Artist checks. If you possess 10 or more Hit Dice, this bonus increases to +4",
  },
  // Unconditional Wisdom modifier added to Swim checks alongside the usual Strength modifier.
  "barracuda-style": {
    type: "static",
    changes: [{ target: "skill.swm", type: "untyped", formula: "@abilities.wis.mod" }],
    confidence: "high",
    provenance:
      "You add your Wisdom modifier in addition to your Strength modifier on Swim checks.",
  },
  // Grants a flat 10-foot climb speed, unconditional for a vine leshy.
  "climbing-vine": {
    type: "static",
    changes: [{ target: "climbSpeed", type: "untyped", formula: "10" }],
    confidence: "high",
    provenance: "You gain a climb speed of 10 feet.",
  },
  // Unconditional +2 Str-equivalent for carrying capacity (separate from the withdraw-specific pickup benefit, which is situational).
  "cut-your-losses": {
    type: "static",
    changes: [{ target: "carryStr", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance:
      "you treat your Strength score as 2 higher for the purpose of determining your carrying capacity",
  },
  // Unconditional rank-gated Heal bonus; the Goal/Completion Benefit story clauses aren't modeled.
  "deny-the-reaper": {
    type: "static",
    changes: [
      { target: "skill.hea", type: "untyped", formula: "if(gte(@skills.hea.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Heal checks. If you have 10 or more ranks in Heal, this bonus increases to +4.",
  },
  // +2 applies only in the 1-5 rank window and is fanned across all Knowledge skills; the untrained-DC-15 clause isn't modeled.
  dilettante: {
    type: "static",
    changes: [
      {
        target: "skill.kar",
        type: "untyped",
        formula: "if(gte(@skills.kar.rank, 6), 0, if(gte(@skills.kar.rank, 1), 2, 0))",
      },
      {
        target: "skill.kdu",
        type: "untyped",
        formula: "if(gte(@skills.kdu.rank, 6), 0, if(gte(@skills.kdu.rank, 1), 2, 0))",
      },
      {
        target: "skill.ken",
        type: "untyped",
        formula: "if(gte(@skills.ken.rank, 6), 0, if(gte(@skills.ken.rank, 1), 2, 0))",
      },
      {
        target: "skill.kge",
        type: "untyped",
        formula: "if(gte(@skills.kge.rank, 6), 0, if(gte(@skills.kge.rank, 1), 2, 0))",
      },
      {
        target: "skill.khi",
        type: "untyped",
        formula: "if(gte(@skills.khi.rank, 6), 0, if(gte(@skills.khi.rank, 1), 2, 0))",
      },
      {
        target: "skill.klo",
        type: "untyped",
        formula: "if(gte(@skills.klo.rank, 6), 0, if(gte(@skills.klo.rank, 1), 2, 0))",
      },
      {
        target: "skill.kna",
        type: "untyped",
        formula: "if(gte(@skills.kna.rank, 6), 0, if(gte(@skills.kna.rank, 1), 2, 0))",
      },
      {
        target: "skill.kno",
        type: "untyped",
        formula: "if(gte(@skills.kno.rank, 6), 0, if(gte(@skills.kno.rank, 1), 2, 0))",
      },
      {
        target: "skill.kpl",
        type: "untyped",
        formula: "if(gte(@skills.kpl.rank, 6), 0, if(gte(@skills.kpl.rank, 1), 2, 0))",
      },
      {
        target: "skill.kre",
        type: "untyped",
        formula: "if(gte(@skills.kre.rank, 6), 0, if(gte(@skills.kre.rank, 1), 2, 0))",
      },
    ],
    confidence: "high",
    provenance: "You gain a +2 bonus on Knowledge checks if you have 1-5 ranks in that skill.",
  },
  // Unconditional fly speed grant from upgraded wings; the breath-weapon damage increase and extra sleep/paralysis save bonus aren't modeled.
  "draconic-paragon": {
    type: "static",
    changes: [{ target: "flySpeed", type: "untyped", formula: "20" }],
    confidence: "high",
    provenance: "granting you a fly speed of 20 feet",
  },
  // Grants an unconditional bonus equal to Wisdom modifier on Acrobatics checks, stacking with Dexterity.
  "dragonfly-style": {
    type: "static",
    changes: [{ target: "skill.acr", type: "untyped", formula: "@abilities.wis.mod" }],
    confidence: "high",
    provenance:
      "You add your Wisdom modifier to Acrobatics checks in addition to your Dexterity modifier.",
  },
  // Unconditional +2 Spellcraft bonus rising to +4 at 10 ranks; the self-created-spell caster-level line is excluded as it has no target.
  "eldritch-researcher": {
    type: "static",
    changes: [
      { target: "skill.spl", type: "untyped", formula: "if(gte(@skills.spl.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "you gain a +2 bonus on Spellcraft checks. If you have 10 or more ranks in Spellcraft, this bonus increases to +4.",
  },
  // Unconditional +2 Intimidate bonus rising to +4 at 10 ranks.
  "embrace-of-the-dark-fey": {
    type: "static",
    changes: [
      { target: "skill.int", type: "untyped", formula: "if(gte(@skills.int.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Intimidate checks. If you have 10 or more ranks in Intimidate, this bonus increases to +4.",
  },
  // Player picks any skill; unconditional +2 bonus rising to +4 at 10 ranks in that skill.
  "exotic-heritage": {
    type: "choice",
    choice: { type: "skill", label: "Skill" },
    build: (choiceId: string) => [
      {
        target: `skill.${choiceId}`,
        type: "untyped",
        formula: `if(gte(@skills.${choiceId}.rank, 10), 4, 2)`,
      },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on skill checks with that skill. If you have 10 or more ranks in the chosen skill, this bonus increases to +4.",
  },
  // Unconditional +2 Knowledge (geography) bonus rising to +4 at 10 ranks.
  explorer: {
    type: "static",
    changes: [
      { target: "skill.kge", type: "untyped", formula: "if(gte(@skills.kge.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "you gain a +2 bonus on all Knowledge (geography) checks. If you have 10 or more ranks in Knowledge (geography), increase your bonus to +4.",
  },
  // Unconditional fire resistance 5.
  "flame-heart": {
    type: "static",
    changes: [{ target: "eres.fire", type: "untyped", formula: "5" }],
    confidence: "high",
    provenance: "You gain fire resistance 5.",
  },
  // Unconditional rank-gated Perception bonus.
  "forgotten-past": {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "if(gte(@skills.per.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "Your inquisitive nature gives you a +2 bonus on Perception checks. If you have 10 or more ranks in Perception, this bonus increases to +4.",
  },
  // Unconditional rank-gated Disguise bonus.
  "forward-from-beneath": {
    type: "static",
    changes: [
      { target: "skill.dis", type: "untyped", formula: "if(gte(@skills.dis.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "Your experience with infiltrating your own family or organization gives you a +2 bonus on Disguise checks. If you have 10 or more ranks in Disguise, this bonus increases to +4.",
  },
  // Unconditional cold resistance 3.
  "frozen-skin": {
    type: "static",
    changes: [{ target: "eres.cold", type: "untyped", formula: "3" }],
    confidence: "high",
    provenance: "You gain cold resistance 3.",
  },
  // Unconditional +4 effective Strength for carrying capacity.
  "heavy-gravity-acclimation": {
    type: "static",
    changes: [{ target: "carryStr", type: "untyped", formula: "4" }],
    confidence: "high",
    provenance:
      "your Strength is considered to be 4 higher for the purpose of determining your carrying capacity",
  },
  // Unconditional resistance 5 against negative energy damage.
  "improved-shadowy-resistance": {
    type: "static",
    changes: [{ target: "eres.negativeEnergy", type: "untyped", formula: "5" }],
    confidence: "high",
    provenance: "You gain resistance 5 against negative energy damage",
  },
  // Unconditional Intimidate bonus, rank-gated from +2 to +4 at 10 ranks.
  "innocent-blood": {
    type: "static",
    changes: [
      { target: "skill.int", type: "untyped", formula: "if(gte(@skills.int.rank,10),4,2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Intimidate checks. If you have 10 or more ranks in Intimidate, this bonus increases to +4",
  },
  // Unconditional +2 racial bonus on Perception checks.
  "jackal-heritage": {
    type: "static",
    changes: [{ target: "skill.per", type: "racial", formula: "2" }],
    confidence: "high",
    provenance: "a +2 racial bonus on Perception checks",
  },
  // Grants an unconditional +2 insight bonus on Bluff checks.
  "lifeless-gaze": {
    type: "static",
    changes: [{ target: "skill.blf", type: "insight", formula: "2" }],
    confidence: "high",
    provenance: "a +2 insight bonus on Bluff checks",
  },
  // Rank-gated Acrobatics bonus (+2, or +4 at 10 ranks) reads as an unconditional clause separate from the light-gravity effects.
  "light-gravity-acclimation": {
    type: "static",
    changes: [
      { target: "skill.acr", type: "untyped", formula: "if(gte(@skills.acr.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "you gain a +2 bonus on Acrobatics checks; if you have 10 or more ranks in Acrobatics, this bonus increases to +4",
  },
  // Unconditional +5 land speed for Large-or-larger giants.
  longshanks: {
    type: "static",
    changes: [{ target: "landSpeed", type: "untyped", formula: "5" }],
    confidence: "high",
    provenance: "Your land speed increases by 5 feet",
  },
  // Ritual completion is baked into the prerequisites, so the fire resistance and Will bonus are permanent once the feat is taken.
  "mark-of-the-devoted": {
    type: "static",
    changes: [
      { target: "eres.fire", type: "untyped", formula: "2" },
      { target: "will", type: "morale", formula: "1" },
    ],
    confidence: "high",
    provenance: "you gain fire resistance 2 and a +1 morale bonus on Will saves",
  },
  // Player picks a fighter weapon group; unconditional +1 damage while wielding a proficient weapon from it.
  "martial-focus": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build: (choiceId: string) => [
      { target: `damage.weapon.${choiceId}`, type: "untyped", formula: `1` },
    ],
    confidence: "high",
    provenance: "you gain a +1 bonus on damage rolls",
  },
  // Unconditional +2 Knowledge (dungeoneering) bonus; the Perception clause is scoped to noticing traps so is excluded.
  "master-delver": {
    type: "static",
    changes: [{ target: "skill.kdu", type: "untyped", formula: "2" }],
    classSkills: ["kdu"],
    confidence: "high",
    provenance: "a +2 bonus on all Knowledge (dungeoneering) checks",
  },
  // First clause adds Wisdom modifier to Acrobatics unconditionally (separate from the style-active clauses that follow).
  "monkey-style": {
    type: "static",
    changes: [{ target: "skill.acr", type: "untyped", formula: "@abilities.wis.mod" }],
    confidence: "high",
    provenance: "You add your Wisdom bonus on Acrobatics checks",
  },
  // Rank-gated Knowledge (engineering) bonus (+2, or +4 at 10 ranks) is unconditional.
  "monument-builder": {
    type: "static",
    changes: [
      { target: "skill.ken", type: "untyped", formula: "if(gte(@skills.ken.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Knowledge (engineering) checks. If you have 10 or more ranks in Knowledge (engineering), this bonus increases to +4",
  },
  // Unconditional +2 bonus to Knowledge (nature) and Survival, rank-gated to +4.
  "nature-soul": {
    type: "static",
    changes: [
      { target: "skill.kna", type: "untyped", formula: "if(gte(@skills.kna.rank,10),4,2)" },
      { target: "skill.sur", type: "untyped", formula: "if(gte(@skills.sur.rank,10),4,2)" },
    ],
    confidence: "high",
    provenance:
      "You get a +2 bonus on all Knowledge (nature) checks and Survival checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill.",
  },
  // Unconditional +2/+4 rank-gated Intimidate bonus; the paralysis/sleep save bonus and Story completion benefit aren't captured.
  "never-conquered-forever-feared": {
    type: "static",
    changes: [
      { target: "skill.int", type: "untyped", formula: "if(gte(@skills.int.rank,10),4,2)" },
    ],
    confidence: "high",
    provenance:
      "Your stern demeanor gives you a +2 bonus on Intimidate checks. If you have 10 or more ranks in Intimidate, this bonus increases to +4.",
  },
  // Unconditional +2 Intimidate bonus; the conditional Diplomacy/Handle Animal bonuses and penalty aren't drafted.
  "nightmare-scars": {
    type: "static",
    changes: [{ target: "skill.int", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance:
      "You also gain a +2 bonus on Intimidate checks, and take no penalty on Intimidate checks based on your size.",
  },
  // Unconditional +2 Bluff bonus; the grit-point Disguise bonus is an activated, conditional effect and isn't drafted.
  "no-name": {
    type: "static",
    changes: [{ target: "skill.blf", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Bluff checks, and you can spend 1 grit point to gain a +10 bonus on Disguise checks for 10 minutes per your gunslinger level (minimum 10 minutes).",
  },
  // Unconditional +2 bonus to Bluff and Knowledge (nobility); the Story goal/completion benefits aren't captured.
  "noble-impostor": {
    type: "static",
    changes: [
      { target: "skill.blf", type: "untyped", formula: "2" },
      { target: "skill.kno", type: "untyped", formula: "2" },
    ],
    classSkills: ["blf", "kno"],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Bluff and Knowledge (nobility) checks and these skills are class skills for you.",
  },
  // Unconditional +2 Knowledge (nobility) bonus; the five alternate Scion sub-benefits chosen at feat-take aren't captured.
  "noble-scion": {
    type: "static",
    changes: [{ target: "skill.kno", type: "untyped", formula: "2" }],
    classSkills: ["kno"],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on all Knowledge (nobility) checks, and that chosen Knowledge skill is always considered a class skill for you.",
  },
  // Unconditional +2 Knowledge (nobility) bonus; the many family-specific sub-benefits aren't captured.
  "noble-scion-oppara": {
    type: "static",
    changes: [{ target: "skill.kno", type: "untyped", formula: "2" }],
    classSkills: ["kno"],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on all Knowledge (nobility) checks, and Knowledge (nobility) is always a class skill for you.",
  },
  // Unconditional +2/+4 rank-gated bonus to Sense Motive and Spellcraft.
  "oracular-intuition": {
    type: "static",
    changes: [
      { target: "skill.sen", type: "untyped", formula: "if(gte(@skills.sen.rank,10),4,2)" },
      { target: "skill.spl", type: "untyped", formula: "if(gte(@skills.spl.rank,10),4,2)" },
    ],
    confidence: "high",
    provenance:
      "You get a +2 bonus on Sense Motive checks and Spellcraft checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill.",
  },
  // Only the unconditional Knowledge (planes) portion is drafted; the Sense Motive bonus is scoped to outsiders (situational) and omitted.
  "planewalker-s-insight": {
    type: "static",
    changes: [
      { target: "skill.kpl", type: "untyped", formula: "if(gte(@skills.kpl.rank,10),4,2)" },
    ],
    classSkills: ["kpl"],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Knowledge (planes) checks and on Sense Motive checks against outsiders, and Knowledge (planes) is a class skill for you. If you have 10 or more ranks in either of these skills, the bonus for that skill increases to +4.",
  },
  // Only the unconditional +1 insight bonus to Disable Device and Sleight of Hand is drafted; the possessed-hand attack/damage bonus and permanent concentration penalty aren't captured.
  "possessed-hand": {
    type: "static",
    changes: [
      { target: "skill.dev", type: "insight", formula: "1" },
      { target: "skill.slt", type: "insight", formula: "1" },
    ],
    confidence: "high",
    provenance: "You also gain a +1 insight bonus on Disable Device and Sleight of Hand checks.",
  },
  // Unconditional +2 bonus on Appraise checks.
  "scavenger-s-eye": {
    type: "static",
    changes: [{ target: "skill.apr", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance: "You gain a +2 bonus on Appraise checks.",
  },
  // Unconditional +2 bonus on Acrobatics, Climb, and Swim checks.
  "sea-legs": {
    type: "static",
    changes: [
      { target: "skill.acr", type: "untyped", formula: "2" },
      { target: "skill.clm", type: "untyped", formula: "2" },
      { target: "skill.swm", type: "untyped", formula: "2" },
    ],
    confidence: "high",
    provenance: "You gain a +2 bonus on Acrobatics, Climb, and Swim checks.",
  },
  // Unconditional +2 bonus on all Stealth checks (the feat's other benefits are enumerated-subset save bonuses and untargetable tracking penalties).
  "seen-and-unseen": {
    type: "static",
    changes: [{ target: "skill.ste", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance: "you gain a +2 bonus on all Stealth checks",
  },
  // Unconditional +2 bonus on Disguise checks (the attack/damage bonus vs former family is a separate, enumerated-subset benefit).
  "self-exiled-noble": {
    type: "static",
    changes: [{ target: "skill.dis", type: "untyped", formula: "2" }],
    classSkills: ["dis"],
    confidence: "high",
    provenance: "You gain a +2 bonus on Disguise checks",
  },
  // Unconditional +4 racial bonus on Perception, replacing the keen senses trait's +2.
  "sharp-senses": {
    type: "static",
    changes: [{ target: "skill.per", type: "racial", formula: "4" }],
    confidence: "high",
    provenance: "You receive a +4 racial bonus on Perception skill checks.",
  },
  // Unconditional rank-gated bonus (+2, or +4 at 10+ ranks) on Acrobatics and Climb checks.
  "shingle-runner": {
    type: "static",
    changes: [
      { target: "skill.acr", type: "untyped", formula: "if(gte(@skills.acr.rank, 10), 4, 2)" },
      { target: "skill.clm", type: "untyped", formula: "if(gte(@skills.clm.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Acrobatics and Climb checks, and can take 10 on Climb checks even when distracted. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill.",
  },
  // Unconditional rank-gated Skill Focus bonus (+3, or +6 at 10+ ranks) on Acrobatics.
  "skill-focus-acrobatics": {
    type: "static",
    changes: [
      { target: "skill.acr", type: "untyped", formula: "if(gte(@skills.acr.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Appraise.
  "skill-focus-appraise": {
    type: "static",
    changes: [
      { target: "skill.apr", type: "untyped", formula: "if(gte(@skills.apr.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Artistry.
  "skill-focus-artistry": {
    type: "static",
    changes: [
      { target: "skill.art", type: "untyped", formula: "if(gte(@skills.art.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Bluff.
  "skill-focus-bluff": {
    type: "static",
    changes: [
      { target: "skill.blf", type: "untyped", formula: "if(gte(@skills.blf.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Climb.
  "skill-focus-climb": {
    type: "static",
    changes: [
      { target: "skill.clm", type: "untyped", formula: "if(gte(@skills.clm.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Diplomacy.
  "skill-focus-diplomacy": {
    type: "static",
    changes: [
      { target: "skill.dip", type: "untyped", formula: "if(gte(@skills.dip.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Disable Device.
  "skill-focus-disable-device": {
    type: "static",
    changes: [
      { target: "skill.dev", type: "untyped", formula: "if(gte(@skills.dev.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Disguise.
  "skill-focus-disguise": {
    type: "static",
    changes: [
      { target: "skill.dis", type: "untyped", formula: "if(gte(@skills.dis.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Escape Artist.
  "skill-focus-escape-artist": {
    type: "static",
    changes: [
      { target: "skill.esc", type: "untyped", formula: "if(gte(@skills.esc.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Fly.
  "skill-focus-fly": {
    type: "static",
    changes: [
      { target: "skill.fly", type: "untyped", formula: "if(gte(@skills.fly.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Handle Animal.
  "skill-focus-handle-animal": {
    type: "static",
    changes: [
      { target: "skill.han", type: "untyped", formula: "if(gte(@skills.han.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Heal.
  "skill-focus-heal": {
    type: "static",
    changes: [
      { target: "skill.hea", type: "untyped", formula: "if(gte(@skills.hea.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Intimidate.
  "skill-focus-intimidate": {
    type: "static",
    changes: [
      { target: "skill.int", type: "untyped", formula: "if(gte(@skills.int.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (arcana).
  "skill-focus-knowledge-arcana": {
    type: "static",
    changes: [
      { target: "skill.kar", type: "untyped", formula: "if(gte(@skills.kar.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (dungeoneering).
  "skill-focus-knowledge-dungeoneering": {
    type: "static",
    changes: [
      { target: "skill.kdu", type: "untyped", formula: "if(gte(@skills.kdu.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (engineering).
  "skill-focus-knowledge-engineering": {
    type: "static",
    changes: [
      { target: "skill.ken", type: "untyped", formula: "if(gte(@skills.ken.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (geography).
  "skill-focus-knowledge-geography": {
    type: "static",
    changes: [
      { target: "skill.kge", type: "untyped", formula: "if(gte(@skills.kge.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (history).
  "skill-focus-knowledge-history": {
    type: "static",
    changes: [
      { target: "skill.khi", type: "untyped", formula: "if(gte(@skills.khi.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (local).
  "skill-focus-knowledge-local": {
    type: "static",
    changes: [
      { target: "skill.klo", type: "untyped", formula: "if(gte(@skills.klo.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (nature).
  "skill-focus-knowledge-nature": {
    type: "static",
    changes: [
      { target: "skill.kna", type: "untyped", formula: "if(gte(@skills.kna.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (nobility).
  "skill-focus-knowledge-nobility": {
    type: "static",
    changes: [
      { target: "skill.kno", type: "untyped", formula: "if(gte(@skills.kno.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (planes).
  "skill-focus-knowledge-planes": {
    type: "static",
    changes: [
      { target: "skill.kpl", type: "untyped", formula: "if(gte(@skills.kpl.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Knowledge (religion).
  "skill-focus-knowledge-religion": {
    type: "static",
    changes: [
      { target: "skill.kre", type: "untyped", formula: "if(gte(@skills.kre.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Linguistics.
  "skill-focus-linguistics": {
    type: "static",
    changes: [
      { target: "skill.lin", type: "untyped", formula: "if(gte(@skills.lin.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Lore.
  "skill-focus-lore": {
    type: "static",
    changes: [
      { target: "skill.lor", type: "untyped", formula: "if(gte(@skills.lor.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Perception.
  "skill-focus-perception": {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "if(gte(@skills.per.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Ride.
  "skill-focus-ride": {
    type: "static",
    changes: [
      { target: "skill.rid", type: "untyped", formula: "if(gte(@skills.rid.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Sense Motive.
  "skill-focus-sense-motive": {
    type: "static",
    changes: [
      { target: "skill.sen", type: "untyped", formula: "if(gte(@skills.sen.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Sleight of Hand.
  "skill-focus-sleight-of-hand": {
    type: "static",
    changes: [
      { target: "skill.slt", type: "untyped", formula: "if(gte(@skills.slt.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Spellcraft.
  "skill-focus-spellcraft": {
    type: "static",
    changes: [
      { target: "skill.spl", type: "untyped", formula: "if(gte(@skills.spl.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Stealth.
  "skill-focus-stealth": {
    type: "static",
    changes: [
      { target: "skill.ste", type: "untyped", formula: "if(gte(@skills.ste.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Survival.
  "skill-focus-survival": {
    type: "static",
    changes: [
      { target: "skill.sur", type: "untyped", formula: "if(gte(@skills.sur.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Swim.
  "skill-focus-swim": {
    type: "static",
    changes: [
      { target: "skill.swm", type: "untyped", formula: "if(gte(@skills.swm.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional rank-gated Skill Focus bonus on Use Magic Device.
  "skill-focus-use-magic-device": {
    type: "static",
    changes: [
      { target: "skill.umd", type: "untyped", formula: "if(gte(@skills.umd.rank, 10), 6, 3)" },
    ],
    confidence: "high",
    provenance:
      "You get a +3 bonus on all checks involving the chosen skill. If you have 10 or more ranks in that skill, this bonus increases to +6.",
  },
  // Unconditional +2 bonus on Sense Motive checks (the feat's other benefits are situational).
  "snake-style": {
    type: "static",
    changes: [{ target: "skill.sen", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance: "You gain a +2 bonus on Sense Motive checks",
  },
  // Unconditional full immunity to electricity for cloud/storm giants.
  "storm-soul": {
    type: "static",
    changes: [{ target: "imm.electricity", type: "untyped", formula: "1" }],
    confidence: "high",
    provenance: "You gain immunity to electricity.",
  },
  // Unconditional rank-gated bonus to Knowledge (local) and Sense Motive.
  "street-smarts": {
    type: "static",
    changes: [
      { target: "skill.klo", type: "untyped", formula: "if(gte(@skills.klo.rank, 10), 4, 2)" },
      { target: "skill.sen", type: "untyped", formula: "if(gte(@skills.sen.rank, 10), 4, 2)" },
    ],
    classSkills: ["klo"],
    confidence: "high",
    provenance:
      "You get a +2 bonus on Knowledge (local) and Sense Motive checks, and Knowledge (local) is always a class skill for you. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill.",
  },
  // Unconditional racial bonus to Acrobatics and Climb checks.
  "sure-and-fleet": {
    type: "static",
    changes: [
      { target: "skill.acr", type: "racial", formula: "2" },
      { target: "skill.clm", type: "racial", formula: "2" },
    ],
    confidence: "high",
    provenance: "You gain a +2 racial bonus on Acrobatics and Climb checks.",
  },
  // Unconditional rank-gated Swim bonus (the marshy-terrain doubling is left unmodeled as situational).
  "swamp-dweller": {
    type: "static",
    changes: [
      { target: "skill.swm", type: "untyped", formula: "if(gte(@skills.swm.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Swim checks. If you have 10 or more ranks in Swim, the bonus increases to +4.",
  },
  // Unconditional +15 ft swim speed for a lizardfolk who already has a swim speed.
  "swift-swimmer": {
    type: "static",
    changes: [{ target: "swimSpeed", type: "untyped", formula: "15" }],
    confidence: "high",
    provenance: "Your swim speed increases by 15 feet.",
  },
  // Unconditional fire resistance 5 (the swift-action upgrade to 10 and the vs-fire-or-heat save bonus are left unmodeled as situational).
  "touched-by-sacred-fire": {
    type: "static",
    changes: [{ target: "eres.fire", type: "untyped", formula: "5" }],
    confidence: "high",
    provenance:
      "You gain fire resistance 5 and a +2 bonus on all saving throws to resist the effects of fire or heat.",
  },
  // Unconditional rank-gated Sense Motive bonus (the emotion-spell DC/CL boost and below-quarter-HP completion benefit are left unmodeled as situational).
  "true-love": {
    type: "static",
    changes: [
      { target: "skill.sen", type: "untyped", formula: "if(gte(@skills.sen.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "you gain a +2 bonus on Sense Motive checks. If you have 10 or more ranks in Sense Motive, this bonus increases to +4",
  },
  // Unconditional rank-gated Knowledge (history) bonus; the secret-door and illusion-reroll completion benefits are left unmodeled.
  "truth-seeker": {
    type: "static",
    changes: [
      { target: "skill.khi", type: "untyped", formula: "if(gte(@skills.khi.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on all Knowledge (history) checks. If you have 10 or more ranks in Knowledge (history), this bonus increases to +4.",
  },
  // Unconditional Disguise bonus (the Sleight of Hand and anti-scrying Will save clauses are scoped/situational and left unmodeled).
  "twilight-tattoo": {
    type: "static",
    changes: [{ target: "skill.dis", type: "untyped", formula: "2" }],
    confidence: "high",
    provenance: "you gain a +2 bonus on Disguise checks",
  },
  // Unconditional Perception and Sense Motive bonus (the vs-sleep/charm save bonus is an enumerated subset and left unmodeled as situational).
  "uncanny-alertness": {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "1" },
      { target: "skill.sen", type: "untyped", formula: "1" },
    ],
    confidence: "high",
    provenance: "This feat gives you an additional +1 bonus on Perception and Sense Motive checks",
  },
  // Unconditional circumstance bonus to Knowledge (history) (the object-reading spell-like ability is left unmodeled).
  "unraveler-of-secrets": {
    type: "static",
    changes: [{ target: "skill.khi", type: "circumstance", formula: "2" }],
    confidence: "high",
    provenance: "You gain a +2 circumstance bonus on Knowledge (history) checks.",
  },
  // Unconditional burrow speed grant of 10 feet (repeatable).
  "warren-digger": {
    type: "static",
    changes: [{ target: "burrowSpeed", type: "untyped", formula: "10" }],
    confidence: "high",
    provenance: "You gain a burrow speed of 10 feet through earth, sand, or soil.",
  },
  // Unconditional initiative bonus (the concentration-check bonus has no engine target and is left unmodeled).
  "warrior-priest": {
    type: "static",
    changes: [{ target: "init", type: "untyped", formula: "1" }],
    confidence: "high",
    provenance: "You gain a +1 bonus on initiative checks",
  },
  // Unconditional rank-gated Perception bonus (the extra surprise-round-only bonus is left unmodeled as situational).
  "wilding-senses": {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "if(gte(@skills.per.rank, 10), 4, 2)" },
    ],
    confidence: "high",
    provenance:
      "You gain a +2 bonus on Perception checks; this bonus increases to +4 when determining if you can act during a surprise round. If you have 10 or more ranks in Perception, this bonus increases to +4 (or +8 when determining whether you can act during a surprise round).",
  },
  // Unconditional +10 ft base speed increase.
  "wilding-stride": {
    type: "static",
    changes: [{ target: "landSpeed", type: "untyped", formula: "10" }],
    confidence: "high",
    provenance: "Your base speed increases by 10 feet.",
  },
};

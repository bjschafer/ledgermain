/**
 * Machine-extracted feat effects — issue #45's feat batch-extraction pass,
 * sibling to `feat-effects.ts`'s hand-verified `FEAT_EFFECTS`/`FEAT_POOL_EFFECTS`
 * and mirroring `archetype-extracted/`'s `ExtractedArchetypeFeatureEffect`
 * shape (`confidence` + `provenance`). See `feat-classification.ts` for the
 * full per-feat audit this table was drawn from, and `feat-effects-resolve.ts`
 * for the precedence rule between this table and the hand-verified one.
 *
 * Every entry here was individually read against the vendored feat
 * `description` (this repo's own OGL data slice) and cross-checked against
 * the published PF1 rules — clean-room, no Foundry system code consulted
 * (CLAUDE.md licensing). All entries are `"high"` confidence (except Master
 * Craftsman, see below): each is a literal, unconditional CRB rule with an
 * exact textual match to an already-hand-verified shape elsewhere in this
 * codebase (the "+2/+2 skill pair, +4 at 10 ranks" family matches the
 * hand-verified Alertness entry verbatim in structure; Greater Weapon
 * Focus/Specialization are literal "+1 more, stacks" / "+2 more, stacks"
 * extensions of the hand-verified Weapon Focus/Specialization entries; Extra
 * Arcane Pool is a literal "+2, stacks" sibling of the six hand-verified
 * Extra-X pool feats).
 *
 * Precedence (see `feat-effects-resolve.ts`): none of these ids exist in
 * `FEAT_EFFECTS` today, so there is no double-apply risk in production, but
 * `resolveFeatEffect` still enforces hand-wins-over-extracted so a future
 * hand-authored entry for one of these slugs can never double up with this
 * table.
 */

import type { ExtractionConfidence } from "./archetype-extracted/types.js";
import type { ChoiceFeatEntry, StaticFeatEntry } from "./feat-effects.js";

export type { ExtractionConfidence };

export type ExtractedStaticFeatEntry = StaticFeatEntry & {
  confidence: ExtractionConfidence;
  provenance: string;
};

export type ExtractedChoiceFeatEntry = ChoiceFeatEntry & {
  confidence: ExtractionConfidence;
  provenance: string;
};

export type ExtractedFeatEntry = ExtractedStaticFeatEntry | ExtractedChoiceFeatEntry;

/**
 * Small helper: the "+2/+2 on a skill pair, +4 at 10+ ranks in either" shape
 * shared by Acrobatic, Athletic, Deceitful, Animal Affinity, Deft Hands,
 * Magical Aptitude, Persuasive, Self-Sufficient, and Stealthy — identical in
 * structure to the hand-verified Alertness entry in `feat-effects.ts`.
 */
function skillPair(a: string, b: string): StaticFeatEntry["changes"] {
  return [
    { target: `skill.${a}`, type: "untyped", formula: `if(gte(@skills.${a}.rank, 10), 4, 2)` },
    { target: `skill.${b}`, type: "untyped", formula: `if(gte(@skills.${b}.rank, 10), 4, 2)` },
  ];
}

export const FEAT_EFFECTS_EXTRACTED: Readonly<Record<string, ExtractedFeatEntry>> = {
  // Acrobatic: +2/+4 Acrobatics and Fly (PF1 CRB p. 118).
  acrobatic: {
    type: "static",
    changes: skillPair("acr", "fly"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Acrobatics and Fly skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Athletic: +2/+4 Climb and Swim (PF1 CRB p. 119).
  athletic: {
    type: "static",
    changes: skillPair("clm", "swm"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on Climb and Swim skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Deceitful: +2/+4 Bluff and Disguise (PF1 CRB p. 122).
  deceitful: {
    type: "static",
    changes: skillPair("blf", "dis"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Bluff and Disguise skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Animal Affinity: +2/+4 Handle Animal and Ride (PF1 CRB p. 118).
  "animal-affinity": {
    type: "static",
    changes: skillPair("han", "rid"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Handle Animal and Ride skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Deft Hands: +2/+4 Disable Device and Sleight of Hand (PF1 CRB p. 122).
  "deft-hands": {
    type: "static",
    changes: skillPair("dev", "slt"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on Disable Device and Sleight of Hand skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Magical Aptitude: +2/+4 Spellcraft and Use Magic Device (PF1 CRB p. 129).
  "magical-aptitude": {
    type: "static",
    changes: skillPair("spl", "umd"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Spellcraft checks and Use Magic Device checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Persuasive: +2/+4 Diplomacy and Intimidate (PF1 CRB p. 131).
  persuasive: {
    type: "static",
    changes: skillPair("dip", "int"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on Diplomacy and Intimidate skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Self-Sufficient: +2/+4 Heal and Survival (PF1 CRB p. 133).
  "self-sufficient": {
    type: "static",
    changes: skillPair("hea", "sur"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Heal checks and Survival checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Stealthy: +2/+4 Escape Artist and Stealth (PF1 CRB p. 135).
  stealthy: {
    type: "static",
    changes: skillPair("esc", "ste"),
    confidence: "high",
    provenance:
      '"You get a +2 bonus on all Escape Artist and Stealth skill checks. If you have 10 or more ranks in one of these skills, the bonus increases to +4 for that skill."',
  },

  // Intimidating Prowess: add Str modifier to Intimidate, in ADDITION to the
  // skill's normal Cha-based total (PF1 CRB p. 127). Unconditional, single
  // target — @abilities.str.mod resolves to 0 for a Str 10 character, so this
  // never subtracts from the skill.
  "intimidating-prowess": {
    type: "static",
    changes: [{ target: "skill.int", type: "untyped", formula: "@abilities.str.mod" }],
    confidence: "high",
    provenance:
      '"Add your Strength modifier to Intimidate skill checks in addition to your Charisma modifier."',
  },

  // Greater Weapon Focus: +1 more untyped attack with a weapon already chosen
  // for Weapon Focus; stacks with it (PF1 CRB p. 125). Same
  // attack.weapon.<group> target and "weapon" choice shape as the
  // hand-verified Weapon Focus entry.
  "greater-weapon-focus": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string) {
      return [{ target: `attack.weapon.${choiceId}`, type: "untyped", formula: "1" }];
    },
    confidence: "high",
    provenance:
      '"You gain a +1 bonus on attack rolls you make using the selected weapon. This bonus stacks with other bonuses on attack rolls, including those from Weapon Focus."',
  },

  // Greater Weapon Specialization: +2 more untyped damage with a weapon
  // already chosen for Weapon Specialization; stacks with it (PF1 CRB p.
  // 125). Same damage.weapon.<group> target and "weapon" choice shape as the
  // hand-verified Weapon Specialization entry.
  "greater-weapon-specialization": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string) {
      return [{ target: `damage.weapon.${choiceId}`, type: "untyped", formula: "2" }];
    },
    confidence: "high",
    provenance:
      '"You gain a +2 bonus on all damage rolls you make using the selected weapon. This bonus to damage stacks with other damage roll bonuses, including any you gain from Weapon Specialization."',
  },

  // Master Craftsman: +2 on the chosen Craft/Profession skill (PF1 APG p.
  // 156). PARTIAL extraction — reuses the existing "skill" choice shape for
  // the flat bonus only; the feat's other clause (substituting skill ranks
  // for caster level to qualify for/use Craft Magic Arms and Armor / Craft
  // Wondrous Item) has no engine equivalent (caster level for item creation
  // isn't modeled) and is deliberately not represented here — hence "medium"
  // confidence rather than "high".
  "master-craftsman": {
    type: "choice",
    choice: { type: "skill", label: "Craft or Profession Skill" },
    build(choiceId: string) {
      return [{ target: `skill.${choiceId}`, type: "untyped", formula: "2" }];
    },
    confidence: "medium",
    provenance:
      '"You receive a +2 bonus on your chosen Craft or Profession skill." (the caster-level-substitution clause is not modeled — see this entry\'s comment)',
  },
};

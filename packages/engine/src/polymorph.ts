/**
 * Clean-room PF1 polymorph-subschool tables (issue #70): Wild Shape's actual
 * transformation, previously unmodeled ("the use-count
 * is trackable, the transformation itself is not modeled" — Wild Shape's
 * `uses.maxFormula` resource pool is untouched by this file, see
 * `resources.ts`). Covers Beast Shape I-IV (animal, plus the magical-beast
 * rows III/IV add), Elemental Body I-IV, and Plant Shape I-III — together
 * these fully cover a core druid's Wild Shape class feature (see
 * {@link wildShapeTiersForLevel}), and double as the effect table for the
 * identically-named spells (any class that gets one of these spells can pick
 * a tier directly, no druid level required).
 *
 * Hand-authored from the published rules — verified against aonprd.com (spell
 * pages for each tier) and cross-checked against d20pfsrd.com for Wild
 * Shape's own level progression (both sources agreeing verbatim), July 2026.
 * Never derived from or compared against Foundry's GPL system code (DESIGN
 * §6) — only the openly-published SRD spell text.
 *
 * Bonus typing (verified against the Polymorph subschool's well-established
 * rules-forum FAQ answer, repeatedly confirmed by Paizo staff): every ability
 * score adjustment below is a "size" bonus/penalty — EXCEPT Plant Shape
 * Medium's Constitution bump, which the spell text itself calls out as an
 * "enhancement bonus" (the one published outlier) — and every natural-armor
 * bonus is a plain (untyped-vs-other-natural-armor) bonus that does not stack
 * with an existing natural armor bonus, only the higher applies. This project
 * already types a race's own innate natural armor as `"base"` (see
 * `races.json`'s `nac` changes) specifically so two same-type "who has the
 * bigger natural hide" bonuses take the highest rather than summing — reusing
 * that exact type here gets the correct RAW interaction (a Lizardfolk's own
 * hide vs. a Wild Shape natural-armor bonus) for free through the existing
 * typed-bonus stacker (`stacking.ts`), no polymorph-specific stacking logic
 * needed. "size" bonuses/penalties likewise ride the stacker's ordinary
 * take-highest-within-type rule, which is exactly how a size bonus from this
 * table is supposed to interact with, say, Enlarge Person's own "size" change
 * to the same ability (RAW: they don't stack; whichever is higher applies).
 */

import type { AbilityId, SizeId } from "@pf1/schema";

export type PolymorphCreatureType = "animal" | "magicalBeast" | "elemental" | "plant";
export type PolymorphElement = "air" | "earth" | "fire" | "water";

export type PolymorphTier =
  | "beastShapeI"
  | "beastShapeII"
  | "beastShapeIII"
  | "beastShapeIV"
  | "elementalBodyI"
  | "elementalBodyII"
  | "elementalBodyIII"
  | "elementalBodyIV"
  | "plantShapeI"
  | "plantShapeII"
  | "plantShapeIII";

export interface PolymorphAbilityAdjustment {
  ability: AbilityId;
  /** See the file doc comment's "Bonus typing" section. */
  type: "size" | "enhancement";
  value: number;
}

/** One size/creature-type/element row within a tier's menu. */
export interface PolymorphFormOption {
  creatureType: PolymorphCreatureType;
  size: SizeId;
  /** Only present when `creatureType === "elemental"`. */
  element?: PolymorphElement;
  /** Display label, e.g. "Huge animal", "Small air elemental". */
  label: string;
  abilityAdjustments: PolymorphAbilityAdjustment[];
  /** Natural armor bonus granted at this size/element (see file doc comment on typing). */
  naturalArmor: number;
  /** Riders specific to this exact row (movement modes, resistances/vulnerabilities). Display only. */
  notes?: string[];
}

export interface PolymorphTierDef {
  id: PolymorphTier;
  /** Display name, e.g. "Beast Shape III". */
  name: string;
  /** Every size/creature-type/element row this tier's menu offers (cumulative with lower tiers of the same spell line, matching the SRD's "functions as X, except also..." wording). */
  options: PolymorphFormOption[];
  /** Riders shared by every option in this tier (movement/sense grants "if the true form has them", immunities, etc.). Display only. */
  notes?: string[];
}

/* --------------------------------------------------------------- animal */

const ANIMAL_SM: PolymorphFormOption = {
  creatureType: "animal",
  size: "sm",
  label: "Small animal",
  abilityAdjustments: [{ ability: "dex", type: "size", value: 2 }],
  naturalArmor: 1,
};
const ANIMAL_MED: PolymorphFormOption = {
  creatureType: "animal",
  size: "med",
  label: "Medium animal",
  abilityAdjustments: [{ ability: "str", type: "size", value: 2 }],
  naturalArmor: 2,
};
const ANIMAL_TINY: PolymorphFormOption = {
  creatureType: "animal",
  size: "tiny",
  label: "Tiny animal",
  abilityAdjustments: [
    { ability: "dex", type: "size", value: 4 },
    { ability: "str", type: "size", value: -2 },
  ],
  naturalArmor: 1,
};
const ANIMAL_LG: PolymorphFormOption = {
  creatureType: "animal",
  size: "lg",
  label: "Large animal",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 4 },
    { ability: "dex", type: "size", value: -2 },
  ],
  naturalArmor: 4,
};
const ANIMAL_DIM: PolymorphFormOption = {
  creatureType: "animal",
  size: "dim",
  label: "Diminutive animal",
  abilityAdjustments: [
    { ability: "dex", type: "size", value: 6 },
    { ability: "str", type: "size", value: -4 },
  ],
  naturalArmor: 1,
};
const ANIMAL_HUGE: PolymorphFormOption = {
  creatureType: "animal",
  size: "huge",
  label: "Huge animal",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 6 },
    { ability: "dex", type: "size", value: -4 },
  ],
  naturalArmor: 6,
};
const MAGICAL_BEAST_SM: PolymorphFormOption = {
  creatureType: "magicalBeast",
  size: "sm",
  label: "Small magical beast",
  abilityAdjustments: [{ ability: "dex", type: "size", value: 4 }],
  naturalArmor: 2,
};
const MAGICAL_BEAST_MED: PolymorphFormOption = {
  creatureType: "magicalBeast",
  size: "med",
  label: "Medium magical beast",
  abilityAdjustments: [{ ability: "str", type: "size", value: 4 }],
  naturalArmor: 4,
};
const MAGICAL_BEAST_TINY: PolymorphFormOption = {
  creatureType: "magicalBeast",
  size: "tiny",
  label: "Tiny magical beast",
  abilityAdjustments: [
    { ability: "dex", type: "size", value: 8 },
    { ability: "str", type: "size", value: -2 },
  ],
  naturalArmor: 3,
};
const MAGICAL_BEAST_LG: PolymorphFormOption = {
  creatureType: "magicalBeast",
  size: "lg",
  label: "Large magical beast",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 6 },
    { ability: "dex", type: "size", value: -2 },
    { ability: "con", type: "size", value: 2 },
  ],
  naturalArmor: 6,
};

/* ---------------------------------------------------------------- plant */

const PLANT_SM: PolymorphFormOption = {
  creatureType: "plant",
  size: "sm",
  label: "Small plant",
  abilityAdjustments: [{ ability: "con", type: "size", value: 2 }],
  naturalArmor: 2,
};
const PLANT_MED: PolymorphFormOption = {
  creatureType: "plant",
  size: "med",
  label: "Medium plant",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 2 },
    // The one published outlier — Plant Shape's own text calls this an
    // "enhancement bonus," not a size bonus (see file doc comment).
    { ability: "con", type: "enhancement", value: 2 },
  ],
  naturalArmor: 2,
};
const PLANT_LG: PolymorphFormOption = {
  creatureType: "plant",
  size: "lg",
  label: "Large plant",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 4 },
    { ability: "con", type: "size", value: 2 },
  ],
  naturalArmor: 4,
};
const PLANT_HUGE: PolymorphFormOption = {
  creatureType: "plant",
  size: "huge",
  label: "Huge plant",
  abilityAdjustments: [
    { ability: "str", type: "size", value: 8 },
    { ability: "dex", type: "size", value: -2 },
    { ability: "con", type: "size", value: 4 },
  ],
  naturalArmor: 6,
};

/* ------------------------------------------------------------ elemental */

function elementalOption(
  element: PolymorphElement,
  size: SizeId,
  label: string,
  abilityAdjustments: PolymorphAbilityAdjustment[],
  naturalArmor: number,
  notes?: string[],
): PolymorphFormOption {
  return {
    creatureType: "elemental",
    element,
    size,
    label,
    abilityAdjustments,
    naturalArmor,
    notes,
  };
}

const ELEMENTAL_BODY_I: PolymorphFormOption[] = [
  elementalOption(
    "air",
    "sm",
    "Small air elemental",
    [{ ability: "dex", type: "size", value: 2 }],
    2,
    ["Fly 60 ft. (perfect), darkvision 60 ft., whirlwind."],
  ),
  elementalOption(
    "earth",
    "sm",
    "Small earth elemental",
    [{ ability: "str", type: "size", value: 2 }],
    4,
    ["Darkvision 60 ft., earth glide."],
  ),
  elementalOption(
    "fire",
    "sm",
    "Small fire elemental",
    [{ ability: "dex", type: "size", value: 2 }],
    2,
    ["Darkvision 60 ft., resist fire 20, vulnerable to cold, burn."],
  ),
  elementalOption(
    "water",
    "sm",
    "Small water elemental",
    [{ ability: "con", type: "size", value: 2 }],
    4,
    ["Swim 60 ft., darkvision 60 ft., vortex, breathe water."],
  ),
];

const ELEMENTAL_BODY_II: PolymorphFormOption[] = [
  elementalOption(
    "air",
    "med",
    "Medium air elemental",
    [{ ability: "dex", type: "size", value: 4 }],
    3,
    ["Fly 60 ft. (perfect), darkvision 60 ft., whirlwind."],
  ),
  elementalOption(
    "earth",
    "med",
    "Medium earth elemental",
    [{ ability: "str", type: "size", value: 4 }],
    5,
    ["Darkvision 60 ft., earth glide."],
  ),
  elementalOption(
    "fire",
    "med",
    "Medium fire elemental",
    [{ ability: "dex", type: "size", value: 4 }],
    3,
    ["Darkvision 60 ft., resist fire 20, vulnerable to cold, burn."],
  ),
  elementalOption(
    "water",
    "med",
    "Medium water elemental",
    [{ ability: "con", type: "size", value: 4 }],
    5,
    ["Swim 60 ft., darkvision 60 ft., vortex, breathe water."],
  ),
];

const ELEMENTAL_BODY_III: PolymorphFormOption[] = [
  elementalOption(
    "air",
    "lg",
    "Large air elemental",
    [
      { ability: "str", type: "size", value: 2 },
      { ability: "dex", type: "size", value: 4 },
    ],
    4,
    ["Fly 90 ft. (perfect), darkvision 60 ft., whirlwind."],
  ),
  elementalOption(
    "earth",
    "lg",
    "Large earth elemental",
    [
      { ability: "str", type: "size", value: 6 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 2 },
    ],
    6,
    ["Darkvision 60 ft., earth glide."],
  ),
  elementalOption(
    "fire",
    "lg",
    "Large fire elemental",
    [
      { ability: "dex", type: "size", value: 4 },
      { ability: "con", type: "size", value: 2 },
    ],
    4,
    ["Darkvision 60 ft., resist fire 20, vulnerable to cold, burn."],
  ),
  elementalOption(
    "water",
    "lg",
    "Large water elemental",
    [
      { ability: "str", type: "size", value: 2 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 6 },
    ],
    6,
    ["Swim 90 ft., darkvision 60 ft., vortex, breathe water."],
  ),
];

const ELEMENTAL_BODY_IV: PolymorphFormOption[] = [
  elementalOption(
    "air",
    "huge",
    "Huge air elemental",
    [
      { ability: "str", type: "size", value: 4 },
      { ability: "dex", type: "size", value: 6 },
    ],
    4,
    ["Fly 120 ft. (perfect), darkvision 60 ft., whirlwind."],
  ),
  elementalOption(
    "earth",
    "huge",
    "Huge earth elemental",
    [
      { ability: "str", type: "size", value: 8 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 4 },
    ],
    6,
    ["Darkvision 60 ft., earth glide."],
  ),
  elementalOption(
    "fire",
    "huge",
    "Huge fire elemental",
    [
      { ability: "dex", type: "size", value: 6 },
      { ability: "con", type: "size", value: 4 },
    ],
    4,
    ["Darkvision 60 ft., resist fire 20, vulnerable to cold, burn."],
  ),
  elementalOption(
    "water",
    "huge",
    "Huge water elemental",
    [
      { ability: "str", type: "size", value: 4 },
      { ability: "dex", type: "size", value: -2 },
      { ability: "con", type: "size", value: 8 },
    ],
    6,
    ["Swim 120 ft., darkvision 60 ft., vortex, breathe water."],
  ),
];

/* ------------------------------------------------------------------ tiers */

const ELEMENTAL_IMMUNITY_NOTE =
  "Immune to bleed damage, critical hits, and sneak attacks while in elemental form.";

const TIER_LIST: PolymorphTierDef[] = [
  {
    id: "beastShapeI",
    name: "Beast Shape I",
    options: [ANIMAL_SM, ANIMAL_MED],
    notes: [
      "If the true form has them: climb 30 ft., fly 30 ft. (average), swim 30 ft., darkvision 60 ft., low-light vision, scent.",
    ],
  },
  {
    id: "beastShapeII",
    name: "Beast Shape II",
    options: [ANIMAL_SM, ANIMAL_MED, ANIMAL_TINY, ANIMAL_LG],
    notes: [
      "If the true form has them: climb 60 ft., fly 60 ft. (good), swim 60 ft., darkvision 60 ft., low-light vision, scent, grab, pounce, trip.",
    ],
  },
  {
    id: "beastShapeIII",
    name: "Beast Shape III",
    options: [
      ANIMAL_SM,
      ANIMAL_MED,
      ANIMAL_TINY,
      ANIMAL_LG,
      ANIMAL_DIM,
      ANIMAL_HUGE,
      MAGICAL_BEAST_SM,
      MAGICAL_BEAST_MED,
    ],
    notes: [
      "If the true form has them: burrow 30 ft., climb 90 ft., fly 90 ft. (good), swim 90 ft., blindsense 30 ft., darkvision 60 ft., low-light vision, scent, constrict, grab, pounce, rake, trip.",
    ],
  },
  {
    id: "beastShapeIV",
    name: "Beast Shape IV",
    options: [
      ANIMAL_SM,
      ANIMAL_MED,
      ANIMAL_TINY,
      ANIMAL_LG,
      ANIMAL_DIM,
      ANIMAL_HUGE,
      MAGICAL_BEAST_SM,
      MAGICAL_BEAST_MED,
      MAGICAL_BEAST_TINY,
      MAGICAL_BEAST_LG,
    ],
    notes: [
      "If the true form has them: movement up to 120 ft., breath weapon, constrict, grab, poison, pounce, tremorsense 60 ft.",
      "Gain resistance 20 (or immunity, matching the true form) to an energy type it resists/is immune to; gain any vulnerability it has.",
    ],
  },
  { id: "elementalBodyI", name: "Elemental Body I", options: ELEMENTAL_BODY_I },
  { id: "elementalBodyII", name: "Elemental Body II", options: ELEMENTAL_BODY_II },
  {
    id: "elementalBodyIII",
    name: "Elemental Body III",
    options: ELEMENTAL_BODY_III,
    notes: [ELEMENTAL_IMMUNITY_NOTE],
  },
  {
    id: "elementalBodyIV",
    name: "Elemental Body IV",
    options: ELEMENTAL_BODY_IV,
    notes: [ELEMENTAL_IMMUNITY_NOTE, "DR 5/—."],
  },
  {
    id: "plantShapeI",
    name: "Plant Shape I",
    options: [PLANT_SM, PLANT_MED],
    notes: [
      "If the true form has them: darkvision 60 ft., low-light vision, constrict, grab, poison.",
      "If the plant form can't move on its own, speed drops to 5 ft. and every other movement mode is lost.",
      "Gain any elemental vulnerability the true form has; gain resistance 20 to any element it resists/is immune to.",
    ],
  },
  {
    id: "plantShapeII",
    name: "Plant Shape II",
    options: [PLANT_SM, PLANT_MED, PLANT_LG],
    notes: [
      "If the true form has them: darkvision 60 ft., low-light vision, constrict, grab, poison.",
      "If the plant form can't move on its own, speed drops to 5 ft. and every other movement mode is lost.",
      "Gain any elemental vulnerability the true form has; gain resistance 20 to any element it resists/is immune to.",
    ],
  },
  {
    id: "plantShapeIII",
    name: "Plant Shape III",
    options: [PLANT_SM, PLANT_MED, PLANT_LG, PLANT_HUGE],
    notes: [
      "If the true form has them: darkvision 60 ft., low-light vision, constrict, grab, poison, DR, regeneration 5, trample.",
      "If the plant form can't move on its own, speed drops to 5 ft. and every other movement mode is lost.",
      "Gain any elemental vulnerability the true form has; gain resistance 20 to any element it resists/is immune to.",
    ],
  },
];

export const POLYMORPH_TIERS: Record<PolymorphTier, PolymorphTierDef> = Object.fromEntries(
  TIER_LIST.map((t) => [t.id, t]),
) as Record<PolymorphTier, PolymorphTierDef>;

export const POLYMORPH_TIER_IDS: readonly PolymorphTier[] = TIER_LIST.map((t) => t.id);

/**
 * Look up one (tier, creatureType, size, element) row. Returns `undefined`
 * for an unknown tier or a combination the tier doesn't offer (e.g. a "huge
 * elemental" that isn't Elemental Body IV's fixed size, or a stale/
 * house-ruled id) — soft, never throws, matching this codebase's posture for
 * every other id-keyed table lookup.
 */
export function polymorphFormOption(
  tier: string,
  creatureType: string,
  size: string,
  element?: string,
): PolymorphFormOption | undefined {
  const def = POLYMORPH_TIERS[tier as PolymorphTier];
  if (!def) return undefined;
  return def.options.find(
    (o) =>
      o.creatureType === creatureType &&
      o.size === size &&
      (o.element ?? undefined) === (element ?? undefined),
  );
}

/* ------------------------------------------------------ wild shape (druid) */

/**
 * Druid level thresholds at which each polymorph tier becomes available via
 * the Wild Shape class feature — verified against the Wild Shape class
 * feature's own text (aonprd.com, cross-checked verbatim against
 * d20pfsrd.com's mirror): 4th Beast Shape I; 6th Beast Shape II + Elemental
 * Body I; 8th Beast Shape III + Elemental Body II + Plant Shape I; 10th
 * Elemental Body III + Plant Shape II; 12th Elemental Body IV + Plant Shape
 * III. Wild Shape's animal cap is Beast Shape III (never grants the
 * magical-beast rows of Beast Shape III/IV, nor Beast Shape IV at all — the
 * class feature's own text enumerates only "animal," "elemental," and "plant"
 * forms at every level, unlike the identically-tiered spells which do grant
 * magical-beast forms). Cumulative: once granted, a tier stays available at
 * every higher level.
 */
const WILD_SHAPE_LEVEL_TIERS: readonly { level: number; tiers: readonly PolymorphTier[] }[] = [
  { level: 4, tiers: ["beastShapeI"] },
  { level: 6, tiers: ["beastShapeII", "elementalBodyI"] },
  { level: 8, tiers: ["beastShapeIII", "elementalBodyII", "plantShapeI"] },
  { level: 10, tiers: ["elementalBodyIII", "plantShapeII"] },
  { level: 12, tiers: ["elementalBodyIV", "plantShapeIII"] },
];

/** Every polymorph tier a druid's Wild Shape grants at `druidLevel` (cumulative). 0/negative levels grant none. */
export function wildShapeTiersForLevel(druidLevel: number): PolymorphTier[] {
  const out: PolymorphTier[] = [];
  for (const row of WILD_SHAPE_LEVEL_TIERS) {
    if (druidLevel >= row.level) out.push(...row.tiers);
  }
  return out;
}

/* -------------------------------------------------------------- attacks */

export interface PolymorphNaturalAttackInput {
  name: string;
  /** How many of this attack (e.g. 2 for "2 claws"). Default 1. */
  count?: number;
  /** Display-only damage dice string, e.g. "1d8". */
  damageDice?: string;
  /** Default "primary". */
  kind?: "primary" | "secondary";
}

export interface ResolvedPolymorphAttack {
  name: string;
  count: number;
  kind: "primary" | "secondary";
  /** BAB + Str mod + size modifier, and −5 more when `kind === "secondary"` (PF1 RAW "Natural Attacks"). */
  attackBonus: number;
  /**
   * Str mod added to damage — full for a primary attack; half (floored) for a
   * secondary one, except a Strength PENALTY always applies in full to both
   * (PF1 RAW "Natural Attacks": "a creature always adds its full penalty for
   * low Strength to the damage of all such attacks").
   */
  damageBonus: number;
  damageDice?: string;
}

/**
 * Resolves each entered natural-attack line's numbers. Deliberately simple
 * (no iteratives, no Weapon Finesse/Dex-to-hit substitution) — the player
 * transcribes the form's attack lines off its stat block; this only supplies
 * the BAB/Str/size math common to every natural attack (design brief for
 * issue #70: "keep it simple").
 */
export function computePolymorphAttacks(
  bab: number,
  strMod: number,
  sizeAttackMod: number,
  attacks: readonly PolymorphNaturalAttackInput[],
): ResolvedPolymorphAttack[] {
  return attacks.map((a) => {
    const kind = a.kind ?? "primary";
    const secondary = kind === "secondary";
    const attackBonus = bab + strMod + sizeAttackMod - (secondary ? 5 : 0);
    const damageBonus = secondary ? (strMod >= 0 ? Math.floor(strMod / 2) : strMod) : strMod;
    return {
      name: a.name,
      count: a.count ?? 1,
      kind,
      attackBonus,
      damageBonus,
      damageDice: a.damageDice,
    };
  });
}

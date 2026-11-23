/**
 * Accepted differences between Ledgermain and the Foundry PF1 oracle (see
 * `foundryOracle.test.ts`). Each carries a verdict reached from the rules
 * text, never from what Foundry happens to do:
 *
 * - `foundry-departs`: Foundry's number contradicts the cited rule; ours is right.
 * - `representational`: both are defensible; the two tools model it differently.
 *
 * A Ledgermain bug is fixed rather than listed here.
 */

export interface Divergence {
  /** Fixture id (`specs.ts`), or `*` for every fixture. */
  actor: string;
  /** Scenario name, or `*` for every scenario. */
  scenario: string;
  /** Flattened stat key, as printed by the test (`skills.kar`, `ac.touch`). */
  stat: string;
  /**
   * Both numbers, pinned so a change on either side re-fails the test. Left
   * out only for a systematic departure that holds for every scenario (and,
   * with actor `*`, every fixture) the entry covers.
   */
  values?: { foundry: number | string; ledgermain: number | string };
  verdict: "foundry-departs" | "representational";
  /** Rulebook source and page for the call. */
  citation: string;
  why: string;
}

const CONDITION_ABILITY_PENALTY = {
  verdict: "representational",
  citation: "CRB p. 555",
  why: "An ability penalty lowers the modifier and leaves the score alone. Foundry shows the unchanged score; Ledgermain lowers the score by the penalty. The modifiers agree.",
} as const;

const ABILITY_DRAIN = {
  verdict: "foundry-departs",
  citation: "CRB p. 555",
  why: "Ability drain lowers the score itself, and every number keyed to that ability follows the drained modifier. Foundry lowers the score but keeps the undrained modifier everywhere except attack rolls and CMB.",
} as const;

const NEGATIVE_LEVEL_INITIATIVE = {
  verdict: "foundry-departs",
  citation: "CRB pp. 178, 562",
  why: "An initiative check is a Dexterity check, and each negative level is -1 on ability checks. Foundry leaves initiative out.",
} as const;

const WEAPON_FOCUS_SPECIALIZATION = {
  verdict: "foundry-departs",
  citation: "CRB pp. 136–137",
  why: "Weapon Focus is +1 on attacks with the chosen weapon; Weapon Specialization is +2 on damage. The Foundry feat items carry neither a weapon pick nor mechanical effects. The spec picks longsword only in Ledgermain, leaving the greatsword and shortsword unaffected.",
} as const;

const WEAPON_TRAINING = {
  verdict: "foundry-departs",
  citation: "CRB p. 56",
  why: "Weapon Training grants +1 on attack and damage with the first group at 5th level, increasing by +1 every four levels. At fighter 12, heavy blades get +2. Foundry's feature item carries no effects or group picks; the spec picks the group only in Ledgermain.",
} as const;

/** Pinned rows for one fixture scenario: `[stat, foundry, ledgermain]`. */
function pinned(
  actor: string,
  scenario: string,
  rows: [stat: string, foundry: number | string, ledgermain: number | string][],
  entry: Pick<Divergence, "verdict" | "citation" | "why">,
): Divergence[] {
  return rows.map(([stat, foundry, ledgermain]) => ({
    actor,
    scenario,
    stat,
    values: { foundry, ledgermain },
    ...entry,
  }));
}

export const DIVERGENCES: Divergence[] = [
  ...[
    ["base", "10", "10/5"],
    ["haste", "11", "11/6"],
    ["conditions", "6", "6/1"],
    ["stronger", "10", "10/5"],
  ].flatMap(([scenario, foundry, ledgermain]) =>
    pinned("human-ranger-6", scenario!, [["attacks.Javelin.attack", foundry!, ledgermain!]], {
      verdict: "representational",
      citation: "CRB pp. 132, 183, 187",
      why: "The sheet shows the potential BAB full-attack sequence, not the actions needed to draw or reload. Foundry's javelin action emits one throw. Quick Draw or weapons already in hand can allow more throws; neither tool tracks that hand state.",
    }),
  ),
  ...pinned(
    "human-fighter-6",
    "base",
    [
      ["attacks.Longsword.attack", "11/6", "12/7"],
      ["attacks.Longsword.damage", 4, 6],
      ["attacks.Longsword.pa.attack", "9/4", "10/5"],
      ["attacks.Longsword.pa.damage", 8, 10],
      ["attacks.Longsword.2h.attack", "11/6", "12/7"],
      ["attacks.Longsword.2h.damage", 6, 8],
      ["attacks.Longsword.2h-pa.attack", "9/4", "10/5"],
      ["attacks.Longsword.2h-pa.damage", 12, 14],
    ],
    WEAPON_FOCUS_SPECIALIZATION,
  ),
  ...pinned(
    "human-fighter-6",
    "buffs",
    [
      ["attacks.Longsword.attack", "13/8", "14/9"],
      ["attacks.Longsword.damage", 5, 7],
      ["attacks.Longsword.pa.attack", "11/6", "12/7"],
      ["attacks.Longsword.pa.damage", 9, 11],
      ["attacks.Longsword.2h.attack", "13/8", "14/9"],
      ["attacks.Longsword.2h.damage", 7, 9],
      ["attacks.Longsword.2h-pa.attack", "11/6", "12/7"],
      ["attacks.Longsword.2h-pa.damage", 13, 15],
    ],
    WEAPON_FOCUS_SPECIALIZATION,
  ),
  ...pinned(
    "human-fighter-6",
    "conditions",
    [
      ["attacks.Longsword.attack", "8/3", "9/4"],
      ["attacks.Longsword.damage", 3, 5],
      ["attacks.Longsword.pa.attack", "6/1", "7/2"],
      ["attacks.Longsword.pa.damage", 7, 9],
      ["attacks.Longsword.2h.attack", "8/3", "9/4"],
      ["attacks.Longsword.2h.damage", 4, 6],
      ["attacks.Longsword.2h-pa.attack", "6/1", "7/2"],
      ["attacks.Longsword.2h-pa.damage", 10, 12],
    ],
    WEAPON_FOCUS_SPECIALIZATION,
  ),
  ...pinned(
    "human-fighter-12",
    "base",
    [
      ["attacks.Greatsword.attack", "19/14/9", "21/16/11"],
      ["attacks.Greatsword.damage", 9, 11],
      ["attacks.Greatsword.pa.attack", "15/10/5", "17/12/7"],
      ["attacks.Greatsword.pa.damage", 21, 23],
    ],
    WEAPON_TRAINING,
  ),
  ...pinned(
    "human-fighter-12",
    "haste",
    [
      ["attacks.Greatsword.attack", "20/15/10", "22/17/12"],
      ["attacks.Greatsword.damage", 9, 11],
      ["attacks.Greatsword.pa.attack", "16/11/6", "18/13/8"],
      ["attacks.Greatsword.pa.damage", 21, 23],
    ],
    WEAPON_TRAINING,
  ),
  ...pinned(
    "human-fighter-12",
    "enlarged",
    [
      ["attacks.Greatsword.attack", "19/14/9", "21/16/11"],
      ["attacks.Greatsword.damage", 11, 13],
      ["attacks.Greatsword.pa.attack", "15/10/5", "17/12/7"],
      ["attacks.Greatsword.pa.damage", 23, 25],
    ],
    WEAPON_TRAINING,
  ),
  {
    actor: "*",
    scenario: "*",
    stat: "skills.sen",
    verdict: "foundry-departs",
    citation: "CRB p. 104",
    why: "Sense Motive is a Wisdom skill. This pf1 build keys it to Charisma.",
  },
  {
    actor: "elf-wizard-6",
    scenario: "conditions",
    stat: "saves.fort",
    values: { foundry: 4, ledgermain: 3 },
    verdict: "foundry-departs",
    citation: "CRB p. 555",
    why: "Ability drain lowers the score itself. Foundry drops Con to 10 but still adds the undrained +1 to Fortitude.",
  },
  {
    actor: "elf-wizard-6",
    scenario: "conditions",
    stat: "hp.max",
    values: { foundry: 27, ledgermain: 21 },
    verdict: "foundry-departs",
    citation: "CRB p. 555",
    why: "Ability drain lowers the score itself, so a Con 14 wizard drained 2 loses 1 HP per level. Foundry keeps the undrained Con bonus.",
  },
  {
    actor: "elf-wizard-6",
    scenario: "conditions",
    stat: "init",
    values: { foundry: 5, ledgermain: 4 },
    verdict: "foundry-departs",
    citation: "CRB pp. 178, 562",
    why: "An initiative check is a Dexterity check, and each negative level is -1 on ability checks. Foundry applies shaken's ability-check penalty to initiative but not this one.",
  },
  {
    actor: "dwarf-cleric-3-barbarian-2",
    scenario: "*",
    stat: "speed.land",
    values: { foundry: 20, ledgermain: 30 },
    verdict: "foundry-departs",
    citation: "CRB p. 32",
    why: "Barbarian fast movement applies in no, light, or medium armor; scale mail is medium. A dwarf's speed is never reduced by armor, so 20 + 10.",
  },
  {
    actor: "dwarf-cleric-3-barbarian-2",
    scenario: "buffs",
    stat: "cmd",
    values: { foundry: 21, ledgermain: 19 },
    verdict: "foundry-departs",
    citation: "CRB p. 199",
    why: "Any penalty to AC also applies to CMD. Foundry leaves Rage's -2 AC out of CMD.",
  },
  {
    actor: "dwarf-cleric-3-barbarian-2",
    scenario: "buffs",
    stat: "cmd.flatFooted",
    values: { foundry: 20, ledgermain: 18 },
    verdict: "foundry-departs",
    citation: "CRB p. 199",
    why: "Any penalty to AC also applies to CMD. Foundry leaves Rage's -2 AC out of CMD.",
  },
  {
    actor: "human-fighter-6",
    scenario: "conditions",
    stat: "abilities.str.total",
    values: { foundry: 18, ledgermain: 16 },
    ...CONDITION_ABILITY_PENALTY,
  },
  {
    actor: "human-fighter-6",
    scenario: "conditions",
    stat: "abilities.dex.total",
    values: { foundry: 14, ledgermain: 12 },
    ...CONDITION_ABILITY_PENALTY,
  },
  {
    actor: "elf-wizard-6",
    scenario: "conditions",
    stat: "abilities.dex.total",
    values: { foundry: 16, ledgermain: 12 },
    ...CONDITION_ABILITY_PENALTY,
  },
  {
    actor: "dwarf-cleric-3-barbarian-2",
    scenario: "conditions",
    stat: "abilities.dex.total",
    values: { foundry: 12, ledgermain: 8 },
    ...CONDITION_ABILITY_PENALTY,
  },
  ...["skills.acr", "skills.clm"].map((stat): Divergence => ({
    actor: "half-orc-two-handed-fighter-5",
    scenario: "*",
    stat,
    verdict: "foundry-departs",
    citation: "ARG p. 52",
    why: "Rock Climber is +1 on Acrobatics and Climb. pf-content writes its changes with the short skill ids this pf1 build no longer reads, so Foundry drops them.",
  })),
  ...pinned(
    "elf-wizard-7",
    "drained",
    [
      ["saves.fort", 6, 5],
      ["hp.max", 44, 37],
    ],
    ABILITY_DRAIN,
  ),
  ...pinned(
    "dwarf-fighter-4-rogue-4-wizard-4",
    "drained",
    [
      ["cmd", 26, 25],
      ["cmd.flatFooted", 23, 22],
      ["skills.clm", 17, 16],
      ["skills.swm", 2, 1],
    ],
    ABILITY_DRAIN,
  ),
  ...pinned(
    "human-sorcerer-12",
    "conditions",
    [
      ["saves.ref", 10, 8],
      ["init", 6, 4],
      ...["fly", "dev", "esc", "acr", "slt", "rid", "ste"].map((s): [string, number, number] => [
        `skills.${s}`,
        2,
        0,
      ]),
    ],
    ABILITY_DRAIN,
  ),
  ...pinned(
    "elf-wizard-17",
    "conditions",
    [
      ...["kge", "kno", "klo", "kdu", "kre", "kna", "khi", "ken", "apr", "crf"].map(
        (s): [string, number, number] => [`skills.${s}`, 5, 3],
      ),
      ["skills.kar", 25, 23],
      ["skills.kpl", 18, 16],
      ["skills.lin", 13, 11],
      ["skills.spl", 25, 23],
    ],
    ABILITY_DRAIN,
  ),
  ...pinned(
    "dwarf-cleric-17",
    "conditions",
    [
      ["saves.will", 19, 17],
      ["skills.per", 4, 2],
      ["skills.pro", 4, 2],
      ["skills.hea", 24, 22],
      ["skills.sur", 4, 2],
    ],
    ABILITY_DRAIN,
  ),
  ...pinned("elf-wizard-17", "conditions", [["init", 6, 4]], NEGATIVE_LEVEL_INITIATIVE),
  ...pinned("human-cleric-12", "negativeLevels", [["init", 6, 4]], NEGATIVE_LEVEL_INITIATIVE),
  ...pinned("human-oracle-6", "negativeLevels", [["init", 2, 1]], NEGATIVE_LEVEL_INITIATIVE),
  ...pinned(
    "human-fighter-3-rogue-4",
    "grappled",
    [["abilities.dex.total", 16, 12]],
    CONDITION_ABILITY_PENALTY,
  ),
  ...pinned(
    "human-ranger-6",
    "conditions",
    [["abilities.dex.total", 18, 14]],
    CONDITION_ABILITY_PENALTY,
  ),
  ...pinned(
    "human-druid-6",
    "conditions",
    [
      ["abilities.str.total", 14, 12],
      ["abilities.dex.total", 12, 10],
    ],
    CONDITION_ABILITY_PENALTY,
  ),
  ...pinned(
    "half-orc-barbarian-12",
    "fatigued",
    [
      ["abilities.str.total", 18, 16],
      ["abilities.dex.total", 14, 12],
    ],
    CONDITION_ABILITY_PENALTY,
  ),
  ...pinned(
    "dwarf-monk-6",
    "conditions",
    [
      ["abilities.str.total", 13, 11],
      ["abilities.dex.total", 14, 12],
    ],
    CONDITION_ABILITY_PENALTY,
  ),
  ...pinned("half-orc-barbarian-12", "*", [["speed.land", 20, 30]], {
    verdict: "foundry-departs",
    citation: "CRB p. 32",
    why: "Barbarian fast movement applies in no, light, or medium armor; hide is medium. 30 + 10, reduced to 30 by medium armor.",
  }),
  ...pinned(
    "half-orc-barbarian-12",
    "rage",
    [
      ["cmd", 31, 29],
      ["cmd.flatFooted", 29, 27],
    ],
    {
      verdict: "foundry-departs",
      citation: "CRB p. 199",
      why: "Any penalty to AC also applies to CMD. Foundry leaves Rage's -2 AC out of CMD.",
    },
  ),
  ...pinned(
    "human-fighter-1",
    "*",
    [
      ["ac.normal", 19, 20],
      ["ac.touch", 12, 13],
    ],
    {
      verdict: "representational",
      citation: "CRB p. 171",
      why: "The fighter carries a heavy load, which caps Dex to AC at +1. Foundry always applies encumbrance; in Ledgermain it is an opt-in rule the importer leaves off.",
    },
  ),
  ...pinned(
    "human-magus-12",
    "buffs",
    [
      ["ac.normal", 23, 22],
      ["ac.flatFooted", 20, 19],
    ],
    {
      verdict: "foundry-departs",
      citation: "CRB pp. 208, 462",
      why: "A magic armor's enhancement bonus is part of its armor bonus, so mage armor's +4 replaces +1 leather's +3 whole. Foundry keeps the +1 enhancement on top.",
    },
  ),
  ...["skills.per", "skills.dev"].map((stat): Divergence => ({
    actor: "halfling-bard-7-archaeologist",
    scenario: "*",
    stat,
    verdict: "foundry-departs",
    citation: "UC p. 32",
    why: "Clever Explorer adds half the bard's level to Disable Device and Perception. The archetype module's feature item carries no changes, so Foundry adds nothing.",
  })),
  {
    actor: "half-orc-paladin-5-sorcerer-2",
    scenario: "*",
    stat: "skills.klo",
    verdict: "foundry-departs",
    citation: "ARG p. 52",
    why: "City-Raised is +2 on Knowledge (local). pf-content writes it with the short skill id this pf1 build no longer reads.",
  },
  ...["human-cleric-12", "dwarf-cleric-17"].flatMap((actor) =>
    ["attack.melee", "attack.ranged"].map((stat): Divergence => ({
      actor,
      scenario: "*",
      stat,
      verdict: "foundry-departs",
      citation: "CRB pp. 38, 118, 154",
      why: "Clerics are proficient with light and medium armor only, and armor worn without proficiency adds its check penalty to attack rolls. Mithral's lighter category doesn't count for proficiency. Foundry applies no penalty.",
    })),
  ),
];

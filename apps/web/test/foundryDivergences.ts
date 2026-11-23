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
   * out only for a systematic departure that covers every case of the stat.
   */
  values?: { foundry: number; ledgermain: number };
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

export const DIVERGENCES: Divergence[] = [
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
];

/**
 * Clean-room PF1 conditions table (DESIGN §6): each condition maps to the typed
 * modifiers (`Change[]`) it imposes, so toggling one feeds the same stacking
 * engine as buffs. This is a *core set* of the mechanically-relevant conditions,
 * authored from the published rules — NOT a transcription of Foundry's config.
 *
 * Modelling notes / deliberate limitations:
 *   - The derived sheet exposes a single AC value, so condition AC penalties that
 *     the rules scope to melee-only (prone) or "lose Dex to AC" (blinded, stunned,
 *     cowering) are applied as a flat AC penalty with the nuance left to
 *     `contextNotes`. The numbers are right for the common case; the situational
 *     swing (e.g. prone's +4 AC vs ranged) is a reminder, not auto-applied.
 *   - `target: "skills"` is a global skill-check penalty (every skill); the
 *     engine applies it to each skill alongside per-skill `skill.<id>` changes.
 *   - Fear (shaken/frightened) and fatigue (fatigued/exhausted) ladders do NOT
 *     auto-replace each other — if a player toggles both, both apply. The rules
 *     say the worse one supersedes; that's a UI/judgement call left to the table.
 *   - `displayOnly` conditions carry no `changes` (their effect is narrative or
 *     not expressible as a flat modifier); they still surface as reminders.
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface ConditionDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI. */
  summary: string;
  /** Typed modifiers applied while the condition is active. */
  changes: Change[];
  /** Non-mechanical reminders to surface on the sheet. */
  contextNotes?: ContextNote[];
  /** True when the condition has no flat modifier (narrative/situational only). */
  displayOnly?: boolean;
}

const u = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});

const CONDITION_LIST: ConditionDef[] = [
  {
    id: "shaken",
    name: "Shaken",
    summary: "-2 penalty on attack rolls, saving throws, and skill checks.",
    changes: [
      u("-2", "attack"),
      u("-2", "allSavingThrows"),
      u("-2", "skills"),
    ],
  },
  {
    id: "frightened",
    name: "Frightened",
    summary:
      "-2 on attacks, saves, and skill checks; must flee from the source if able.",
    changes: [
      u("-2", "attack"),
      u("-2", "allSavingThrows"),
      u("-2", "skills"),
    ],
    contextNotes: [{ target: "allChecks", text: "Must flee from the source of fear if able." }],
  },
  {
    id: "sickened",
    name: "Sickened",
    summary: "-2 on attack rolls, weapon damage, saving throws, and skill/ability checks.",
    changes: [
      u("-2", "attack"),
      u("-2", "allSavingThrows"),
      u("-2", "skills"),
      u("-2", "wdamage"),
    ],
  },
  {
    id: "fatigued",
    name: "Fatigued",
    summary: "-2 to Strength and Dexterity; cannot run or charge.",
    changes: [u("-2", "str"), u("-2", "dex")],
    contextNotes: [{ target: "allChecks", text: "Cannot run or charge." }],
  },
  {
    id: "exhausted",
    name: "Exhausted",
    summary: "-6 to Strength and Dexterity; moves at half speed; cannot run or charge.",
    changes: [u("-6", "str"), u("-6", "dex")],
    contextNotes: [{ target: "allChecks", text: "Half speed; cannot run or charge." }],
  },
  {
    id: "entangled",
    name: "Entangled",
    summary: "-2 on attack rolls, -4 to Dexterity; half speed; cannot run or charge.",
    changes: [u("-2", "attack"), u("-4", "dex")],
    contextNotes: [{ target: "allChecks", text: "Half speed; cannot run or charge." }],
  },
  {
    id: "grappled",
    name: "Grappled",
    summary: "-4 to Dexterity, -2 on attacks and most checks; cannot move freely.",
    changes: [u("-4", "dex"), u("-2", "attack")],
    contextNotes: [
      { target: "allChecks", text: "-2 on most checks except to escape; cannot take actions needing two hands." },
    ],
  },
  {
    id: "prone",
    name: "Prone",
    summary: "-4 on melee attack rolls and -4 AC vs melee; +4 AC vs ranged.",
    changes: [u("-4", "mattack"), u("-4", "ac")],
    contextNotes: [
      { target: "ac", text: "The -4 AC applies only vs melee; you instead gain +4 AC vs ranged (not auto-applied)." },
    ],
  },
  {
    id: "dazzled",
    name: "Dazzled",
    summary: "-1 on attack rolls and Perception checks.",
    changes: [u("-1", "attack"), u("-1", "skill.per")],
  },
  {
    id: "deafened",
    name: "Deafened",
    summary: "-4 on initiative; 20% spell failure for spells with verbal components.",
    changes: [u("-4", "init")],
    contextNotes: [{ target: "allChecks", text: "20% chance of spell failure for spells with verbal components." }],
  },
  {
    id: "blinded",
    name: "Blinded",
    summary: "-2 AC, loses Dexterity to AC, half speed, -4 on Strength/Dexterity skill checks.",
    changes: [u("-2", "ac")],
    contextNotes: [
      { target: "ac", text: "Also loses Dexterity bonus to AC and is flat-footed (not auto-applied)." },
      { target: "skills", text: "-4 on Strength- and Dexterity-based skill checks." },
    ],
  },
  {
    id: "stunned",
    name: "Stunned",
    summary: "-2 AC, loses Dexterity to AC; drops held items; can take no actions.",
    changes: [u("-2", "ac")],
    contextNotes: [
      { target: "ac", text: "Also loses Dexterity bonus to AC (not auto-applied)." },
      { target: "allChecks", text: "Drops anything held; can take no actions." },
    ],
  },
  {
    id: "cowering",
    name: "Cowering",
    summary: "-2 AC, loses Dexterity to AC; can take no actions.",
    changes: [u("-2", "ac")],
    contextNotes: [{ target: "ac", text: "Also loses Dexterity bonus to AC (not auto-applied)." }],
  },
  // ---- display-only (no flat modifier the static sheet can apply) -----------
  {
    id: "flatFooted",
    name: "Flat-Footed",
    summary: "Loses Dexterity bonus to AC; cannot make attacks of opportunity. Use the flat-footed AC value.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "nauseated",
    name: "Nauseated",
    summary: "Can take only a single move action; cannot attack or cast.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "staggered",
    name: "Staggered",
    summary: "Can take only a single move OR standard action each round.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "paralyzed",
    name: "Paralyzed",
    summary: "Helpless; Dexterity and Strength effectively 0; cannot move or act.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "helpless",
    name: "Helpless",
    summary: "Dexterity treated as 0 (-5 AC); melee attackers get +4 and can coup de grace.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "panicked",
    name: "Panicked",
    summary: "-2 on saves/skills; drops items and flees; cannot attack.",
    changes: [u("-2", "allSavingThrows"), u("-2", "skills")],
    contextNotes: [{ target: "allChecks", text: "Drops held items and flees; cannot attack." }],
  },
  {
    id: "confused",
    name: "Confused",
    summary: "Acts randomly each round (roll on the confusion table).",
    changes: [],
    displayOnly: true,
  },
  {
    id: "dazed",
    name: "Dazed",
    summary: "Can take no actions (but suffers no AC penalty).",
    changes: [],
    displayOnly: true,
  },
  {
    id: "unconscious",
    name: "Unconscious",
    summary: "Helpless and unaware; usually at negative HP.",
    changes: [],
    displayOnly: true,
  },
];

export const CONDITIONS: Record<string, ConditionDef> = Object.fromEntries(
  CONDITION_LIST.map((c) => [c.id, c]),
);

export const CONDITION_IDS: readonly string[] = CONDITION_LIST.map((c) => c.id);

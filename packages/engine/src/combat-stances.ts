/**
 * Player-selected combat actions whose modifiers last until the next turn.
 * They use the same hand-authored toggle shape as resource-backed effects,
 * but cost no pool and are available to every character.
 */

import type { ActiveBuff } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

export type CombatStanceId =
  | "combatStance:fightingDefensively"
  | "combatStance:totalDefense"
  | "combatStance:charge";

export interface CombatStance extends ToggleBuffOption {
  id: CombatStanceId;
  summary: string;
}

export const COMBAT_STANCES: readonly CombatStance[] = [
  {
    id: "combatStance:fightingDefensively",
    name: "Fighting Defensively",
    summary:
      "When you attack: -4 on attacks and +2 dodge AC, improved to +3 AC with 3 Acrobatics ranks.",
    changes: [
      { formula: "-4", target: "attack", type: "untyped" },
      {
        formula: "2 + if(gte(@skills.acr.rank, 3), 1)",
        target: "ac",
        type: "dodge",
      },
    ],
  },
  {
    id: "combatStance:totalDefense",
    name: "Total Defense",
    summary:
      "As a standard action: +4 dodge AC, improved to +6 with 3 Acrobatics ranks; you cannot attack or make attacks of opportunity.",
    changes: [
      {
        formula: "4 + if(gte(@skills.acr.rank, 3), 2)",
        target: "ac",
        type: "dodge",
      },
    ],
    contextNotes: [
      {
        target: "attack",
        text: "You cannot make attacks or attacks of opportunity while using total defense.",
      },
    ],
  },
  {
    id: "combatStance:charge",
    name: "Charge",
    summary:
      "After moving at least 10 feet in a straight line: +2 on the melee attack and -2 AC until your next turn.",
    // A charge ends in a single melee attack, so the bonus is `mattack` rather
    // than `attack`; the AC penalty is untyped and applies to every AC.
    changes: [
      { formula: "2", target: "mattack", type: "untyped" },
      { formula: "-2", target: "ac", type: "untyped" },
    ],
  },
];

export const COMBAT_STANCE_IDS: readonly CombatStanceId[] = COMBAT_STANCES.map((s) => s.id);

/**
 * The pinned reference data already carries these two core actions as ordinary
 * buffs. Treat those ids as the same controls so an older saved active buff
 * cannot stack with the dedicated stance toggle -- both grant dodge AC, which
 * stacks, so a missed match silently double-counts. These are upstream Foundry
 * `_id`s and can move on a data bump, so `test/combatStances.test.ts` asserts
 * the id/name pairing of every entry here.
 */
export const COMBAT_STANCE_REFERENCE_BUFF_IDS = {
  "combatStance:fightingDefensively": "V8cRFtOQA6ltklEl",
  "combatStance:totalDefense": "DvcRWaWndZ1s2tB4",
} as const satisfies Partial<Record<CombatStanceId, string>>;

export const COMBAT_STYLE_EFFECT_TAG_PREFIX = "combatStyle:";

export function combatStyleEffectTag(featSlug: string): string {
  return `${COMBAT_STYLE_EFFECT_TAG_PREFIX}${featSlug}`;
}

export function isCombatStanceEffectTag(effectTag: string | undefined): boolean {
  return COMBAT_STANCE_IDS.includes(effectTag as CombatStanceId);
}

/** Resolve either the dedicated toggle tag or its older reference-buff id. */
export function combatStanceIdForActiveBuff(
  buff: Pick<ActiveBuff, "buffId" | "effectTag">,
): CombatStanceId | undefined {
  if (isCombatStanceEffectTag(buff.effectTag)) return buff.effectTag as CombatStanceId;
  return Object.entries(COMBAT_STANCE_REFERENCE_BUFF_IDS).find(
    ([, buffId]) => buffId === buff.buffId,
  )?.[0] as CombatStanceId | undefined;
}

export function isCombatStanceActiveBuff(buff: Pick<ActiveBuff, "buffId" | "effectTag">): boolean {
  return combatStanceIdForActiveBuff(buff) !== undefined;
}

export function isCombatStyleEffectTag(effectTag: string | undefined): boolean {
  return effectTag?.startsWith(COMBAT_STYLE_EFFECT_TAG_PREFIX) ?? false;
}

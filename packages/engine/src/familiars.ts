/**
 * Hand-authored familiar master bonuses.
 * Clean-room from the published PF1 rules (CRB, Wizard → Arcane Bond →
 * Familiars table) — no Foundry source was consulted. Same posture as
 * `tables.ts` / `feat-effects.ts` (DESIGN §6).
 *
 * Each entry is the bonus the *master* gains from having that familiar. The
 * PF1 rules give these bonuses no type, so they are `"untyped"` (always stack,
 * matching e.g. Alertness in feat-effects.ts). Target strings follow the
 * collect.ts / compute.ts conventions:
 *   - skills: "skill.<id>"  (e.g. "skill.fly")
 *   - saves:  "fort" | "ref"
 *   - HP:     "hp"
 *
 * Conditional bonuses (hawk's and owl's sight-based Perception, the raven's
 * speech) can't be expressed as an always-on Change without over-applying;
 * those live in `note` for display only.
 *
 * The Alertness-while-adjacent master benefit (familiar within arm's reach)
 * is situational table state and is deliberately NOT a Change; the UI notes it
 * on the familiar row (see IMPLEMENTATION_PLAN.md Stage 3 scope).
 */

import type { Change } from "@pf1/schema";

export interface FamiliarDef {
  /** Display name, e.g. "Bat". */
  name: string;
  /** Always-on master bonus, routed through the stacking engine. */
  changes: Change[];
  /** Conditional/prose master bonus, display only (no mechanical effect). */
  note?: string;
}

function bonus(target: string, value: number): Change {
  return { target, type: "untyped", formula: String(value) };
}

/**
 * The PF1 Core familiar list, keyed by kind slug (stored in
 * `build.arcaneBond.familiarKind`). Unknown kinds simply apply nothing.
 */
export const FAMILIARS: Readonly<Record<string, FamiliarDef>> = {
  bat: { name: "Bat", changes: [bonus("skill.fly", 3)] },
  cat: { name: "Cat", changes: [bonus("skill.ste", 3)] },
  hawk: {
    name: "Hawk",
    changes: [],
    note: "+3 on sight-based Perception checks in bright light",
  },
  lizard: { name: "Lizard", changes: [bonus("skill.clm", 3)] },
  monkey: { name: "Monkey", changes: [bonus("skill.acr", 3)] },
  owl: {
    name: "Owl",
    changes: [],
    note: "+3 on sight-based Perception checks in shadows",
  },
  rat: { name: "Rat", changes: [bonus("fort", 2)] },
  raven: {
    name: "Raven",
    changes: [bonus("skill.apr", 3)],
    note: "speaks one language of its master's choice",
  },
  toad: { name: "Toad", changes: [bonus("hp", 3)] },
  viper: { name: "Viper (snake)", changes: [bonus("skill.blf", 3)] },
  weasel: { name: "Weasel", changes: [bonus("ref", 2)] },
};

/** All familiar kind slugs, for the builder's picker. */
export const FAMILIAR_KINDS = Object.keys(FAMILIARS);

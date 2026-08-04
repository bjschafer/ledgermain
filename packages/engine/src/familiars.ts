/**
 * Hand-authored familiar master bonuses.
 * Clean-room from the published PF1 rules (CRB Wizard → Arcane Bond →
 * Familiars table, plus Ultimate Magic's "New Familiars" table and Bestiary 2
 * for the additions below it) — no Foundry source was consulted. Same
 * posture as `tables.ts` / `feat-effects.ts` (DESIGN §6).
 *
 * Each entry is the bonus the *master* gains from having that familiar. Most
 * of these PF1 rules give the bonus no type, so they're `"untyped"` (always
 * stack, matching e.g. Alertness in feat-effects.ts) via the `bonus()`
 * helper below. Turtle's is the one exception — its published bonus IS a
 * typed natural armor bonus (`"nac"`/`"natural"`, built as a raw `Change`
 * rather than through `bonus()`), so it won't stack with another natural
 * armor source, matching the real rule. Target strings follow the
 * collect.ts / compute.ts conventions:
 *   - skills: "skill.<id>"  (e.g. "skill.fly")
 *   - saves:  "fort" | "ref"
 *   - HP:     "hp"
 *   - init:   "init"
 *   - natural armor: "nac" (typed "natural", see above)
 *
 * Conditional bonuses (hawk's and owl's sight-based Perception, the raven's
 * speech, king crab's grapple-only CMB) can't be expressed as an always-on
 * Change without over-applying; those live in `note` for display only.
 *
 * The Alertness-while-adjacent master benefit (familiar within arm's reach)
 * is situational table state and is deliberately NOT a Change; the UI notes it
 * on the familiar row.
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
 * The 22 PF1 familiar species this app models (see `familiar.ts`'s
 * `BASE_FAMILIARS` doc comment for the full source breakdown), keyed by kind
 * slug (stored in `build.arcaneBond.familiarKind`). Unknown kinds simply
 * apply nothing.
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
  compsognathus: { name: "Compsognathus", changes: [bonus("init", 4)] },
  fox: { name: "Fox", changes: [bonus("ref", 2)] },
  "king-crab": {
    name: "King Crab",
    changes: [],
    note: "+2 bonus on CMB checks to start or maintain a grapple",
  },
  octopus: { name: "Octopus (blue-ringed)", changes: [bonus("skill.swm", 3)] },
  osprey: { name: "Osprey", changes: [bonus("skill.sur", 3)] },
  pig: { name: "Pig", changes: [bonus("skill.dip", 3)] },
  scorpion: { name: "Scorpion (greensting)", changes: [bonus("init", 4)] },
  spider: { name: "Spider (scarlet)", changes: [bonus("skill.clm", 3)] },
  centipede: { name: "Centipede (house)", changes: [bonus("skill.ste", 3)] },
  thrush: {
    name: "Thrush",
    changes: [bonus("skill.dip", 3)],
    note: "speaks one language of its master's choice",
  },
  turtle: {
    name: "Turtle",
    changes: [{ target: "nac", type: "natural", formula: "1" }],
  },
};

/** All familiar kind slugs, for the builder's picker. */
export const FAMILIAR_KINDS = Object.keys(FAMILIARS);

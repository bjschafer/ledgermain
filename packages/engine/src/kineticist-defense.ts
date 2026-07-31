/**
 * Elemental Defense wild talents resolved to live numbers, clean-room from
 * the published PF1 rules (Occult Adventures / Horror Adventures / the wood
 * element's Player Companion; cross-checked against the vendored defense
 * talents' OGL prose).
 *
 * A kineticist gains her PRIMARY element's defense at 2nd level, and it is
 * always on. Every one of the seven then scales the same way: a base value
 * from kineticist level, plus a per-point increase for burn she chose to
 * spend on the defense rather than on a blast. That burn is not extra burn —
 * it is part of the burn she is already holding (`live.kineticistDefenseBurn`
 * records how much of it went here, the same "one pool, divided by hand"
 * shape `live.occultistFocusInvested` uses), and it lasts "until the next
 * time your burn is removed", which is the same night's rest that clears the
 * pool.
 *
 * Five of the seven land on a real sheet number:
 *   - Force Ward (aether) → `tempHp`
 *   - Flesh of Stone (earth) → `dr.adamantine`
 *   - Shroud of Water (water) → `aac` or `sac`, the player's choice
 *   - Flesh of Wood (wood) → `nac`, an enhancement bonus
 *   - Emptiness (void) → `eres.negativeEnergy`
 *
 * Two have no sheet stat to land on and stay honest reminders with their
 * current value computed: Enveloping Winds' miss chance and Searing Flesh's
 * retaliation damage. Neither is a number this engine tracks anywhere, and
 * inventing a target for one source would be worse than saying so.
 *
 * Each defense also carries riders this does NOT model, listed in `notes`:
 * the 1-round upgrade every one of them gets "whenever you accept burn while
 * using a <element> wild talent" (a per-activation trigger with no state to
 * read), Force Ward's regeneration rate and loss ordering, Emptiness'
 * crit/sneak negation chance, and the emotion-only scope of its Will bonus.
 */

import type { Change } from "@pf1/schema";

/** The player's live choices feeding a defense's scaling. */
export interface KineticistDefenseState {
  /** Points of the burn currently held that were spent boosting the defense. */
  burnInvested?: number;
  /** Shroud of Water only — which bonus the shroud is currently shaped into. */
  shroudMode?: "armor" | "shield";
}

export interface ResolvedKineticistDefense {
  elementTag: string;
  name: string;
  /** Real Changes to fold into the modifier pass — empty for the two with no sheet target. */
  changes: Change[];
  /** One-line summary carrying the CURRENT numbers, for the class-feature row. */
  detail: string;
  /**
   * Points of burn beyond this that would do nothing, per the talent's own
   * cap. Undefined where the published rule states no cap (Force Ward,
   * Emptiness) — the burn pool is the only limit there.
   */
  maxBurnInvested?: number;
  /** What stays player-applied on this defense. */
  notes: string[];
}

/** Elemental Defense is granted at 2nd level; below that there is nothing to resolve. */
export const ELEMENTAL_DEFENSE_LEVEL = 2;

const ROUND_RIDER =
  "Accepting burn on a wild talent of this element upgrades the defense for 1 round; apply that by hand.";

const c = (value: number, target: string, type = "untyped"): Change => ({
  formula: String(value),
  target,
  type,
});

/**
 * The live state of the character's Elemental Defense, or undefined when she
 * has none (no kineticist levels below 2nd, no primary element, or an element
 * tag with no defense in the table).
 */
export function resolveKineticistDefense(
  elementTag: string | undefined,
  kineticistLevel: number,
  state: KineticistDefenseState = {},
): ResolvedKineticistDefense | undefined {
  if (!elementTag || kineticistLevel < ELEMENTAL_DEFENSE_LEVEL) return undefined;
  const burn = Math.max(0, Math.trunc(state.burnInvested ?? 0));
  const level = kineticistLevel;
  const beyondSecond = level - ELEMENTAL_DEFENSE_LEVEL;

  switch (elementTag) {
    case "aether": {
      // "temporary hit points equal to your kineticist level ... accepting 1
      // point of burn increases the maximum by half your kineticist level."
      const perBurn = Math.floor(level / 2);
      const total = level + burn * perBurn;
      return {
        elementTag,
        name: "Force Ward",
        changes: [c(total, "tempHp")],
        detail: `${total} temporary hit points (${level} + ${perBurn} per burn spent here)`,
        notes: [
          "Force ward's temporary hit points are always lost first, ahead of any other temporary hit points, and regenerate at 1 per minute (+1 per 2 burn spent here). The tracker holds one temporary hit point pool, so that ordering and regeneration are yours to track.",
          ROUND_RIDER,
        ],
      };
    }
    case "air": {
      // 20%, +5% per 5 levels beyond 2nd, +5% per burn, hard cap 75%.
      const base = 20 + 5 * Math.floor(beyondSecond / 5);
      const total = Math.min(75, base + 5 * burn);
      return {
        elementTag,
        name: "Enveloping Winds",
        changes: [],
        detail: `${total}% miss chance against physical ranged attacks (max 75%)`,
        maxBurnInvested: Math.max(0, Math.ceil((75 - base) / 5)),
        notes: [
          "A miss chance is not a number this sheet applies: roll it at the table. It does not affect rays, or a giant's boulder and other massive weapons.",
          ROUND_RIDER,
        ],
      };
    }
    case "earth": {
      // DR 1/adamantine, +1 per 2 levels beyond 2nd, +1 per burn, capped at level.
      const base = 1 + Math.floor(beyondSecond / 2);
      const total = Math.min(level, base + burn);
      return {
        elementTag,
        name: "Flesh of Stone",
        changes: [c(total, "dr.adamantine")],
        detail: `DR ${total}/adamantine (max DR ${level} at this level)`,
        maxBurnInvested: Math.max(0, level - base),
        notes: [ROUND_RIDER],
      };
    }
    case "fire": {
      // 1 fire damage per 4 levels (min 1), and each burn adds that much again.
      const step = Math.max(1, Math.floor(level / 4));
      const total = step * (1 + Math.min(burn, 7));
      return {
        elementTag,
        name: "Searing Flesh",
        changes: [],
        detail: `${total} fire damage to anything hitting you with a natural attack or unarmed strike (doubled against a grappler)`,
        maxBurnInvested: 7,
        notes: [
          "Damage dealt back to an attacker is not a sheet stat: deal it at the table, doubled at the end of each turn against a creature grappling you.",
          ROUND_RIDER,
        ],
      };
    }
    case "water": {
      // +4 armor or +2 shield, +1 per 4 levels beyond 2nd; burn adds up to
      // half the starting value.
      const mode = state.shroudMode ?? "armor";
      const base = (mode === "armor" ? 4 : 2) + Math.floor(beyondSecond / 4);
      const cap = Math.floor(base / 2);
      const total = base + Math.min(burn, cap);
      return {
        elementTag,
        name: "Shroud of Water",
        changes: [c(total, mode === "armor" ? "aac" : "sac")],
        detail: `+${total} ${mode} bonus to AC (burn adds up to +${cap} more at this level)`,
        maxBurnInvested: cap,
        notes: [
          "Reshaping the shroud between armor and shield is a standard action, and a shield bonus above its own cap stops applying until you shape it back.",
          ROUND_RIDER,
        ],
      };
    }
    case "void": {
      // Negative energy resistance 2, +2 per burn.
      const resistance = 2 + 2 * burn;
      const negation = Math.min(100, 5 + 5 * burn);
      const will = 1 + burn;
      return {
        elementTag,
        name: "Emptiness",
        changes: [c(resistance, "eres.negativeEnergy")],
        detail: `negative energy resistance ${resistance} · ${negation}% to ignore a critical hit or sneak attack · +${will} Will vs. emotion effects`,
        notes: [
          `The ${negation}% negation chance stacks with elemental overflow's own, to a maximum of 100%, and the Will bonus applies only against emotion effects. Both are yours to apply.`,
          ROUND_RIDER,
        ],
      };
    }
    case "wood": {
      // +1 enhancement to natural armor, and one more burn slot every 3
      // levels beyond 2nd, capping the whole bonus at +7 by 17th.
      const slots = 1 + Math.floor(beyondSecond / 3);
      const total = Math.min(7, 1 + Math.min(burn, slots));
      return {
        elementTag,
        name: "Flesh of Wood",
        changes: [c(total, "nac", "enh")],
        detail: `+${total} enhancement bonus to natural armor (${slots} burn can be spent here at this level)`,
        maxBurnInvested: Math.min(slots, 6),
        notes: [ROUND_RIDER],
      };
    }
    default:
      return undefined;
  }
}

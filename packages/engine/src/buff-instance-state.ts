/**
 * Buffs that carry per-instance state a `Change` cannot express (clean-room
 * from the published PF1 rules).
 *
 * Two kinds of state, and *protection from energy* is why they live in one
 * table — it needs both at once:
 *
 *   - **An element choice.** "One energy type you select" is a decision made
 *     when the spell is cast. A `Change` has a fixed `target`, so there is no
 *     way to author `eres.<whatever the player picks>` up front. The choice is
 *     resolved at activation and the concrete target baked into that
 *     instance's `changes[]` (see `apps/web/src/model/buffs.ts`), which is why
 *     the per-element *Resist Energy (Fire)* style variants need none of this
 *     — they already name their element.
 *   - **An ablative pool.** Spells that soak a fixed quantity of damage and
 *     then end. The capacity is a formula of caster level, not a constant, and
 *     the amount consumed is live session state.
 *
 * Capacities are taken from the published spells rather than from the vendored
 * descriptions, which disagree with them: *protection from energy*'s
 * description quotes `@item.level * 10` where the spell absorbs 12 per caster
 * level, and *stoneskin*'s DR progression was likewise off (see
 * `data-pipeline`'s `SUPPLEMENTAL_BUFF_CHANGES`). The compendium text is data
 * under OGL, not an oracle for mechanics.
 *
 * Keyed by buff name, matching `SUPPLEMENTAL_BUFF_CHANGES`. Names must be
 * unique among vendored buffs to be addressable this way — the vendored slice
 * has two distinct buffs both named "Resistance" (a saving-throw one and an
 * energy-resistance one), so that pair is deliberately absent here rather than
 * silently resolving to whichever one a name lookup happens to find.
 */

import type { DamageTypeId } from "./damage-types.js";

/** The five energy types a "select one energy type" spell can name. */
export const SELECTABLE_ELEMENTS: readonly DamageTypeId[] = [
  "acid",
  "cold",
  "electricity",
  "fire",
  "sonic",
];

export interface ElementChoiceSpec {
  /**
   * Change target to bake in once the element is known — `{element}` is
   * replaced with the chosen type's id.
   */
  target: string;
  /** Formula for the resulting change's value, in terms of `@item.level`. */
  formula: string;
  /** Stacking type for the resulting change. */
  type: string;
}

export interface AblativeSpec {
  /** Pool capacity, as a formula of `@item.level` (the buff's caster level). */
  capacityFormula: string;
  /**
   * `"dr"` — the pool bounds how much this buff's own DR line may absorb, and
   * drains by exactly that amount (*stoneskin*).
   * `"energy"` — the pool absorbs damage of the buff's chosen element
   * outright, ahead of any energy resistance (*protection from energy*).
   */
  kind: "dr" | "energy";
  /** Short player-facing description of what exhausting the pool means. */
  exhaustedNote: string;
}

export interface BuffInstanceStateSpec {
  element?: ElementChoiceSpec;
  ablative?: AblativeSpec;
}

export const BUFF_INSTANCE_STATE: Record<string, BuffInstanceStateSpec> = {
  Stoneskin: {
    // DR 10/adamantine until it has prevented 10 damage per caster level,
    // to a maximum of 150.
    ablative: {
      capacityFormula: "min(@item.level, 15) * 10",
      kind: "dr",
      exhaustedNote: "Stoneskin is discharged once it has prevented its full total.",
    },
  },
  "Resist Energy": {
    // Resistance 10 against the chosen type, 20 at CL 7 and 30 at CL 11 —
    // the same progression the per-element variants carry.
    element: {
      target: "eres.{element}",
      formula: "10 * min(3, 1 + floor(max(0, @item.level - 3) / 4))",
      type: "untyped",
    },
  },
  "Protection From Energy": {
    // Absorbs damage of the chosen type outright — 12 per caster level, to a
    // maximum of 120 — then ends. Not a resistance value, so it grants no
    // `eres` change at all; the pool does the whole job.
    element: { target: "", formula: "", type: "untyped" },
    ablative: {
      capacityFormula: "min(120, @item.level * 12)",
      kind: "energy",
      exhaustedNote: "Protection from energy ends once it has absorbed its full total.",
    },
  },
};

/** The instance-state spec for a buff name, or `undefined` if it carries none. */
export function buffInstanceState(name: string): BuffInstanceStateSpec | undefined {
  return BUFF_INSTANCE_STATE[name];
}

/** True when activating this buff must ask the player to choose an energy type. */
export function needsElementChoice(name: string): boolean {
  return buffInstanceState(name)?.element !== undefined;
}

/**
 * Concrete change target for an element-choice buff, or `undefined` when the
 * spec grants no change at all (*protection from energy*, whose entire effect
 * is its pool).
 */
export function elementTarget(spec: ElementChoiceSpec, element: string): string | undefined {
  if (!spec.target) return undefined;
  return spec.target.replace("{element}", element);
}

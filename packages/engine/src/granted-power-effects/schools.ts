/**
 * Hand-authored `Change[]` for wizard arcane-school (including focused
 * school) granted powers whose published text promises a numeric effect the
 * vendored `RefData.wizardSchools[*].features` /
 * `RefData.focusedSchools[*].features` entry doesn't carry. Keyed by the
 * granted power's `name` — see `domains.ts`'s doc comment for the
 * name-keying rationale, which applies identically here.
 *
 * A druid's nature-bond domain pick is a *different* granted-power origin
 * despite the similar name: `collectGrantedFeatures` tags it
 * `origin.kind: "domain"` (same as a cleric domain), not `"school"`, so its
 * patches belong in `domains.ts`, not here.
 *
 * Neither entry below has a same-named focused school in
 * `RefData.focusedSchools`: every vendored focused school is a subschool of
 * one of the eight core schools (Conjuration, Abjuration, ...), never of an
 * elemental school, so `FocusedSchool.features`'s replace-the-parent-list
 * behavior (`collectGrantedFeatures`) never applies to Fire or Void.
 *
 * See `granted-power-effects/index.ts` for the collection-loop wiring and
 * the cross-catalog name-collision discipline every key here must satisfy.
 */

import type { Change } from "@pf1/schema";

import type { PickChoice } from "../rage-powers.js";

/** A choose-one granted-power selection, see {@link SCHOOL_POWER_CHOICES}. */
export interface GrantedPowerChoiceEntry {
  /** Dropdown prompt + option list, same shape rage powers use. */
  choice: PickChoice;
  /**
   * Per-option Changes, keyed by option id — applied only when
   * `doc.build.pickChoices["classFeature:<the granting power's own vendored
   * id>"]` matches a key. No stored pick, or a stale option id, emits
   * nothing, same posture as `SCHOOL_POWER_PATCHES`.
   */
  choiceChanges: Readonly<Record<string, readonly Change[]>>;
}

const ENERGY_TYPES = ["acid", "cold", "electricity", "fire", "sonic"] as const;
const ENERGY_LABELS: Readonly<Record<(typeof ENERGY_TYPES)[number], string>> = {
  acid: "Acid",
  cold: "Cold",
  electricity: "Electricity",
  fire: "Fire",
  sonic: "Sonic",
};

export const SCHOOL_POWER_CHOICES: Readonly<Record<string, GrantedPowerChoiceEntry>> = {
  /**
   * Resistance (Power) (Abjuration arcane school, Core Rulebook): "You gain
   * resistance 5 to an energy type of your choice, chosen when you prepare
   * spells. This resistance can be changed each day." Vendored grant level
   * is 0 (immediate). Free-choice, daily-reselect posture — stored like any
   * other pick, the player edits it when it changes in play (see
   * `doc.build.pickChoices["classFeature:<id>"]`). "At 11th level, this
   * resistance increases to 10" is folded into the formula; the 20th-level
   * "changes to immunity" clause is dropped as unmodeled, same posture as
   * `SCHOOL_POWER_PATCHES`'s Fire Supremacy entry (a fixed-type sibling with
   * the identical clause).
   */
  "Resistance (Power)": {
    choice: {
      label: "Energy type",
      options: ENERGY_TYPES.map((id) => ({ id, label: ENERGY_LABELS[id] })),
    },
    choiceChanges: Object.fromEntries(
      ENERGY_TYPES.map((type) => [
        type,
        [
          {
            formula: "if(gte(@class.unlevel, 11), 10, 5)",
            target: `eres.${type}`,
            type: "untyped",
          },
        ],
      ]),
    ),
  },
};

export const SCHOOL_POWER_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  /**
   * Fire Supremacy (Fire elemental arcane school, Pathfinder Player
   * Companion: Blood of the Elements): "You gain resistance 5 to fire. At
   * 10th level, this resistance increases to 10." Vendored grant level is 0
   * (immediate). The 20th-level fire immunity and the swift-action
   * flame-retaliation clause aren't `Change`-shaped (immunity isn't a
   * resistance number; the retaliation needs an activation and a source of
   * flame nearby) and stay unmodeled, description prose only.
   */
  "Fire Supremacy": [
    { formula: "if(gte(@class.unlevel, 10), 10, 5)", target: "eres.fire", type: "untyped" },
  ],

  /**
   * Void Awareness (Void arcane school, Pathfinder Player Companion: Occult
   * Mysteries p. 29): "You gain a +2 insight bonus on saving throws against
   * spells and spell-like abilities. This bonus increases by +1 for every
   * five wizard levels you possess." Vendored grant level is 0 (immediate).
   * The 20th-level roll-twice-and-take-the-better clause isn't a `Change`
   * (compute() surfaces one deterministic total, never a roll) and stays
   * unmodeled, description prose only.
   */
  "Void Awareness": [
    {
      formula: "2 + floor(@class.unlevel / 5)",
      target: "allSavingThrows",
      type: "insight",
      saveCategories: ["spell", "sla"],
    },
  ],
};

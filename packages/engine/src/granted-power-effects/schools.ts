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

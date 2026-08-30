/**
 * Choose-one selections for racial traits — the `racialTrait:` `build.
 * pickChoices` namespace, mirroring `class-feature-effects.ts`'s
 * `CLASS_FEATURE_CHOICES` exactly (see that file's doc comment for the
 * general shape). Keyed by the trait's own id: either a vendored
 * `RefData.racialTraits` id or a hand-authored `RACIAL_TRAITS` id
 * (`racial-traits.ts`) — the two stores' ids never collide, same posture as
 * `pc-natural-attacks/racial.ts`'s `RACIAL_TRAIT_NATURAL_ATTACKS`.
 *
 * Applied in `collect.ts`'s racial-trait loops (both the hand-authored and
 * vendored branches): only when the declaring trait is active for the
 * character's current race AND a matching pick is stored. No stored pick, or
 * a stale option id, emits nothing — the same open-changes posture as every
 * other pick-choice namespace.
 *
 * `choiceChanges` is empty for a trait whose entire benefit routes through a
 * DIFFERENT table keyed off the same stored pick (Tiefling's Maw or Claw: the
 * bite-vs-claws grant itself lives in `pc-natural-attacks/racial.ts`'s
 * `RACIAL_TRAIT_NATURAL_ATTACKS`, gated by a `when` predicate reading this
 * same `racialTrait:<id>` key) — the entry here exists only to give the web
 * picker a label/option list, the same "picked but produces no Change" shape
 * `CLASS_FEATURE_CHOICES`'s Monitor Expression uses for its non-Executor
 * options.
 */

import type { Change } from "@pf1/schema";

import type { PickChoice } from "./rage-powers.js";

/** A choose-one racial-trait selection, see {@link RACIAL_TRAIT_CHOICES}. */
export interface RacialTraitChoiceEntry {
  /** Dropdown prompt + option list, same shape rage powers/class features use. */
  choice: PickChoice;
  /**
   * Per-option Changes, keyed by option id — applied only when
   * `doc.build.pickChoices["racialTrait:<this trait's own id>"]` matches a
   * key. Empty for every option when the trait's mechanical effect routes
   * entirely through a different table keyed off the same stored pick (see
   * the module doc comment).
   */
  choiceChanges: Readonly<Record<string, readonly Change[]>>;
}

export const RACIAL_TRAIT_CHOICES: Readonly<Record<string, RacialTraitChoiceEntry>> = {
  // Tiefling "Maw or Claw" (Advanced Race Guide p. 169, replaces Spell-Like
  // Ability): "The tiefling can choose a bite attack that deals 1d6 points of
  // damage or two claws that each deal 1d4 points of damage. These attacks
  // are primary natural attacks." Both options grant an attack LINE, not a
  // stat Change, so `choiceChanges` is empty for both — the actual grant is
  // `pc-natural-attacks/racial.ts`'s `RACIAL_TRAIT_NATURAL_ATTACKS["qquaaM62KEX4ulIi"]`,
  // gated on this same stored pick.
  qquaaM62KEX4ulIi: {
    choice: {
      label: "Maw or Claw",
      options: [
        { id: "bite", label: "Bite (1d6)" },
        { id: "claws", label: "Two claws (1d4 each)" },
      ],
    },
    choiceChanges: { bite: [], claws: [] },
  },
};

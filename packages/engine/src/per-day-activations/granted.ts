/**
 * Per-day activation shard: granted powers whose classification verdicts live
 * in `class-feature-classification/unroutedGranted.ts` (wizard arcane-school
 * powers, druid-domain powers, inquisition granted powers, warpriest
 * blessing powers). See `types.ts` for what belongs in this table and
 * `index.ts` for the merge.
 *
 * All three entries below are wizard arcane-school powers — no druid-domain
 * or inquisition-power entry in this shard's classification file carries a
 * vendored `uses.maxFormula` (they're hand-authored `SUPPLEMENTAL_DRUID_
 * DOMAIN_FEATURES` / inquisition entries with no `uses` block at all), so
 * none of them ever derive a pool row to attach a toggle to.
 *
 * Protective Ward and Perfection of Self scale with wizard level, so their
 * formulas reference `@classes.wizard.level` and carry `classTag: "wizard"`
 * accordingly. Shape Emotions' ward-mode bonus is a flat +4 with no level
 * scaling, so it carries neither.
 */

import type { PerDayActivationDef } from "./types.js";

const ABILITY_TARGETS = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_LABELS: Readonly<Record<(typeof ABILITY_TARGETS)[number], string>> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const PER_DAY_ACTIVATIONS_GRANTED: Readonly<Record<string, readonly PerDayActivationDef[]>> =
  {
    /**
     * Protective Ward (Abjuration arcane school, Core Rulebook), granted at
     * wizard level 1 (school grant level 0): "you can create a 10-foot-radius
     * field of protective magic centered on you... All allies in this area
     * (including you) receive a +1 deflection bonus to their Armor Class. This
     * bonus increases by +1 for every five wizard levels you possess." The
     * caster is explicitly named as a recipient ("including you"), unlike most
     * of this school's other auras.
     */
    qIFUwyCjea79rUri: [
      {
        slug: "ward",
        name: "Protective Ward",
        classTag: "wizard",
        changes: [
          {
            formula: "1 + floor(@classes.wizard.level / 5)",
            target: "ac",
            type: "deflection",
          },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Costs 1 of 3 + Intelligence-modifier daily uses, standard action, lasts Intelligence-modifier rounds. This pool is not auto-decremented while this toggle is on; track your own uses spent.",
          },
        ],
      },
    ],

    /**
     * Perfection of Self (Enhancement subschool, Transmutation arcane school,
     * Advanced Player's Guide), granted at wizard level
     * 8: "as a swift action you can grant yourself an enhancement bonus to a
     * single ability score equal to 1/2 your wizard level (maximum +10) for
     * one round." Six toggle options (one per ability score) stand in for the
     * "single ability score of your choice" pick — only one is meant to be on
     * at a time, same convention as any other choose-one activation surfaced
     * as parallel toggles in this table.
     */
    qzCj0dGiKmIMw4wf: ABILITY_TARGETS.map((ability) => ({
      slug: ability,
      name: `Perfection of Self (${ABILITY_LABELS[ability]})`,
      classTag: "wizard",
      changes: [
        {
          formula: "min(10, floor(@classes.wizard.level / 2))",
          target: ability,
          type: "enhancement",
        },
      ],
      contextNotes: [
        {
          target: "allChecks",
          text: "Costs 1 of your wizard-level daily uses, swift action, lasts 1 round. Only one ability score at a time. This pool is not auto-decremented while this toggle is on; track your own uses spent.",
        },
      ],
    })),

    /**
     * Shape Emotions (Manipulator subschool, Enchantment arcane school,
     * Advanced Player's Guide), granted at wizard level
     * 8: "you can emit a 30-foot aura to either ward off or welcome emotional
     * influence for a number of rounds per day equal to your wizard level. If
     * you choose to ward, you and your allies within this aura receive a +4
     * morale bonus on saves against mind-affecting spells and effects, and any
     * fear effects targeting you or your allies are reduced by one step... If
     * you chose to enhance emotional influence, enemies within the aura
     * receive a -2 penalty on saves against mind-affecting spells and
     * effects." Only the ward mode's morale save bonus is self-facing and
     * flat; the enhance mode penalizes enemies (no Change lands on the
     * wizard's own sheet) and the fear-step-down clause has no matching Change
     * target, so both stay prose. The mode is a one-time choice at activation,
     * not a per-round decision, matching the toggle-on/toggle-off shape this
     * table already uses everywhere else.
     */
    Lz9i4zNAH50umw3s: [
      {
        slug: "ward",
        name: "Shape Emotions (Ward)",
        changes: [
          {
            formula: "4",
            target: "allSavingThrows",
            type: "morale",
            saveCategories: ["mind"],
          },
        ],
        contextNotes: [
          {
            target: "allChecks",
            text: "Costs 1 of your wizard-level daily rounds, standard action to emit, 30-ft aura. The fear-effect step-down (shaken negated, frightened reduced to shaken, panicked reduced to frightened) has no matching target and stays prose. The 'enhance' mode (a -2 penalty on enemies' saves) is enemy-facing and has no toggle here. This pool is not auto-decremented while this toggle is on; track your own rounds spent.",
          },
        ],
      },
    ],
  };

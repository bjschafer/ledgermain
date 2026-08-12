/**
 * Hand-authored `Change[]` for inquisitor inquisition granted powers whose
 * published text promises a numeric effect the vendored
 * `RefData.inquisitions[*].features` entry doesn't carry. Keyed by the
 * granted power's `name` — see `domains.ts`'s doc comment for the
 * name-keying rationale, which applies identically here.
 *
 * See `granted-power-effects/index.ts` for the collection-loop wiring and
 * the cross-catalog name-collision discipline every key here must satisfy.
 */

import type { Change } from "@pf1/schema";

export const INQUISITION_POWER_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  /**
   * Self-Control (Possession inquisition, Blood of Fiends): "You possess
   * remarkable control over your own body, and gain a +2 competence bonus on
   * saving throws made against enchantment spells of the charm or compulsion
   * subschool." Named individually rather than collapsed to `enchantment`
   * because the text scopes to the two subschools, not the whole school
   * (Illusion, e.g., is unaffected) — same reasoning as Heart of Freedom's
   * three-category list in `class-feature-effects.ts`.
   */
  "Self-Control": [
    {
      formula: "2",
      target: "allSavingThrows",
      type: "competence",
      saveCategories: ["charm", "compulsion"],
    },
  ],

  /**
   * Patient Sensibility (Redemption inquisition, Faiths and Philosophies):
   * "You gain a +2 bonus on Diplomacy, Perception, and Sense Motive checks."
   */
  "Patient Sensibility": [
    { formula: "2", target: "skill.dip", type: "untyped" },
    { formula: "2", target: "skill.per", type: "untyped" },
    { formula: "2", target: "skill.sen", type: "untyped" },
  ],

  /**
   * Torturer's Presence (Torture inquisition, Ultimate Magic): "You gain a
   * +2 bonus when using the Intimidate skill. This is in addition to your
   * bonus for Stern Gaze." Untyped so it stacks with the Inquisitor's own
   * Stern Gaze morale bonus (vendored on that class feature directly),
   * matching "in addition to" verbatim.
   */
  "Torturer's Presence": [{ formula: "2", target: "skill.int", type: "untyped" }],

  /**
   * Grant the Initiative (Tactics inquisition, Ultimate Magic), granted at
   * 8th level: "you and all allies within 30 feet may add your Wisdom bonus
   * to your initiative checks." "Bonus" (not "modifier") reads as
   * never-negative, hence `max(0, ...)`. The allies clause isn't modeled —
   * it affects other characters' sheets, not this one's.
   */
  "Grant the Initiative": [
    { formula: "max(0, @abilities.wis.mod)", target: "init", type: "untyped" },
  ],

  /**
   * Labyrinthine Words (Politics inquisition, Inner Sea Intrigue): "You add
   * your Wisdom modifier in addition to your Charisma modifier on Bluff
   * checks to lie and Diplomacy checks to influence other creatures." Wired
   * as an unconditional bonus on both skills' totals even though the text
   * scopes to lying/influencing specifically (not feinting or gathering
   * information), the same over-application call `class-feature-effects.ts`
   * makes for its own conditional-skill-use powers.
   */
  "Labyrinthine Words": [
    { formula: "@abilities.wis.mod", target: "skill.blf", type: "untyped" },
    { formula: "@abilities.wis.mod", target: "skill.dip", type: "untyped" },
  ],
};

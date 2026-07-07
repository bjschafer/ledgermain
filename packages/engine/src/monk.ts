/**
 * Monk bonus feat list (issue #57): hand-authored clean-room from the
 * published PF1 Core Rulebook rules (verified against d20pfsrd.com's Monk
 * class page) — no Foundry source was consulted. The vendored "Bonus Feat
 * (MNK)" class feature carries the correct `bonusFeats` slot-count formula
 * (`1 + floor((@class.unlevel + 2) / 4)`, granting slots at 1st, 2nd, 6th,
 * 10th, 14th, and 18th level) but, like every other class's bonus-feat
 * feature, no structured restriction on which feats fill those slots.
 *
 * CRB text (paraphrased): at 1st level a monk may select a bonus feat from a
 * seven-feat list; at 6th level six more feats become available; at 10th
 * level four more become available (the list only grows — it never shrinks
 * or re-restricts by tier). The three tiers are flattened into one list here
 * — the project's feat picker doesn't level-gate the ranger combat-style tree
 * either, so this matches existing precedent (`ranger.ts`'s `COMBAT_STYLES`)
 * rather than modeling which tier unlocked which feat.
 */

import { featNameSlug } from "./feat-effects.js";

/**
 * `featNameSlug`s of every feat in the monk bonus-feat list (all three
 * unlock tiers combined — see file doc comment).
 */
export const MONK_BONUS_FEAT_SLUGS: readonly string[] = [
  // 1st level
  "Catch Off-Guard",
  "Combat Reflexes",
  "Deflect Arrows",
  "Dodge",
  "Improved Grapple",
  "Scorpion Style",
  "Throw Anything",
  // 6th level
  "Gorgon's Fist",
  "Improved Bull Rush",
  "Improved Disarm",
  "Improved Feint",
  "Improved Trip",
  "Mobility",
  // 10th level
  "Improved Critical",
  "Medusa's Wrath",
  "Snatch Arrows",
  "Spring Attack",
].map((n) => featNameSlug(n));

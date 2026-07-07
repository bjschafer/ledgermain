/**
 * RAW-repeatable feats (issue #58): the PF1 CRB/APG/UM/UC/ACG/OA "Special:
 * You can gain/take/select this feat multiple times" (and close phrasing
 * variants — "more than once", "up to N times") feats. `apps/web/src/model/doc.ts`'s
 * `addFeatInstance`/`removeFeatInstance` will happily create/remove an extra
 * instance of ANY feat id (free-choice, hybrid soft-warning posture per
 * CLAUDE.md) — this set only drives the UI's "take again" affordance
 * (`FeatsSection`) and, indirectly, which feats look normal with more than
 * one instance on the Play tab.
 *
 * Curated by hand from a full-text scan of every `description` field in the
 * vendored `packages/data-pipeline/data/feats.json` (390 feats): every
 * "multiple times" / "more than once" / "up to ... times" hit was read and
 * cross-checked against the published PF1 rules (clean-room — no Foundry
 * system code consulted, matching CLAUDE.md's licensing discipline). A
 * curated set rather than a live description-regex scan, for two reasons:
 *
 *   1. The phrasing sits inside free-text HTML prose with enough near-miss
 *      variation that a blind runtime regex would misclassify entries —
 *      e.g. Combat Reflexes's "more than once per round", Great Cleave's
 *      "attack an individual foe more than once", and Bloody Assault's
 *      "does not stack with itself" all matched a naive scan but are NOT
 *      repeatability grants.
 *   2. At least one genuinely repeatable feat has INCOMPLETE vendored prose:
 *      "Extra Channel" (APG p. 162) is RAW repeatable ("Special: You can
 *      gain this feat multiple times. Its effects stack.") but the vendored
 *      description text omits that "Special" sentence entirely — a live
 *      scan would silently miss it. (`@pf1/engine`'s `FEAT_POOL_EFFECTS`
 *      already treats it as repeatable independently, for its pool-stacking
 *      math — this set agrees.) Hand-verifying once and freezing the result
 *      catches cases like this that a mechanical scan cannot.
 *
 * Keyed by `featNameSlug` (stable across data re-vendors, same posture as
 * `@pf1/engine`'s `FEAT_EFFECTS`/`FEAT_EFFECTS_EXTRACTED`/`FEAT_POOL_EFFECTS`
 * tables). See the issue #58 implementation notes for the full per-feat
 * source-text audit this list was drawn from.
 */

import { featNameSlug } from "@pf1/engine";

export const REPEATABLE_FEAT_SLUGS: ReadonlySet<string> = new Set([
  // Choice feats with a real engine effect (FEAT_EFFECTS / FEAT_EFFECTS_EXTRACTED) —
  // each instance applies independently per issue #58's design (Weapon Focus
  // taken twice, once per weapon, buffs both).
  "greater-spell-focus",
  "greater-weapon-focus",
  "greater-weapon-specialization",
  "improved-critical", // display-only choice (no engine crit-range effect — see model/feats.ts DISPLAY_ONLY_FEAT_CHOICES)
  "skill-focus",
  "spell-focus", // display-only choice (no engine DC effect — see model/feats.ts DISPLAY_ONLY_FEAT_CHOICES)
  "weapon-focus",
  "weapon-specialization",

  // "Extra X" resource-pool feats (@pf1/engine FEAT_POOL_EFFECTS — each
  // instance's maxDelta now stacks via `resources.ts`'s extraFeats-aware
  // collectFeatPoolBonuses).
  "extra-arcane-pool",
  "extra-channel",
  "extra-ki",
  "extra-lay-on-hands",
  "extra-performance",
  "extra-rage",
  "extra-reservoir",

  // "Extra X" feats granting one more of a non-numeric class resource
  // (talent/discovery/hex/exploit/...) — no engine target exists for these
  // (same posture as any other unmodeled class feature choice); repeatable
  // in the doc model/budget/display only.
  "extra-amplification",
  "extra-arcana",
  "extra-arcanist-exploit",
  "extra-bombs",
  "extra-cantrips-or-orisons",
  "extra-discovery",
  "extra-feature",
  "extra-focus-power",
  "extra-grit",
  "extra-hex",
  "extra-inspiration",
  "extra-investigator-talent",
  "extra-mercy",
  "extra-mesmerist-tricks",
  "extra-ninja-trick",
  "extra-panache",
  "extra-rage-power",
  "extra-revelation",
  "extra-rogue-talent",
  "extra-slayer-talent",
  "extra-surge",

  // Everything else confirmed repeatable by vendored "Special" text.
  "ability-focus",
  "alignment-channel",
  "elemental-channel",
  "empower-spell-like-ability",
  "exotic-weapon-proficiency",
  "fleet",
  "improved-natural-armor",
  "improved-natural-attack",
  "magical-tail",
  "martial-weapon-proficiency",
  "quicken-spell-like-ability",
  "rapid-reload",
  "spell-mastery",
  "versatile-summon-monster",
]);

/** Whether `featName` is in the curated RAW-repeatable set (see file doc comment). */
export function isRepeatableFeat(featName: string): boolean {
  return REPEATABLE_FEAT_SLUGS.has(featNameSlug(featName));
}

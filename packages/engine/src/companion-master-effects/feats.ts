/**
 * Master FEATS that modify the tracked companion/mount, keyed by
 * `featNameSlug`. Each entry applies at most once no matter how many copies
 * are owned (Boon Companion's own "The effects do not stack"; the
 * multi-companion case it contemplates is out of scope — one tracked
 * companion). Verify every number against the vendored feat description
 * before wiring.
 */

import type { CompanionMasterEffect } from "./types.js";

export const COMPANION_EFFECT_FEATS: Readonly<Record<string, CompanionMasterEffect>> = {
  // "The abilities of your animal companion or familiar are calculated as
  // though your class were 4 levels higher, to a maximum effective druid
  // level equal to your character level." Applied to the COMPANION here;
  // the familiar half stays out of scope (familiar.ts derives off master
  // level directly). Replaces the former hard-coded hasBoonCompanionFeat
  // special case in apps/web/src/model/companion.ts.
  "boon-companion": {
    source: "Boon Companion",
    level: { grants: false, mode: "flat", amount: 4 },
  },
  // "You gain an animal companion as if you were a druid of your character
  // level −3 ... the effective druid level granted by this feat stacks with
  // that granted by other sources." The from-a-list species restriction is
  // a soft hint only, matching the mount picker's posture.
  "animal-ally": {
    source: "Animal Ally",
    level: { grants: true, mode: "characterLevel", offset: -3 },
  },
};

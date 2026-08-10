/**
 * Aggregator for the vendored-racial-trait classification audit: merges every
 * per-shard file in this directory into the single map
 * `scripts/mech-coverage.ts` consumes. This is the only file a diff adding a
 * new shard should need to touch outside the shard itself.
 *
 * Shard convention: traits shard alphabetically by their `race` string's
 * first letter — `racesAD` / `racesEG` / `racesHR` / `racesSZ` — so every
 * entry has exactly one deterministic home and shards never collide (the
 * classification test asserts the merge is collision-free anyway). Each shard
 * exports one `Readonly<Record<string, RacialTraitClassificationEntry>>`
 * keyed by the vendored `RefData.racialTraits` pack id.
 */

import type { RacialTraitClassificationEntry } from "./types.js";
import { RACIAL_TRAIT_CLASSIFICATION_RACES_AD } from "./racesAD.js";
import { RACIAL_TRAIT_CLASSIFICATION_RACES_EG } from "./racesEG.js";
import { RACIAL_TRAIT_CLASSIFICATION_RACES_HR } from "./racesHR.js";
import { RACIAL_TRAIT_CLASSIFICATION_RACES_SZ } from "./racesSZ.js";

export type { RacialTraitClassificationBucket, RacialTraitClassificationEntry } from "./types.js";

export const RACIAL_TRAIT_CLASSIFICATION_SHARDS: readonly Readonly<
  Record<string, RacialTraitClassificationEntry>
>[] = [
  RACIAL_TRAIT_CLASSIFICATION_RACES_AD,
  RACIAL_TRAIT_CLASSIFICATION_RACES_EG,
  RACIAL_TRAIT_CLASSIFICATION_RACES_HR,
  RACIAL_TRAIT_CLASSIFICATION_RACES_SZ,
];

/** Merged audit, keyed by vendored `RefData.racialTraits` pack id. */
export const RACIAL_TRAIT_CLASSIFICATION: Readonly<Record<string, RacialTraitClassificationEntry>> =
  Object.assign({}, ...RACIAL_TRAIT_CLASSIFICATION_SHARDS) as Record<
    string,
    RacialTraitClassificationEntry
  >;

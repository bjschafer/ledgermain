/**
 * Classification shard for vendored racial traits whose `race` starts with
 * H-R — see `./index.ts` for the shard convention and `./types.ts`
 * for the bucket rubric.
 */

import type { RacialTraitClassificationEntry } from "./types.js";

export const RACIAL_TRAIT_CLASSIFICATION_RACES_HR: Readonly<
  Record<string, RacialTraitClassificationEntry>
> = {};

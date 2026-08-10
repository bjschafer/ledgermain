/**
 * Classification shard for vendored racial traits whose `race` starts with
 * E-G — see `./index.ts` for the shard convention and `./types.ts`
 * for the bucket rubric.
 */

import type { RacialTraitClassificationEntry } from "./types.js";

export const RACIAL_TRAIT_CLASSIFICATION_RACES_EG: Readonly<
  Record<string, RacialTraitClassificationEntry>
> = {};

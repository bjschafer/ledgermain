/**
 * Aggregator for the per-day activation tables: merges every per-shard file
 * in this directory into the single map `resources.ts` (and
 * `scripts/mech-coverage.ts`) consume, and builds each surfaced pool row's
 * `ToggleBuffOption`s from it. See `types.ts` for the table's charter.
 *
 * Shard membership mirrors `class-feature-classification/`'s wave-assigned
 * split (see that directory's `index.ts` for why class features have no
 * clean segmentation axis); entries are keyed by pack id, the
 * `perDayActivations.test.ts` drift guards assert the merge is
 * collision-free, and new entries may go in any shard whose doc comment fits.
 */

import type { ToggleBuffOption } from "../toggle-buffs.js";
import { PER_DAY_ACTIVATIONS_DOMAINS } from "./domains.js";
import { PER_DAY_ACTIVATIONS_GRANTED } from "./granted.js";
import { PER_DAY_ACTIVATIONS_REACHABLE_12 } from "./reachable12.js";
import { PER_DAY_ACTIVATIONS_REACHABLE_34 } from "./reachable34.js";
import { PER_DAY_ACTIVATIONS_REACHABLE_56 } from "./reachable56.js";
import type { PerDayActivationDef } from "./types.js";

export type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATION_SHARDS: readonly Readonly<
  Record<string, readonly PerDayActivationDef[]>
>[] = [
  PER_DAY_ACTIVATIONS_REACHABLE_12,
  PER_DAY_ACTIVATIONS_REACHABLE_34,
  PER_DAY_ACTIVATIONS_REACHABLE_56,
  PER_DAY_ACTIVATIONS_DOMAINS,
  PER_DAY_ACTIVATIONS_GRANTED,
];

/** Merged activation tables, keyed by vendored `RefData.classFeatures` pack id. */
export const PER_DAY_ACTIVATIONS: Readonly<Record<string, readonly PerDayActivationDef[]>> =
  Object.assign({}, ...PER_DAY_ACTIVATION_SHARDS) as Record<string, readonly PerDayActivationDef[]>;

/**
 * The `tableOptions` this feature's pool row carries, filtered to the
 * granting class and its level — `[]` (left `undefined` upstream via
 * `resources.ts`'s `emptyToUndefined` convention) when the feature has no
 * table or nothing is level-eligible yet.
 */
export function perDayActivationToggleOptions(
  featureId: string,
  classTag: string,
  classLevel: number,
): ToggleBuffOption[] {
  const defs = PER_DAY_ACTIVATIONS[featureId];
  if (!defs) return [];
  const options: ToggleBuffOption[] = [];
  for (const def of defs) {
    if (def.classTag !== undefined && def.classTag !== classTag) continue;
    if (def.minLevel !== undefined && classLevel < def.minLevel) continue;
    options.push({
      id: `perDay:${featureId}:${def.slug}`,
      name: def.name,
      changes: [...def.changes],
      contextNotes: def.contextNotes ? [...def.contextNotes] : undefined,
    });
  }
  return options;
}

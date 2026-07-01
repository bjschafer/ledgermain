/**
 * Archetype pick gating — pure and framework-agnostic (DESIGN.md §4 hybrid
 * validation), same posture as `prereqs.ts`: hard-block only on a STRUCTURED
 * signal. Two archetypes on the same class that swap the same base-class
 * feature slot (`pairedBaseFeatureUuid`) is exactly that — `resolveClassFeatures`
 * applies swaps last-wins, so the earlier pick's swap would be silently
 * dropped. Blocking the pick up front beats letting the player discover a
 * no-op archetype later.
 */
import { archetypeSwappedUuids } from "@pf1/engine";
import type { RefData } from "@pf1/schema";

export interface ArchetypeConflict {
  blocked: boolean;
  /** Name of the already-chosen archetype this candidate conflicts with. */
  conflictsWith?: string;
}

/**
 * Would adding `candidateId` to `chosenIds` overlap an already-chosen
 * archetype's swapped base-feature slot? Archetypes with no swaps at all
 * (purely additive) never conflict.
 */
export function checkArchetypeConflict(
  refData: RefData,
  chosenIds: string[],
  candidateId: string,
): ArchetypeConflict {
  const candidateUuids = archetypeSwappedUuids(refData, candidateId);
  if (candidateUuids.size === 0) return { blocked: false };

  for (const id of chosenIds) {
    if (id === candidateId) continue;
    const existingUuids = archetypeSwappedUuids(refData, id);
    if ([...candidateUuids].some((u) => existingUuids.has(u))) {
      return { blocked: true, conflictsWith: refData.archetypes[id]?.name };
    }
  }
  return { blocked: false };
}

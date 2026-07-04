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
import type { CharacterDoc, RefData } from "@pf1/schema";

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

/**
 * True when NO archetype feature for `classTag`, across the entire vendored
 * dataset, carries a `pairedBaseFeatureUuid` (issue #5). For those classes
 * `archetypeSwappedUuids` is always an empty set for every archetype, so
 * `checkArchetypeConflict`'s hard-block can never fire — even when two picks
 * plainly replace the same base feature in the source text (e.g. two cleric
 * archetypes that both swap Channel Energy). As of the pinned Foundry pack
 * this is true for cleric and wizard (0 of ~130/~110 archetype features
 * paired, vs. every other archetyped class having some fraction paired) —
 * computed from the data rather than hardcoded so it self-corrects if a
 * future data bump adds pairings.
 */
function isClassStructurallyUnpaired(refData: RefData, classTag: string): boolean {
  let sawAny = false;
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.classTag !== classTag) continue;
    sawAny = true;
    if (f.pairedBaseFeatureUuid) return false;
  }
  return sawAny;
}

/**
 * Soft-warning fallback for classes `isClassStructurallyUnpaired` covers
 * (cleric/wizard, currently): when 2+ archetypes are chosen for such a class,
 * warn that Ledgermain can't verify they don't swap the same base feature —
 * never blocks, just names the picks so the player can check the source text
 * themselves (issue #5). Classes with any pairing data at all rely solely on
 * `checkArchetypeConflict`'s hard block instead, since it can actually detect
 * overlaps there.
 *
 * Rendered by ArchetypePicker.tsx below its hint text.
 */
export function archetypeConflictWarnings(doc: CharacterDoc, refData: RefData): string[] {
  const chosen = doc.build.archetypes ?? [];
  if (chosen.length < 2) return [];

  const namesByClass = new Map<string, string[]>();
  for (const id of chosen) {
    const archetype = refData.archetypes[id];
    if (!archetype) continue;
    const names = namesByClass.get(archetype.classTag) ?? [];
    names.push(archetype.name);
    namesByClass.set(archetype.classTag, names);
  }

  const warnings: string[] = [];
  for (const [classTag, names] of namesByClass) {
    if (names.length < 2) continue;
    if (!isClassStructurallyUnpaired(refData, classTag)) continue;
    const classDef = Object.values(refData.classes).find((c) => c.tag === classTag);
    warnings.push(
      `${names.join(" + ")} (${classDef?.name ?? classTag}): this class's archetype data has ` +
        `no structured feature pairing, so overlapping swaps can't be detected automatically — ` +
        `double-check they don't replace the same base class feature.`,
    );
  }
  return warnings;
}

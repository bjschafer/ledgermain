/**
 * Archetype pick gating — pure and framework-agnostic (DESIGN.md §4 hybrid
 * validation), same posture as `prereqs.ts`: hard-block only on a STRUCTURED
 * signal. Two archetypes on the same class can conflict two ways:
 *  - they swap the same base-class feature slot (`pairedBaseFeatureUuid`) —
 *    `resolveClassFeatures` applies swaps last-wins, so the earlier pick's
 *    swap would be silently dropped;
 *  - they both replace the same subsystem slot (`replacesSlot` — a hex,
 *    rogue talent, rage power, ...) that has no single `Class.features` grant
 *    to point at, so it can't be caught by the uuid check above.
 * Blocking the pick up front beats letting the player discover a no-op
 * archetype later.
 */
import { archetypeReplacedSlotKeys, archetypeSwappedUuids } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

export interface ArchetypeConflict {
  blocked: boolean;
  /** Name of the already-chosen archetype this candidate conflicts with. */
  conflictsWith?: string;
  /** Human-readable description of what the two archetypes both replace. */
  reason?: string;
}

/** "hex" -> "hex slot", "hex:2" -> "level-2 hex slot" — for `ArchetypeConflict.reason`. */
function describeSlot(slot: { kind: string; level?: number }): string {
  return slot.level === undefined ? `${slot.kind} slot` : `level-${slot.level} ${slot.kind} slot`;
}

/**
 * Would adding `candidateId` to `chosenIds` overlap an already-chosen
 * archetype's swapped base-feature slot, OR a subsystem slot (`replacesSlot`)
 * both replace? Archetypes with no swaps or subsystem-slot replacements at
 * all (purely additive) never conflict.
 */
export function checkArchetypeConflict(
  refData: RefData,
  chosenIds: string[],
  candidateId: string,
): ArchetypeConflict {
  const candidateUuids = archetypeSwappedUuids(refData, candidateId);
  const candidateSlots = archetypeReplacedSlotKeys(refData, candidateId);
  if (candidateUuids.size === 0 && candidateSlots.size === 0) return { blocked: false };

  for (const id of chosenIds) {
    if (id === candidateId) continue;
    const existingUuids = archetypeSwappedUuids(refData, id);
    if ([...candidateUuids].some((u) => existingUuids.has(u))) {
      return { blocked: true, conflictsWith: refData.archetypes[id]?.name };
    }
    const existingSlots = archetypeReplacedSlotKeys(refData, id);
    for (const [key, slot] of candidateSlots) {
      if (existingSlots.has(key)) {
        return {
          blocked: true,
          conflictsWith: refData.archetypes[id]?.name,
          reason: `both replace the ${describeSlot(slot)}`,
        };
      }
    }
  }
  return { blocked: false };
}

/**
 * True when NONE of `archetypeId`'s own features carry a `pairedBaseFeatureUuid`,
 * `replacesSlot`, or `replacesText` — the sheet has no structured signal at
 * all for what this archetype trades away, so `checkArchetypeConflict` can
 * never catch an overlap against it. Used pairwise by
 * `archetypeConflictWarnings` rather than at the whole-class level: a class
 * can have some archetypes with real replacement data and others without
 * (e.g. after a data bump adds a pairing to one cleric archetype but not
 * another), so "does this class have ANY pairing data" is the wrong
 * question — the two ARCHETYPES actually chosen are what matters.
 */
function archetypeHasNoReplacementData(refData: RefData, archetypeId: string): boolean {
  let sawAny = false;
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId !== archetypeId) continue;
    sawAny = true;
    if (f.pairedBaseFeatureUuid || f.replacesSlot || f.replacesText) return false;
  }
  return sawAny;
}

/**
 * Soft-warning fallback for archetype pairs `checkArchetypeConflict` can't
 * evaluate: when 2+ archetypes are chosen for the same class AND a pair among
 * them BOTH have no replacement data at all (see
 * `archetypeHasNoReplacementData`), warn that Ledgermain can't verify they
 * don't swap the same base feature or subsystem slot — never blocks, just
 * names the picks so the player can check the source text themselves. A pair
 * where at least one side carries real replacement data relies solely on
 * `checkArchetypeConflict`'s hard block instead, since it can actually detect
 * overlaps there.
 *
 * Rendered by ArchetypePicker.tsx below its hint text.
 */
export function archetypeConflictWarnings(doc: CharacterDoc, refData: RefData): string[] {
  const chosen = doc.build.archetypes ?? [];
  if (chosen.length < 2) return [];

  const idsByClass = new Map<string, string[]>();
  for (const id of chosen) {
    const archetype = refData.archetypes[id];
    if (!archetype) continue;
    const ids = idsByClass.get(archetype.classTag) ?? [];
    ids.push(id);
    idsByClass.set(archetype.classTag, ids);
  }

  const warnings: string[] = [];
  for (const [classTag, ids] of idsByClass) {
    if (ids.length < 2) continue;
    const classDef = Object.values(refData.classes).find((c) => c.tag === classTag);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i]!;
        const idB = ids[j]!;
        if (!archetypeHasNoReplacementData(refData, idA)) continue;
        if (!archetypeHasNoReplacementData(refData, idB)) continue;
        const nameA = refData.archetypes[idA]?.name ?? idA;
        const nameB = refData.archetypes[idB]?.name ?? idB;
        warnings.push(
          `${nameA} + ${nameB} (${classDef?.name ?? classTag}): neither archetype's data says ` +
            `what it replaces, so overlapping swaps can't be detected automatically. Double-check ` +
            `they don't replace the same base class feature.`,
        );
      }
    }
  }
  return warnings;
}

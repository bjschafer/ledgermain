/**
 * Choose-one selections for archetype features and class features/granted
 * powers — the `archetypeFeature:`/`classFeature:` `build.pickChoices`
 * namespaces, mirroring `model/ragePowers.ts`'s `setRagePowerChoice`/
 * `ragePowerChoice` pair exactly. Unlike traits and rage powers (whose
 * declaring entry is directly toggled on/off in `build.*`), an archetype or
 * class feature's presence follows from `build.archetypes`/
 * `identity.classes` + level, so there is no single "deselect" transition
 * here to hang cleanup on — see `setArchetypes`'s own `refData`-gated
 * cleanup in `model/doc.ts` for the archetype side, and this module's own
 * doc comment on `classFeatureChoice` for why the class side has no such
 * seam yet.
 */

import {
  CLASS_FEATURE_CHOICES,
  GRANTED_POWER_CHOICES,
  resolveArchetypeFeatureEffect,
  type PickChoice,
} from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

/** The declared choice descriptor for an archetype feature, if it has one. */
export function archetypeFeatureChoiceDescriptor(featureId: string): PickChoice | undefined {
  return resolveArchetypeFeatureEffect(featureId)?.effect.choice;
}

/** The stored choose-one selection for an archetype feature, if any. */
export function archetypeFeatureChoice(doc: CharacterDoc, featureId: string): string | undefined {
  return doc.build.pickChoices?.[`archetypeFeature:${featureId}`];
}

/**
 * Store (or clear, with `undefined`) the choose-one selection for an
 * archetype feature that declares one — `build.pickChoices["archetypeFeature:<id>"]`.
 */
export function setArchetypeFeatureChoice(
  doc: CharacterDoc,
  featureId: string,
  optionId: string | undefined,
): CharacterDoc {
  return setPick(doc, `archetypeFeature:${featureId}`, optionId);
}

/**
 * The declared choice descriptor for a class feature or granted power, if
 * `CLASS_FEATURE_CHOICES`/`GRANTED_POWER_CHOICES` has one — checked in the
 * same per-class-key-wins-over-bare-name order `collect.ts` resolves.
 */
export function classFeatureChoiceDescriptor(
  classTag: string,
  featureName: string,
): PickChoice | undefined {
  return (
    CLASS_FEATURE_CHOICES[`${classTag}:${featureName}`]?.choice ??
    CLASS_FEATURE_CHOICES[featureName]?.choice ??
    GRANTED_POWER_CHOICES[featureName]?.choice
  );
}

/**
 * The stored choose-one selection for a class feature or granted power, if
 * any — `build.pickChoices["classFeature:<the granting entry's own vendored
 * id>"]`. NOTE: removing the granting class (`model/doc.ts`'s `removeClass`)
 * does not currently clear this — `removeClass` has no `RefData` in scope
 * to enumerate a class's feature ids the way `setArchetypes` does for
 * archetype features, and several call sites would need threading a new
 * parameter through. A stale pick here is inert (the granted-class-features
 * and granted-power loops only ever walk the character's CURRENT classes),
 * just not cleaned up — a gap, not a bug, left for a future wave.
 */
export function classFeatureChoice(doc: CharacterDoc, featureId: string): string | undefined {
  return doc.build.pickChoices?.[`classFeature:${featureId}`];
}

/**
 * Store (or clear, with `undefined`) the choose-one selection for a class
 * feature or granted power that declares one —
 * `build.pickChoices["classFeature:<id>"]`.
 */
export function setClassFeatureChoice(
  doc: CharacterDoc,
  featureId: string,
  optionId: string | undefined,
): CharacterDoc {
  return setPick(doc, `classFeature:${featureId}`, optionId);
}

function setPick(doc: CharacterDoc, key: string, optionId: string | undefined): CharacterDoc {
  const existing = doc.build.pickChoices ?? {};
  if (optionId === undefined) {
    if (!(key in existing)) return doc;
    const { [key]: _dropped, ...rest } = existing;
    return { ...doc, build: { ...doc.build, pickChoices: rest } };
  }
  if (existing[key] === optionId) return doc;
  return { ...doc, build: { ...doc.build, pickChoices: { ...existing, [key]: optionId } } };
}

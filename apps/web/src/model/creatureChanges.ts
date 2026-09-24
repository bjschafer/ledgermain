/**
 * Permanent modifiers on a tracked familiar, companion, phantom, or eidolon
 * (`changes` on its build), typically a GM grant that belongs to the creature
 * rather than its master. `@pf1/engine` routes them through the same pipeline
 * as a buff shared with the creature.
 */
import type { Change, CharacterDoc } from "@pf1/schema";

/** The build keys whose creature carries its own `changes`. */
export type CreatureBuildKey = "familiar" | "animalCompanion" | "phantom" | "eidolon";

/** Replace the creature's permanent modifiers. No-ops if that creature isn't tracked. */
export function setCreatureChanges(
  doc: CharacterDoc,
  key: CreatureBuildKey,
  changes: readonly Change[],
): CharacterDoc {
  const creature = doc.build[key];
  if (!creature) return doc;
  const next = { ...creature };
  if (changes.length > 0) next.changes = [...changes];
  else delete next.changes;
  return { ...doc, build: { ...doc.build, [key]: next } };
}

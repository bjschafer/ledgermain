/**
 * Pure condition transitions. Conditions are just ids in `doc.live.conditions`;
 * the engine's conditions table maps each to its mechanical `Change[]`, which
 * `compute()` applies. Toggling one re-derives the sheet automatically.
 */

import type { CharacterDoc } from "@pf1/schema";

export function hasCondition(doc: CharacterDoc, id: string): boolean {
  return doc.live.conditions.includes(id);
}

export function toggleCondition(doc: CharacterDoc, id: string): CharacterDoc {
  const has = doc.live.conditions.includes(id);
  const conditions = has
    ? doc.live.conditions.filter((c) => c !== id)
    : [...doc.live.conditions, id];
  return { ...doc, live: { ...doc.live, conditions } };
}

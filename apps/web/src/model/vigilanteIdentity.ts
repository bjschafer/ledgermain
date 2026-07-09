/**
 * Vigilante dual-identity toggle (issue #65) — `live.vigilanteIdentity`, a
 * display-forward table-state flag ("social" | "vigilante"), NOT a numeric
 * input to `compute()` (see that field's doc comment in `character.ts` for
 * why: no vendored `Change` gates on identity, and the identity-scoped
 * talent bonuses this project catalogued — Renown's Intimidate bonus,
 * Social Grace, Loyal Aid, ... — are deliberately left as manual-apply
 * `contextNotes` rather than wired here). This module is the pure
 * live-state transition; the tracker renders it as a two-state chip.
 */

import type { CharacterDoc } from "@pf1/schema";

export type VigilanteIdentity = "social" | "vigilante";

/** The character's current identity — defaults to "social" when unset (see the schema doc comment). */
export function currentVigilanteIdentity(doc: CharacterDoc): VigilanteIdentity {
  return doc.live.vigilanteIdentity ?? "social";
}

/** Set the vigilante's current identity explicitly. */
export function setVigilanteIdentity(doc: CharacterDoc, identity: VigilanteIdentity): CharacterDoc {
  return { ...doc, live: { ...doc.live, vigilanteIdentity: identity } };
}

/** Flip between "social" and "vigilante". */
export function toggleVigilanteIdentity(doc: CharacterDoc): CharacterDoc {
  return setVigilanteIdentity(
    doc,
    currentVigilanteIdentity(doc) === "social" ? "vigilante" : "social",
  );
}

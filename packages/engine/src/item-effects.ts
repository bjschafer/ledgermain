/**
 * Hand-authored extra `Change[]` appended to a small, named set of vendored
 * ITEMS whose own `changes[]` are empty despite their published description
 * granting a real numeric effect — the `Item` counterpart to `buff-effects.ts`'s
 * `BUFF_CHANGE_PATCHES` (same "vendored gap, patched clean-room" posture, same
 * reason for keying by name rather than the vendored id: a content hash that
 * can shift on a data-pipeline rebuild). Applied by `collect.ts`'s equipped-
 * items loop alongside the item's own vendored `changes[]` — no new wiring
 * needed once an entry exists here.
 *
 * Bracers of Armor (+1 through +8, CRB p. 460): "Bracers of armor surround
 * the wearer with an invisible but tangible field of force, granting an
 * armor bonus of +1 to +8, just as though he were wearing armor" — confirmed
 * against aonprd.com (2026-07-25). All eight vendored entries
 * (`Bracers of Armor +1` .. `+8`) carry an empty `changes[]`, so equipping
 * one currently grants nothing. `aac` (armor AC) is this engine's existing
 * target for a magic item's armor-type AC bonus — already exercised by the
 * vendored Robe of the Archmagi (`+[[5]]` via `{ target: "aac", type:
 * "untyped" }`), so this rides the same existing, tested consumer rather
 * than inventing a new one.
 *
 * RAW note this does NOT enforce, matching the Robe of the Archmagi's own
 * pre-existing gap: "bracers of armor and ordinary armor do not stack" (the
 * higher one should apply, not both). `computeAc()`'s stacking groups an
 * `aac` change and worn armor's own AC value together by category, but both
 * carry `type: "untyped"` — a type this engine's stacking resolver always
 * sums rather than competes (`stacking.ts`: dodge/untyped/circumstance are
 * exempt from the "same type, only the highest counts" rule) — so equipping
 * bracers alongside worn body armor currently adds both rather than taking
 * the higher, exactly like Robe of the Archmagi already does. Fixing that
 * would mean changing how worn armor's own base AC value is typed in
 * `compute.ts`, out of scope for this patch (and a `compute.ts` change no
 * agent working this file should make lightly, since it'd shift every
 * character's AC computation, not just bracers).
 */

import type { Change } from "@pf1/schema";

function bracersOfArmor(bonus: number): Change[] {
  return [{ formula: String(bonus), target: "aac", type: "untyped" }];
}

export const ITEM_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  "Bracers of Armor +1": bracersOfArmor(1),
  "Bracers of Armor +2": bracersOfArmor(2),
  "Bracers of Armor +3": bracersOfArmor(3),
  "Bracers of Armor +4": bracersOfArmor(4),
  "Bracers of Armor +5": bracersOfArmor(5),
  "Bracers of Armor +6": bracersOfArmor(6),
  "Bracers of Armor +7": bracersOfArmor(7),
  "Bracers of Armor +8": bracersOfArmor(8),
};

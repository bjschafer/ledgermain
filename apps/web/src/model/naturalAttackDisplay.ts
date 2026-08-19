/**
 * Pure display helpers for `DerivedSheet.naturalAttacks` — the PC's own
 * claws/bite/etc. lines (as opposed to an assumed polymorph form's or a
 * companion/eidolon's). Mirrors `eidolonDisplay.ts`/`companionDisplay.ts`/
 * `phantomDisplay.ts`'s "count + name, (secondary) suffix" conventions;
 * unlike those, a PC's own natural attack carries full modifier-component
 * provenance (`attackComponents`/`damageComponents`), so the numbers still
 * flow through `StatSeal`'s reveal rather than a bare formatted string — the
 * damage-string join here mirrors `Sheet.tsx`'s per-weapon `dmgStr` build
 * instead, for the same optional-dice fallback behavior.
 */

import type { DerivedNaturalAttack } from "@pf1/schema";

import { signed } from "./names.js";

/** "2 claws" / "Bite" — the attack name, pluralized when there's more than one. */
export function naturalAttackName(attack: DerivedNaturalAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/** "(secondary)" suffix — empty string for a primary attack, the common case. */
export function naturalAttackTypeSuffix(attack: DerivedNaturalAttack): string {
  return attack.kind === "secondary" ? "(secondary)" : "";
}

/**
 * "1d4+3" — damage dice + signed bonus, falling back to the bare signed
 * bonus when the line has no separate damage die (a claw with no listed
 * dice, say). Same join Sheet.tsx already does for per-weapon damage.
 */
export function naturalAttackDamageLabel(attack: DerivedNaturalAttack): string {
  const bonusStr = attack.damageBonus !== 0 ? signed(attack.damageBonus) : null;
  return [attack.damageDice, bonusStr].filter(Boolean).join("") || signed(attack.damageBonus);
}

/**
 * The granting def's reminders, joined the same "·"-separated way
 * `weaponAttackSubLine` joins its parts. `null` when the line has no notes.
 */
export function naturalAttackNoteLine(attack: DerivedNaturalAttack): string | null {
  return attack.notes && attack.notes.length > 0 ? attack.notes.join(" · ") : null;
}

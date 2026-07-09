/**
 * Pure, display-only helpers for `PhantomPanel` — formatting an
 * already-derived `DerivedPhantom` (from `@pf1/engine`'s `phantom.ts`) for
 * presentation. No game logic lives here; this only reshapes/labels numbers
 * the engine already computed. Mirrors `companionDisplay.ts` closely.
 */

import type { DerivedPhantom, DerivedPhantomAttack } from "@pf1/engine";

import { signed, skillName } from "./names.js";

const SIZE_LABEL: Record<"sm" | "med" | "lg", string> = {
  sm: "Small",
  med: "Medium",
  lg: "Large",
};

/** One clean summary line: Emotional Focus/size — same "·"-separated convention as `formatCompanionSummary`. */
export function formatPhantomSummary(phantom: DerivedPhantom): string {
  return `${phantom.focusName} focus, ${SIZE_LABEL[phantom.size]}`;
}

/** "2 slams" — the attack name, pluralized when there's more than one. */
export function formatPhantomAttackName(attack: DerivedPhantomAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/** "+6" — just the attack roll, for its own compact seal. */
export function formatPhantomAttackRoll(attack: DerivedPhantomAttack): string {
  return signed(attack.attack);
}

/** "1d8+3" — damage dice + bonus, for its own compact seal. */
export function formatPhantomAttackDamage(attack: DerivedPhantomAttack): string {
  const bonus = attack.damageBonus !== 0 ? signed(attack.damageBonus) : "";
  return `${attack.damageDice}${bonus}`;
}

/** One phantom skill row for display. */
export interface PhantomSkillRow {
  id: string;
  name: string;
  total: number;
}

/** The phantom's two Emotional-Focus skills, sorted alphabetically by display name. */
export function phantomSkillRows(phantom: DerivedPhantom): PhantomSkillRow[] {
  return Object.entries(phantom.skills)
    .map(([id, skill]) => ({ id, name: skillName(id), total: skill.total }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

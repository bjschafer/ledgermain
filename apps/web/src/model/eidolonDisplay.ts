/**
 * Pure, display-only helpers for `EidolonPanel` — formatting an
 * already-derived `DerivedEidolon` (from `@pf1/engine`'s `eidolon.ts`) for
 * presentation. No game logic lives here; this only reshapes/labels numbers
 * the engine already computed. Mirrors `phantomDisplay.ts`/`companionDisplay.ts`
 * closely.
 */

import type { DerivedEidolon, DerivedEidolonAttack } from "@pf1/engine";

import { signed, skillName } from "./names.js";

const SIZE_LABEL: Record<"sm" | "med" | "lg", string> = {
  sm: "Small",
  med: "Medium",
  lg: "Large",
};

/** One clean summary line: base form/size — same "·"-separated convention as `formatPhantomSummary`. */
export function formatEidolonSummary(eidolon: DerivedEidolon): string {
  const sizeLabel = SIZE_LABEL[eidolon.size as "sm" | "med" | "lg"] ?? eidolon.size;
  return `${eidolon.baseFormName}, ${sizeLabel}`;
}

/** "2 claws" — the attack name, pluralized when there's more than one. */
export function formatEidolonAttackName(attack: DerivedEidolonAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/** "+11" — just the attack roll, for its own compact seal. */
export function formatEidolonAttackRoll(attack: DerivedEidolonAttack): string {
  return signed(attack.attack);
}

/** "1d6+5" — damage dice + bonus, for its own compact seal. */
export function formatEidolonAttackDamage(attack: DerivedEidolonAttack): string {
  const bonus = attack.damageBonus !== 0 ? signed(attack.damageBonus) : "";
  return `${attack.damageDice}${bonus}`;
}

/** One eidolon skill row for display. */
export interface EidolonSkillRow {
  id: string;
  name: string;
  total: number;
}

/** The eidolon's physical/perceptual skill set, sorted alphabetically by display name. */
export function eidolonSkillRows(eidolon: DerivedEidolon): EidolonSkillRow[] {
  return Object.entries(eidolon.skills)
    .map(([id, skill]) => ({ id, name: skillName(id), total: skill.total }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "3 / 10" — evolution points spent vs. available, for a budget hint. */
export function formatEidolonEvolutionBudget(eidolon: DerivedEidolon): string {
  return `${eidolon.evolutionPointsSpent} / ${eidolon.evolutionPointsAvailable}`;
}

/**
 * Pure, display-only helpers for `EidolonPanel` — formatting an
 * already-derived `DerivedEidolon` (from `@pf1/engine`'s `eidolon.ts`) for
 * presentation. No game logic lives here; this only reshapes/labels numbers
 * the engine already computed. Mirrors `phantomDisplay.ts`/`companionDisplay.ts`
 * closely.
 */

import type { DerivedEidolon, DerivedEidolonAttack } from "@pf1/engine";
import { qualifierLabel } from "@pf1/engine";

import { capitalizeFirst, signed, skillName } from "./names.js";

const SIZE_LABEL: Record<"sm" | "med" | "lg", string> = {
  sm: "Small",
  med: "Medium",
  lg: "Large",
};

/**
 * One clean summary line: base form/size, speeds — same "·"-separated
 * convention as `formatCompanionSummary`.
 */
export function formatEidolonSummary(eidolon: DerivedEidolon): string {
  const sizeLabel = SIZE_LABEL[eidolon.size as "sm" | "med" | "lg"] ?? eidolon.size;
  const speedParts = Object.entries(eidolon.speeds).map(([mode, ft]) =>
    mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`,
  );

  return [
    `${eidolon.baseFormName}, ${sizeLabel}`,
    speedParts.length > 0 ? `Speed ${speedParts.join(", ")}` : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** "2 claws" — the attack name, pluralized when there's more than one. */
export function formatEidolonAttackName(attack: DerivedEidolonAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/**
 * "(secondary)" suffix for a secondary natural attack (see `@pf1/engine`
 * `natural-attacks.ts`), so the tracker panel can flag which attack(s) in a
 * multi-attack-form eidolon take the −5/−2 penalty and half Strength on
 * damage. Empty string for a primary attack (the common case) — mirrors
 * `companionDisplay.ts`'s `formatCompanionAttackTypeSuffix`.
 */
export function formatEidolonAttackTypeSuffix(attack: DerivedEidolonAttack): string {
  return attack.attackType === "secondary" ? "(secondary)" : "";
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

/**
 * Total natural-attack instances the eidolon currently rolls (sum of each
 * attack row's `count` — e.g. "2 claws" contributes 2), for comparing
 * against `maxAttacks` in the bookkeeping hint. The table's cap isn't
 * enforced by the engine (see `DerivedEidolon.maxAttacks` doc comment), so
 * the panel surfaces it as a soft warning only.
 */
export function eidolonAttackInstanceCount(eidolon: DerivedEidolon): number {
  return eidolon.attacks.reduce((sum, a) => sum + a.count, 0);
}

/** "DR 5/evil" (or "DR 5/—" for no bypass, via `qualifierLabel`'s em-dash passthrough). */
export function formatEidolonDrLine(entry: { amount: number; bypass: string }): string {
  return `DR ${entry.amount}/${qualifierLabel(entry.bypass)}`;
}

/** "fire 10" — one energy-resistance line. */
export function formatEidolonResistanceLine(entry: { energy: string; amount: number }): string {
  return `${qualifierLabel(entry.energy)} ${entry.amount}`;
}

/** "Immune: Fire" — one energy damage-immunity line. */
export function formatEidolonDamageImmunityLine(energy: string): string {
  return `Immune: ${capitalizeFirst(qualifierLabel(energy))}`;
}

/** "Immune: Poison" — one non-damage effect-immunity line (already resolved to its display label by the engine). */
export function formatEidolonEffectImmunityLine(label: string): string {
  return `Immune: ${capitalizeFirst(label)}`;
}

/**
 * Pure, display-only helpers for `CompanionPanel` — formatting an
 * already-derived `DerivedCompanion` (from `@pf1/engine`'s `companion.ts`)
 * for presentation. No game logic lives here; this only reshapes/labels
 * numbers the engine already computed. Mirrors `familiarDisplay.ts` closely.
 */

import type { DerivedCompanion, DerivedCompanionAttack } from "@pf1/engine";
import type { SkillId } from "@pf1/schema";

import { signed, skillName } from "./names.js";

/** The six physical/perceptual skills a companion shows — always surfaced, no low-value filter. */
export const COMPANION_SKILL_IDS: readonly SkillId[] = ["acr", "clm", "fly", "per", "ste", "swm"];

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * One clean summary line: species/size, speeds, senses — same "·"-separated
 * convention as `formatFamiliarSummary`.
 */
export function formatCompanionSummary(companion: DerivedCompanion): string {
  const speedParts = Object.entries(companion.speeds).map(([mode, ft]) =>
    mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`,
  );

  return [
    `${companion.speciesName}, ${capitalize(companion.size)}`,
    speedParts.length > 0 ? `Speed ${speedParts.join(", ")}` : null,
    companion.senses.length > 0 ? capitalize(companion.senses.join(", ")) : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** "2 talons" / "Bite" — the attack name, pluralized when there's more than one. */
export function formatCompanionAttackName(attack: DerivedCompanionAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/**
 * "(secondary)" suffix for a secondary natural attack (issue #68 — see
 * `@pf1/engine` `natural-attacks.ts`), so the tracker panel can flag which
 * attack(s) in a multi-attack-form companion take the −5/−2 penalty and half
 * Strength on damage. Empty string for a primary attack (the common case,
 * including every single-attack-form companion) — no clutter for the
 * majority of rows.
 */
export function formatCompanionAttackTypeSuffix(attack: DerivedCompanionAttack): string {
  return attack.attackType === "secondary" ? "(secondary)" : "";
}

/** "+6" — just the attack roll, for its own compact seal. */
export function formatCompanionAttackRoll(attack: DerivedCompanionAttack): string {
  return signed(attack.attack);
}

/** "1d8+3" — damage dice + bonus + any note, for its own compact seal. */
export function formatCompanionAttackDamage(attack: DerivedCompanionAttack): string {
  const bonus = attack.damageBonus !== 0 ? signed(attack.damageBonus) : "";
  const note = attack.note ? ` ${attack.note}` : "";
  return `${attack.damageDice}${bonus}${note}`;
}

/** A companion skill row for display — {@link COMPANION_SKILL_IDS}, in name order. */
export interface CompanionSkillRow {
  id: SkillId;
  name: string;
  total: number;
}

/** The companion's six physical/perceptual skills, sorted alphabetically by display name. */
export function companionSkillRows(companion: DerivedCompanion): CompanionSkillRow[] {
  const rows: CompanionSkillRow[] = [];
  for (const id of COMPANION_SKILL_IDS) {
    const skill = companion.skills[id];
    if (!skill) continue;
    rows.push({ id, name: skillName(id), total: skill.total });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

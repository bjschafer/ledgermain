/**
 * Pure, display-only helpers for `FamiliarPanel` — formatting and partitioning
 * an already-derived `DerivedFamiliar` (from `@pf1/engine`'s `familiar.ts`)
 * for presentation. No game logic lives here; this only reshapes/labels
 * numbers the engine already computed. Kept separate from `model/familiar.ts`
 * (the doc-transition + derivation module) so the two stay easy to reason
 * about independently.
 */

import type { DerivedFamiliar, DerivedFamiliarAttack } from "@pf1/engine";
import type { SkillId } from "@pf1/schema";

import { signed, skillName } from "./names.js";

/** The six PF1 "animal" universal-monster-rule class skills, always shown even at low totals. */
export const PRIMARY_FAMILIAR_SKILLS: ReadonlySet<SkillId> = new Set([
  "ste",
  "per",
  "acr",
  "clm",
  "fly",
  "swm",
]);

/**
 * A total is only "genuinely useful" at the table above this — below it, a
 * skill the familiar merely inherited ranks in (e.g. Knowledge, at -1/0/+1
 * off the master's ranks and the familiar's own poor ability score) is table
 * noise, not something a player will ever roll on purpose.
 */
const USEFUL_TOTAL_THRESHOLD = 2;

export interface FamiliarSkillRow {
  id: SkillId;
  name: string;
  total: number;
}

/**
 * Split a familiar's skill ids into the ones worth surfacing prominently
 * (the always-relevant physical skills, plus any skill with a genuinely
 * useful total) versus the rest (shown only behind a "show all" disclosure).
 * Both groups are sorted alphabetically by display name.
 */
export function partitionFamiliarSkills(
  skillIds: readonly SkillId[],
  familiar: DerivedFamiliar,
): { primary: FamiliarSkillRow[]; secondary: FamiliarSkillRow[] } {
  const primary: FamiliarSkillRow[] = [];
  const secondary: FamiliarSkillRow[] = [];

  for (const id of skillIds) {
    const skill = familiar.skills[id];
    if (!skill) continue;
    const row: FamiliarSkillRow = { id, name: skillName(id), total: skill.total };
    if (PRIMARY_FAMILIAR_SKILLS.has(id) || skill.total >= USEFUL_TOTAL_THRESHOLD) {
      primary.push(row);
    } else {
      secondary.push(row);
    }
  }

  const byName = (a: FamiliarSkillRow, b: FamiliarSkillRow) => a.name.localeCompare(b.name);
  primary.sort(byName);
  secondary.sort(byName);
  return { primary, secondary };
}

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * One clean summary line: species/size, speeds, senses — separated with the
 * app's own "·" convention (matches the masthead tagline) instead of the
 * sentence-period joins that previously produced "Speed 30 ft.. low-light
 * vision, scent." (a double period, and senses/size left lowercased).
 */
export function formatFamiliarSummary(familiar: DerivedFamiliar): string {
  const speedParts = Object.entries(familiar.speeds).map(([mode, ft]) =>
    mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`,
  );

  return [
    `${familiar.speciesName}, ${capitalize(familiar.size)}`,
    speedParts.length > 0 ? `Speed ${speedParts.join(", ")}` : null,
    familiar.senses.length > 0 ? capitalize(familiar.senses.join(", ")) : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** "2 claws" / "Bite" — the attack name, pluralized when there's more than one. */
export function formatFamiliarAttackName(attack: DerivedFamiliarAttack): string {
  return attack.count > 1 ? `${attack.count} ${attack.name.toLowerCase()}s` : attack.name;
}

/** "+6" — just the attack roll, for its own compact seal. */
export function formatFamiliarAttackRoll(attack: DerivedFamiliarAttack): string {
  return signed(attack.attack);
}

/** "1d3-4 (grab)" — damage dice + bonus + any note, for its own compact seal. */
export function formatFamiliarAttackDamage(attack: DerivedFamiliarAttack): string {
  const bonus = attack.damageBonus !== 0 ? signed(attack.damageBonus) : "";
  const note = attack.note ? ` ${attack.note}` : "";
  return `${attack.damageDice}${bonus}${note}`;
}

/**
 * Pure, display-only helpers for `FamiliarPanel` — formatting and partitioning
 * an already-derived `DerivedFamiliar` (from `@pf1/engine`'s `familiar.ts`)
 * for presentation. No game logic lives here; this only reshapes/labels
 * numbers the engine already computed. Kept separate from `model/familiar.ts`
 * (the doc-transition + derivation module) so the two stay easy to reason
 * about independently.
 */

import {
  BASE_FAMILIARS,
  FAMILIARS,
  type BaseFamiliar,
  type DerivedFamiliar,
  type DerivedFamiliarAttack,
  type FamiliarDef,
  type FamiliarNaturalAttack,
} from "@pf1/engine";
import type { Change, SkillId } from "@pf1/schema";

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

/** "30 ft.", "climb 30 ft.", "fly 60 ft." — one part per movement mode, land unlabeled. */
function formatSpeeds(speeds: Record<string, number>): string[] {
  return Object.entries(speeds).map(([mode, ft]) =>
    mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`,
  );
}

/**
 * One clean summary line: species/size, speeds, senses — separated with the
 * app's own "·" convention (matches the masthead tagline) instead of the
 * sentence-period joins that previously produced "Speed 30 ft.. low-light
 * vision, scent." (a double period, and senses/size left lowercased).
 */
export function formatFamiliarSummary(familiar: DerivedFamiliar): string {
  const speedParts = formatSpeeds(familiar.speeds);

  return [
    `${familiar.speciesName}, ${capitalize(familiar.size)}`,
    speedParts.length > 0 ? `Speed ${speedParts.join(", ")}` : null,
    familiar.senses.length > 0 ? capitalize(familiar.senses.join(", ")) : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** Size + speeds + senses for a base species (pre-derivation) — the species picker's compare line. */
export function formatFamiliarSpeciesSummary(species: BaseFamiliar): string {
  const speedParts = formatSpeeds(species.speeds);
  return [
    capitalize(species.size),
    speedParts.length > 0 ? `Speed ${speedParts.join(", ")}` : null,
    species.senses.length > 0 ? capitalize(species.senses.join(", ")) : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** "2 claws, bite" — a species' natural attacks by name, comma-joined; "" if it has none (e.g. toad). */
export function formatFamiliarSpeciesAttacks(attacks: readonly FamiliarNaturalAttack[]): string {
  return attacks
    .map((a) => (a.count > 1 ? `${a.count} ${a.name.toLowerCase()}s` : a.name.toLowerCase()))
    .join(", ");
}

function formatChange(ch: Change): string {
  const value = Number(ch.formula);
  const amount = `${signed(value)}`;
  if (ch.target.startsWith("skill.")) return `${amount} ${skillName(ch.target.slice(6))}`;
  switch (ch.target) {
    case "fort":
      return `${amount} Fortitude saves`;
    case "ref":
      return `${amount} Reflex saves`;
    case "will":
      return `${amount} Will saves`;
    case "init":
      return `${amount} Initiative checks`;
    case "hp":
      return `${amount} hit points`;
    case "nac":
      return `${amount} natural armor bonus to AC`;
    default:
      return `${amount} ${ch.target}`;
  }
}

/**
 * The published master bonus a familiar grants, formatted generically from
 * its `FamiliarDef.changes` (e.g. "+3 Stealth", "+1 natural armor bonus to
 * AC") rather than a hand-maintained per-species label — every entry in
 * `FAMILIARS` uses one of a handful of simple flat-number change shapes (see
 * that module's doc comment), so this covers all of them without per-species
 * upkeep as the list grows. `undefined` when the species grants no mechanical
 * change at all (e.g. hawk's sight-based Perception bonus is conditional and
 * lives only in `FamiliarDef.note`, display text with no `Change`).
 */
export function formatFamiliarMasterBonus(def: FamiliarDef): string | undefined {
  if (def.changes.length === 0) return undefined;
  return def.changes.map(formatChange).join(", ");
}

/** One browsable row in the familiar species picker — a species plus its published master bonus. */
export interface FamiliarSpeciesOption {
  id: string;
  species: BaseFamiliar;
  /** The mechanical bonus (e.g. "+3 Stealth"), if any — see {@link formatFamiliarMasterBonus}. */
  masterBonus: string | undefined;
  /** Conditional/prose bonus text (e.g. hawk's sight-based Perception note), if any. */
  masterBonusNote: string | undefined;
}

/** Every playable familiar species, alphabetical by display name, for the builder's picker. */
export function familiarSpeciesOptions(): FamiliarSpeciesOption[] {
  return Object.entries(BASE_FAMILIARS)
    .map(([id, species]) => {
      const def = FAMILIARS[id];
      return {
        id,
        species,
        masterBonus: def ? formatFamiliarMasterBonus(def) : undefined,
        masterBonusNote: def?.note,
      };
    })
    .sort((a, b) => a.species.name.localeCompare(b.species.name));
}

/** Case-insensitive substring match against each option's display name; empty query returns everything. */
export function filterFamiliarSpecies(
  options: readonly FamiliarSpeciesOption[],
  query: string,
): FamiliarSpeciesOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options];
  return options.filter((o) => o.species.name.toLowerCase().includes(q));
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

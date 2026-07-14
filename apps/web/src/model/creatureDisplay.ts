/**
 * Pure display helper shared by the four companion-creature tracker panels
 * (`FamiliarPanel`/`CompanionPanel`/`EidolonPanel`/`PhantomPanel`) — each
 * derived creature (`DerivedFamiliar`/`DerivedCompanion`/`DerivedEidolon`/
 * `DerivedPhantom`) carries the same `abilities: Record<AbilityId, {score,
 * mod}>` shape, so the row-building logic lives here once instead of four
 * times.
 */

import type { AbilityId } from "@pf1/schema";

import { signed } from "./names.js";

const ABILITY_ORDER: readonly { id: AbilityId; label: string }[] = [
  { id: "str", label: "Str" },
  { id: "dex", label: "Dex" },
  { id: "con", label: "Con" },
  { id: "int", label: "Int" },
  { id: "wis", label: "Wis" },
  { id: "cha", label: "Cha" },
];

export interface CreatureAbilityRow {
  id: AbilityId;
  label: string;
  score: number;
  mod: string;
}

/** Str/Dex/Con/Int/Wis/Cha, in that fixed display order, as StatSeal-ready rows. */
export function creatureAbilityRows(
  abilities: Record<AbilityId, { score: number; mod: number }>,
): CreatureAbilityRow[] {
  return ABILITY_ORDER.map(({ id, label }) => {
    const ability = abilities[id];
    return { id, label, score: ability.score, mod: signed(ability.mod) };
  });
}

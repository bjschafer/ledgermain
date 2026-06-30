/**
 * Curated magical weapon & armor ability table (clean-room from PF1 RAW — not
 * Foundry code). The upstream data carries only ability *names* (roll-tables
 * in `ultimate-equipment/`) and ad-hoc per-item effects; no portable mechanics.
 * This table encodes the published rules for the common abilities.
 *
 * Only **keen** has a mechanical effect the engine tracks (crit range doubling,
 * applied at pick-time). All other abilities are display-only — the engine
 * doesn't roll dice, so "+1d6 fire" from Flaming is a note on the sheet, not a
 * computed value.
 */
import type { WeaponRef } from "@pf1/schema";

export type AbilitySlot = "weapon" | "armor";

export interface AbilityDef {
  id: string;
  name: string;
  slot: AbilitySlot;
  /** Enhancement-equivalent bonus for pricing reference (no mechanical effect). */
  bonusEquivalent: number;
  /** Display note shown in the weapon/armor meta line (e.g. "+1d6 fire"). */
  note?: string;
  /**
   * Mechanical effect applied to a {@link WeaponRef} at pick-time before
   * denormalization. Currently only `keen` uses this (doubles crit range).
   */
  applyToWeaponRef?: (w: WeaponRef) => Partial<Pick<WeaponRef, "critRange">>;
}

const ABILITIES: Record<string, AbilityDef> = {
  /* --- weapon abilities --- */
  keen: {
    id: "keen",
    name: "Keen",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "doubled threat range",
    applyToWeaponRef: (w) => {
      const base = w.critRange ?? 20;
      return { critRange: Math.max(1, 2 * base - 21) };
    },
  },
  flaming: {
    id: "flaming",
    name: "Flaming",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "+1d6 fire",
  },
  frost: {
    id: "frost",
    name: "Frost",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "+1d6 cold",
  },
  shock: {
    id: "shock",
    name: "Shock",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "+1d6 electricity",
  },
  "flaming-burst": {
    id: "flaming-burst",
    name: "Flaming Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 fire (+×d10 on crit)",
  },
  "icy-burst": {
    id: "icy-burst",
    name: "Icy Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 cold (+×d10 on crit)",
  },
  "shocking-burst": {
    id: "shocking-burst",
    name: "Shocking Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 elec (+×d10 on crit)",
  },
  holy: {
    id: "holy",
    name: "Holy",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+2d6 vs evil",
  },
  unholy: {
    id: "unholy",
    name: "Unholy",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+2d6 vs good",
  },
  "ghost-touch": {
    id: "ghost-touch",
    name: "Ghost Touch",
    slot: "weapon",
    bonusEquivalent: 1,
  },
  vicious: {
    id: "vicious",
    name: "Vicious",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "+2 dmg / 1d6 self",
  },
  speed: {
    id: "speed",
    name: "Speed",
    slot: "weapon",
    bonusEquivalent: 3,
    note: "extra attack",
  },
  defending: {
    id: "defending",
    name: "Defending",
    slot: "weapon",
    bonusEquivalent: 1,
    note: "shift enh to AC",
  },

  /* --- armor / shield abilities --- */
  "light-fortification": {
    id: "light-fortification",
    name: "Light Fortification",
    slot: "armor",
    bonusEquivalent: 1,
    note: "25% negate crits",
  },
  "medium-fortification": {
    id: "medium-fortification",
    name: "Medium Fortification",
    slot: "armor",
    bonusEquivalent: 3,
    note: "50% negate crits",
  },
  "heavy-fortification": {
    id: "heavy-fortification",
    name: "Heavy Fortification",
    slot: "armor",
    bonusEquivalent: 5,
    note: "100% negate crits",
  },
  "armor-ghost-touch": {
    id: "armor-ghost-touch",
    name: "Ghost Touch",
    slot: "armor",
    bonusEquivalent: 1,
  },
  bashing: {
    id: "bashing",
    name: "Bashing",
    slot: "armor",
    bonusEquivalent: 1,
    note: "shield bash dmg up",
  },
};

export { ABILITIES };

/** Abilities applicable to weapons (for UI chips). */
export const WEAPON_ABILITIES = Object.values(ABILITIES).filter((a) => a.slot === "weapon");

/** Abilities applicable to armor/shields (for UI chips). */
export const ARMOR_ABILITIES = Object.values(ABILITIES).filter((a) => a.slot === "armor");

/**
 * Apply mechanical effects of selected abilities to a {@link WeaponRef} and
 * return the patched ref. Currently only `keen` has a mechanical effect
 * (crit range doubling). Returns the original ref if no abilities apply.
 */
export function applyAbilitiesToWeapon(
  weapon: WeaponRef,
  abilityIds?: string[],
): WeaponRef {
  if (!abilityIds || abilityIds.length === 0) return weapon;
  let ref = weapon;
  for (const id of abilityIds) {
    const def = ABILITIES[id];
    if (def?.applyToWeaponRef) {
      ref = { ...ref, ...def.applyToWeaponRef(ref) };
    }
  }
  return ref;
}

/**
 * Collect display notes for a list of ability ids. Returns an array of
 * `{ name, note }` pairs for the meta line.
 */
export function abilityNotes(
  abilityIds?: string[],
): { name: string; note?: string }[] {
  if (!abilityIds || abilityIds.length === 0) return [];
  return abilityIds
    .map((id) => ABILITIES[id])
    .filter((def): def is AbilityDef => def != null)
    .map((def) => ({ name: def.name, note: def.note }));
}

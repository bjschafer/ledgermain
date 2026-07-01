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
   * Ability id that must also be selected before this one is valid (PF1 RAW:
   * e.g. "flaming-burst" upgrades "flaming" and can't exist without it).
   */
  requires?: string;
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
    requires: "flaming",
  },
  "icy-burst": {
    id: "icy-burst",
    name: "Icy Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 cold (+×d10 on crit)",
    requires: "frost",
  },
  "shocking-burst": {
    id: "shocking-burst",
    name: "Shocking Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 elec (+×d10 on crit)",
    requires: "shock",
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
 * Sum of `bonusEquivalent` across a list of ability ids — the "cost" of those
 * abilities in enhancement-bonus terms, per PF1's +10 total-bonus cap on
 * magic weapons/armor (enhancement + abilities combined).
 */
export function totalBonusEquivalent(abilityIds?: string[]): number {
  if (!abilityIds || abilityIds.length === 0) return 0;
  return abilityIds.reduce((sum, id) => sum + (ABILITIES[id]?.bonusEquivalent ?? 0), 0);
}

/** Drop any ability whose `requires` prerequisite isn't present in the same list. */
function withPrereqsMet(abilityIds: string[]): string[] {
  return abilityIds.filter((id) => {
    const req = ABILITIES[id]?.requires;
    return !req || abilityIds.includes(req);
  });
}

/**
 * Reduce a weapon/armor ability selection to a valid PF1 combination for a
 * given `enhancement`: abilities whose prerequisite (e.g. "flaming-burst"
 * needs "flaming") isn't present are dropped, then the remainder is
 * truncated (keeping earliest-selected first) so `enhancement` plus the kept
 * abilities' combined bonus-equivalent never exceeds the +10 cap. Prereqs
 * are re-checked once more after truncation, since the cap could drop a
 * prerequisite while its dependent survives.
 */
export function sanitizeAbilities(abilityIds: string[], enhancement: number): string[] {
  let budget = 10 - enhancement;
  const kept: string[] = [];
  for (const id of withPrereqsMet(abilityIds)) {
    const cost = ABILITIES[id]?.bonusEquivalent ?? 0;
    if (cost > budget) continue;
    kept.push(id);
    budget -= cost;
  }
  return withPrereqsMet(kept);
}

/**
 * Whether `id` could be added to `current` (already-selected ability ids)
 * given `enhancement`: false if abilities aren't allowed yet (enhancement <
 * 1), the ability's prerequisite isn't already selected, or adding it would
 * push the combined bonus-equivalent over the +10 cap. Already-selected
 * abilities are always selectable (so they can be toggled off).
 */
export function abilitySelectable(current: string[], id: string, enhancement: number): boolean {
  if (current.includes(id)) return true;
  if (enhancement < 1) return false;
  const def = ABILITIES[id];
  if (!def) return false;
  if (def.requires && !current.includes(def.requires)) return false;
  return totalBonusEquivalent(current) + def.bonusEquivalent <= 10 - enhancement;
}

/**
 * Toggle `id` in/out of `current`, honoring the same rules as
 * {@link abilitySelectable} for additions. Deselecting a prerequisite
 * cascades to also remove any dependents left in an invalid state (e.g.
 * turning off "flaming" also turns off "flaming-burst").
 */
export function toggleAbilitySelection(current: string[], id: string, enhancement: number): string[] {
  if (current.includes(id)) {
    return withPrereqsMet(current.filter((a) => a !== id));
  }
  if (!abilitySelectable(current, id, enhancement)) return current;
  return [...current, id];
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

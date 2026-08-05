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
import type { ItemAbilityRef, WeaponRef } from "@pf1/schema";

export type AbilitySlot = "weapon" | "armor";

/** Which item kinds an ability can be applied to, matching `ItemAbilityRef.appliesTo`. */
export type AbilityAppliesTo = "weapon" | "armor" | "shield";

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
  /**
   * Overrides the slot-derived default (weapon slot -> ["weapon"], armor slot
   * -> ["armor", "shield"]). Only needed for an ability the default would get
   * wrong, e.g. Bashing (PF1 RAW: shield-only, not body armor).
   */
  appliesTo?: AbilityAppliesTo[];
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
    // PF1 RAW: Flaming Burst is a standalone ability that includes flaming's
    // +1d6 fire — it does not require "flaming" to also be selected.
  },
  "icy-burst": {
    id: "icy-burst",
    name: "Icy Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 cold (+×d10 on crit)",
    // PF1 RAW: Icy Burst is a standalone ability that includes frost's +1d6
    // cold — it does not require "frost" to also be selected.
  },
  "shocking-burst": {
    id: "shocking-burst",
    name: "Shocking Burst",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+1d6 elec (+×d10 on crit)",
    // PF1 RAW: Shocking Burst is a standalone ability that includes shock's
    // +1d6 electricity — it does not require "shock" to also be selected.
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
  // Axiomatic has no entry in the vendored `RefData.itemAbilities` slice,
  // unlike its chaotic opposite (`ability:anarchic`), so without this the
  // lawful quarter of the alignment abilities would be unbuildable. Anarchic
  // deliberately gets no curated twin: it's already pickable, and a second
  // entry would show up twice in the picker.
  axiomatic: {
    id: "axiomatic",
    name: "Axiomatic",
    slot: "weapon",
    bonusEquivalent: 2,
    note: "+2d6 vs chaotic",
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
    note: "+2d6 dmg / 1d6 self",
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
    bonusEquivalent: 3,
  },
  bashing: {
    id: "bashing",
    name: "Bashing",
    slot: "armor",
    bonusEquivalent: 1,
    note: "shield bash dmg up",
    appliesTo: ["shield"], // PF1 RAW: Bashing applies to shields, not body armor.
  },

  /* --- spell resistance (armor/shield) --- */
  "spell-resistance-13": {
    id: "spell-resistance-13",
    name: "Spell Resistance (13)",
    slot: "armor",
    bonusEquivalent: 2,
    note: "SR 13",
  },
  "spell-resistance-15": {
    id: "spell-resistance-15",
    name: "Spell Resistance (15)",
    slot: "armor",
    bonusEquivalent: 3,
    note: "SR 15",
  },
  "spell-resistance-17": {
    id: "spell-resistance-17",
    name: "Spell Resistance (17)",
    slot: "armor",
    bonusEquivalent: 4,
    note: "SR 17",
  },
  "spell-resistance-19": {
    id: "spell-resistance-19",
    name: "Spell Resistance (19)",
    slot: "armor",
    bonusEquivalent: 5,
    note: "SR 19",
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
export function applyAbilitiesToWeapon(weapon: WeaponRef, abilityIds?: string[]): WeaponRef {
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

/** Pick-time snapshot shape for an imported (non-hand-curated) ability id — see `WeaponInstance.abilityInfo`. */
export type AbilityInfo = Record<string, { name: string; cost?: number }>;

/**
 * Enhancement-bonus-equivalent cost of a single ability id. Hand-curated
 * `ABILITIES` wins on a collision; `info` (the doc's pick-time snapshot for
 * `RefData.itemAbilities` picks) supplies the cost for anything else; an id
 * in neither source is treated as free rather than dropped, so a legacy doc
 * referencing a since-removed id doesn't lose the pick.
 */
function abilityCost(id: string, info?: AbilityInfo): number {
  return ABILITIES[id]?.bonusEquivalent ?? info?.[id]?.cost ?? 0;
}

/**
 * Sum of ability costs across a list of ability ids — the "cost" of those
 * abilities in enhancement-bonus terms, per PF1's +10 total-bonus cap on
 * magic weapons/armor (enhancement + abilities combined). See
 * {@link abilityCost} for how an id's cost is resolved against `info`.
 */
export function totalBonusEquivalent(abilityIds?: string[], info?: AbilityInfo): number {
  if (!abilityIds || abilityIds.length === 0) return 0;
  return abilityIds.reduce((sum, id) => sum + abilityCost(id, info), 0);
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
 * prerequisite while its dependent survives. `info` resolves cost for any id
 * not in the hand-curated table (`requires` semantics stay hand-curated-only).
 */
export function sanitizeAbilities(
  abilityIds: string[],
  enhancement: number,
  info?: AbilityInfo,
): string[] {
  let budget = 10 - enhancement;
  const kept: string[] = [];
  for (const id of withPrereqsMet(abilityIds)) {
    const cost = abilityCost(id, info);
    if (cost > budget) continue;
    kept.push(id);
    budget -= cost;
  }
  return withPrereqsMet(kept);
}

/**
 * Whether `id` could be added to `current` (already-selected ability ids)
 * given `enhancement`: false if abilities aren't allowed yet (enhancement <
 * 1), the id is unknown to both the hand-curated table and `info`, the
 * ability's prerequisite isn't already selected, or adding it would push the
 * combined bonus-equivalent over the +10 cap. Already-selected abilities are
 * always selectable (so they can be toggled off).
 */
export function abilitySelectable(
  current: string[],
  id: string,
  enhancement: number,
  info?: AbilityInfo,
): boolean {
  if (current.includes(id)) return true;
  if (enhancement < 1) return false;
  const def = ABILITIES[id];
  if (!def && !info?.[id]) return false;
  if (def?.requires && !current.includes(def.requires)) return false;
  return totalBonusEquivalent(current, info) + abilityCost(id, info) <= 10 - enhancement;
}

/**
 * Toggle `id` in/out of `current`, honoring the same rules as
 * {@link abilitySelectable} for additions. Deselecting a prerequisite
 * cascades to also remove any dependents left in an invalid state (e.g.
 * turning off "flaming" also turns off "flaming-burst").
 */
export function toggleAbilitySelection(
  current: string[],
  id: string,
  enhancement: number,
  info?: AbilityInfo,
): string[] {
  if (current.includes(id)) {
    return withPrereqsMet(current.filter((a) => a !== id));
  }
  if (!abilitySelectable(current, id, enhancement, info)) return current;
  return [...current, id];
}

/**
 * Collect display notes for a list of ability ids. Returns an array of
 * `{ name, note }` pairs for the meta line. An id absent from the
 * hand-curated table falls back to `info[id].name` with no note.
 */
export function abilityNotes(
  abilityIds?: string[],
  info?: AbilityInfo,
): { name: string; note?: string }[] {
  if (!abilityIds || abilityIds.length === 0) return [];
  return abilityIds
    .map((id) => {
      const def = ABILITIES[id];
      if (def) return { name: def.name, note: def.note };
      const imported = info?.[id];
      return imported ? { name: imported.name } : null;
    })
    .filter((entry): entry is { name: string; note?: string } => entry != null);
}

/* -------------------------------------------------- merged picker catalog -- */

/** One option in the merged weapon/armor/shield ability picker (hand-curated + `RefData.itemAbilities`). */
export interface AbilityCatalogOption {
  id: string;
  name: string;
  appliesTo: AbilityAppliesTo[];
  /** Enhancement-equivalent cost; absent for a gp-priced ability (consumes no bonus budget). */
  cost?: number;
  /** Flat gp surcharge, for a gp-priced ability. */
  price?: number;
  note?: string;
  description?: string;
  requires?: string;
}

/** `buildAbilityCatalog`'s return: the merged picker options, plus a snapshot lookup for imported picks. */
export interface AbilityCatalog {
  options: AbilityCatalogOption[];
  /** Snapshot source for `WeaponInstance.abilityInfo`/`WornArmor.abilityInfo` — imported option ids only. */
  info: AbilityInfo;
}

/** The default `appliesTo` for a hand-curated ability, absent an explicit override. */
function defaultAppliesTo(def: AbilityDef): AbilityAppliesTo[] {
  return def.appliesTo ?? (def.slot === "weapon" ? ["weapon"] : ["armor", "shield"]);
}

/**
 * Normalizes an imported ability name for matching against the hand-curated
 * table: lowercased, with a trailing disambiguating parenthetical (" (weapon)",
 * " (armor, shield)") stripped.
 */
function normalizeImportName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

function appliesToOverlaps(a: AbilityAppliesTo[], b: AbilityAppliesTo[]): boolean {
  return a.some((slot) => b.includes(slot));
}

/**
 * Two upstream entries price what PF1 RAW splits into tiers (Fortification:
 * light/moderate/heavy; Spell Resistance: 13/15/17/19), with only the first
 * tier's cost parsed. Rather than surface a misleading single option, their
 * descriptions are grafted onto the matching hand-curated tier options and
 * the imported entries themselves are dropped from the catalog.
 */
const FORTIFICATION_TIER_IDS = [
  "light-fortification",
  "medium-fortification",
  "heavy-fortification",
];
const SPELL_RESISTANCE_TIER_IDS = [
  "spell-resistance-13",
  "spell-resistance-15",
  "spell-resistance-17",
  "spell-resistance-19",
];

function graftDescription(
  options: AbilityCatalogOption[],
  ids: string[],
  description: string,
): void {
  for (const opt of options) {
    if (ids.includes(opt.id)) opt.description = description;
  }
}

/**
 * Merges the hand-curated `ABILITIES` table with `RefData.itemAbilities` into
 * a single picker catalog. Hand-curated entries never get shadowed: an
 * imported entry whose name (normalized) matches a hand-curated one, for an
 * overlapping `appliesTo`, is dropped from the catalog but grafts its prose
 * `description` onto the hand-curated option(s) it matched (so the picker can
 * still show rules text for it). `ability:fortification` and
 * `ability:spell_resistance` are handled explicitly instead (see
 * {@link FORTIFICATION_TIER_IDS}). Every other imported entry becomes its own
 * option. The result is sorted alphabetically by name.
 */
export function buildAbilityCatalog(itemAbilities: Record<string, ItemAbilityRef>): AbilityCatalog {
  const options: AbilityCatalogOption[] = Object.values(ABILITIES).map((def) => ({
    id: def.id,
    name: def.name,
    appliesTo: defaultAppliesTo(def),
    cost: def.bonusEquivalent,
    ...(def.note ? { note: def.note } : {}),
    ...(def.requires ? { requires: def.requires } : {}),
  }));
  const info: AbilityInfo = {};

  for (const ref of Object.values(itemAbilities)) {
    if (ref.id === "ability:fortification") {
      graftDescription(options, FORTIFICATION_TIER_IDS, ref.description);
      continue;
    }
    if (ref.id === "ability:spell_resistance") {
      graftDescription(options, SPELL_RESISTANCE_TIER_IDS, ref.description);
      continue;
    }
    const normalized = normalizeImportName(ref.name);
    const matches = options.filter(
      (opt) =>
        opt.name.toLowerCase() === normalized && appliesToOverlaps(opt.appliesTo, ref.appliesTo),
    );
    if (matches.length > 0) {
      for (const opt of matches) opt.description = ref.description;
      continue;
    }
    options.push({
      id: ref.id,
      name: ref.name,
      appliesTo: ref.appliesTo,
      ...(ref.bonusEquivalent != null ? { cost: ref.bonusEquivalent } : {}),
      ...(ref.price != null ? { price: ref.price } : {}),
      description: ref.description,
    });
    info[ref.id] = {
      name: ref.name,
      ...(ref.bonusEquivalent != null ? { cost: ref.bonusEquivalent } : {}),
    };
  }

  options.sort((a, b) => a.name.localeCompare(b.name));
  return { options, info };
}

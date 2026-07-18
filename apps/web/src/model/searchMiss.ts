/**
 * Shared metadata for the empty-search affordance (issue #88) across the
 * app's major search pickers — one place mapping a picker to its
 * player-facing noun and, where one exists, its homebrew/custom-entry escape
 * hatch. Kept DOM-free so both `SearchMiss` (the view) and its tests share a
 * single source of truth.
 */

export type SearchMissPicker =
  | "feats"
  | "spells"
  | "races"
  | "traits"
  | "gear"
  | "archetypes"
  | "buffs";

/** The player-facing noun for a picker, e.g. for "Can't find a feat…" copy. */
const PICKER_LABEL: Record<SearchMissPicker, string> = {
  feats: "feat",
  spells: "spell",
  races: "race",
  traits: "trait",
  gear: "item",
  archetypes: "archetype",
  buffs: "buff",
};

export function pickerLabel(picker: SearchMissPicker): string {
  return PICKER_LABEL[picker];
}

/**
 * A pointer to the category's homebrew/custom-entry door, in player
 * language. Not every picker has one (spells and archetypes have no
 * homebrew authoring door), so this is a partial map — `SearchMiss` simply
 * omits the hint when a picker has none.
 */
const ESCAPE_HATCH: Partial<Record<SearchMissPicker, string>> = {
  feats: "Not there? You can add it as a homebrew feat.",
  traits: "Not there? You can add it as a homebrew trait.",
  races: "Not there? You can add it as a homebrew race.",
  gear: "Not there? You can add it as a custom item.",
  buffs: "Not there? You can add it as a custom buff.",
};

export function escapeHatchFor(picker: SearchMissPicker): string | undefined {
  return ESCAPE_HATCH[picker];
}

/**
 * The vocabulary for `Change.saveCategories` — a bonus scoped to a category of
 * effects rather than to a save.
 *
 * `saves` is the load-bearing field: most categories can only ever be rolled
 * against one save (a poison always allows a Fortitude save; a fear effect
 * always a Will save), so a bonus vs. poison has no meaning on Reflex and must
 * not render there. Listing all three is the escape hatch for the categories
 * that genuinely vary — spells/SLAs/Su can call for any save, and curses and
 * stunning effects are inconsistent enough in PF1 that narrowing them would be
 * a guess.
 *
 * `label` is player-facing copy shown on the sheet, so it stays terse: these
 * render at 10px inside a stat seal roughly 110px wide at the narrowest
 * supported layout. `Su` is Paizo's own abbreviation. `SLAs` is the community
 * shorthand rather than the official stat-block tag `Sp`, deliberately: `Sp`
 * beside "spells" is ambiguous at a glance, and `SLA` is what this codebase's
 * prose already uses throughout.
 */

export interface SaveCategory {
  /** Player-facing label. Terse — it renders under a stat seal. */
  label: string;
  /** Which saves this category can actually be rolled against. */
  saves: ReadonlyArray<"fort" | "ref" | "will">;
}

const ALL_SAVES = ["fort", "ref", "will"] as const;

export const SAVE_CATEGORIES: Readonly<Record<string, SaveCategory>> = {
  // Source categories — any save, since a spell can call for any of them.
  spell: { label: "spells", saves: ALL_SAVES },
  sla: { label: "SLAs", saves: ALL_SAVES },
  su: { label: "Su", saves: ALL_SAVES },

  // Fortitude categories.
  poison: { label: "poison", saves: ["fort"] },
  disease: { label: "disease", saves: ["fort"] },
  death: { label: "death", saves: ["fort"] },

  // Will categories.
  mind: { label: "mind-affecting", saves: ["will"] },
  fear: { label: "fear", saves: ["will"] },
  sleep: { label: "sleep", saves: ["will"] },
  enchantment: { label: "enchantment", saves: ["will"] },
  illusion: { label: "illusions", saves: ["will"] },
  emotion: { label: "emotion", saves: ["will"] },
  possession: { label: "possession", saves: ["will"] },
  mindReading: { label: "mind-reading", saves: ["will"] },

  // Inconsistent in PF1 — a curse or a stunning effect can key off more than
  // one save depending on the effect, so these deliberately stay unnarrowed.
  curse: { label: "curses", saves: ALL_SAVES },
  stun: { label: "stunning", saves: ALL_SAVES },
};

/**
 * Display order for merged category lists, so "spells, SLAs, Su" always reads
 * in that order regardless of the order the Changes were collected in.
 */
export const SAVE_CATEGORY_ORDER: readonly string[] = Object.keys(SAVE_CATEGORIES);

export function saveCategoryLabel(key: string): string {
  return SAVE_CATEGORIES[key]?.label ?? key;
}

/** Whether `key` is a category that `save` can actually be rolled against. */
export function categoryAppliesToSave(key: string, save: "fort" | "ref" | "will"): boolean {
  const cat = SAVE_CATEGORIES[key];
  return cat !== undefined && cat.saves.includes(save);
}

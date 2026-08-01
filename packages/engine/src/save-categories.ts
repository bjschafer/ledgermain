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

import type { ConditionalTotal } from "@pf1/schema";

import { resolveStack, type StackResult, type TypedModifier } from "./stacking.js";

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
  despair: { label: "despair", saves: ["will"] },
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

/* ------------------------------------------------------ resolving a save */

/** A save modifier that may be scoped to {@link SAVE_CATEGORIES} keys. */
export interface ScopedSaveModifier extends TypedModifier {
  /**
   * When set, this modifier is excluded from the save's headline total and
   * contributes only to those categories' conditional totals.
   */
  saveCategories?: readonly string[];
}

/** A save's headline total, its unconditional stack, and its situational totals. */
export interface ResolvedSave {
  total: number;
  /** The unconditional modifiers only, for provenance display. */
  stack: StackResult;
  /** Empty when nothing situational applies. */
  conditionals: ConditionalTotal[];
}

/**
 * Resolve one save from `floor` (its base + ability term, already summed) plus
 * every modifier that reaches it, honoring category scope.
 *
 * This is the whole of the category mechanism, deliberately taking a bare
 * number and a flat modifier list rather than anything from `collect.ts`'s
 * pipeline: the tracked creatures (companion, eidolon, phantom, familiar)
 * build their saves from their own progression tables and a routed shared-buff
 * list, never as a `ResolvedStat`, so this is the one place both paths can
 * meet.
 */
export function resolveSave(
  which: "fort" | "ref" | "will",
  floor: number,
  mods: readonly ScopedSaveModifier[],
): ResolvedSave {
  // A category-scoped modifier is held out of the headline total — applying a
  // "+4 vs. spells" to the whole save would inflate every unrelated roll.
  const unconditional = mods.filter((m) => (m.saveCategories?.length ?? 0) === 0);
  const stack = resolveStack(unconditional as TypedModifier[]);
  const total = floor + stack.total;
  return {
    total,
    stack,
    conditionals: conditionalTotals(which, mods, unconditional, floor, total),
  };
}

/** A tracked creature's situational save totals, by save. Only non-empty saves appear. */
export type CreatureSaveConditionals = Partial<Record<"fort" | "ref" | "will", ConditionalTotal[]>>;

/**
 * Assemble the three resolved saves into a creature's `saveConditionals`,
 * or `undefined` when nothing situational applies — the tracked creatures
 * (companion, eidolon, phantom, familiar) all carry the same optional field,
 * omitted rather than empty so a panel can test it directly.
 */
export function creatureSaveConditionals(
  fort: ResolvedSave,
  ref: ResolvedSave,
  will: ResolvedSave,
): CreatureSaveConditionals | undefined {
  const out: CreatureSaveConditionals = {};
  if (fort.conditionals.length > 0) out.fort = fort.conditionals;
  if (ref.conditionals.length > 0) out.ref = ref.conditionals;
  if (will.conditionals.length > 0) out.will = will.conditionals;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Situational save totals, one per distinct value.
 *
 * Each category is re-stacked from scratch against the unconditional
 * modifiers rather than added on top of the headline total: two `+2 racial`
 * bonuses on the same save must still collide (highest wins) even when one of
 * them is category-scoped, which a plain sum would get wrong.
 */
function conditionalTotals(
  which: "fort" | "ref" | "will",
  all: readonly ScopedSaveModifier[],
  unconditional: readonly ScopedSaveModifier[],
  floor: number,
  total: number,
): ConditionalTotal[] {
  const scoped = all.filter((m) => (m.saveCategories?.length ?? 0) > 0);
  if (scoped.length === 0) return [];

  const byTotal = new Map<number, string[]>();
  for (const key of SAVE_CATEGORY_ORDER) {
    if (!categoryAppliesToSave(key, which)) continue;
    const forCategory = scoped.filter((m) => m.saveCategories?.includes(key));
    if (forCategory.length === 0) continue;
    const stacked = resolveStack([...unconditional, ...forCategory] as TypedModifier[]);
    const conditionalTotal = floor + stacked.total;
    // A category that resolves to the headline total says nothing.
    if (conditionalTotal === total) continue;
    const bucket = byTotal.get(conditionalTotal);
    if (bucket) bucket.push(key);
    else byTotal.set(conditionalTotal, [key]);
  }

  return [...byTotal.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([conditionalTotal, categories]) => ({
      total: conditionalTotal,
      categories,
      labels: categories.map(saveCategoryLabel),
    }));
}

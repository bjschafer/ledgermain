/**
 * The vocabulary for `Change.saveCategories` — a bonus scoped to a category of
 * effects rather than to a save.
 *
 * `saves` is the load-bearing field: most categories can only ever be rolled
 * against one save (a poison always allows a Fortitude save; a fear effect
 * always a Will save), so a bonus vs. poison has no meaning on Reflex and must
 * not render there. Listing all three is the escape hatch for the categories
 * that genuinely vary — spells/SLAs/Su can call for any save, and curses,
 * stunning, traps, and sonic effects are inconsistent enough in PF1 that
 * narrowing them would be a guess.
 *
 * `parent` records that one category is a special case of another: a bonus
 * against the parent also applies to the child, so a "+2 vs. mind-affecting"
 * counts on a charm effect. Only the categories a modifier NAMES get a line on
 * the sheet, but each line's total is stacked from that category plus every
 * ancestor, which is what keeps an inherited bonus from being invisible
 * without printing a line for every descendant of anything.
 *
 * The graph is deliberately shallow and only carries edges that hold for EVERY
 * effect in the child. Illusions are not modelled as mind-affecting (only the
 * phantasm and pattern subschools are, and the category covers the whole
 * school); possession likewise gets no parent, since the subschool is not
 * uniformly mind-affecting. The source axis (spells, SLAs, Su) never crosses
 * with the effect axis: a fear spell reads its fear line and its spell line
 * separately, because crossing them would multiply the lines under the seal.
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
  /**
   * The broader category this one is a special case of, if any. A bonus
   * against the parent also applies here. Must name another
   * {@link SAVE_CATEGORIES} key, and the graph must stay acyclic.
   */
  parent?: string;
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
  petrification: { label: "petrification", saves: ["fort"] },
  // Mostly Fortitude (stinking cloud), but sickened also arrives on a Will
  // save (unholy blight), so both.
  nausea: { label: "nausea/sickened", saves: ["fort", "will"] },
  // Poison-style ability damage/drain is Fort; feeblemind-style is Will.
  abilityDamage: { label: "ability damage/drain", saves: ["fort", "will"] },
  // The save PF1 attaches to negative levels is the Fortitude save to remove
  // them; initial bestowal usually allows none.
  energyDrain: { label: "energy drain", saves: ["fort"] },
  fatigue: { label: "fatigue/exhaustion", saves: ["fort"] },
  pain: { label: "pain", saves: ["fort", "will"] },
  // Positive-energy damage (cure spells, channel) saves are Will halves.
  positiveEnergy: { label: "positive energy", saves: ["will"] },

  // Polymorph (baleful polymorph is Fort-or-Will; an unwilling shapechange
  // like lycanthropy is Fort) and transmutation (the school spans
  // disintegrate's Fort through slow's Will) are siblings of each other and
  // of petrification above, not parent/child: a medusa's gaze and a
  // lycanthropy curse aren't transmutation-school effects, so a bonus
  // against the school must not silently cover them (same reasoning that
  // keeps illusions out of mind-affecting below).
  polymorph: { label: "polymorph", saves: ["fort", "will"] },
  transmutation: { label: "transmutation", saves: ALL_SAVES },
  // More school categories, siblings of transmutation above: necromancy
  // spans death's Fort through cause fear's Will, and divination's rare
  // offensive entries are no more consistent, so neither narrows.
  necromancy: { label: "necromancy", saves: ALL_SAVES },
  divination: { label: "divination", saves: ALL_SAVES },

  // Reflex — the codebase's first Reflex-only category, which is fine:
  // entangling effects (entangle, web) call for a Reflex save to avoid being
  // caught, and nothing about them touches Fort or Will.
  entangle: { label: "entangling", saves: ["ref"] },

  // Will categories. `mind` is the root of this family: fear, emotion, sleep,
  // and the enchantment school all carry the mind-affecting descriptor in PF1,
  // so a bonus against mind-affecting effects covers every one of them.
  mind: { label: "mind-affecting", saves: ["will"] },
  fear: { label: "fear", saves: ["will"], parent: "mind" },
  sleep: { label: "sleep", saves: ["will"], parent: "mind" },
  enchantment: { label: "enchantment", saves: ["will"], parent: "mind" },
  // Charm and compulsion are the two enchantment subschools, so a bonus
  // against enchantment covers both, while one against charm alone does not
  // reach a compulsion.
  charm: { label: "charm", saves: ["will"], parent: "enchantment" },
  compulsion: { label: "compulsion", saves: ["will"], parent: "enchantment" },
  illusion: { label: "illusions", saves: ["will"] },
  emotion: { label: "emotion", saves: ["will"], parent: "mind" },
  despair: { label: "despair", saves: ["will"], parent: "emotion" },
  possession: { label: "possession", saves: ["will"] },
  mindReading: { label: "mind-reading", saves: ["will"], parent: "mind" },
  // The confusion and insanity effects all carry the mind-affecting
  // descriptor, so they inherit from `mind` like the rest of this family.
  confusion: { label: "confusion", saves: ["will"], parent: "mind" },
  // Nearly all language-dependent effects are mind-affecting enchantments,
  // but the descriptor itself doesn't guarantee it, and the graph only
  // carries edges that hold for EVERY effect in the child — so no parent.
  languageDependent: { label: "language-dependent", saves: ["will"] },
  // A medusa's gaze is Fort, a vampire's dominating gaze is Will; no gaze
  // attack in PF1 calls for a Reflex save.
  gaze: { label: "gaze attacks", saves: ["fort", "will"] },
  // Ghoul paralysis is Fort, hold person is Will.
  paralysis: { label: "paralysis", saves: ["fort", "will"] },

  // Inconsistent in PF1 — a curse or a stunning effect can key off more than
  // one save depending on the effect, so these deliberately stay unnarrowed.
  curse: { label: "curses", saves: ALL_SAVES },
  stun: { label: "stunning", saves: ALL_SAVES },
  // Mechanical traps are nearly always Reflex, but magic traps deliver
  // spells that can call for any save. A trap-sense-style bonus that targets
  // only `ref` self-confines through its own target, per the mechanism
  // above — this category doesn't need to narrow itself to match.
  traps: { label: "traps", saves: ALL_SAVES },
  sonic: { label: "sonic", saves: ALL_SAVES },

  // Alignment descriptors: an effect with the evil/good/lawful/chaotic
  // descriptor, or one created by a creature of that alignment (the player
  // rolls the save knowing the source, same self-confinement `traps` and
  // `sonic` rely on above). A spell carrying one of these descriptors can
  // call for any save (order's wrath is Will, unholy blight is Will, a
  // chaos-descriptor attack can be Fort or Reflex depending on the effect),
  // so all four stay unnarrowed like curse/stun/traps/sonic above.
  evil: { label: "evil", saves: ALL_SAVES },
  good: { label: "good", saves: ALL_SAVES },
  lawful: { label: "lawful", saves: ALL_SAVES },
  chaotic: { label: "chaotic", saves: ALL_SAVES },
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

/**
 * `key` plus every category it is a special case of, nearest first — the set
 * of categories whose bonuses apply when rolling against `key`. An unknown key
 * yields just itself, matching the rest of this module's tolerance for one.
 */
export function saveCategoryWithAncestors(key: string): string[] {
  const chain = [key];
  const seen = new Set([key]);
  let cursor = SAVE_CATEGORIES[key]?.parent;
  while (cursor !== undefined && !seen.has(cursor)) {
    chain.push(cursor);
    seen.add(cursor);
    cursor = SAVE_CATEGORIES[cursor]?.parent;
  }
  return chain;
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

  // Only a category some modifier actually NAMES earns a line. Inheritance
  // decides each line's TOTAL, not which lines exist: "+2 vs. mind-affecting"
  // alone must not print a line for fear, sleep, charm, and every other
  // descendant, but a character who also has "+1 vs. charm" reads its charm
  // line with the mind-affecting bonus folded in.
  const named = new Set(scoped.flatMap((m) => m.saveCategories ?? []));

  const byTotal = new Map<number, string[]>();
  for (const key of SAVE_CATEGORY_ORDER) {
    if (!named.has(key)) continue;
    if (!categoryAppliesToSave(key, which)) continue;
    const applicable = new Set(saveCategoryWithAncestors(key));
    const forCategory = scoped.filter((m) => m.saveCategories?.some((c) => applicable.has(c)));
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

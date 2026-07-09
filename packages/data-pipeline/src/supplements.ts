/**
 * Hand-authored supplements for content the pinned Foundry pack omits.
 *
 * `bloodlineSpellLists` is normally derived purely by inverting each spell's
 * `learnedAt.bloodline` (see `normalize.ts`). A handful of Core Rulebook
 * bloodlines are fully authored in `@pf1/engine` `BLOODLINES` (arcana + powers)
 * but have NO bonus-spell list upstream — no vendored spell ever references the
 * tag, so the inversion produces nothing and the bloodline is unselectable in
 * the builder's picker (issue #38). The Aberrant bloodline is the concrete case.
 *
 * This fills the gap clean-room from the published CRB (Aberrant, p. 73), the
 * same posture as `traits.ts`/`bloodlines.ts` for content the compendium
 * doesn't carry. Entries are authored by spell **name** and resolved to the
 * vendored spell id at build time (see `resolveBloodlineSupplements`); a data
 * bump that renames or drops one of these spells fails the build loudly rather
 * than silently emitting a broken list. If upstream ever starts tagging a
 * supplemented bloodline, the real derived list wins and the supplement is
 * ignored (see the merge in `normalize.ts`).
 *
 * Tests exempt these tags from the "every list entry traces back to a spell's
 * learnedAt.bloodline" invariants — see `packages/data-pipeline/test/refdata.test.ts`.
 */

import type { ArchetypeFeature, ClassFeature, SpellList } from "@pf1/schema";

/**
 * Supplemental bonus-spell lists keyed by bloodline tag, then by spell level
 * (1–9), listing spell **names** (resolved to ids at build time). PF1 grants a
 * bloodline's level-`L` spell at sorcerer level `2L+1`.
 */
export const SUPPLEMENTAL_BLOODLINE_SPELLS: Record<string, Record<number, string[]>> = {
  // Aberrant sorcerer bloodline — CRB p. 73.
  Aberrant: {
    1: ["Enlarge Person"],
    2: ["See Invisibility"],
    3: ["Tongues"],
    4: ["Black Tentacles"],
    5: ["Feeblemind"],
    6: ["Veil"],
    7: ["Plane Shift"],
    8: ["Mind Blank"],
    9: ["Shapechange"],
  },
};

/** Bloodline tags carried by the hand-authored supplement above. */
export const SUPPLEMENTAL_BLOODLINE_TAGS: ReadonlySet<string> = new Set(
  Object.keys(SUPPLEMENTAL_BLOODLINE_SPELLS),
);

/**
 * Resolve the supplemental bloodline spell names to vendored spell ids, using
 * the given name→id lookup. Throws if a named spell is absent from the vendored
 * set (a data-version drift guard). Only tags NOT already present in
 * `existing` are resolved — upstream-derived lists always win.
 */
export function resolveBloodlineSupplements(
  spellIdByName: ReadonlyMap<string, string>,
  existing: Record<string, SpellList>,
): Record<string, SpellList> {
  const out: Record<string, SpellList> = {};
  for (const [tag, byLevel] of Object.entries(SUPPLEMENTAL_BLOODLINE_SPELLS)) {
    if (existing[tag]) continue;
    const list: SpellList = {};
    for (const [lvl, names] of Object.entries(byLevel)) {
      for (const name of names) {
        const id = spellIdByName.get(name);
        if (id === undefined) {
          throw new Error(
            `[supplements] bloodline "${tag}" L${lvl}: spell "${name}" not found in vendored spells`,
          );
        }
        (list[Number(lvl)] ??= []).push(id);
      }
      list[Number(lvl)]!.sort();
    }
    out[tag] = list;
  }
  return out;
}

/**
 * Hand-authored fixes for vendored `ClassFeature.uses.maxFormula` values that
 * omit a RAW "minimum 1" floor, keyed by feature **name** (both are unique in
 * the vendored slice). Grit (gunslinger, Ultimate Combat p. 9) and Panache
 * (swashbuckler, Advanced Class Guide p. 16) are each RAW "equal to her
 * Wisdom/Charisma modifier (minimum 1)", but the vendored formula is a bare
 * `@abilities.wis.mod` / `@abilities.cha.mod` — for a character with a 0 or
 * negative modifier this evaluates to <= 0, and `deriveResourcePools` drops
 * any pool whose max evaluates to <= 0 entirely (no pool at all, instead of
 * RAW's 1). Compare `Arcane Pool` / `Inspiration`, whose vendored formulas
 * already bake in an equivalent `max(1, ...)` floor — this supplement brings
 * Grit/Panache in line with that existing pattern. Applied unconditionally
 * (unlike the bloodline-spell-list supplement above, this isn't a "fill only
 * if missing" gap-fill — it corrects an existing-but-incomplete formula).
 */
export const SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA: Record<string, string> = {
  Grit: "max(1, @abilities.wis.mod)",
  Panache: "max(1, @abilities.cha.mod)",
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA` in place to a list of
 * normalized class features (mutates `uses.maxFormula` only, on the matching
 * feature's own `uses` object — never invents a `uses` block where none
 * exists).
 */
export function applyClassFeatureUsesSupplements(features: ClassFeature[]): void {
  for (const feature of features) {
    const formula = SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA[feature.name];
    if (formula && feature.uses) {
      feature.uses = { ...feature.uses, maxFormula: formula };
    }
  }
}

/**
 * Hand-authored corrections for vendored `ArchetypeFeature.level` values that
 * contradict the feature's own description prose — issue #47 (consolidated
 * #45-wave archetype-extraction bug list). The third-party archetype CSV
 * dataset (`config.ts`'s `CLASS_ARCHETYPE_FILES`, read by
 * `transform/archetypes.ts`) occasionally tags a row's level column with a
 * value its own prose disagrees with, which shifts WHEN the (here, always
 * non-numeric/subsystem) ability starts showing as granted in
 * `resolveClassFeatures`'s `f.level <= <class level>` gate — sometimes by
 * several levels.
 *
 * Keyed by the feature's **id** (NOT its level-suffixed form re-derived from
 * the corrected level) — every consumer across `packages/engine/src/
 * archetype-extracted/` and `archetypes.ts` keys off the original id string
 * verbatim (e.g. `MISPAIRED_TARGET_REMAP`, the classification tables), so
 * only the numeric `level` field actually used for gating is corrected here;
 * the id/uuid intentionally keep their original (now level-mismatched)
 * suffix, same posture as `barbarian:jungle-rager:damage-reduction:8` (left
 * unfixed, per its own classification note) already tolerates.
 *
 * A mismatch that's numerically inert regardless (e.g.
 * `druid:ancient-guardian:patience-of-nature:1`, whose extracted formula
 * gates on `@class.unlevel` directly rather than this level field — see that
 * entry's note in `archetype-extracted/druid.ts`) is deliberately left out.
 */
export const SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL: Record<string, number> = {
  // Prose: "At 3rd level, a seeker of the lost gains a +1 competence bonus
  // on Perception checks to notice magical traps..." — vendored level column
  // reads 2.
  "rogue:seeker-of-the-lost:arcana-breaker:2": 3,
  // Prose: "At 13th level, a druid gains the ability to change her
  // appearance at will, as if using the alter self spell..." — vendored
  // level column reads 6.
  "druid:urban-druid:a-thousand-faces:6": 13,
  // Prose: "At 4th level, a realm wanderer must choose an animal companion
  // for his hunter's bond..." — vendored level column reads 0, which (unlike
  // a too-early level) shows the whole ability as granted from 1st level on.
  "ranger:realm-wanderer:queen-s-bond:0": 4,
};

/**
 * Apply `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL` in place to a list of
 * normalized archetype features (mutates `.level` only; `id`/`uuid` are left
 * untouched — see that map's doc comment for why).
 */
export function applyArchetypeFeatureLevelSupplements(features: ArchetypeFeature[]): void {
  for (const feature of features) {
    const level = SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL[feature.id];
    if (level !== undefined) feature.level = level;
  }
}

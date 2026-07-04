/**
 * Hand-authored mechanical effects for archetype class features (issue #7).
 * Clean-room from the published PF1 rules — no Foundry source was consulted
 * (DESIGN.md §6).
 *
 * Context: the vendored archetype dataset (`packages/data-pipeline/src/
 * transform/archetypes.ts`, ultimately from the third-party `pf1e-archetypes`
 * CSV/XML compilation) carries only prose (`ArchetypeFeature.description`) —
 * no structured mechanical data at all, and its prose has at least one
 * verified copy-paste error (see `ArchetypeFeature`'s doc comment in
 * `@pf1/schema`), so it isn't trustworthy as a mechanics source either. Across
 * all 2,326 vendored archetype features, essentially none carry anything a
 * script could turn into a `Change` — numeric support has to be hand-authored
 * per feature, the same posture as `feat-effects.ts`/`traits.ts`/`tables.ts`.
 *
 * Scope (audited, not exhaustive): this table only covers archetype features
 * that grant an UNCONDITIONAL, always-on numeric effect — the same bar
 * `traits.ts` uses (a narrowly-scoped "+X vs. fear" or "+X while wielding your
 * chosen weapon" bonus is deliberately left unmodeled here, same as
 * `traits.ts`'s `courageous`/`birthmark`/`fencer` entries, to avoid
 * over-applying a number the static sheet can't scope correctly). Most
 * archetype features are either purely narrative, an activated ability with a
 * resource cost the engine doesn't track (ki, drunken ki, grit, panache), or
 * conditional on a per-attack/per-round situation (rage state, charging,
 * wielding a specific chosen weapon) — those are left prose-only rather than
 * risk a wrong always-on number.
 *
 * Map key: the archetype feature's own `RefEntity.id` (as synthesized by
 * `data-pipeline/transform/archetypes.ts`:
 * `${archetypeId}:${slug(abilityName)}:${level}`) — stable as long as the
 * archetype/ability names in the vendored CSVs don't change, and directly
 * usable as `refData.archetypeFeatures[id]` without a second lookup table.
 *
 * Applied through the same `collectModifiers` pipeline as every other change
 * source (see `collect.ts`'s "archetype feature effects" section): only when
 * the granting archetype is active (`doc.build.archetypes`) AND the
 * character's level in that archetype's class has reached the feature's
 * `level` gate. `detail()` produces the short summary `ClassFeaturesList`
 * shows next to the feature name — the same mechanism `tables.ts`'s
 * `sneakAttackDice`/`barbarianDamageReduction` already feed into
 * `DerivedClassFeature.detail`.
 */

import type { Change } from "@pf1/schema";

export interface ArchetypeFeatureEffect {
  /** Typed modifiers this feature grants — evaluated via the normal formula pipeline. */
  changes: Change[];
  /** Short mechanical summary for `ClassFeaturesList` (e.g. "DR 5/—"). */
  detail?: (classLevel: number) => string;
}

const c = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});

export const ARCHETYPE_FEATURE_EFFECTS: Readonly<Record<string, ArchetypeFeatureEffect>> = {
  // ── Fighter ──────────────────────────────────────────────────────────────

  // Weapon Master's "Weapon Training" (Ultimate Combat p. 16) replaces Armor
  // Training but is mechanically identical to it (reduce ACP by 1, +1 max Dex
  // bonus at 3rd, then every 4 levels thereafter to a max of -4/+4 at 15th) —
  // a pure reflavor. Same formula the vendored Armor Training class feature
  // uses (see `class-features.json`), just granted under a different feature
  // name/archetype.
  "fighter:weapon-master:weapon-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
  },

  // ── Barbarian ────────────────────────────────────────────────────────────

  // Invulnerable Rager's "Invulnerability (Ex)" (Advanced Player's Guide p.
  // 18) replaces uncanny dodge, improved uncanny dodge, AND damage reduction
  // in one feature — the CSV pairing script can't link a single feature to
  // three base-feature slots, so this is an "ambiguous" (unpaired) swap in
  // `RefData.archetypeFeatures`. DR/— equal to half barbarian level (doubled
  // vs. nonlethal — not modeled, see the omitted contextNote below). Always
  // on once granted (2nd level), so a flat Change is safe.
  "barbarian:invulnerable-rager:invulnerability-ex:2": {
    changes: [c("floor(@class.unlevel / 2)", "dr")],
    detail: (level) => `DR ${Math.floor(level / 2)}/— (×2 vs. nonlethal)`,
  },

  // Savage Barbarian's "Natural Toughness" (Ultimate Combat p. 18) replaces
  // Damage Reduction with a scaling natural armor bonus while wearing no
  // armor (shields still allowed) — +1 at 7th, +1 every 3 levels thereafter.
  // `nac`/type "base" matches the vendored natural-armor convention (see
  // races.json's `nac` changes) so it correctly doesn't stack with another
  // natural-armor source.
  "barbarian:savage-barbarian:natural-toughness-1:7": {
    changes: [c("if(lt(@armor.type, 1), 1 + floor((@class.unlevel - 7) / 3), 0)", "nac", "base")],
    detail: (level) => `+${1 + Math.floor((level - 7) / 3)} natural armor (no armor worn)`,
  },

  // Wildborn's "Damage reduction" (Blood of the Beast) replaces the base
  // Damage Reduction class feature with an identical progression (1/— at
  // 7th, +1 every 3 levels) — a pure reflavor, same numbers as
  // `tables.ts`'s `barbarianDamageReduction`.
  "barbarian:wildborn:damage-reduction:7": {
    changes: [c("1 + floor((@class.unlevel - 7) / 3)", "dr")],
    detail: (level) => `DR ${1 + Math.floor((level - 7) / 3)}/—`,
  },

  // ── Cleric ───────────────────────────────────────────────────────────────

  // Cloistered Cleric's "Breadth of Knowledge" (Advanced Player's Guide p.
  // 22): +1/2 class level (min +1) on all Knowledge skills, usable untrained.
  // Purely additive (traded for Weapon and Armor Proficiency, which the
  // engine doesn't model), same formula/target as the vendored Bardic
  // Knowledge class feature (`skill.knowledge` fans out to every Knowledge
  // subskill — see `compute.ts`'s `SKILL_GROUPS`).
  "cleric:cloistered-cleric:breadth-of-knowledge:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.knowledge")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Knowledge (untrained)`,
  },

  // ── Ranger ───────────────────────────────────────────────────────────────
  // The following six archetypes replace the ranger's Combat Style Feat with
  // a same-schedule bonus-feat progression restricted to a specific style
  // list (archery/mounted/natural-weapon/etc.) — the restriction itself isn't
  // modeled (feat choices aren't gated by style here), but the *count* of
  // bonus feats is identical to the base feature's formula (2nd, 6th, 10th,
  // 14th, 18th), so reusing it is a safe reflavor rather than a guess.

  "ranger:bow-nomad:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:horse-lord:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} mounted combat bonus feat(s)`,
  },
  "ranger:ilsurian-archer:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:shapeshifter:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} natural weapon bonus feat(s)`,
  },
  "ranger:stormwalker:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:toxophilite:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} ranged combat bonus feat(s)`,
  },
};

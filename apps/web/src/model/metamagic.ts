/**
 * Pure metamagic helpers for the tracker (issue #71): which metamagic feats a
 * character owns, and the slot-level / effective-level math for applying them
 * to a spell. The clean-room feat table itself lives in `@pf1/engine`
 * (`METAMAGIC_FEATS`); this module is the thin web-side bridge that intersects
 * it with the character's owned feats and does the per-spell arithmetic the
 * spell panels display.
 *
 * Two levels are computed, and the distinction is the whole point of the
 * honesty bar (see `METAMAGIC_FEATS`'s doc comment):
 *   - SLOT level  = base spell level + Σ every applied feat's increase. This is
 *     the slot the prepared/cast instance actually consumes.
 *   - EFFECTIVE level = base spell level + Σ only `raisesEffectiveLevel` feats'
 *     increase (i.e. Heighten). This drives the save DC / concentration DC;
 *     every other metamagic leaves it — and the DC — unchanged (PF1 RAW).
 */

import { featNameSlug, metamagicDef, type MetamagicDef } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, RefData } from "@pf1/schema";

import { featInstances, grantedFeats } from "./feats.js";

/**
 * The metamagic feats this character owns (primary `build.feats`, repeatable
 * `build.extraFeats`, and class-granted bonus feats), deduped by slug and
 * sorted by name. These are the feats offered as attachable metamagic in the
 * spell panels.
 */
export function ownedMetamagic(doc: CharacterDoc, refData: RefData): MetamagicDef[] {
  const slugs = new Set<string>();
  for (const inst of featInstances(doc)) {
    const name = refData.feats[inst.featId]?.name;
    if (name) slugs.add(featNameSlug(name));
  }
  for (const g of grantedFeats(doc, refData)) {
    slugs.add(featNameSlug(g.featName));
  }
  const defs: MetamagicDef[] = [];
  for (const slug of slugs) {
    const def = metamagicDef(slug);
    if (def) defs.push(def);
  }
  return defs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The slot-level increase contributed by ONE applied metamagic entry: the
 * player-chosen `levels` for a variable feat (falling back to the registry
 * default), else the fixed registry increase. Unknown/removed slugs contribute
 * 0 (soft-degrade, never throw — mirrors the rest of the spell pipeline).
 */
export function appliedMetamagicIncrease(applied: AppliedMetamagic): number {
  const def = metamagicDef(applied.slug);
  if (!def) return 0;
  if (def.variable) return Math.max(1, applied.levels ?? def.slotIncrease);
  return def.slotIncrease;
}

/** Total slot-level increase from every applied metamagic (0 for none). */
export function metamagicSlotIncrease(applied: AppliedMetamagic[] | undefined): number {
  if (!applied || applied.length === 0) return 0;
  return applied.reduce((sum, a) => sum + appliedMetamagicIncrease(a), 0);
}

/**
 * Increase to the spell's EFFECTIVE level (for save DC / concentration): only
 * `raisesEffectiveLevel` feats (Heighten Spell) count. 0 for every other
 * metamagic and for none applied.
 */
export function metamagicEffectiveIncrease(applied: AppliedMetamagic[] | undefined): number {
  if (!applied || applied.length === 0) return 0;
  return applied.reduce((sum, a) => {
    const def = metamagicDef(a.slug);
    return def?.raisesEffectiveLevel ? sum + appliedMetamagicIncrease(a) : sum;
  }, 0);
}

/**
 * Toggle a metamagic feat on a plain `AppliedMetamagic[]` (for TRANSIENT,
 * un-persisted cast-time choices — e.g. a spontaneous caster picking metamagic
 * at the moment of casting). Adds it with a variable feat's default `levels`,
 * or removes it if already present. Returns a new array; a no-op slug (not a
 * modeled metamagic feat) returns the input unchanged. The persisted
 * per-prepared-instance equivalents live in `model/preparedSpells.ts`.
 */
export function toggleMetamagic(applied: AppliedMetamagic[], slug: string): AppliedMetamagic[] {
  const def = metamagicDef(slug);
  if (!def) return applied;
  if (applied.some((m) => m.slug === slug)) return applied.filter((m) => m.slug !== slug);
  return [...applied, def.variable ? { slug, levels: def.slotIncrease } : { slug }];
}

/**
 * Set the chosen level increase of an already-applied VARIABLE metamagic on a
 * plain `AppliedMetamagic[]` (transient cast-time counterpart to
 * `setPreparedMetamagicLevels`). Clamped to ≥ 1; a no-op if the feat isn't
 * applied, isn't variable, or `slug` is unmodeled.
 */
export function setMetamagicLevels(
  applied: AppliedMetamagic[],
  slug: string,
  levels: number,
): AppliedMetamagic[] {
  const def = metamagicDef(slug);
  if (!def?.variable || !applied.some((m) => m.slug === slug)) return applied;
  const clamped = Math.max(1, Math.round(levels));
  return applied.map((m) => (m.slug === slug ? { ...m, levels: clamped } : m));
}

/** One applied metamagic resolved for display: its def, chosen increase, and note. */
export interface ResolvedMetamagic {
  def: MetamagicDef;
  /** Effective level increase this entry contributes. */
  increase: number;
}

/**
 * Resolve each applied metamagic against the registry for display (name +
 * increase + note), dropping any whose slug is no longer a modeled metamagic
 * feat. Sorted by name for stable rendering.
 */
export function resolveAppliedMetamagic(
  applied: AppliedMetamagic[] | undefined,
): ResolvedMetamagic[] {
  if (!applied || applied.length === 0) return [];
  const out: ResolvedMetamagic[] = [];
  for (const a of applied) {
    const def = metamagicDef(a.slug);
    if (!def) continue;
    out.push({ def, increase: appliedMetamagicIncrease(a) });
  }
  return out.sort((a, b) => a.def.name.localeCompare(b.def.name));
}

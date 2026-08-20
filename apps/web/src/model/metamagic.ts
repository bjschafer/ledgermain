/**
 * Pure metamagic helpers for the tracker: which metamagic feats a character
 * owns, and the slot-level / effective-level math for applying them to a
 * spell. The clean-room feat table itself lives in `@pf1/engine`
 * (`METAMAGIC_FEATS`); this module is the thin web-side bridge that intersects
 * it with the character's owned feats and does the per-spell arithmetic the
 * spell panels display.
 *
 * Two levels are computed, and the distinction is the whole point of the
 * honesty bar (see `METAMAGIC_FEATS`'s doc comment):
 *   - SLOT level = base spell level + Σ every applied feat's increase. This is
 *     the slot the prepared/cast instance actually consumes.
 *   - EFFECTIVE level = base spell level + Σ only `raisesEffectiveLevel` feats'
 *     increase (i.e. Heighten). This drives the save DC / concentration DC;
 *     every other metamagic leaves it — and the DC — unchanged (PF1 RAW).
 */

import { featNameSlug, metamagicDef, parentBloodlineTagFor, type MetamagicDef } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, RefData } from "@pf1/schema";

import { featInstances, grantedFeats } from "./feats.js";
import { bloodlineSpellsKnown, mysterySpellsKnown } from "./spellcasting.js";
import { resolveTrait } from "./traits.js";

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

/**
 * Total slot-level increase from every applied metamagic (0 for none).
 * `discount` is the character's always-on metamagic cost reduction for this
 * spell (see {@link metamagicDiscountFor}) — it comes off the SUMMED increase
 * of the whole cast, never per feat, and only when metamagic is actually
 * applied. The result never goes below 0: a discounted spell still occupies
 * at least its own base-level slot.
 */
export function metamagicSlotIncrease(
  applied: AppliedMetamagic[] | undefined,
  discount = 0,
): number {
  if (!applied || applied.length === 0) return 0;
  const raw = applied.reduce((sum, a) => sum + appliedMetamagicIncrease(a), 0);
  return discount > 0 ? Math.max(0, raw - discount) : raw;
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

// ---------------------------------------------------------------------------
// Always-on metamagic cost reducers.
//
// Static, never-spent abilities that make metamagic cheaper on SPECIFIC
// spells, applied here so the spell panels' slot math simply comes out right:
//   - Magical Lineage (trait): "Pick one spell when you choose this trait.
//     When you apply metamagic feats to this spell, treat its actual level as
//     1 lower for determining the spell's final adjusted level."
//   - Wayang Spellhunter (regional trait): "Select a spell of 3rd level or
//     below. When you use the chosen spell with a metamagic feat, it uses up
//     a spell slot one level lower than it normally would."
//   - Seeker Magic (sorcerer/oracle Seeker archetype, level 15): "When a
//     seeker applies a metamagic feat to any bonus spells granted by his
//     mystery or his bloodline, he reduces the metamagic feat's spell level
//     adjustment by 1. ... does not stack with similar reductions from other
//     abilities."
// The two traits are distinct effects with no non-stacking clause (neither is
// a typed "trait bonus" on a roll), so both reduce when both name the same
// spell; Seeker Magic's own text forbids stacking, so it only counts when it
// beats the trait total on its own. The discount reduces the SLOT cost only —
// Heighten's effective-level (DC) bump is driven by the levels the player
// chose, never by the discounted slot.
//
// Out of scope here (per-day / resource-spend / activated free metamagic):
// Metamagic Mastery, arcanist exploits, Meta-Rage, and kin.
// ---------------------------------------------------------------------------

/** A trait whose benefit names ONE chosen spell that casts cheaper under metamagic. */
export interface MetamagicDiscountTraitDef {
  /** Player-facing source label (e.g. "Magical Lineage"). */
  label: string;
  /** Highest spell level the trait may name (Wayang Spellhunter: "3rd level or below"). */
  maxSpellLevel?: number;
}

/**
 * Keyed by normalized trait NAME rather than id so the hand-authored entry,
 * the vendored catalog entry, and a same-named homebrew copy all match (the
 * same cross-catalog recipe as the engine's trait-merge dedup).
 */
const METAMAGIC_DISCOUNT_TRAITS: Readonly<Record<string, MetamagicDiscountTraitDef>> = {
  magicallineage: { label: "Magical Lineage" },
  wayangspellhunter: { label: "Wayang Spellhunter", maxSpellLevel: 3 },
  // The vendored catalog carries the region suffix in the name.
  wayangspellhunterminata: { label: "Wayang Spellhunter", maxSpellLevel: 3 },
};

function normalizeTraitName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * The metamagic-discount declaration for a trait, if it is one — drives both
 * the builder's chosen-spell picker (`TraitRow`) and the discount sources
 * below. The chosen spell id is stored in
 * `build.pickChoices["trait:<traitId>"]`, the same slot every other
 * choose-one trait selection uses.
 */
export function metamagicDiscountTrait(trait: {
  name: string;
}): MetamagicDiscountTraitDef | undefined {
  return METAMAGIC_DISCOUNT_TRAITS[normalizeTraitName(trait.name)];
}

/** One spell the chosen-spell picker offers. */
export interface MetamagicDiscountSpellOption {
  id: string;
  name: string;
  level: number;
}

/** Per-RefData cache: the option list is a sort over the full ~3k-spell catalog. */
const spellOptionCache = new WeakMap<RefData, Map<number, MetamagicDiscountSpellOption[]>>();

/**
 * The full vendored spell catalog as picker options, sorted by name, filtered
 * to `maxSpellLevel` when the trait restricts its pick (a spell's nominal
 * `Spell.level` — per-class variations aren't consulted). The whole catalog is
 * offered, not just known spells, because RAW the trait is chosen at creation,
 * often before the spell is learnable.
 */
export function metamagicDiscountSpellOptions(
  refData: RefData,
  maxSpellLevel?: number,
): MetamagicDiscountSpellOption[] {
  const key = maxSpellLevel ?? -1;
  let byLevel = spellOptionCache.get(refData);
  if (!byLevel) {
    byLevel = new Map();
    spellOptionCache.set(refData, byLevel);
  }
  const cached = byLevel.get(key);
  if (cached) return cached;
  const out: MetamagicDiscountSpellOption[] = [];
  for (const [id, sp] of Object.entries(refData.spells)) {
    if (maxSpellLevel !== undefined && sp.level > maxSpellLevel) continue;
    out.push({ id, name: sp.name, level: sp.level });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  byLevel.set(key, out);
  return out;
}

/** One always-on discount the character has, resolved to the spells it names. */
export interface MetamagicDiscountSource {
  /** Player-facing source label (e.g. "Magical Lineage"). */
  label: string;
  /** Reduction to the summed slot increase (1 for every modeled source today). */
  amount: number;
  /** The spell ids this source applies to. */
  spellIds: ReadonlySet<string>;
  /**
   * Whether this source combines with others. The traits carry no
   * non-stacking clause (distinct untyped effects, not "trait bonuses"), so
   * they stack; Seeker Magic's text says it "does not stack with similar
   * reductions from other abilities".
   */
  stacks: boolean;
}

/**
 * Every always-on metamagic cost reducer this character has, resolved to
 * concrete spell ids. `casterTag` scopes the class-feature sources (Seeker
 * Magic applies only to that class's own bonus spells); trait sources apply
 * regardless of which class casts the chosen spell. A discount trait with no
 * stored spell pick contributes nothing (same no-pick-no-effect posture as
 * every other choice-gated grant). Compute once per panel and look spells up
 * via {@link metamagicDiscountFor}.
 */
export function metamagicDiscountSources(
  doc: CharacterDoc,
  refData: RefData,
  casterTag?: string,
): MetamagicDiscountSource[] {
  const out: MetamagicDiscountSource[] = [];
  for (const traitId of doc.build.traits ?? []) {
    const def = resolveTrait(doc, refData, traitId);
    if (!def) continue;
    const discount = metamagicDiscountTrait(def);
    if (!discount) continue;
    const pick = doc.build.pickChoices?.[`trait:${traitId}`];
    // A stored pick is honored even past the trait's level cap (the picker
    // filters its options; the model stays permissive, as everywhere else).
    if (!pick) continue;
    out.push({ label: discount.label, amount: 1, spellIds: new Set([pick]), stacks: true });
  }
  // Seeker Magic: 15th-level Seeker archetype feature, scoped to the class's
  // own bloodline (sorcerer) / mystery (oracle) bonus spells.
  if (casterTag === "sorcerer" || casterTag === "oracle") {
    const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
    if (classLevel >= 15 && (doc.build.archetypes ?? []).includes(`${casterTag}:seeker`)) {
      const bonusSpells =
        casterTag === "sorcerer"
          ? bloodlineSpellsKnown(
              refData,
              doc.build.sorcererBloodline
                ? parentBloodlineTagFor(doc.build.sorcererBloodline, refData)
                : undefined,
              classLevel,
            )
          : mysterySpellsKnown(refData, doc.build.oracleMystery, classLevel);
      if (bonusSpells.length > 0) {
        out.push({
          label: "Seeker Magic",
          amount: 1,
          spellIds: new Set(bonusSpells.map((sp) => sp.id)),
          stacks: false,
        });
      }
    }
  }
  return out;
}

/** The resolved discount for one spell: total amount plus the labels that apply. */
export interface MetamagicDiscount {
  amount: number;
  labels: string[];
}

/** No-discount constant so rows without one share a stable shape. */
export const NO_METAMAGIC_DISCOUNT: MetamagicDiscount = { amount: 0, labels: [] };

/**
 * Resolve {@link metamagicDiscountSources} for one spell: stacking sources
 * sum; a non-stacking source (Seeker Magic) replaces the total only when it
 * beats it on its own. Feed the `amount` to {@link metamagicSlotIncrease}.
 */
export function metamagicDiscountFor(
  sources: readonly MetamagicDiscountSource[],
  spellId: string,
): MetamagicDiscount {
  let amount = 0;
  let labels: string[] = [];
  for (const s of sources) {
    if (!s.stacks || !s.spellIds.has(spellId)) continue;
    amount += s.amount;
    labels.push(s.label);
  }
  for (const s of sources) {
    if (s.stacks || !s.spellIds.has(spellId) || s.amount <= amount) continue;
    amount = s.amount;
    labels = [s.label];
  }
  if (amount === 0) return NO_METAMAGIC_DISCOUNT;
  return { amount, labels };
}

/**
 * Resource-spend FREE metamagic applications: class abilities that apply a
 * metamagic feat to a spell as it is cast WITHOUT raising the slot consumed,
 * paying a tracked resource instead. The always-on discounts (Magical Lineage
 * and kin) live in `model/metamagic.ts`; this module covers the activated,
 * pay-per-cast abilities, reusing the derived resource-pool machinery
 * (`deriveResourcePools` + `live.resources`) rather than inventing a counter.
 *
 * Modeled sources:
 *   - Wizard (universalist) Metamagic Mastery (CRB): apply ONE known metamagic
 *     feat to a spell about to be cast; the spell's level and casting time are
 *     unchanged. Costs 1 daily use, plus 1 more per level above 1 the feat
 *     would add. The modified level may not exceed the highest spell level the
 *     wizard can cast.
 *   - Bloodrager (Metamagic Rager) Meta-Rage (ACG): apply ONE known metamagic
 *     feat to a bloodrager spell for rounds of bloodrage equal to twice the
 *     spell's would-be adjusted level (minimum 2). The slot stays the base
 *     level, but the casting time still increases as normal for metamagic.
 *
 * Slot honesty stays intact: only the SLOT cost is waived. Heighten's
 * effective-level (DC) bump is driven by the player-chosen levels exactly as
 * in the paid path (`metamagicEffectiveIncrease`), and every other feat's DC
 * stays at the base level.
 *
 * No interplay with the static discounts: a free application ignores Magical
 * Lineage entirely. The trait lowers "the spell's final adjusted level" for
 * slot purposes; when no higher slot is consumed there is nothing for it to
 * adjust, and reading it to shrink a separate resource price (daily uses,
 * bloodrage rounds) goes beyond its text. Costs here are computed from the
 * raw registry increases.
 */

import type { DerivedResourcePool } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, RefData } from "@pf1/schema";

import { appliedMetamagicIncrease } from "./metamagic.js";
import { drainResource, syncDerivedPools } from "./resources.js";

/** One resolved free-metamagic ability the character has, bound to its pool. */
export interface FreeMetamagicSource {
  /** Stable id for UI state keys. */
  id: string;
  /** Player-facing ability name (e.g. "Metamagic Mastery"). */
  label: string;
  /** The backing derived pool (its `id` keys `live.resources`). */
  pool: DerivedResourcePool;
  /** Pool unit word for messages: "use" / "round". */
  unit: string;
  /**
   * Whether the ability caps the MODIFIED spell level at the caster's highest
   * castable level (universalist Metamagic Mastery's own clause). Meta-Rage
   * carries no such clause and stays permissive.
   */
  capsAtMaxSlot: boolean;
  /** Pool units one cast costs, for a single feat adding `increase` levels to a base-`baseLevel` spell. */
  costFor(baseLevel: number, increase: number): number;
  /** At-table reminder of what the ability does NOT waive. Display-only. */
  note: string;
}

/** The feature tag whose derived pool backs each modeled source. */
const METAMAGIC_MASTERY_TAG = "metamagicMastery";
const BLOODRAGE_TAG = "bloodrage";

function poolByFeatureTag(
  refData: RefData,
  derived: readonly DerivedResourcePool[],
  tag: string,
  classTag: string,
): DerivedResourcePool | undefined {
  return derived.find((p) => p.classTag === classTag && refData.classFeatures[p.id]?.tag === tag);
}

/**
 * The free-metamagic sources available to `casterTag`'s spell panel. At most
 * one per modeled class today. `derived` is the engine's pool list
 * (`deriveResourcePools`) — a source only exists while its backing pool
 * derives, which already encodes the granting feature's own level gate
 * (Metamagic Mastery's formula is 0 below wizard 8) and, for the wizard, the
 * Universalist school choice (specialists are never granted the feature).
 */
export function freeMetamagicSources(
  doc: CharacterDoc,
  refData: RefData,
  casterTag: string,
  derived: readonly DerivedResourcePool[],
): FreeMetamagicSource[] {
  const out: FreeMetamagicSource[] = [];
  if (casterTag === "wizard") {
    const pool = poolByFeatureTag(refData, derived, METAMAGIC_MASTERY_TAG, "wizard");
    if (pool) {
      out.push({
        id: "metamagic-mastery",
        label: "Metamagic Mastery",
        pool,
        unit: "use",
        capsAtMaxSlot: true,
        // CRB: one daily use, plus one more per level above 1 the feat adds.
        costFor: (_baseLevel, increase) => Math.max(1, increase),
        note: "Apply one metamagic feat you know to a spell as you cast it, at no change to its level or casting time. Costs 1 use, plus 1 more for each slot level above 1 the feat would add.",
      });
    }
  }
  if (casterTag === "bloodrager") {
    const classLevel = doc.identity.classes.find((c) => c.tag === "bloodrager")?.level ?? 0;
    const hasArchetype = (doc.build.archetypes ?? []).includes("bloodrager:metamagic-rager");
    if (classLevel >= 5 && hasArchetype) {
      const pool = poolByFeatureTag(refData, derived, BLOODRAGE_TAG, "bloodrager");
      if (pool) {
        out.push({
          id: "meta-rage",
          label: "Meta-Rage",
          pool,
          unit: "round",
          capsAtMaxSlot: false,
          // ACG: rounds equal to twice the spell's would-be adjusted level, min 2.
          costFor: (baseLevel, increase) => Math.max(2, 2 * (baseLevel + increase)),
          note: "Apply one metamagic feat you know to a bloodrager spell without raising the slot it spends. The casting time still increases as normal. Costs bloodrage rounds equal to twice the spell's adjusted level, minimum 2.",
        });
      }
    }
  }
  return out;
}

/** Remaining units in a source's pool (derived max, live used). */
export function freeMetamagicRemaining(doc: CharacterDoc, source: FreeMetamagicSource): number {
  const used = doc.live.resources[source.pool.id]?.used ?? 0;
  return Math.max(0, source.pool.max - used);
}

/**
 * One spell row's free-application state, resolved for the UI. `armed` is the
 * player's transient "cast this one free" toggle; `engaged` is armed AND
 * currently valid, and is the only flag that changes any number: the cast's
 * slot increase becomes 0 and the pool is spent on the cast click.
 */
export interface FreeMetamagicOffer {
  source: FreeMetamagicSource;
  /** Remaining pool units right now. */
  remaining: number;
  /** Player toggle state, echoed back for the control. */
  armed: boolean;
  /** Cost of the current selection; null until exactly one feat is applied. */
  cost: number | null;
  /** Why the free application cannot take effect (independent of `armed`). */
  blocked?: string;
  /** Armed and valid: zero the slot increase, spend the pool on cast. */
  engaged: boolean;
}

/**
 * Resolve a row's offer. Arming with no feat applied is allowed (it relaxes
 * the chip cap so the player can pick a feat the paid path couldn't afford)
 * but engages nothing until exactly one metamagic feat is applied — both
 * modeled abilities apply "any ONE metamagic feat".
 */
export function freeMetamagicOffer(opts: {
  doc: CharacterDoc;
  source: FreeMetamagicSource;
  baseLevel: number;
  applied: readonly AppliedMetamagic[];
  maxSlotLevel: number;
  armed: boolean;
}): FreeMetamagicOffer {
  const { doc, source, baseLevel, applied, maxSlotLevel, armed } = opts;
  const remaining = freeMetamagicRemaining(doc, source);
  let cost: number | null = null;
  let blocked: string | undefined;
  if (applied.length > 1) {
    blocked = `${source.label} applies a single metamagic feat per cast.`;
  } else if (applied.length === 1) {
    const increase = appliedMetamagicIncrease(applied[0]!);
    cost = source.costFor(baseLevel, increase);
    if (source.capsAtMaxSlot && baseLevel + increase > maxSlotLevel) {
      blocked = `The modified spell would be level ${baseLevel + increase}, above your highest castable level (${maxSlotLevel}).`;
    } else if (cost > remaining) {
      blocked = `Needs ${cost} ${pluralUnit(source, cost)}, only ${remaining} left.`;
    }
  }
  const engaged = armed && applied.length === 1 && blocked === undefined;
  return { source, remaining, armed, cost, blocked, engaged };
}

/** "use" / "uses" / "round" / "rounds" for a count. */
export function pluralUnit(source: FreeMetamagicSource, n: number): string {
  return n === 1 ? source.unit : `${source.unit}s`;
}

/**
 * The cast's slot-level increase with a possible free application: 0 when the
 * offer is engaged (the whole point), otherwise the ordinary discounted sum
 * from `metamagicSlotIncrease` computed by the caller. Kept as a helper so
 * the "free beats the discount, no double-dip" rule has one home.
 */
export function slotIncreaseWithFree(
  paidIncrease: number,
  offer: FreeMetamagicOffer | undefined,
): number {
  return offer?.engaged ? 0 : paidIncrease;
}

/**
 * Spend an engaged offer's cost from its pool — call this on the same doc
 * transition as the cast/expend click, never at preparation time (both
 * abilities apply to a spell "as it is cast"). A non-engaged offer is a no-op.
 */
export function spendFreeMetamagic(
  doc: CharacterDoc,
  derived: readonly DerivedResourcePool[],
  offer: FreeMetamagicOffer | undefined,
): CharacterDoc {
  if (!offer?.engaged || offer.cost === null) return doc;
  return drainResource(
    syncDerivedPools(doc, derived as DerivedResourcePool[]),
    offer.source.pool.id,
    offer.cost,
  );
}

/** Toast line for a cast that spent an engaged offer, or null for a plain cast. */
export function freeMetamagicSpendMessage(offer: FreeMetamagicOffer | undefined): string | null {
  if (!offer?.engaged || offer.cost === null) return null;
  // Name the ability only when it differs from the pool it draws on
  // (Meta-Rage spends Bloodrage; Metamagic Mastery spends its own uses).
  const via = offer.source.pool.name === offer.source.label ? "" : ` (${offer.source.label})`;
  return `Spent ${offer.cost} ${pluralUnit(offer.source, offer.cost)} of ${offer.source.pool.name}${via}`;
}

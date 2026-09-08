/**
 * FREE metamagic applications: class abilities that apply a metamagic feat to
 * a spell as it is cast WITHOUT raising the slot consumed. The always-on
 * discounts (Magical Lineage and kin) live in `model/metamagic.ts`; this
 * module covers everything that waives a feat's slot cost outright, in two
 * shapes.
 *
 * RESOURCE-SPEND sources ({@link FreeMetamagicSource}) pay a tracked pool per
 * cast, reusing the derived resource-pool machinery (`deriveResourcePools` +
 * `live.resources`) rather than inventing a counter:
 *   - Wizard (universalist) Metamagic Mastery (CRB): apply ONE known metamagic
 *     feat to a spell about to be cast; the spell's level and casting time are
 *     unchanged. Costs 1 daily use, plus 1 more per level above 1 the feat
 *     would add. The modified level may not exceed the highest spell level the
 *     wizard can cast.
 *   - Bloodrager (Metamagic Rager) Meta-Rage (ACG): apply ONE known metamagic
 *     feat to a bloodrager spell for rounds of bloodrage equal to twice the
 *     spell's would-be adjusted level (minimum 2). The slot stays the base
 *     level, but the casting time still increases as normal for metamagic.
 *   - Psychic Mimic Metamagic (OA, major phrenic amplification): apply one of
 *     TWO feats named when the amplification is taken (owned or not) for
 *     phrenic pool points equal to twice the levels the feat would add,
 *     minimum 2, and only when the psychic could have applied the feat in a
 *     real slot.
 *   - The named-feat, once-a-day grants in the engine's
 *     `FREE_METAMAGIC_GRANTS` (magus metamagic arcana, Guiding Star), each
 *     backed by a one-use daily pool derived from the selection itself.
 *
 * PERMANENT applications have no pool at all: the theologian cleric's Domain
 * Secret picks one domain spell and one of nine named metamagic feats, and
 * that spell is modified from then on. Modeled as a per-spell waiver
 * ({@link domainSecretWaivers}) plus a seed onto each newly prepared instance
 * ({@link domainSecretMetamagicFor}), so the feat shows on the row and its
 * levels never reach the slot math.
 *
 * Slot honesty stays intact throughout: only the SLOT cost is waived.
 * Heighten's effective-level (DC) bump is driven by the player-chosen levels
 * exactly as in the paid path (`metamagicEffectiveIncrease`), and every other
 * feat's DC stays at the base level.
 *
 * No interplay with the static discounts for a waived feat: a free
 * application ignores Magical Lineage entirely. The trait lowers "the spell's
 * final adjusted level" for slot purposes; when no higher slot is consumed
 * there is nothing for it to adjust, and reading it to shrink a separate
 * resource price (daily uses, bloodrage rounds) goes beyond its text. Costs
 * here are computed from the raw registry increases. Feats the free
 * application does NOT cover still pay their discounted increase as usual.
 */

import {
  characterFreeMetamagicGrants,
  freeMetamagicGrantPoolId,
  metamagicDef,
  type DerivedResourcePool,
  type MetamagicDef,
} from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc, RefData } from "@pf1/schema";

import { appliedMetamagicIncrease, metamagicSlotIncrease } from "./metamagic.js";
import { drainResource, syncDerivedPools } from "./resources.js";

/** One resolved free-metamagic ability the character has, bound to its pool. */
export interface FreeMetamagicSource {
  /** Stable id for UI state keys. */
  id: string;
  /** Player-facing ability name (e.g. "Metamagic Mastery"). */
  label: string;
  /** The backing derived pool (its `id` keys `live.resources`). */
  pool: DerivedResourcePool;
  /** Pool unit word for messages: "use" / "round" / "point". */
  unit: string;
  /**
   * Whether the ability caps the MODIFIED spell level at the caster's highest
   * castable level (universalist Metamagic Mastery's own clause, and Mimic
   * Metamagic's "only if the spellcaster can cast spells of a high enough
   * level"). Meta-Rage and the named-feat grants carry no such clause and
   * stay permissive.
   */
  capsAtMaxSlot: boolean;
  /** Pool units one cast costs, for a single feat adding `increase` levels to a base-`baseLevel` spell. */
  costFor(baseLevel: number, increase: number): number;
  /**
   * The metamagic slugs this source may waive, when the ability NAMES its
   * feats (the caster need not own them). Undefined means "any one metamagic
   * feat you know", which is also the only shape that forbids applying a
   * second feat alongside it.
   */
  featSlugs?: ReadonlySet<string>;
  /** At-table reminder of what the ability does NOT waive. Display-only. */
  note: string;
}

/** The feature tag whose derived pool backs each modeled source. */
const METAMAGIC_MASTERY_TAG = "metamagicMastery";
const BLOODRAGE_TAG = "bloodrage";
const PHRENIC_POOL_TAG = "phrenicPool";

function poolByFeatureTag(
  refData: RefData,
  derived: readonly DerivedResourcePool[],
  tag: string,
  classTag: string,
): DerivedResourcePool | undefined {
  return derived.find((p) => p.classTag === classTag && refData.classFeatures[p.id]?.tag === tag);
}

/**
 * The free-metamagic sources available to `casterTag`'s spell panel. `derived`
 * is the engine's pool list (`deriveResourcePools`) — a source only exists
 * while its backing pool derives, which already encodes the granting feature's
 * own level gate (Metamagic Mastery's formula is 0 below wizard 8) and, for
 * the wizard, the Universalist school choice (specialists are never granted
 * the feature). A magus may have several at once (one per metamagic arcana),
 * so callers take the whole list, not its head.
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
  if (casterTag === "psychic" && hasMimicMetamagic(doc)) {
    const pool = poolByFeatureTag(refData, derived, PHRENIC_POOL_TAG, "psychic");
    const slugs = mimicMetamagicFeatSlugs(doc).filter((s) => s !== undefined);
    if (pool && slugs.length > 0) {
      out.push({
        id: "mimic-metamagic",
        label: "Mimic Metamagic",
        pool,
        unit: "point",
        capsAtMaxSlot: true,
        // OA: "double the number of levels by which the feat normally
        // increases a spell's level (minimum 2 points)".
        costFor: (_baseLevel, increase) => Math.max(2, 2 * increase),
        featSlugs: new Set(slugs),
        note: `Apply ${slugs.map((s) => metamagicDef(s)?.name ?? s).join(" or ")} to this spell without raising its level or casting time, for 2 phrenic pool points per level the feat would have added (minimum 2).`,
      });
    }
  }
  for (const grant of characterFreeMetamagicGrants(doc)) {
    if (grant.classTag !== casterTag) continue;
    const poolId = freeMetamagicGrantPoolId(grant);
    const pool = derived.find((p) => p.id === poolId);
    if (!pool) continue;
    out.push({
      id: poolId,
      label: grant.label,
      pool,
      unit: "use",
      capsAtMaxSlot: false,
      // Every grant is a flat once-a-day application, whatever the feat adds.
      costFor: () => 1,
      featSlugs: new Set(grant.featSlugs),
      note: grant.note,
    });
  }
  return out;
}

/** Remaining units in a source's pool (derived max, live used). */
export function freeMetamagicRemaining(doc: CharacterDoc, source: FreeMetamagicSource): number {
  const used = doc.live.resources[source.pool.id]?.used ?? 0;
  return Math.max(0, source.pool.max - used);
}

/**
 * One spell row's free-application state for a single source, resolved for the
 * UI. `armed` is the player's transient "cast this one free" toggle;
 * `engaged` is armed AND currently valid, and is the only flag that changes
 * any number: the covered feat's slot increase drops out of the cast and the
 * pool is spent on the cast click.
 */
export interface FreeMetamagicOffer {
  source: FreeMetamagicSource;
  /** Remaining pool units right now. */
  remaining: number;
  /** Player toggle state, echoed back for the control. */
  armed: boolean;
  /** Cost of the current selection; null until exactly one covered feat is applied. */
  cost: number | null;
  /** Why the free application cannot take effect (independent of `armed`). */
  blocked?: string;
  /** Armed and valid: waive `waived`'s slot increase, spend the pool on cast. */
  engaged: boolean;
  /** The applied slug this offer waives when engaged; empty otherwise. */
  waived: readonly string[];
}

/**
 * Resolve a row's offer against one source. Arming with no covered feat
 * applied is allowed (it relaxes the chip cap so the player can pick a feat
 * the paid path couldn't afford) but engages nothing until exactly one is —
 * every modeled ability applies "any ONE metamagic feat".
 *
 * `alreadyWaived` are slugs an earlier engaged offer on the same row already
 * covers, so two sources never both charge for the same feat.
 */
export function freeMetamagicOffer(opts: {
  doc: CharacterDoc;
  source: FreeMetamagicSource;
  baseLevel: number;
  applied: readonly AppliedMetamagic[];
  maxSlotLevel: number;
  armed: boolean;
  alreadyWaived?: ReadonlySet<string>;
}): FreeMetamagicOffer {
  const { doc, source, baseLevel, applied, maxSlotLevel, armed, alreadyWaived } = opts;
  const remaining = freeMetamagicRemaining(doc, source);
  const slugs = source.featSlugs;
  // A named-feat source only ever looks at the feats it names; an
  // "any feat you know" source looks at the whole cast, which is what makes a
  // second applied feat block it.
  const covered = applied.filter(
    (a) => (slugs === undefined || slugs.has(a.slug)) && !alreadyWaived?.has(a.slug),
  );
  let cost: number | null = null;
  let blocked: string | undefined;
  let waived: string[] = [];
  if (covered.length > 1) {
    blocked = `${source.label} applies a single metamagic feat per cast.`;
  } else if (covered.length === 1) {
    const entry = covered[0]!;
    const increase = appliedMetamagicIncrease(entry);
    cost = source.costFor(baseLevel, increase);
    if (source.capsAtMaxSlot && baseLevel + increase > maxSlotLevel) {
      blocked = `The modified spell would be level ${baseLevel + increase}, above your highest castable level (${maxSlotLevel}).`;
    } else if (cost > remaining) {
      blocked = `Needs ${cost} ${pluralUnit(source, cost)}, only ${remaining} left.`;
    } else {
      waived = [entry.slug];
    }
  }
  const engaged = armed && waived.length === 1 && blocked === undefined;
  return {
    source,
    remaining,
    armed,
    cost,
    blocked,
    engaged,
    waived: engaged ? waived : [],
  };
}

/** Every source's offer for one row, plus the slugs the engaged ones waive. */
export interface FreeMetamagicPlan {
  offers: FreeMetamagicOffer[];
  /** Slugs whose slot increase drops out of the cast (engaged offers + Domain Secret). */
  waived: ReadonlySet<string>;
}

/** An empty plan, so a row with no free applications shares one stable shape. */
export const NO_FREE_METAMAGIC: FreeMetamagicPlan = { offers: [], waived: new Set() };

/**
 * Resolve every source for one row in order, threading each engaged offer's
 * waiver into the next so two abilities never pay for the same feat.
 * `permanentlyWaived` seeds the set with the spell's Domain Secret feats,
 * which cost nothing and are never armed.
 */
export function freeMetamagicPlan(opts: {
  doc: CharacterDoc;
  sources: readonly FreeMetamagicSource[];
  baseLevel: number;
  applied: readonly AppliedMetamagic[];
  maxSlotLevel: number;
  armedIds: ReadonlySet<string>;
  permanentlyWaived?: ReadonlySet<string>;
}): FreeMetamagicPlan {
  const { doc, sources, baseLevel, applied, maxSlotLevel, armedIds, permanentlyWaived } = opts;
  const waived = new Set<string>(permanentlyWaived ?? []);
  const offers: FreeMetamagicOffer[] = [];
  for (const source of sources) {
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel,
      applied,
      maxSlotLevel,
      armed: armedIds.has(source.id),
      alreadyWaived: waived,
    });
    for (const slug of offer.waived) waived.add(slug);
    offers.push(offer);
  }
  return { offers, waived };
}

/** "use" / "uses" / "round" / "rounds" for a count. */
export function pluralUnit(source: FreeMetamagicSource, n: number): string {
  return n === 1 ? source.unit : `${source.unit}s`;
}

/**
 * The cast's slot-level increase once the plan's waivers are taken out: the
 * ordinary discounted sum over the feats nobody is covering. A cast whose only
 * feat is waived comes to 0, which is the whole point; a cast that stacks a
 * paid feat on top of a waived one still pays (and still discounts) that one.
 */
export function paidMetamagicSlotIncrease(
  applied: AppliedMetamagic[] | undefined,
  discount: number,
  plan: FreeMetamagicPlan | undefined,
): number {
  const waived = plan?.waived;
  if (!waived || waived.size === 0) return metamagicSlotIncrease(applied, discount);
  return metamagicSlotIncrease(
    (applied ?? []).filter((a) => !waived.has(a.slug)),
    discount,
  );
}

/**
 * Spend every engaged offer's cost from its pool — call this on the same doc
 * transition as the cast/expend click, never at preparation time (every
 * modeled ability applies to a spell "as it is cast"). A plan with nothing
 * engaged is a no-op.
 */
export function spendFreeMetamagic(
  doc: CharacterDoc,
  derived: readonly DerivedResourcePool[],
  plan: FreeMetamagicPlan | undefined,
): CharacterDoc {
  const engaged = (plan?.offers ?? []).filter((o) => o.engaged && o.cost !== null);
  if (engaged.length === 0) return doc;
  let out = syncDerivedPools(doc, derived as DerivedResourcePool[]);
  for (const offer of engaged) out = drainResource(out, offer.source.pool.id, offer.cost!);
  return out;
}

/** Toast line for a cast that spent an engaged offer, or null for a plain cast. */
export function freeMetamagicSpendMessage(plan: FreeMetamagicPlan | undefined): string | null {
  const parts = (plan?.offers ?? [])
    .filter((o) => o.engaged && o.cost !== null)
    .map((o) => {
      // Name the ability only when it differs from the pool it draws on
      // (Meta-Rage spends Bloodrage; Metamagic Mastery spends its own uses).
      const via = o.source.pool.name === o.source.label ? "" : ` (${o.source.label})`;
      return `${o.cost} ${pluralUnit(o.source, o.cost!)} of ${o.source.pool.name}${via}`;
    });
  return parts.length === 0 ? null : `Spent ${parts.join(" and ")}`;
}

/**
 * The metamagic feats a row may attach that the character does not own,
 * because a free-application source names them. Keyed by slug so the panel can
 * mark the chip and disable it while nothing would pay for it.
 */
export function grantedMetamagicSlugs(
  sources: readonly FreeMetamagicSource[],
): Map<string, FreeMetamagicSource> {
  const out = new Map<string, FreeMetamagicSource>();
  for (const source of sources) {
    for (const slug of source.featSlugs ?? []) {
      if (!out.has(slug)) out.set(slug, source);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Psychic Mimic Metamagic — the two feats named when the amplification is taken.
// ---------------------------------------------------------------------------

/** The `build.psychicAmplifications` id of the amplification (see `PHRENIC_AMPLIFICATIONS`). */
export const MIMIC_METAMAGIC_ID = "mimicMetamagic";

/** `pickChoices` key for one of Mimic Metamagic's two named feats (`slot` is 1 or 2). */
function mimicKey(slot: 1 | 2): string {
  return `psychicAmplification:${MIMIC_METAMAGIC_ID}:feat${slot}`;
}

export function hasMimicMetamagic(doc: CharacterDoc): boolean {
  return (doc.build.psychicAmplifications ?? []).includes(MIMIC_METAMAGIC_ID);
}

/** The two chosen slugs, `undefined` in a slot that has not been picked yet. */
export function mimicMetamagicFeatSlugs(doc: CharacterDoc): (string | undefined)[] {
  const picks = doc.build.pickChoices ?? {};
  return [picks[mimicKey(1)] || undefined, picks[mimicKey(2)] || undefined];
}

/** Store (or clear) one of the two named feats. */
export function setMimicMetamagicFeat(
  doc: CharacterDoc,
  slot: 1 | 2,
  slug: string | undefined,
): CharacterDoc {
  return withPickChoice(doc, mimicKey(slot), slug);
}

// ---------------------------------------------------------------------------
// Theologian Domain Secret — permanently modified domain spells.
//
// "At 5th level, the theologian chooses one domain spell. That spell becomes
// permanently modified with one of the following metamagic feats... This
// metamagic feat does not increase the level of the spell... The domain
// specialist need not have the metamagic feat to apply it. At every 5 levels
// after 5th, the domain specialist may choose an additional domain spell to
// modify in this way. She cannot modify the same spell more than once."
// ---------------------------------------------------------------------------

/** The archetype id whose 5th-level feature grants Domain Secret. */
export const THEOLOGIAN_ARCHETYPE_ID = "cleric:theologian";

/** The nine feats Domain Secret may name, in the order the ability lists them. */
export const DOMAIN_SECRET_FEAT_SLUGS: readonly string[] = [
  "bouncing-spell",
  "disruptive-spell",
  "ectoplasmic-spell",
  "enlarge-spell",
  "extend-spell",
  "focused-spell",
  "intensified-spell",
  "silent-spell",
  "still-spell",
];

/**
 * How many domain spells this character may have modified: one at cleric 5,
 * one more every 5 levels after (4 by 20th). 0 without the theologian
 * archetype or below 5th.
 */
export function domainSecretSlotCount(doc: CharacterDoc): number {
  if (!(doc.build.archetypes ?? []).includes(THEOLOGIAN_ARCHETYPE_ID)) return 0;
  const level = doc.identity.classes.find((c) => c.tag === "cleric")?.level ?? 0;
  if (level < 5) return 0;
  return Math.floor(level / 5);
}

/** One Domain Secret slot's stored pick; either half may still be unset. */
export interface DomainSecretPick {
  /** 1-based slot index — the 5th-, 10th-, 15th- and 20th-level picks. */
  slot: number;
  spellId?: string;
  slug?: string;
}

function domainSecretKey(slot: number, part: "spell" | "feat"): string {
  return `domainSecret:${slot}:${part}`;
}

/** Every slot the character has, with whatever is stored in it. */
export function domainSecretPicks(doc: CharacterDoc): DomainSecretPick[] {
  const picks = doc.build.pickChoices ?? {};
  return Array.from({ length: domainSecretSlotCount(doc) }, (_, i) => ({
    slot: i + 1,
    spellId: picks[domainSecretKey(i + 1, "spell")] || undefined,
    slug: picks[domainSecretKey(i + 1, "feat")] || undefined,
  }));
}

export function setDomainSecretSpell(
  doc: CharacterDoc,
  slot: number,
  spellId: string | undefined,
): CharacterDoc {
  return withPickChoice(doc, domainSecretKey(slot, "spell"), spellId);
}

export function setDomainSecretFeat(
  doc: CharacterDoc,
  slot: number,
  slug: string | undefined,
): CharacterDoc {
  return withPickChoice(doc, domainSecretKey(slot, "feat"), slug);
}

/**
 * spellId -> the feats permanently applied to it, from the completed picks. A
 * half-filled slot contributes nothing, the same no-pick-no-effect posture
 * every other choice-gated grant takes.
 */
export function domainSecretWaivers(doc: CharacterDoc): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const pick of domainSecretPicks(doc)) {
    if (!pick.spellId || !pick.slug || !metamagicDef(pick.slug)) continue;
    (out.get(pick.spellId) ?? out.set(pick.spellId, new Set()).get(pick.spellId)!).add(pick.slug);
  }
  return out;
}

/**
 * The metamagic to seed onto a NEWLY prepared instance of `spellId` — the
 * spell is "permanently modified", so it arrives that way rather than waiting
 * for the player to attach the feat by hand. `undefined` for every spell with
 * no Domain Secret pick, so the ordinary prepare path is untouched.
 */
export function domainSecretMetamagicFor(
  doc: CharacterDoc,
  spellId: string,
): AppliedMetamagic[] | undefined {
  const slugs = domainSecretWaivers(doc).get(spellId);
  if (!slugs || slugs.size === 0) return undefined;
  return [...slugs].map((slug) => {
    const def = metamagicDef(slug);
    return def?.variable ? { slug, levels: def.slotIncrease } : { slug };
  });
}

/** The `MetamagicDef`s Domain Secret makes attachable on `spellId`, owned or not. */
export function domainSecretDefsFor(doc: CharacterDoc, spellId: string): MetamagicDef[] {
  const defs: MetamagicDef[] = [];
  for (const slug of domainSecretWaivers(doc).get(spellId) ?? []) {
    const def = metamagicDef(slug);
    if (def) defs.push(def);
  }
  return defs;
}

/** Set or clear one `build.pickChoices` entry, dropping the key when cleared. */
function withPickChoice(doc: CharacterDoc, key: string, value: string | undefined): CharacterDoc {
  const current = doc.build.pickChoices ?? {};
  if (!value) {
    if (!(key in current)) return doc;
    const { [key]: _dropped, ...rest } = current;
    return { ...doc, build: { ...doc.build, pickChoices: rest } };
  }
  return { ...doc, build: { ...doc.build, pickChoices: { ...current, [key]: value } } };
}

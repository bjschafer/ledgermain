/**
 * The controls a single prepared/known spell row carries, shared by all three
 * caster views: the metamagic attach/detach popover (and the free-application
 * accounting behind it), the buff toggle, and the spontaneous-conversion menu.
 *
 * These live together because they are the parts the three views actually have
 * in common. The views themselves diverge almost completely below the row.
 */

import { useMemo } from "react";

import { metamagicDef, type MetamagicDef } from "@pf1/engine";
import type { AppliedMetamagic, Buff, CharacterDoc, RefData, Spell } from "@pf1/schema";

import { addBuff, makeActiveBuff, removeBuff, suggestRounds } from "../../../model/buffs.js";
import {
  castPreparedAsConversion,
  spontaneousConversionOptions,
} from "../../../model/preparedSpells.js";
import {
  type FreeMetamagicPlan,
  type FreeMetamagicSource,
  NO_FREE_METAMAGIC,
  pluralUnit,
} from "../../../model/freeMetamagic.js";
import {
  appliedMetamagicIncrease,
  type MetamagicDiscount,
  metamagicSlotIncrease,
  NO_METAMAGIC_DISCOUNT,
} from "../../../model/metamagic.js";
import { buffsForSpell } from "../../../model/spellBuffs.js";
import { showToast } from "../../../state/toast.js";
import type { BuilderProps } from "../../builder/types.js";
import { TipButton } from "../../InfoTip.js";

export interface PreparedRow {
  /** Index into `doc.live.spells.prepared` (stable within this render). */
  index: number;
  spellId: string;
  name: string;
  expended: boolean;
  /**
   * Normal-slot cost of this instance: 1 normally, 2 when the spell is one of
   * the wizard's chosen opposition schools (see `oppositionCost`). 1 for every
   * non-wizard caster (no `wizardOppositionSchools` set).
   */
  cost: number;
  /** The spell's own (base) level, before any metamagic slot bump. */
  baseLevel: number;
  /** Metamagic applied to this instance; empty for an unmodified spell. */
  metamagic: AppliedMetamagic[];
  /** Always-on metamagic cost discount for this spell (see `metamagicDiscountFor`). */
  discount: MetamagicDiscount;
  /** Free-application state for this instance (see `model/freeMetamagic.ts`). */
  freePlan: FreeMetamagicPlan;
  /** Metamagic Domain Secret permanently applies to this spell, attachable even unowned. */
  permanentDefs: MetamagicDef[];
}

// ---------------------------------------------------------------------------
// Metamagic attach control.
// ---------------------------------------------------------------------------

/**
 * Cast-button tooltip naming what an engaged free application also spends.
 * `fallback` is the title when nothing is engaged (the ordinary paid wording,
 * which differs between the two panels); `slotClause` is the slot the click
 * itself costs, for the spontaneous panel (a prepared row's slot was already
 * spent at preparation time).
 */
export function freeMetamagicCastTitle(
  spellName: string,
  plan: FreeMetamagicPlan,
  fallback: string | undefined,
  slotClause?: string,
): string | undefined {
  const engaged = plan.offers.filter((o) => o.engaged && o.cost !== null);
  if (engaged.length === 0) return fallback;
  const spends = engaged.map((o) => `${o.cost} ${pluralUnit(o.source, o.cost!)}`);
  return `Cast ${spellName} with metamagic via ${engaged
    .map((o) => o.source.label)
    .join(" and ")} (spend ${[...(slotClause ? [slotClause] : []), ...spends].join(" and ")})`;
}

/** No free-application source names extra feats on this panel (the arcanist's Metamixing waives no slot). */
export const NO_GRANTED_METAMAGIC: ReadonlyMap<string, FreeMetamagicSource> = new Map();

/** One attachable metamagic chip on a spell row. */
export interface MetamagicChip {
  def: MetamagicDef;
  /**
   * Set when the character does NOT own the feat and only a free-application
   * source names it (a magus arcana, Guiding Star, Mimic Metamagic). Such a
   * chip can only be attached while that source is armed — there is no paid
   * path for a feat you don't have.
   */
  grantedBy?: FreeMetamagicSource;
  /** Domain Secret's permanent application: always attachable, always free. */
  permanent?: boolean;
}

/**
 * The chip list for one spell row: the owned metamagic feats, plus any a free
 * source names that the character doesn't own, plus the spell's own Domain
 * Secret feats. Deduped by slug (an owned feat that a source also names stays
 * a plain chip) and sorted by name.
 */
export function metamagicChips(
  owned: MetamagicDef[],
  granted: ReadonlyMap<string, FreeMetamagicSource>,
  permanent: MetamagicDef[],
): MetamagicChip[] {
  const bySlug = new Map<string, MetamagicChip>();
  for (const def of owned) bySlug.set(def.slug, { def });
  for (const [slug, source] of granted) {
    if (bySlug.has(slug)) continue;
    const def = metamagicDef(slug);
    if (def) bySlug.set(slug, { def, grantedBy: source });
  }
  for (const def of permanent) bySlug.set(def.slug, { def, permanent: true });
  return [...bySlug.values()].sort((a, b) => a.def.name.localeCompare(b.def.name));
}

/**
 * The per-prepared-instance metamagic picker: a collapsible chip list of the
 * attachable metamagic feats, each toggling on/off for this instance. Variable
 * feats (Reach/Heighten) expose a small level selector when active. A feat is
 * disabled when applying it (or raising a variable feat's level) would push
 * the spell's slot level past `maxSlotLevel` (the caster's highest slot). Only
 * rendered when at least one feat is attachable.
 *
 * `discount` is the spell's always-on metamagic cost reduction (Magical
 * Lineage and kin, see `metamagicDiscountFor`): it comes off the summed
 * increase (never below 0) in every slot computation here, and is surfaced as
 * a note line so the cheaper cost is visible rather than silently different.
 *
 * `plan` is the row's free-application state (see `model/freeMetamagic.ts`):
 * one "Free via <ability>" chip per source the caster has. While a source is
 * armed, the feats it covers are re-gated by the ability's own constraint
 * instead of the paid slot math (the paid cap can be stricter than the ability
 * allows, e.g. Meta-Rage empowering a spell the bloodrager has no higher slot
 * for) and ignore `discount` (no double-dip: with no higher slot consumed
 * there is nothing for the trait to reduce). Domain Secret's permanent feats
 * are free with nothing to arm.
 */
export function MetamagicControl({
  chips,
  applied,
  baseLevel,
  maxSlotLevel,
  discount = NO_METAMAGIC_DISCOUNT,
  plan = NO_FREE_METAMAGIC,
  onToggleFree,
  onToggle,
  onSetLevels,
}: {
  chips: MetamagicChip[];
  applied: AppliedMetamagic[];
  baseLevel: number;
  maxSlotLevel: number;
  discount?: MetamagicDiscount;
  plan?: FreeMetamagicPlan;
  onToggleFree?: (sourceId: string) => void;
  onToggle: (slug: string) => void;
  onSetLevels: (slug: string, levels: number) => void;
}) {
  if (chips.length === 0) return null;
  const appliedBySlug = new Map(applied.map((a) => [a.slug, a]));
  // Only the feats nobody is covering still cost slot levels, so the cap math
  // below prices an addition against those alone.
  const paidApplied = applied.filter((a) => !plan.waived.has(a.slug));
  const currentIncrease = metamagicSlotIncrease(paidApplied);
  const activeCount = applied.length;
  // Slot level once the discount is taken off a total increase (floor: the
  // spell's own level — the total increase never goes below 0).
  const slotFor = (increase: number) => baseLevel + Math.max(0, increase - discount.amount);
  // The armed source that would cover a given feat, if any — an armed source
  // with no named feat list covers whatever single feat the cast applies.
  const armedFor = (slug: string): FreeMetamagicSource | undefined =>
    plan.offers.find((o) => o.armed && (o.source.featSlugs?.has(slug) ?? true))?.source;
  const visibleOffers = plan.offers.filter((o) => o.remaining > 0 || o.armed);

  return (
    <details className="prep-metamagic">
      <summary className="prep-metamagic-summary">
        Metamagic{activeCount > 0 ? ` (${activeCount})` : ""}
      </summary>
      {discount.amount > 0 && (
        <p className="hint prep-metamagic-discount">
          {discount.labels.join(" and ")}: metamagic on this spell costs {discount.amount} slot{" "}
          {discount.amount === 1 ? "level" : "levels"} less (never below level {baseLevel}).
        </p>
      )}
      {visibleOffers.map((offer) => (
        <div key={offer.source.id} className="prep-metamagic-free">
          <button
            type="button"
            className={`mm-chip mm-chip-free${offer.armed ? " is-active" : ""}`}
            aria-pressed={offer.armed}
            title={offer.source.note}
            onClick={() => onToggleFree?.(offer.source.id)}
          >
            Free via {offer.source.label}
            {offer.cost !== null && ` (${offer.cost} ${pluralUnit(offer.source, offer.cost)})`}
          </button>
          <span className="hint mm-free-remaining">
            {offer.remaining} {pluralUnit(offer.source, offer.remaining)} left
          </span>
          {offer.armed && offer.blocked && <p className="hint mm-free-note">{offer.blocked}</p>}
          {offer.armed && !offer.blocked && offer.cost === null && (
            <p className="hint mm-free-note">
              {offer.source.featSlugs
                ? `Pick ${[...offer.source.featSlugs]
                    .map((s) => metamagicDef(s)?.name ?? s)
                    .join(" or ")} below to apply it free.`
                : "Pick one metamagic feat below to apply it free."}
            </p>
          )}
        </div>
      ))}
      <div className="prep-metamagic-list">
        {chips.map(({ def, grantedBy, permanent }) => {
          const active = appliedBySlug.get(def.slug);
          const isActive = active !== undefined;
          const thisIncrease = isActive ? appliedMetamagicIncrease(active) : def.slotIncrease;
          const otherIncrease =
            currentIncrease - (isActive && !plan.waived.has(def.slug) ? thisIncrease : 0);
          // A permanent (Domain Secret) feat is always free; otherwise a feat
          // is free exactly while a source that covers it is armed.
          const freeSource = permanent ? undefined : armedFor(def.slug);
          const isFree = permanent === true || freeSource !== undefined;
          // Adding a (default) increment must keep the slot level within
          // reach — or, when the addition is free, within the covering
          // ability's own cap (none for Meta-Rage or the once-a-day grants;
          // the modified-level cap for Metamagic Mastery and Mimic Metamagic,
          // neither of which ever sees the trait discount).
          const needsArming = grantedBy !== undefined && !isFree;
          const wouldExceed =
            needsArming ||
            (isFree
              ? !isActive &&
                (freeSource?.capsAtMaxSlot ?? false) &&
                baseLevel + def.slotIncrease > maxSlotLevel
              : !isActive && slotFor(otherIncrease + def.slotIncrease) > maxSlotLevel);
          // For a variable feat, how high its own level may go before the slot
          // would overflow (also capped by the feat's own `maxIncrease`). The
          // discount widens the room by its amount. A free application no
          // longer binds to the paid slot math; Heighten past 9th is
          // meaningless, so 9 is the uncapped ceiling.
          const roomForVariable = isFree
            ? (freeSource?.capsAtMaxSlot ? maxSlotLevel : 9) - baseLevel
            : maxSlotLevel - baseLevel - otherIncrease + discount.amount;
          const variableMax = Math.min(def.maxIncrease ?? roomForVariable, roomForVariable);

          return (
            <div key={def.slug} className="prep-metamagic-item">
              <button
                type="button"
                className={`mm-chip${isActive ? " is-active" : ""}${isFree ? " mm-chip-granted" : ""}`}
                aria-pressed={isActive}
                disabled={wouldExceed}
                title={
                  needsArming
                    ? `${def.name} comes from ${grantedBy.label}: turn that on above to apply it.`
                    : wouldExceed
                      ? isFree
                        ? `Applying ${def.name} would make the spell level ${baseLevel + def.slotIncrease}, above your highest castable level (${maxSlotLevel}).`
                        : `Applying ${def.name} would need a level-${slotFor(otherIncrease + def.slotIncrease)} slot, beyond your highest (level ${maxSlotLevel}).`
                      : permanent
                        ? `${def.name} is permanently applied to this spell by Domain Secret, at no change to its level.`
                        : def.note
                }
                onClick={() => onToggle(def.slug)}
              >
                {def.name}
                {/* A feat only a free source offers never costs slot levels,
                    so it carries no "+N" whether or not that source is armed. */}
                {def.variable || isFree || grantedBy !== undefined ? "" : ` +${def.slotIncrease}`}
              </button>
              {isActive && def.variable && variableMax >= 1 && (
                <label className="mm-levels">
                  <span className="mm-levels-label">+</span>
                  <select
                    className="mm-levels-select"
                    value={appliedMetamagicIncrease(active)}
                    aria-label={`${def.name} level increase`}
                    onChange={(e) => onSetLevels(def.slug, Number(e.currentTarget.value))}
                  >
                    {Array.from({ length: variableMax }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Apply-as-buff — one-click activation of a buff-spell's mechanical effect.
// ---------------------------------------------------------------------------

/**
 * The "＋ Buff" control on a castable spell row: it means *cast this on myself*.
 * A single click spends a slot (via the row's own `onCast`, the same transform
 * its Cast button runs) AND applies the buff — the Cast button stays for casting
 * on someone else (slot only, no self-buff). Dropping the buff (✓ Buff → click)
 * removes it but never refunds the slot: the spell was still cast.
 *
 * Only rendered when the spell maps to a compendium buff (see
 * `model/spellBuffs.ts`); a spell with several variants (Resist Energy's energy
 * types, Prayer) opens a small chooser. Active state mirrors `live.activeBuffs`.
 */
export function ApplyBuffButton({
  spell,
  refData,
  doc,
  update,
  casterLevel,
  onCast,
  castExhausted = false,
}: {
  spell: Spell;
  refData: RefData;
  doc: BuilderProps["doc"];
  update: BuilderProps["update"];
  casterLevel: number;
  /** Spend a slot for this row — the exact transform its Cast button runs. */
  onCast: (d: CharacterDoc) => CharacterDoc;
  /** No slot left to cast: applying (but not dropping) is blocked. */
  castExhausted?: boolean;
}) {
  const buffs = useMemo(() => buffsForSpell(spell, refData), [spell, refData]);
  if (buffs.length === 0) return null;

  const activeByBuffId = new Map(
    doc.live.activeBuffs
      .filter((b) => b.buffId !== undefined)
      .map((b) => [b.buffId as string, b] as const),
  );

  // Apply = cast on self: spend a slot, then add the buff. Drop = remove only
  // (the spell was still cast, so the slot stays spent).
  const apply = (buff: Buff) =>
    update((d) =>
      addBuff(
        onCast(d),
        makeActiveBuff(buff, { casterLevel, remainingRounds: suggestRounds(buff, casterLevel) }),
      ),
    );
  const drop = (instanceId: string) => update((d) => removeBuff(d, instanceId));

  if (buffs.length === 1) {
    const buff = buffs[0]!;
    const active = activeByBuffId.get(buff.id);
    return (
      <TipButton
        className={`pick-btn buff-apply${active ? " is-active" : ""}`}
        aria-pressed={active !== undefined}
        disabled={active === undefined && castExhausted}
        disabledReason="No slot left to cast this."
        title={
          active
            ? `${buff.name} is active: click to drop it (you still cast the spell)`
            : `Cast ${buff.name} on yourself: spends a slot and applies the buff`
        }
        onClick={() => (active ? drop(active.instanceId) : apply(buff))}
      >
        {active ? "✓ Buff" : "+ Buff"}
      </TipButton>
    );
  }

  const activeCount = buffs.filter((b) => activeByBuffId.has(b.id)).length;
  return (
    <details className="buff-apply-menu">
      <summary
        className={`pick-btn buff-apply${activeCount > 0 ? " is-active" : ""}`}
        title={`Cast ${spell.name} on yourself: choose a variant`}
      >
        {activeCount > 0 ? `✓ Buff (${activeCount})` : "+ Buff"}
      </summary>
      <div className="buff-apply-list">
        {buffs.map((buff) => {
          const active = activeByBuffId.get(buff.id);
          return (
            <button
              key={buff.id}
              type="button"
              className={`buff-apply-item${active ? " is-active" : ""}`}
              aria-pressed={active !== undefined}
              disabled={active === undefined && castExhausted}
              onClick={() => (active ? drop(active.instanceId) : apply(buff))}
            >
              {buff.name}
            </button>
          );
        })}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Spontaneous conversion — cleric cure/inflict, druid summon nature's ally.
// ---------------------------------------------------------------------------

/**
 * "Cast as cure/inflict…" / "Cast as Summon Nature's Ally…" on a ready
 * (un-expended) prepared spell — PF1's Spontaneous Casting exception (CRB
 * p.40-41/51): lose THIS prepared spell to cast one of these instead, of the
 * same level or lower. Only rendered when
 * `spontaneousConversionOptions` has candidates (i.e. `casterTag` is cleric
 * or druid AND at least one substitute spell exists at this slot's level or
 * below — always true once any level ≥1 slot exists, since Cure/Inflict
 * Light Wounds and Summon Nature's Ally I are both 1st level). Spends the
 * SAME slot the row's own Cast button would (`castPreparedAsConversion` is a
 * thin alias for `setExpendedAt`) — the doc never records which substitute
 * was cast, only that the slot was spent, so the toast is the only record.
 */
export function ConversionCastMenu({
  doc,
  refData,
  update,
  casterTag,
  index,
  maxLevel,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: BuilderProps["update"];
  casterTag: string;
  index: number;
  maxLevel: number;
}) {
  const options = useMemo(
    () => spontaneousConversionOptions(doc, refData, casterTag, maxLevel),
    [doc, refData, casterTag, maxLevel],
  );
  if (options.length === 0) return null;
  const summaryLabel = casterTag === "druid" ? "⇄ Summon" : "⇄ Cure/Inflict";
  const menuLabel =
    casterTag === "druid" ? "Cast as Summon Nature's Ally…" : "Cast as cure/inflict…";

  return (
    <details className="conversion-cast-menu">
      <summary
        className="pick-btn conversion-cast-summary"
        title="Spontaneous Casting exception: lose this prepared spell to cast one of these instead, of the same level or lower."
      >
        {summaryLabel}
      </summary>
      <div className="conversion-cast-list">
        <p className="hint conversion-cast-hint">{menuLabel}</p>
        {options.map((opt) => (
          <button
            key={`${opt.kind}:${opt.id}`}
            type="button"
            className="pick-btn add conversion-cast-item"
            onClick={() => {
              update((d) => castPreparedAsConversion(d, index));
              showToast({ message: `Cast ${opt.name} instead (spontaneous conversion)` });
            }}
          >
            {opt.name} <span className="hint">L{opt.level}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Domain slots — bonus prepared slots for a cleric with chosen domains.
// ---------------------------------------------------------------------------

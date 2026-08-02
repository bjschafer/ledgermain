import { useMemo, useState } from "react";

import {
  BLOODRAGE_BUFF,
  BLOODRAGE_BUFF_ID,
  COGNATOGEN_BUFFS,
  deriveResourcePools,
  OCCULTIST_PHYSICAL_ABILITIES,
  OCCULTIST_SCHOOLS,
  resolveKineticistDefense,
  type DerivedResourcePool,
  type ToggleBuffOption,
} from "@pf1/engine";
import type { AbilityId, Buff, CharacterDoc, RefData } from "@pf1/schema";

import { FeatureDescription } from "../builder/ClassFeaturesList.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { FlaskIcon } from "../icons.js";
import { toggleLinkedBuff, toggleTableBuff } from "../../model/buffs.js";
import { setMartialFlexibilityFeat } from "../../model/doc.js";
import {
  clearKineticistDefenseBurn,
  setKineticistDefenseBurn,
  setKineticistShroudMode,
} from "../../model/kineticistBuild.js";
import { applyGrantedTempHp, isImmuneToNonlethal } from "../../model/hp.js";
import {
  knownOccultistSchoolTags,
  setOccultistFocusInvested,
  setOccultistPhysicalEnhancementAbility,
  totalOccultistFocusInvested,
} from "../../model/occultistImplements.js";
import {
  addManualPool,
  drainResource,
  poolCadenceLabel,
  remaining,
  removePool,
  restAllResourcesWithRecovery,
  restorePool,
  restoreResource,
  spendPool,
  syncDerivedPools,
} from "../../model/resources.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Drain/restore limited-use pools. Class-feature pools (Rage rounds/day, Channel
 * Energy) are derived from `uses.maxFormula`; item charges and other one-off
 * pools are manual because the vendored data has no charge tables. Prepared
 * spell slots have their own panel ({@link PreparedSpellsPanel}); this is no
 * longer where spells are tracked.
 */
export function ResourcesPanel({ doc, sheet, refData, update }: BuilderProps) {
  const derived = useMemo(
    () => deriveResourcePools(doc, refData, sheet.abilities),
    [doc, refData, sheet.abilities],
  );
  const derivedIds = new Set(derived.map((p) => p.id));
  const manualEntries = Object.entries(doc.live.resources).filter(([id]) => !derivedIds.has(id));
  // Same caster-level floor `BuffsPanel` uses for a newly-added buff's
  // duration suggestion — a linked-buff toggle is just a shortcut into the
  // same `addBuff`/`removeBuff` transitions that panel uses.
  const casterLevel = Math.max(1, sheet.level);

  const [label, setLabel] = useState("");
  const [poolMax, setPoolMax] = useState(4);

  // A pool that damages its owner to use (the kineticist's Burn) moves hit
  // points as well as its counter — see `spendPool`. Manual pools never do.
  const immuneToNonlethal = isImmuneToNonlethal(sheet);
  const drain = (pool: DerivedResourcePool) =>
    update((d) => spendPool(syncDerivedPools(d, derived), pool, 1, { immuneToNonlethal }));
  const restore = (pool: DerivedResourcePool) =>
    update((d) => restorePool(syncDerivedPools(d, derived), pool, 1));
  const drainManual = (id: string) =>
    update((d) => drainResource(syncDerivedPools(d, derived), id, 1));
  const restoreManual = (id: string) =>
    update((d) => restoreResource(syncDerivedPools(d, derived), id, 1));

  const hasAny = derived.length > 0 || manualEntries.length > 0;

  return (
    <Panel
      title="Resources"
      step="rs"
      icon={<FlaskIcon />}
      storageKey="panel:Resources"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() =>
            update((d) => clearKineticistDefenseBurn(restAllResourcesWithRecovery(d, derived)))
          }
        >
          Rest (full)
        </button>
      }
    >
      {!hasAny ? (
        <div className="empty">No pools. Add item charges or other one-off pools below.</div>
      ) : (
        <div className="res-list">
          {derived.map((pool) => {
            const stored = doc.live.resources[pool.id];
            const used = stored?.used ?? 0;
            return (
              <div key={pool.id}>
                <ResourceRow
                  name={pool.name}
                  sub={poolCadenceLabel(pool.per)}
                  detail={pool.detail}
                  description={refData.classFeatures[pool.id]?.description}
                  left={pool.max - used}
                  max={pool.max}
                  onDrain={() => drain(pool)}
                  onRestore={() => restore(pool)}
                  linkedBuffIds={pool.linkedBuffIds}
                  tableOptions={pool.tableOptions}
                  refData={refData}
                  activeBuffs={doc.live.activeBuffs}
                  casterLevel={casterLevel}
                  update={update}
                />
                {pool.name === "Martial Flexibility" && (
                  <MartialFlexibilityPicker doc={doc} refData={refData} update={update} />
                )}
                {pool.name === "Mental Focus" && (
                  <MentalFocusInvestmentPanel doc={doc} pool={pool} update={update} />
                )}
                {pool.name === "Burn" && pool.classTag === "kineticist" && (
                  <ElementalDefensePanel
                    doc={doc}
                    refData={refData}
                    burnHeld={used}
                    update={update}
                  />
                )}
              </div>
            );
          })}
          {manualEntries.map(([id, pool]) => (
            <ResourceRow
              key={id}
              name={id}
              sub="manual"
              left={remaining(pool)}
              max={pool.max}
              onDrain={() => drainManual(id)}
              onRestore={() => restoreManual(id)}
              onRemove={() => update((d) => removePool(d, id))}
            />
          ))}
        </div>
      )}

      <h4 className="tracker-sub">Add a manual pool (item charges, misc)</h4>
      <div className="res-add">
        <input
          type="text"
          placeholder="e.g. Wand charges"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <NumberField
          className="num"
          size={3}
          value={poolMax}
          min={0}
          commitOnChange
          onCommit={(n) => setPoolMax(n)}
          aria-label="Max"
        />
        <button
          type="button"
          className="pick-btn add"
          onClick={() => {
            update((d) => addManualPool(d, label, Number.isNaN(poolMax) ? 0 : poolMax));
            setLabel("");
          }}
        >
          Add
        </button>
      </div>
    </Panel>
  );
}

function ResourceRow({
  name,
  sub,
  detail,
  description,
  left,
  max,
  onDrain,
  onRestore,
  onRemove,
  linkedBuffIds,
  tableOptions,
  refData,
  activeBuffs,
  casterLevel,
  update,
}: {
  name: string;
  /** Short cadence label ("per day", "manual"), rendered as a chip beside the name. Null for none. */
  sub: string | null;
  /**
   * The pool's own prose summary (`DerivedResourcePool.detail`) — a sentence,
   * not a label, so it gets its own readable line rather than sharing the
   * chip's uppercase micro-type.
   */
  detail?: string;
  /** Class feature's vendored HTML prose, when this row is a derived pool with one (issue: bare counters). */
  description?: string;
  left: number;
  max: number;
  onDrain: () => void;
  onRestore: () => void;
  onRemove?: () => void;
  /** Buff ids this pool's power can activate (see `DerivedResourcePool.linkedBuffIds`) — omitted for manual pools. */
  linkedBuffIds?: string[];
  /** Hand-authored toggleable effects with no `RefData.buffs` entry (see `DerivedResourcePool.tableOptions`). */
  tableOptions?: ToggleBuffOption[];
  refData?: RefData;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  casterLevel?: number;
  update?: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  return (
    <div className="res-row">
      <div className="res-main">
        <div className="res-head">
          <span className="res-name">{name}</span>
          {sub ? <span className="res-sub">{sub}</span> : null}
        </div>
        {detail ? <div className="res-detail">{detail}</div> : null}
        {description ? <FeatureDescription html={description} /> : null}
        {linkedBuffIds && linkedBuffIds.length > 0 && refData && activeBuffs && update ? (
          <div className="res-linked-buffs">
            {linkedBuffIds.map((buffId) => (
              <LinkedBuffToggle
                key={buffId}
                buffId={buffId}
                refData={refData}
                activeBuffs={activeBuffs}
                casterLevel={casterLevel ?? 1}
                update={update}
              />
            ))}
          </div>
        ) : null}
        {tableOptions && tableOptions.length > 0 && refData && activeBuffs && update ? (
          <div className="res-linked-buffs">
            {tableOptions.map((option) => (
              <TableBuffToggle
                key={option.id}
                option={option}
                refData={refData}
                activeBuffs={activeBuffs}
                update={update}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="res-count num">
        {left}
        <span className="res-slash">/</span>
        {max}
      </div>
      <div className="res-btns">
        <button
          type="button"
          className="btn-ghost"
          onClick={onDrain}
          disabled={left <= 0}
          aria-label={`spend ${name}`}
        >
          −
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onRestore}
          disabled={left >= max}
          aria-label={`restore ${name}`}
        >
          +
        </button>
        {onRemove ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={onRemove}
            aria-label={`remove ${name}`}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Buffs linked from a resource pool that have no `refData.buffs` entry to
 * resolve against (Bloodrager's Bloodrage; the alchemist's Cognatogen — see
 * `@pf1/engine`'s `bloodrage.ts`/`cognatogen.ts` doc comments for why they're
 * hand-authored rather than vendored). Checked as a fallback in
 * {@link LinkedBuffToggle} below.
 */
const SYNTHETIC_LINKED_BUFFS: Readonly<Record<string, Buff>> = {
  [BLOODRAGE_BUFF_ID]: BLOODRAGE_BUFF,
  ...COGNATOGEN_BUFFS,
};

/**
 * Activate/deactivate a buff linked to this pool's power (Rage → "Rage",
 * Inspire Courage → "Inspire Courage", Aura of Protection domain power →
 * "Aura of Protection", Bloodrage → "Bloodrage" — see
 * `DerivedResourcePool.linkedBuffIds`). This is a pure shortcut into the
 * same `addBuff`/`removeBuff` transitions `BuffsPanel` uses — toggling here
 * makes the buff show up (or disappear) there too, recomputed exactly as if
 * the player had added it by hand. Deliberately does NOT touch the pool's
 * `used` counter (see `deriveResourcePools`'s doc comment on `linkedBuffIds`
 * for why a round-maintained buff and a per-day/per-use pool count aren't
 * the same thing). Renders nothing for a buff id that resolves against
 * neither `refData.buffs` NOR `SYNTHETIC_LINKED_BUFFS` (shouldn't happen —
 * `linkedBuffIds` only ever contains ids resolved against one or the other —
 * but keeps this defensive rather than crashing on a future data change).
 */
function LinkedBuffToggle({
  buffId,
  refData,
  activeBuffs,
  casterLevel,
  update,
}: {
  buffId: string;
  refData: RefData;
  activeBuffs: CharacterDoc["live"]["activeBuffs"];
  casterLevel: number;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const buff = refData.buffs[buffId] ?? SYNTHETIC_LINKED_BUFFS[buffId];
  if (!buff) return null;
  const active = activeBuffs.find((b) => b.buffId === buffId);
  // `applyGrantedTempHp` syncs `live.hp.temp` to whatever this toggle just
  // changed about `DerivedSheet.hp.grantedTemp` (e.g. entering/ leaving
  // Unchained Rage) — a no-op for every linked buff that doesn't grant temp
  // HP, since its before/after granted totals are both 0.
  const toggle = () =>
    update((d) => applyGrantedTempHp(d, toggleLinkedBuff(d, buff, casterLevel), refData));

  if (active) {
    return (
      <button
        type="button"
        className="res-linked-buff active"
        onClick={toggle}
        title={`Deactivate ${buff.name}`}
      >
        {buff.name} Active ✓
      </button>
    );
  }
  return (
    <button
      type="button"
      className="res-linked-buff"
      onClick={toggle}
      title={`Activate ${buff.name}`}
    >
      Activate {buff.name}
    </button>
  );
}

/**
 * Activate/deactivate a hand-authored `ToggleBuffOption` with no
 * `RefData.buffs` entry (inquisitor Judgments, skald Inspired Rage — see
 * `DerivedResourcePool.tableOptions`). Same shape/styling as {@link
 * LinkedBuffToggle}, but keyed by `ActiveBuff.effectTag` via `toggleTableBuff`
 * instead of `buffId` via `toggleLinkedBuff` — these options carry their own
 * `changes`/`contextNotes` directly rather than pointing at a vendored buff,
 * so there's no `RefData.buffs` LOOKUP needed here; `refData` is still
 * threaded through to `applyGrantedTempHp`, a no-op today (none of the current
 * table-buff options grant tempHp) but wired the same way as
 * `LinkedBuffToggle` for a future one to work for free.
 */
function TableBuffToggle({
  option,
  refData,
  activeBuffs,
  update,
}: {
  option: ToggleBuffOption;
  refData: RefData;
  activeBuffs: CharacterDoc["live"]["activeBuffs"];
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const active = activeBuffs.find((b) => b.effectTag === option.id);
  const toggle = () => update((d) => applyGrantedTempHp(d, toggleTableBuff(d, option), refData));

  if (active) {
    return (
      <button
        type="button"
        className="res-linked-buff active"
        onClick={toggle}
        title={`Deactivate ${option.name}`}
      >
        {option.name} Active ✓
      </button>
    );
  }
  return (
    <button
      type="button"
      className="res-linked-buff"
      onClick={toggle}
      title={`Activate ${option.name}`}
    >
      Activate {option.name}
    </button>
  );
}

/**
 * Brawler's Martial Flexibility: lets the player record which combat feat is
 * currently "borrowed" (PF1 RAW: move/swift/free/immediate action depending on
 * brawler level, lasts 1 minute — the action-type distinction isn't tracked
 * separately, see `live.martialFlexibilityFeatId`'s doc comment). Sits right
 * below the Martial Flexibility resource row. Restricted to feats tagged
 * "Combat" (same tag `model/featSlots.ts`'s `combat` slot type checks) — RAW
 * also requires meeting the feat's prerequisites, which this picker does NOT
 * validate (soft posture, matching the rest of the app's feat pickers). A
 * borrowed feat with a modeled STATIC effect in `@pf1/engine`
 * `feat-effects.ts` applies for real (see `collect.ts`'s Martial Flexibility
 * block); this chip is the always-honest display layer regardless of whether
 * the numeric effect wired through.
 */
function MartialFlexibilityPicker({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const combatFeats = useMemo(
    () =>
      Object.entries(refData.feats)
        .filter(([, f]) => f.tags.includes("Combat"))
        .sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [refData],
  );
  const borrowedId = doc.live.martialFlexibilityFeatId ?? "";
  const borrowed = borrowedId ? refData.feats[borrowedId] : undefined;

  return (
    <div className="res-sub-row martial-flexibility">
      <label className="hint" htmlFor="martial-flexibility-select">
        Borrowed feat (1 min, meet its prereqs)
      </label>
      <select
        id="martial-flexibility-select"
        value={borrowedId}
        onChange={(e) => update((d) => setMartialFlexibilityFeat(d, e.target.value || null))}
      >
        <option value="">— none borrowed —</option>
        {combatFeats.map(([id, feat]) => (
          <option key={id} value={id}>
            {feat.name}
          </option>
        ))}
      </select>
      {borrowed?.description && <FeatureDescription html={borrowed.description} />}
    </div>
  );
}

/**
 * Kineticist Elemental Defense: how much of the burn currently held went into
 * the defense rather than a blast. Sits right below the Burn row, the same
 * shape as {@link MentalFocusInvestmentPanel} — both divide one pool by hand.
 *
 * The number field is capped at the burn actually held and at the talent's
 * own RAW ceiling, whichever is lower, because burn spent past either does
 * nothing at all (the engine clamps it too, so this is a courtesy rather than
 * the enforcement). Force Ward's temporary hit points sync into the tracker's
 * pool on change, the same way activating a temp-HP buff does.
 */
function ElementalDefensePanel({
  doc,
  refData,
  burnHeld,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  /** The Burn pool's current `used` count — burn accepted and still held. */
  burnHeld: number;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const level = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  const invested = Math.min(doc.live.kineticistDefenseBurn ?? 0, burnHeld);
  const defense = resolveKineticistDefense(doc.build.kineticistElement, level, {
    burnInvested: invested,
    shroudMode: doc.live.kineticistShroudMode,
  });
  if (!defense) return null;

  const ceiling = Math.min(burnHeld, defense.maxBurnInvested ?? burnHeld);

  return (
    <div className="res-sub-row elemental-defense">
      <div className="res-name">{defense.name}</div>
      <div className="res-detail">{defense.detail}</div>
      <div className="res-field-row">
        <span className="res-field-label">Burn spent here</span>
        <NumberField
          value={invested}
          min={0}
          max={ceiling}
          onCommit={(v) =>
            update((d) =>
              applyGrantedTempHp(d, setKineticistDefenseBurn(d, Math.min(v, ceiling)), refData),
            )
          }
        />
        <span className="hint">
          of {burnHeld} held
          {defense.maxBurnInvested !== undefined ? ` · max ${defense.maxBurnInvested}` : ""}
        </span>
      </div>
      {defense.elementTag === "water" && (
        <div className="res-field-row">
          <span className="res-field-label">Shroud shaped as</span>
          <select
            value={doc.live.kineticistShroudMode ?? "armor"}
            onChange={(e) =>
              update((d) => setKineticistShroudMode(d, e.target.value as "armor" | "shield"))
            }
          >
            <option value="armor">Armor bonus</option>
            <option value="shield">Shield bonus</option>
          </select>
        </div>
      )}
      {defense.notes.map((note) => (
        <p key={note} className="hint">
          {note}
        </p>
      ))}
    </div>
  );
}

/**
 * Occultist Mental Focus investment: once-per-day division of the Mental Focus
 * pool among known implements (`live.occultistFocusInvested` — see that
 * field's schema doc comment for why this is `live.*`, not a `build.*` pick,
 * and why `model/rest.ts`'s `restNewDay` deliberately leaves it untouched).
 * Sits right below the Mental Focus resource row; only schools currently known
 * (`build.occultistImplements`) get a number input. Transmutation's Physical
 * Enhancement resonant power additionally exposes an ability-score radio group
 * (`live.occultistPhysicalEnhancementAbility`), shown once 3+ focus is
 * invested there (below that, the power grants no bonus at all — see
 * `@pf1/engine` `occultist-implements.ts`'s `cappedFocusBonus`). The
 * total-invested-vs-pool-max comparison is a soft hint only, never blocking
 * (same posture as every other budget in this app).
 */
function MentalFocusInvestmentPanel({
  doc,
  pool,
  update,
}: {
  doc: CharacterDoc;
  pool: DerivedResourcePool;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const knownTags = knownOccultistSchoolTags(doc);
  if (knownTags.length === 0) return null;

  const total = totalOccultistFocusInvested(doc);
  const over = total > pool.max;
  const transmutationInvested = doc.live.occultistFocusInvested?.["transmutation"] ?? 0;
  const physicalAbility = doc.live.occultistPhysicalEnhancementAbility ?? "str";

  return (
    <div className="res-sub-row mental-focus-investment">
      <label className="hint">
        Focus invested per implement{" "}
        <span className={over ? "hint warn-over" : "hint"}>
          ({total} / {pool.max})
        </span>
      </label>
      {knownTags.map((tag) => {
        const school = OCCULTIST_SCHOOLS[tag];
        if (!school) return null;
        const invested = doc.live.occultistFocusInvested?.[tag] ?? 0;
        return (
          <div key={tag} className="res-field-row">
            <span className="res-field-label">{school.name}</span>
            <NumberField
              value={invested}
              min={0}
              onCommit={(v) => update((d) => setOccultistFocusInvested(d, tag, v))}
            />
          </div>
        );
      })}
      {knownTags.includes("transmutation") && transmutationInvested >= 3 && (
        <div className="res-field-row">
          <span className="res-field-label">Physical Enhancement targets</span>
          <select
            value={physicalAbility}
            onChange={(e) =>
              update((d) => setOccultistPhysicalEnhancementAbility(d, e.target.value as AbilityId))
            }
          >
            {OCCULTIST_PHYSICAL_ABILITIES.map((a) => (
              <option key={a} value={a}>
                {a.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

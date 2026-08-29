import { useMemo, useState } from "react";

import {
  BLOODRAGE_BUFF,
  BLOODRAGE_BUFF_ID,
  COGNATOGEN_BUFFS,
  deriveResourcePools,
  OCCULTIST_PHYSICAL_ABILITIES,
  OCCULTIST_SCHOOLS,
  RASUGEN_BUFF,
  RASUGEN_BUFF_ID,
  resolveKineticistDefense,
  slaClaimedPoolIds,
  type DerivedResourcePool,
  type ToggleBuffOption,
} from "@pf1/engine";
import type { AbilityId, Buff, CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { AbilityTypeTag, FeatureDescription } from "../builder/ClassFeaturesList.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { FlaskIcon } from "../icons.js";
import { toggleLinkedBuff, toggleTableBuff } from "../../model/buffs.js";
import { setMartialFlexibilityFeat } from "../../model/doc.js";
import {
  clearKineticistDefenseBurn,
  kineticUtilityActions,
  setKineticistDefenseBurn,
  setKineticistShroudMode,
} from "../../model/kineticistBuild.js";
import { applyGrantedTempHp, isImmuneToNonlethal } from "../../model/hp.js";
import { MartialFlexibilityDialog } from "./MartialFlexibilityDialog.js";
import {
  knownOccultistSchoolTags,
  setOccultistFocusInvested,
  setOccultistPhysicalEnhancementAbility,
  totalOccultistFocusInvested,
} from "../../model/occultistImplements.js";
import {
  arcanistExploitActions,
  type ArcanistExploitAction,
} from "../../model/arcanistExploits.js";
import {
  phrenicAmplificationActions,
  type PhrenicAmplificationAction,
} from "../../model/psychicAmplifications.js";
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
    () => deriveResourcePools(doc, refData, sheet.abilities, sheet.abilityDCs),
    [doc, refData, sheet.abilities, sheet.abilityDCs],
  );
  const derivedIds = new Set(derived.map((p) => p.id));
  // Pools whose uses counter lives on the Spell-Like Abilities panel — still
  // derived (they rest and sync like any pool), just not rendered twice.
  const slaClaimed = slaClaimedPoolIds(sheet.spellLikeAbilities);
  const visiblePools = derived.filter((pool) => !slaClaimed.has(pool.id));
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
  // Same generic spend as `drain` above but for a caller-chosen amount — the
  // Phrenic Pool row's amplification actions spend a variable number of
  // points per use, not always 1.
  const spendAmount = (pool: DerivedResourcePool, n: number) =>
    update((d) => spendPool(syncDerivedPools(d, derived), pool, n, { immuneToNonlethal }));
  const drainManual = (id: string) =>
    update((d) => drainResource(syncDerivedPools(d, derived), id, 1));
  const restoreManual = (id: string) =>
    update((d) => restoreResource(syncDerivedPools(d, derived), id, 1));

  const hasAny = visiblePools.length > 0 || manualEntries.length > 0;

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
          {visiblePools.map((pool) => {
            const stored = doc.live.resources[pool.id];
            const used = stored?.used ?? 0;
            return (
              <div key={pool.id}>
                <ResourceRow
                  name={pool.name}
                  sub={poolCadenceLabel(pool.per)}
                  detail={pool.detail}
                  description={refData.classFeatures[pool.id]?.description}
                  abilityType={refData.classFeatures[pool.id]?.abilityType}
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
                  <MartialFlexibilityPicker
                    doc={doc}
                    sheet={sheet}
                    refData={refData}
                    update={update}
                  />
                )}
                {pool.name === "Mental Focus" && (
                  <MentalFocusInvestmentPanel doc={doc} pool={pool} update={update} />
                )}
                {pool.name === "Burn" && pool.classTag === "kineticist" && (
                  <>
                    <ElementalDefensePanel
                      doc={doc}
                      refData={refData}
                      burnHeld={used}
                      update={update}
                    />
                    <KineticUtilityActionsPanel doc={doc} refData={refData} sheet={sheet} />
                  </>
                )}
                {pool.name === "Phrenic Pool" && pool.classTag === "psychic" && (
                  <PhrenicAmplificationActionsPanel
                    doc={doc}
                    refData={refData}
                    left={pool.max - used}
                    onSpend={(n) => spendAmount(pool, n)}
                  />
                )}
                {pool.name === "Arcane Reservoir" && pool.classTag === "arcanist" && (
                  <ArcanistExploitActionsPanel
                    doc={doc}
                    refData={refData}
                    sheet={sheet}
                    left={pool.max - used}
                    onSpend={(n) => spendAmount(pool, n)}
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
  abilityType,
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
  /** Raw `ClassFeature.abilityType` of the feature this pool belongs to; manual pools have none. */
  abilityType?: string;
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
          <span className="res-name">
            {name}
            <AbilityTypeTag abilityType={abilityType} />
          </span>
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
 * resolve against (Bloodrager's Bloodrage; the alchemist's Cognatogen and
 * mnemostiller's Rasugen — see `@pf1/engine`'s `bloodrage.ts`/`cognatogen.ts`/
 * `rasugen.ts` doc comments for why they're hand-authored rather than
 * vendored). Checked as a fallback in {@link LinkedBuffToggle} below.
 */
const SYNTHETIC_LINKED_BUFFS: Readonly<Record<string, Buff>> = {
  [BLOODRAGE_BUFF_ID]: BLOODRAGE_BUFF,
  ...COGNATOGEN_BUFFS,
  [RASUGEN_BUFF_ID]: RASUGEN_BUFF,
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
 * below the Martial Flexibility resource row. The trigger opens
 * {@link MartialFlexibilityDialog}, a full-screen browsable picker (search +
 * benefit summary + live prereq checklist) restricted to feats tagged Combat
 * and hard-blocked/soft-warned on the SAME prereq logic the builder's feat
 * picker uses (RAW: "the brawler must meet all the feat's prerequisites") —
 * see that dialog's doc comment. A borrowed feat with a modeled STATIC effect
 * in `@pf1/engine` `feat-effects.ts` applies for real (see `collect.ts`'s
 * Martial Flexibility block); this row is the always-honest display layer
 * regardless of whether the numeric effect wired through.
 */
function MartialFlexibilityPicker({
  doc,
  sheet,
  refData,
  update,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const borrowedId = doc.live.martialFlexibilityFeatId ?? "";
  const borrowed = borrowedId ? refData.feats[borrowedId] : undefined;

  return (
    <div className="res-sub-row martial-flexibility">
      <div className="res-field-row">
        <span className="res-field-label">Borrowed feat</span>
        <div className="res-btns">
          <button type="button" className="pick-btn" onClick={() => setPickerOpen(true)}>
            {borrowed ? borrowed.name : "Borrow a feat…"}
          </button>
          {borrowed && (
            <button
              type="button"
              className="pick-btn remove"
              onClick={() => update((d) => setMartialFlexibilityFeat(d, null))}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <span className="hint">1 minute, meet its prerequisites</span>
      {borrowed?.description && <FeatureDescription html={borrowed.description} />}
      {pickerOpen && (
        <MartialFlexibilityDialog
          doc={doc}
          sheet={sheet}
          refData={refData}
          borrowedId={borrowedId}
          onSelect={(featId) => {
            update((d) => setMartialFlexibilityFeat(d, featId));
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
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
 * A handful of picked kineticist wild talents are activated abilities that
 * cost burn but grant no permanent bonus a `Change` could target (Kinetic
 * Healer and its Void/Wood Healer counterparts, Kinetic Restoration,
 * Celerity) — before this panel existed, picking one showed up nowhere but
 * the builder, which is exactly the "produces no mechanical effect on the
 * sheet or tracker" complaint the rest of the catalog's `changes[]`-backed
 * entries don't have. Read-only: burn is still spent by hand via the Burn
 * row above, the same way a barbarian tracks her own rage rounds (see
 * `resources.ts`'s doc comment on why linked-buff toggles never auto-drain a
 * pool). See `model/kineticistBuild.ts`'s `kineticUtilityActions` for which
 * talents are covered and why.
 */
function KineticUtilityActionsPanel({
  doc,
  refData,
  sheet,
}: {
  doc: CharacterDoc;
  refData: RefData;
  sheet: DerivedSheet;
}) {
  const actions = kineticUtilityActions(doc, refData, sheet);
  if (actions.length === 0) return null;

  return (
    <div className="res-sub-row kinetic-utility-actions">
      <div className="res-name">Utility talents</div>
      <ul className="loadout-infusion-list">
        {actions.map((action) => (
          <li key={action.id}>
            <b>{action.name}</b>
            <span className="hint">
              {" "}
              ({action.burn} burn) · {action.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Picked phrenic amplifications, listed beside the Phrenic Pool resource row:
 * each is a cast-time rider a psychic pays for out of that pool (see
 * `model/psychicAmplifications.ts`'s `phrenicAmplificationActions`). A flat,
 * parseable cost ("1 point", "2 points") gets a one-click spend button; a
 * variable, conditional, or per-target/per-level cost ("1 or 2 points", "2
 * points per level", ...) lets the player type the amount they're actually
 * paying, since only the rules text below (the same collapsed-description
 * idiom a class feature row uses) says which choice applies. Read-mostly:
 * this is a spend tracker plus reference, not a cast-flow integration —
 * nothing here validates that a typed amount matches a legal option, the
 * same trust the Burn row already extends to a kineticist's own bookkeeping.
 */
function PhrenicAmplificationActionsPanel({
  doc,
  refData,
  left,
  onSpend,
}: {
  doc: CharacterDoc;
  refData: RefData;
  /** Phrenic Pool points currently remaining, from the row above. */
  left: number;
  onSpend: (n: number) => void;
}) {
  const actions = phrenicAmplificationActions(doc, refData);
  if (actions.length === 0) return null;

  return (
    <div className="res-sub-row phrenic-amplification-actions">
      <div className="res-name">Amplifications</div>
      {actions.map((action) => (
        <PhrenicAmplificationActionRow
          key={action.id}
          action={action}
          left={left}
          onSpend={onSpend}
        />
      ))}
    </div>
  );
}

function PhrenicAmplificationActionRow({
  action,
  left,
  onSpend,
}: {
  action: PhrenicAmplificationAction;
  left: number;
  onSpend: (n: number) => void;
}) {
  const [amount, setAmount] = useState(1);
  const flatCost = action.cost !== undefined && action.cost > 0;
  const noCost = action.cost === 0;

  return (
    <div className="phrenic-amplification-row">
      <div className="res-field-row">
        <span className="res-field-label">
          {action.name}
          <span className="tag-mystery"> {action.tier === "major" ? "Major" : "Amp"}</span>
        </span>
        {flatCost ? (
          <button
            type="button"
            className="pick-btn"
            disabled={left < (action.cost ?? 0)}
            onClick={() => onSpend(action.cost!)}
          >
            Spend {action.cost} {action.cost === 1 ? "point" : "points"}
          </button>
        ) : noCost ? (
          <span className="hint">No pool cost</span>
        ) : (
          <>
            <NumberField
              value={amount}
              min={1}
              max={Math.max(left, 1)}
              size={2}
              onCommit={setAmount}
              aria-label={`${action.name} points to spend`}
            />
            <button
              type="button"
              className="pick-btn"
              disabled={left < amount}
              onClick={() => onSpend(amount)}
            >
              Spend
            </button>
          </>
        )}
      </div>
      <span className="hint">
        {action.costLabel}: {action.summary}
      </span>
      {action.description ? <FeatureDescription html={action.description} /> : null}
    </div>
  );
}

/**
 * Picked arcanist exploits, listed beside the Arcane Reservoir resource row.
 * All but a handful of the 73 published exploits are activated abilities that
 * spend a reservoir point and leave nothing behind for a `Change` to target,
 * so before this panel they lived only in the builder and the collapsed
 * class-features reference: a player who took Dimensional Slide had to
 * remember it unaided and work out its distance by hand. This row is the same
 * "actions hang off the pool they spend" shape `KineticUtilityActionsPanel`
 * and `PhrenicAmplificationActionsPanel` already use, plus the one number
 * each exploit scales (resolved at the character's level by
 * `model/arcanistExploits.ts`'s `arcanistExploitActions`).
 *
 * A flat cost gets a one-click spend; a variable one ("1 or more points")
 * lets the player type what they're actually paying, the same trust the
 * Phrenic Pool row extends. An exploit that also carries a lasting effect
 * (`arcane-spends.ts`'s `spendToggle`) points at its toggle on the row above
 * rather than offering a second, divergent way to pay for the same thing.
 */
function ArcanistExploitActionsPanel({
  doc,
  refData,
  sheet,
  left,
  onSpend,
}: {
  doc: CharacterDoc;
  refData: RefData;
  sheet: DerivedSheet;
  /** Arcane Reservoir points currently remaining, from the row above. */
  left: number;
  onSpend: (n: number) => void;
}) {
  const actions = arcanistExploitActions(doc, refData, sheet);
  if (actions.length === 0) return null;

  return (
    <div className="res-sub-row arcanist-exploit-actions">
      <div className="res-name">Exploits</div>
      {actions.map((action) => (
        <ArcanistExploitActionRow key={action.id} action={action} left={left} onSpend={onSpend} />
      ))}
    </div>
  );
}

function ArcanistExploitActionRow({
  action,
  left,
  onSpend,
}: {
  action: ArcanistExploitAction;
  left: number;
  onSpend: (n: number) => void;
}) {
  const [amount, setAmount] = useState(1);
  const flatCost = action.cost !== undefined && action.cost > 0;
  const noCost = action.cost === 0;
  // A no-cost exploit already says so on its own control, so the meta line
  // carries the action alone rather than printing "No cost" twice.
  const meta = [action.action, noCost ? undefined : action.costLabel].filter(Boolean).join(" · ");

  return (
    <div className="arcanist-exploit-row">
      <div className="res-field-row">
        <span className="res-field-label">
          {action.name}
          {action.category ? <span className="tag-mystery"> Greater</span> : null}
        </span>
        {action.scaleValue ? (
          <span className="exploit-scale">
            {action.scaleLabel} <b>{action.scaleValue}</b>
          </span>
        ) : null}
        {flatCost ? (
          <button
            type="button"
            className="pick-btn"
            disabled={left < (action.cost ?? 0)}
            onClick={() => onSpend(action.cost!)}
          >
            Spend {action.cost} {action.cost === 1 ? "point" : "points"}
          </button>
        ) : noCost ? (
          <span className="hint">No reservoir cost</span>
        ) : (
          <>
            <NumberField
              value={amount}
              min={1}
              max={Math.max(left, 1)}
              size={2}
              onCommit={setAmount}
              aria-label={`${action.name} points to spend`}
            />
            <button
              type="button"
              className="pick-btn"
              disabled={left < amount}
              onClick={() => onSpend(amount)}
            >
              Spend
            </button>
          </>
        )}
      </div>
      <span className="hint">
        {meta ? `${meta}: ` : ""}
        {action.summary}
      </span>
      {action.hasToggle ? (
        <span className="hint">Its lasting effect toggles on the reservoir row above.</span>
      ) : null}
      {action.description ? <FeatureDescription html={action.description} /> : null}
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

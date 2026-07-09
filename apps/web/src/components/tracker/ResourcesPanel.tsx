import { useMemo, useState } from "react";

import {
  BLOODRAGE_BUFF,
  BLOODRAGE_BUFF_ID,
  deriveResourcePools,
  type ToggleBuffOption,
} from "@pf1/engine";
import type { Buff, CharacterDoc, RefData } from "@pf1/schema";

import { FeatureDescription } from "../builder/ClassFeaturesList.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { toggleLinkedBuff, toggleTableBuff } from "../../model/buffs.js";
import { setMartialFlexibilityFeat } from "../../model/doc.js";
import {
  addManualPool,
  drainResource,
  remaining,
  removePool,
  restAllResources,
  restoreResource,
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

  const drain = (id: string) => update((d) => drainResource(syncDerivedPools(d, derived), id, 1));
  const restore = (id: string) =>
    update((d) => restoreResource(syncDerivedPools(d, derived), id, 1));

  const hasAny = derived.length > 0 || manualEntries.length > 0;

  return (
    <Panel
      title="Resources"
      step="rs"
      storageKey="panel:Resources"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() => update((d) => restAllResources(d))}
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
                  sub={pool.detail ?? (pool.per ? `per ${pool.per}` : "derived")}
                  description={refData.classFeatures[pool.id]?.description}
                  left={pool.max - used}
                  max={pool.max}
                  onDrain={() => drain(pool.id)}
                  onRestore={() => restore(pool.id)}
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
              onDrain={() => drain(id)}
              onRestore={() => restore(id)}
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
  sub: string;
  /** Class feature's vendored HTML prose, when this row is a derived pool with one (issue: bare counters). */
  description?: string;
  left: number;
  max: number;
  onDrain: () => void;
  onRestore: () => void;
  onRemove?: () => void;
  /** Buff ids this pool's power can activate (see `DerivedResourcePool.linkedBuffIds`) — omitted for manual pools. */
  linkedBuffIds?: string[];
  /** Hand-authored toggleable effects with no `RefData.buffs` entry (see `DerivedResourcePool.tableOptions`, issue #65). */
  tableOptions?: ToggleBuffOption[];
  refData?: RefData;
  activeBuffs?: CharacterDoc["live"]["activeBuffs"];
  casterLevel?: number;
  update?: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  return (
    <div className="res-row">
      <div className="res-main">
        <div className="res-name">{name}</div>
        <div className="res-sub">{sub}</div>
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
        {tableOptions && tableOptions.length > 0 && activeBuffs && update ? (
          <div className="res-linked-buffs">
            {tableOptions.map((option) => (
              <TableBuffToggle
                key={option.id}
                option={option}
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
 * resolve against (issue #65: Bloodrager's Bloodrage — see `@pf1/engine`
 * `bloodrage.ts`'s doc comment for why it's hand-authored rather than
 * vendored). Checked as a fallback in {@link LinkedBuffToggle} below.
 */
const SYNTHETIC_LINKED_BUFFS: Readonly<Record<string, Buff>> = {
  [BLOODRAGE_BUFF_ID]: BLOODRAGE_BUFF,
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
  const toggle = () => update((d) => toggleLinkedBuff(d, buff, casterLevel));

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
 * `RefData.buffs` entry (issue #65: inquisitor Judgments, skald Inspired
 * Rage — see `DerivedResourcePool.tableOptions`). Same shape/styling as
 * {@link LinkedBuffToggle}, but keyed by `ActiveBuff.effectTag` via
 * `toggleTableBuff` instead of `buffId` via `toggleLinkedBuff` — these
 * options carry their own `changes`/`contextNotes` directly rather than
 * pointing at a vendored buff, so there's no `refData` lookup needed here.
 */
function TableBuffToggle({
  option,
  activeBuffs,
  update,
}: {
  option: ToggleBuffOption;
  activeBuffs: CharacterDoc["live"]["activeBuffs"];
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
}) {
  const active = activeBuffs.find((b) => b.effectTag === option.id);
  const toggle = () => update((d) => toggleTableBuff(d, option));

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
 * Brawler's Martial Flexibility (issue #65): lets the player record which
 * combat feat is currently "borrowed" (PF1 RAW: move/swift/free/immediate
 * action depending on brawler level, lasts 1 minute — the action-type
 * distinction isn't tracked separately, see `live.martialFlexibilityFeatId`'s
 * doc comment). Sits right below the Martial Flexibility resource row.
 * Restricted to feats tagged "Combat" (same tag `model/featSlots.ts`'s
 * `combat` slot type checks) — RAW also requires meeting the feat's
 * prerequisites, which this picker does NOT validate (soft posture, matching
 * the rest of the app's feat pickers). A borrowed feat with a modeled STATIC
 * effect in `@pf1/engine` `feat-effects.ts` applies for real (see
 * `collect.ts`'s Martial Flexibility block); this chip is the always-honest
 * display layer regardless of whether the numeric effect wired through.
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

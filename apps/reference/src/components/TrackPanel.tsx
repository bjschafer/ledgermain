import type { Monster } from "@pf1/schema";
import { useEffect, useMemo, useState } from "react";

import { loadEntry } from "../data/loader.js";
import { detailHref } from "../hooks/useHashRoute.js";
import { clampDamage, hpStatus, type TrackState } from "../model/track.js";
import type { RefIndex } from "../shared/indexCodec.js";

/**
 * The GM-side encounter tracker on a statblock page: damage and healing
 * against the printed hit points, plus condition markers that carry their
 * rules text. No dice and no automation, in keeping with the rest of the
 * site: the tracker records what happened at the table, it never rolls or
 * applies anything itself.
 */
export function TrackPanel({
  index,
  monster,
  names,
  state,
  update,
}: {
  index: RefIndex;
  /** The statblock as displayed: the adjusted copy when templates are on, so max hp matches the page. */
  monster: Monster;
  /** Condition id -> display name, from the search index. */
  names: Map<string, string>;
  state: TrackState;
  update: (patch: Partial<TrackState>) => void;
}) {
  const tracking = state.damage > 0 || state.conditions.length > 0;
  const conditionOptions = useMemo(
    () => [...names.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [names],
  );
  const active = useMemo(() => new Set(state.conditions), [state.conditions]);

  function toggleCondition(id: string): void {
    update({
      conditions: active.has(id)
        ? state.conditions.filter((c) => c !== id)
        : [...state.conditions, id],
    });
  }

  return (
    <section className="adjust-section">
      <div className="adjust-section-head">
        <h2 className="adjust-section-title">Track</h2>
        <button
          type="button"
          className="adjust-reset"
          disabled={!tracking}
          onClick={() => update({ damage: 0, conditions: [] })}
        >
          Reset
        </button>
      </div>
      <p className="track-hint">
        Each browser tab tracks its own copy of this creature: open one tab per monster in the
        fight. Survives a reload, cleared when the tab closes.
      </p>

      {monster.hp !== undefined && (
        <HpTracker
          monster={monster}
          damage={state.damage}
          onDamage={(d) => update({ damage: d })}
        />
      )}

      <div className="adjust-picker">
        <div className="adjust-picker-head">
          <span className="adjust-picker-title">Conditions</span>
          <span className="adjust-picker-hint">tap to mark</span>
        </div>
        <div className="adjust-picker-grid track-cond-grid">
          {conditionOptions.map(([id, name]) => {
            const on = active.has(id);
            return (
              <label key={id} className={on ? "adjust-option is-on" : "adjust-option"}>
                <input type="checkbox" checked={on} onChange={() => toggleCondition(id)} />
                <span className="adjust-option-box" aria-hidden="true" />
                <span className="adjust-option-label">{name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {state.conditions.length > 0 && (
        <ActiveConditionList index={index} names={names} activeIds={state.conditions} />
      )}
    </section>
  );
}

function HpTracker({
  monster,
  damage,
  onDamage,
}: {
  monster: Monster;
  damage: number;
  onDamage: (damage: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const max = monster.hp ?? 0;
  const current = max - damage;
  const status = hpStatus(monster, current);
  const fill = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  /** Empty input means 1: a bare click on Damage or Heal is a single tick. */
  function parseAmount(): number {
    if (amount.trim() === "") return 1;
    const n = clampDamage(Number.parseInt(amount, 10));
    return n > 0 ? n : 0;
  }

  // The typed amount is deliberately kept after applying: recurring damage
  // (bleed each round) and repeated hits of the same size are the common case.
  function applyDamage(): void {
    const n = parseAmount();
    if (n > 0) onDamage(clampDamage(damage + n));
  }

  function applyHeal(): void {
    const n = parseAmount();
    if (n > 0) onDamage(clampDamage(damage - n));
  }

  return (
    <div className="track-hp">
      <div className="track-hp-reading">
        <span className={`track-hp-current is-${status.kind}`}>{current}</span>
        <span className="track-hp-max">/ {max} hp</span>
        {monster.hpNote && <span className="track-hp-note">{monster.hpNote}</span>}
      </div>
      <div className="track-hp-bar" aria-hidden="true">
        <div
          className={`track-hp-fill is-${status.kind}`}
          style={{ width: `${(fill * 100).toFixed(1)}%` }}
        />
      </div>
      <form
        className="track-hp-controls"
        onSubmit={(e) => {
          e.preventDefault();
          applyDamage();
        }}
      >
        <input
          type="number"
          min={1}
          max={99999}
          placeholder="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Hit point amount"
        />
        <button type="submit" className="track-hp-button is-damage">
          Damage
        </button>
        <button type="button" className="track-hp-button is-heal" onClick={applyHeal}>
          Heal
        </button>
      </form>
      {status.text && (
        <p className={`track-hp-status is-${status.kind}`}>
          {status.conditionId ? (
            <a href={detailHref("conditions", status.conditionId)}>{status.text}</a>
          ) : (
            status.text
          )}
          {status.regenerationCaveat && (
            <span className="track-hp-regen"> {status.regenerationCaveat}</span>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * The marked conditions with their one-line rules text, so "what does dazed
 * do again" is answered on the monster page. Summaries load lazily from the
 * condition shards; the name links to the full entry either way.
 */
function ActiveConditionList({
  index,
  names,
  activeIds,
}: {
  index: RefIndex;
  names: Map<string, string>;
  activeIds: readonly string[];
}) {
  const [summaries, setSummaries] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    let live = true;
    const missing = activeIds.filter((id) => !summaries.has(id));
    if (missing.length === 0) return;
    void Promise.all(
      missing.map(async (id) => {
        const entry = await loadEntry(index, "conditions", id).catch(() => null);
        return [id, entry?.summary ?? ""] as const;
      }),
    ).then((loaded) => {
      if (!live) return;
      setSummaries((prev) => new Map([...prev, ...loaded]));
    });
    return () => {
      live = false;
    };
  }, [index, activeIds, summaries]);

  return (
    <ul className="track-active-list">
      {activeIds.map((id) => (
        <li key={id}>
          <a className="track-active-name" href={detailHref("conditions", id)}>
            {names.get(id) ?? id}
          </a>
          {summaries.get(id) && <span className="track-active-summary">{summaries.get(id)}</span>}
        </li>
      ))}
    </ul>
  );
}

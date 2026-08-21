import type { Monster } from "@pf1/schema";
import { useState } from "react";

import { detailHref } from "../hooks/useHashRoute.js";
import {
  CONDITION_ORDER,
  CONDITIONS,
  supersedingCondition,
  toggleCondition,
} from "../model/adjust/conditions.js";
import { clampDamage, hpStatus, type TrackState } from "../model/track.js";

/**
 * The GM-side encounter tracker on a statblock page: damage and healing
 * against the printed hit points, plus condition chips that both carry their
 * rules text and move the statblock numbers (via `conditionAdjustments` in
 * the page above). No dice, in keeping with the rest of the site: the
 * tracker records what happened at the table, it never rolls anything.
 *
 * Chip semantics mirror the sheet's conditions panel: solid border = moves
 * numbers, dashed + ° = reference only, dimmed + ▲ = implied by a stricter
 * active condition on its ladder.
 */
export function TrackPanel({
  monster,
  state,
  update,
}: {
  /** The statblock as displayed: the adjusted copy when templates are on, so max hp matches the page. */
  monster: Monster;
  state: TrackState;
  update: (patch: Partial<TrackState>) => void;
}) {
  const tracking = state.damage > 0 || state.conditions.length > 0;
  const active = state.conditions;

  return (
    <section className="rpanel">
      <header className="rpanel-header">
        <h2>Track</h2>
        <button
          type="button"
          className="btn-ghost"
          disabled={!tracking}
          onClick={() => update({ damage: 0, conditions: [] })}
        >
          Reset
        </button>
      </header>
      <div className="rpanel-body">
        {monster.hp !== undefined && (
          <HpTracker
            monster={monster}
            damage={state.damage}
            onDamage={(d) => update({ damage: d })}
          />
        )}

        <div className="cond-chips">
          {CONDITION_ORDER.map((def) => {
            const on = active.includes(def.id);
            const implied = !on && supersedingCondition(active, def.id) !== undefined;
            const classes = ["cond-chip"];
            if (def.displayOnly || def.changes.length === 0) classes.push("display-only");
            if (implied) classes.push("implied");
            return (
              <button
                key={def.id}
                type="button"
                className={classes.join(" ")}
                aria-pressed={on}
                disabled={implied}
                title={def.summary}
                onClick={() => update({ conditions: toggleCondition(active, def.id) })}
              >
                {def.name}
                {(implied || def.displayOnly || def.changes.length === 0) && (
                  <span className="dot">{implied ? "▲" : "°"}</span>
                )}
              </button>
            );
          })}
        </div>

        {active.length > 0 && (
          <ul className="cond-notes">
            {active.map((id) => {
              const def = CONDITIONS[id];
              return (
                <li key={id}>
                  <b>
                    <a href={detailHref("conditions", id)}>{def?.name ?? id}</a>.
                  </b>{" "}
                  {def?.summary}
                </li>
              );
            })}
          </ul>
        )}

        <p className="hint track-hint">
          Each browser tab tracks its own copy of this creature: open one tab per monster in the
          fight. Survives a reload, cleared when the tab closes.
        </p>
      </div>
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
  const fillPct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  // The sheet's threshold: the number and bar go oxblood at a quarter of max,
  // not before — red is for "in trouble", never for a healthy creature.
  const low = max > 0 && current <= Math.floor(max / 4);

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
      <div className="hp-display">
        <span className="hp-big num" data-low={low || current <= 0 ? "true" : undefined}>
          {current}
          <span className="hp-slash">/</span>
          {max}
        </span>
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
          <button type="submit" className="btn-act dmg">
            Damage
          </button>
          <button type="button" className="btn-act heal" onClick={applyHeal}>
            Heal
          </button>
        </form>
      </div>
      <div className="hp-fill-track" aria-hidden="true">
        <div
          className="hp-fill-bar"
          data-low={low || current <= 0 ? "true" : undefined}
          style={{ width: `${(fillPct * 100).toFixed(1)}%` }}
        />
      </div>
      {status.text && (
        <p className="hp-status-line">
          {status.conditionId ? (
            <a href={detailHref("conditions", status.conditionId)}>{status.text}</a>
          ) : (
            status.text
          )}
          {status.regenerationCaveat && (
            <span className="hp-status-regen"> {status.regenerationCaveat}</span>
          )}
        </p>
      )}
    </div>
  );
}

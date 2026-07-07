import { useState } from "react";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addNonlethal,
  applyDamage,
  applyHealing,
  healNonlethal,
  hpState,
  restHp,
  setStable,
  setTempHp,
  type HpState,
} from "../../model/hp.js";
import type { BuilderProps } from "../builder/types.js";

/** Human-readable status line for each `hpState` result; empty for `ok` (no noise on a healthy character). */
function statusLabel(state: HpState): string {
  switch (state.status) {
    case "ok":
      return "";
    case "no-hp":
      return "No HP yet — add a class in the Build tab.";
    case "disabled":
      return "Disabled (0 HP) — staggered: one move or standard action per round; a strenuous act deals 1 more damage.";
    case "dying":
      return `Dying — losing 1 HP/round while unconscious. Dies at ${state.diesAt} HP.`;
    case "stable":
      return `Stable — unconscious, no longer losing HP. Dies at ${state.diesAt} HP if bleeding resumes.`;
    case "dead":
      return `Dead — HP at or below ${state.diesAt}.`;
    case "staggered-nonlethal":
      return "Staggered — nonlethal damage equals current HP.";
    case "unconscious-nonlethal":
      return "Unconscious — nonlethal damage exceeds current HP (not dying).";
  }
}

/** Current/temp/nonlethal HP with fast damage + healing controls. */
export function HpPanel({ doc, sheet, update }: BuilderProps) {
  const [amount, setAmount] = useState(5);
  const max = sheet.hp.max;
  const restMode = doc.build.settings?.restMode ?? "full";
  const { current, temp, nonlethal } = doc.live.hp;
  const effective = current - nonlethal;
  const isLow = max > 0 && effective <= Math.floor(max / 4);
  const fillPct = max > 0 ? Math.max(0, Math.min(1, effective / max)) : 1;

  const state = hpState(doc, sheet);
  // The stabilize toggle only makes sense in the negative-but-above-the-death-
  // threshold range regardless of the current flag value, so the player can
  // flip it on or back off while the character is actually dying.
  const dyingRange = current < 0 && current > state.diesAt;

  const amt = Number.isNaN(amount) ? 0 : amount;

  return (
    <Panel title="Hit Points" step="hp" storageKey="panel:PlayHP">
      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {max}
        </div>
        <div className="hp-side">
          {temp > 0 ? <span className="hp-chip temp num">+{temp} temp</span> : null}
          {nonlethal > 0 ? <span className="hp-chip nl num">{nonlethal} nonlethal</span> : null}
        </div>
      </div>
      <div className="hp-fill-track">
        <div className="hp-fill-bar" data-low={isLow} style={{ width: `${fillPct * 100}%` }} />
      </div>

      {state.status !== "ok" ? (
        <div
          className={`hp-status-line${state.status === "no-hp" ? "" : " affliction-warn"}`}
          data-status={state.status}
        >
          {statusLabel(state)}
        </div>
      ) : null}
      {dyingRange ? (
        <label className="hp-inline hp-stable-toggle">
          <input
            type="checkbox"
            checked={!!doc.live.stable}
            onChange={(e) => update((d) => setStable(d, e.target.checked))}
          />
          <span>Stabilized</span>
        </label>
      ) : null}

      <div className="hp-controls">
        <NumberField
          className="hp-amt num"
          size={4}
          value={amount}
          min={0}
          commitOnChange
          onCommit={(n) => setAmount(n)}
          aria-label="Amount"
        />
        <button
          type="button"
          className="btn-act dmg"
          onClick={() => update((d) => applyDamage(d, amt))}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => update((d) => applyHealing(d, amt, max))}
        >
          Heal
        </button>
      </div>

      <div className="hp-row">
        <label className="hp-inline">
          <span>Temp HP</span>
          <NumberField
            className="num"
            size={3}
            value={temp}
            min={0}
            onCommit={(n) => update((d) => setTempHp(d, n))}
            aria-label="Temporary HP"
          />
        </label>
        <div className="hp-nl">
          <span className="hp-inline-label">Nonlethal</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => addNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rest"
          title={
            restMode === "natural"
              ? `Natural rest: heal ${sheet.level} HP (1×level), clear nonlethal`
              : "Full rest: heal to max, clear nonlethal"
          }
          onClick={() => update((d) => restHp(d, max, { mode: restMode, level: sheet.level }))}
        >
          Rest ⤿
        </button>
      </div>
    </Panel>
  );
}

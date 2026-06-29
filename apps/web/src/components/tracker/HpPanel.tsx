import { useState } from "react";

import { Panel } from "../builder/Panel.js";
import {
  addNonlethal,
  applyDamage,
  applyHealing,
  healNonlethal,
  restHp,
  setTempHp,
} from "../../model/hp.js";
import type { BuilderProps } from "../builder/types.js";

/** Current/temp/nonlethal HP with fast damage + healing controls. */
export function HpPanel({ doc, sheet, update }: BuilderProps) {
  const [amount, setAmount] = useState(5);
  const max = sheet.hp.max;
  const { current, temp, nonlethal } = doc.live.hp;
  const effective = current - nonlethal;

  const amt = Number.isNaN(amount) ? 0 : amount;

  return (
    <Panel title="Hit Points" step="hp">
      <div className="hp-display">
        <div className="hp-big num" data-low={effective <= Math.floor(max / 4)}>
          {current}
          <span className="hp-slash">/</span>
          {max}
        </div>
        <div className="hp-side">
          {temp > 0 ? <span className="hp-chip temp num">+{temp} temp</span> : null}
          {nonlethal > 0 ? <span className="hp-chip nl num">{nonlethal} nonlethal</span> : null}
        </div>
      </div>

      <div className="hp-controls">
        <input
          type="number"
          className="hp-amt num"
          aria-label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.valueAsNumber)}
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
          <input
            type="number"
            className="num"
            value={temp}
            onChange={(e) => update((d) => setTempHp(d, e.target.valueAsNumber))}
          />
        </label>
        <div className="hp-nl">
          <span className="hp-inline-label">Nonlethal</span>
          <button type="button" className="btn-ghost" onClick={() => update((d) => addNonlethal(d, amt))}>
            +{amt}
          </button>
          <button type="button" className="btn-ghost" onClick={() => update((d) => healNonlethal(d, amt))}>
            −{amt}
          </button>
        </div>
        <button type="button" className="btn-ghost rest" onClick={() => update((d) => restHp(d, max))}>
          Rest ⤿
        </button>
      </div>
    </Panel>
  );
}

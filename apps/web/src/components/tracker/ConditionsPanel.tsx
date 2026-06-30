import { CONDITIONS, CONDITION_IDS } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { toggleCondition } from "../../model/conditions.js";
import type { BuilderProps } from "../builder/types.js";

/** Toggle the core PF1 conditions; the sheet's numbers update live via compute(). */
export function ConditionsPanel({ doc, update }: BuilderProps) {
  const active = new Set(doc.live.conditions);

  return (
    <Panel
      title="Conditions"
      step="cd"
      storageKey="panel:Conditions"
      right={<span className="hint">{active.size} active</span>}
    >
      <div className="chips">
        {CONDITION_IDS.map((id) => {
          const cond = CONDITIONS[id]!;
          const on = active.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`chip cond${cond.displayOnly ? " display-only" : ""}`}
              aria-pressed={on}
              title={cond.summary}
              onClick={() => update((d) => toggleCondition(d, id))}
            >
              {cond.name}
              {cond.displayOnly ? <span className="dot" title="Display-only (no flat modifier)">·</span> : null}
            </button>
          );
        })}
      </div>
      {active.size > 0 ? (
        <ul className="cond-notes">
          {[...active].map((id) => {
            const cond = CONDITIONS[id];
            if (!cond) return null;
            return (
              <li key={id}>
                <b>{cond.name}.</b> {cond.summary}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">No conditions. Toggle one to see the sheet recompute.</div>
      )}
    </Panel>
  );
}

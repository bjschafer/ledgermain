import { CONDITIONS, CONDITION_IDS } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { supersedingCondition, toggleCondition } from "../../model/conditions.js";
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
          const supersededBy = supersedingCondition(doc, id);
          const implied = supersededBy !== undefined;
          const impliedName = supersededBy ? CONDITIONS[supersededBy]?.name : undefined;
          return (
            <button
              key={id}
              type="button"
              className={`chip cond${cond.displayOnly ? " display-only" : ""}${implied ? " implied" : ""}`}
              aria-pressed={on}
              disabled={implied}
              title={
                implied
                  ? `Implied by ${impliedName} — that's the stricter condition on this ladder. Turn ${impliedName} off to control ${cond.name} directly.`
                  : cond.displayOnly
                    ? `${cond.summary} (display-only — not wired to the engine, no flat modifier applied)`
                    : cond.summary
              }
              onClick={() => update((d) => toggleCondition(d, id))}
            >
              {cond.name}
              {implied ? (
                <span className="dot" title={`Implied by ${impliedName}`}>
                  ▲
                </span>
              ) : cond.displayOnly ? (
                <span className="dot" title="Display-only (no flat modifier)">
                  ·
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="hint cond-legend">
        Dashed border = display-only, not wired to a numeric modifier yet. ▲ = implied by a stricter
        condition on the same ladder (e.g. frightened implies shaken); turn the stricter one off to
        toggle this directly.
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

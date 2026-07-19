import { CONDITIONS, CONDITION_IDS } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { supersedingCondition, toggleCondition } from "../../model/conditions.js";
import { Explainer } from "../Explainer.js";
import { InfoTip } from "../InfoTip.js";
import { AlertTriangleIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/** Toggle the core PF1 conditions; the sheet's numbers update live via compute(). */
export function ConditionsPanel({ doc, update }: BuilderProps) {
  const active = new Set(doc.live.conditions);

  return (
    <Panel
      title="Conditions"
      step="cd"
      icon={<AlertTriangleIcon />}
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
          // Full explanation of the chip's state — the only place this text
          // lives, so it needs a tap-reachable form too (issue #60), not just
          // the button's `title=` (invisible on touch).
          const tipContent = implied
            ? `Implied by ${impliedName} — that's the stricter condition on this ladder. Turn ${impliedName} off to control ${cond.name} directly.`
            : cond.displayOnly
              ? `${cond.summary} (reference only — no numeric modifier applied)`
              : cond.summary;
          return (
            <span key={id} className="chip-wrap">
              <button
                type="button"
                className={`chip cond${cond.displayOnly ? " display-only" : ""}${implied ? " implied" : ""}`}
                aria-pressed={on}
                disabled={implied}
                title={tipContent}
                onClick={() => update((d) => toggleCondition(d, id))}
              >
                {cond.name}
                {implied ? (
                  <span className="dot" aria-hidden="true">
                    ▲
                  </span>
                ) : cond.displayOnly ? (
                  <span className="dot" aria-hidden="true">
                    °
                  </span>
                ) : null}
              </button>
              <InfoTip className="chip-info" content={tipContent}>
                ⓘ
              </InfoTip>
            </span>
          );
        })}
      </div>
      <Explainer title="What the chip markers mean">
        <p className="hint">
          Dashed + ° = reference only (doesn't change numbers yet). ▲ = implied by a stricter
          condition on the same ladder (e.g. frightened implies shaken); turn the stricter one off
          to toggle this directly.
        </p>
      </Explainer>
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

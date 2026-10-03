import { CONDITIONS, CONDITION_IDS, EFFECT_IMMUNITY_LABELS } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  conditionImmunityFor,
  conditionRoundsLeft,
  setConditionRounds,
  supersedingCondition,
  toggleCondition,
} from "../../model/conditions.js";
import { Explainer } from "../Explainer.js";
import { InfoTip } from "../InfoTip.js";
import { AlertTriangleIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * The chips split on `displayOnly`, the one distinction that holds still.
 * A flat list needed a legend to explain that some chips move numbers and
 * some are bookkeeping; two headed groups say it without the legend. The
 * other two markers (implied, immune) stay markers rather than groups
 * because they depend on live state, and chips that rearrange themselves as
 * you toggle things are worse than a marker to learn.
 */
const SCORING_CONDITION_IDS = CONDITION_IDS.filter((id) => !CONDITIONS[id]!.displayOnly);
const REFERENCE_CONDITION_IDS = CONDITION_IDS.filter((id) => CONDITIONS[id]!.displayOnly);

/** Toggle the core PF1 conditions; the sheet's numbers update live via compute(). */
export function ConditionsPanel({ doc, sheet, update }: BuilderProps) {
  const active = new Set(doc.live.conditions);

  const renderChips = (ids: readonly (typeof CONDITION_IDS)[number][]) => (
    <div className="chips">
      {ids.map((id) => {
        const cond = CONDITIONS[id]!;
        const on = active.has(id);
        const supersededBy = supersedingCondition(doc, id);
        const implied = supersededBy !== undefined;
        const impliedName = supersededBy ? CONDITIONS[supersededBy]?.name : undefined;
        // Full explanation of the chip's state — the only place this text
        // lives, so it needs a tap-reachable form too, not just the button's
        // `title=` (invisible on touch).
        const roundsLeft = conditionRoundsLeft(doc, id);
        const immuneTo = conditionImmunityFor(sheet, id);
        const tipContent = immuneTo
          ? `You're immune to ${EFFECT_IMMUNITY_LABELS[immuneTo]}, so this shouldn't normally apply. Toggling it anyway is still allowed, since your GM may have a reason.`
          : implied
            ? `Implied by ${impliedName}, the stricter condition on this ladder. Turn ${impliedName} off to control ${cond.name} directly.`
            : cond.displayOnly
              ? `${cond.summary} (reference only; no numeric modifier applied)`
              : roundsLeft !== undefined
                ? `${cond.summary} Ends in ${roundsLeft} round${roundsLeft === 1 ? "" : "s"}; the round clock clears it.`
                : cond.summary;
        return (
          <span key={id} className="chip-wrap">
            <button
              type="button"
              className={`chip cond${cond.displayOnly ? " display-only" : ""}${implied ? " implied" : ""}${immuneTo ? " immune" : ""}`}
              aria-pressed={on}
              disabled={implied}
              title={tipContent}
              onClick={() => update((d) => toggleCondition(d, id))}
            >
              {cond.name}
              {roundsLeft !== undefined ? (
                <span className="cond-rounds"> {roundsLeft}r</span>
              ) : null}
              {immuneTo ? (
                <span className="dot" aria-hidden="true">
                  ⊘
                </span>
              ) : implied ? (
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
  );

  return (
    <Panel
      title="Conditions"
      step="cd"
      icon={<AlertTriangleIcon />}
      storageKey="panel:Conditions"
      right={<span className="hint">{active.size} active</span>}
    >
      {renderChips(SCORING_CONDITION_IDS)}
      <h4 className="cond-group-label">Reference only</h4>
      {renderChips(REFERENCE_CONDITION_IDS)}
      <Explainer title="What the chip markers mean">
        <p className="hint">
          The conditions under "Reference only" are bookkeeping: they don't change any number on the
          sheet yet. ▲ = implied by a stricter condition on the same ladder (e.g. frightened implies
          shaken); turn the stricter one off to toggle this directly. ⊘ = something you're immune
          to; you can still toggle it, since only your table knows why. A round count (e.g. "10r")
          means the condition has a known duration, and advancing the round clock counts it down and
          clears it. Set the "Rounds left" field below to give an active condition a duration, or
          clear it to leave the condition on indefinitely.
        </p>
      </Explainer>
      {active.size > 0 ? (
        <ul className="cond-notes">
          {[...active].map((id) => {
            const cond = CONDITIONS[id];
            if (!cond) return null;
            return (
              <li key={id}>
                <div className="cond-note-text">
                  <b>{cond.name}.</b> {cond.summary}
                </div>
                <label className="cond-rounds-edit">
                  <span className="hint">Rounds left</span>
                  <NumberField
                    className="num"
                    size={3}
                    stepper={false}
                    allowEmpty
                    placeholder="∞"
                    value={conditionRoundsLeft(doc, id)}
                    onCommit={(n) => update((d) => setConditionRounds(d, id, n))}
                    aria-label={`${cond.name} rounds left`}
                  />
                </label>
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

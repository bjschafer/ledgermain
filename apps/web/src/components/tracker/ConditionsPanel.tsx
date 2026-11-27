import { CONDITIONS, CONDITION_IDS, EFFECT_IMMUNITY_LABELS, type ConditionDef } from "@pf1/engine";

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
import { TipButton } from "../InfoTip.js";
import { AlertTriangleIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/** What a player has to apply by hand, or should question, beyond the summary. */
function conditionCaveats(cond: ConditionDef, immuneTo: string | undefined): string {
  const parts: string[] = [];
  if (immuneTo) {
    parts.push(
      `You're immune to ${EFFECT_IMMUNITY_LABELS[immuneTo]}, so it shouldn't normally apply.`,
    );
  }
  if (cond.displayOnly) parts.push("Reminder only: the sheet's numbers don't change.");
  return parts.join(" ");
}

function withCaveats(text: string, caveats: string): string {
  return caveats ? `${text} ${caveats}` : text;
}

/** Toggle the core PF1 conditions; the sheet's numbers update live via compute(). */
export function ConditionsPanel({ doc, sheet, update }: BuilderProps) {
  const active = new Set(doc.live.conditions);
  const impliedBy = new Map<string, string>();
  for (const id of CONDITION_IDS) {
    const by = supersedingCondition(doc, id);
    if (by) impliedBy.set(id, by);
  }

  return (
    <Panel
      title="Conditions"
      icon={<AlertTriangleIcon />}
      storageKey="panel:Conditions"
      right={<span className="hint">{active.size} active</span>}
    >
      <div className="chips">
        {CONDITION_IDS.map((id) => {
          const cond = CONDITIONS[id]!;
          const supersededBy = impliedBy.get(id);
          const impliedName = supersededBy ? CONDITIONS[supersededBy]?.name : undefined;
          const roundsLeft = conditionRoundsLeft(doc, id);
          const immuneTo = conditionImmunityFor(sheet, id);
          return (
            <TipButton
              key={id}
              className={`chip cond${impliedName ? " implied" : ""}${immuneTo ? " immune" : ""}`}
              // An implied condition is in effect through its stricter sibling.
              aria-pressed={active.has(id) || impliedName !== undefined}
              disabled={impliedName !== undefined}
              disabledReason={`Included in ${impliedName}. Turn ${impliedName} off to set ${cond.name} on its own.`}
              title={withCaveats(cond.summary, conditionCaveats(cond, immuneTo))}
              onClick={() => update((d) => toggleCondition(d, id))}
            >
              {cond.name}
              {roundsLeft !== undefined ? (
                <span className="cond-rounds"> {roundsLeft}r</span>
              ) : null}
              {immuneTo ? (
                <span className="cond-immune" aria-hidden="true">
                  ⊘
                </span>
              ) : null}
            </TipButton>
          );
        })}
      </div>
      {active.size > 0 ? (
        <ul className="cond-notes">
          {[...active].map((id) => {
            const cond = CONDITIONS[id];
            if (!cond) return null;
            const included = CONDITION_IDS.filter((other) => impliedBy.get(other) === id).map(
              (other) => CONDITIONS[other]?.name,
            );
            const caveats = conditionCaveats(cond, conditionImmunityFor(sheet, id));
            return (
              <li key={id}>
                <div className="cond-note-text">
                  <b>{cond.name}.</b> {cond.summary}
                  {included.length > 0 ? ` Includes ${included.join(" and ")}.` : null}
                  {caveats ? <span className="cond-caveat"> {caveats}</span> : null}
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
      <Explainer title="What each condition does">
        <ul className="cond-notes cond-glossary">
          {CONDITION_IDS.map((id) => {
            const cond = CONDITIONS[id]!;
            const caveats = conditionCaveats(cond, conditionImmunityFor(sheet, id));
            return (
              <li key={id}>
                <div className="cond-note-text">
                  <b>{cond.name}.</b> {cond.summary}
                  {caveats ? <span className="cond-caveat"> {caveats}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Explainer>
    </Panel>
  );
}

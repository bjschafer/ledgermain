import { CONDITIONS, CONDITION_IDS, EFFECT_IMMUNITY_LABELS, type ConditionDef } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Explainer } from "../Explainer.js";
import { TipButton } from "../InfoTip.js";

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

/**
 * The condition toggle grid shared by the character and every tracked
 * creature: chips, a note row per active condition, and a lookup list of all
 * of them. The lookup list is what keeps an inactive condition readable on
 * touch, since toggling one to read it isn't free (a stricter ladder member
 * removes the milder one, and turning it off doesn't restore it). Devices that
 * can hover read the chip's `title` instead, so CSS hides the list there.
 */
export function ConditionChips({
  isActive,
  supersededBy,
  onToggle,
  immunityFor,
  rounds,
  emptyText,
}: {
  isActive: (id: string) => boolean;
  /** The active stricter ladder sibling that covers `id`, if any. */
  supersededBy: (id: string) => string | undefined;
  onToggle: (id: string) => void;
  immunityFor?: (id: string) => string | undefined;
  /** Per-condition durations; only the character's conditions carry them. */
  rounds?: {
    get: (id: string) => number | undefined;
    set: (id: string, n: number | undefined) => void;
  };
  emptyText?: string;
}) {
  const impliedBy = new Map<string, string>();
  for (const id of CONDITION_IDS) {
    const by = supersededBy(id);
    if (by) impliedBy.set(id, by);
  }
  const activeIds = CONDITION_IDS.filter(isActive);

  return (
    <>
      <div className="chips">
        {CONDITION_IDS.map((id) => {
          const cond = CONDITIONS[id]!;
          const by = impliedBy.get(id);
          const impliedName = by ? CONDITIONS[by]?.name : undefined;
          const roundsLeft = rounds?.get(id);
          const immuneTo = immunityFor?.(id);
          const caveats = conditionCaveats(cond, immuneTo);
          return (
            <TipButton
              key={id}
              className={`chip cond${impliedName ? " implied" : ""}${immuneTo ? " immune" : ""}`}
              // An implied condition is in effect through its stricter sibling.
              aria-pressed={isActive(id) || impliedName !== undefined}
              disabled={impliedName !== undefined}
              disabledReason={`Included in ${impliedName}. Turn ${impliedName} off to set ${cond.name} on its own.`}
              title={caveats ? `${cond.summary} ${caveats}` : cond.summary}
              onClick={() => onToggle(id)}
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
      {activeIds.length > 0 ? (
        <ul className="cond-notes">
          {activeIds.map((id) => {
            const cond = CONDITIONS[id]!;
            const included = CONDITION_IDS.filter((other) => impliedBy.get(other) === id).map(
              (other) => CONDITIONS[other]?.name,
            );
            const caveats = conditionCaveats(cond, immunityFor?.(id));
            return (
              <li key={id}>
                <div className="cond-note-text">
                  <b>{cond.name}.</b> {cond.summary}
                  {included.length > 0 ? ` Includes ${included.join(" and ")}.` : null}
                  {caveats ? <span className="cond-caveat"> {caveats}</span> : null}
                </div>
                {rounds ? (
                  <label className="cond-rounds-edit">
                    <span className="hint">Rounds left</span>
                    <NumberField
                      className="num"
                      size={3}
                      stepper={false}
                      allowEmpty
                      placeholder="∞"
                      value={rounds.get(id)}
                      onCommit={(n) => rounds.set(id, n)}
                      aria-label={`${cond.name} rounds left`}
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : emptyText ? (
        <div className="empty">{emptyText}</div>
      ) : null}
      <Explainer className="cond-glossary-explainer" title="What each condition does">
        <ul className="cond-notes cond-glossary">
          {CONDITION_IDS.map((id) => {
            const cond = CONDITIONS[id]!;
            const caveats = conditionCaveats(cond, immunityFor?.(id));
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
    </>
  );
}

import type { ConditionDef } from "@pf1/engine";

import { detailHref } from "../hooks/useHashRoute.js";
import type { IndexEntry } from "../shared/indexCodec.js";

/**
 * A condition's own summary, plus the RAW severity ladder it belongs to when it
 * has one — "is frightened worse than shaken, and do they stack?" is the actual
 * table question, and the answer is that only the severest rung counts.
 */
export function ConditionView({
  condition,
  ladders,
  names,
}: {
  condition: ConditionDef;
  ladders: string[][];
  names: Map<string, string>;
}) {
  const ladder = ladders.find((chain) => chain.includes(condition.id));

  return (
    <>
      <p className="condition-summary">{condition.summary}</p>

      {ladder && (
        <div className="ladder">
          <span className="ladder-label">Severity ladder</span>
          <ol className="ladder-chain">
            {ladder.map((id) => (
              <li key={id} className={id === condition.id ? "is-current" : undefined}>
                {id === condition.id ? (
                  <span>{names.get(id) ?? id}</span>
                ) : (
                  <a href={detailHref("conditions", id)}>{names.get(id) ?? id}</a>
                )}
              </li>
            ))}
          </ol>
          <p className="ladder-note">
            Mildest to severest. Only the severest one you have applies — their effects don&apos;t
            stack.
          </p>
        </div>
      )}

      {condition.contextNotes && condition.contextNotes.length > 0 && (
        <ul className="note-list">
          {condition.contextNotes.map((note) => (
            <li key={`${note.target}-${note.text}`}>{note.text}</li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Names for every condition in the index, for the ladder's cross-links. */
export function conditionNames(entries: readonly IndexEntry[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const entry of entries) {
    if (entry.collection === "conditions") names.set(entry.id, entry.name);
  }
  return names;
}

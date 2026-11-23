import { getNegativeLevels } from "../../model/afflictions.js";
import { restNewDay } from "../../model/rest.js";
import { showToast } from "../../state/toast.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * One-click "new day" rest. Composes the HP, ability-damage, resource-pool,
 * and prepared/spontaneous-spell resets. The independent panel buttons (HP's
 * Rest, Resources' Refill all, each caster's Refresh slots) stay put for a
 * solo top-off mid-session, e.g. just draining a wand, which doesn't warrant
 * a full rest.
 *
 * Temporary negative levels are never auto-cleared by rest (PF1 RAW requires
 * a Fortitude save 24h after each was gained, rolled at the table) — while
 * any are present this bar shows a standing reminder, not just right after
 * clicking "New day".
 *
 * A full New Day would otherwise reset HP/slots/pools/buffs with no receipt of
 * what changed and no way back from a fat-fingered click. `restNewDay`'s
 * `summary` gives the receipt; the toast's Undo action restores the pre-rest
 * doc via `undoLast`.
 */
export function NewDayBar({ doc, sheet, refData, update, undoLast }: BuilderProps) {
  const tempNegLevels = getNegativeLevels(doc).temporary;

  return (
    <div className="new-day-bar">
      <button
        type="button"
        className="btn-ghost new-day"
        onClick={() => {
          const result = restNewDay(doc, sheet, refData);
          // One line for the whole rest. Diffing a New Day field by field would
          // spend a screenful of the log restating the receipt below.
          update(() => result.doc, {
            logAs: {
              text: result.summary ? `New day: ${result.summary}` : "New day",
              tone: "healing",
              kind: "rest",
            },
          });
          showToast({
            message: result.summary || "New day: nothing to refresh",
            action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
          });
        }}
      >
        New day
      </button>
      {tempNegLevels > 0 ? (
        <div className="affliction-warn new-day-reminder">
          <b>
            {tempNegLevels} temporary negative level{tempNegLevels === 1 ? "" : "s"}
          </b>
          : save to remove (Fortitude save 24h after each was gained; not cleared by rest).
        </div>
      ) : null}
    </div>
  );
}

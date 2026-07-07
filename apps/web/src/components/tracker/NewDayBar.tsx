import { getNegativeLevels } from "../../model/afflictions.js";
import { restNewDay } from "../../model/rest.js";
import { showToast } from "../../state/toast.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * One-click "new day" rest (issue #30). Composes the HP/ability-damage/
 * resource-pool/prepared-and-spontaneous-spell resets that used to live
 * behind independent panel buttons — those buttons stay put (a solo top-off
 * mid-session, e.g. just draining a wand, doesn't warrant a full rest). Sits
 * above every tracker panel since it's a cross-cutting action that doesn't
 * belong to any single one.
 *
 * Temporary negative levels are never auto-cleared by rest (PF1 RAW requires
 * a Fortitude save 24h after each was gained, rolled at the table) — while
 * any are present this bar shows a standing reminder, not just right after
 * clicking "New day".
 *
 * Feedback (UX audit: "feedback: toasts + undo") — a full New Day silently
 * resets HP/slots/pools/buffs with no receipt of what changed, and no way
 * back from a fat-fingered click. `restNewDay`'s `summary` gives the receipt;
 * the toast's Undo action restores the pre-rest doc via `undoLast()`.
 */
export function NewDayBar({ doc, sheet, refData, update, undoLast }: BuilderProps) {
  const tempNegLevels = getNegativeLevels(doc).temporary;

  return (
    <div className="new-day-bar">
      <button
        type="button"
        className="btn-act new-day"
        onClick={() => {
          const result = restNewDay(doc, sheet, refData);
          update(() => result.doc);
          showToast({
            message: result.summary || "New day — nothing to refresh",
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
          </b>{" "}
          — save to remove (Fortitude save 24h after each was gained; not cleared by rest).
        </div>
      ) : null}
    </div>
  );
}

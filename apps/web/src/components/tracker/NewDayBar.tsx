import { getNegativeLevels } from "../../model/afflictions.js";
import { restNewDay } from "../../model/rest.js";
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
 */
export function NewDayBar({ doc, sheet, refData, update }: BuilderProps) {
  const tempNegLevels = getNegativeLevels(doc).temporary;

  return (
    <div className="new-day-bar">
      <button
        type="button"
        className="btn-act new-day"
        onClick={() => update((d) => restNewDay(d, sheet, refData).doc)}
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

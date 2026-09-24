import type { Change, CharacterDoc } from "@pf1/schema";

import {
  CREATURE_CHANGE_TARGET_GROUPS,
  changesToDrafts,
  draftsToChanges,
} from "../../model/changeEditor.js";
import { setCreatureChanges, type CreatureBuildKey } from "../../model/creatureChanges.js";
import { ChangeListEditor } from "./ChangeListEditor.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

/**
 * "Permanent bonuses" for a tracked creature. Rows are read straight off the
 * doc rather than held as local drafts, so a row set to 0 drops out on commit.
 */
export function CreatureChangesEditor({
  creatureKey,
  changes,
  update,
}: {
  creatureKey: CreatureBuildKey;
  changes: readonly Change[] | undefined;
  update: Updater;
}) {
  return (
    <div className="creature-changes">
      <span className="hint">
        Permanent bonuses, such as a GM reward. They apply to this creature only, not to you.
      </span>
      <ChangeListEditor
        drafts={changesToDrafts(changes ?? [])}
        onChange={(next) =>
          update((d) => setCreatureChanges(d, creatureKey, draftsToChanges(next)))
        }
        targetGroups={CREATURE_CHANGE_TARGET_GROUPS}
      />
    </div>
  );
}

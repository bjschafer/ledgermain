import { unappliedChanges } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";
import type { TraitDef } from "@pf1/engine";

import { changeTargetLabel } from "../../model/names.js";
import { toggleTrait } from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";

/** One trait row — shared by the panel's chosen list and the picker's catalog. */
export function TraitRow({
  trait,
  selected,
  update,
}: {
  trait: TraitDef;
  selected: boolean;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
}) {
  const missing = unappliedChanges(trait.changes);
  return (
    <div className={`pick-row${selected ? " is-selected" : ""}`}>
      <div className="pmain">
        <div className="pname">
          {trait.name} <HomebrewBadge id={trait.id} />
          <span className="tag-bloodline" title={`${trait.category} trait`}>
            {trait.category}
          </span>
          {missing.length > 0 ? (
            <InfoTip
              className="soft"
              content={`Not auto-applied: ${missing.map((c) => changeTargetLabel(c.target)).join(", ")}`}
            >
              ⚠ partial
            </InfoTip>
          ) : null}
        </div>
        <div className="preq">
          <span className="soft">{trait.summary}</span>
        </div>
      </div>
      <button
        type="button"
        className={`pick-btn ${selected ? "remove" : "add"}`}
        onClick={() => update((d) => toggleTrait(d, trait.id))}
      >
        {selected ? "Remove" : "Add"}
      </button>
    </div>
  );
}

import { unappliedChanges } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";
import type { TraitDef } from "@pf1/engine";

import { changeTargetLabel } from "../../model/names.js";
import { toggleTrait } from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

/**
 * One trait row — shared by the panel's chosen list and the picker's
 * catalog. Hand-authored/homebrew entries carry a `summary` one-liner; a
 * vendored catalog entry (issue #74 Phase 1) instead surfaces its full HTML
 * `description` in the same collapsible `<details>` `FeatEntry` uses for
 * feats, so prose-only traits (the majority of the ~2,000-entry catalog)
 * aren't left with a blank row.
 */
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
        {trait.summary ? (
          <div className="preq">
            <span className="soft">{trait.summary}</span>
          </div>
        ) : null}
        {trait.contextNotes?.map((note, i) => (
          <div key={i} className="hint" style={{ marginTop: 2 }}>
            ⚠ {note.text}
          </div>
        ))}
        {trait.description ? <FeatureDescription html={trait.description} /> : null}
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

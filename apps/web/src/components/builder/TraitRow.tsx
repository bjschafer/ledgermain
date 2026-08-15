import { unappliedChanges } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";
import type { TraitDef } from "@pf1/engine";

import { changeTargetLabel } from "../../model/names.js";
import { contextNoteCoverage } from "../../model/rulesNotes.js";
import {
  setTraitChoice,
  toggleTrait,
  traitChoice,
  traitChoiceDescriptor,
} from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";
import { RulesNote } from "../RulesNote.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

/**
 * One trait row — shared by the panel's chosen list and the picker's catalog.
 * Hand-authored/homebrew entries carry a `summary` one-liner; a vendored
 * catalog entry instead surfaces its full HTML `description` in the same
 * collapsible `<details>` `FeatEntry` uses for feats, so prose-only traits
 * (the majority of the ~2,000-entry catalog) aren't left with a blank row.
 * A trait declaring a `TRAIT_CHOICES` entry (Deep Cover's Bluff-or-Disguise
 * class skill) gets a select once taken, mirroring `RagePowerPicker`'s
 * choose-one dropdown; `doc` is optional purely so a caller that doesn't
 * have one handy still compiles; every current caller passes it.
 */
export function TraitRow({
  trait,
  selected,
  update,
  doc,
}: {
  trait: TraitDef;
  selected: boolean;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  doc?: CharacterDoc;
}) {
  const missing = unappliedChanges(trait.changes);
  const choiceDescriptor = traitChoiceDescriptor(trait.id);
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
          <RulesNote
            key={i}
            text={note.text}
            appliedAutomatically={
              contextNoteCoverage({ catalog: "characterTrait" }, note) === "full"
            }
          />
        ))}
        {selected && doc && choiceDescriptor ? (
          <label className="hint" style={{ marginTop: 2, display: "block" }}>
            {choiceDescriptor.label}:{" "}
            <select
              value={traitChoice(doc, trait.id) ?? ""}
              onChange={(e) =>
                update((d2) => setTraitChoice(d2, trait.id, e.target.value || undefined))
              }
            >
              <option value="">Choose</option>
              {choiceDescriptor.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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

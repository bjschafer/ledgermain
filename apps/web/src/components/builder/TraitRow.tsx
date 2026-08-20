import { unappliedChanges } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";
import type { TraitDef } from "@pf1/engine";

import { metamagicDiscountSpellOptions, metamagicDiscountTrait } from "../../model/metamagic.js";
import { changeTargetLabel } from "../../model/names.js";
import { contextNoteCoverage } from "../../model/rulesNotes.js";
import {
  setTraitChoice,
  toggleTrait,
  traitChoice,
  traitChoiceDescriptor,
  traitChoiceIsFamily,
  traitChoiceOptions,
} from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";
import { RulesNote } from "../RulesNote.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

/** Title-cased family name, for the family-choice label and empty-state hint. */
const FAMILY_LABEL: Readonly<Record<string, string>> = {
  craft: "Craft",
  perform: "Perform",
  profession: "Profession",
};

/**
 * One trait row — shared by the panel's chosen list and the picker's catalog.
 * Hand-authored/homebrew entries carry a `summary` one-liner; a vendored
 * catalog entry instead surfaces its full HTML `description` in the same
 * collapsible `<details>` `FeatEntry` uses for feats, so prose-only traits
 * (the majority of the ~2,000-entry catalog) aren't left with a blank row.
 * A trait declaring a `TRAIT_CHOICES` entry (Deep Cover's Bluff-or-Disguise
 * class skill; Clan Artisan's own-Craft-instance pick) gets a select once
 * taken, mirroring `RagePowerPicker`'s choose-one dropdown and, for a
 * family-shaped choice, `FeatEntry`'s craft/perform/profession picker (same
 * empty-state hint when the character has no instance of that family yet).
 * `doc`/`refData` are optional purely so a caller that doesn't have them
 * handy still compiles; every current caller passes both.
 */
export function TraitRow({
  trait,
  selected,
  update,
  doc,
  refData,
}: {
  trait: TraitDef;
  selected: boolean;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  doc?: CharacterDoc;
  refData?: RefData;
}) {
  const missing = unappliedChanges(trait.changes);
  // Metamagic-discount traits (Magical Lineage, Wayang Spellhunter) name ONE
  // chosen spell; the pick feeds the spell panels' slot math (see
  // `model/metamagic.ts`) and is stored in the same `pickChoices` slot as
  // every other trait choice.
  const spellChoice = metamagicDiscountTrait(trait);
  const spellOptions =
    selected && refData && spellChoice
      ? metamagicDiscountSpellOptions(refData, spellChoice.maxSpellLevel)
      : [];
  const choiceDescriptor = traitChoiceDescriptor(trait.id);
  const choiceOptions =
    selected && doc && refData && choiceDescriptor
      ? traitChoiceOptions(doc, refData, trait.id)
      : [];
  const familyHint =
    choiceDescriptor && traitChoiceIsFamily(choiceDescriptor)
      ? `Add a ${choiceDescriptor.families.map((f) => FAMILY_LABEL[f] ?? f).join(", ")} skill (in the Skills section) to enable this picker.`
      : null;
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
        {selected && doc && choiceDescriptor && choiceOptions.length > 0 ? (
          <label className="hint" style={{ marginTop: 2, display: "block" }}>
            {choiceDescriptor.label}:{" "}
            <select
              value={traitChoice(doc, trait.id) ?? ""}
              onChange={(e) =>
                update((d2) => setTraitChoice(d2, trait.id, e.target.value || undefined))
              }
            >
              <option value="">Choose</option>
              {choiceOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {selected && choiceDescriptor && choiceOptions.length === 0 && familyHint ? (
          <div className="hint" style={{ marginTop: 2 }}>
            {familyHint}
          </div>
        ) : null}
        {selected && doc && spellChoice && spellOptions.length > 0 ? (
          <label className="hint" style={{ marginTop: 2, display: "block" }}>
            Chosen spell:{" "}
            <select
              value={traitChoice(doc, trait.id) ?? ""}
              onChange={(e) =>
                update((d2) => setTraitChoice(d2, trait.id, e.target.value || undefined))
              }
            >
              <option value="">Choose</option>
              {spellOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} (level {o.level})
                </option>
              ))}
            </select>{" "}
            <span className="soft">
              Metamagic applied to the chosen spell costs 1 slot level less; the spell panels apply
              it automatically.
            </span>
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

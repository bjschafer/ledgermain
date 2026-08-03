import { useMemo } from "react";

import type { CharacterDoc, ElementalSchoolTag, RefData, WizardSchoolTag } from "@pf1/schema";

import { setWizardFocusedSchool, setWizardSchool } from "../../model/doc.js";
import {
  ELEMENTAL_SCHOOL_LABELS,
  ELEMENTAL_SCHOOL_TAGS,
  isElementalSchoolTag,
  SCHOOL_LABELS,
  SCHOOL_TAGS,
} from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { ElementalOppositionPicker, OppositionPicker } from "./OppositionPicker.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface SchoolPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Wizard specialization school (PF1 chooses one at L1, or remains a
 * Universalist). A specialist gains one bonus prepared slot per accessible
 * spell level (1–9), exclusive to their school, plus two opposition schools
 * (see `OppositionPicker`, rendered inline here once a specialist school is
 * chosen). A Universalist gains NO bonus slot — their compensation is
 * arcane-school powers (Hand of the Apprentice, Metamagic Mastery), which
 * ARE surfaced: `@pf1/engine`'s `collectGrantedFeatures` grants every school's
 * powers (including an implicit Universalist's) into `classFeatures`, shown
 * below via `FeatureDescription` and in the builder's Class Features list.
 */
export function SchoolPicker({ doc, refData, update }: SchoolPickerProps) {
  const isWizard = doc.identity.classes.some((c) => c.tag === "wizard");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:ArcaneSchool", false);
  const schoolByTag = useMemo(
    () => new Map(Object.values(refData.wizardSchools).map((s) => [s.tag, s])),
    [refData],
  );
  const focusedSchoolsByParent = useMemo(() => {
    const map = new Map<string, { tag: string; name: string }[]>();
    for (const f of Object.values(refData.focusedSchools)) {
      const list = map.get(f.parentTag) ?? [];
      list.push({ tag: f.tag, name: f.name });
      map.set(f.parentTag, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.tag.localeCompare(b.tag));
    return map;
  }, [refData]);
  const focusedSchoolByTag = useMemo(
    () => new Map(Object.values(refData.focusedSchools).map((f) => [f.tag, f])),
    [refData],
  );
  if (!isWizard) return null;

  const chosen = doc.build.wizardSchool ?? "";
  const school = schoolByTag.get(chosen || "uni");
  const isElemental = isElementalSchoolTag(chosen);
  const chosenLabel = isElemental
    ? ELEMENTAL_SCHOOL_LABELS[chosen as ElementalSchoolTag]
    : chosen
      ? SCHOOL_LABELS[chosen as WizardSchoolTag]
      : null;
  const focusOptions = chosen ? (focusedSchoolsByParent.get(chosen) ?? []) : [];
  const chosenFocus = doc.build.wizardFocusedSchool
    ? focusedSchoolByTag.get(doc.build.wizardFocusedSchool)
    : undefined;

  return (
    <div className="subsection school-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          Arcane School
          {chosenLabel ? (
            <span className="hint">
              {" "}
              · {chosenLabel}
              {chosenFocus ? ` (${chosenFocus.name})` : ""}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint school-picker-hint">
            Pick one specialization (PF1 grants one at level 1), or remain a Universalist. A
            specialist gains one bonus prepared slot per accessible spell level, exclusive to that
            school, and must pick two opposition schools. A Universalist gains no bonus slot: their
            compensation is arcane-school powers (Hand of the Apprentice, Metamagic Mastery),
            granted below and in Class Features regardless of which school you pick. An elemental
            school (APG variant rule) works the same way, except its bonus slot draws from the
            school's own spell list and it opposes a single element rather than two schools.
          </p>
          <select
            className="school-select"
            value={chosen}
            onChange={(e) => {
              const value = e.target.value;
              update((d) =>
                setWizardSchool(
                  d,
                  value ? (value as WizardSchoolTag | ElementalSchoolTag) : null,
                  refData,
                ),
              );
            }}
          >
            <option value="">None chosen</option>
            <optgroup label="Standard Schools">
              {SCHOOL_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {SCHOOL_LABELS[tag]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Elemental Schools">
              {ELEMENTAL_SCHOOL_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {ELEMENTAL_SCHOOL_LABELS[tag]}
                </option>
              ))}
            </optgroup>
          </select>

          {focusOptions.length > 0 && (
            <>
              <p className="hint school-picker-hint">
                {chosenLabel} offers a focused school: an optional narrower specialization that
                trades one or two of its granted powers for its own. Everything else about the
                school (spell list, opposition schools, bonus slot) stays the same.
              </p>
              <select
                className="school-select focused-school-select"
                value={doc.build.wizardFocusedSchool ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  update((d) => setWizardFocusedSchool(d, value || null));
                }}
              >
                <option value="">Standard school</option>
                {focusOptions.map((f) => (
                  <option key={f.tag} value={f.tag}>
                    {f.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {chosen && chosen !== "uni" && !isElemental && (
            <OppositionPicker doc={doc} update={update} />
          )}
          {isElemental && <ElementalOppositionPicker doc={doc} school={school} update={update} />}

          {(chosenFocus?.description ?? school?.description) && (
            <div className="domain-description">
              <span className="hint">{chosenFocus?.name ?? school?.name}</span>
              <FeatureDescription html={(chosenFocus?.description ?? school?.description)!} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

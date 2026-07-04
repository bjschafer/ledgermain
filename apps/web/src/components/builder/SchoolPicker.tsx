import { useMemo } from "react";

import type { CharacterDoc, RefData, WizardSchoolTag } from "@pf1/schema";

import { setWizardSchool } from "../../model/doc.js";
import { SCHOOL_LABELS, SCHOOL_TAGS } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { OppositionPicker } from "./OppositionPicker.js";

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
  if (!isWizard) return null;

  const chosen = doc.build.wizardSchool ?? "";
  const school = schoolByTag.get(chosen || "uni");

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
          {chosen ? (
            <span className="hint"> · {SCHOOL_LABELS[chosen as WizardSchoolTag]}</span>
          ) : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint school-picker-hint">
            Pick one specialization (PF1 grants one at level 1), or remain a Universalist. A
            specialist gains one bonus prepared slot per accessible spell level, exclusive to that
            school, and must pick two opposition schools. A Universalist gains no bonus slot — their
            compensation is arcane-school powers (Hand of the Apprentice, Metamagic Mastery),
            granted below and in Class Features regardless of which school you pick.
          </p>
          <select
            className="school-select"
            value={chosen}
            onChange={(e) => {
              const value = e.target.value;
              update((d) => setWizardSchool(d, value ? (value as WizardSchoolTag) : null));
            }}
          >
            <option value="">— none chosen —</option>
            {SCHOOL_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {SCHOOL_LABELS[tag]}
              </option>
            ))}
          </select>

          {chosen && chosen !== "uni" && <OppositionPicker doc={doc} update={update} />}

          {school?.description && (
            <div className="domain-description">
              <span className="hint">{school.name}</span>
              <FeatureDescription html={school.description} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

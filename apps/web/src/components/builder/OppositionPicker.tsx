import type { CharacterDoc, ElementalSchoolTag, WizardSchool, WizardSchoolTag } from "@pf1/schema";

import { setWizardOppositionElement, setWizardOppositionSchools } from "../../model/doc.js";
import { ELEMENTAL_SCHOOL_LABELS, SCHOOL_LABELS, SCHOOL_TAGS } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface OppositionPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * A specialist wizard's two opposition schools (PF1 requires exactly two,
 * chosen from the seven schools other than the specialization and
 * Universalist). Free-choice — no "opposition can't equal specialization"
 * hard block (soft-warning posture, matching the cleric domain free-choice
 * policy); a school picked as both specialization and opposition is simply
 * excluded from the opposition options here. Rendered only for a specialist
 * (hidden for Universalist, which has no opposition schools) by the caller,
 * `SchoolPicker`.
 */
export function OppositionPicker({ doc, update }: OppositionPickerProps) {
  const school = doc.build.wizardSchool;
  const chosen = doc.build.wizardOppositionSchools ?? [];
  const options = SCHOOL_TAGS.filter((tag) => tag !== "uni" && tag !== school);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:OppositionSchools", false);

  function toggle(tag: string) {
    const set = new Set(chosen);
    if (set.has(tag)) set.delete(tag);
    else if (set.size < 2) set.add(tag);
    update((d) => setWizardOppositionSchools(d, [...set]));
  }

  return (
    <div className="subsection opposition-picker">
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
          Opposition Schools
          {chosen.length > 0 ? <span className="hint"> · {chosen.length} chosen</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint opposition-picker-hint">
            Pick two opposition schools (PF1 requires two for a specialist). Preparing a spell from
            an opposition school costs two slots instead of one.
          </p>
          <div className="chips opposition-chips">
            {options.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip"
                aria-pressed={chosen.includes(tag)}
                onClick={() => toggle(tag)}
              >
                {SCHOOL_LABELS[tag]}
              </button>
            ))}
          </div>
          {chosen.length > 0 && (
            <p className="hint opposition-chosen">
              <span>Chosen: </span>
              <strong>
                {chosen.map((t) => SCHOOL_LABELS[t as WizardSchoolTag] ?? t).join(", ")}
              </strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * An elemental specialist's single opposed element, in place of the two
 * standard opposition schools. The options come from the chosen school's
 * `WizardSchool.oppositionOptions` (parsed from its own prose): most schools
 * fix one opposite, which `setWizardSchool` has already selected — this then
 * renders as a read-only statement rather than a choice. Rendered only for an
 * elemental pick by the caller, `SchoolPicker`.
 */
export function ElementalOppositionPicker({
  doc,
  school,
  update,
}: OppositionPickerProps & { school: WizardSchool | undefined }) {
  const options = school?.oppositionOptions ?? [];
  const chosen = doc.build.wizardOppositionElement;
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:OppositionElement", false);
  if (options.length === 0) return null;

  const label = (tag: ElementalSchoolTag) =>
    ELEMENTAL_SCHOOL_LABELS[tag].replace(" (Elemental)", "");

  return (
    <div className="subsection opposition-picker">
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
          Opposition Element
          {chosen ? <span className="hint"> · {label(chosen)}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint opposition-picker-hint">
            An elemental specialist opposes ONE element instead of two schools, and takes no second
            opposition school. Preparing a spell from the opposed element&rsquo;s list costs two
            slots instead of one.
            {options.length === 1 && " This school's opposite is fixed by the rules."}
          </p>
          {options.length > 1 && (
            <div className="chips opposition-chips">
              {options.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="chip"
                  aria-pressed={chosen === tag}
                  onClick={() =>
                    update((d) => setWizardOppositionElement(d, chosen === tag ? null : tag))
                  }
                >
                  {label(tag)}
                </button>
              ))}
            </div>
          )}
          {chosen && (
            <p className="hint opposition-chosen">
              <span>Opposed: </span>
              <strong>{label(chosen)}</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

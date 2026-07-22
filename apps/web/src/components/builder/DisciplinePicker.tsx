import { useMemo } from "react";

import { mergedPsychicDisciplineCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setPsychicDiscipline } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface DisciplinePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Psychic discipline selection (PF1 grants exactly one, chosen at L1, never
 * changed thereafter). Free-choice: validation is "soft warning only" per the
 * project's hybrid-prereqs philosophy — mirrors `MysteryPicker` exactly.
 *
 * Browses the FULL published discipline catalog (`mergedPsychicDisciplineCatalog`
 * — 12 core Occult Adventures disciplines hand-verified with bonus spells/
 * Discipline Powers/phrenic pool ability, plus 11 vendored-only splatbook
 * disciplines from later sourcebooks) — a vendored-only pick is honestly
 * marked "not modeled" below: no bonus spells, no Discipline Powers, no
 * phrenic pool ability resolution (see `@pf1/engine`
 * `psychic-disciplines.ts`'s doc comment for the collision audit).
 *
 * The chosen discipline (when hand-verified) grants one bonus spell known at
 * psychic level 1, 4th level, and every 2 levels thereafter (see
 * `model/spellcasting.disciplineSpellsKnown`, surfaced in the Spells
 * section/tracker) and determines the ability score (Wis or Cha) feeding the
 * Phrenic Pool resource (see `@pf1/engine` `resources.ts`).
 */
export function DisciplinePicker({ doc, refData, update }: DisciplinePickerProps) {
  const isPsychic = doc.identity.classes.some((c) => c.tag === "psychic");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Discipline", false);

  const catalog = useMemo(() => mergedPsychicDisciplineCatalog(refData), [refData]);

  const chosenTag = doc.build.psychicDiscipline ?? "";
  const disciplineDef = catalog.find((d) => d.tag === chosenTag);

  if (!isPsychic) return null;

  return (
    <div className="subsection discipline-picker">
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
          Discipline
          {disciplineDef ? <span className="hint"> · {disciplineDef.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint discipline-picker-hint">
            Pick one psychic discipline (PF1 grants one at level 1, never changed thereafter).
            Browses the full published catalog — the 12 core Occult Adventures disciplines grant a
            bonus spell known at 1st level, 4th level, and every 2 levels thereafter, and set which
            ability (Wisdom or Charisma) feeds your phrenic pool; a vendored-only splatbook
            discipline (marked below) has no bonus spells/Discipline Powers/pool ability modeled.
            Free-choice — no validation.
          </p>
          <select
            className="discipline-select"
            value={chosenTag}
            onChange={(e) => update((d) => setPsychicDiscipline(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {catalog.map((d) => (
              <option key={d.tag} value={d.tag}>
                {d.name}
                {d.vendoredOnly ? " (not modeled)" : ""}
              </option>
            ))}
          </select>

          {disciplineDef && (
            <div className="discipline-preview">
              {disciplineDef.vendoredOnly ? (
                <>
                  <p className="hint">
                    Vendored-only discipline — no bonus spells, Discipline Powers, or phrenic pool
                    ability resolution modeled. See below for the published prose.
                  </p>
                  {disciplineDef.description ? (
                    <FeatureDescription html={disciplineDef.description} />
                  ) : null}
                </>
              ) : (
                <>
                  <div className="discipline-pool-ability">
                    <span className="hint">Phrenic Pool Ability</span>
                    <p>{disciplineDef.phrenicPoolAbility === "wis" ? "Wisdom" : "Charisma"}</p>
                  </div>
                  <ul className="discipline-bonus-spells">
                    {disciplineDef.bonusSpells.map((sp) => (
                      <li key={`${sp.level}:${sp.id}`}>
                        <span className="cf-level">Psychic Lv {sp.level}</span>{" "}
                        <span className="cf-name">{refData.spells[sp.id]?.name ?? sp.name}</span>
                      </li>
                    ))}
                  </ul>
                  {disciplineDef.description ? (
                    <FeatureDescription html={disciplineDef.description} />
                  ) : null}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

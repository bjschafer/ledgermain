import { useMemo } from "react";

import { PSYCHIC_DISCIPLINES, PSYCHIC_DISCIPLINE_TAGS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setPsychicDiscipline } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

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
 * Scope: the 12 core Occult Adventures disciplines (Abomination, Dream,
 * Enlightenment, Faith, Ferocity, Haunted, Lore, Pageantry, Pain, Rebirth,
 * Self-Perfection, Tranquility) — see `@pf1/engine`
 * `psychic-disciplines.ts`'s doc comment. Discipline powers (each
 * discipline's 1st/5th/13th-level abilities) and phrenic amplifications are
 * NOT modeled.
 *
 * The chosen discipline grants one bonus spell known at psychic level 1, 4th
 * level, and every 2 levels thereafter (see
 * `model/spellcasting.disciplineSpellsKnown`, surfaced in the Spells
 * section/tracker) and determines the ability score (Wis or Cha) feeding the
 * Phrenic Pool resource (see `@pf1/engine` `resources.ts`).
 */
export function DisciplinePicker({ doc, refData, update }: DisciplinePickerProps) {
  const isPsychic = doc.identity.classes.some((c) => c.tag === "psychic");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Discipline", false);

  const disciplines = useMemo(() => [...PSYCHIC_DISCIPLINE_TAGS].sort(), []);

  const chosen = doc.build.psychicDiscipline ?? "";
  const disciplineDef = PSYCHIC_DISCIPLINES[chosen];

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
            Pick one psychic discipline (PF1 grants one at level 1, never changed thereafter). It
            grants one bonus spell known at 1st level, 4th level, and every 2 levels thereafter, and
            sets which ability (Wisdom or Charisma) feeds your phrenic pool. Free-choice — no
            validation. Discipline powers and phrenic amplifications aren't modeled here yet.
          </p>
          <select
            className="discipline-select"
            value={chosen}
            onChange={(e) => update((d) => setPsychicDiscipline(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {disciplines.map((tag) => (
              <option key={tag} value={tag}>
                {PSYCHIC_DISCIPLINES[tag]?.name ?? tag}
              </option>
            ))}
          </select>

          {disciplineDef && (
            <div className="discipline-preview">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

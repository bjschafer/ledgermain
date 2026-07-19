import { useMemo, useState } from "react";

import {
  VIGILANTE_SOCIAL_TALENTS,
  VIGILANTE_SOCIAL_TALENT_IDS,
  vigilanteTalentsForSpecialization,
  type VigilanteTalentDef,
} from "@pf1/engine";
import type { CharacterDoc, ContextNote } from "@pf1/schema";

import {
  chosenVigilanteSocialTalentCount,
  chosenVigilanteTalentCount,
  expectedVigilanteSocialTalentCount,
  expectedVigilanteTalentCount,
  hasVigilanteSocialTalent,
  hasVigilanteTalent,
  toggleVigilanteSocialTalent,
  toggleVigilanteTalent,
  vigilanteLevel as getVigilanteLevel,
  vigilanteSocialTalentsNeedWarning,
  vigilanteTalentsNeedWarning,
} from "../../model/vigilanteTalents.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface VigilanteTalentPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Vigilante talent selection (issue #65) — renders BOTH independent talent
 * pools PF1 RAW grants (Social Talent at 1st + every 2, Vigilante Talent at
 * 2nd + every 2; see `model/vigilanteTalents.ts`'s budget math for each),
 * mirroring `HexPicker`'s tier-grouped shape but with two separately-budgeted
 * subsections instead of one soft-gated list. The shared Vigilante Talent
 * pool is further filtered by the chosen `vigilanteSpecialization` (Avenger/
 * Stalker/either) via `vigilanteTalentsForSpecialization` — soft-filtered
 * only, same non-blocking posture as every other menu table in this project.
 */
export function VigilanteTalentPicker({ doc, update }: VigilanteTalentPickerProps) {
  const isVigilante = doc.identity.classes.some((c) => c.tag === "vigilante");
  if (!isVigilante) return null;

  const level = getVigilanteLevel(doc);
  const spec = doc.build.vigilanteSpecialization;

  const socialList = VIGILANTE_SOCIAL_TALENT_IDS.map((id) => VIGILANTE_SOCIAL_TALENTS[id]!);
  const talentList = useMemo(() => vigilanteTalentsForSpecialization(spec), [spec]);

  return (
    <>
      <TalentSection
        title="Social Talents"
        storageKey="subsection:Social Talents"
        hint="Pick talents as you level (1st, 3rd, 5th, …). Free-choice — never blocks past the expected count."
        level={level}
        list={socialList}
        chosen={chosenVigilanteSocialTalentCount(doc)}
        expected={expectedVigilanteSocialTalentCount(doc)}
        warn={vigilanteSocialTalentsNeedWarning(doc)}
        has={(id) => hasVigilanteSocialTalent(doc, id)}
        onToggle={(id) => update((d) => toggleVigilanteSocialTalent(d, id))}
      />
      <TalentSection
        title="Vigilante Talents"
        storageKey="subsection:Vigilante Talents"
        hint="Pick talents as you level (2nd, 4th, 6th, …). Filtered to your specialization; free-choice — never blocks past the expected count."
        level={level}
        list={talentList}
        chosen={chosenVigilanteTalentCount(doc)}
        expected={expectedVigilanteTalentCount(doc)}
        warn={vigilanteTalentsNeedWarning(doc)}
        has={(id) => hasVigilanteTalent(doc, id)}
        onToggle={(id) => update((d) => toggleVigilanteTalent(d, id))}
      />
    </>
  );
}

function TalentSection({
  title,
  storageKey,
  hint,
  level,
  list,
  chosen,
  expected,
  warn,
  has,
  onToggle,
}: {
  title: string;
  storageKey: string;
  hint: string;
  level: number;
  list: VigilanteTalentDef[];
  chosen: number;
  expected: number;
  warn: boolean;
  has: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed(storageKey, false);
  const countClass = warn ? "hint warn-over" : "hint";

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = has(a.id) ? 0 : 1;
        const sb = has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, list, chosen]);

  return (
    <div className="subsection revelation-picker">
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
          {title}
          <span className={countClass}>
            {" "}
            · {chosen} / {expected}
          </span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">{hint}</p>
          <input
            className="search"
            type="text"
            placeholder={`Search ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {talents.map((t) => {
              const isSel = has(t.id);
              const belowLevel = level > 0 && level < t.minLevel;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">{t.name}</div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires vigilante {t.minLevel} (currently {level})
                      </div>
                    )}
                    {t.contextNotes?.map((n: ContextNote, i: number) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => onToggle(t.id)}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {talents.length === 0 ? <div className="empty">No talents match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

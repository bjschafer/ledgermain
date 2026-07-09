import { useMemo, useState } from "react";

import { INVESTIGATOR_TALENTS, INVESTIGATOR_TALENT_IDS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenInvestigatorTalentCount,
  expectedInvestigatorTalentCount,
  investigatorLevel as getInvestigatorLevel,
  investigatorTalentsNeedWarning,
  toggleInvestigatorTalent,
} from "../../model/investigatorTalents.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface InvestigatorTalentPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Investigator talent selection (issue #65), mirroring `DiscoveryPicker`. An
 * investigator gains a talent at 3rd level and every 2 levels thereafter,
 * plus one per "Extra Investigator Talent" feat (see
 * `model/investigatorTalents.ts`'s budget math). Free-choice, never blocks
 * past the expected count — same hybrid-prereqs posture as `DiscoveryPicker`.
 * Studied Combat/Studied Strike's own numbers (insight bonus, precision
 * dice) show up as a class-feature detail line, not here — see
 * `@pf1/engine` `studiedCombatLabel`/`studiedStrikeDice`.
 */
export function InvestigatorTalentPicker({ doc, refData, update }: InvestigatorTalentPickerProps) {
  const isInvestigator = doc.identity.classes.some((c) => c.tag === "investigator");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Investigator Talents", false);

  const selected = useMemo(
    () => new Set(doc.build.investigatorTalents ?? []),
    [doc.build.investigatorTalents],
  );
  const level = getInvestigatorLevel(doc);

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVESTIGATOR_TALENT_IDS.map((id) => INVESTIGATOR_TALENTS[id]!)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenInvestigatorTalentCount(doc);
  const expected = expectedInvestigatorTalentCount(doc, refData);
  const warn = investigatorTalentsNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isInvestigator) return null;

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
          Investigator Talents
          <span
            className={countClass}
            title={
              warn
                ? "More talents chosen than the ACG progression (3rd + every 2 levels, plus Extra Investigator Talent feats) grants"
                : undefined
            }
          >
            {" "}
            · {chosen} / {expected}
          </span>
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">
            Pick talents as you level (3rd, 5th, 7th, …; +1 per Extra Investigator Talent feat).
            Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search talents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {talents.map((t) => {
              const isSel = selected.has(t.id);
              const belowLevel = level > 0 && level < t.minLevel;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.category === "studiedStrike" ? (
                        <span className="tag-mystery">Studied Strike</span>
                      ) : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires investigator {t.minLevel} (currently {level})
                      </div>
                    )}
                    {t.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleInvestigatorTalent(d, t.id))}
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

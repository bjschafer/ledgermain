import { useMemo, useState } from "react";

import {
  ORACLE_MYSTERIES,
  ORACLE_MYSTERY_FINAL_REVELATIONS,
  revelationsForMystery,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenOracleRevelationCount,
  expectedOracleRevelationCount,
  oracleLevel,
  oracleRevelationsNeedWarning,
  toggleOracleRevelation,
} from "../../model/oracleRevelations.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RevelationPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Oracle revelation selection (issue #61), mirroring `ArcanistExploitPicker`
 * exactly. An oracle learns a new revelation at 1st, 3rd, 7th, 11th, 15th,
 * and 19th level, plus one more per "Extra Revelation" feat (see
 * `model/oracleRevelations.ts`'s budget math). Free-choice, never blocks
 * past the expected count — same hybrid-prereqs posture as
 * `ArcanistExploitPicker`.
 *
 * Revelations are PER-MYSTERY (see `@pf1/engine` `oracle-revelations.ts`):
 * this panel only lists the currently-chosen `build.oracleMystery`'s own
 * revelations, and prompts to pick a mystery first (via `MysteryPicker`,
 * rendered just above this in `ClassesSection`) when none is set yet.
 *
 * The mystery's 20th-level Final Revelation is shown as an informational
 * footer, never selectable — it's automatic, not one of the budgeted picks.
 *
 * Picked revelations also show up in the sheet's Class Features list (tagged
 * "— Revelation"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function RevelationPicker({ doc, refData, update }: RevelationPickerProps) {
  const isOracle = doc.identity.classes.some((c) => c.tag === "oracle");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Revelations", false);

  const mysteryTag = doc.build.oracleMystery;
  const mysteryDef = mysteryTag ? ORACLE_MYSTERIES[mysteryTag] : undefined;
  const finalRevelation = mysteryTag ? ORACLE_MYSTERY_FINAL_REVELATIONS[mysteryTag] : undefined;

  const selected = useMemo(
    () => new Set(doc.build.oracleRevelations ?? []),
    [doc.build.oracleRevelations],
  );
  const level = oracleLevel(doc);

  const revelations = useMemo(() => {
    if (!mysteryTag) return [];
    const q = query.trim().toLowerCase();
    return revelationsForMystery(mysteryTag)
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [mysteryTag, query, selected]);

  const chosen = chosenOracleRevelationCount(doc);
  const expected = expectedOracleRevelationCount(doc, refData);
  const warn = oracleRevelationsNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isOracle) return null;

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
          Revelations
          {mysteryDef ? (
            <span
              className={countClass}
              title={
                warn
                  ? "More revelations chosen than the APG progression (1st, 3rd, 7th, 11th, 15th, 19th, plus Extra Revelation feats) grants"
                  : undefined
              }
            >
              {" "}
              · {chosen} / {expected}
            </span>
          ) : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          {!mysteryDef ? (
            <p className="hint">Pick a mystery above first — revelations are per-mystery.</p>
          ) : (
            <>
              <p className="hint revelation-picker-hint">
                Pick revelations as you level (1st, 3rd, 7th, 11th, 15th, 19th; +1 per Extra
                Revelation feat). Free-choice — never blocks past the expected count.
              </p>
              <input
                className="search"
                type="text"
                placeholder="Search revelations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="scroll">
                {revelations.map((r) => {
                  const isSel = selected.has(r.id);
                  const belowLevel = level > 0 && level < r.minLevel;
                  return (
                    <div key={r.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                      <div className="pmain">
                        <div className="pname">{r.name}</div>
                        <div className="preq">
                          <span className="desc-text">{r.summary}</span>
                        </div>
                        {belowLevel && (
                          <div className="hint" style={{ marginTop: 2 }}>
                            ⚠ Requires oracle {r.minLevel}
                            {r.minLevel === 1 ? "st" : r.minLevel === 3 ? "rd" : "th"} (currently{" "}
                            {level})
                          </div>
                        )}
                        {r.contextNotes?.map((note, i) => (
                          <div key={i} className="hint" style={{ marginTop: 2 }}>
                            ⚠ {note.text}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`pick-btn ${isSel ? "remove" : "add"}`}
                        onClick={() => update((d) => toggleOracleRevelation(d, r.id))}
                      >
                        {isSel ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })}
                {revelations.length === 0 ? (
                  <div className="empty">No revelations match.</div>
                ) : null}
              </div>
              {finalRevelation && (
                <p className="hint revelation-final-hint" style={{ marginTop: 8 }}>
                  <strong>Final Revelation (20th, automatic):</strong> {finalRevelation.summary}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

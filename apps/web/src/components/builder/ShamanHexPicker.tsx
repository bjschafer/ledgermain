import { useMemo, useState } from "react";

import { hexesForSpirit, SHAMAN_SPIRITS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenShamanHexCount,
  expectedShamanHexCount,
  hasShamanHex,
  shamanHexesNeedWarning,
  toggleShamanHex,
} from "../../model/shamanHexes.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ShamanHexPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Shaman hex selection (issue #65), mirroring `RevelationPicker` exactly. A
 * shaman learns her first hex at 2nd level, then a new one at 4th, 8th,
 * 10th, 12th, 16th, 18th, and 20th level, plus one more per "Extra Hex" feat
 * (see `model/shamanHexes.ts`'s budget math). Free-choice, never blocks past
 * the expected count — same hybrid-prereqs posture as `RevelationPicker`.
 *
 * Hexes are PER-SPIRIT (see `@pf1/engine` `shaman-spirits.ts`): this panel
 * only lists the currently-chosen `build.shamanSpirit`'s own 5 hexes, and
 * prompts to pick a spirit first (via `SpiritPicker`, rendered just above
 * this in `ClassesSection`) when none is set yet.
 *
 * Wandering Hex (6th level — temporarily borrow a hex from the OTHER spirit
 * each day) and Wandering Spirit (4th level — temporarily bond with a
 * different spirit each day) are both deliberately NOT modeled: both are
 * re-chosen DAILY, not fixed build picks, same posture IMPLEMENTATION_PLAN.md
 * already documents for the medium's spirits.
 */
export function ShamanHexPicker({ doc, refData, update }: ShamanHexPickerProps) {
  const isShaman = doc.identity.classes.some((c) => c.tag === "shaman");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:ShamanHexes", false);

  const spiritTag = doc.build.shamanSpirit;
  const spiritDef = spiritTag ? SHAMAN_SPIRITS[spiritTag] : undefined;

  const selected = useMemo(() => new Set(doc.build.shamanHexes ?? []), [doc.build.shamanHexes]);

  const hexes = useMemo(() => {
    if (!spiritTag) return [];
    const q = query.trim().toLowerCase();
    return hexesForSpirit(spiritTag)
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [spiritTag, query, selected]);

  const chosen = chosenShamanHexCount(doc);
  const expected = expectedShamanHexCount(doc, refData);
  const warn = shamanHexesNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isShaman) return null;

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
          Hexes
          {spiritDef ? (
            <span
              className={countClass}
              title={
                warn
                  ? "More hexes chosen than the ACG progression (2nd, 4th, 8th, 10th, 12th, 16th, 18th, 20th, plus Extra Hex feats) grants"
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
          {!spiritDef ? (
            <p className="hint">Pick a spirit above first — hexes are per-spirit.</p>
          ) : (
            <>
              <p className="hint revelation-picker-hint">
                Pick hexes as you level (2nd, 4th, 8th, 10th, 12th, 16th, 18th, 20th; +1 per Extra
                Hex feat). Free-choice — never blocks past the expected count. Every hex here is
                note-tier (no numeric effect modeled — see IMPLEMENTATION_PLAN.md).
              </p>
              <input
                className="search"
                type="text"
                placeholder="Search hexes…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="scroll">
                {hexes.map((h) => {
                  const isSel = hasShamanHex(doc, h.id);
                  return (
                    <div key={h.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                      <div className="pmain">
                        <div className="pname">{h.name}</div>
                        <div className="preq">
                          <span className="desc-text">{h.summary}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`pick-btn ${isSel ? "remove" : "add"}`}
                        onClick={() => update((d) => toggleShamanHex(d, h.id))}
                      >
                        {isSel ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })}
                {hexes.length === 0 ? <div className="empty">No hexes match.</div> : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

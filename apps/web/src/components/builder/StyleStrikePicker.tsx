import { useMemo, useState } from "react";

import { MONK_STYLE_STRIKES, MONK_STYLE_STRIKE_IDS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  chosenMonkStyleStrikeCount,
  expectedMonkStyleStrikeCount,
  monkStyleStrikesNeedWarning,
  toggleMonkStyleStrike,
} from "../../model/monkStyleStrikes.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface StyleStrikePickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Monk (Unchained) style strike selection (issue #65), mirroring
 * `KiPowerPicker` — every style strike is a per-attack flurry rider,
 * entirely `displayOnly` (see `@pf1/engine` `monk-style-strikes.ts`'s doc
 * comment). Flat list, no level tiering per entry (unlike ki powers) — only
 * the COUNT known grows with level (5th, then 9th/13th/17th). Free-choice,
 * never blocks past the expected count. The Style Strikes per-round resource
 * POOL (how many strikes can be designated per round) already derives
 * generically from vendored data — see `monk-unchained.test.ts` — this
 * picker only records WHICH strikes are known.
 */
export function StyleStrikePicker({ doc, update }: StyleStrikePickerProps) {
  const isMonkUnchained = doc.identity.classes.some((c) => c.tag === "monkUnchained");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Style Strikes", false);

  const selected = useMemo(
    () => new Set(doc.build.monkStyleStrikes ?? []),
    [doc.build.monkStyleStrikes],
  );

  const strikes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MONK_STYLE_STRIKE_IDS.map((id) => MONK_STYLE_STRIKES[id]!)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenMonkStyleStrikeCount(doc);
  const expected = expectedMonkStyleStrikeCount(doc);
  const warn = monkStyleStrikesNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isMonkUnchained) return null;

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
          Style Strikes
          <span
            className={countClass}
            title={
              warn
                ? "More style strikes chosen than the Pathfinder Unchained progression (5th, 9th, 13th, 17th) grants"
                : undefined
            }
          >
            {" "}
            · {chosen} / {expected}
          </span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">
            Pick a style strike at 5th level, and one more at 9th/13th/17th. Each is a rider you can
            apply to one unarmed strike during a flurry of blows (two per round at 15th) — no
            automatic sheet effect. Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search style strikes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {strikes.map((s) => {
              const isSel = selected.has(s.id);
              return (
                <div key={s.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {s.name}
                      {s.fistOnly ? <span className="tag-mystery">Fist only</span> : null}
                      {s.kickOnly ? <span className="tag-mystery">Kick only</span> : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{s.summary}</span>
                    </div>
                    {s.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleMonkStyleStrike(d, s.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {strikes.length === 0 ? <div className="empty">No style strikes match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

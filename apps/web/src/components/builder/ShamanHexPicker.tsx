import { useMemo, useState } from "react";

import { hexesForSpirit, mergedShamanHexCatalog, SHAMAN_SPIRITS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenGeneralShamanHexCount,
  chosenShamanHexCount,
  expectedShamanHexCount,
  hasShamanHex,
  shamanHexesNeedWarning,
  toggleShamanHex,
} from "../../model/shamanHexes.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ShamanHexPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Shaman hex selection (issue #65, general-catalog issue #74 Phase 3b),
 * mirroring `RevelationPicker` exactly. A shaman learns her first hex at 2nd
 * level, then a new one at 4th, 8th, 10th, 12th, 16th, 18th, and 20th level,
 * plus one more per "Extra Hex" feat (see `model/shamanHexes.ts`'s budget
 * math). Free-choice, never blocks past the expected count — same
 * hybrid-prereqs posture as `RevelationPicker`.
 *
 * Hexes come from TWO sources, both drawing on the same pick budget: the
 * currently-chosen `build.shamanSpirit`'s own 5 hexes (hand-authored, see
 * `@pf1/engine` `shaman-spirits.ts`; this panel prompts to pick a spirit
 * first when none is set yet), and the vendored, spirit-agnostic GENERAL
 * shaman-hex catalog (ACG's own "Shaman Hexes" table — `mergedShamanHexCatalog`,
 * see `@pf1/engine` `shaman-hexes.ts`), rendered as a second section below
 * the spirit list. Every general-catalog entry is prose-only (no
 * hand-authored mechanics exist for this list at all).
 *
 * Wandering Hex (6th level — temporarily borrow a hex from the OTHER spirit
 * each day) and Wandering Spirit (4th level — temporarily bond with a
 * different spirit each day) are both deliberately NOT modeled: both are
 * re-chosen DAILY, not fixed build picks — same posture as the medium's spirits.
 */
export function ShamanHexPicker({ doc, refData, update }: ShamanHexPickerProps) {
  const isShaman = doc.identity.classes.some((c) => c.tag === "shaman");
  const [query, setQuery] = useState("");
  const [generalQuery, setGeneralQuery] = useState("");
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

  const generalCatalog = useMemo(() => mergedShamanHexCatalog(refData), [refData]);
  const generalHexes = useMemo(() => {
    const q = generalQuery.trim().toLowerCase();
    return generalCatalog
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [generalCatalog, generalQuery, selected]);

  const chosen = chosenShamanHexCount(doc) + chosenGeneralShamanHexCount(doc, refData);
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
        <Caret open={!collapsed} />
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
                note-tier (no numeric effect modeled).
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

              <p className="hint revelation-picker-hint" style={{ marginTop: 10 }}>
                General Hexes — the Advanced Class Guide's own spirit-agnostic hex table, available
                to any shaman (draws from the same pick budget above). A shaman may also select from
                the witch's own Hex list (excluding major/grand hexes), using shaman level as witch
                level — see the Witch class's Hexes section to browse those.
              </p>
              <input
                className="search"
                type="text"
                placeholder="Search general hexes…"
                value={generalQuery}
                onChange={(e) => setGeneralQuery(e.target.value)}
              />
              <div className="scroll">
                {generalHexes.map((h) => {
                  const isSel = selected.has(h.id);
                  return (
                    <div key={h.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                      <div className="pmain">
                        <div className="pname">
                          {h.name}
                          {h.nameSuffix ? ` ${h.nameSuffix}` : ""}
                        </div>
                        <div className="preq">
                          <span className="desc-text">{h.summary}</span>
                        </div>
                        {h.description ? <FeatureDescription html={h.description} /> : null}
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
                {generalHexes.length === 0 ? (
                  <div className="empty">No general hexes match.</div>
                ) : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

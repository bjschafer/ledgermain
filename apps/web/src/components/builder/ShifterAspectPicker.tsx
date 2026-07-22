import { useMemo, useState } from "react";

import { mergedShifterAspectCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenShifterAspectCount,
  expectedShifterAspectCount,
  shifterAspectsNeedWarning,
  toggleShifterAspect,
} from "../../model/shifterAspects.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface ShifterAspectPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Shifter aspect selection (issue #65, full-catalog issue #74 Phase 3c),
 * mirroring `HexPicker` — this is the build-time "which aspects do I know"
 * pick; the live minor-form on/off toggle lives in the tracker's
 * `ShifterAspectPanel` instead (see that component's doc comment). A
 * shifter knows 1 aspect at 1st level, 2 at 5th, 3 at 10th, 4 at 15th, and 5
 * at 20th (Final Aspect) — see `model/shifterAspects.ts`'s budget math.
 * Free-choice, never blocks past the expected count.
 *
 * Each row previews whether its minor form clears the honesty bar for a
 * real toggleable buff (see `@pf1/engine` `shifter-aspects.ts`'s doc
 * comment) via its `contextNotes`. Major form (Wild Shape) is out of scope
 * here — deferred to issue #70. Browses the full vendored catalog
 * (`mergedShifterAspectCatalog`) — an exact 1:1 match with the 30
 * hand-authored entries (see that function's doc comment), so this only
 * ever attaches vendored prose (including the Major Form paragraph) today.
 */
export function ShifterAspectPicker({ doc, refData, update }: ShifterAspectPickerProps) {
  const isShifter = doc.identity.classes.some((c) => c.tag === "shifter");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Shifter Aspects", false);

  const selected = useMemo(
    () => new Set(doc.build.shifterAspects ?? []),
    [doc.build.shifterAspects],
  );

  const catalog = useMemo(() => mergedShifterAspectCatalog(refData), [refData]);

  const aspects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

  const chosen = chosenShifterAspectCount(doc);
  const expected = expectedShifterAspectCount(doc);
  const warn = shifterAspectsNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isShifter) return null;

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
          Shifter Aspects
          <span
            className={countClass}
            title={
              warn
                ? "More aspects chosen than the Blood of the Beast progression (1st, 5th, 10th, 15th, 20th) grants"
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
            Pick aspects as you level (1st, 5th, 10th, 15th, 20th). Once known, toggle each aspect's
            minor form on/off in the tracker's Shifter Aspects panel. Major form (Wild Shape) isn't
            modeled yet — see issue #70. Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search aspects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {aspects.map((a) => {
              const isSel = selected.has(a.id);
              return (
                <div key={a.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {a.name}
                      {a.minorFormChanges.length > 0 ? (
                        <span className="tag-mystery">toggleable</span>
                      ) : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{a.summary}</span>
                    </div>
                    {a.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                    {a.description ? <FeatureDescription html={a.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleShifterAspect(d, a.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {aspects.length === 0 ? <div className="empty">No aspects match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";

import { mergedMesmeristBoldStareCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenMesmeristBoldStareCount,
  expectedMesmeristBoldStareCount,
  mesmeristBoldStaresNeedWarning,
  toggleMesmeristBoldStare,
} from "../../model/mesmeristBoldStares.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface MesmeristBoldStarePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Mesmerist Bold Stare selection (issue #65 follow-through), mirroring
 * `MesmeristTrickPicker` — a flat picker over the OA-core Bold Stare options.
 * Gained at 3rd level and every 4 levels thereafter; see
 * `model/mesmeristBoldStares.ts`'s budget math. Free-choice, never blocks
 * past the expected count.
 *
 * Each pick's `riderText` is appended onto the sheet's Hypnotic Stare
 * class-feature `detail` line (see `@pf1/engine` `boldStareRiderSummary`,
 * wired in `resolveClassFeatures`) rather than becoming its own separate
 * `Change` — see `MESMERIST_BOLD_STARES`' doc comment for the target-scoped
 * honesty-bar rationale. Picked stares also show up in the sheet's Class
 * Features list (tagged "— Bold Stare"), via `collectGrantedFeatures`.
 */
export function MesmeristBoldStarePicker({ doc, refData, update }: MesmeristBoldStarePickerProps) {
  const isMesmerist = doc.identity.classes.some((c) => c.tag === "mesmerist");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:MesmeristBoldStares", false);

  const selected = useMemo(
    () => new Set(doc.build.mesmeristBoldStares ?? []),
    [doc.build.mesmeristBoldStares],
  );

  const catalog = useMemo(() => mergedMesmeristBoldStareCatalog(refData), [refData]);

  const stares = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

  const chosen = chosenMesmeristBoldStareCount(doc);
  const expected = expectedMesmeristBoldStareCount(doc);
  const warn = mesmeristBoldStaresNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isMesmerist) return null;

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
          Bold Stares
          <span
            className={countClass}
            title={
              warn
                ? "More bold stares chosen than the OA progression (3rd level and every four levels thereafter) grants"
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
            Each pick extends the hypnotic stare penalty to a new roll category (or, for Psychic
            Inception, extends who it can affect) — see the Hypnotic Stare class feature for the
            combined effect (a vendored-only pick, marked prose-only below, doesn't enrich that
            summary line — see Class Features for its own entry instead). Browses the full published
            catalog. Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search bold stares…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {stares.map((s) => {
              const isSel = selected.has(s.id);
              return (
                <div key={s.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {s.name}
                      {!s.riderText && (
                        <span className="hint" title="No hand-verified rider text — prose-only">
                          {" "}
                          (prose-only)
                        </span>
                      )}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{s.summary}</span>
                    </div>
                    {s.description ? <FeatureDescription html={s.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleMesmeristBoldStare(d, s.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {stares.length === 0 ? <div className="empty">No bold stares match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

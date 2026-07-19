import { useMemo, useState } from "react";

import { OCCULTIST_SCHOOL_TAGS, OCCULTIST_SCHOOLS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  addOccultistImplement,
  chosenOccultistFocusPowerCount,
  chosenOccultistImplementCount,
  expectedOccultistFocusPowerCount,
  expectedOccultistImplementCount,
  hasOccultistFocusPower,
  knownOccultistSchoolTags,
  occultistFocusPowersNeedWarning,
  occultistImplementCount,
  occultistImplementsNeedWarning,
  occultistLevel,
  removeOccultistImplement,
  toggleOccultistFocusPower,
} from "../../model/occultistImplements.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import type { BuilderProps } from "./types.js";
import { Caret } from "../Caret.js";

type Updater = BuilderProps["update"];

interface ImplementPickerProps {
  doc: CharacterDoc;
  refData: BuilderProps["refData"];
  update: Updater;
}

/**
 * Occultist Implements + Focus Powers (issue #65). Two independently
 * rendered sections, mirroring `VigilanteTalentPicker`'s "two budgeted pools
 * in one picker" shape:
 *
 * - **Implement Schools** (`build.occultistImplements`) is a MULTISET, not a
 *   set — PF1 RAW lets a school be picked more than once (see
 *   `model/occultistImplements.ts`'s doc comment) — so each of the 8 core
 *   schools gets a stepper (Add/Remove one copy) instead of a single toggle.
 *   Each DISTINCT school known automatically grants its base Focus Power and
 *   Resonant Power (shown inline here, and surfaced again on the Class
 *   Features list via `@pf1/engine` `archetypes.ts`'s occultist block) — not
 *   a separate budgeted pick.
 * - **Focus Powers** (`build.occultistFocusPowers`) is a normal budgeted
 *   toggle-list, but its menu is SCOPED to the school tags currently known
 *   above — picking a power from a school you haven't learned makes no RAW
 *   sense, so schools with 0 copies show no menu at all (a leftover pick
 *   from a since-abandoned school is tolerated, not deleted — see
 *   `chosenOccultistFocusPowerCount`'s doc comment).
 *
 * Mental Focus investment (`live.occultistFocusInvested`) and the
 * Transmutation Physical Enhancement ability choice
 * (`live.occultistPhysicalEnhancementAbility`) are LIVE session state, not
 * build choices — they live in the tracker's Resources panel instead (see
 * `ResourcesPanel.tsx`'s Mental Focus sub-row), the same build/live split
 * `martialFlexibilityFeatId` uses.
 */
export function ImplementPicker({ doc, refData, update }: ImplementPickerProps) {
  const isOccultist = doc.identity.classes.some((c) => c.tag === "occultist");
  if (!isOccultist) return null;

  return (
    <>
      <ImplementSchoolSection doc={doc} update={update} />
      <FocusPowerSection doc={doc} refData={refData} update={update} />
    </>
  );
}

function ImplementSchoolSection({ doc, update }: { doc: CharacterDoc; update: Updater }) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Implement Schools", false);
  const level = occultistLevel(doc);
  const chosen = chosenOccultistImplementCount(doc);
  const expected = expectedOccultistImplementCount(doc);
  const warn = occultistImplementsNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

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
          Implement Schools
          <span
            className={countClass}
            title={
              warn
                ? "More implement picks chosen than the class table (2 at 1st, +1 at 2nd/6th/10th/14th/18th) grants"
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
            2 schools at 1st level, +1 at 2nd and every 4 levels thereafter. A school can be picked
            more than once to learn an extra spell from it — each copy counts toward the budget
            above, but only the FIRST copy of a distinct school grants its base + resonant power
            (shown below). Free-choice — never blocks past the expected count.
          </p>
          <div className="scroll">
            {OCCULTIST_SCHOOL_TAGS.map((tag) => {
              const school = OCCULTIST_SCHOOLS[tag]!;
              const count = occultistImplementCount(doc, tag);
              const known = count > 0;
              return (
                <div key={tag} className={`pick-row${known ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {school.name}
                      {count > 0 && <span className="hint"> · ×{count}</span>}
                    </div>
                    <div className="preq">
                      <span className="desc-text">Implements: {school.implements}</span>
                    </div>
                    {known && (
                      <>
                        <div className="hint" style={{ marginTop: 2 }}>
                          Base — {school.basePower.name}: {school.basePower.summary}
                        </div>
                        <div className="hint" style={{ marginTop: 2 }}>
                          Resonant — {school.resonantPower.name}: {school.resonantPower.summary}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      className="pick-btn remove"
                      disabled={count === 0}
                      onClick={() => update((d) => removeOccultistImplement(d, tag))}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="pick-btn add"
                      onClick={() => update((d) => addOccultistImplement(d, tag))}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {level <= 0 && (
            <div className="hint" style={{ marginTop: 4 }}>
              ⚠ No occultist levels yet.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FocusPowerSection({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: BuilderProps["refData"];
  update: Updater;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Focus Powers", false);
  const knownTags = useMemo(() => new Set(knownOccultistSchoolTags(doc)), [doc]);
  const chosen = chosenOccultistFocusPowerCount(doc);
  const expected = expectedOccultistFocusPowerCount(doc, refData);
  const warn = occultistFocusPowersNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  const powers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: {
      id: string;
      schoolName: string;
      name: string;
      minLevel?: number;
      summary: string;
    }[] = [];
    for (const tag of OCCULTIST_SCHOOL_TAGS) {
      if (!knownTags.has(tag)) continue;
      const school = OCCULTIST_SCHOOLS[tag]!;
      for (const power of school.focusPowers) {
        const id = `${tag}:${power.slug}`;
        if (q && !power.name.toLowerCase().includes(q) && !school.name.toLowerCase().includes(q)) {
          continue;
        }
        rows.push({
          id,
          schoolName: school.name,
          name: power.name,
          minLevel: power.minLevel,
          summary: power.summary,
        });
      }
    }
    return rows.sort((a, b) => {
      const sa = hasOccultistFocusPower(doc, a.id) ? 0 : 1;
      const sb = hasOccultistFocusPower(doc, b.id) ? 0 : 1;
      return sa - sb || a.schoolName.localeCompare(b.schoolName) || a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, knownTags, chosen]);

  const level = occultistLevel(doc);

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
          Focus Powers
          <span
            className={countClass}
            title={warn ? "More focus powers chosen than the class table grants" : undefined}
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
            1 focus power at 1st level, +1 at 3rd and every 2 levels thereafter (plus one per Extra
            Focus Power feat). Menu scoped to your known implement schools — activated abilities
            spent from Mental Focus, no automatic sheet effect. Free-choice — never blocks.
          </p>
          {knownTags.size === 0 ? (
            <div className="empty">Pick an implement school above to see its focus powers.</div>
          ) : (
            <>
              <input
                className="search"
                type="text"
                placeholder="Search focus powers…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="scroll">
                {powers.map((p) => {
                  const isSel = hasOccultistFocusPower(doc, p.id);
                  const belowLevel = level > 0 && p.minLevel !== undefined && level < p.minLevel;
                  return (
                    <div key={p.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                      <div className="pmain">
                        <div className="pname">
                          {p.name} <span className="hint">({p.schoolName})</span>
                        </div>
                        <div className="preq">
                          <span className="desc-text">{p.summary}</span>
                        </div>
                        {belowLevel && (
                          <div className="hint" style={{ marginTop: 2 }}>
                            ⚠ Requires occultist {p.minLevel}th (currently {level})
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={`pick-btn ${isSel ? "remove" : "add"}`}
                        onClick={() => update((d) => toggleOccultistFocusPower(d, p.id))}
                      >
                        {isSel ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })}
                {powers.length === 0 ? <div className="empty">No focus powers match.</div> : null}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

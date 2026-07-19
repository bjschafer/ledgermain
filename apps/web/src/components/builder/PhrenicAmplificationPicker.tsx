import { useMemo, useState } from "react";

import { PHRENIC_AMPLIFICATION_IDS, PHRENIC_AMPLIFICATIONS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenPsychicAmplificationCount,
  expectedPsychicAmplificationCount,
  psychicAmplificationsNeedWarning,
  psychicLevel as getPsychicLevel,
  togglePsychicAmplification,
} from "../../model/psychicAmplifications.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PhrenicAmplificationPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { basic: "Amplification", major: "Major Amplification" };

/**
 * Psychic Phrenic Amplification selection (issue #65 follow-through),
 * mirroring `MesmeristTrickPicker` — a flat picker over the full
 * `PHRENIC_AMPLIFICATIONS` union (OA core + a handful of Player Companion
 * entries, see that table's doc comment for why it isn't OA-core-only).
 * Gained at 1st level and every threshold thereafter (1st, 3rd, 7th, 11th,
 * 15th, 19th — the same cadence `oracleRevelations` uses); see
 * `model/psychicAmplifications.ts`'s budget math. Free-choice, never blocks
 * past the expected count.
 *
 * Major amplifications (11th level) are soft-filtered by `minLevel` exactly
 * like a witch major/grand hex's own higher minimum — below-level major
 * amplifications stay pickable, just annotated, never disabled; they're
 * chosen "in place of" a basic amplification RAW, not counted as extra
 * budget (see `phrenic-amplifications.ts`'s doc comment).
 *
 * Picked amplifications also show up in the sheet's Class Features list
 * (tagged "— Phrenic Amplification"), via `collectGrantedFeatures`.
 */
export function PhrenicAmplificationPicker({
  doc,
  refData,
  update,
}: PhrenicAmplificationPickerProps) {
  const isPsychic = doc.identity.classes.some((c) => c.tag === "psychic");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:PhrenicAmplifications", false);

  const selected = useMemo(
    () => new Set(doc.build.psychicAmplifications ?? []),
    [doc.build.psychicAmplifications],
  );
  const level = getPsychicLevel(doc);

  const amplifications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PHRENIC_AMPLIFICATION_IDS.map((id) => PHRENIC_AMPLIFICATIONS[id]!)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenPsychicAmplificationCount(doc);
  const expected = expectedPsychicAmplificationCount(doc, refData);
  const warn = psychicAmplificationsNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isPsychic) return null;

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
          Phrenic Amplifications
          <span
            className={countClass}
            title={
              warn
                ? "More amplifications chosen than the OA progression (1st level and every threshold thereafter, plus Extra Amplification feats) grants"
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
            Each amplification is a cast-time rider spent from your Phrenic Pool on a spell you're
            casting that action ("linked spell") — pool points are tracked separately in Resources.
            Major amplifications unlock at 11th, chosen in place of a basic one. Free-choice — never
            blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search amplifications…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {amplifications.map((a) => {
              const isSel = selected.has(a.id);
              const belowLevel = level > 0 && level < a.minLevel;
              return (
                <div key={a.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {a.name} <span className="tag-mystery">{TIER_LABEL[a.tier] ?? a.tier}</span>
                    </div>
                    <div className="preq">
                      <span className="desc-text">
                        {a.costLabel} — {a.summary}
                      </span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires psychic {a.minLevel}th (currently {level})
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => togglePsychicAmplification(d, a.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {amplifications.length === 0 ? (
              <div className="empty">No amplifications match.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

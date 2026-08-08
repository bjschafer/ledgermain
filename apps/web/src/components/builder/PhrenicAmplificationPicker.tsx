import { useMemo, useState } from "react";

import { mergedPhrenicAmplificationCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  amplificationBelowLevel,
  chosenPsychicAmplificationCount,
  expectedPsychicAmplificationCount,
  phrenicAmplificationPrereqResult,
  psychicAmplificationsNeedWarning,
  togglePsychicAmplification,
} from "../../model/psychicAmplifications.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PhrenicAmplificationPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { basic: "Amplification", major: "Major Amplification" };

/**
 * Psychic Phrenic Amplification selection, mirroring `MesmeristTrickPicker` —
 * a flat picker over the full `PHRENIC_AMPLIFICATIONS` union (OA core + a
 * handful of Player Companion entries, see that table's doc comment for why it
 * isn't OA-core-only). Gained at 1st level and every threshold thereafter
 * (1st, 3rd, 7th, 11th, 15th, 19th — the same cadence `oracleRevelations`
 * uses); see `model/psychicAmplifications.ts`'s budget math. The count is a
 * soft guide only, never blocking past the expected total.
 *
 * Major amplifications (11th level) are hard-blocked by `minLevel`, same as
 * `KineticistPicker`'s wild-talent level gate: a not-yet-picked entry above
 * the character's psychic level is locked (button disabled, "Locked" label),
 * an already-picked one never retroactively locks. Dual Amplification's own
 * "know N other amplifications" requirement blocks the same way, via
 * `phrenicAmplificationPrereqResult`. They're chosen "in place of" a basic
 * amplification RAW, not counted as extra budget (see
 * `phrenic-amplifications.ts`'s doc comment).
 *
 * Picked amplifications also show up in the sheet's Class Features list
 * (tagged "— Phrenic Amplification"), via `collectGrantedFeatures`, and as
 * spend-tracker rows in the tracker's Resources panel, next to the Phrenic
 * Pool (see `ResourcesPanel`'s `PhrenicAmplificationActionsPanel`).
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

  const catalog = useMemo(() => mergedPhrenicAmplificationCatalog(refData), [refData]);

  const amplifications = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

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
            Each amplification is a cast-time rider: spend points from your Phrenic Pool on a spell
            you're casting that same action, called the linked spell. Pool points are tracked
            separately in Resources. Major amplifications unlock at psychic level 11, chosen in
            place of a basic one, and stay locked until then. The count above is a guide only,
            picking more than expected never blocks.
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
              const belowLevel = amplificationBelowLevel(doc, a.minLevel);
              const prereq = phrenicAmplificationPrereqResult(doc, a.id, a.description);
              const prereqUnmet = prereq ? prereq.checks.some((c) => !c.met) : false;
              // Only a not-yet-picked entry is locked — an already-picked one
              // (a legacy build, or a since-dropped other amplification) keeps
              // working, same as a feat whose prereqs later lapse.
              const blocked = (belowLevel || prereqUnmet) && !isSel;
              return (
                <div
                  key={a.id}
                  className={`pick-row${isSel ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
                >
                  <div className="pmain">
                    <div className="pname">
                      {a.name} <span className="tag-mystery">{TIER_LABEL[a.tier] ?? a.tier}</span>
                      {belowLevel && (
                        <span className="level-badge" title="Psychic level required">
                          Level {a.minLevel}
                        </span>
                      )}
                    </div>
                    <div className="preq">
                      <span className="desc-text">
                        {a.costLabel}: {a.summary}
                      </span>
                    </div>
                    {prereq && (
                      <div className="preq">
                        <span className="hint">Requires</span>
                        {prereq.checks.map((c, i) => (
                          <span key={i} className={c.met ? "ck-met" : "ck-unmet"}>
                            {c.met ? "✓" : "✗"} {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {a.description ? <FeatureDescription html={a.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    disabled={blocked}
                    title={
                      blocked
                        ? belowLevel
                          ? `Unlocks at psychic level ${a.minLevel}`
                          : "Requirement not met"
                        : undefined
                    }
                    onClick={() => update((d) => togglePsychicAmplification(d, a.id))}
                  >
                    {isSel ? "Remove" : blocked ? "Locked" : "Add"}
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

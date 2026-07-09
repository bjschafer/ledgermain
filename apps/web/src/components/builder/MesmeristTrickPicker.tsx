import { useMemo, useState } from "react";

import { MESMERIST_TRICKS, MESMERIST_TRICK_IDS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenMesmeristTrickCount,
  expectedMesmeristTrickCount,
  mesmeristLevel as getMesmeristLevel,
  mesmeristTricksNeedWarning,
  toggleMesmeristTrick,
} from "../../model/mesmeristTricks.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface MesmeristTrickPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { trick: "Trick", masterful: "Masterful Trick" };

/**
 * Mesmerist trick selection (issue #65 follow-through), mirroring
 * `NinjaTrickPicker` — tricks are a flat picker over every trick the
 * mesmerist's current level makes at least soft-available. Gained at 1st
 * level and every 2 levels thereafter; see `model/mesmeristTricks.ts`'s
 * budget math. Free-choice, never blocks past the expected count — same
 * hybrid-prereqs posture as `NinjaTrickPicker`.
 *
 * Masterful tricks (12th level) are soft-filtered by `minLevel` exactly like
 * a ninja master trick's own higher minimum — below-level masterful tricks
 * stay pickable, just annotated, never disabled; they're chosen "in place
 * of" a normal trick pick RAW, not counted as extra budget (see
 * `mesmerist-tricks.ts`'s doc comment).
 *
 * Picked tricks also show up in the sheet's Class Features list (tagged
 * "— Trick"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function MesmeristTrickPicker({ doc, refData, update }: MesmeristTrickPickerProps) {
  const isMesmerist = doc.identity.classes.some((c) => c.tag === "mesmerist");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:MesmeristTricks", false);

  const selected = useMemo(
    () => new Set(doc.build.mesmeristTricks ?? []),
    [doc.build.mesmeristTricks],
  );
  const level = getMesmeristLevel(doc);

  const tricks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MESMERIST_TRICK_IDS.map((id) => MESMERIST_TRICKS[id]!)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenMesmeristTrickCount(doc);
  const expected = expectedMesmeristTrickCount(doc, refData);
  const warn = mesmeristTricksNeedWarning(doc, refData);
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
          Tricks
          <span
            className={countClass}
            title={
              warn
                ? "More tricks chosen than the OA progression (1st level and every two levels thereafter, plus Extra Mesmerist Tricks feats) grants"
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
            Pick tricks as you level (1st, 3rd, 5th, …; +1 per Extra Mesmerist Tricks feat).
            Masterful tricks unlock at 12th, chosen in place of a normal trick — Occult Adventures
            core tricks only. Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search tricks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {tricks.map((t) => {
              const isSel = selected.has(t.id);
              const belowLevel = level > 0 && level < t.minLevel;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name} <span className="tag-mystery">{TIER_LABEL[t.tier] ?? t.tier}</span>
                    </div>
                    <div className="preq">
                      <span className="desc-text">
                        {t.actionNote} — {t.summary}
                      </span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires mesmerist {t.minLevel}
                        {t.minLevel === 12 ? "th" : "st"} (currently {level})
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleMesmeristTrick(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {tricks.length === 0 ? <div className="empty">No tricks match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

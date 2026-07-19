import { useMemo, useState } from "react";

import { ANTIPALADIN_CRUELTIES, ANTIPALADIN_CRUELTY_IDS, antipaladinCrueltyDC } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  antipaladinLevel as getAntipaladinLevel,
  antipaladinCrueltiesNeedWarning,
  chosenAntipaladinCrueltyCount,
  expectedAntipaladinCrueltyCount,
  toggleAntipaladinCruelty,
} from "../../model/antipaladinCruelties.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface CrueltyPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = {
  initial: "3rd Level",
  sixth: "6th Level",
  ninth: "9th Level",
  twelfth: "12th Level",
};

/**
 * Antipaladin cruelty selection (issue #65 wave B), mirroring `HexPicker` —
 * cruelties are a flat picker over every cruelty the antipaladin's current
 * level makes at least soft-available. Gained at 3rd level and every three
 * levels thereafter; see `model/antipaladinCruelties.ts`'s budget math.
 * Free-choice, never blocks past the expected count — same hybrid-prereqs
 * posture as `HexPicker`.
 *
 * Higher tiers (6th/9th/12th) are soft-filtered by `minLevel` exactly like a
 * witch major/grand hex's own higher minimum — below-level cruelties stay
 * pickable, just annotated, never disabled.
 *
 * Picked cruelties also show up in the sheet's Class Features list (tagged
 * "— Cruelty"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function CrueltyPicker({ doc, update }: CrueltyPickerProps) {
  const isAntipaladin = doc.identity.classes.some((c) => c.tag === "antipaladin");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Cruelties", false);

  const selected = useMemo(
    () => new Set(doc.build.antipaladinCruelties ?? []),
    [doc.build.antipaladinCruelties],
  );
  const level = getAntipaladinLevel(doc);
  const chaMod = Math.floor((doc.abilities.cha - 10) / 2);
  const dc = antipaladinCrueltyDC(level, chaMod);

  const cruelties = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ANTIPALADIN_CRUELTY_IDS.map((id) => ANTIPALADIN_CRUELTIES[id]!)
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenAntipaladinCrueltyCount(doc);
  const expected = expectedAntipaladinCrueltyCount(doc);
  const warn = antipaladinCrueltiesNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isAntipaladin) return null;

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
          Cruelties
          <span
            className={countClass}
            title={
              warn
                ? "More cruelties chosen than the APG progression (3rd level and every three levels thereafter) grants"
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
            One cruelty is applied per touch of corruption use, chosen at the time of use. Pick
            known cruelties as you level (3rd, 6th, 9th, ...); the menu itself expands at
            3rd/6th/9th/12th. Cruelty save DC: {dc > 0 ? dc : "10 + 1/2 level + Cha mod"}.
            Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search cruelties…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {cruelties.map((c) => {
              const isSel = selected.has(c.id);
              const belowLevel = level > 0 && level < c.minLevel;
              return (
                <div key={c.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {c.name} <span className="tag-mystery">{TIER_LABEL[c.tier] ?? c.tier}</span>
                    </div>
                    <div className="preq">
                      <span className="desc-text">{c.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires antipaladin {c.minLevel}
                        {c.minLevel === 3 ? "rd" : "th"} (currently {level})
                      </div>
                    )}
                    {c.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleAntipaladinCruelty(d, c.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {cruelties.length === 0 ? <div className="empty">No cruelties match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";

import { MONK_KI_POWERS, MONK_KI_POWER_IDS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  chosenMonkKiPowerCount,
  expectedMonkKiPowerCount,
  monkKiPowersNeedWarning,
  monkUnchainedLevel,
  toggleMonkKiPower,
} from "../../model/monkKiPowers.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface KiPowerPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Monk (Unchained) ki power selection (issue #65), mirroring `HexPicker` —
 * ki powers are entirely `displayOnly` (see `@pf1/engine` `monk-ki-powers.ts`'s
 * doc comment for why none of the 39 core powers clear the bar for a real
 * `Change`), so this picker is purely a record of choices surfaced on the
 * sheet's Class Features list. Flat list, soft-filtered by `minLevel` (below-
 * level powers stay pickable, just annotated) — free-choice, never blocks
 * past the expected count, same hybrid-prereqs posture as `HexPicker`.
 */
export function KiPowerPicker({ doc, update }: KiPowerPickerProps) {
  const isMonkUnchained = doc.identity.classes.some((c) => c.tag === "monkUnchained");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Ki Powers", false);

  const selected = useMemo(() => new Set(doc.build.monkKiPowers ?? []), [doc.build.monkKiPowers]);
  const level = monkUnchainedLevel(doc);

  const powers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MONK_KI_POWER_IDS.map((id) => MONK_KI_POWERS[id]!)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenMonkKiPowerCount(doc);
  const expected = expectedMonkKiPowerCount(doc);
  const warn = monkKiPowersNeedWarning(doc);
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
          Ki Powers
          <span
            className={countClass}
            title={
              warn
                ? "More ki powers chosen than the Pathfinder Unchained progression (4th level, then every 2 levels) grants"
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
            Pick a ki power at 4th level and every 2 levels thereafter. Every ki power is an
            activated, limited-use ability (spends ki points) — no automatic sheet effect. Free-
            choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search ki powers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {powers.map((p) => {
              const isSel = selected.has(p.id);
              const belowLevel = level > 0 && level < p.minLevel;
              return (
                <div key={p.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">{p.name}</div>
                    <div className="preq">
                      <span className="desc-text">{p.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires monk {p.minLevel}th (currently {level})
                      </div>
                    )}
                    {p.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleMonkKiPower(d, p.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {powers.length === 0 ? <div className="empty">No ki powers match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

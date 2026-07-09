import { useMemo, useState } from "react";

import { WITCH_HEXES, WITCH_HEX_IDS, witchHexDC } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenWitchHexCount,
  expectedWitchHexCount,
  toggleWitchHex,
  witchHexesNeedWarning,
  witchLevel as getWitchLevel,
} from "../../model/witchHexes.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface HexPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { hex: "Hex", major: "Major Hex", grand: "Grand Hex" };

/**
 * Witch hex selection (issue #65), mirroring `MagusArcanaPicker` — hexes are
 * NOT patron-scoped (unlike oracle revelations, which are mystery-scoped;
 * see `@pf1/engine` `witch-hexes.ts`'s doc comment), so this is a flat
 * picker over every hex the witch's current level makes at least soft-
 * available. A witch learns a new hex at 1st level and every even level
 * thereafter, plus one more per "Extra Hex" feat (see
 * `model/witchHexes.ts`'s budget math). Free-choice, never blocks past the
 * expected count — same hybrid-prereqs posture as `MagusArcanaPicker`.
 *
 * Major hexes (10th level) and Grand hexes (18th level) are soft-filtered by
 * `minLevel` exactly like a base arcana's own higher minimum — below-level
 * hexes stay pickable, just annotated, never disabled. Advanced Player's
 * Guide hexes only — see `@pf1/engine` `witch-hexes.ts`'s scope note.
 *
 * Picked hexes also show up in the sheet's Class Features list (tagged
 * "— Hex"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function HexPicker({ doc, refData, update }: HexPickerProps) {
  const isWitch = doc.identity.classes.some((c) => c.tag === "witch");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Hexes", false);

  const selected = useMemo(() => new Set(doc.build.witchHexes ?? []), [doc.build.witchHexes]);
  const level = getWitchLevel(doc);
  const intMod = Math.floor((doc.abilities.int - 10) / 2);
  const dc = witchHexDC(level, intMod);

  const hexes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WITCH_HEX_IDS.map((id) => WITCH_HEXES[id]!)
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenWitchHexCount(doc);
  const expected = expectedWitchHexCount(doc, refData);
  const warn = witchHexesNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isWitch) return null;

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
          <span
            className={countClass}
            title={
              warn
                ? "More hexes chosen than the APG progression (1st + every even level, plus Extra Hex feats) grants"
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
            Pick hexes as you level (1st, 2nd, 4th, 6th, …; +1 per Extra Hex feat). Major hexes
            unlock at 10th, Grand hexes at 18th — Advanced Player's Guide hexes only. Hex save DC
            (where applicable): {dc > 0 ? dc : "10 + 1/2 level + Int mod"}. Free-choice — never
            blocks past the expected count.
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
              const isSel = selected.has(h.id);
              const belowLevel = level > 0 && level < h.minLevel;
              return (
                <div key={h.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {h.name} <span className="tag-mystery">{TIER_LABEL[h.tier] ?? h.tier}</span>
                    </div>
                    <div className="preq">
                      <span className="desc-text">{h.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires witch {h.minLevel}
                        {h.minLevel === 1 ? "st" : "th"} (currently {level})
                      </div>
                    )}
                    {h.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleWitchHex(d, h.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {hexes.length === 0 ? <div className="empty">No hexes match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

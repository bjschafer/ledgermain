import { useMemo, useState } from "react";

import { mergedWitchHexCatalog, witchHexDC } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenWitchHexCount,
  expectedWitchHexCount,
  toggleWitchHex,
  witchHexesNeedWarning,
  witchLevel as getWitchLevel,
} from "../../model/witchHexes.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface HexPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { hex: "Hex", major: "Major Hex", grand: "Grand Hex" };

/**
 * Witch hex selection (issue #65, full-catalog issue #74 Phase 3b), mirroring
 * `MagusArcanaPicker`/`RagePowerPicker` — hexes are NOT patron-scoped (unlike
 * oracle revelations, which are mystery-scoped; see `@pf1/engine`
 * `witch-hexes.ts`'s doc comment), so this is a flat picker over every hex
 * the witch's current level makes at least soft-available. A witch learns a
 * new hex at 1st level and every even level thereafter, plus one more per
 * "Extra Hex" feat (see `model/witchHexes.ts`'s budget math). Free-choice,
 * never blocks past the expected count — same hybrid-prereqs posture as
 * `MagusArcanaPicker`.
 *
 * Major hexes (10th level) and Grand hexes (18th level) are soft-filtered by
 * `minLevel` exactly like a base arcana's own higher minimum — below-level
 * hexes stay pickable, just annotated, never disabled.
 *
 * Browses the FULL published hex catalog (`mergedWitchHexCatalog` — every
 * vendored entry, overlaid with the 27-entry hand-verified table on a name
 * match), not just the hand-verified Advanced Player's Guide "core" slice.
 * Every entry today is display-only (see `@pf1/engine` `witch-hexes.ts`'s
 * doc comment for why), so the "M" badge convention (`RagePowerPicker`'s)
 * never actually lights up yet — kept for when a future hex is promoted to a
 * real Change, same posture as rage powers before issue #75.
 *
 * Picked hexes also show up in the sheet's Class Features list (tagged
 * "— Hex"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts` (through `resolveWitchHex`, which resolves
 * BOTH a hand-authored and a vendored-only pick).
 */
export function HexPicker({ doc, refData, update }: HexPickerProps) {
  const isWitch = doc.identity.classes.some((c) => c.tag === "witch");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Hexes", false);

  const selected = useMemo(() => new Set(doc.build.witchHexes ?? []), [doc.build.witchHexes]);
  const level = getWitchLevel(doc);
  const intMod = Math.floor((doc.abilities.int - 10) / 2);
  const dc = witchHexDC(level, intMod);

  const catalog = useMemo(() => mergedWitchHexCatalog(refData), [refData]);

  const hexes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

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
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">
            Pick hexes as you level (1st, 2nd, 4th, 6th, …; +1 per Extra Hex feat). Major hexes
            unlock at 10th, Grand hexes at 18th. Browses the full published catalog; entries marked{" "}
            <span className="badge-modeled">M</span> carry a real, live mechanical effect — the rest
            are prose-only. Hex save DC (where applicable):{" "}
            {dc > 0 ? dc : "10 + 1/2 level + Int mod"}. Free-choice — never blocks past the expected
            count.
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
                      {h.name}
                      {h.nameSuffix ? ` ${h.nameSuffix}` : ""}{" "}
                      <span className="tag-mystery">{TIER_LABEL[h.tier] ?? h.tier}</span>
                      {!h.displayOnly && (
                        <span
                          className="badge-modeled"
                          title="Carries a real, live mechanical effect"
                        >
                          {" "}
                          M
                        </span>
                      )}
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
                    {h.description ? <FeatureDescription html={h.description} /> : null}
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

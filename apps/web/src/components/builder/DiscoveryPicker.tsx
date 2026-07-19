import { useMemo, useState } from "react";

import { ALCHEMIST_DISCOVERIES, ALCHEMIST_DISCOVERY_IDS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  alchemistLevel,
  alchemistDiscoveriesNeedWarning,
  chosenAlchemistDiscoveryCount,
  expectedAlchemistDiscoveryCount,
  toggleAlchemistDiscovery,
} from "../../model/alchemistDiscoveries.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface DiscoveryPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Alchemist discovery selection (issue #65), mirroring `MagusArcanaPicker`
 * exactly. An alchemist learns a new discovery at 2nd level and every even
 * level thereafter, plus one more per "Extra Discovery" feat (see
 * `model/alchemistDiscoveries.ts`'s budget math). Free-choice, never blocks
 * past the expected count — same hybrid-prereqs posture as
 * `MagusArcanaPicker`. Advanced Player's Guide discoveries plus a handful of
 * relevant Ultimate Magic/Ultimate Combat ones only — see `@pf1/engine`
 * `alchemist-discoveries.ts`'s scope note.
 *
 * Mutagen itself (the base class feature, not a discovery) already surfaces
 * as a toggleable resource pool with 3 linked buffs (Str/Dex/Con) in the
 * tracker's Resources panel — see `resources.ts`'s `resolveGrantsBuffs` — no
 * picker needed for it. Cognatogen (a discovery here) shares the same
 * numeric shape but has no vendored buff to toggle automatically; its
 * `contextNotes` spell out the exact numbers to apply by hand.
 *
 * Picked discoveries also show up in the sheet's Class Features list (tagged
 * "— Discovery"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function DiscoveryPicker({ doc, refData, update }: DiscoveryPickerProps) {
  const isAlchemist = doc.identity.classes.some((c) => c.tag === "alchemist");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Discoveries", false);

  const selected = useMemo(
    () => new Set(doc.build.alchemistDiscoveries ?? []),
    [doc.build.alchemistDiscoveries],
  );
  const level = alchemistLevel(doc);

  const discoveries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALCHEMIST_DISCOVERY_IDS.map((id) => ALCHEMIST_DISCOVERIES[id]!)
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenAlchemistDiscoveryCount(doc);
  const expected = expectedAlchemistDiscoveryCount(doc, refData);
  const warn = alchemistDiscoveriesNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isAlchemist) return null;

  return (
    <div className="subsection magus-arcana-picker">
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
          Discoveries
          <span
            className={countClass}
            title={
              warn
                ? "More discoveries chosen than the APG progression (2nd level + every even level, plus Extra Discovery feats) grants"
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
          <p className="hint magus-arcana-picker-hint">
            Pick discoveries as you level (2nd, 4th, 6th, …; +1 per Extra Discovery feat). Advanced
            Player's Guide discoveries plus a handful of Ultimate Magic/Ultimate Combat ones.
            Free-choice — never blocks past the expected count; a "Requires alchemist Nth" note is a
            soft reminder, not a hard gate.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search discoveries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {discoveries.map((d) => {
              const isSel = selected.has(d.id);
              const belowLevel = level > 0 && level < d.minLevel;
              return (
                <div key={d.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">{d.name}</div>
                    <div className="preq">
                      <span className="desc-text">{d.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires alchemist {d.minLevel}th (currently {level})
                      </div>
                    )}
                    {d.contextNotes?.map((note, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {note.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d2) => toggleAlchemistDiscovery(d2, d.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {discoveries.length === 0 ? <div className="empty">No discoveries match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

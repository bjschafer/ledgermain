import { useMemo, useState } from "react";

import { MAGUS_ARCANA, MAGUS_ARCANA_IDS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenMagusArcanaCount,
  expectedMagusArcanaCount,
  magusArcanaNeedWarning,
  magusLevel,
  toggleMagusArcana,
} from "../../model/magusArcana.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface MagusArcanaPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Magus arcana selection (issue #61), mirroring `ArcanistExploitPicker`
 * exactly. A magus learns a new arcana at 3rd level and every 3 levels
 * thereafter, plus one more per "Extra Arcana" feat (see
 * `model/magusArcana.ts`'s budget math). Free-choice, never blocks past the
 * expected count — same hybrid-prereqs posture as `ArcanistExploitPicker`.
 * Base Ultimate Magic arcana only — later-book arcana are out of scope, see
 * `@pf1/engine` `magus-arcana.ts`.
 *
 * An arcana's own `minLevel` (some require magus 6th/9th/12th/15th) is SOFT
 * availability filtering, matching the file's honesty bar — below-level
 * arcana stay pickable, just annotated, never disabled.
 *
 * Picked arcana also show up in the sheet's Class Features list (tagged
 * "— Magus Arcana"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts` — this panel is just the picker + a reminder
 * list of what each chosen arcana costs/does.
 */
export function MagusArcanaPicker({ doc, refData, update }: MagusArcanaPickerProps) {
  const isMagus = doc.identity.classes.some((c) => c.tag === "magus");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:MagusArcana", false);

  const selected = useMemo(() => new Set(doc.build.magusArcana ?? []), [doc.build.magusArcana]);
  const level = magusLevel(doc);

  const arcana = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAGUS_ARCANA_IDS.map((id) => MAGUS_ARCANA[id]!)
      .filter((a) => !q || a.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

  const chosen = chosenMagusArcanaCount(doc);
  const expected = expectedMagusArcanaCount(doc, refData);
  const warn = magusArcanaNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isMagus) return null;

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
          Magus Arcana
          <span
            className={countClass}
            title={
              warn
                ? "More arcana chosen than the UM progression (3rd level + every 3 levels, plus Extra Arcana feats) grants"
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
            Pick arcana as you level (3rd, 6th, 9th, …; +1 per Extra Arcana feat). Base Ultimate
            Magic arcana only. Free-choice — never blocks past the expected count; a "Requires magus
            Nth" note is a soft reminder, not a hard gate.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search arcana…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {arcana.map((a) => {
              const isSel = selected.has(a.id);
              const belowLevel = level > 0 && level < a.minLevel;
              return (
                <div key={a.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">{a.name}</div>
                    <div className="preq">
                      <span className="desc-text">{a.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires magus {a.minLevel}th (currently {level})
                      </div>
                    )}
                    {a.contextNotes?.map((note, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {note.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleMagusArcana(d, a.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {arcana.length === 0 ? <div className="empty">No arcana match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

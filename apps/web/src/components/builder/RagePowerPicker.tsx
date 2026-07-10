import { useMemo, useState } from "react";

import { RAGE_POWERS, RAGE_POWER_IDS, type RagePowerEdition } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  barbarianLevel,
  chosenRagePowerCount,
  expectedRagePowerCount,
  ragePowersNeedWarning,
  toggleRagePower,
} from "../../model/ragePowers.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RagePowerPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Barbarian rage power selection (issue #65/#67), mirroring `DiscoveryPicker`
 * exactly. A barbarian (chained OR Unchained — both share this one picker,
 * see `@pf1/engine` `rage-powers.ts`'s doc comment) gains a new rage power at
 * 2nd level and every even level thereafter, plus one more per "Extra Rage
 * Power" feat taken (see `model/ragePowers.ts`'s budget math). Free-choice,
 * never blocks past the expected count — same hybrid-prereqs posture as
 * `DiscoveryPicker`. Core Rulebook + a curated Advanced Player's Guide slice
 * only — see `@pf1/engine` `rage-powers.ts`'s scope note.
 *
 * Most entries are display-only (a `contextNotes` reminder spells out the
 * exact numbers/activation cost); a few (Raging Climber, Raging Swimmer,
 * Swift Foot) carry a real buff-gated `Change` that applies only while the
 * Rage buff is active (issue #75's `Change.activeWhenBuff` — see
 * `@pf1/engine` `rage-powers.ts`'s doc comment for which and why). Picked
 * powers also show up in the sheet's Class Features list (tagged "— Rage
 * Power"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 */
export function RagePowerPicker({ doc, refData, update }: RagePowerPickerProps) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:RagePowers", false);

  const editionSet = useMemo(() => {
    const set = new Set<RagePowerEdition>();
    for (const c of doc.identity.classes) {
      if (c.tag === "barbarian" || c.tag === "barbarianUnchained") set.add(c.tag);
    }
    return set;
  }, [doc.identity.classes]);
  const selected = useMemo(() => new Set(doc.build.ragePowers ?? []), [doc.build.ragePowers]);
  const level = barbarianLevel(doc);

  const powers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RAGE_POWER_IDS.map((id) => RAGE_POWERS[id]!)
      .filter((p) => p.editions.some((e) => editionSet.has(e)))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [query, selected, editionSet]);

  const chosen = chosenRagePowerCount(doc);
  const expected = expectedRagePowerCount(doc, refData);
  const warn = ragePowersNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (editionSet.size === 0) return null;

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
          Rage Powers
          <span
            className={countClass}
            title={
              warn
                ? "More rage powers chosen than the 2nd-level-and-every-even-level-thereafter progression (plus Extra Rage Power feats) grants"
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
          <p className="hint magus-arcana-picker-hint">
            Pick rage powers as you level (2nd, 4th, 6th, …; +1 per Extra Rage Power feat). Core
            Rulebook plus a curated Advanced Player's Guide slice. Free-choice — never blocks past
            the expected count; a "Requires barbarian Nth" note is a soft reminder, not a hard gate.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search rage powers…"
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
                        ⚠ Requires barbarian {p.minLevel}th (currently {level})
                      </div>
                    )}
                    {p.contextNotes?.map((noteEntry, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {noteEntry.text}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d2) => toggleRagePower(d2, p.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {powers.length === 0 ? <div className="empty">No rage powers match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}

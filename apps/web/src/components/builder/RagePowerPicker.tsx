import { useMemo, useState } from "react";

import { mergedRagePowerCatalog, type RagePowerEdition } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  barbarianLevel,
  chosenRagePowerCount,
  expectedRagePowerCount,
  ragePowersNeedWarning,
  toggleRagePower,
} from "../../model/ragePowers.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RagePowerPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Barbarian rage power selection (issue #65/#67, full-catalog issue #74
 * Phase 3a), mirroring `DiscoveryPicker`'s layout and `ArchetypePicker`'s
 * "M" badge convention. A barbarian (chained OR Unchained — both share this
 * one picker, see `@pf1/engine` `rage-powers.ts`'s doc comment) gains a new
 * rage power at 2nd level and every even level thereafter, plus one more per
 * "Extra Rage Power" feat taken (see `model/ragePowers.ts`'s budget math).
 * Free-choice, never blocks past the expected count — same hybrid-prereqs
 * posture as `DiscoveryPicker`.
 *
 * Browses the FULL published rage-power catalog (`mergedRagePowerCatalog` —
 * every vendored entry, overlaid with the 30-entry hand-verified table on a
 * name match), not just the hand-verified slice. A `badge-modeled` "M" marks
 * which entries carry real, live mechanics (a `changes`/`contextNotes` a few
 * of which are buff-gated to "while raging" — issue #75's
 * `Change.activeWhenBuff`); everything else is prose-only, shown via the
 * same collapsible `FeatureDescription` the Class Features list uses.
 * Picked powers also show up in the sheet's Class Features list (tagged "—
 * Rage Power"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts` (through `resolveRagePower`, which resolves
 * BOTH a hand-authored and a vendored-only pick).
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

  const catalog = useMemo(() => mergedRagePowerCatalog(refData), [refData]);

  const powers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((p) => p.editions.some((e) => editionSet.has(e)))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected, editionSet]);

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
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint magus-arcana-picker-hint">
            Pick rage powers as you level (2nd, 4th, 6th, …; +1 per Extra Rage Power feat). Browses
            the full published catalog; entries marked <span className="badge-modeled">M</span>{" "}
            carry a real, live mechanical effect (see Class Features) — the rest are prose-only.
            Free-choice — never blocks past the expected count; a "Requires barbarian Nth" note is a
            soft reminder, not a hard gate.
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
                    <div className="pname">
                      {p.name}
                      {p.nameSuffix ? ` ${p.nameSuffix}` : ""}
                      {!p.displayOnly && (
                        <span
                          className="badge-modeled"
                          title="Carries a real, live mechanical effect (see Class Features)"
                        >
                          {" "}
                          M
                        </span>
                      )}
                    </div>
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
                    {p.description ? <FeatureDescription html={p.description} /> : null}
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

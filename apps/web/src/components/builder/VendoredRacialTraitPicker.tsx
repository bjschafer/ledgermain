import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  availableVendoredRacialTraits,
  hasVendoredRacialTrait,
  toggleVendoredRacialTrait,
} from "../../model/racialTraits.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

/**
 * The ~80-race vendored alternate-racial-trait catalog (issue #74 fill
 * plan), scoped to the character's current race. Mirrors `RagePowerPicker`'s
 * collapsible-search-list shape, but the honesty posture is different: unlike
 * the hand-authored picker inline in `RaceSection` (which enforces a real
 * standard-trait swap), a vendored pick's `replacedTraitNames` is shown as a
 * reminder ONLY — nothing here suppresses the race's own standard `Change`s,
 * so every row carries a soft "verify manually" note (see `RacialTrait`'s
 * doc comment in `@pf1/schema` for why). Entries that duplicate a
 * hand-authored trait by name are excluded (`availableVendoredRacialTraits`)
 * so the two pickers never offer the same trait under two different
 * guarantees.
 */
export function VendoredRacialTraitPicker({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:VendoredRacialTraits", true);

  const all = useMemo(() => availableVendoredRacialTraits(doc, refData), [doc, refData]);
  const chosen = (doc.build.vendoredRacialTraits ?? []).filter((id) =>
    all.some((t) => t.id === id),
  ).length;

  const traits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.replacedTraitNames.some((r) => r.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        const sa = hasVendoredRacialTrait(doc, a.id) ? 0 : 1;
        const sb = hasVendoredRacialTrait(doc, b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [all, query, doc]);

  if (all.length === 0) return null;

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
          More alternate racial traits (vendored)
          <span className="hint"> · {chosen} chosen</span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint magus-arcana-picker-hint">
            Sourced from the wider published catalog, not hand-verified like the traits above.
            `Changes` apply automatically when structured, but the "replaces" note is a reminder
            only — retire the named standard trait(s) yourself; nothing here suppresses them.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search alternate racial traits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {traits.map((t) => {
              const isSel = hasVendoredRacialTrait(doc, t.id);
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      <span
                        className="tag-bloodline"
                        title={`Replaces ${t.replacedTraitNames.join(", ")} — verify manually`}
                      >
                        replaces {t.replacedTraitNames.join(", ")}
                      </span>
                    </div>
                    {isSel
                      ? t.contextNotes.map((note, i) => (
                          <div key={i} className="hint" style={{ marginTop: 2 }}>
                            ⚠ {note.text}
                          </div>
                        ))
                      : null}
                    {t.description ? <FeatureDescription html={t.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleVendoredRacialTrait(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {traits.length === 0 ? (
              <div className="empty">No alternate racial traits match.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

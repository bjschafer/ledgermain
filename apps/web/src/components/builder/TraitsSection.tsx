import { useMemo, useState } from "react";

import { TRAITS, TRAIT_IDS, unappliedChanges, type TraitCategory } from "@pf1/engine";

import { changeTargetLabel } from "../../model/names.js";
import {
  chosenTraitCount,
  EXPECTED_TRAIT_COUNT,
  toggleTrait,
  traitsNeedWarning,
} from "../../model/traits.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const TRAIT_CATEGORIES: TraitCategory[] = ["Combat", "Faith", "Magic", "Social"];

/**
 * Character traits (issue #23): two picked at creation, from (conventionally)
 * two different categories. Pattern-matches `FeatsSection` — search + category
 * filter + a chosen list with remove — but simpler, since traits have no
 * prereqs or in-line choices. Never blocks past two; the count badge just
 * turns to a soft warning color (see `traitsNeedWarning`).
 */
export function TraitsSection({ doc, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TraitCategory | "All">("All");
  const selected = useMemo(() => new Set(doc.build.traits ?? []), [doc.build.traits]);

  const traits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRAIT_IDS.map((id) => TRAITS[id]!)
      .filter((tr) => {
        if (q && !tr.name.toLowerCase().includes(q)) return false;
        if (category !== "All" && tr.category !== category) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [query, category, selected]);

  const chosen = chosenTraitCount(doc);
  const warn = traitsNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  // Chosen traits' reminders (contextNotes) — same idea as ConditionsPanel's
  // active-condition notes list, so a trait's situational scope/class-skill
  // grant/HD cap is never silently lost once picked.
  const chosenTraits = useMemo(
    () => [...selected].map((id) => TRAITS[id]).filter((tr): tr is NonNullable<typeof tr> => !!tr),
    [selected],
  );

  return (
    <Panel
      title="Traits"
      step="iii½"
      storageKey="panel:Traits"
      right={
        <span
          className={countClass}
          title={
            warn
              ? "PF1 characters conventionally take two traits from two different categories"
              : undefined
          }
        >
          {chosen} / {EXPECTED_TRAIT_COUNT} traits
        </span>
      }
    >
      <input
        className="search"
        type="text"
        placeholder="Search traits…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips">
        <button
          type="button"
          className="chip"
          aria-pressed={category === "All"}
          onClick={() => setCategory("All")}
        >
          All
        </button>
        {TRAIT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className="chip"
            aria-pressed={category === cat}
            onClick={() => setCategory(category === cat ? "All" : cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="scroll">
        {traits.map((tr) => {
          const isSel = selected.has(tr.id);
          const missing = unappliedChanges(tr.changes);
          return (
            <div key={tr.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
              <div className="pmain">
                <div className="pname">
                  {tr.name}
                  <span className="tag-bloodline" title={`${tr.category} trait`}>
                    {tr.category}
                  </span>
                  {missing.length > 0 ? (
                    <span
                      className="soft"
                      title={`Not auto-applied: ${missing.map((c) => changeTargetLabel(c.target)).join(", ")}`}
                    >
                      ⚠ partial
                    </span>
                  ) : null}
                </div>
                <div className="preq">
                  <span className="soft">{tr.summary}</span>
                </div>
              </div>
              <button
                type="button"
                className={`pick-btn ${isSel ? "remove" : "add"}`}
                onClick={() => update((d) => toggleTrait(d, tr.id))}
              >
                {isSel ? "Remove" : "Add"}
              </button>
            </div>
          );
        })}
        {traits.length === 0 ? <div className="empty">No traits match.</div> : null}
      </div>
      {chosenTraits.length > 0 ? (
        <ul className="cond-notes">
          {chosenTraits.map((tr) => (
            <li key={tr.id}>
              <b>{tr.name}.</b> {tr.summary}
              {tr.contextNotes?.map((note, i) => (
                <div key={i} className="hint" style={{ marginTop: 2 }}>
                  ⚠ {note.text}
                </div>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

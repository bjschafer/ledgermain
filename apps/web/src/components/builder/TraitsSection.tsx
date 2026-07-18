import { useMemo, useState } from "react";

import { unappliedChanges } from "@pf1/engine";
import type { TraitCategory } from "@pf1/schema";

import { changeTargetLabel } from "../../model/names.js";
import {
  allTraitIds,
  chosenTraitCount,
  EXPECTED_TRAIT_COUNT,
  resolveTrait,
  TRAIT_CATEGORIES,
  toggleTrait,
  traitsNeedWarning,
} from "../../model/traits.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";
import { HomebrewTraitEditor } from "./HomebrewTraitEditor.js";
import { Panel } from "./Panel.js";
import { SearchMiss } from "./SearchMiss.js";
import type { BuilderProps } from "./types.js";

/**
 * Character traits (issue #23): two picked at creation, from (conventionally)
 * two different categories. Pattern-matches `FeatsSection` — search + category
 * filter + a chosen list with remove — but simpler, since traits have no
 * prereqs or in-line choices. Never blocks past two; the count badge just
 * turns to a soft warning color (see `traitsNeedWarning`).
 *
 * Homebrew traits (issue #87) resolve through `allTraitIds`/`resolveTrait`
 * (`model/traits.ts`) so they appear in the same picker as vendored ones,
 * badged with `HomebrewBadge`, and count against the same slot budget —
 * `chosenTraitCount`/`traitsNeedWarning` are id-source-agnostic already.
 */
export function TraitsSection(props: BuilderProps) {
  const { doc, update } = props;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TraitCategory | "All">("All");
  const selected = useMemo(() => new Set(doc.build.traits ?? []), [doc.build.traits]);

  const traits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTraitIds(doc)
      .map((id) => resolveTrait(doc, id)!)
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
  }, [doc, query, category, selected]);

  const chosen = chosenTraitCount(doc);
  const warn = traitsNeedWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";

  // Chosen traits' reminders (contextNotes) — same idea as ConditionsPanel's
  // active-condition notes list, so a trait's situational scope/class-skill
  // grant/HD cap is never silently lost once picked.
  const chosenTraits = useMemo(
    () =>
      [...selected]
        .map((id) => resolveTrait(doc, id))
        .filter((tr): tr is NonNullable<typeof tr> => !!tr),
    [doc, selected],
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
                  {tr.name} <HomebrewBadge id={tr.id} />
                  <span className="tag-bloodline" title={`${tr.category} trait`}>
                    {tr.category}
                  </span>
                  {missing.length > 0 ? (
                    <InfoTip
                      className="soft"
                      content={`Not auto-applied: ${missing.map((c) => changeTargetLabel(c.target)).join(", ")}`}
                    >
                      ⚠ partial
                    </InfoTip>
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
        {traits.length === 0 ? (
          query.trim() ? (
            <SearchMiss query={query.trim()} picker="traits" />
          ) : (
            <div className="empty">No traits match.</div>
          )
        ) : null}
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
      <HomebrewTraitEditor {...props} />
    </Panel>
  );
}

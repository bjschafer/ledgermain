import { useMemo, useState } from "react";

import {
  allTraitIds,
  chosenTraitCount,
  EXPECTED_TRAIT_COUNT,
  resolveTrait,
  traitsNeedWarning,
} from "../../model/traits.js";
import { GemIcon } from "../icons.js";
import { HomebrewTraitEditor } from "./HomebrewTraitEditor.js";
import { Panel } from "./Panel.js";
import { TraitManager } from "./TraitManager.js";
import { TraitRow } from "./TraitRow.js";
import type { BuilderProps } from "./types.js";

/**
 * Character traits (issue #23): two picked at creation, from (conventionally)
 * two different categories. Pattern-matches `FeatsSection` — the panel lists
 * what's chosen, and browsing the catalog happens in the full-screen
 * `TraitManager` (issue #89). Never blocks past two; the count badge just
 * turns to a soft warning color (see `traitsNeedWarning`).
 *
 * Homebrew traits (issue #87) resolve through `allTraitIds`/`resolveTrait`
 * (`model/traits.ts`) so they appear in the same picker as vendored ones,
 * badged with `HomebrewBadge`, and count against the same slot budget —
 * `chosenTraitCount`/`traitsNeedWarning` are id-source-agnostic already.
 */
export function TraitsSection(props: BuilderProps) {
  const { doc, update } = props;
  const [managerOpen, setManagerOpen] = useState(false);
  const selected = useMemo(() => new Set(doc.build.traits ?? []), [doc.build.traits]);

  const catalogSize = useMemo(() => allTraitIds(doc).length, [doc]);

  // Chosen traits, listed here with their reminders (contextNotes) — same idea
  // as ConditionsPanel's active-condition notes, so a trait's situational
  // scope/class-skill grant/HD cap is never silently lost once picked.
  const chosenTraits = useMemo(
    () =>
      [...selected]
        .map((id) => resolveTrait(doc, id))
        .filter((tr): tr is NonNullable<typeof tr> => !!tr)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [doc, selected],
  );

  // Only traits carrying a situational reminder need the notes list; the rows
  // above already carry each trait's summary.
  const reminders = chosenTraits.filter((tr) => (tr.contextNotes?.length ?? 0) > 0);

  const chosen = chosenTraitCount(doc);
  const warn = traitsNeedWarning(doc);

  return (
    <Panel
      title="Traits"
      step="iii½"
      icon={<GemIcon />}
      storageKey="panel:Traits"
      right={
        <span
          className={warn ? "hint warn-over" : "hint"}
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
      <div className="spell-manager-launch">
        <button type="button" className="btn-gold" onClick={() => setManagerOpen(true)}>
          Choose traits
        </button>
        <span className="hint">search and add from {catalogSize} traits</span>
      </div>

      {managerOpen && (
        <TraitManager doc={doc} update={update} onClose={() => setManagerOpen(false)} />
      )}

      <div className="scroll">
        {chosenTraits.length === 0 ? (
          <div className="empty">No traits chosen yet — “Choose traits” to add some.</div>
        ) : (
          chosenTraits.map((tr) => <TraitRow key={tr.id} trait={tr} selected update={update} />)
        )}
      </div>

      {reminders.length > 0 ? (
        <ul className="cond-notes">
          {reminders.map((tr) => (
            <li key={tr.id}>
              <b>{tr.name}.</b>
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

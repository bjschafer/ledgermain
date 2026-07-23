import { useMemo, useState } from "react";

import {
  allTraitIds,
  chosenTraitCount,
  expectedTraitCount,
  hasDrawback,
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
  const { doc, refData, update } = props;
  const [managerOpen, setManagerOpen] = useState(false);
  const selected = useMemo(() => new Set(doc.build.traits ?? []), [doc.build.traits]);

  // Deliberately not keyed on the whole `doc` — recomputing the ~2,000-entry
  // merged catalog on every unrelated doc edit would be wasteful; only a
  // refData swap (never happens post-load) or a homebrew-trait edit changes
  // this count.
  const catalogSize = useMemo(
    () => allTraitIds(doc, refData).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refData, doc.build.homebrew?.traits],
  );

  // Chosen traits. TraitRow renders each one's summary/description AND its
  // contextNotes reminders inline (situational scope, class-skill grants,
  // HD caps, …) — same pattern as FeatEntry's per-row notes — so a trait's
  // reminder is never silently lost once picked without a separate aggregate
  // list to keep in sync.
  const chosenTraits = useMemo(
    () =>
      [...selected]
        .map((id) => resolveTrait(doc, refData, id))
        .filter((tr): tr is NonNullable<typeof tr> => !!tr)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [doc, refData, selected],
  );

  const chosen = chosenTraitCount(doc);
  const expected = expectedTraitCount(doc, refData);
  const warn = traitsNeedWarning(doc, refData);
  const drawbackBonus = hasDrawback(doc, refData);

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
              : drawbackBonus
                ? "A drawback grants one bonus trait (three total)"
                : undefined
          }
        >
          {chosen} / {expected} traits
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
        <TraitManager
          doc={doc}
          refData={refData}
          update={update}
          onClose={() => setManagerOpen(false)}
        />
      )}

      <div className="scroll">
        {chosenTraits.length === 0 ? (
          <div className="empty">No traits chosen yet — “Choose traits” to add some.</div>
        ) : (
          chosenTraits.map((tr) => <TraitRow key={tr.id} trait={tr} selected update={update} />)
        )}
      </div>

      <HomebrewTraitEditor {...props} />
    </Panel>
  );
}

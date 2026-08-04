import { useMemo, useState } from "react";

import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { useIncrementalReveal } from "../../hooks/useIncrementalReveal.js";
import {
  combatFeatsForMartialFlexibility,
  featBenefitSummary,
} from "../../model/martialFlexibility.js";
import { buildPrereqContext, evaluatePrereqs } from "../../model/prereqs.js";
import { PrereqChecklist } from "../builder/FeatEntry.js";
import { SearchMiss } from "../builder/SearchMiss.js";
import { Dialog } from "../Dialog.js";
import { TipButton } from "../InfoTip.js";

/**
 * Full-screen browsable picker for the brawler's Martial Flexibility: every
 * catalog feat tagged Combat, searchable, each row showing a plain-text
 * benefit summary and a live prerequisite checklist. Reuses the exact
 * prereq machinery the builder's feat picker uses (`buildPrereqContext` +
 * `evaluatePrereqs`, `FeatEntry`'s `PrereqChecklist`) rather than a second
 * implementation, and the same `.spell-manager` single-pane shell
 * `SpellManager` uses in read-only mode — see `model/martialFlexibility.ts`'s
 * doc comment for why prereqs are enforced here at all.
 *
 * A row whose structured prereqs are unmet can't be borrowed (RAW: "the
 * brawler must meet all the feat's prerequisites"), unless it's the feat
 * already borrowed (selecting the same feat again is always allowed, mirroring
 * `FeatEntry`'s "an owned feat is never re-blocked" carve-out). Prose-only
 * prereqs surface as an advisory warning instead, same hybrid policy as the
 * builder.
 */
export function MartialFlexibilityDialog({
  doc,
  sheet,
  refData,
  borrowedId,
  onSelect,
  onClose,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  borrowedId: string;
  onSelect: (featId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const combatFeats = useMemo(() => combatFeatsForMartialFlexibility(refData), [refData]);
  const ctx = useMemo(() => buildPrereqContext(doc, sheet, refData), [doc, sheet, refData]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return combatFeats;
    return combatFeats.filter((f) => f.name.toLowerCase().includes(q));
  }, [combatFeats, query]);

  const { visibleCount, rootRef, sentinelRef } = useIncrementalReveal(matches.length);

  return (
    <Dialog
      title="Borrow a Combat Feat"
      subtitle={`${combatFeats.length} combat feats`}
      onClose={onClose}
      right={<span className="dialog-esc-hint">esc to close</span>}
    >
      <div className="spell-manager">
        <div className="spell-manager-filters">
          <input
            className="search"
            type="text"
            placeholder="Search combat feats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search combat feats"
            autoFocus
          />
        </div>
        <div className="spell-manager-panes is-single">
          <section className="spell-pane" aria-label="Combat feats">
            <div className="spell-pane-head">
              <span className="spell-pane-title">Combat feats</span>
              <span className="spell-pane-count">{matches.length}</span>
            </div>
            <div className="spell-pane-body" ref={rootRef}>
              {matches.length === 0 ? (
                query.trim() ? (
                  <SearchMiss query={query.trim()} picker="feats" />
                ) : (
                  <div className="empty">No combat feats found.</div>
                )
              ) : (
                matches.slice(0, visibleCount).map((feat) => {
                  const res = evaluatePrereqs(feat, ctx);
                  const isBorrowed = feat.id === borrowedId;
                  const blocked = res.blocked && !isBorrowed;
                  return (
                    <div
                      key={feat.id}
                      className={`pick-row${isBorrowed ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
                    >
                      <div className="pmain">
                        <div className="pname">{feat.name}</div>
                        {feat.description ? (
                          <div className="hint" style={{ marginTop: 2 }}>
                            {featBenefitSummary(feat.description)}
                          </div>
                        ) : null}
                        <PrereqChecklist res={res} />
                      </div>
                      <TipButton
                        className={`pick-btn ${isBorrowed ? "remove" : "add"}`}
                        disabled={blocked}
                        disabledReason="Prerequisites not met"
                        onClick={() => onSelect(feat.id)}
                      >
                        {isBorrowed ? "Borrowed" : blocked ? "Locked" : "Borrow"}
                      </TipButton>
                    </div>
                  );
                })
              )}
              {visibleCount < matches.length ? (
                <div ref={sentinelRef} className="picker-load-more-sentinel" aria-hidden="true" />
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </Dialog>
  );
}

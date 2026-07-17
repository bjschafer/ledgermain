import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { Dialog } from "../Dialog.js";
import { FeatEntry, type FeatRenderContext } from "./FeatEntry.js";

const FEAT_CATEGORIES = ["Combat", "General", "Metamagic", "Item Creation", "Teamwork"] as const;
type FeatCategory = (typeof FEAT_CATEGORIES)[number];

/**
 * The full-screen feat picker. The builder panel is sized to *display* the feats
 * a character has taken; browsing the ~1500-feat catalog is a different job, and
 * it gets the whole viewport: filters across the top, the full catalog on the
 * left, and the character's taken feats on the right so an add lands somewhere
 * visible without scrolling the source list away — the same split the spellbook
 * manager uses.
 */
export function FeatManager({
  fx,
  doc,
  refData,
  update,
  onClose,
}: {
  fx: FeatRenderContext;
  doc: CharacterDoc;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FeatCategory | "All">("All");
  const [hideIneligible, setHideIneligible] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(refData.feats)
      .filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (category !== "All" && !f.tags.includes(category)) return false;
        // Class-granted feats live in their own read-only block in the panel —
        // hide them here unless a legacy manual copy is selected (so it can
        // still be removed).
        if (fx.grantedIds.has(f.id) && !fx.selected.has(f.id)) return false;
        // Never hide a feat the character has already taken.
        if (hideIneligible && !fx.selected.has(f.id) && fx.prereqMap.get(f.id)?.blocked) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [refData.feats, query, category, hideIneligible, fx]);

  const taken = useMemo(
    () =>
      Object.values(refData.feats)
        .filter((f) => fx.selected.has(f.id) && !fx.grantedIds.has(f.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refData.feats, fx.selected, fx.grantedIds],
  );

  return (
    <Dialog
      title="Feats"
      subtitle={`${fx.chosen} / ${fx.expected} chosen · ${Object.keys(refData.feats).length} in the catalog`}
      onClose={onClose}
      right={<span className="dialog-esc-hint">esc to close</span>}
    >
      <div className="spell-manager">
        <div className="spell-manager-filters feat-manager-filters">
          <input
            className="search"
            type="text"
            placeholder="Search feats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search feats"
            autoFocus
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
            {FEAT_CATEGORIES.map((cat) => (
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
          <button
            type="button"
            className="filter-toggle"
            aria-pressed={hideIneligible}
            onClick={() => setHideIneligible((v) => !v)}
          >
            {hideIneligible ? "▪ Hide ineligible" : "▫ Hide ineligible"}
          </button>
        </div>

        <div className="spell-manager-panes">
          <section className="spell-pane" aria-label="Feat catalog">
            <div className="spell-pane-head">
              <span className="spell-pane-title">Catalog</span>
              <span className="spell-pane-count">{matches.length}</span>
            </div>
            <div className="spell-pane-body">
              {matches.length === 0 ? (
                <div className="empty">No feats match.</div>
              ) : (
                matches
                  .slice(0, 200)
                  .map((feat) => (
                    <FeatEntry
                      key={feat.id}
                      feat={feat}
                      fx={fx}
                      doc={doc}
                      refData={refData}
                      update={update}
                    />
                  ))
              )}
              {matches.length > 200 ? (
                <div className="empty">Showing first 200 — refine your search.</div>
              ) : null}
            </div>
          </section>

          <section className="spell-pane spell-pane--known" aria-label="Your feats">
            <div className="spell-pane-head">
              <span className="spell-pane-title">Your feats</span>
              <span className="spell-pane-count">{taken.length}</span>
            </div>
            <div className="spell-pane-body">
              {taken.length === 0 ? (
                <div className="empty">Nothing here yet — search on the left and add a feat.</div>
              ) : (
                taken.map((feat) => (
                  <FeatEntry
                    key={feat.id}
                    feat={feat}
                    fx={fx}
                    doc={doc}
                    refData={refData}
                    update={update}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Dialog>
  );
}

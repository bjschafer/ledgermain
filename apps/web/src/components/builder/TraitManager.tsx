import { useMemo, useState } from "react";

import type { CharacterDoc, RefData, TraitCategory, TraitDef } from "@pf1/schema";

import { mergedTraits } from "@pf1/engine";

import { useIncrementalReveal } from "../../hooks/useIncrementalReveal.js";
import { catalogCategories, chosenTraitCount, expectedTraitCount } from "../../model/traits.js";
import { Dialog } from "../Dialog.js";
import { SearchMiss } from "./SearchMiss.js";
import { TraitRow } from "./TraitRow.js";

/**
 * The full-screen trait picker (scaled to the ~2,000-entry vendored catalog
 * by) — the same two-pane shell as `FeatManager`, so browsing the trait
 * catalog behaves identically to browsing feats: filters across the top,
 * catalog on the left (revealed incrementally on scroll like `FeatManager`,
 * see `useIncrementalReveal`), chosen traits on the right so an add lands
 * somewhere visible.
 */
export function TraitManager({
  doc,
  refData,
  update,
  onClose,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TraitCategory | "All">("All");
  const selected = useMemo(() => new Set(doc.build.traits ?? []), [doc.build.traits]);

  // The merged vendored + hand-authored catalog plus this doc's own homebrew
  // traits — recomputed only when refData or the homebrew set changes, not on
  // every doc edit (see `mergedTraits`'s doc comment on why it isn't cheap
  // enough to call per keystroke).
  const catalog = useMemo(() => {
    const merged = mergedTraits(refData);
    const homebrew = doc.build.homebrew?.traits;
    return homebrew ? { ...merged, ...homebrew } : merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refData, doc.build.homebrew?.traits]);

  const all = useMemo(
    () => Object.values(catalog).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

  const categories = useMemo(() => catalogCategories(catalog), [catalog]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((tr) => {
      if (q && !tr.name.toLowerCase().includes(q)) return false;
      if (category !== "All" && tr.category !== category) return false;
      return true;
    });
  }, [all, query, category]);

  const { visibleCount, rootRef, sentinelRef } = useIncrementalReveal(matches.length);

  const taken = useMemo(() => all.filter((tr) => selected.has(tr.id)), [all, selected]);

  return (
    <Dialog
      title="Traits"
      subtitle={`${chosenTraitCount(doc)} / ${expectedTraitCount(doc, refData)} chosen · ${all.length} in the catalog`}
      onClose={onClose}
      right={<span className="dialog-esc-hint">esc to close</span>}
    >
      <div className="spell-manager">
        <div className="spell-manager-filters feat-manager-filters">
          <input
            className="search"
            type="text"
            placeholder="Search traits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search traits"
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
            {categories.map((cat: TraitDef["category"]) => (
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
        </div>

        <div className="spell-manager-panes">
          <section className="spell-pane" aria-label="Trait catalog">
            <div className="spell-pane-head">
              <span className="spell-pane-title">Catalog</span>
              <span className="spell-pane-count">{matches.length}</span>
            </div>
            <div className="spell-pane-body" ref={rootRef}>
              {matches.length === 0 ? (
                query.trim() ? (
                  <SearchMiss query={query.trim()} picker="traits" />
                ) : (
                  <div className="empty">No traits match.</div>
                )
              ) : (
                matches
                  .slice(0, visibleCount)
                  .map((tr) => (
                    <TraitRow
                      key={tr.id}
                      trait={tr}
                      selected={selected.has(tr.id)}
                      update={update}
                      doc={doc}
                    />
                  ))
              )}
              {visibleCount < matches.length ? (
                <div ref={sentinelRef} className="picker-load-more-sentinel" aria-hidden="true" />
              ) : null}
            </div>
          </section>

          <section className="spell-pane spell-pane--known" aria-label="Your traits">
            <div className="spell-pane-head">
              <span className="spell-pane-title">Your traits</span>
              <span className="spell-pane-count">{taken.length}</span>
            </div>
            <div className="spell-pane-body">
              {taken.length === 0 ? (
                <div className="empty">Nothing here yet. Search on the left and add a trait.</div>
              ) : (
                taken.map((tr) => (
                  <TraitRow key={tr.id} trait={tr} selected update={update} doc={doc} />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </Dialog>
  );
}

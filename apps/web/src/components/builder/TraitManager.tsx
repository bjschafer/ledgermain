import { useMemo, useState } from "react";

import type { CharacterDoc, RefData, TraitCategory, TraitDef } from "@pf1/schema";

import { mergedTraits } from "@pf1/engine";

import { catalogCategories, chosenTraitCount, EXPECTED_TRAIT_COUNT } from "../../model/traits.js";
import { Dialog } from "../Dialog.js";
import { SearchMiss } from "./SearchMiss.js";
import { TraitRow } from "./TraitRow.js";

/** Catalog entries shown per search before asking the player to narrow — mirrors `FeatManager`'s cap. */
const MAX_RESULTS = 200;

/**
 * The full-screen trait picker (issue #89, scaled to the ~2,000-entry
 * vendored catalog by issue #74 Phase 1) — the same two-pane shell as
 * `FeatManager`, so browsing the trait catalog behaves identically to
 * browsing feats: filters across the top, catalog on the left (capped at
 * {@link MAX_RESULTS} like `FeatManager`), chosen traits on the right so an
 * add lands somewhere visible.
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

  // The merged vendored + hand-authored catalog (issue #74 Phase 1) plus this
  // doc's own homebrew traits — recomputed only when refData or the
  // homebrew set changes, not on every doc edit (see `mergedTraits`'s doc
  // comment on why it isn't cheap enough to call per keystroke).
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

  const taken = useMemo(() => all.filter((tr) => selected.has(tr.id)), [all, selected]);

  return (
    <Dialog
      title="Traits"
      subtitle={`${chosenTraitCount(doc)} / ${EXPECTED_TRAIT_COUNT} chosen · ${all.length} in the catalog`}
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
            <div className="spell-pane-body">
              {matches.length === 0 ? (
                query.trim() ? (
                  <SearchMiss query={query.trim()} picker="traits" />
                ) : (
                  <div className="empty">No traits match.</div>
                )
              ) : (
                matches
                  .slice(0, MAX_RESULTS)
                  .map((tr) => (
                    <TraitRow
                      key={tr.id}
                      trait={tr}
                      selected={selected.has(tr.id)}
                      update={update}
                    />
                  ))
              )}
              {matches.length > MAX_RESULTS ? (
                <div className="empty">Showing first {MAX_RESULTS} — refine your search.</div>
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
                <div className="empty">Nothing here yet — search on the left and add a trait.</div>
              ) : (
                taken.map((tr) => <TraitRow key={tr.id} trait={tr} selected update={update} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </Dialog>
  );
}

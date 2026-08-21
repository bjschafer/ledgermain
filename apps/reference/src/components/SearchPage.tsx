import { useMemo, useState } from "react";

import { detailHref } from "../hooks/useHashRoute.js";
import {
  countByCollection,
  EMPTY_FILTER,
  searchIndex,
  spellLevels,
  type SearchFilter,
} from "../model/search.js";
import {
  COLLECTION_BADGE,
  COLLECTION_LABEL,
  COLLECTIONS,
  type CollectionId,
} from "../shared/collections.js";
import type { IndexEntry, RefIndex } from "../shared/indexCodec.js";

/** Enough rows to scroll through, few enough to stay instant on every keystroke. */
const RESULT_CAP = 50;

export function SearchPage({ index }: { index: RefIndex }) {
  const [filter, setFilter] = useState<SearchFilter>(EMPTY_FILTER);

  const counts = useMemo(() => countByCollection(index.entries), [index]);
  const levels = useMemo(() => spellLevels(index.entries), [index]);
  const results = useMemo(() => searchIndex(index.entries, filter, RESULT_CAP), [index, filter]);

  const browsing = filter.query.trim() === "" && filter.collection === null;

  const setCollection = (collection: CollectionId | null) =>
    setFilter((f) => ({ ...f, collection, level: collection === "spells" ? f.level : null }));

  return (
    <div className="search-page">
      <input
        className="search-box"
        type="search"
        autoFocus
        placeholder="Search spells, feats, gear, monsters…"
        value={filter.query}
        onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
        aria-label="Search the reference"
      />

      <div className="chip-row" role="group" aria-label="Filter by collection">
        <button
          type="button"
          className={`chip${filter.collection === null ? " is-on" : ""}`}
          onClick={() => setCollection(null)}
        >
          All
        </button>
        {COLLECTIONS.map((collection) => (
          <button
            key={collection}
            type="button"
            className={`chip${filter.collection === collection ? " is-on" : ""}`}
            onClick={() => setCollection(collection)}
          >
            {COLLECTION_LABEL[collection]}
            <span className="chip-count">{counts[collection] ?? 0}</span>
          </button>
        ))}
      </div>

      {filter.collection === "spells" && (
        <div className="chip-row" role="group" aria-label="Filter by spell level">
          <button
            type="button"
            className={`chip is-small${filter.level === null ? " is-on" : ""}`}
            onClick={() => setFilter((f) => ({ ...f, level: null }))}
          >
            Any level
          </button>
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              className={`chip is-small${filter.level === level ? " is-on" : ""}`}
              onClick={() => setFilter((f) => ({ ...f, level }))}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {browsing ? (
        <ConditionBoard index={index} />
      ) : (
        <ResultList entries={results.entries} total={results.total} />
      )}
    </div>
  );
}

function ResultList({ entries, total }: { entries: IndexEntry[]; total: number }) {
  if (entries.length === 0) return <p className="notice">No matches.</p>;
  return (
    <>
      <ul className="result-list">
        {entries.map((entry) => (
          <li key={`${entry.collection}/${entry.id}`}>
            <a className="result" href={detailHref(entry.collection, entry.id)}>
              <span className="result-name">{entry.name}</span>
              <span className={`badge is-${entry.collection}`}>
                {COLLECTION_BADGE[entry.collection]}
              </span>
              <span className="result-facet">{entry.facet}</span>
            </a>
          </li>
        ))}
      </ul>
      {total > entries.length && (
        <p className="notice">{total - entries.length} more… keep typing to narrow it down.</p>
      )}
    </>
  );
}

/**
 * The zero-keystroke view. Conditions are the table's most-asked lookup, so an
 * empty box browses them rather than showing nothing.
 */
function ConditionBoard({ index }: { index: RefIndex }) {
  const conditions = useMemo(
    () =>
      index.entries
        .filter((e) => e.collection === "conditions")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );

  return (
    <section className="board">
      <h2 className="board-title">Conditions</h2>
      <ul className="condition-grid">
        {conditions.map((entry) => (
          <li key={entry.id}>
            <a className="condition-tile" href={detailHref("conditions", entry.id)}>
              {entry.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="board-hint">
        Or search{" "}
        {COLLECTIONS.filter((c) => c !== "conditions")
          .map((c) => COLLECTION_LABEL[c].toLowerCase())
          .join(", ")}
        .
      </p>
    </section>
  );
}

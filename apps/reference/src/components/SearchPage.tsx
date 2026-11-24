import { useMemo, useRef, type Dispatch, type Ref, type SetStateAction } from "react";

import { detailHref } from "../hooks/useHashRoute.js";
import { countByCollection, searchIndex, spellLevels, type SearchFilter } from "../model/search.js";
import {
  COLLECTION_BADGE,
  COLLECTION_LABEL,
  COLLECTIONS,
  type CollectionId,
} from "../shared/collections.js";
import type { IndexEntry, RefIndex } from "../shared/indexCodec.js";

/** Enough rows to scroll through, few enough to stay instant on every keystroke. */
const RESULT_CAP = 50;

export function SearchPage({
  index,
  filter,
  setFilter,
}: {
  index: RefIndex;
  filter: SearchFilter;
  setFilter: Dispatch<SetStateAction<SearchFilter>>;
}) {
  const firstResultRef = useRef<HTMLAnchorElement>(null);

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
        placeholder="Search rules, spells, feats, gear, monsters…"
        value={filter.query}
        onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && firstResultRef.current) {
            e.preventDefault();
            firstResultRef.current.focus();
          }
        }}
        aria-label="Search the reference"
      />

      <div className="chip-row" role="group" aria-label="Filter by collection">
        <button
          type="button"
          className="chip"
          aria-pressed={filter.collection === null}
          onClick={() => setCollection(null)}
        >
          All
        </button>
        {COLLECTIONS.map((collection) => (
          <button
            key={collection}
            type="button"
            className="chip"
            aria-pressed={filter.collection === collection}
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
            className="chip is-small"
            aria-pressed={filter.level === null}
            onClick={() => setFilter((f) => ({ ...f, level: null }))}
          >
            Any level
          </button>
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              className="chip is-small"
              aria-pressed={filter.level === level}
              onClick={() => setFilter((f) => ({ ...f, level }))}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {browsing ? (
        <BrowseBoards index={index} />
      ) : (
        <ResultList
          entries={results.entries}
          total={results.total}
          firstResultRef={firstResultRef}
        />
      )}
    </div>
  );
}

function ResultList({
  entries,
  total,
  firstResultRef,
}: {
  entries: IndexEntry[];
  total: number;
  firstResultRef: Ref<HTMLAnchorElement>;
}) {
  if (entries.length === 0) return <p className="notice">No matches.</p>;
  return (
    <>
      <ul className="result-list">
        {entries.map((entry, i) => (
          <li key={`${entry.collection}/${entry.id}/${entry.anchor ?? ""}`}>
            <a
              className="result"
              href={detailHref(entry.collection, entry.id, entry.anchor)}
              ref={i === 0 ? firstResultRef : undefined}
            >
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
 * The zero-keystroke view: the two collections small enough to browse.
 * Conditions are the table's most-asked lookup; the rules chapters are where
 * to start when you don't know a name to search for.
 */
function BrowseBoards({ index }: { index: RefIndex }) {
  const conditions = useMemo(
    () =>
      index.entries
        .filter((e) => e.collection === "conditions")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [index],
  );
  const chapters = useMemo(() => {
    const names = new Map(
      index.entries
        .filter((e) => e.collection === "rules" && e.anchor === undefined)
        .map((e) => [e.id, e.name]),
    );
    return index.rulesChapters.flatMap((id) => {
      const name = names.get(id);
      return name === undefined ? [] : [{ id, name }];
    });
  }, [index]);

  return (
    <>
      <Board title="Rules">
        {chapters.map((chapter) => (
          <BoardTile key={chapter.id} href={detailHref("rules", chapter.id)} name={chapter.name} />
        ))}
      </Board>
      <Board title="Conditions">
        {conditions.map((entry) => (
          <BoardTile key={entry.id} href={detailHref("conditions", entry.id)} name={entry.name} />
        ))}
      </Board>
    </>
  );
}

function Board({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="board">
      <h2 className="board-title">{title}</h2>
      <ul className="board-grid">{children}</ul>
    </section>
  );
}

function BoardTile({ href, name }: { href: string; name: string }) {
  return (
    <li>
      <a className="board-tile" href={href}>
        {name}
      </a>
    </li>
  );
}

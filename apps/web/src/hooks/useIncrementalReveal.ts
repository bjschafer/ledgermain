import { useEffect, useRef, useState } from "react";

/**
 * Grows a `visibleCount` in chunks as a sentinel element scrolls into view,
 * instead of hard-capping a long catalog and telling the player to search
 * instead (issue #109: the feat/trait catalogs run into the thousands, and
 * players want to browse the whole list, not just narrow a search until it
 * fits under a cap). Mounting only `visibleCount` rows up front — growing
 * that number as the sentinel (placed after the last rendered row) comes
 * into view — keeps the initial render cheap without pulling in a
 * virtualization dependency: rows already scrolled past stay mounted (no
 * windowing), but nothing beyond the current chunk is ever mounted at all.
 *
 * `root` should be the scrollable ancestor the sentinel scrolls within
 * (e.g. the picker's own scroll pane) — without it, `IntersectionObserver`
 * falls back to the layout viewport, which still works here since
 * intersection accounts for clipping ancestors, but pass it when you have
 * it for a tighter `rootMargin` prefetch distance.
 */
export function useIncrementalReveal(total: number, chunkSize = 150) {
  const [visibleCount, setVisibleCount] = useState(chunkSize);
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // A new search/filter changes `total` — start back at the first chunk so
  // a narrowed result set isn't left scrolled past its own end.
  useEffect(() => {
    setVisibleCount(chunkSize);
  }, [total, chunkSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + chunkSize, total));
        }
      },
      { root: rootRef.current, rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, total, chunkSize]);

  return { visibleCount, rootRef, sentinelRef };
}

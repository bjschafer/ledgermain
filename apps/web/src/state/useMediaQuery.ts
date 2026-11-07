import { useEffect, useState } from "react";

/** The two-column layout's breakpoint: at or below it, the sheet sits behind a button. */
export const NARROW_LAYOUT_QUERY = "(max-width: 940px)";

/** Whether `query` currently matches, kept live across resizes. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" || !window.matchMedia ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

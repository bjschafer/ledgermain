/**
 * Shared collapse/expand indicator: a single chevron that CSS rotates
 * between pointing down (open) and pointing right (collapsed), rather than
 * swapping between two glyphs. Used by every collapsible header — the main
 * `Panel`, rarity/category group headers, subsection headers, and spell-level
 * groups — so they share one visual language and one place to resize it.
 */
export function Caret({ open }: { open: boolean }) {
  return (
    <svg
      className={`panel-caret${open ? "" : " is-collapsed"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

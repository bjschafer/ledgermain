import { useEffect, useState } from "react";

import { ChevronUpIcon } from "./icons.js";

/**
 * Mobile floating action cluster, bottom-right: a "Sheet" button that opens
 * the full derived sheet in a dialog (see Workbench in App.tsx — below the
 * 940px breakpoint `.sheet-col` is pulled out of the document flow entirely,
 * so this is the only way to reach it), plus a scroll-to-top button that
 * appears once the page has scrolled past the fold. Hidden entirely at
 * desktop widths (`.floating-controls` in styles.css) — desktop already has
 * the sheet sticky alongside the build column.
 */
export function FloatingControls({ onOpenSheet }: { onOpenSheet: () => void }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="floating-controls">
      {showTop && (
        <button
          type="button"
          className="floating-btn floating-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ChevronUpIcon />
        </button>
      )}
      <button
        type="button"
        className="floating-btn floating-sheet"
        onClick={onOpenSheet}
        aria-label="Open character sheet"
        title="Open character sheet"
      >
        Sheet
      </button>
    </div>
  );
}

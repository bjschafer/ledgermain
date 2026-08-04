import { useEffect, useRef, useState } from "react";

import { ChevronUpIcon } from "./icons.js";

const SHOW_AFTER_PX = 400;

/** Whether the visitor has asked for reduced motion (checked at click time). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Floating "scroll to top" button shown at every viewport width (unlike
 * `FloatingControls`, whose bottom-right cluster is mobile-only). Anchored
 * bottom-left so it never sits over that cluster's "Sheet" opener, the
 * toast host (bottom-center), or the sticky derived-sheet column that
 * occupies the desktop/tablet layout's right edge.
 *
 * The scroll listener is rAF-throttled rather than reacting to every
 * `scroll` event directly: on iPad Safari a fling can dispatch far more
 * scroll events than the display refreshes, and this only needs to
 * re-evaluate the show/hide threshold once per frame.
 */
export function ScrollTopButton() {
  const [show, setShow] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const evaluate = () => {
      ticking.current = false;
      setShow(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(evaluate);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="floating-btn floating-top scroll-top-btn"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })
      }
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <ChevronUpIcon />
    </button>
  );
}

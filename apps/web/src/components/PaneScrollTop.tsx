import type { RefObject } from "react";
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
 * Scroll-to-top for one scrolling pane, as opposed to {@link ScrollTopButton}
 * which drives the window. A picker pane holds its own scroll (an arcanist's
 * class list runs to eighteen hundred rows), so the window button never
 * appears there and the top of the list is otherwise a long drag away.
 *
 * Positions itself against the nearest positioned ancestor — give the pane
 * `position: relative`. The scroll listener is rAF-throttled: a fling can
 * dispatch far more scroll events than the display refreshes, and this only
 * needs to re-check the threshold once per frame.
 */
export function PaneScrollTop({
  targetRef,
  label = "Back to top",
}: {
  targetRef: RefObject<HTMLElement | null>;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const evaluate = () => {
      ticking.current = false;
      setShow(el.scrollTop > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(evaluate);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [targetRef]);

  if (!show) return null;

  return (
    <button
      type="button"
      className="pane-top-btn"
      onClick={() =>
        targetRef.current?.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        })
      }
      aria-label={label}
      title={label}
    >
      <ChevronUpIcon />
    </button>
  );
}

/**
 * Whether the visitor has asked for reduced motion. Read at the moment a
 * scroll or transition is about to start rather than subscribed to: the
 * preference changes about once a year, and every caller is inside a click or
 * an effect that is already running.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

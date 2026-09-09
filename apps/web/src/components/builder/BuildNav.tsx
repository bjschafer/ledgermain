import { useEffect, useMemo, useRef, useState } from "react";

import {
  attentionBadges,
  BUILD_SECTIONS,
  visibleBuildSections,
  type AttentionBadges,
} from "../../model/buildSections.js";
import { prefersReducedMotion } from "../../state/motion.js";
import type { BuilderProps } from "./types.js";

/**
 * Section-jump navigation for Build mode (UX audit: "Build-tab navigation +
 * attention badges"). A single `<nav>` whose CSS shape changes at the 940px
 * breakpoint — a sticky vertical rail on wide viewports, a sticky horizontal
 * chip row under that on narrow ones (see styles.css's "Build nav" section).
 *
 * Anchors are `id="section-<id>"` wrapper `div`s that `App.tsx`'s Workbench
 * places around each of the 11 build panels. Active-section tracking uses an
 * IntersectionObserver rather than scroll-position math so it stays correct
 * regardless of each panel's (highly variable) height.
 *
 * The section list and the badge counts are `model/buildSections.ts` — the
 * mode tab and the level-up toast read the same answers.
 */

/** React binding for `attentionBadges`; the math itself is pure and lives in the model. */
export function useAttentionBadges({
  doc,
  refData,
}: Pick<BuilderProps, "doc" | "refData">): AttentionBadges {
  return useMemo(() => attentionBadges(doc, refData), [doc, refData]);
}

export function BuildNav({
  doc,
  refData,
  onActiveChange,
}: BuilderProps & { onActiveChange?: (sectionId: string) => void }) {
  const badges = useAttentionBadges({ doc, refData });
  const [active, setActive] = useState<string>(BUILD_SECTIONS[0]!.id);

  const sections = useMemo(() => visibleBuildSections(doc, refData), [doc, refData]);
  const orderRef = useRef(sections.map((s) => s.id));
  orderRef.current = sections.map((s) => s.id);

  useEffect(() => {
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (visible.size === 0) return;
        // Topmost of the currently-visible sections, by document order.
        const next = orderRef.current.find((id) => visible.has(id));
        if (next) setActive(next);
      },
      // The "active zone" is a thin band near the top of the viewport — a
      // section counts as current once its top has crossed into it, and
      // stops once its bottom leaves it.
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  const onJump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav className="build-nav" aria-label="Jump to build section">
      {sections.map((section) => {
        const badge = badges[section.id];
        return (
          <button
            key={section.id}
            type="button"
            className={`build-nav-item${active === section.id ? " active" : ""}`}
            onClick={() => onJump(section.id)}
            aria-current={active === section.id ? "true" : undefined}
            title={badge ? badge.title : section.label}
          >
            <span className="build-nav-step">{section.step}</span>
            <span className="build-nav-label">{section.label}</span>
            {badge ? (
              <span className={`build-nav-badge build-nav-badge--${badge.tone}`}>
                {badge.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

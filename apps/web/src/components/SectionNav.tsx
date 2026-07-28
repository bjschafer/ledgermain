import { useEffect, useMemo, useState } from "react";

/**
 * Section-jump navigation driven by the DOM rather than a hand-maintained list
 * — shared by the Play and Settings tabs (Build keeps its own static list,
 * since its steps are numbered and never self-hide).
 *
 * Presence is discovered by scanning for `[data-nav-label]` anchors that
 * actually rendered a `.panel`, so panels that return `null` when they don't
 * apply (no familiar, non-caster, …) stay the single source of truth and the
 * nav can never list a jump target that leads nowhere.
 *
 * Same CSS shape as BuildNav (it reuses the `build-nav*` classes): a sticky
 * vertical rail on wide viewports, a sticky horizontal chip row on narrow ones.
 */

export type NavBadgeTone = "gold" | "dim" | "warn";

export interface NavBadge {
  count: number;
  tone: NavBadgeTone;
  title: string;
}

interface Section {
  id: string;
  label: string;
  group: string;
}

function sameIds(a: readonly Section[], b: readonly Section[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i]!.id);
}

/** Whether the visitor has asked for reduced motion (checked at click time). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function SectionNav({
  containerSelector,
  revision,
  ariaLabel,
  className,
  badges,
  onActiveChange,
}: {
  /** Selector for the anchors to list, e.g. `".tracker-col [data-nav-label]"`. */
  containerSelector: string;
  /** Any value that changes when a panel may have appeared or vanished. */
  revision: unknown;
  ariaLabel: string;
  className?: string;
  badges?: Partial<Record<string, NavBadge>>;
  /** Notified as the reader scrolls, so the app can remember the place. */
  onActiveChange?: (sectionId: string) => void;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<string>("");

  // Rescan on every revision change: a panel can appear or vanish live (summon
  // a familiar, drop the last prepared spell), and the panels commit before
  // this effect runs, so the DOM already reflects the new set.
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(containerSelector);
    const present: Section[] = [];
    for (const el of nodes) {
      if (!el.querySelector(".panel")) continue;
      present.push({
        id: el.id,
        label: el.dataset.navLabel ?? el.id,
        group: el.dataset.navGroup ?? "",
      });
    }
    setSections((prev) => (sameIds(prev, present) ? prev : present));
  }, [containerSelector, revision]);

  const ids = sections.map((s) => s.id).join("|");

  useEffect(() => {
    const idList = ids ? ids.split("|") : [];
    if (idList.length === 0) {
      setActive("");
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (visible.size === 0) return;
        // Topmost of the currently-visible sections, by document order.
        const next = idList.find((id) => visible.has(id));
        if (next) setActive(next);
      },
      // A thin active band near the top of the viewport (matches BuildNav).
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    for (const id of idList) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  useEffect(() => {
    if (active) onActiveChange?.(active);
  }, [active, onActiveChange]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, Section[]>();
    for (const section of sections) {
      let bucket = byGroup.get(section.group);
      if (!bucket) {
        bucket = [];
        byGroup.set(section.group, bucket);
        order.push(section.group);
      }
      bucket.push(section);
    }
    return order.map((group) => ({ group, items: byGroup.get(group)! }));
  }, [sections]);

  const onJump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    <nav className={`build-nav${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {groups.map(({ group, items }) => (
        <div className="play-nav-group-block" key={group}>
          {group ? <div className="play-nav-group">{group}</div> : null}
          {items.map((section) => {
            const badge = badges?.[section.id];
            return (
              <button
                key={section.id}
                type="button"
                className={`build-nav-item${active === section.id ? " active" : ""}`}
                onClick={() => onJump(section.id)}
                aria-current={active === section.id ? "true" : undefined}
                title={badge ? badge.title : section.label}
              >
                <span className="build-nav-label">{section.label}</span>
                {badge ? (
                  <span className={`build-nav-badge build-nav-badge--${badge.tone}`}>
                    {badge.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

import { useEffect, useMemo, useState } from "react";

import { activeAbilityAfflictions, totalNegativeLevels } from "../../model/afflictions.js";
import { heroPoints } from "../../model/heroPoints.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Section-jump navigation for Play mode — the tracker counterpart to BuildNav
 * (UX: the Play tab was one long undifferentiated scroll of ~20 panels). Same
 * CSS shape as BuildNav (it reuses the `build-nav*` classes): a sticky vertical
 * rail on wide viewports, a sticky horizontal chip row under the stat strip on
 * narrow ones.
 *
 * Presence is discovered from the DOM rather than re-deriving each panel's
 * self-hide predicate: every tracker panel already returns `null` when it
 * doesn't apply (no familiar, non-caster, …), so the panels stay the single
 * source of truth. Tracker wraps each in a `.play-section[data-nav-label]`
 * anchor; this nav lists only the anchors that actually rendered a `.panel`.
 */

interface PlaySection {
  id: string;
  label: string;
  group: string;
}

type BadgeTone = "gold" | "dim" | "warn";

interface Badge {
  count: number;
  tone: BadgeTone;
  title: string;
}

/**
 * At-a-glance status cues on the nav, computed straight from live doc state
 * (never a server round-trip, and cheap enough to recompute every change).
 * Gold = attention (something is active you should remember); warn = danger
 * (low HP, afflictions eroding you).
 */
function usePlayBadges({ doc, sheet }: Pick<BuilderProps, "doc" | "sheet">): Record<string, Badge> {
  return useMemo(() => {
    const badges: Record<string, Badge> = {};

    // Low HP mirrors StatStrip/Sheet: effective HP (current − nonlethal) at or
    // below a quarter of max, guarded so a not-yet-built sheet stays quiet.
    const hpMax = sheet.hp.max;
    const hpEffective = doc.live.hp.current - doc.live.hp.nonlethal;
    if (hpMax > 0 && hpEffective <= Math.floor(hpMax / 4)) {
      badges["play-hp"] = { count: hpEffective, tone: "warn", title: "Low HP" };
    }

    const conditions = doc.live.conditions.length;
    if (conditions > 0) {
      badges["play-conditions"] = {
        count: conditions,
        tone: "gold",
        title: `${conditions} active condition${conditions === 1 ? "" : "s"}`,
      };
    }

    const buffs = doc.live.activeBuffs.length;
    if (buffs > 0) {
      badges["play-buffs"] = {
        count: buffs,
        tone: "gold",
        title: `${buffs} active buff${buffs === 1 ? "" : "s"}`,
      };
    }

    const afflictions = activeAbilityAfflictions(doc).length + totalNegativeLevels(doc);
    if (afflictions > 0) {
      badges["play-afflictions"] = {
        count: afflictions,
        tone: "warn",
        title: "Active afflictions / negative levels",
      };
    }

    const hero = heroPoints(doc);
    if (hero > 0) {
      badges["play-hero"] = {
        count: hero,
        tone: "gold",
        title: `${hero} hero point${hero === 1 ? "" : "s"}`,
      };
    }

    return badges;
  }, [doc, sheet]);
}

/** Whether the visitor has asked for reduced motion (checked at click time). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function sameIds(a: readonly PlaySection[], b: readonly PlaySection[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i]!.id);
}

export function PlayNav({ doc, sheet, refData }: BuilderProps) {
  const badges = usePlayBadges({ doc, sheet });
  const [sections, setSections] = useState<PlaySection[]>([]);
  const [active, setActive] = useState<string>("");

  // Rescan on every doc/sheet change: a panel can appear or vanish live
  // (summon a familiar, drop the last prepared spell), and the panels commit
  // before this effect runs, so the DOM already reflects the new set.
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".tracker-col [data-nav-label]");
    const present: PlaySection[] = [];
    for (const el of nodes) {
      if (!el.querySelector(".panel")) continue;
      present.push({
        id: el.id,
        label: el.dataset.navLabel ?? el.id,
        group: el.dataset.navGroup ?? "",
      });
    }
    setSections((prev) => (sameIds(prev, present) ? prev : present));
  }, [doc, sheet, refData]);

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

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, PlaySection[]>();
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
    <nav className="build-nav play-nav" aria-label="Jump to play section">
      {groups.map(({ group, items }) => (
        <div className="play-nav-group-block" key={group}>
          {group ? <div className="play-nav-group">{group}</div> : null}
          {items.map((section) => {
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

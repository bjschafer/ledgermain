import { useMemo } from "react";

import { activeAbilityAfflictions, totalNegativeLevels } from "../../model/afflictions.js";
import { heroPoints } from "../../model/heroPoints.js";
import type { BuilderProps } from "../builder/types.js";
import { SectionNav, type NavBadge } from "../SectionNav.js";

/**
 * Section-jump navigation for Play mode — the tracker counterpart to BuildNav
 * (UX: the Play tab was one long undifferentiated scroll of ~20 panels). All
 * the listing/scroll-spy machinery is `SectionNav`; what's here is the badges.
 */

/**
 * At-a-glance status cues on the nav, computed straight from live doc state
 * (never a server round-trip, and cheap enough to recompute every change).
 * Gold = attention (something is active you should remember); warn = danger
 * (low HP, afflictions eroding you).
 */
function usePlayBadges({
  doc,
  sheet,
}: Pick<BuilderProps, "doc" | "sheet">): Record<string, NavBadge> {
  return useMemo(() => {
    const badges: Record<string, NavBadge> = {};

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

export function PlayNav({
  doc,
  sheet,
  onActiveChange,
}: BuilderProps & { onActiveChange?: (sectionId: string) => void }) {
  const badges = usePlayBadges({ doc, sheet });

  return (
    <SectionNav
      containerSelector=".tracker-col [data-nav-label]"
      revision={doc}
      ariaLabel="Jump to play section"
      className="play-nav"
      badges={badges}
      onActiveChange={onActiveChange}
    />
  );
}

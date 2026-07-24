import { useEffect, useMemo, useRef, useState } from "react";

import {
  chosenArcanistExploitCount,
  expectedArcanistExploitCount,
} from "../../model/arcanistExploits.js";
import { totalLevel } from "../../model/doc.js";
import { chosenFeatCountExcludingGranted, expectedFeatCount } from "../../model/feats.js";
import { chosenMagusArcanaCount, expectedMagusArcanaCount } from "../../model/magusArcana.js";
import {
  chosenOracleRevelationCount,
  expectedOracleRevelationCount,
} from "../../model/oracleRevelations.js";
import { permanentIntMod, skillBudget } from "../../model/skills.js";
import { spellsPanelVisible } from "../../model/spellcasting.js";
import { chosenTraitCount, expectedTraitCount } from "../../model/traits.js";
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
 */

interface NavSection {
  id: string;
  label: string;
  step: string;
}

const SECTIONS: readonly NavSection[] = [
  { id: "section-identity", label: "Identity", step: "i" },
  { id: "section-abilities", label: "Abilities", step: "ii" },
  { id: "section-race", label: "Race", step: "iii" },
  { id: "section-traits", label: "Traits", step: "iii½" },
  { id: "section-classes", label: "Classes", step: "iv" },
  { id: "section-hp", label: "Hit Points", step: "v" },
  { id: "section-skills", label: "Skills", step: "vi" },
  { id: "section-feats", label: "Feats", step: "vii" },
  { id: "section-gear", label: "Gear", step: "viii" },
  { id: "section-weapons", label: "Weapons", step: "ix" },
  { id: "section-spells", label: "Spells", step: "x" },
];

type BadgeTone = "gold" | "dim" | "warn";

interface Badge {
  count: number;
  tone: BadgeTone;
  title: string;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Reads the "unfinished business" signals already computed by the model
 * layer for each section's own header (never reimplements the math — see
 * task instructions). Only sections with something outstanding get an entry.
 */
export function useAttentionBadges({
  doc,
  refData,
}: Pick<BuilderProps, "doc" | "refData">): Partial<Record<string, Badge>> {
  return useMemo(() => {
    const badges: Partial<Record<string, Badge>> = {};

    // Abilities: unassigned ability-score increases (AbilitiesSection's
    // "N / M assigned" subsection header).
    const allowedIncreases = Math.floor(totalLevel(doc) / 4);
    const assignedIncreases = doc.build.abilityIncreases?.length ?? 0;
    const openIncreases = Math.max(0, allowedIncreases - assignedIncreases);
    if (openIncreases > 0) {
      badges["section-abilities"] = {
        count: openIncreases,
        tone: "gold",
        title: `${plural(openIncreases, "ability score increase")} unassigned`,
      };
    }

    // Skills: ranks left to spend (or, rarely, overspent).
    const { remaining } = skillBudget(doc, refData, permanentIntMod(doc, refData));
    if (remaining > 0) {
      badges["section-skills"] = {
        count: remaining,
        tone: "gold",
        title: `${plural(remaining, "skill rank")} left to spend`,
      };
    } else if (remaining < 0) {
      badges["section-skills"] = {
        count: -remaining,
        tone: "warn",
        title: `${plural(-remaining, "skill rank")} overspent`,
      };
    }

    // Feats: open slots (or over budget).
    const openFeats =
      expectedFeatCount(doc, refData) - chosenFeatCountExcludingGranted(doc, refData);
    if (openFeats > 0) {
      badges["section-feats"] = {
        count: openFeats,
        tone: "gold",
        title: `${plural(openFeats, "open feat slot")}`,
      };
    } else if (openFeats < 0) {
      badges["section-feats"] = {
        count: -openFeats,
        tone: "warn",
        title: `${plural(-openFeats, "feat")} over budget`,
      };
    }

    // Classes: unpicked arcanist exploits / magus arcana / oracle
    // revelations — whichever cheap picker budget applies to this
    // character's classes (each is 0 for a character without that class, so
    // summing is safe; only one of the three is ever nonzero in practice).
    const openExploits = Math.max(
      0,
      expectedArcanistExploitCount(doc, refData) - chosenArcanistExploitCount(doc),
    );
    const openArcana = Math.max(
      0,
      expectedMagusArcanaCount(doc, refData) - chosenMagusArcanaCount(doc),
    );
    const openRevelations = Math.max(
      0,
      expectedOracleRevelationCount(doc, refData) - chosenOracleRevelationCount(doc),
    );
    if (openExploits > 0) {
      badges["section-classes"] = {
        count: openExploits,
        tone: "gold",
        title: `${plural(openExploits, "arcanist exploit")} unpicked`,
      };
    } else if (openArcana > 0) {
      badges["section-classes"] = {
        count: openArcana,
        tone: "gold",
        title: `${plural(openArcana, "magus arcana")} unpicked`,
      };
    } else if (openRevelations > 0) {
      badges["section-classes"] = {
        count: openRevelations,
        tone: "gold",
        title: `${plural(openRevelations, "revelation")} unpicked`,
      };
    }

    // Traits: fewer than the budget (two, or three when a drawback is taken —
    // see `expectedTraitCount`). Informational, not urgent — traits are
    // optional — so this gets the dim/neutral tone rather than gold, and never
    // fires over-count (more than the budget is fine).
    const traitShortfall = expectedTraitCount(doc, refData) - chosenTraitCount(doc);
    if (traitShortfall > 0) {
      badges["section-traits"] = {
        count: traitShortfall,
        tone: "dim",
        title: `${plural(traitShortfall, "trait")} short of the expected count`,
      };
    }

    return badges;
  }, [doc, refData]);
}

/** Whether the visitor has asked for reduced motion (checked at click time). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function BuildNav({ doc, refData }: BuilderProps) {
  const badges = useAttentionBadges({ doc, refData });
  const [active, setActive] = useState<string>(SECTIONS[0]!.id);

  // The Spells panel hides itself for a non-caster, so its jump target would
  // lead nowhere — drop the nav entry with it.
  const sections = useMemo(
    () => SECTIONS.filter((s) => s.id !== "section-spells" || spellsPanelVisible(doc, refData)),
    [doc, refData],
  );
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

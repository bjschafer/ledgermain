/**
 * The Build tab's sections, in the order they are laid out, and the
 * "unfinished business" badge each one carries.
 *
 * Pure and DOM-free so three callers can share one answer: the Build nav rail
 * that draws the badges, the mode tab that sums them into a single cue, and
 * the level-up toast, which needs to know where to send a player who has just
 * earned a feat and a pile of skill ranks. None of the math is reimplemented
 * here — every count comes from the model function that already computes it
 * for the section's own header.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import { chosenArcanistExploitCount, expectedArcanistExploitCount } from "./arcanistExploits.js";
import { abilityIncreaseBudget } from "./doc.js";
import { chosenFeatCountExcludingGranted, expectedFeatCount } from "./feats.js";
import { chosenMagusArcanaCount, expectedMagusArcanaCount } from "./magusArcana.js";
import { chosenOracleRevelationCount, expectedOracleRevelationCount } from "./oracleRevelations.js";
import { permanentIntMod, skillBudget } from "./skills.js";
import { spellsPanelVisible } from "./spellcasting.js";
import { chosenTraitCount, expectedTraitCount } from "./traits.js";

export interface BuildSection {
  /** DOM id of the anchor `App.tsx`'s Workbench wraps the panel in. */
  id: string;
  label: string;
  /** The step numeral the nav rail prints beside the label. */
  step: string;
}

export const BUILD_SECTIONS: readonly BuildSection[] = [
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

export type BadgeTone = "gold" | "dim" | "warn";

export interface Badge {
  count: number;
  tone: BadgeTone;
  title: string;
}

export type AttentionBadges = Partial<Record<string, Badge>>;

/** The sections to draw for this character: the Spells panel hides itself for a non-caster. */
export function visibleBuildSections(doc: CharacterDoc, refData: RefData): BuildSection[] {
  return BUILD_SECTIONS.filter(
    (s) => s.id !== "section-spells" || spellsPanelVisible(doc, refData),
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Reads the "unfinished business" signals already computed by the model layer
 * for each section's own header. Only sections with something outstanding get
 * an entry.
 */
export function attentionBadges(doc: CharacterDoc, refData: RefData): AttentionBadges {
  const badges: AttentionBadges = {};

  // Abilities: unassigned ability-score increases (AbilitiesSection's
  // "N / M assigned" subsection header).
  const allowedIncreases = abilityIncreaseBudget(doc);
  const assignedIncreases = doc.build.abilityIncreases?.length ?? 0;
  const openIncreases = Math.max(0, allowedIncreases - assignedIncreases);
  if (openIncreases > 0) {
    badges["section-abilities"] = {
      count: openIncreases,
      tone: "gold",
      title: `${plural(openIncreases, "ability score increase")} unassigned`,
    };
  }

  // Skills: ranks left to spend (or, rarely, overspent) across both pools —
  // an unspent background rank is just as much an open build decision.
  const budget = skillBudget(doc, refData, permanentIntMod(doc, refData));
  const remaining = budget.remaining + (budget.background?.remaining ?? 0);
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
  const openFeats = expectedFeatCount(doc, refData) - chosenFeatCountExcludingGranted(doc, refData);
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

  // Classes: unpicked arcanist exploits / magus arcana / oracle revelations —
  // whichever cheap picker budget applies to this character's classes (each is
  // 0 for a character without that class, so summing is safe; only one of the
  // three is ever nonzero in practice).
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
}

/**
 * How many open build choices to cue on the Build mode tab. Dim/informational
 * badges (traits) don't count; the tab cue only fires for things the player
 * almost certainly wants to spend.
 */
export function attentionTotal(badges: AttentionBadges): number {
  return Object.values(badges)
    .filter((b) => b != null && b.tone !== "dim")
    .reduce((sum, b) => sum + b!.count, 0);
}

/**
 * The topmost section with something worth spending, in layout order, or
 * `undefined` when nothing is outstanding. Dim badges are skipped for the same
 * reason `attentionTotal` skips them: a trait short of the expected count is
 * not somewhere to send a player who just levelled.
 */
export function firstAttentionSection(badges: AttentionBadges): string | undefined {
  return BUILD_SECTIONS.find((s) => {
    const badge = badges[s.id];
    return badge != null && badge.tone !== "dim";
  })?.id;
}

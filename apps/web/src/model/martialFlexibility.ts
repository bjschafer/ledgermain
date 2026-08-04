/**
 * Brawler's Martial Flexibility: pure helpers for the tracker's browsable
 * feat picker. RAW ("Martial Flexibility"): a brawler can borrow the benefit
 * of any combat feat she doesn't possess, but "must meet all the feat's
 * prerequisites" — so the picker filters to feats tagged Combat and defers
 * prerequisite checking to `model/prereqs.ts`'s `evaluatePrereqs`/
 * `buildPrereqContext`, the SAME logic the builder's feat picker uses, rather
 * than a second implementation. The actual borrow/clear is
 * `model/doc.ts`'s `setMartialFlexibilityFeat`.
 */
import type { Feat, RefData } from "@pf1/schema";

/** Every catalog feat tagged "Combat" (the only feats this ability can borrow), sorted by name. */
export function combatFeatsForMartialFlexibility(refData: RefData): Feat[] {
  return Object.values(refData.feats)
    .filter((f) => f.tags.includes("Combat"))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Cheap HTML->text preview for a picker row, truncated to a one-line
 * benefit summary. Same idiom as the engine's per-catalog `plainTextPreview`
 * helpers (e.g. `packages/engine/src/ninja-tricks.ts`).
 */
export function featBenefitSummary(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

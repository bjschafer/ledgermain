import type { DerivedSkill } from "@pf1/schema";

import { skillName } from "./names.js";

export interface SheetSkillView {
  /** Rows to render, in display order. */
  shown: DerivedSkill[];
  /** 0-rank skills held back by the fold; 0 when nothing is folded. */
  foldedCount: number;
}

/**
 * Case-insensitive, and every whitespace-separated word must appear somewhere
 * in the name, so "know pla" finds "Knowledge (Planes)".
 */
export function skillMatchesQuery(skill: DerivedSkill, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const name = skillName(skill.id).toLowerCase();
  return words.every((w) => name.includes(w));
}

/**
 * Which of the sheet's usable skills to list. A non-empty query searches
 * everything, folded or not: the filter exists to find the one skill the GM
 * just called for, which is often one you never put ranks in.
 */
export function sheetSkillView(
  skills: readonly DerivedSkill[],
  opts: { query: string; foldUntrained: boolean; showUntrained: boolean },
): SheetSkillView {
  const sorted = skills
    .filter((s) => s.usable)
    .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));
  if (opts.query.trim()) {
    return { shown: sorted.filter((s) => skillMatchesQuery(s, opts.query)), foldedCount: 0 };
  }
  if (!opts.foldUntrained || opts.showUntrained) return { shown: sorted, foldedCount: 0 };
  const shown = sorted.filter((s) => s.ranks > 0);
  return { shown, foldedCount: sorted.length - shown.length };
}

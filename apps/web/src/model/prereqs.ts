/**
 * Feat prerequisite gating — pure and framework-agnostic so it can be unit-tested
 * without a DOM.
 *
 * Policy (DESIGN.md §4 hybrid validation):
 *  - HARD-BLOCK only on STRUCTURED prerequisites we reliably parsed (ability
 *    minimums, BAB, caster level, required feats).
 *  - NEVER hard-block on free-text prose. When a feat's prereqs are only prose
 *    (`prereqText` with no structured signals), surface a SOFT WARNING instead.
 */
import type { AbilityId, Feat, RefData } from "@pf1/schema";

import { ABILITY_ABBR } from "./names.js";

export interface PrereqCheck {
  label: string;
  met: boolean;
}

export interface PrereqResult {
  /** True if any structured prerequisite is unmet — the feat cannot be taken. */
  blocked: boolean;
  /** True if there are only unverifiable prose prereqs (advisory, not blocking). */
  warn: boolean;
  /** Structured checks with live met/unmet status. */
  checks: PrereqCheck[];
  /** Verbatim source prerequisite text (HTML stripped), for display. */
  softText?: string;
}

/** Inputs the prereq checks read — derived from the current build + sheet. */
export interface PrereqContext {
  /** Final ability scores (after racial/item modifiers) from the derived sheet. */
  abilityTotals: Record<AbilityId, number>;
  bab: number;
  casterLevel: number;
  /** Feat ids already selected on the document. */
  selectedFeats: ReadonlySet<string>;
  refData: RefData;
}

export function evaluatePrereqs(feat: Feat, ctx: PrereqContext): PrereqResult {
  const checks: PrereqCheck[] = [];
  const p = feat.prerequisites;

  for (const a of p.abilities) {
    checks.push({
      label: `${ABILITY_ABBR[a.ability]} ${a.min}`,
      met: (ctx.abilityTotals[a.ability] ?? 0) >= a.min,
    });
  }

  if (p.bab != null) {
    checks.push({ label: `BAB +${p.bab}`, met: ctx.bab >= p.bab });
  }

  if (p.casterLevel != null) {
    checks.push({
      label: `Caster level ${p.casterLevel}`,
      met: ctx.casterLevel >= p.casterLevel,
    });
  }

  for (const ref of p.feats) {
    const name = ctx.refData.feats[ref.id]?.name ?? ref.name;
    checks.push({ label: name, met: ctx.selectedFeats.has(ref.id) });
  }

  const blocked = checks.some((c) => !c.met);
  const softText = p.prereqText?.trim() || undefined;
  // Soft warning: prose prereqs exist that our structured parse didn't cover.
  const warn = !blocked && checks.length === 0 && softText != null;

  return { blocked, warn, checks, softText };
}

/**
 * Feat prerequisite gating — pure and framework-agnostic so it can be unit-tested
 * without a DOM.
 *
 * Policy (DESIGN.md §4 hybrid validation):
 *  - HARD-BLOCK only on STRUCTURED prerequisites we reliably parsed (ability
 *    minimums, BAB, caster level, character level, required feats, and
 *    "any one of these feats" groups).
 *  - NEVER hard-block on free-text prose. When a feat's prereqs are only prose
 *    (`prereqText` with no structured signals), surface a SOFT WARNING instead.
 *
 * a feat like Dodge (structured `Dex 13` ability minimum, ALSO present
 * verbatim in `prereqText`: "Dex 13.") showed a satisfied ✓ check AND a
 * redundant "⚠ Dex 13" warning — confusing, since the two signals agree but
 * look contradictory at a glance. `filterProseFragments` strips prose
 * fragments (prose is comma/semicolon-separated, e.g. "Dex 13, Dodge, base
 * attack bonus +4") that a MET structured check already covers, leaving only
 * fragments the structured layer never verified (or that ARE unmet — unmet
 * fragments are left alone since their ✗ check and the prose already agree
 * there's no ambiguity to resolve). Conservative by construction: a fragment
 * is only ever dropped when it can be matched to a specific, satisfied
 * structured signal (ability/BAB/caster level/feat) via a narrow per-kind
 * regex/name match; anything that doesn't match — a skill rank, "proficient
 * with weapon", a class feature, race, alignment, etc. — always stays, so the
 * soft warning never silently hides prose the structured layer didn't actually
 * check.
 */
import type { AbilityId, Feat, RefData } from "@pf1/schema";
import { featNameSlug } from "@pf1/engine";

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
  /**
   * True when a structured prerequisite was unmet but waived (`blocked` forced
   * to false) because this feat is in the character's chosen ranger combat-style
   * tree — CRB: a ranger need not meet a combat-style bonus feat's prereqs. The
   * UI surfaces this as an informational note rather than a lock.
   */
  bypassed: boolean;
}

/** Inputs the prereq checks read — derived from the current build + sheet. */
export interface PrereqContext {
  /** Final ability scores (after racial/item modifiers) from the derived sheet. */
  abilityTotals: Record<AbilityId, number>;
  bab: number;
  casterLevel: number;
  /** Total character level (sum of class levels), for `prerequisites.characterLevel`. */
  characterLevel: number;
  /** Feat ids already selected on the document. */
  selectedFeats: ReadonlySet<string>;
  refData: RefData;
  /**
   * `featNameSlug`s whose structured prereqs should be waived (ranger combat
   * style — see `model/ranger.combatStyleFeatSlugs`). Optional; omitted → no
   * bypass. Never waives the soft/prose warning, only the hard block.
   */
  bypassBlockedSlugs?: ReadonlySet<string>;
}

/** A structured prerequisite signal, paired with a prose-fragment matcher. */
interface StructuredSignal {
  met: boolean;
  /** True if `fragment` (already trimmed) describes this exact signal. */
  test: (fragment: string) => boolean;
}

const ABILITY_FRAGMENT_RE = /^(str|dex|con|int|wis|cha)\s+(\d+)$/i;
const BAB_FRAGMENT_RE = /^(?:base attack bonus|bab)\s*\+?\s*(\d+)$/i;
const CASTER_LEVEL_FRAGMENT_RE = /^caster level\s*\+?\s*(\d+)(?:st|nd|rd|th)?$/i;
const CHARACTER_LEVEL_FRAGMENT_RE = /^character level\s*\+?\s*(\d+)(?:st|nd|rd|th)?$/i;

/** Splits verbatim prereq prose into comma/semicolon-separated fragments. */
function splitProseFragments(text: string): string[] {
  return text
    .split(/[;,]/)
    .map((s) => s.trim().replace(/\.+$/, "").trim())
    .filter((s) => s.length > 0);
}

/**
 * Drops fragments of `text` that match a MET structured signal (see
 * `StructuredSignal`), returning `undefined` if nothing remains. A fragment
 * tied to an UNMET signal is always kept — its ✗ check and the prose already
 * agree, so there's no confusing contradiction to resolve (is specifically
 * about a ✓ check next to a warning that looks like a ✗). Fragments this
 * function can't tie to any structured signal are always kept too, met or not
 * — never invented, never hidden.
 */
function filterProseFragments(
  text: string | undefined,
  signals: readonly StructuredSignal[],
): string | undefined {
  if (!text) return undefined;
  const fragments = splitProseFragments(text);
  if (fragments.length === 0) return undefined;
  const remaining = fragments.filter((frag) => !signals.some((s) => s.met && s.test(frag)));
  if (remaining.length === fragments.length) return text.trim();
  if (remaining.length === 0) return undefined;
  return `${remaining.join(", ")}.`;
}

export function evaluatePrereqs(feat: Feat, ctx: PrereqContext): PrereqResult {
  const checks: PrereqCheck[] = [];
  const signals: StructuredSignal[] = [];
  const p = feat.prerequisites;

  for (const a of p.abilities) {
    const met = (ctx.abilityTotals[a.ability] ?? 0) >= a.min;
    checks.push({ label: `${ABILITY_ABBR[a.ability]} ${a.min}`, met });
    signals.push({
      met,
      test: (frag) => {
        const m = ABILITY_FRAGMENT_RE.exec(frag);
        return !!m && m[1]?.toLowerCase() === a.ability && Number(m[2]) === a.min;
      },
    });
  }

  if (p.bab != null) {
    const bab = p.bab;
    const met = ctx.bab >= bab;
    checks.push({ label: `BAB +${bab}`, met });
    signals.push({
      met,
      test: (frag) => {
        const m = BAB_FRAGMENT_RE.exec(frag);
        return !!m && Number(m[1]) === bab;
      },
    });
  }

  if (p.casterLevel != null) {
    const casterLevel = p.casterLevel;
    const met = ctx.casterLevel >= casterLevel;
    checks.push({ label: `Caster level ${casterLevel}`, met });
    signals.push({
      met,
      test: (frag) => {
        const m = CASTER_LEVEL_FRAGMENT_RE.exec(frag);
        return !!m && Number(m[1]) === casterLevel;
      },
    });
  }

  if (p.characterLevel != null) {
    const characterLevel = p.characterLevel;
    const met = ctx.characterLevel >= characterLevel;
    checks.push({ label: `Character level ${characterLevel}`, met });
    signals.push({
      met,
      test: (frag) => {
        const m = CHARACTER_LEVEL_FRAGMENT_RE.exec(frag);
        return !!m && Number(m[1]) === characterLevel;
      },
    });
  }

  for (const ref of p.feats) {
    const name = ctx.refData.feats[ref.id]?.name ?? ref.name;
    const met = ctx.selectedFeats.has(ref.id);
    checks.push({ label: name, met });
    signals.push({
      met,
      test: (frag) => frag.toLowerCase() === name.trim().toLowerCase(),
    });
  }

  // "Any one of these" feat groups (e.g. Catch Off-Guard OR Throw Anything) —
  // a single check for the whole group, met if any member is selected. The
  // prose fragment can read either as one "A or B" segment or, for an
  // Oxford-comma group, as separate "A", "B", "or C" segments — `test` matches
  // both shapes.
  for (const group of p.featsAnyOf ?? []) {
    const names = group.map((ref) => ctx.refData.feats[ref.id]?.name ?? ref.name);
    const label = names.join(" or ");
    const met = group.some((ref) => ctx.selectedFeats.has(ref.id));
    checks.push({ label, met });
    signals.push({
      met,
      test: (frag) => {
        const stripped = frag
          .replace(/^or\s+/i, "")
          .trim()
          .toLowerCase();
        return (
          frag.trim().toLowerCase() === label.toLowerCase() ||
          names.some((n) => stripped === n.trim().toLowerCase())
        );
      },
    });
  }

  const structurallyBlocked = checks.some((c) => !c.met);
  // Ranger combat style waives a bonus feat's hard prereqs (CRB) — but only the
  // hard block; the prose warning still shows.
  const bypassed =
    structurallyBlocked && (ctx.bypassBlockedSlugs?.has(featNameSlug(feat.name)) ?? false);
  const blocked = structurallyBlocked && !bypassed;
  const softText = filterProseFragments(p.prereqText?.trim() || undefined, signals);
  // Soft warning: prose prereqs exist that our structured parse didn't cover
  // or that aren't yet met, whether or not there are also structured checks
  // (which still drive `blocked`).
  const warn = !blocked && softText != null;

  return { blocked, warn, checks, softText, bypassed };
}

/**
 * Feats the character already has selected whose structured prerequisites are
 * no longer met — typically because a prerequisite feat they used to qualify
 * on was since removed ("add the requirements, add the feat, then remove the
 * requirements while retaining the feat and all of its effects").
 *
 * Per the hybrid policy this never auto-removes anything: `evaluatePrereqs`'s
 * `blocked` only gates the "Add" button for feats not yet taken (`FeatsSection`
 * computes `blocked && !isSel`), so an already-selected feat whose prereqs lapse
 * keeps working with no separate signal today beyond the individual ✗ marks in
 * its own check list. This surfaces that same live-recomputed `blocked` value
 * as an explicit, testable list so the UI can flag those rows distinctly (and,
 * later, so a summary count can be shown even when the feat list is filtered).
 */
export function unqualifiedSelectedFeats(
  selectedFeatIds: readonly string[],
  ctx: PrereqContext,
): string[] {
  return selectedFeatIds.filter((id) => {
    const feat = ctx.refData.feats[id];
    if (!feat) return false;
    return evaluatePrereqs(feat, ctx).blocked;
  });
}

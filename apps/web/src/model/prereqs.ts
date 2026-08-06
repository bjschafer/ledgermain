/**
 * Feat prerequisite gating — pure and framework-agnostic so it can be unit-tested
 * without a DOM.
 *
 * Policy (DESIGN.md §4 hybrid validation):
 *  - HARD-BLOCK only on STRUCTURED prerequisites we reliably parsed (ability
 *    minimums, BAB, caster level, character level, race, required feats, and
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
 * structured signal (ability/BAB/caster level/race/feat) via a narrow per-kind
 * regex/name match; anything that doesn't match — a skill rank, "proficient
 * with weapon", a class feature, alignment, etc. — always stays, so the
 * soft warning never silently hides prose the structured layer didn't actually
 * check.
 */
import type { AbilityId, CharacterDoc, DerivedSheet, Feat, RefData } from "@pf1/schema";
import { featNameSlug } from "@pf1/engine";

import { CASTER_KIND, casterLevelForClass, effectiveCasterLevel } from "./casterLevel.js";
import { ABILITY_IDS, totalLevel } from "./doc.js";
import { grantedFeats } from "./feats.js";
import { ABILITY_ABBR } from "./names.js";
import { combatStyleFeatSlugs } from "./ranger.js";

type CasterKind = "arcane" | "divine" | "psychic";

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
  /**
   * Caster kinds (arcane/divine/psychic) the character actually has, for
   * `prerequisites.casterType`. A class counts if it has a `CASTER_KIND`
   * entry and its own `casterLevelForClass` is above 0 (so a paladin below
   * 4th level, with no spellcasting yet, doesn't count as divine). Doesn't
   * model spell-like abilities or bloodline/patron SLAs, which per FAQ also
   * satisfy an "ability to cast X spells" prerequisite but aren't tracked
   * anywhere on the document.
   */
  casterKinds: ReadonlySet<CasterKind>;
  /** Feat ids already selected on the document. */
  selectedFeats: ReadonlySet<string>;
  /**
   * Lowercased names the character's race answers to, for
   * `prerequisites.races`: its own name plus its creature SUBTYPES, which is
   * what makes a half-elf qualify for both elf and human feats, a drow for elf
   * feats, and a duergar for dwarf feats. `undefined` when the doc's race id
   * isn't in RefData at all (nothing chosen yet, or a stale id) — the race
   * check is then skipped entirely rather than failed, so an unresolvable race
   * never locks a feat.
   */
  raceIdentity?: ReadonlySet<string>;
  refData: RefData;
  /**
   * `featNameSlug`s whose structured prereqs should be waived (ranger combat
   * style — see `model/ranger.combatStyleFeatSlugs`). Optional; omitted → no
   * bypass. Never waives the soft/prose warning, only the hard block.
   */
  bypassBlockedSlugs?: ReadonlySet<string>;
}

/**
 * Builds the live `PrereqContext` from a document + its derived sheet — the
 * one place that assembles it, so every surface that evaluates feat prereqs
 * against the character's current stats (the builder's `FeatEntry`/
 * `FeatManager`, and the tracker's Martial Flexibility picker) reads off the
 * same inputs instead of each re-deriving its own. Reads ability totals from
 * `sheet.abilities` (post-`compute()`) rather than `doc.abilities`, so an
 * active buff that shifts a score changes what's selectable immediately.
 */
export function buildPrereqContext(
  doc: CharacterDoc,
  sheet: DerivedSheet,
  refData: RefData,
): PrereqContext {
  const abilityTotals = {} as Record<AbilityId, number>;
  for (const id of ABILITY_IDS) abilityTotals[id] = sheet.abilities[id].total;
  const grantedIds = grantedFeats(doc, refData).map((g) => g.featId);
  const casterKinds = new Set<CasterKind>();
  for (const c of doc.identity.classes) {
    const kind = CASTER_KIND[c.tag];
    if (kind && casterLevelForClass(c.tag, c.level) > 0) casterKinds.add(kind);
  }
  const race = refData.races[doc.identity.race];
  return {
    abilityTotals,
    bab: sheet.bab,
    casterLevel: effectiveCasterLevel(doc, refData),
    characterLevel: totalLevel(doc),
    casterKinds,
    selectedFeats: new Set([...doc.build.feats, ...grantedIds]),
    raceIdentity: race
      ? new Set([
          baseRaceName(race.name).toLowerCase(),
          ...race.creatureSubtypes.map((s) => s.toLowerCase()),
        ])
      : undefined,
    refData,
    bypassBlockedSlugs: combatStyleFeatSlugs(doc),
  };
}

/** Mirrors the data-pipeline's `baseRaceName` — "Lashunta (Female)" → "Lashunta". */
function baseRaceName(name: string): string {
  return name.replace(/\s*\(.*\)$/, "").trim();
}

/** A structured prerequisite signal, paired with a prose-fragment matcher. */
interface StructuredSignal {
  met: boolean;
  /** True if `fragment` (already trimmed) describes this exact signal. */
  test: (fragment: string) => boolean;
}

/**
 * True when `fragment` is the prose form of a met race requirement — i.e. it
 * names nothing but races drawn from `races`, in any of the shapes the source
 * writes them: "dwarf", "half-orc or orc", "or halfling (see Special)". Mirrors
 * the data-pipeline's `parseRaceFragment`, which built `races` from exactly
 * these fragments.
 */
function raceFragmentMatches(fragment: string, races: readonly string[]): boolean {
  const cleaned = fragment
    .replace(/\(.*?\)/g, " ")
    .replace(/^or\b/i, "")
    .trim();
  if (!cleaned) return false;
  const parts = cleaned
    .split(/\bor\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return (
    parts.length > 0 &&
    parts.every((part) => races.some((r) => r.toLowerCase() === part.toLowerCase()))
  );
}

const ABILITY_FRAGMENT_RE = /^(str|dex|con|int|wis|cha)\s+(\d+)$/i;
const BAB_FRAGMENT_RE = /^(?:base attack bonus|bab)\s*\+?\s*(\d+)$/i;
const CASTER_LEVEL_FRAGMENT_RE = /^caster level\s*\+?\s*(\d+)(?:st|nd|rd|th)?$/i;
const CHARACTER_LEVEL_FRAGMENT_RE = /^character level\s*\+?\s*(\d+)(?:st|nd|rd|th)?$/i;
/**
 * Mirrors `CASTER_TYPE_FRAG_RE` in `packages/data-pipeline/src/transform/
 * prereqs.ts` — same phrasing, unanchored since a fragment can carry extra
 * words between "cast" and the kind (e.g. "cast 2nd-level arcane spells").
 * Duplicated rather than imported: `apps/web` deliberately doesn't pull
 * `@pf1/data-pipeline`'s Node-oriented modules into the browser bundle (see
 * `apps/web/CLAUDE.md`'s RefData note). Keep both in sync when the phrasing
 * changes.
 */
const CASTER_TYPE_FRAGMENT_RE =
  /\b(?:ability|able)\s+to\s+(?:cast|prepare|spontaneously\s+cast)\b.*\b(arcane|divine|psychic)\s+spells?\b|\b(arcane|divine|psychic)\s+spellcaster\b/i;

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

  // Race first — "you must be a dwarf" reads as the gate everything else sits
  // under. Skipped outright when the doc's race can't be resolved, so an
  // unknown race shows neither a ✓ nor a ✗ it can't back up.
  if (p.races?.length && ctx.raceIdentity) {
    const raceIdentity = ctx.raceIdentity;
    const races = p.races;
    const met = races.some((r) => raceIdentity.has(r.toLowerCase()));
    checks.push({ label: races.join(" or "), met });
    signals.push({ met, test: (frag) => raceFragmentMatches(frag, races) });
  }

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

  if (p.casterType != null) {
    const casterType = p.casterType;
    const met = ctx.casterKinds.has(casterType);
    checks.push({ label: `Ability to cast ${casterType} spells`, met });
    signals.push({
      met,
      test: (frag) => {
        const m = CASTER_TYPE_FRAGMENT_RE.exec(frag);
        const kind = m?.[1] ?? m?.[2];
        return kind?.toLowerCase() === casterType;
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

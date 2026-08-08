/**
 * Pure Phrenic Amplification transitions (`psychic-disciplines.ts` shipped
 * bonus spells/phrenic pool ability and explicitly deferred amplifications as
 * "prose-heavy, genuinely choice-bearing content"). Amplification ids are just
 * entries in `build.psychicAmplifications`, mirroring `toggleOracleRevelation`
 * in `model/oracleRevelations.ts` — the engine's `PHRENIC_AMPLIFICATIONS`
 * table maps each to its (display-only) `changes[]`, surfaced through the same
 * `collectGrantedFeatures` path. This is the amplification MENU only — the
 * Phrenic Pool itself (points spent per linked-spell cast) rides the vendored
 * `uses.maxFormula` resource-pool pipeline already (see `@pf1/engine`
 * `resources.ts`), unaffected by this module.
 *
 * Budget (PF1 Occult Adventures, verified against aonprd.com's live Psychic
 * class page — "Phrenic Amplification" gained at 1st level, then "at 3rd
 * level, and every 4 levels thereafter"): 1st, 3rd, 7th, 11th, 15th, 19th —
 * six total by 19th, the SAME six-threshold cadence
 * `oracleRevelations`/`REVELATION_LEVELS` uses (reused verbatim below rather
 * than re-derived). Major amplifications (11th level, minLevel-gated in
 * `PHRENIC_AMPLIFICATIONS`) are NOT an extra pick — chosen "in place of" a
 * basic amplification, same budget, same posture as `WITCH_HEXES`'/
 * `NINJA_TRICKS`' major/master tiers. Each copy of the "Extra Amplification"
 * feat (vendored `feats.json` id `MWbOlWeXOxxsBacw` — stackable per its own
 * text) adds one more, counted by OCCURRENCE in `doc.build.feats` (not just
 * presence) — same "manually-added duplicates" convention
 * `extraRevelationFeatCount` uses for "Extra Revelation".
 *
 * Taking more than the expected count is a soft warning only, matching the
 * project's hybrid posture on feat/trait/skill budgets. The picker DOES hard
 * block on the two genuinely structured signals below: an amplification's
 * level gate (`amplificationBelowLevel`) and Dual Amplification's own "know N
 * other amplifications" requirement (`phrenicAmplificationPrereqResult`) —
 * everything else in a description is cast-time prose, never a selection
 * gate.
 */

import { mergedPhrenicAmplificationCatalog, type PhrenicAmplificationTier } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

/** The psychic's class level (0 for a non-psychic, or a stale/multiclassed doc). */
export function psychicLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "psychic")?.level ?? 0;
}

export function hasPsychicAmplification(doc: CharacterDoc, id: string): boolean {
  return (doc.build.psychicAmplifications ?? []).includes(id);
}

/** Add or remove an amplification id. No-op add if already present (no duplicates). */
export function togglePsychicAmplification(doc: CharacterDoc, ampId: string): CharacterDoc {
  const current = doc.build.psychicAmplifications ?? [];
  const has = current.includes(ampId);
  const psychicAmplifications = has ? current.filter((a) => a !== ampId) : [...current, ampId];
  return { ...doc, build: { ...doc.build, psychicAmplifications } };
}

/** The number of amplifications currently chosen. */
export function chosenPsychicAmplificationCount(doc: CharacterDoc): number {
  return (doc.build.psychicAmplifications ?? []).length;
}

/** OA progression thresholds: 1st, 3rd, 7th, 11th, 15th, 19th (same shape as `REVELATION_LEVELS`). */
const AMPLIFICATION_LEVELS: readonly number[] = [1, 3, 7, 11, 15, 19];

/** One amplification at each threshold in {@link AMPLIFICATION_LEVELS} reached. Returns 0 for a non-psychic. */
function baseAmplificationCount(level: number): number {
  if (level <= 0) return 0;
  return AMPLIFICATION_LEVELS.filter((threshold) => level >= threshold).length;
}

/**
 * How many copies of the "Extra Amplification" feat are in `doc.build.feats`
 * — matched by name (feat ids are opaque RefData keys), counted by
 * occurrence since the feat is stackable, the same convention
 * `extraRevelationFeatCount` relies on for "Extra Revelation".
 */
function extraAmplificationFeatCount(doc: CharacterDoc, refData: RefData): number {
  let count = 0;
  for (const featId of doc.build.feats) {
    if (refData.feats[featId]?.name === "Extra Amplification") count++;
  }
  return count;
}

/**
 * The number of amplifications a psychic is expected to know at their
 * current level: the base OA progression plus one per "Extra Amplification"
 * feat. Returns 0 for a non-psychic.
 */
export function expectedPsychicAmplificationCount(doc: CharacterDoc, refData: RefData): number {
  const level = psychicLevel(doc);
  if (level <= 0) return 0;
  return baseAmplificationCount(level) + extraAmplificationFeatCount(doc, refData);
}

/**
 * True when the chosen amplifications should prompt a soft warning: more
 * than the expected count. Never used to block — only to color the count
 * badge (see `oracleRevelationsNeedWarning` for the identical pattern).
 */
export function psychicAmplificationsNeedWarning(doc: CharacterDoc, refData: RefData): boolean {
  return chosenPsychicAmplificationCount(doc) > expectedPsychicAmplificationCount(doc, refData);
}

/* ---------------------------------------------------------- prerequisites */

/**
 * True when `minLevel` (an amplification's tier gate: 1 for basic, 11 for
 * major) is above the character's current psychic level — the picker
 * hard-blocks a not-yet-picked amplification on this, same as
 * `kineticistTalentBelowLevel`. False for a non-psychic (no level to gate on
 * yet) so a fresh build doesn't show every major amplification as locked
 * before any psychic level exists.
 */
export function amplificationBelowLevel(doc: CharacterDoc, minLevel: number): boolean {
  const level = psychicLevel(doc);
  return level > 0 && level < minLevel;
}

/** One requirement check against an amplification's own prerequisite prose. */
export interface PhrenicAmplificationPrereqCheck {
  label: string;
  met: boolean;
}

export interface PhrenicAmplificationPrereqResult {
  checks: PhrenicAmplificationPrereqCheck[];
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

/**
 * Of all 31 published amplifications, only Dual Amplification's own text
 * states a real, checkable requirement to select another amplification:
 * "she chooses two other amplifications or major amplifications she knows
 * to apply to the same linked spell." No other entry names a required
 * amplification, by name or by count (verified against every vendored
 * description in `phrenic-amplifications.json`, 2026-08-07) — the rest of
 * each entry's prose is either a spell-type restriction ("can be linked only
 * to...") or a cast-time mechanic, neither of which gates SELECTING the
 * amplification itself, so nothing else here ever produces a check.
 */
const OTHER_AMPLIFICATIONS_KNOWN_RE =
  /chooses?\s+(one|two|three|four|five|\d+)\s+other amplifications?[^.]*\bknows\b/i;

function otherAmplificationsRequiredCount(description: string | undefined): number | undefined {
  if (!description) return undefined;
  const text = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const match = OTHER_AMPLIFICATIONS_KNOWN_RE.exec(text);
  if (!match) return undefined;
  const raw = match[1]!.toLowerCase();
  return NUMBER_WORDS[raw] ?? Number.parseInt(raw, 10);
}

/**
 * An amplification's structured prerequisite readout, or `undefined` when
 * its description states no checkable requirement (see
 * {@link otherAmplificationsRequiredCount}'s doc comment on why that's every
 * entry but Dual Amplification). `ampId` is excluded from its own "known"
 * count so Dual Amplification never counts itself.
 */
export function phrenicAmplificationPrereqResult(
  doc: CharacterDoc,
  ampId: string,
  description: string | undefined,
): PhrenicAmplificationPrereqResult | undefined {
  const required = otherAmplificationsRequiredCount(description);
  if (required === undefined) return undefined;
  const otherKnown = (doc.build.psychicAmplifications ?? []).filter((id) => id !== ampId).length;
  return {
    checks: [
      {
        label: `Know ${required} other amplification${required === 1 ? "" : "s"}`,
        met: otherKnown >= required,
      },
    ],
  };
}

/* -------------------------------------------------------- tracker actions */

/** One picked amplification worth a visible row in Resources: what it costs and its rider text. */
export interface PhrenicAmplificationAction {
  id: string;
  name: string;
  tier: PhrenicAmplificationTier;
  costLabel: string;
  /**
   * A single fixed point cost parsed straight out of `costLabel` ("1 point",
   * "2 points"). `0` for the one amplification with no phrenic pool cost at
   * all (Phrenic Strike). `undefined` for a variable, conditional, or
   * per-target/per-level cost ("1 or 2 points", "2 points per level", "points
   * = spell level", ...) — the tracker row falls back to a manual spend
   * amount for those.
   */
  cost?: number;
  summary: string;
  description?: string;
}

const FLAT_POINT_COST_RE = /^(\d+)\s+points?$/i;
const NO_COST_RE = /^no cost\b/i;

/**
 * A single fixed point cost parseable straight out of an amplification's
 * `costLabel`, or `undefined` for anything with a choice, a per-target/
 * per-level multiplier, or a formula (see {@link PhrenicAmplificationAction.cost}'s
 * doc comment for the full shape survey).
 */
export function parseFlatPointCost(costLabel: string): number | undefined {
  if (NO_COST_RE.test(costLabel)) return 0;
  const match = FLAT_POINT_COST_RE.exec(costLabel.trim());
  return match ? Number.parseInt(match[1]!, 10) : undefined;
}

/**
 * The character's picked amplifications as tracker rows, in pick order —
 * `ResourcesPanel`'s `PhrenicAmplificationActionsPanel` renders this beside
 * the Phrenic Pool resource row, the same "actions hang off the pool they
 * spend" shape `kineticUtilityActions` uses for kineticist utility talents.
 * An unresolvable/stale picked id (a dropped vendored entry) is silently
 * skipped rather than crashing the panel.
 */
export function phrenicAmplificationActions(
  doc: CharacterDoc,
  refData: RefData,
): PhrenicAmplificationAction[] {
  const picked = doc.build.psychicAmplifications ?? [];
  if (picked.length === 0) return [];
  const catalog = mergedPhrenicAmplificationCatalog(refData);
  const byId = new Map(catalog.map((a) => [a.id, a]));
  const actions: PhrenicAmplificationAction[] = [];
  for (const id of picked) {
    const a = byId.get(id);
    if (!a) continue;
    actions.push({
      id: a.id,
      name: a.name,
      tier: a.tier,
      costLabel: a.costLabel,
      cost: parseFlatPointCost(a.costLabel),
      summary: a.summary,
      description: a.description,
    });
  }
  return actions;
}

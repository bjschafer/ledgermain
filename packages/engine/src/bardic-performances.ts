/**
 * Clean-room PF1 bard Bardic Performance table, hand-authored from the
 * published Core Rulebook rules (verified against aonprd.com's live Bard
 * class page, "Bardic Performance" and each performance-type sub-entry,
 * 2026-08-15).
 *
 * Bardic Performance itself (the rounds/day pool everything below draws
 * from) is ALREADY fully vendored — `RefData.classFeatures`'s "Bardic
 * Performance" entry carries the `4 + Cha modifier at 1st, +2/level
 * thereafter` uses formula, so `deriveResourcePools` derives the pool with
 * zero hand-authoring needed there. Inspire Courage, the flagship 1st-level
 * performance type, is ALSO already vendored as a real linked buff (see
 * `resources.ts`'s `FEATURE_BUFF_POOL_TAG` / `linkedBuffIds` resolution
 * against `RefData.buffs`) — it is deliberately NOT duplicated in this table,
 * since doing so would double-apply its bonus once as a linked buff and once
 * as a table option.
 *
 * This module is the hand-authored substitute for the remaining eleven
 * Core Rulebook performance types, wired onto the Bardic Performance pool's
 * `tableOptions` field (`resources.ts`) as `ToggleBuffOption`s, same
 * activation UX as Inspire Courage's linked buff.
 *
 * Modelling posture per performance:
 *   - Countersong/Distraction (1st) are reactive Perform-check substitutions
 *     against sonic/language-dependent or illusion (pattern/figment) effects
 *     respectively — there's no self-facing static number to model (the
 *     "bonus" is literally "use your Perform roll instead of a saving
 *     throw"), so both are note-tier.
 *   - Fascinate (1st) is purely enemy-facing (a Will save DC to avoid being
 *     fascinated) — no target on the bard's own sheet, so note-tier with the
 *     DC formula and creature-count scaling spelled out in words.
 *   - Inspire Competence is gained at 3rd level, not 2nd — the task
 *     survey listed 2nd, but both aonprd.com's class table and the vendored
 *     ability description ("A bard of 3rd level or higher...") independently
 *     confirm 3rd; this table uses the verified level. It's also RAW
 *     ally-only ("A bard can't inspire competence in himself"), so there is
 *     genuinely no self-facing number to model — note-tier with the +2 base
 *     / +1 per four levels beyond 3rd schedule spelled out. A vendored
 *     "Inspire Competence" buff exists in `RefData.buffs` but hardcodes
 *     `skill.acr` (Acrobatics) as its target — a Foundry
 *     retarget-it-yourself placeholder for whichever skill the ally is
 *     using — so it is deliberately not linked or referenced here.
 *   - Suggestion (6th), Dirge of Doom (8th), Frightening Tune (14th), Mass
 *     Suggestion (18th), and Deadly Performance (20th) are all purely
 *     enemy-facing (a save DC or an unavoidable condition inflicted on
 *     enemies, never a bonus on the bard's own sheet) — note-tier with DCs
 *     and effects spelled out in words.
 *   - Soothing Performance (12th) is a one-shot mass-heal-after-4-rounds
 *     effect, not a standing bonus — note-tier with the healing formula
 *     (mass cure serious wounds, bard level as caster level) in the note.
 *   - Inspire Greatness (9th) and Inspire Heroics (15th) are the two
 *     performances RAW written as "himself or a single ally" — unlike
 *     Fascinate/Suggestion/etc., the bard is a legitimate personal target,
 *     so these carry real `Change`s applied to the bard's own sheet,
 *     mirroring raging-song.ts's precedent for "this app tracks one
 *     character, not a party" (a context note says extending either to
 *     additional allies at higher levels isn't modeled). Inspire Greatness's
 *     2 bonus Hit Dice / temporary hit points are DICE (2d10 + 2x Con
 *     modifier), and this engine has no numeric dice evaluation path
 *     (`tryEvaluateFormula` intentionally throws on dice terms), so that
 *     part is a context note directing the player to the sheet's temp HP
 *     field rather than a `Change`.
 *
 * Every entry also carries a shared reminder that maintaining a performance
 * costs 1 round from the Bardic Performance pool per round it's active, and
 * that this pool is not auto-decremented while a toggle is on (same
 * activation UX as every other `tableOptions` toggle in this engine — see
 * `judgments.ts` / `raging-song.ts`).
 */

import type { Change, ContextNote } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

const MAINTAIN_NOTE: ContextNote = {
  target: "allChecks",
  text: "Maintaining a performance costs 1 round from the Bardic Performance pool per round it stays active. This pool is not auto-decremented while a toggle here is on; track your own rounds spent.",
};

export interface BardicPerformanceDef {
  /** Slug, e.g. "countersong" — prefixed with `bardicPerformance:` to become `ToggleBuffOption.id`. */
  tag: string;
  name: string;
  /** One-line rules summary (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Bard level this performance type is gained at. */
  minLevel: number;
  changes: Change[];
  contextNotes?: ContextNote[];
}

export const BARD_PERFORMANCES: BardicPerformanceDef[] = [
  {
    tag: "countersong",
    name: "Countersong",
    summary:
      "Perform check vs sonic or language-dependent effects, usable in place of a saving throw.",
    minLevel: 1,
    // Reactive Perform-check substitution, not a static bonus — no
    // self-facing target exists to model.
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Each round, make a Perform check. Any creature within 30 feet (including you) affected by a sonic or language-dependent magical attack may use that Perform result in place of its saving throw if it's higher, rolled after the save. Doesn't work on effects that don't allow saves.",
      },
    ],
  },
  {
    tag: "distraction",
    name: "Distraction",
    summary:
      "Perform check vs illusion (pattern) or illusion (figment) effects, usable in place of a saving throw.",
    minLevel: 1,
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Each round, make a Perform check. Any creature within 30 feet (including you) affected by an illusion (pattern) or illusion (figment) magical attack may use that Perform result in place of its saving throw if it's higher, rolled after the save. Doesn't work on effects that don't allow saves.",
      },
    ],
  },
  {
    tag: "fascinate",
    name: "Fascinate",
    summary:
      "Fascinates one or more creatures within 90 feet on a failed Will save; enemy-facing, no self bonus.",
    minLevel: 1,
    // Purely enemy-facing (a save DC others roll against) — no target on
    // the bard's own sheet.
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Targets within 90 feet who can see and hear you resist with a Will save (DC 10 + 1/2 your bard level + your Cha modifier) or sit fascinated. You can target one additional creature for every three bard levels beyond 1st. Not modeled as a save DC on your sheet.",
      },
    ],
  },
  {
    tag: "inspireCompetence",
    name: "Inspire Competence",
    summary: "Grants one ally a competence bonus on a chosen skill; RAW cannot target yourself.",
    // aonprd.com's live Bard class table and the vendored ability
    // description ("A bard of 3rd level or higher...") both confirm 3rd
    // level, not 2nd.
    minLevel: 3,
    // RAW explicitly excludes the bard as a target ("A bard can't inspire
    // competence in himself"), so there is no legitimate self-facing
    // number here, unlike Inspire Greatness/Heroics below.
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Grants one ally within 30 feet who can hear you a +2 competence bonus on a chosen skill, increasing by +1 for every four bard levels beyond 3rd (+3 at 7th, +4 at 11th, +5 at 15th, +6 at 19th). RAW you cannot target yourself. Not modeled: the vendored Inspire Competence buff hardcodes Acrobatics as its target skill and isn't linked here.",
      },
    ],
  },
  {
    tag: "suggestion",
    name: "Suggestion",
    summary:
      "Makes a suggestion (as the spell) to a creature you've already fascinated; enemy-facing.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Makes a suggestion, as the spell, to a creature you've already fascinated. A Will save (DC 10 + 1/2 your bard level + your Cha modifier) negates. Not modeled as a save DC on your sheet.",
      },
    ],
  },
  {
    tag: "dirgeOfDoom",
    name: "Dirge of Doom",
    summary:
      "Enemies within 30 feet become shaken for as long as they can see and hear you; no save.",
    minLevel: 8,
    // Enemy-facing, unavoidable condition (no save) — no self-facing
    // number to model.
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Every enemy within 30 feet who can see and hear you becomes shaken for as long as the effect persists. No saving throw. Cannot upgrade a creature already shaken to frightened or panicked.",
      },
    ],
  },
  {
    tag: "inspireGreatness",
    name: "Inspire Greatness",
    summary:
      "Grants yourself or one ally +2 competence on attack rolls, +1 competence on Fortitude saves, plus bonus Hit Dice.",
    minLevel: 9,
    // RAW: "inspire greatness in himself or a single willing ally" — the
    // bard is a legitimate personal target here, unlike Fascinate/
    // Suggestion/etc. above.
    changes: [
      { formula: "2", target: "attack", type: "competence" },
      { formula: "1", target: "fort", type: "competence" },
    ],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Also grants 2 bonus Hit Dice (d10s) and the matching temporary hit points (plus your Con modifier per bonus die). Not a Change: this engine doesn't evaluate dice formulas numerically. Track it via the temp HP field.",
      },
      {
        target: "allChecks",
        text: "You can target one additional ally for every three bard levels beyond 9th (up to four total at 18th). This tracker applies the buff only to your own sheet; sharing it with additional allies isn't modeled.",
      },
    ],
  },
  {
    tag: "soothingPerformance",
    name: "Soothing Performance",
    summary:
      "After 4 rounds of continuous performance, acts as mass cure serious wounds and clears several conditions.",
    minLevel: 12,
    // A one-shot triggered effect, not a standing bonus.
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "After 4 rounds of continuous performance, affects everyone who could see and hear you throughout as mass cure serious wounds (caster level equal to your bard level) and removes fatigued, sickened, and shaken. Not modeled: apply the healing manually.",
      },
    ],
  },
  {
    tag: "frighteningTune",
    name: "Frightening Tune",
    summary: "Enemies within 30 feet make a Will save or become frightened and flee; enemy-facing.",
    minLevel: 14,
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Every enemy within 30 feet who can hear you makes a Will save (DC 10 + 1/2 your bard level + your Cha modifier) or becomes frightened and flees for as long as it can hear you. On a success, that creature is immune to this ability for 24 hours. Not modeled as a save DC on your sheet.",
      },
    ],
  },
  {
    tag: "inspireHeroics",
    name: "Inspire Heroics",
    summary: "Grants yourself or one ally +4 morale on saving throws and +4 dodge to AC.",
    minLevel: 15,
    // RAW: "inspire tremendous heroism in himself or a single ally" — same
    // legitimate personal-target posture as Inspire Greatness above.
    changes: [
      { formula: "4", target: "allSavingThrows", type: "morale" },
      { formula: "4", target: "ac", type: "dodge" },
    ],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "You can inspire one additional creature for every three bard levels beyond 15th. This tracker applies the buff only to your own sheet; sharing it with additional allies isn't modeled.",
      },
    ],
  },
  {
    tag: "massSuggestion",
    name: "Mass Suggestion",
    summary:
      "Suggestion made simultaneously to any number of creatures you've already fascinated; enemy-facing.",
    minLevel: 18,
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "Functions as Suggestion, but affects any number of creatures you've already fascinated simultaneously. A Will save (DC 10 + 1/2 your bard level + your Cha modifier) negates, per creature. Not modeled as a save DC on your sheet.",
      },
    ],
  },
  {
    tag: "deadlyPerformance",
    name: "Deadly Performance",
    summary: "Targets one creature; on a failed Will save it dies, on a success it's staggered.",
    minLevel: 20,
    changes: [],
    contextNotes: [
      MAINTAIN_NOTE,
      {
        target: "allChecks",
        text: "After 1 full round of the target seeing and hearing you within 30 feet, it makes a Will save (DC 10 + 1/2 your bard level + your Cha modifier). Failure kills it; success staggers it for 1d4 rounds and you can't retry against it for 24 hours. Not modeled as a save DC on your sheet.",
      },
    ],
  },
];

/** Resource-pool `detail` line for the Bardic Performance pool — see `resources.ts`'s `feature.tag === "bardicPerformance"` branch (or equivalent). */
export const BARDIC_PERFORMANCE_DETAIL = "rounds/day · toggle performances below";

/**
 * `BARD_PERFORMANCES`, filtered to what a bard of `bardLevel` has learned and
 * mapped to the generic `ToggleBuffOption` shape `resources.ts` surfaces on
 * the pool. Inspire Courage is intentionally absent — see file doc comment.
 */
export function bardicPerformanceToggleOptions(bardLevel: number): ToggleBuffOption[] {
  return BARD_PERFORMANCES.filter((p) => p.minLevel <= bardLevel).map((p) => ({
    id: `bardicPerformance:${p.tag}`,
    name: p.name,
    changes: p.changes,
    contextNotes: p.contextNotes,
  }));
}

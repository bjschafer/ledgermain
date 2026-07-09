/**
 * Clean-room PF1 Monk (Unchained) Ki Powers table (Pathfinder Unchained,
 * issue #65): hand-authored from the published rules (verified against
 * aonprd.com's "Ki Powers - Monk (Unchained)" listing, cross-checked against
 * d20pfsrd's Unchained Monk page to scope down to the Pathfinder Unchained
 * BOOK's own core list — the AoN listing aggregates cross-splatbook
 * additions, e.g. "Qinggong Power"/"Improvised Weapon Proficiency", that are
 * NOT part of the core book and are excluded here, same scoping discipline
 * as `witch-hexes.ts`/`oracle-revelations.ts` scoping to APG-core-only).
 * Ki powers are NOT part of the vendored Foundry data pack (the Monk
 * (Unchained) class def only links a single generic "Ki powers (UC)" stub
 * `ClassFeature`, no per-power breakdown — confirmed, mirroring the witch's
 * generic "Hex" stub), so there is no upstream JSON to normalize.
 *
 * PF1 RAW: "At 4th level, and every two levels thereafter, a monk gains a ki
 * power" — 9 total picks by 20th level (see `model/monkKiPowers.ts` for the
 * budget math). `minLevel` here is the earliest MONK level a given power may
 * be selected at (4th baseline, or higher for several — soft-filtered only,
 * same convention as `WitchHexDef.minLevel` — never blocks selection).
 *
 * Modelling posture (mirrors `witch-hexes.ts`'s honesty bar): every ki power
 * is either a limited daily/round-based ki-point expenditure (an activated
 * ability) or a passive-but-narrow utility (e.g. Ki Metabolism's food/sleep
 * reduction) with no flat, unconditional, always-on numeric effect on the
 * MONK's own sheet. A few come close —
 *   - High Jump ("add his monk level to all his jump checks") is passive,
 *     but there is no jump-specific skill target in this engine (Acrobatics
 *     covers balance/jump/tumble as one skill; a monk-level bonus to ALL
 *     Acrobatics checks would overstate a jump-only rule);
 *   - Ki Sunder ("add his monk level as a bonus to damage dealt when
 *     sundering") is passive, but there is no sunder-specific damage target;
 *   - Furious Defense/Formless Mastery grant a flat AC bonus, but only for
 *     limited duration once activated (immediate action, spends ki), same
 *     "activated, not always-on" gap as the witch's Ward hex.
 * None of these clear the bar for an unconditional Change on the monk's own
 * sheet, so — same discipline as `witch-hexes.ts` — EVERY entry here is
 * `displayOnly: true` with `changes: []`; a `contextNotes` reminder carries
 * the ki cost/duration/save shape instead.
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface MonkKiPowerDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest monk level this power can be selected at — 4 unless noted otherwise. Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the power (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (ki cost, duration, save). */
  contextNotes?: ContextNote[];
  /** Always true here — no ki power has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawPower {
  id: string;
  name: string;
  minLevel?: number;
  summary: string;
  contextNotes?: ContextNote[];
}

function toDef(e: RawPower): MonkKiPowerDef {
  return {
    id: e.id,
    name: e.name,
    minLevel: e.minLevel ?? 4,
    summary: e.summary,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  };
}

const KI_POWER_LIST: MonkKiPowerDef[] = [
  // -- 4th level (baseline) --
  toDef({
    id: "emptyBody",
    name: "Empty Body",
    summary: "Assume an ethereal state for 1 minute, as the spell etherealness (self only).",
    contextNotes: [note("3 ki points, move action to activate.")],
  }),
  toDef({
    id: "featherBalance",
    name: "Feather Balance",
    summary: "Treat any Acrobatics check to balance as if you had rolled a 20, for 1 minute.",
    contextNotes: [note("1 ki point, swift action to activate.")],
  }),
  toDef({
    id: "highJump",
    name: "High Jump",
    summary:
      "Add your monk level to Acrobatics checks made to jump; spend 1 ki point for a +20 bonus on one such check.",
    contextNotes: [
      note(
        "The passive monk-level bonus applies only to jump checks, not every Acrobatics check — no jump-only skill target exists here, so apply it by hand.",
        "skill.acr",
      ),
    ],
  }),
  toDef({
    id: "kiMetabolism",
    name: "Ki Metabolism",
    summary:
      "Reduce food/water/sleep needs to 1/4 normal; hold your breath for 1 hour per point of Constitution.",
  }),
  toDef({
    id: "kiRange",
    name: "Ki Range",
    summary: "Increase a thrown monk weapon's range increment by 20 feet.",
    contextNotes: [note("1 ki point, swift action to activate.")],
  }),
  toDef({
    id: "kiSunder",
    name: "Ki Sunder",
    summary: "Add your monk level as a bonus to damage dealt when attempting to sunder an item.",
    contextNotes: [
      note(
        "No sunder-specific damage target modeled — apply the monk-level bonus by hand when sundering.",
      ),
    ],
  }),
  toDef({
    id: "slowFall",
    name: "Slow Fall",
    summary: "Take no falling damage, as if using slow fall, when adjacent to a wall.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  toDef({
    id: "suddenSpeed",
    name: "Sudden Speed",
    summary: "Increase your base speed by 30 feet for 1 minute.",
    contextNotes: [note("1 ki point, swift action to activate.")],
  }),
  toDef({
    id: "wholenessOfBody",
    name: "Wholeness of Body",
    summary: "Heal your own damage equal to 1d8 + your monk level.",
    contextNotes: [note("2 ki points, standard action to activate.")],
  }),
  toDef({
    id: "zephyrBlow",
    name: "Zephyr Blow",
    summary: "Create a gust-of-wind effect.",
    contextNotes: [note("1 ki point, standard action to activate.")],
  }),
  // -- 6th level --
  toDef({
    id: "actionBeforeThought",
    name: "Action Before Thought",
    minLevel: 6,
    summary: "Roll initiative twice and take the higher result.",
    contextNotes: [note("2 ki points, free action to activate.")],
  }),
  toDef({
    id: "diamondMind",
    name: "Diamond Mind",
    minLevel: 6,
    summary: "Suppress the effects of a fear condition affecting you.",
    contextNotes: [note("1 ki point (2 if panicked) to activate.")],
  }),
  toDef({
    id: "elementalFury",
    name: "Elemental Fury",
    minLevel: 6,
    summary:
      "Imbue your unarmed strikes with acid, cold, electricity, or fire, dealing an extra 1d6 damage of that type.",
    contextNotes: [note("1 ki point per round to activate.")],
  }),
  toDef({
    id: "kiGuardian",
    name: "Ki Guardian",
    minLevel: 6,
    summary: "Spend ki points to roll a saving throw on behalf of a designated adjacent ally.",
    contextNotes: [note("1 ki point per save.")],
  }),
  toDef({
    id: "kiMount",
    name: "Ki Mount",
    minLevel: 6,
    summary: "Grant your mount temporary hit points equal to 2 per your monk level, for 1 hour.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  toDef({
    id: "racingCurrent",
    name: "Racing Current",
    minLevel: 6,
    summary: "Create a wave that helps an ally maneuver through water, lasting 1 minute.",
    contextNotes: [note("2 ki points to activate.")],
  }),
  toDef({
    id: "waterSprint",
    name: "Water Sprint",
    minLevel: 6,
    summary:
      "Walk on the surface of water for a number of minutes per day equal to your monk level.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  // -- 7th level --
  toDef({
    id: "formlessMastery",
    name: "Formless Mastery",
    minLevel: 7,
    summary:
      "Gain a +4 dodge bonus to AC and a +4 circumstance bonus on attack rolls against a foe using a fighting style you know.",
    contextNotes: [note("1 ki point to activate.", "ac")],
  }),
  toDef({
    id: "furiousDefense",
    name: "Furious Defense",
    minLevel: 7,
    summary: "Gain a +4 dodge bonus to AC until the start of your next turn.",
    contextNotes: [note("1 ki point, immediate action to activate.", "ac")],
  }),
  // -- 8th level --
  toDef({
    id: "abundantStep",
    name: "Abundant Step",
    minLevel: 8,
    summary: "Slip magically between spaces, as the spell dimension door.",
    contextNotes: [note("2 ki points, move action to activate.")],
  }),
  toDef({
    id: "bareHandBlock",
    name: "Bare-Hand Block",
    minLevel: 8,
    summary: "Attempt to sunder a manufactured weapon as an immediate action.",
    contextNotes: [note("1 ki point (2 for a two-handed weapon) to activate.")],
  }),
  toDef({
    id: "breakingDownKoan",
    name: "Breaking-Down Koan",
    minLevel: 8,
    summary: "Present a paradox to confuse a creature within 30 feet.",
    contextNotes: [note("1 ki point to activate; Will negates.")],
  }),
  toDef({
    id: "buildingUpKoan",
    name: "Building-Up Koan",
    minLevel: 8,
    summary:
      "Gain a Wisdom-based insight bonus to AC and attack rolls, or become confused if the koan misfires.",
    contextNotes: [note("2 ki points to activate.", "ac")],
  }),
  toDef({
    id: "diamondBody",
    name: "Diamond Body",
    minLevel: 8,
    summary: "Remove one toxin currently affecting you.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  toDef({
    id: "floatingBreath",
    name: "Floating Breath",
    minLevel: 8,
    summary: "Hover in place until the end of your next turn.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  toDef({
    id: "insightfulWisdom",
    name: "Insightful Wisdom",
    minLevel: 8,
    summary: "Let an ally within 30 feet reroll an attack roll or saving throw.",
    contextNotes: [note("2 ki points to activate.")],
  }),
  toDef({
    id: "lightSteps",
    name: "Light Steps",
    minLevel: 8,
    summary:
      "Ignore difficult terrain and walk on unsupported surfaces as if using feather balance.",
  }),
  toDef({
    id: "windJump",
    name: "Wind Jump",
    minLevel: 8,
    summary: "Gain a fly speed equal to your base land speed for 1 minute.",
    contextNotes: [note("1 ki point to activate; requires High Jump.")],
  }),
  // -- 10th level --
  toDef({
    id: "kiBlocker",
    name: "Ki Blocker",
    minLevel: 10,
    summary: "Increase the ki-point cost of a target's own ki-based abilities by 1, for 1 hour.",
    contextNotes: [note("1-2 ki points to activate; Will negates.")],
  }),
  toDef({
    id: "kiHurricane",
    name: "Ki Hurricane",
    minLevel: 10,
    summary:
      "Move up to twice your speed and make flurry of blows attacks during that movement, spending ki per attack.",
  }),
  toDef({
    id: "kiVisions",
    name: "Ki Visions",
    minLevel: 10,
    summary: "Gain divination-like benefits through dreams.",
    contextNotes: [note("2 ki points, spent the day before.")],
  }),
  // -- 12th level --
  toDef({
    id: "cobraBreath",
    name: "Cobra Breath",
    minLevel: 12,
    summary: "Release a poison you've neutralized as a ranged touch attack against a foe.",
  }),
  toDef({
    id: "diamondResilience",
    name: "Diamond Resilience",
    minLevel: 12,
    summary: "Gain DR 2/— for 1 minute.",
    contextNotes: [note("1 ki point to activate.")],
  }),
  toDef({
    id: "diamondSoul",
    name: "Diamond Soul",
    minLevel: 12,
    summary: "Gain spell resistance equal to your monk level + 10, for a number of rounds.",
    contextNotes: [note("2 ki points to activate.")],
  }),
  toDef({
    id: "masterThoughtKoan",
    name: "Master-Thought Koan",
    minLevel: 12,
    summary:
      "Enhance Breaking-Down Koan or Building-Up Koan to affect multiple targets, or share the benefit with allies.",
  }),
  toDef({
    id: "oneTouch",
    name: "One Touch",
    minLevel: 12,
    summary:
      "Make a touch-attack unarmed strike dealing bonus damage equal to half your monk level.",
  }),
  // -- 16th level --
  toDef({
    id: "kiVolley",
    name: "Ki Volley",
    minLevel: 16,
    summary: "Send a targeted spell back at its caster, as spell turning.",
    contextNotes: [note("2 ki points to activate; requires Diamond Soul.")],
  }),
  toDef({
    id: "quiveringPalm",
    name: "Quivering Palm",
    minLevel: 16,
    summary:
      "Set up vibrations in a struck creature's body that can be triggered to kill it later.",
    contextNotes: [note("4 ki points to activate; Fortitude negates.")],
  }),
  // -- 18th level --
  toDef({
    id: "elementalBurst",
    name: "Elemental Burst",
    minLevel: 18,
    summary: "Unleash a 30-foot cone dealing 20d6 damage of an energy type you've imbued.",
    contextNotes: [note("4 ki points to activate; Reflex halves.")],
  }),
];

export const MONK_KI_POWERS: Record<string, MonkKiPowerDef> = Object.fromEntries(
  KI_POWER_LIST.map((p) => [p.id, p]),
);

export const MONK_KI_POWER_IDS: readonly string[] = KI_POWER_LIST.map((p) => p.id);

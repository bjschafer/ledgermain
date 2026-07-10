/**
 * Clean-room PF1 witch hex table (Advanced Player's Guide, issue #65):
 * hand-authored from the published rules (verified against aonprd.com's
 * book-scoped legacy Witch class page, which lets hexes be split by exact
 * source book), mirroring `magus-arcana.ts`'s/`oracle-revelations.ts`'s
 * posture — hexes are NOT part of the vendored Foundry data pack (the Witch
 * class def only links the generic "Hex"/"Major Hex"/"Grand Hex" stub
 * `ClassFeature`s, no per-hex breakdown — confirmed: `class-features.json`
 * carries no per-hex entries), so there is no upstream JSON to normalize.
 *
 * Scope: the 27 Advanced Player's Guide "core" hexes — 14 regular hexes
 * (available from 1st level), 8 major hexes (10th level), 5 grand hexes
 * (18th level). Ultimate Magic adds another 21 hexes (10 regular/8 major/3
 * grand) that are OUT OF SCOPE here, same posture as `oracle-revelations.ts`
 * scoping down to APG-core-only mysteries and `magus-arcana.ts` scoping down
 * to base Ultimate Magic arcana — add them in a follow-up if the tracker
 * needs to represent a higher-splatbook witch.
 *
 * Save DC (PF1 APG RAW, stated once as a blanket rule on the witch's Hex
 * class feature, not repeated per-hex): "10 + 1/2 the witch's level + the
 * witch's Intelligence modifier" — see `tables.ts` `witchHexDC`.
 *
 * Level gating: `minLevel` is 1 for a regular hex, 10 for a major hex, 18 for
 * a grand hex — these are NOT extra picks on top of the regular hex budget
 * (APG: "in place of one of her regular hex choices"), just additional
 * options unlocked within the same budget once the witch reaches that level
 * (see `model/witchHexes.ts`'s budget math). Soft availability filtering
 * only (see `magus-arcana.ts`'s identical convention) — never blocks
 * selection.
 *
 * Modelling posture (mirrors oracle-revelations.ts/magus-arcana.ts's honesty
 * bar): almost every hex here is a situational, activated, save-triggered,
 * or resource-scaling ability with no flat always-on number the engine
 * tracks. A few come close to a real static effect —
 *   - Cauldron grants a flat +4 insight bonus on Craft (Alchemy) checks, but
 *     Craft is a player-named parameterized skill (`crf.<material>` — see
 *     `tables.ts`'s `PARAMETERIZED_SKILL_PREFIXES` doc comment) with no
 *     guaranteed "Craft (Alchemy)" entry on the sheet to target reliably;
 *   - Flight's 1st-tier benefit (at-will feather fall + a Swim bonus) is
 *     passive, but its actual fly-speed components (levitate, then a true
 *     fly speed) are both limited daily-use activations, not a permanent
 *     fly speed — so "Flight grants passive flight" would overstate it;
 *   - Ward grants a static +2 (scaling) deflection AC / resistance bonus to
 *     an ally once activated, persisting until triggered — the closest thing
 *     here to a genuine toggle, but it targets an ALLY the witch chooses at
 *     activation time, not the witch's own sheet, so there's no reliable
 *     "self" Change target either.
 * None of these clear the bar for an unconditional Change on the WITCH's own
 * sheet, so — same discipline as `oracle-revelations.ts`'s Sidestep
 * Secret/Mental Acuity near-misses — EVERY entry here is `displayOnly: true`
 * with `changes: []`; a `contextNotes` reminder carries the DC/duration/
 * activation shape instead, and flags Cauldron/Flight/Ward specifically as
 * the ones worth a closer look by hand.
 *
 * Issue #75 audit: the buff-gated-changes mechanism (`Change.activeWhenBuff`,
 * built for the rage powers' "while raging" shape — see `rage-powers.ts`)
 * does NOT unlock anything here. None of the three near-misses above is
 * "unconditional while a specific, id-identifiable buff is active": Cauldron
 * is always-on but blocked by the parameterized-skill targeting problem,
 * Flight's fly speed is a limited daily-use activation with no existing
 * buffId/effectTag to gate on, and Ward lands on an ALLY's sheet, not the
 * witch's. All three stay deliberately deferred.
 */

import type { Change, ContextNote } from "@pf1/schema";

export type WitchHexTier = "hex" | "major" | "grand";

export interface WitchHexDef {
  id: string;
  name: string;
  tier: WitchHexTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest witch level this hex can be selected at — 1 (hex), 10 (major), or 18 (grand). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the hex (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (save DC, duration, nested per-use choice, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no hex has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawHex {
  id: string;
  name: string;
  summary: string;
  contextNotes?: ContextNote[];
}

function forTier(tier: WitchHexTier, minLevel: number, entries: RawHex[]): WitchHexDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    summary: e.summary,
    minLevel,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const HEX_LIST: WitchHexDef[] = [
  ...forTier("hex", 1, [
    {
      id: "blight",
      name: "Blight",
      summary:
        "Curse an animal, plant, or patch of land: a creature touched takes ongoing Constitution damage each day, or plants in the area wither over a week.",
      contextNotes: [
        note("Fort/Will save applies (creature target); DC = 10 + 1/2 witch level + Int mod."),
      ],
    },
    {
      id: "cackle",
      name: "Cackle",
      summary:
        "Move action: extend the duration of your own active Agony, Charm, Evil Eye, Fortune, or Misfortune hex on a target by 1 round.",
    },
    {
      id: "cauldron",
      name: "Cauldron",
      summary: "Gain Brew Potion as a bonus feat and a +4 insight bonus on Craft (Alchemy) checks.",
      contextNotes: [
        note(
          "+4 insight bonus on Craft (Alchemy) checks — not auto-applied (Craft is a player-named parameterized skill with no guaranteed matching entry); add it by hand to your Craft (Alchemy) skill if you have one.",
          "skill.crf",
        ),
      ],
    },
    {
      id: "charm",
      name: "Charm",
      summary:
        "Shift a creature's attitude one step friendlier (two steps at 8th level) for a number of rounds equal to your Intelligence modifier.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "coven",
      name: "Coven",
      summary:
        "Count as a hag for coven-forming purposes; as an aid-another action, grant +1 caster level to another witch's coven hex within 30 ft.",
    },
    {
      id: "disguise",
      name: "Disguise",
      summary: "Use as disguise self, for a number of hours per day equal to your witch level.",
    },
    {
      id: "evilEye",
      name: "Evil Eye",
      summary:
        "Impose a -2 penalty (-4 at 8th level) to AC, an ability check, an attack roll, a saving throw, or a skill check (your choice each use) for several rounds.",
      contextNotes: [
        note(
          "Will save reduces the duration to 1 round; DC = 10 + 1/2 witch level + Int mod. Which category is penalized is chosen per use.",
        ),
      ],
    },
    {
      id: "flight",
      name: "Flight",
      summary:
        "1st: at-will feather fall plus a swim speed bonus. 3rd: levitate 1/day. 5th: fly for minutes/day equal to witch level.",
      contextNotes: [
        note(
          "Only the feather fall + swim-speed benefit is passive; levitate/fly are limited daily-use activations, not a permanent fly speed — apply manually while active.",
          "speed.fly",
        ),
      ],
    },
    {
      id: "fortune",
      name: "Fortune",
      summary:
        "An ally within 30 ft. rerolls one d20 check and keeps the better result, for 1 round (2 rounds at 8th, 3 at 16th).",
    },
    {
      id: "healing",
      name: "Healing",
      summary:
        "Touch acts as cure light wounds (cure moderate wounds at 5th level), once per day per creature.",
    },
    {
      id: "misfortune",
      name: "Misfortune",
      summary:
        "Force a target to roll a d20 check twice and take the worse result, for 1 round (2 rounds at 8th, 3 at 16th).",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "slumber",
      name: "Slumber",
      summary:
        "Put a creature to sleep as sleep, for a number of rounds equal to your witch level (no HD cap); ends if the sleeper takes damage.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "tongues",
      name: "Tongues",
      summary:
        "Understand any spoken language for minutes/day equal to your witch level; speak any language too, starting at 5th level.",
    },
    {
      id: "ward",
      name: "Ward",
      summary:
        "Grant an ally a +2 deflection bonus to AC and +2 resistance bonus on saves (scaling +1 at 8th/16th), lasting until they're hit or fail a save. Only one Ward active at a time; cannot target yourself.",
      contextNotes: [
        note(
          "Static ally buff once activated (persists until triggered) — targets an ally you choose, not yourself, so there's no reliable self-Change target here; apply manually to the ally's sheet while active.",
          "ac",
        ),
      ],
    },
  ]),
  ...forTier("major", 10, [
    {
      id: "agony",
      name: "Agony",
      summary:
        "Nauseate a target within 60 ft. for a number of rounds equal to your Intelligence modifier.",
      contextNotes: [note("Fort negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "hagsEye",
      name: "Hag's Eye",
      summary:
        "Create an invisible magical sensor (as arcane eye) that other witches in your coven can also see through.",
    },
    {
      id: "majorHealing",
      name: "Major Healing",
      summary:
        "Touch acts as cure serious wounds (cure critical wounds at 15th level), once per day per creature.",
    },
    {
      id: "nightmares",
      name: "Nightmares",
      summary:
        "Once per night, inflict a nightmare (as the spell) on a creature you can name or have seen.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "retribution",
      name: "Retribution",
      summary:
        "A cursed target takes half the melee damage it deals to others as damage to itself, for 1 round.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "vision",
      name: "Vision",
      summary:
        "Touch grants a 1-minute glimpse of a possible future; unwilling targets resist with a save.",
      contextNotes: [
        note("Will negates on an unwilling target; DC = 10 + 1/2 witch level + Int mod."),
      ],
    },
    {
      id: "waxenImage",
      name: "Waxen Image",
      summary:
        "Craft a wax duplicate of a target; on a failed save, you can puppet the target's actions through it.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "weatherControl",
      name: "Weather Control",
      summary: "Use as control weather, once per day, requiring a 1-hour casting time.",
    },
  ]),
  ...forTier("grand", 18, [
    {
      id: "deathCurse",
      name: "Death Curse",
      summary:
        "Curse a target with escalating fatigue, then exhaustion, then death over 3 rounds unless it saves.",
      contextNotes: [note("Fort negates each stage; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "eternalSlumber",
      name: "Eternal Slumber",
      summary:
        "Put a target into a permanent magical sleep, removable only by wish, miracle, or the witch's death.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "forcedReincarnation",
      name: "Forced Reincarnation",
      summary: "Kill a target and force it to reincarnate as a new creature, as the spell.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "lifeGiver",
      name: "Life Giver",
      summary:
        "Once per day, a full-round touch resurrects a dead creature as resurrection, with no material cost.",
    },
    {
      id: "naturalDisaster",
      name: "Natural Disaster",
      summary:
        "Once per day, unleash a combined storm of vengeance and earthquake effect, requiring concentration to maintain.",
    },
  ]),
];

export const WITCH_HEXES: Record<string, WitchHexDef> = Object.fromEntries(
  HEX_LIST.map((h) => [h.id, h]),
);

export const WITCH_HEX_IDS: readonly string[] = HEX_LIST.map((h) => h.id);

/** All hex defs of a given tier, in table order. */
export function hexesForTier(tier: WitchHexTier): WitchHexDef[] {
  return HEX_LIST.filter((h) => h.tier === tier);
}

/**
 * Witch hex save DC, clean-room from the published PF1 APG SRD: "the DC of a
 * hex is equal to 10 + 1/2 the witch's level + the witch's Intelligence
 * modifier". Re-exported here (delegating to `tables.ts`) so callers that
 * already import from `witch-hexes.ts` don't need a second import.
 */
export { witchHexDC } from "./tables.js";

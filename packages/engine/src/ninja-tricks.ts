/**
 * Clean-room PF1 ninja trick table (Ultimate Combat, issue #65 wave B):
 * hand-authored from the published rules (verified against Archives of
 * Nethys / d20pfsrd — legacy.aonprd.com's Ultimate Combat ninja page and
 * aonprd.com's Ninja Tricks index; no Foundry system source consulted,
 * matching CLAUDE.md's licensing discipline), mirroring
 * `witch-hexes.ts`'/`oracle-revelations.ts`'s posture — ninja tricks are NOT
 * part of the vendored Foundry data pack (the Ninja class def only links the
 * generic "Ninja Tricks"/"Master Tricks" stub `ClassFeature`s, no per-trick
 * breakdown — confirmed: `class-features.json` carries no per-trick entries),
 * so there is no upstream JSON to normalize.
 *
 * Scope: the 31 standard Ultimate Combat ninja tricks plus the 13 Ultimate
 * Combat master tricks (10th level+). Tricks added by later splatbooks
 * (Legacy of Dragons, Martial Arts Handbook, Champions of Balance, Heroes
 * from the Fringe, Chronicle of Legends, ...) are OUT OF SCOPE, same posture
 * as `oracle-revelations.ts`/`witch-hexes.ts` scoping to their own core book.
 *
 * Budget (PF1 Ultimate Combat RAW): "Starting at 2nd level, a ninja gains
 * one ninja trick. She gains one additional ninja trick for every 2 levels
 * attained after 2nd" (2nd, 4th, ..., 20th — 10 total by 20th); "At 10th
 * level, and every two levels thereafter, a ninja can select one of the
 * following master tricks in place of a ninja trick" — master tricks are
 * NOT an extra pick on top of the regular trick budget, just additional
 * options unlocked within the same budget once the ninja reaches 10th (see
 * `model/ninjaTricks.ts` for the budget math, and `WitchHexDef.minLevel`'s
 * doc comment for the identical "in place of" convention witch major/grand
 * hexes use). Soft availability filtering only — never blocks selection.
 *
 * Rogue-talent overlap (RAW, both directions — d20pfsrd, confirmed): a
 * ninja can spend a regular trick pick on "a rogue talent" instead (can't
 * duplicate an existing trick's name by result), and — symmetrically — a
 * rogue's 10th-level "advanced talent" can be spent on a master trick from
 * this list instead (barred from using any ki-cost trick unless she has a
 * ki pool from elsewhere). Both directions are represented here as their own
 * note-tier menu entries (`rogueTalent`/`advancedTalents`) rather than
 * cross-wired into an actual rogue-talent picker: this project has no
 * `build.rogueTalents` picker/budget field AT ALL yet (rogue talents
 * currently only ever appear via feat-classification's "Extra Rogue Talent"
 * audit note, never a real menu) — a pre-existing gap this file doesn't
 * attempt to close, not a new one it introduces.
 *
 * Modelling posture (mirrors witch-hexes.ts/oracle-revelations.ts's honesty
 * bar): the overwhelming majority of tricks are limited-use ki-activated
 * abilities, bonus feats, or narrow situational/opposed-check bonuses — no
 * flat always-on number on the ninja's own sheet. Two came close enough to
 * be worth flagging explicitly (both deliberately left `displayOnly` too,
 * for reasons noted inline):
 *   - Deadly Range (Ex) grants a flat, unconditional +10 ft. to RANGED sneak
 *     attack range (explicitly stackable — the one trick RAW allows taking
 *     more than once) with no activation cost, but this engine has no
 *     "sneak attack range" concept tracked anywhere (`sneakAttackDice` only
 *     derives the DICE count, never a range), so there's no Change target
 *     to give it;
 *   - Unarmed Combat Mastery (master trick) grants an always-on unarmed
 *     strike damage-die progression (monk table at ninja level − 4,
 *     explicitly STACKING with any real monk levels the character has) —
 *     a genuine numeric substitution, but one that needs a same-scope
 *     judgment call this project has already made elsewhere and declined
 *     (see `oracle-revelations.ts`'s Lore Keeper/Sidestep Secret/Maneuver
 *     Mastery near-misses): it requires plumbing an effective "monk level"
 *     into `unarmedDamageDie`/`archetypes.ts`'s monk-only Unarmed Strike
 *     grant for a class that doesn't otherwise have that class feature at
 *     all, which is a bigger structural change than this table's scope.
 * Every entry here is `displayOnly: true` with `changes: []`; a
 * `contextNotes` reminder carries a trick-name prerequisite (a small handful
 * require another specific trick already known — soft-noted only, PF1
 * prereqs are hybrid per CLAUDE.md) or a ki-cost/DC reminder where relevant.
 */

import type { Change, ContextNote } from "@pf1/schema";

export type NinjaTrickTier = "trick" | "master";

export interface NinjaTrickDef {
  id: string;
  name: string;
  tier: NinjaTrickTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest ninja level this trick can be selected at — 2 (trick) or 10 (master). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the trick (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (prerequisite trick, ki cost, DC, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no trick has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTrick {
  id: string;
  name: string;
  summary: string;
  contextNotes?: ContextNote[];
}

function forTier(tier: NinjaTrickTier, minLevel: number, entries: RawTrick[]): NinjaTrickDef[] {
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

const TRICK_LIST: NinjaTrickDef[] = [
  ...forTier("trick", 2, [
    {
      id: "acrobaticMaster",
      name: "Acrobatic Master",
      summary: "Swift action, spend 1 ki: +20 bonus on one Acrobatics check before your next turn.",
    },
    {
      id: "bleedingAttack",
      name: "Bleeding Attack",
      summary:
        "A successful sneak attack also causes ongoing bleed damage equal to your sneak attack dice count.",
      contextNotes: [
        note(
          "Sneak-attack-modifying trick (marked *): only one such trick can apply to a given attack, chosen before the attack roll.",
        ),
      ],
    },
    {
      id: "chokingBomb",
      name: "Choking Bomb",
      summary:
        "Your smoke bomb cloud also staggers creatures for 1d4 rounds on a failed Fort save.",
      contextNotes: [note("Requires the Smoke Bomb trick already known.")],
    },
    { id: "combatTrick", name: "Combat Trick", summary: "Gain any combat feat as a bonus feat." },
    {
      id: "darkvisionTrick",
      name: "Darkvision",
      summary: "Standard action, spend 1 ki: gain 60 ft. darkvision until your next rest.",
    },
    {
      id: "deadlyRange",
      name: "Deadly Range",
      summary:
        "+10 ft. to ranged sneak attack range, unconditional. Stackable — can be taken more than once.",
      contextNotes: [
        note(
          "No engine target — this engine doesn't track a separate 'sneak attack range' field. Apply manually when resolving a ranged sneak attack.",
        ),
      ],
    },
    {
      id: "deflectArrowsTrick",
      name: "Deflect Arrows",
      summary: "Gain Deflect Arrows as a bonus feat.",
      contextNotes: [
        note("Requires Improved Unarmed Strike (feat prerequisite, not a level gate)."),
      ],
    },
    {
      id: "fastStealth",
      name: "Fast Stealth",
      summary: "Move at full speed while using Stealth with no penalty.",
    },
    {
      id: "featherFallTrick",
      name: "Feather Fall",
      summary: "Immediate action, spend 1 ki: feather fall, caster level = ninja level.",
    },
    {
      id: "flurryOfStars",
      name: "Flurry of Stars",
      summary:
        "Swift action + 1 ki before a full attack with shuriken: throw 2 extra shuriken at your highest attack bonus.",
    },
    {
      id: "forgottenTrick",
      name: "Forgotten Trick",
      summary:
        "Temporarily 'borrow' one ninja trick you don't know (not a master trick or rogue talent) for a number of rounds equal to your ninja level.",
    },
    {
      id: "hiddenWeapons",
      name: "Hidden Weapons",
      summary:
        "+ninja level on opposed Sleight of Hand checks to conceal a weapon; draw a hidden weapon as a move action.",
    },
    {
      id: "highJumper",
      name: "High Jumper",
      summary: "Halve the DC of Acrobatics checks to jump high.",
      contextNotes: [note("Requires the Acrobatic Master trick already known.")],
    },
    {
      id: "kiBlock",
      name: "Ki Block",
      summary:
        "On a successful sneak attack, the target must save or be unable to spend ki points for several rounds.",
      contextNotes: [
        note(
          "Will negates; sneak-attack-modifying trick (marked *) — only one such trick per attack.",
        ),
      ],
    },
    {
      id: "kiCharge",
      name: "Ki Charge",
      summary:
        "Standard action: imbue a thrown weapon with ki so it explodes for fire damage on impact.",
    },
    {
      id: "poisonBomb",
      name: "Poison Bomb",
      summary: "Your smoke bomb cloud can also carry an inhaled poison you possess.",
      contextNotes: [note("Requires the Smoke Bomb trick already known.")],
    },
    {
      id: "pressurePoints",
      name: "Pressure Points",
      summary: "A successful sneak attack also deals 1 point of Strength or Dexterity damage.",
      contextNotes: [
        note(
          "Sneak-attack-modifying trick (marked *): only one such trick can apply to a given attack.",
        ),
      ],
    },
    {
      id: "rogueTalent",
      name: "Rogue Talent",
      summary:
        "Select a rogue talent instead of a ninja trick (can't duplicate the name of a trick you already know). Repeatable.",
      contextNotes: [
        note(
          "This project has no rogue-talent picker/budget yet (pre-existing gap) — record the chosen talent as a note; not wired to a live budget.",
        ),
      ],
    },
    {
      id: "shadowClone",
      name: "Shadow Clone",
      summary: "Standard action, spend 1 ki: create 1d4 mirror-image-style duplicates of yourself.",
    },
    {
      id: "slowMetabolism",
      name: "Slow Metabolism",
      summary:
        "Double how long you can hold your breath; double the interval between poison saves when poisoned.",
    },
    {
      id: "slowReactions",
      name: "Slow Reactions",
      summary: "Creatures hit by your sneak attack can't take attacks of opportunity for 1 round.",
      contextNotes: [
        note(
          "Will negates; sneak-attack-modifying trick (marked *) — only one such trick per attack.",
        ),
      ],
    },
    {
      id: "smokeBomb",
      name: "Smoke Bomb",
      summary:
        "Throw a bomb that creates a 15-ft.-radius smokestick-like cloud (enables the bomb-family tricks above).",
    },
    {
      id: "snatchArrowsTrick",
      name: "Snatch Arrows",
      summary: "Gain Snatch Arrows as a bonus feat.",
      contextNotes: [
        note(
          "Requires Improved Unarmed Strike + Deflect Arrows (feat prerequisites, not a level gate).",
        ),
      ],
    },
    {
      id: "styleMaster",
      name: "Style Master",
      summary: "Gain a style feat you qualify for as a bonus feat.",
    },
    {
      id: "suddenDisguise",
      name: "Sudden Disguise",
      summary: "Swift action, spend 1 ki: disguise self for 1 minute per ninja level.",
    },
    {
      id: "unarmedCombatTraining",
      name: "Unarmed Combat Training",
      summary: "Gain Improved Unarmed Strike as a bonus feat.",
    },
    {
      id: "undetectedSabotage",
      name: "Undetected Sabotage",
      summary:
        "When sabotaging via Disable Device, roll a hidden Stealth check (+ninja level) so inspectors don't notice the tampering.",
    },
    {
      id: "vanishingTrick",
      name: "Vanishing Trick",
      summary: "Swift action, spend 1 ki: turn invisible for 1 round per ninja level.",
    },
    {
      id: "ventriloquismTrick",
      name: "Ventriloquism",
      summary: "Swift action: ventriloquism effect for 1 minute per ninja level.",
    },
    {
      id: "wallClimber",
      name: "Wall Climber",
      summary: "Gain a 20-ft. climb speed on vertical surfaces (not smooth or overhanging ones).",
    },
    {
      id: "weaponTrainingTrick",
      name: "Weapon Training",
      summary: "Gain Weapon Focus as a bonus feat.",
    },
  ]),
  ...forTier("master", 10, [
    {
      id: "advancedTalents",
      name: "Advanced Talents",
      summary:
        "Select a rogue talent from the Advanced Talents list instead of a master trick (can't duplicate a name you already know).",
      contextNotes: [
        note(
          "This project has no rogue-talent picker/budget yet (pre-existing gap) — record the chosen talent as a note; not wired to a live budget.",
        ),
      ],
    },
    {
      id: "assassinate",
      name: "Assassinate",
      summary:
        "Study a helpless or flat-footed target for 1 round; a sneak attack against it the following round can potentially kill outright on a failed Fortitude save.",
    },
    {
      id: "blindingBomb",
      name: "Blinding Bomb",
      summary: "Your smoke bomb cloud also blinds creatures for 1d4 rounds on a failed Fort save.",
      contextNotes: [note("Requires the Smoke Bomb trick already known.")],
    },
    {
      id: "deadlyShuriken",
      name: "Deadly Shuriken",
      summary:
        "Full-round action: a single shuriken throw resolves as multiple attack rolls based on your full base attack bonus.",
    },
    {
      id: "evasionTrick",
      name: "Evasion",
      summary:
        "Standard Evasion (no damage on a successful Reflex save that would normally halve damage); light or no armor only.",
    },
    {
      id: "masterTrickFeat",
      name: "Feat",
      summary: "Gain any feat you qualify for, in place of a master trick.",
    },
    {
      id: "ghostStep",
      name: "Ghost Step",
      summary:
        "Swift action: pass through walls and other surfaces up to 5 ft. thick per ninja level until the end of your turn.",
    },
    {
      id: "invisibleBlade",
      name: "Invisible Blade",
      summary: "Vanishing Trick's invisibility becomes greater-invisibility-equivalent.",
      contextNotes: [note("Requires the Vanishing Trick ninja trick already known.")],
    },
    {
      id: "masterDisguise",
      name: "Master Disguise",
      summary: "Sudden Disguise's duration extends to 10 minutes per ninja level.",
      contextNotes: [note("Requires the Sudden Disguise ninja trick already known.")],
    },
    {
      id: "seeTheUnseen",
      name: "See the Unseen",
      summary: "Swift action, spend 1 ki: cast see invisibility, caster level = ninja level.",
    },
    {
      id: "shadowSplit",
      name: "Shadow Split",
      summary: "Create an illusory double of yourself that moves away as a distraction.",
    },
    {
      id: "unarmedCombatMastery",
      name: "Unarmed Combat Mastery",
      summary:
        "Your unarmed strike deals damage as a monk of your ninja level − 4, stacking with any real monk levels you have.",
      contextNotes: [
        note(
          "Genuine numeric progression (stacks with real monk levels), but not wired into unarmedDamageDie here — same scope decision as oracle-revelations.ts's Lore Keeper/Maneuver Mastery near-misses; apply manually.",
        ),
      ],
    },
    {
      id: "unboundSteps",
      name: "Unbound Steps",
      summary: "Your ki-powered Light Steps class feature also lets you walk on air.",
    },
  ]),
];

export const NINJA_TRICKS: Record<string, NinjaTrickDef> = Object.fromEntries(
  TRICK_LIST.map((t) => [t.id, t]),
);

export const NINJA_TRICK_IDS: readonly string[] = TRICK_LIST.map((t) => t.id);

/** All trick defs of a given tier, in table order. */
export function tricksForTier(tier: NinjaTrickTier): NinjaTrickDef[] {
  return TRICK_LIST.filter((t) => t.tier === tier);
}

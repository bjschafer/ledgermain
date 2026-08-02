/**
 * Clean-room PF1 ninja trick table (Ultimate Combat): hand-authored from the
 * published rules (verified against Archives of Nethys / d20pfsrd —
 * legacy.aonprd.com's Ultimate Combat ninja page and aonprd.com's Ninja Tricks
 * index; no Foundry system source consulted, matching CLAUDE.md's licensing
 * discipline), mirroring `witch-hexes.ts`'/`oracle-revelations.ts`'s posture —
 * ninja tricks are NOT part of the vendored Foundry data pack (the Ninja class
 * def only links the generic "Ninja Tricks"/"Master Tricks" stub
 * `ClassFeature`s, no per-trick breakdown — confirmed: `class-features.json`
 * carries no per-trick entries), so there is no upstream JSON to normalize.
 *
 * Scope: FULL vendored parity as of the follow-up sweep — all 65 vendored
 * tricks (41 regular from 2nd level, 24 master from 10th), the Ultimate Combat
 * core set (31 tricks + 13 master tricks) plus every splatbook addition the
 * pinned data carries (Legacy of Dragons, Martial Arts Handbook, Champions of
 * Balance, Heroes from the Fringe, Chronicle of Legends,...), same posture as
 * `witch-hexes.ts`'s full-catalog scope.
 *
 * Budget (PF1 Ultimate Combat RAW): "Starting at 2nd level, a ninja gains one
 * ninja trick. She gains one additional ninja trick for every 2 levels
 * attained after 2nd" (2nd, 4th,..., 20th — 10 total by 20th); "At 10th level,
 * and every two levels thereafter, a ninja can select one of the following
 * master tricks in place of a ninja trick" — master tricks are NOT an extra
 * pick on top of the regular trick budget, just additional options unlocked
 * within the same budget once the ninja reaches 10th (see
 * `model/ninjaTricks.ts` for the budget math, and `WitchHexDef.minLevel`'s doc
 * comment for the identical "in place of" convention witch major/grand hexes
 * use). Soft availability filtering only — never blocks selection.
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
 * flat always-on number on the ninja's own sheet. One trick clears the bar for
 * a real, unconditional `Change` (sweep):
 *   - Wall Climber (Su) grants a flat, unconditional 20-ft. climb speed on
 *     vertical surfaces (not perfectly smooth ones, nor the underside of a
 *     horizontal surface — an applicability caveat every climb speed shares,
 *     not a triggered/activated condition), no ki cost — verified against
 *     d20pfsrd's "Wall Climber (Su)" ninja-trick page and
 *     legacy.aonprd.com's Ultimate Combat ninja listing. Targets `climbSpeed`
 *     (additive, base 0 for a ninja with no other climb speed source), same
 *     shape as `vigilante-talents.ts`'s Rooftop Infiltrator.
 * Two more came close enough to be worth flagging explicitly (both
 * deliberately left `displayOnly` too, for reasons noted inline):
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
 * Every other entry here is `displayOnly: true` with `changes: []`; a
 * `contextNotes` reminder carries a trick-name prerequisite (a small handful
 * require another specific trick already known — soft-noted only, PF1
 * prereqs are hybrid per CLAUDE.md) or a ki-cost/DC reminder where relevant.
 *
 * The 21 tricks added by a later follow-up (bringing the table from 44 to 65 —
 * full vendored parity) were reviewed against the same honesty bar and none
 * cleared it: every one is either ki-activated/limited-use (Kamikaze, Occulted
 * Soul, Kawarimi,...), a bonus-feat grant (Blood Debt, Kami Warden), a nested
 * modifier to another trick requiring it as a prerequisite (Fractured Mirror
 * needs Shadow Clone, Greater Ki Venom needs Ki Venom, Many Guises needs Deep
 * Cover), or a non-numeric ability (Deep Cover's vigilante identities,
 * Spiritual Companion's familiar, All the Stars in the Sky's shuriken economy)
 * — all stay `displayOnly`.
 */

import type { Change, ContextNote, NinjaTrick, RefData, SourceRef } from "@pf1/schema";

export type NinjaTrickTier = "trick" | "master";

export interface NinjaTrickDef {
  id: string;
  name: string;
  tier: NinjaTrickTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest ninja level this trick can be selected at — 2 (trick) or 10 (master). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the trick (empty for every entry except Wall Climber — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (prerequisite trick, ki cost, DC, ...). */
  contextNotes?: ContextNote[];
  /** True when this trick has no live `Change` — Wall Climber is the sole exception, see file doc comment. */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTrick {
  id: string;
  name: string;
  summary: string;
  contextNotes?: ContextNote[];
  /** Real Changes — omitted/empty for every entry except Wall Climber, see file doc comment. */
  changes?: Change[];
}

function forTier(tier: NinjaTrickTier, minLevel: number, entries: RawTrick[]): NinjaTrickDef[] {
  return entries.map((e) => {
    const changes = e.changes ?? [];
    return {
      id: e.id,
      name: e.name,
      tier,
      summary: e.summary,
      minLevel,
      changes,
      contextNotes: e.contextNotes,
      displayOnly: changes.length === 0,
    };
  });
}

const TRICK_LIST: NinjaTrickDef[] = [
  ...forTier("trick", 2, [
    {
      id: "acrobaticMaster",
      name: "Acrobatic Master",
      summary: "Swift action, spend 1 ki: +20 bonus on one Acrobatics check before your next turn.",
    },
    {
      id: "arcaneBackfire",
      name: "Arcane Backfire",
      summary:
        "On a successful attack against a foe wielding a magic item with charges or daily uses, attempt a Use Magic Device check to drain one daily use or a number of charges equal to your sneak attack dice.",
      contextNotes: [note("DC = 20 + the item's caster level.")],
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
      id: "bloodDebt",
      name: "Blood Debt",
      summary:
        "Gain In Harm's Way as a bonus feat (prerequisites waived). Spend 1 ki to place a blood debt on an ally you just protected with it, reducing your ki pool by 1 until you end the debt; ending it in response to a further attack on that ally shifts that damage onto you instead.",
      contextNotes: [note("Ki pool stays reduced by 1 for as long as the debt is active.")],
    },
    {
      id: "breathOfTheAncestors",
      name: "Breath of the Ancestors",
      summary:
        "Choose an imperial dragon lineage when picked (fixed thereafter). Standard action, spend up to 2 ki: exhale that dragon's damage type in a 15-ft. cone (30-ft. line for underworld) dealing damage equal to your sneak attack, Reflex half; usable again only after 1d4 rounds.",
      contextNotes: [note("Save DC = 10 + 1/2 ninja level + Int modifier.")],
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
      id: "herbalCompound",
      name: "Herbal Compound",
      summary:
        "Move action, spend 1 ki: consume a prepared herbal compound for a +4 alchemical bonus on Will saves for 10 minutes per ninja level, at a -2 penalty to AC and Reflex saves for the duration.",
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
      id: "kamikaze",
      name: "Kamikaze",
      summary:
        "Spend 1 ki: your unarmed strikes and wielded weapons gain the vicious weapon property for 1 round per ninja level. Spend another ki point to end the effect early.",
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
      id: "kiVenom",
      name: "Ki Venom",
      summary:
        "Full-round action, spend 1 ki: brew a venom from mundane materials dealing 1d4 Strength or Dexterity damage, lasting 24 hours before going inert. Extra ki spent while brewing can bump the damage die to d6, retarget the damage to Int/Wis/Cha, or add an extra save needed to cure it.",
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
      id: "redirectForce",
      name: "Redirect Force",
      summary:
        "When a feat lets you attempt a combat maneuver without provoking an attack of opportunity, you may choose to provoke it anyway; damage you take from that provoked attack is added as a bonus to your maneuver check instead of applying as a penalty.",
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
      id: "strangler",
      name: "Strangler",
      summary:
        "Use an improvised garrote (a scarf, for instance) with no penalty. As a free action while attempting a grapple check, spend 1 ki to add a constrict attack dealing damage equal to half your sneak attack dice (minimum 1d6).",
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
      id: "swarmingAttack",
      name: "Swarming Attack",
      summary:
        "While sharing a square with an ally via the swarming racial trait, gain a bonus on your damage rolls equal to that ally's sneak attack dice count.",
      contextNotes: [note("Requires the swarming racial trait (e.g. ratfolk).")],
    },
    {
      id: "swiftPoisoner",
      name: "Swift Poisoner",
      summary: "Apply poison to a weapon as a swift action instead of a standard action.",
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
      changes: [{ formula: "20", target: "climbSpeed", type: "untyped" }],
    },
    {
      id: "weaponTrainingTrick",
      name: "Weapon Training",
      summary: "Gain Weapon Focus as a bonus feat.",
    },
  ]),
  ...forTier("master", 10, [
    {
      id: "accelerationOfForm",
      name: "Acceleration of Form",
      summary:
        "Standard action, spend 1 ki: gain the effects of both displacement and haste for 1 round per 2 ninja levels.",
    },
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
      id: "allTheStarsInTheSky",
      name: "All the Stars in the Sky",
      summary:
        "Once you own a set of 50 identical magic shuriken, that stockpile never runs out and restocks itself for free. The whole stock can be upgraded together as if it were a single magic weapon.",
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
      id: "deepCover",
      name: "Deep Cover",
      summary:
        "Gain a vigilante's dual identity and seamless guise class features (calling the two identities 'social' and 'ninja' rather than 'social' and 'vigilante'), except that switching identities is a move action that costs 1 ki instead of the vigilante's usual trigger.",
    },
    {
      id: "evasionTrick",
      name: "Evasion",
      summary:
        "Standard Evasion (no damage on a successful Reflex save that would normally halve damage); light or no armor only.",
    },
    {
      id: "falseFace",
      name: "False Face",
      summary:
        "While you have at least 1 ki point, gain the change shape universal monster ability, limited to Small or Medium humanoid forms (as alter self).",
    },
    {
      id: "masterTrickFeat",
      name: "Feat",
      summary: "Gain any feat you qualify for, in place of a master trick.",
    },
    {
      id: "fracturedMirror",
      name: "Fractured Mirror",
      summary:
        "Shadow Clone creates one additional duplicate per 3 ninja levels (max 8 total); as part of a move action, any active clone can split off to move independently at your speed. A separated clone can't act (though it still provides flanking), occupies no space, and has AC 5 lower than yours.",
      contextNotes: [note("Requires the Shadow Clone ninja trick already known.")],
    },
    {
      id: "ghostStep",
      name: "Ghost Step",
      summary:
        "Swift action: pass through walls and other surfaces up to 5 ft. thick per ninja level until the end of your turn.",
    },
    {
      id: "greaterKiVenom",
      name: "Greater Ki Venom",
      summary:
        "Spend 2 ki while brewing ki venom to raise its damage die to a d8, or spend another 2 ki to retarget the ability damage to Constitution.",
      contextNotes: [note("Requires the Ki Venom ninja trick already known.")],
    },
    {
      id: "invisibleBlade",
      name: "Invisible Blade",
      summary: "Vanishing Trick's invisibility becomes greater-invisibility-equivalent.",
      contextNotes: [note("Requires the Vanishing Trick ninja trick already known.")],
    },
    {
      id: "kamiWarden",
      name: "Kami Warden",
      summary:
        "Gain Bodyguard and In Harm's Way as bonus feats (prerequisites waived). When using In Harm's Way to intercept an attack, spend 1 ki for DR 10/cold iron and resistance 10 to acid, electricity, and fire against that attack.",
    },
    {
      id: "kawarimi",
      name: "Kawarimi",
      summary:
        "Once per day as an immediate action when hit by an attack, spend 1 ki to attempt a Stealth check opposed by the attacker's Perception in place of taking the hit, provided you have at least cover or concealment. On success, the attack instead strikes a mistaken object, and you may move into an adjacent square, hidden from the attacker.",
    },
    {
      id: "manyGuises",
      name: "Many Guises",
      summary: "Gain the vigilante social talent of the same name.",
      contextNotes: [
        note(
          "Requires the Deep Cover master trick already known. Not cross-wired to `vigilante-talents.ts`'s Many Guises entry — apply its effect manually.",
        ),
      ],
    },
    {
      id: "masterDisguise",
      name: "Master Disguise",
      summary: "Sudden Disguise's duration extends to 10 minutes per ninja level.",
      contextNotes: [note("Requires the Sudden Disguise ninja trick already known.")],
    },
    {
      id: "occultedSoul",
      name: "Occulted Soul",
      summary:
        "Spend 1 ki to cast nondetection on yourself as a spell-like ability, caster level = ninja level.",
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
      id: "spiritualCompanion",
      name: "Spiritual Companion",
      summary:
        "Gain an improved familiar (treating your ninja level as your effective wizard level), chosen from calligraphy wyrm, pipefox, shikigami kami, or spirit oni, provided your alignment is compatible with the choice.",
      contextNotes: [
        note(
          "None of those familiar options exist in this project's Familiar picker (familiars.ts) — set up a stand-in in the Familiar section of the Classes panel; this entry is informational only.",
        ),
      ],
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.ninjaTricks` (see that type's doc comment) is the FULL published
 * catalog (65 entries after junk filtering), prose only. The hand-authored
 * table above stays authoritative for MECHANICS — this section only merges the
 * two for BROWSING/resolving, mirroring `rage-powers.ts`'s "vendored catalog
 * overlay" section exactly.
 *
 * Collision audit (all 65 hand-authored entries, after a later follow-up
 * brought the table to full parity): 64 matched a vendored entry by
 * normalized name; the lone exception is `advancedTalents` ("Advanced
 * Talents") — the vendored catalog spells the same trick "Advanced Talent"
 * (singular, key `advanced_talent`), a wording drift confirmed by matching
 * description text, recorded in `NAME_ALIASES` below.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see `rage-powers.ts`'s identical map. */
const NINJA_TRICK_NAME_ALIASES: Record<string, string> = {
  advancedTalents: "Advanced Talent",
};

function normalizeTrickName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** True when a vendored trick's own `category` marks it as the 10th-level "master" tier (see `NinjaTrick`'s doc comment) — used only for a vendored-only entry, which has no hand-authored `tier` to inherit. */
function tierFromCategory(category: string | undefined): NinjaTrickTier {
  return category?.startsWith("Master ") ? "master" : "trick";
}

/** A catalog entry the picker can browse — either the hand-authored def with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedNinjaTrickEntry extends NinjaTrickDef {
  nameSuffix?: string;
  /** Vendored grouping tag (e.g. "Ki Tricks", "Master Other Tricks"), when present. */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  sources?: SourceRef[];
}

function vendoredToDef(entry: NinjaTrick): MergedNinjaTrickEntry {
  const tier = tierFromCategory(entry.category);
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    tier,
    // NOT `entry.level` — uninterpreted source field, see `NinjaTrick.level`'s doc comment.
    minLevel: tier === "master" ? 10 : 2,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked ninja-trick id (`doc.build.ninjaTricks` entries) to its
 * definition — hand-authored table first, falling back to the vendored
 * catalog for an id that only exists there. Used by `archetypes.ts` instead
 * of indexing `NINJA_TRICKS` directly, so a vendored-only pick resolves to a
 * real (display-only) definition rather than being silently dropped —
 * mirrors `resolveRagePower`.
 */
export function resolveNinjaTrick(id: string, refData: RefData): NinjaTrickDef | undefined {
  const hand = NINJA_TRICKS[id];
  if (hand) return hand;
  const vendored = refData.ninjaTricks?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def, plus every hand-authored entry with no
 * vendored counterpart (none today — see file doc comment) appended —
 * mirrors `mergedRagePowerCatalog` exactly.
 */
export function mergedNinjaTrickCatalog(refData: RefData): MergedNinjaTrickEntry[] {
  const handByNormName = new Map<string, NinjaTrickDef>();
  for (const t of TRICK_LIST) {
    handByNormName.set(normalizeTrickName(NINJA_TRICK_NAME_ALIASES[t.id] ?? t.name), t);
  }

  const vendored = Object.values(refData.ninjaTricks ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedNinjaTrickEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeTrickName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const t of TRICK_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}

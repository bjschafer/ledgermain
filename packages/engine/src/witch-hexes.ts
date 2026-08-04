/**
 * Clean-room PF1 witch hex table (Advanced Player's Guide): hand-authored from
 * the published rules (verified against aonprd.com's book-scoped legacy Witch
 * class page, which lets hexes be split by exact source book), mirroring
 * `magus-arcana.ts`'s/`oracle-revelations.ts`'s posture — hexes are NOT part
 * of the vendored Foundry data pack (the Witch class def only links the
 * generic "Hex"/"Major Hex"/"Grand Hex" stub `ClassFeature`s, no per-hex
 * breakdown — confirmed: `class-features.json` carries no per-hex entries), so
 * there is no upstream JSON to normalize.
 *
 * Scope: FULL vendored parity as of the Phase 5 extension — all 104 vendored
 * hexes (60 regular from 1st level, 31 major from 10th, 13 grand from 18th),
 * the APG core set plus every splatbook addition the pinned data carries
 * (Ultimate Magic, Heroes of Golarion, Healer's Handbook, Champions of Purity,
 * Legacy of the First World,...).
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
 * tracks. Two clear the bar for an unconditional Change on the WITCH's own
 * sheet: Iceplant's always-on +2 natural armor, and Flight's 1st-level +4
 * racial bonus on Swim checks (Flight's later components — levitate at 3rd,
 * then a true fly speed at 5th — are both limited daily-use activations, not
 * a permanent fly speed, so those stay display-only). A couple more come
 * close but don't clear it —
 *   - Cauldron and Dark Apothecary each grant a flat insight bonus on a
 *     Craft check, but Craft is a player-named parameterized skill
 *     (`crf.<material>` — see `tables.ts`'s `PARAMETERIZED_SKILL_PREFIXES`
 *     doc comment) with no guaranteed matching entry on the sheet to target
 *     reliably;
 *   - Ward grants a static +2 (scaling) deflection AC / resistance bonus to
 *     an ally once activated, persisting until triggered — the closest thing
 *     here to a genuine toggle, but it targets an ALLY the witch chooses at
 *     activation time, not the witch's own sheet, so there's no reliable
 *     "self" Change target either.
 * Every other entry here is `displayOnly` with `changes: []` — same
 * discipline as `oracle-revelations.ts`'s Sidestep Secret/Mental Acuity
 * near-misses. A `contextNotes` reminder carries the DC/duration/activation
 * shape for the rest, and flags Cauldron/Dark Apothecary/Ward specifically as
 * the ones worth a closer look by hand.
 *
 * Audit finding: the buff-gated-changes mechanism (`Change.activeWhenBuff`,
 * built for the rage powers' "while raging" shape — see `rage-powers.ts`)
 * does NOT unlock anything here beyond Iceplant/Flight. Neither remaining
 * near-miss above is "unconditional while a specific, id-identifiable buff is
 * active": Cauldron/Dark Apothecary are always-on but blocked by the
 * parameterized-skill targeting problem, and Ward lands on an ALLY's sheet,
 * not the witch's. Both stay deliberately deferred.
 */

import type { Change, ContextNote, RefData, SourceRef, WitchHex } from "@pf1/schema";

export type WitchHexTier = "hex" | "major" | "grand";

export interface WitchHexDef {
  id: string;
  name: string;
  tier: WitchHexTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest witch level this hex can be selected at — 1 (hex), 10 (major), or 18 (grand). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the hex (empty for all but two unconditional-passive entries, Iceplant and Flight — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (save DC, duration, nested per-use choice, ...). */
  contextNotes?: ContextNote[];
  /** Derived: false only when the entry carries a real Change. */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawHex {
  id: string;
  name: string;
  summary: string;
  changes?: Change[];
  contextNotes?: ContextNote[];
}

function forTier(tier: WitchHexTier, minLevel: number, entries: RawHex[]): WitchHexDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    summary: e.summary,
    minLevel,
    changes: e.changes ?? [],
    contextNotes: e.contextNotes,
    displayOnly: (e.changes ?? []).length === 0,
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
          "+4 insight bonus on Craft (Alchemy) checks. Add it by hand to your Craft (Alchemy) skill.",
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
        "1st: at-will feather fall plus a +4 racial bonus on Swim checks. 3rd: levitate 1/day. 5th: fly for minutes/day equal to witch level.",
      changes: [{ formula: "4", target: "skill.swm", type: "racial" }],
      contextNotes: [
        note(
          "Feather fall is constant from 1st level. Levitate (3rd) and fly (5th) are limited daily-use activations, not a permanent fly speed; track their use during play.",
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
        note("Apply the AC and save bonuses by hand to the ally's sheet while active.", "ac"),
      ],
    },

    // ---- splatbook additions (full vendored parity) ----
    {
      id: "ameliorating",
      name: "Ameliorating",
      summary:
        "Touch a creature to suppress the dazzled, fatigued, shaken, or sickened condition (your choice) for minutes equal to your witch level, or instead grant a +4 circumstance bonus on saves against two of those conditions for 24 hours.",
      contextNotes: [
        note("Once a creature benefits from this hex, it can't benefit again for 24 hours."),
      ],
    },
    {
      id: "auraOfPurity",
      name: "Aura of Purity",
      summary:
        "Project a 10-ft. purifying aura for minutes/day equal to your witch level, negating diseases, inhaled poisons, and noxious gas effects (of no more than half your level in spell levels) within it.",
      contextNotes: [
        note("Minutes need not be consecutive but must be spent in 1-minute increments."),
      ],
    },
    {
      id: "beastOfIllOmen",
      name: "Beast of Ill-Omen",
      summary:
        "Curse the next enemy to see your familiar (while within 60 ft. of it) with bane (caster level = witch level) unless it saves.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "childScent",
      name: "Child-Scent",
      summary: "Gain the scent ability, but only to track humanoid children and immature animals.",
      contextNotes: [
        note(
          "Works only against humanoid children and immature animals, not a full scent ability.",
          "sensesc",
        ),
      ],
    },
    {
      id: "citySight",
      name: "City Sight",
      summary:
        "Curse a target to lose darkvision, greensight, low-light vision, and similar enhanced sight for 1 minute (10 minutes at 8th level), leaving ordinary sight and nonvisual senses intact.",
      contextNotes: [
        note("Fort negates; DC = 10 + 1/2 witch level + Int mod. Once per target per day."),
      ],
    },
    {
      id: "combatHypnosis",
      name: "Combat Hypnosis",
      summary:
        "Functions as hypnotism against a single target, even mid-combat, without granting the target's usual +2 saving throw bonus for being in combat.",
      contextNotes: [
        note("Will negates; DC = 10 + 1/2 witch level + Int mod. Once per target per day."),
      ],
    },
    {
      id: "congeal",
      name: "Congeal",
      summary:
        "Turn the water in a 10-ft. radius around you sludgy for 1 minute — difficult terrain for other swimmers and partial cover against effects passing through it.",
    },
    {
      id: "cursedWound",
      name: "Cursed Wound",
      summary:
        "Curse a living creature so that, for 3 + your Int modifier days (minimum 1), any healing applied to it can't restore its last 10 hit points unless the healer beats a caster level check (DC = 11 + witch level).",
      contextNotes: [
        note(
          "Will save reduces the duration to 1 round. At 5th level also imposes a -2 Fortitude penalty vs. disease/poison contracted from the wound. Curse effect, removable by remove curse.",
        ),
      ],
    },
    {
      id: "darkApothecary",
      name: "Dark Apothecary",
      summary: "Gain a +4 insight bonus on checks to craft poison and on checks to apply poison.",
      contextNotes: [
        note(
          "+4 insight bonus on checks to craft poison and to apply poison. Add it by hand to your Craft (poison) skill.",
          "skill.crf",
        ),
      ],
    },
    {
      id: "deathcall",
      name: "Deathcall",
      summary:
        "Wounded creatures within 120 ft. of you take a penalty on checks to stabilize while dying: -1 (-2 at 8th level, -3 at 16th).",
      contextNotes: [note("Apply this penalty by hand to affected creatures' stabilize checks.")],
    },
    {
      id: "discord",
      name: "Discord",
      summary:
        "Make a target distrust another creature it can see, worsening its attitude toward that creature by one step (two at 8th level) for rounds equal to your Int modifier.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Mind-affecting charm effect; the Cackle hex extends its duration. Once per target per day.",
        ),
      ],
    },
    {
      id: "disruptConnection",
      name: "Disrupt Connection",
      summary:
        "Force a summoned creature within 30 ft. to save or be confused for 1d4 rounds; on a high enough confusion roll (51+ at 8th level, 26+ at 16th) it instead acts as if you had summoned it.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. The Cackle hex extends its duration by 1 round. Once per target per 24 hours.",
        ),
      ],
    },
    {
      id: "distraction",
      name: "Distraction",
      summary:
        "Force a target within 30 ft. to make a concentration check (DC 15 + twice the spell level) or lose any spell or spell-like ability it tries to cast, for 1 round.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Duration extends by 1 round at 8th and 16th level; hexes that extend Misfortune (such as Cackle) extend this too. Once per target per day.",
        ),
      ],
    },
    {
      id: "enemyGround",
      name: "Enemy Ground",
      summary:
        "Curse a target with clumsiness in dangerous terrain: -4 (-8 at 8th level) on Acrobatics checks over slippery or uneven ground and to avoid attacks of opportunity while moving through threatened squares, for 1 minute.",
      contextNotes: [
        note(
          "Will save halves the penalty and cuts the duration to 1 round; DC = 10 + 1/2 witch level + Int mod.",
        ),
      ],
    },
    {
      id: "feralSpeech",
      name: "Feral Speech",
      summary:
        "Speak with and understand one animal type of your choice (amphibians, birds, fish, mammals, or reptiles) each time you use this hex, as speak with animals; vermin are added to the list at 12th level.",
    },
    {
      id: "floatingLotus",
      name: "Floating Lotus",
      summary:
        "Conjure a floating lotus flower for minutes/day equal to your witch level, letting you cross water as water walk and granting a +10 (+20 at 5th level, +30 at 9th) enhancement bonus on Acrobatics checks for high and long jumps.",
      contextNotes: [
        note("Minutes need not be consecutive but must be spent in 1-minute increments."),
      ],
    },
    {
      id: "giftOfConsumption",
      name: "Gift of Consumption",
      summary:
        "As an immediate action, curse a creature within 30 ft. to share a Fortitude-save effect targeting you; it saves at your DC and suffers the same effect on a failure.",
      contextNotes: [
        note(
          "Doesn't work with effects that require an additional or different kind of save. Once per target per day.",
        ),
      ],
    },
    {
      id: "greaterGiftOfConsumption",
      name: "Greater Gift of Consumption",
      summary:
        "Redirect a Fortitude-save effect entirely onto your Gift of Consumption proxy instead of sharing it, or, if you succeed at your own save, impose a -4 penalty on the proxy's save against a shared effect.",
      contextNotes: [
        note(
          "Requires the Gift of Consumption hex. A creature redirected to in this way is immune to Gift of Consumption again for 24 hours.",
        ),
      ],
    },
    {
      id: "heraldingBloom",
      name: "Heralding Bloom",
      summary:
        "Compel a plant within 30 ft. to repeat a 25-word message you choose to any intelligent creature that comes near, until 24 hours after you place the hex.",
      contextNotes: [
        note(
          "An intelligent plant target may negate with a Will save. Active blooms are limited to your witch level + Cha modifier.",
        ),
      ],
    },
    {
      id: "iceplant",
      name: "Iceplant",
      summary:
        "Gain a +2 natural armor bonus and the constant effect of endure elements, for you and your familiar; your skin turns thick and stiff to the touch.",
      changes: [{ formula: "2", target: "nac", type: "natural" }],
      contextNotes: [
        note(
          "The +2 natural armor bonus above is yours. Your familiar gets its own copy of these bonuses; add them by hand to the familiar's sheet. You also gain the constant effect of endure elements.",
          "nac",
        ),
      ],
    },
    {
      id: "leshySummoning",
      name: "Leshy Summoning",
      summary:
        "Count as a plant creature for growing leshys, and add leaf, gourd, fungus, seaweed, and lotus leshys to your summon monster I-V lists respectively.",
    },
    {
      id: "minorProphecy",
      name: "Minor Prophecy",
      summary:
        "Cast augury once per day; spending a full hour instead of the normal casting time skips the material component but drops the spell's accuracy by 5%.",
    },
    {
      id: "mothersEye",
      name: "Mother's Eye",
      summary:
        "See through plant matter, as the greensight universal monster ability, for minutes/day equal to your witch level.",
      contextNotes: [
        note("Minutes need not be consecutive but must be spent in 1-minute increments."),
      ],
    },
    {
      id: "mudWitch",
      name: "Mud Witch",
      summary:
        "Assume a mud form for minutes/day equal to your witch level: your type becomes ooze, speed drops to 10 ft. with a 20 ft. swim speed (20 ft./40 ft. at 10th level), and you gain DR 10/slashing plus cold resistance 10 — but lose spellcasting and supernatural abilities while in that form.",
      contextNotes: [
        note(
          "Requires the Swamp Hag hex. Minutes need not be consecutive but must be spent in 1-minute increments; a readied touch spell discharges harmlessly when you activate this hex.",
        ),
      ],
    },
    {
      id: "murksight",
      name: "Murksight",
      summary:
        "See through natural fog, mist, and rain without penalty (ignoring their concealment), and up to 15 ft. through magical versions of the same, including underwater in murky water.",
      contextNotes: [
        note(
          "Doesn't let you see anything you couldn't otherwise see, such as an invisible creature.",
        ),
      ],
    },
    {
      id: "nails",
      name: "Nails",
      summary:
        "Your nails grow into natural weapons dealing 1d3 damage (1d2 if Small) as a secondary attack; trimmed nails regrow within 1d4 days.",
      contextNotes: [
        note("Grants a natural claw attack. Add it by hand if you use it.", "nattack"),
      ],
    },
    {
      id: "noPlaceLikeHome",
      name: "No Place Like Home",
      summary:
        "Grant an ally within 30 ft. a +2 (+4 at 8th, +6 at 16th) dodge bonus to AC and on Reflex saves against traps, or impose the same penalty on an enemy, for 1 minute.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Save-category-scoped (traps only). Apply the bonus or penalty by hand to whichever creature you target. Once per target per day.",
        ),
      ],
    },
    {
      id: "peacebond",
      name: "Peacebond",
      summary:
        "Prevent a target from drawing a weapon (including nocking an arrow) for rounds equal to your witch level; has no effect on natural weapons or a weapon already in hand.",
      contextNotes: [
        note("Will negates; DC = 10 + 1/2 witch level + Int mod. Once per target per day."),
      ],
    },
    {
      id: "poisonSteep",
      name: "Poison Steep",
      summary:
        "Spend an hour brewing a toxin and steeping up to a pound of food or drink so that eating it poisons the eater for 24 hours.",
      contextNotes: [note("Requires the Cauldron hex.")],
    },
    {
      id: "poisonTouch",
      name: "Poison Touch",
      summary:
        "Grant yourself or an ally within 30 ft. a poisoned claw attack (1d3 damage, 1d2 if Small, as a secondary attack) for minutes equal to your witch level.",
      contextNotes: [
        note(
          "Poison: Fort DC 10 + 1/2 witch level + Int mod negates; frequency 1/round for 6 rounds; 1d2 Str damage; cure 1 save. If the target already has a claw attack, that attack gains the poison instead, at DC +1. Add the claw attack by hand. Once per creature per 24 hours.",
          "nattack",
        ),
      ],
    },
    {
      id: "polluteWater",
      name: "Pollute Water",
      summary:
        "Corrupt an area of standing water (or an aquatic/water-subtype creature) as the Blight hex; a creature that drinks from polluted water is nauseated for 1d3 rounds and afflicted with Blight's curse unless it saves.",
      contextNotes: [
        note(
          "Fort save negates; DC = 10 + 1/2 witch level + Int mod. A successful save grants 24-hour immunity to that polluted source.",
        ),
      ],
    },
    {
      id: "pollutingGlance",
      name: "Polluting Glance",
      summary:
        "Turn a nonmagical liquid item within 30 ft. into polluted water, as the Pollute Water hex.",
      contextNotes: [
        note(
          "Requires the Pollute Water hex. Active glances are limited to your Int bonus (minimum 1).",
        ),
      ],
    },
    {
      id: "prehensileHair",
      name: "Prehensile Hair",
      summary:
        "Extend your hair (or eyebrows) into a 10-ft.-reach limb with Strength equal to your Intelligence, usable as a secondary natural attack (1d3, 1d2 if Small) or to manipulate objects, for minutes/day equal to your witch level.",
      contextNotes: [
        note(
          "Add this natural attack by hand if you use it. Minutes need not be consecutive but must be spent in 1-minute increments.",
          "nattack",
        ),
      ],
    },
    {
      id: "protectiveLuck",
      name: "Protective Luck",
      summary:
        "Force anyone targeting an ally within 30 ft. with an attack roll to roll twice and take the worse result, for 1 round (extended by hexes that extend Fortune, such as Cackle, and by 1 round at 8th/16th level).",
      contextNotes: [note("Can't target yourself.")],
    },
    {
      id: "scar",
      name: "Scar",
      summary:
        "Mark a touched target with a persistent, curse-linked scar, letting you use your hexes on it at up to 1 mile and treat it as a body part for scrying and similar divinations.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Simultaneous scars are limited to your Int bonus; removable by remove curse or your own move-action withdrawal.",
        ),
      ],
    },
    {
      id: "seduction",
      name: "Seduction",
      summary:
        "Fascinate one creature within 60 ft. that can see you for 1 round, extendable a round at a time (up to your class level) by continuing a standard action; the DC rises by 2 if the target could be attracted to you.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Mind-affecting charm effect; at 8th level fascination lingers 2 extra rounds after you stop maintaining it. Once per target per day.",
        ),
      ],
    },
    {
      id: "sink",
      name: "Sink",
      summary:
        "Impose a -4 penalty on Swim checks and cut a target's swim speed by 10 ft. for 1 minute (1 round on a successful save) while it's in water.",
      contextNotes: [
        note(
          "Fort save reduces duration to 1 round; DC = 10 + 1/2 witch level + Int mod. The Cackle hex extends its duration; doesn't stack with itself.",
        ),
      ],
    },
    {
      id: "soothsayer",
      name: "Soothsayer",
      summary:
        "Delay the effect of your Evil Eye, Fortune, Misfortune, or Retribution hex until the target's next relevant roll or triggering action, instead of applying it immediately.",
      contextNotes: [note("Wasted if not triggered within 24 hours.")],
    },
    {
      id: "summersHeat",
      name: "Summer's Heat",
      summary:
        "Deal nonlethal damage equal to your witch level to a target and fatigue it, unless a Fortitude save halves the damage and negates the fatigue.",
      contextNotes: [note("DC = 10 + 1/2 witch level + Int mod. Once per target per day.")],
    },
    {
      id: "swampHag",
      name: "Swamp Hag",
      summary:
        "Leave no trail and can't be tracked in swamps, mires, bogs, and similar terrain (as trackless step), and can walk across mud or quicksand as if it were solid ground.",
    },
    {
      id: "swampsGrasp",
      name: "Swamp's Grasp",
      summary:
        "Turn up to one 10-ft. square per witch level within 90 ft. into difficult terrain, for 3 + your Int modifier rounds.",
      contextNotes: [
        note(
          "Using this hex again before the previous use's duration ends ends that earlier effect immediately.",
        ),
      ],
    },
    {
      id: "swine",
      name: "Swine",
      summary:
        "Partially transform an enemy into a pig: it takes a -2 penalty on Will saves for rounds equal to your Int modifier; at 8th level its hands (or paws) also become hooves, blocking claw attacks and finger-dependent actions.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "unnerveBeasts",
      name: "Unnerve Beasts",
      summary:
        "Make a target repellent to animals for hours equal to your Int modifier — nearby animals grow distraught and aggressive toward it.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. A successful save grants 24-hour immunity. The animals' reaction is mind-affecting; the hex itself is not.",
        ),
      ],
    },
    {
      id: "verdantFamiliar",
      name: "Verdant Familiar",
      summary: "Your familiar's creature type changes to plant, gaining all plant traits.",
      contextNotes: [note("Affects your familiar's sheet, not your own.")],
    },
    {
      id: "waterLung",
      name: "Water Lung",
      summary:
        "Let an air-breathing target breathe water, or an aquatic target breathe air, for 1 minute — used on yourself, the effect persists through sleep.",
    },
    {
      id: "witchsBottle",
      name: "Witch's Bottle",
      summary:
        "Once per day, spend a 10-minute ritual to brew a potion that delivers one of your other hexes (any that can target someone other than you) to whoever drinks it.",
      contextNotes: [
        note(
          "Requires the Cauldron hex. You can't use the bottled hex again until the potion is consumed or rendered inert.",
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

    // ---- splatbook additions (full vendored parity) ----
    {
      id: "animalSkin",
      name: "Animal Skin",
      summary:
        "Take on the appearance and general form of a specific Tiny to Large animal whose skin you wear, as beast shape II.",
    },
    {
      id: "beastEye",
      name: "Beast Eye",
      summary:
        "Project your senses into an animal within 100 ft. (sensing but not controlling it), then leap those senses onward to another animal within 100 ft. of the first, for minutes/day equal to your witch level.",
      contextNotes: [
        note(
          "Normal animals get no save; animal companions, paladin mounts, and similar unusual animals may resist with Will. DC = 10 + 1/2 witch level + Int mod.",
        ),
      ],
    },
    {
      id: "beastsGift",
      name: "Beast's Gift",
      summary:
        "Grant a willing ally natural attacks for minutes equal to your witch level: either one bite (1d8) plus one secondary attack of your choice (1d6), or two claws (1d4 each).",
      contextNotes: [note("Apply these natural attacks by hand to the ally's sheet while active.")],
    },
    {
      id: "cookPeople",
      name: "Cook People",
      summary:
        "Cook an intelligent humanoid (living or dead) in your cauldron over 1 hour to create food that, when eaten, grants one of a list of buff-spell effects (or removes disease/poison) for 1 hour; alternatively shape the leftover dough into a homunculus for 1 hour.",
      contextNotes: [
        note(
          "Requires the Cauldron hex to select. Using this hex, or knowingly eating its food, is an evil act.",
        ),
      ],
    },
    {
      id: "deliciousFright",
      name: "Delicious Fright",
      summary:
        "Shake a target for 3 + your Intelligence modifier rounds; while you stay within 30 ft. of a target still shaken by this hex, you gain a +1 morale bonus on attack rolls and a +1 morale bonus on saves.",
      contextNotes: [
        note(
          "Will save reduces the duration to 1 round; DC = 10 + 1/2 witch level + Int mod. Mind-affecting fear effect.",
        ),
      ],
    },
    {
      id: "drugged",
      name: "Drugged",
      summary:
        "When you craft a poison, you can require its save to be Will instead of the normal Fortitude; once chosen, this can't be undone without remaking the poison.",
      contextNotes: [note("Applies only to poisons you personally craft.")],
    },
    {
      id: "falseHospitality",
      name: "False Hospitality",
      summary:
        "Once per day, gain the benefits of glibness, with caster level equal to your witch level.",
    },
    {
      id: "harrowingCurse",
      name: "Harrowing Curse",
      summary:
        "Touch a target with a card drawn from a harrow deck you own to curse it as bestow curse (your caster level), but limited to only the ability-score-penalty option matching the drawn card's suit; becomes major curse at 15th level.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "hiddenHome",
      name: "Hidden Home",
      summary:
        "After spending 1 day marking out a roughly 200-ft.-by-200-ft. home territory, change that area's appearance at will (as mirage arcana) while standing in it; the illusion persists until you change or dismiss it.",
      contextNotes: [note("Only one home territory active at a time.")],
    },
    {
      id: "hoarfrost",
      name: "Hoarfrost",
      summary:
        "Rime a target in frost needles that deal 1 point of Constitution damage per minute until it dies, saves, or is cured; a successful save grants 1 day of immunity. Cold effect.",
      contextNotes: [
        note("Fortitude negates (checked each minute); DC = 10 + 1/2 witch level + Int mod."),
      ],
    },
    {
      id: "iceTomb",
      name: "Ice Tomb",
      summary:
        "Envelop a target in ice and freezing wind for 3d8 cold damage (Fort half); on a failed save it's also paralyzed and encased (needing neither food nor air) until the ice — 20 hp — is destroyed, leaving it staggered for 1d4 rounds.",
      contextNotes: [
        note(
          "Fort save for half damage/negates paralysis; DC = 10 + 1/2 witch level + Int mod. Same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "infectedWounds",
      name: "Infected Wounds",
      summary:
        "Infect a target's wounds, dealing 1 point of Constitution damage per day; starting the second day, it may save once per day to cure the infection. Disease effect.",
      contextNotes: [note("Fortitude negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "majorAmeliorating",
      name: "Major Ameliorating",
      summary:
        "Touch a creature to suppress the blinded or deafened condition (or a curse/disease/poison effect) for minutes equal to your witch level if it's currently or later afflicted, or instead grant a +4 circumstance bonus on saves against two chosen conditions/effects for 24 hours; at 15th level, cover two conditions to suppress or three to grant the bonus against.",
      contextNotes: [note("Same target can't benefit again for 24 hours.")],
    },
    {
      id: "pariah",
      name: "Pariah",
      summary:
        "Make a target within 60 ft. shunned for rounds equal to your Intelligence modifier: any other creature attempting to aid it (a harmless spell or aid another action) must save or waste that action and be unable to aid the target again for the duration.",
      contextNotes: [
        note(
          "Will save (by the would-be helper, not the target) negates; DC = 10 + 1/2 witch level + Int mod. Doesn't block area-effect benefits.",
        ),
      ],
    },
    {
      id: "prophecy",
      name: "Prophecy",
      summary:
        "Cast divination once per day, spending a full hour in place of the usual material component.",
    },
    {
      id: "regenerativeSinew",
      name: "Regenerative Sinew",
      summary:
        "Touch a creature to grant fast healing 5 for rounds equal to half your witch level, or instead heal up to 4 points of damage from two ability scores of your choice; at 15th level, also regrows lost body parts as regenerate.",
      contextNotes: [note("Same target can't benefit again for 24 hours.")],
    },
    {
      id: "restlessSlumber",
      name: "Restless Slumber",
      summary:
        "As the slumber hex, but the sleeper also thrashes for 1d10 damage to itself each turn (not enough to wake it) and wakes confused for rounds equal to half your witch level.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Requires the Slumber hex to select.",
        ),
      ],
    },
    {
      id: "speakInDreams",
      name: "Speak in Dreams",
      summary:
        "Contact a creature as dream, for a number of creatures per day equal to your Intelligence bonus (each contacted creature can be dream-spoken to as often as you like during that period).",
    },
    {
      id: "stealVoice",
      name: "Steal Voice",
      summary:
        "Steal a target's voice for rounds equal to your Intelligence bonus (hours, if willing), silencing every ability that needs speech — talking, verbal spellcasting, auditory bardic performance; while a stolen voice is held, you can mimic it as vocal alteration.",
      contextNotes: [
        note(
          "Will negates (unwilling targets); DC = 10 + 1/2 witch level + Int mod. Tiefling witches only.",
        ),
      ],
    },
    {
      id: "witchsBounty",
      name: "Witch's Bounty",
      summary:
        "Bless a planted bush, plant, or tree so it grows goodberries equal to twice your witch level every dawn (never holding more than that many uncollected at once); moving the blessing to a new plant takes a 1-hour ritual.",
      contextNotes: [note("Only one Witch's Bounty active at a time.")],
    },
    {
      id: "witchsBrew",
      name: "Witch's Brew",
      summary:
        "When brewing a potion with your cauldron, spend double the cost to brew 2 identical potions that day instead of 1 (triple the cost for 3 at 15th level).",
      contextNotes: [note("Requires the Cauldron hex to select.")],
    },
    {
      id: "witchsCharge",
      name: "Witch's Charge",
      summary:
        "Once per day when preparing spells, designate a willing creature as your charge: you gain a constant status on them and can target them with beneficial touch spells from 30 ft.; the designation lasts until you name a new charge.",
      contextNotes: [note("Targets a willing ally you designate, not yourself.")],
    },
    {
      id: "withering",
      name: "Withering",
      summary:
        "Age a target within 30 ft. one age category (Fort negates; can never be aged past venerable). You gain 1d10 + your witch level temporary hit points and a +2 enhancement bonus to Strength, Dexterity, or Constitution (your choice), lasting hours equal to your witch level.",
      contextNotes: [
        note(
          "Fortitude negates; DC = 10 + 1/2 witch level + Int mod. A creature that saves against Withering can't be affected by it again. Apply the temporary hit points and ability bonus by hand once the hex lands on a target.",
        ),
      ],
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

    // ---- splatbook additions (full vendored parity) ----
    {
      id: "abominate",
      name: "Abominate",
      summary:
        "Transform a target within 30 ft. into a Small, Medium, or Large aberration, as baleful polymorph, with its ability scores set as monstrous physique IV.",
      contextNotes: [
        note(
          "Fortitude negates (as baleful polymorph); DC = 10 + 1/2 witch level + Int mod. Same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "animalServant",
      name: "Animal Servant",
      summary:
        "Transform a humanoid enemy into an animal and dominate it — as beast shape II plus a dominate monster effect (no further saves) lasting until removed by wish/miracle or your death; the target keeps its Intelligence score and languages but you control its mind.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "curseOfNonviolence",
      name: "Curse of Nonviolence",
      summary:
        "Curse a target so it can't take violent or destructive action against any creature with fewer Hit Dice than itself (unless that creature attacks it first); permanent until removed by break enchantment, miracle, or wish.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Abjuration effect; same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "deathInterrupted",
      name: "Death Interrupted",
      summary:
        "While adjacent to a freshly or long-dead creature (with some remains left and a free, willing soul) and to your familiar, pull that soul into your familiar as familiar melding; while housed there (up to 1 hour/class level), you can talk to it telepathically and, as a standard action within 300 ft., return it to life with 5d8 + 1 hp per caster level.",
      contextNotes: [
        note(
          "Same target can't benefit again for 24 hours. If the housed soul's time runs out, or you attempt the return from out of range, the creature stays dead.",
        ),
      ],
    },
    {
      id: "direProphecy",
      name: "Dire Prophecy",
      summary:
        "Curse a target as doomed to die: while the curse lasts it takes a -4 penalty to AC and on attacks, saves, and ability/skill checks; you can instead end the curse early to unleash it all at once as a penalty equal to your caster level to a single AC, attack, combat maneuver, opposed check, or save of your choosing, applied before that roll.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Only one dire prophecy can be on a target at a time; can't be retargeted within 24 hours. Curse effect.",
        ),
      ],
    },
    {
      id: "layToRest",
      name: "Lay to Rest",
      summary: "Target a single undead creature as undeath to death.",
      contextNotes: [
        note(
          "Will negates; DC = 10 + 1/2 witch level + Int mod. Same target can't be retargeted within 24 hours.",
        ),
      ],
    },
    {
      id: "summonSpirit",
      name: "Summon Spirit",
      summary:
        "Call the ghost of a humanoid (18 HD or less) to bargain with you, as greater planar ally; sealing the deal costs you 1 temporary negative level in addition to the ghost's usual payment.",
      contextNotes: [
        note(
          "The negative level persists for as long as the ghost serves; ending the agreement (a standard action) removes it.",
        ),
      ],
    },
    {
      id: "witchsHut",
      name: "Witch's Hut",
      summary:
        'Animate a hut, small house, wagon, or tent (up to Huge) as an animated object with doubled hit points and hardness 8, commandable to guard (watches and screams at trespassers within 120 ft. using your Perception), hide (illusory wall + arcane lock at entrances), or move (speed 60, even by relative directions like "follow me from 100 feet away"); lasts 24 hours or until dismissed or replaced.',
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

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.hexes` (see that type's doc comment) is the FULL published
 * witch-hex catalog (~104 entries after junk filtering), prose only. The
 * hand-verified table above stays authoritative for MECHANICS — this section
 * only merges the two for BROWSING (the picker) and for resolving a picked id
 * back to a definition (`collect.ts`/ `archetypes.ts`), mirroring
 * `rage-powers.ts`'s `mergedRagePowerCatalog` exactly.
 *
 * Matching is by NORMALIZED NAME, never id — same rationale as rage powers:
 * this file's camelCase ids vs. the vendored dataset's snake_case slugs are
 * disjoint by construction.
 *
 * Collision audit (all 104 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name, with NO
 * naming drift — the source's own spelling matched ours exactly
 * (case-insensitively) for every entry, so `HEX_NAME_ALIASES` is empty (kept
 * for the same reason `rage-powers.ts`'s alias map is: a FUTURE
 * hand-authored addition that drifts from the vendored spelling has
 * somewhere to record it). No vendored-catalog-internal name collisions
 * either (unlike rage powers' Guarded Stance/Stance-variant case) — every one
 * of the 104 vendored hexes has a unique normalized name.
 *
 * Tier: every matched hex's vendored `tier` field agrees with this table's
 * own `tier` for that entry (8 of the 27 are `major`, 5 are `grand`, the rest
 * `hex`) — verified during the audit, not merely assumed.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const HEX_NAME_ALIASES: Record<string, string> = {};

function normalizeHexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row (the hand-authored table's `summary` field is a curated paraphrase this app doesn't have for vendored-only prose). */
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

/** A catalog entry the picker can browse — either the hand-authored def (matched) with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedWitchHexEntry extends WitchHexDef {
  /** Ability-type suffix as published, e.g. "(Su)" — undefined when no vendored counterpart backs this id. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredHexToDef(entry: WitchHex): MergedWitchHexEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    tier: entry.tier,
    // A regular hex is available from 1st level; major/grand hexes are
    // available once a witch reaches the level that tier unlocks — same
    // 1/10/18 mapping the hand-authored table uses (APG RAW, not a fabricated
    // gate — this source carries no per-entry level field at all).
    minLevel: entry.tier === "major" ? 10 : entry.tier === "grand" ? 18 : 1,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked witch-hex id (`doc.build.witchHexes` entries) to its
 * definition — hand-authored table first (mechanics-authoritative), falling
 * back to the vendored catalog for an id that only exists there. Used by
 * `collect.ts` (modifier collection) and `archetypes.ts` (the Class Features
 * list) instead of indexing `WITCH_HEXES` directly, so a vendored-only pick
 * resolves to a real (display-only) definition rather than being silently
 * dropped.
 */
export function resolveWitchHex(id: string, refData: RefData): WitchHexDef | undefined {
  const hand = WITCH_HEXES[id];
  if (hand) return hand;
  const vendored = refData.hexes?.[id];
  return vendored ? vendoredHexToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and tier, but carrying
 * the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today —
 * see the collision-audit comment above; the fallback exists for a future
 * addition). `!entry.displayOnly` would mark a live-mechanics row for the
 * picker's "M" badge, same convention as `mergedRagePowerCatalog` — every hex
 * here is `displayOnly` today (see the file's top doc comment), so the badge
 * never actually appears yet.
 */
export function mergedWitchHexCatalog(refData: RefData): MergedWitchHexEntry[] {
  const handByNormName = new Map<string, WitchHexDef>();
  for (const h of HEX_LIST) {
    handByNormName.set(normalizeHexName(HEX_NAME_ALIASES[h.id] ?? h.name), h);
  }

  const usedHandIds = new Set<string>();
  const merged: MergedWitchHexEntry[] = [];
  for (const v of Object.values(refData.hexes ?? {})) {
    const handMatch = handByNormName.get(normalizeHexName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredHexToDef(v));
    }
  }
  for (const h of HEX_LIST) {
    if (!usedHandIds.has(h.id)) merged.push(h);
  }
  return merged;
}

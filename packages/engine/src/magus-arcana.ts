/**
 * Clean-room PF1 magus arcana table (DESIGN §6): hand-authored from the
 * published Ultimate Magic rules (verified against public SRD text/AoN), same
 * posture as `arcanist-exploits.ts` — magus arcana are NOT part of the
 * vendored Foundry data pack (only the class's own spellcasting/BAB/Arcane
 * Pool `uses.maxFormula` class feature is vendored, plus a single generic
 * "Magus Arcana" stub `ClassFeature` with no per-arcana breakdown), so there
 * is no upstream JSON to normalize.
 *
 * Scope: FULL vendored parity as of the Phase 5 extension — all 64 vendored
 * arcana: the 20 base Ultimate Magic ones plus every later-book addition the
 * pinned data carries (Ultimate Combat's Enduring Blade and Arcane
 * Redoubt/Bane Blade — vendored `sources` attribute those two to UC p. 54,
 * correcting this comment's former Weapon Master's Handbook claim — plus Magic
 * Tactics Toolbox, Heroes of Golarion, race-restricted arcana, and the rest).
 *
 * Level gating (PF1 RAW: "starting at 3rd level, a magus gains an arcana...
 * at 3rd level and every 3 levels thereafter"): `minLevel` is the earliest
 * magus level at which an arcana can be selected — 3 for every arcana with
 * no additional stated prerequisite (the earliest any arcana can be picked
 * at all), or the arcana's own higher stated minimum (6th/9th/12th/15th) for
 * the handful UM restricts further. Unlike a hard block, this is SOFT
 * availability filtering — the picker greys out/annotates an arcana below
 * its `minLevel` but never removes the Add button, matching the project's
 * hybrid-prereqs philosophy (`model/traits.ts`/`model/feats.ts`: hard-block
 * only on structured ability/BAB/CL signals, soft-warn everything else).
 *
 * Modelling posture (mirrors arcanist-exploits.ts): every base arcana here
 * is either a SWIFT/IMMEDIATE-action ability that costs 1+ points from the
 * magus's Arcane Pool (already a real, vendored resource pool — see
 * `resources.ts`'s `deriveResourcePools`, which reads the class feature's
 * own `uses.maxFormula`) for a situational effect, a once-per-day
 * metamagic-flavored spell modifier, or a passive mechanic substitution with
 * no Change-shaped sheet target (e.g. "use Intelligence instead of the
 * wand's minimum caster level for its save DC" has no `wandDc` stat this
 * engine tracks). None grants a flat, unconditional, always-on numeric bonus
 * — so EVERY entry here is `displayOnly: true` with `changes: []` plus a
 * `contextNotes` reminder describing the cost/effect, never an over-applied
 * flat number.
 *   - `familiar` carries NO changes of its own, same posture as the
 *     arcanist's identically-named exploit — a tracked familiar's stat block
 *     is already fully modeled via `CharacterDoc.build.familiar` (see
 *     `familiar.ts`/`familiars.ts`); do not wire this entry's id into
 *     `collectModifiers`. The picker's summary points the player at the
 *     Familiar section of the builder instead.
 *   - `maneuverMastery` and `spellBlending` each require an additional
 *     player pick (which combat maneuver; which wizard spell(s) to add) that
 *     this table does not model as a nested choice — same "note it, don't
 *     invent new machinery" posture `arcanist-exploits.ts` takes for
 *     Bloodline/School Development.
 */

import type { Change, ContextNote, MagusArcana, RefData, SourceRef } from "@pf1/schema";

export interface MagusArcanaDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest magus level this arcana can be selected at — 3 (the earliest any
   * arcana is available) unless UM states a higher minimum. Soft-filtered
   * only (see file doc comment); never blocks selection.
   */
  minLevel: number;
  /** Typed modifiers granted by the arcana (empty for every base arcana — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (arcane pool cost, activation type, scaling formula, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no base arcana has a flat always-on numeric effect. */
  displayOnly: true;
  /**
   * Optional pool-spend toggle for this arcana — surfaced on the Arcane Pool
   * resource row (`arcane-spends.ts`'s `arcanePoolToggleOptions`) the same
   * way `bardic-performances.ts`'s table surfaces performance types. Absent
   * for every entry until a later content wave populates it.
   */
  spendToggle?: { name?: string; changes: Change[]; contextNotes?: ContextNote[] };
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

const ARCANA_LIST: MagusArcanaDef[] = [
  {
    id: "arcaneAccuracy",
    name: "Arcane Accuracy",
    summary:
      "Swift action, 1 arcane pool point: gain an insight bonus equal to your Intelligence modifier on all attack rolls until the end of your turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Costs 1 arcane pool point per use; apply the insight bonus manually.")],
    displayOnly: true,
  },
  {
    id: "broadStudy",
    name: "Broad Study",
    summary:
      "If you have levels in another arcane spellcasting class, you may use spell combat and spellstrike with spells from that class's list too.",
    minLevel: 6,
    changes: [],
    contextNotes: [note("Multiclass-only option — no numeric sheet effect to model.")],
    displayOnly: true,
  },
  {
    id: "closeRange",
    name: "Close Range",
    summary: "Deliver ray spells as melee touch attacks through spellstrike.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Delivery-method option only — no numeric sheet effect to model.")],
    displayOnly: true,
  },
  {
    id: "concentrate",
    name: "Concentrate",
    summary: "Once per day, reroll a failed concentration check with a +4 bonus on the reroll.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Situational reroll — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "criticalStrike",
    name: "Critical Strike",
    summary:
      "Once per day, after confirming a critical hit, cast a touch spell as a swift action and deliver it with a free touch attack.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Situational free action — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "dispellingStrike",
    name: "Dispelling Strike",
    summary:
      "1 arcane pool point: imbue your weapon so its next successful hit within 1 minute triggers a targeted dispel magic against the struck creature.",
    minLevel: 9,
    changes: [],
    contextNotes: [note("Costs 1 arcane pool point per use; roll the dispel check manually.")],
    displayOnly: true,
  },
  {
    id: "empoweredMagic",
    name: "Empowered Magic",
    summary:
      "Once per day, cast a spell as if affected by the Empower Spell feat, at no level increase.",
    minLevel: 6,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "familiar",
    name: "Familiar",
    summary:
      "Gain a familiar, as the wizard's arcane bond class feature, using magus level as effective wizard level.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Reminder: set up your familiar in the Familiar section of the Classes panel — this toggle is informational.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "hastedAssault",
    name: "Hasted Assault",
    summary:
      "1 arcane pool point: gain the effects of haste for a number of rounds equal to your Intelligence bonus (yourself only).",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Temporary, self-only haste — not a permanent Change; apply manually while active.",
        "speed.land",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "maneuverMastery",
    name: "Maneuver Mastery",
    summary:
      "Choose one type of combat maneuver; use your magus level in place of your base attack bonus when calculating your CMB for it. Can be selected more than once for different maneuvers.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Which combat maneuver you chose is a separate pick — record it in a note.", "cmb"),
    ],
    displayOnly: true,
  },
  {
    id: "maximizedMagic",
    name: "Maximized Magic",
    summary:
      "Once per day, cast a spell as if affected by the Maximize Spell feat, at no level increase.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "poolStrike",
    name: "Pool Strike",
    summary:
      "Standard action, 1 arcane pool point: melee touch attack dealing 2d6 damage of a chosen energy type, +1d6 per three magus levels beyond 1st.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; roll the scaling touch-attack damage manually."),
    ],
    displayOnly: true,
  },
  {
    id: "quickenedMagic",
    name: "Quickened Magic",
    summary:
      "Once per day, cast a spell as if affected by the Quicken Spell feat, at no level increase.",
    minLevel: 15,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "reflection",
    name: "Reflection",
    summary:
      "Spend arcane pool points to attempt to turn a targeted spell back on its caster (as spell turning), or gain an insight bonus on the save instead.",
    minLevel: 15,
    changes: [],
    contextNotes: [note("Situational reaction — not tracked as a discrete sheet stat.")],
    displayOnly: true,
  },
  {
    id: "silentMagic",
    name: "Silent Magic",
    summary:
      "Once per day, cast a spell as if affected by the Silent Spell feat, at no level increase.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "spellBlending",
    name: "Spell Blending",
    summary:
      "Add one wizard spell (or two of half your highest magus spell level or lower) to your magus spell list and spellbook. Can be selected more than once.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Which wizard spell(s) you add is a separate choice — record them in the Spells section.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "spellShield",
    name: "Spell Shield",
    summary:
      "Immediate action, 1 arcane pool point: gain a shield bonus to AC equal to your Intelligence modifier until the start of your next turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Temporary shield bonus while active — not a permanent Change; apply manually.", "ac"),
    ],
    displayOnly: true,
  },
  {
    id: "stillMagic",
    name: "Still Magic",
    summary:
      "Once per day, cast a spell as if affected by the Still Spell feat, at no level increase.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "wandMastery",
    name: "Wand Mastery",
    summary:
      "Use your Intelligence modifier, if higher, instead of the wand's default modifier when calculating the save DC of a spell cast from a wand.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Mechanic substitution only — no dedicated wand-DC sheet stat to modify.")],
    displayOnly: true,
  },
  {
    id: "wandWielder",
    name: "Wand Wielder",
    summary: "Activate a wand or staff in place of casting a spell during spell combat.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Action-economy option only — no numeric effect to model.")],
    displayOnly: true,
  },
  // ---- splatbook additions (full vendored parity) ----
  {
    id: "accurateStrike",
    name: "Accurate Strike",
    summary:
      "Swift action, 2 arcane pool points: resolve all melee weapon attacks as melee touch attacks until the end of your turn.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note("Costs 2 arcane pool points per use; apply the touch-AC targeting manually.", "mattack"),
    ],
    displayOnly: true,
  },
  {
    id: "aquaticAgility",
    name: "Aquatic Agility",
    summary:
      "Immediate action, 1 arcane pool point: gain water breathing for 1 round per level and ignore the penalties of rough water and underwater combat.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; temporary effect — apply manually while active.",
        "swimSpeed",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneCloak",
    name: "Arcane Cloak",
    summary:
      "1 arcane pool point: add your Intelligence bonus to Stealth checks, and to Bluff checks made to create a diversion to hide, for 1 minute.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; scoped to two specific skills — apply the bonus manually.",
        "skills",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneDealer",
    name: "Arcane Dealer",
    summary:
      "Gain Deadly Dealer as a bonus feat even without meeting its prerequisites, and spend arcane pool points to grant your harrow/card deck an enhancement bonus as a ranged weapon.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Grants Deadly Dealer as a bonus feat — add it to doc.build.feats separately; this table doesn't auto-grant it.",
        "bonusFeats",
      ),
      note("Card-deck enhancement draws from the same arcane pool as weapon enhancement."),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneDeed",
    name: "Arcane Deed",
    summary:
      "Choose one swashbuckler deed you qualify for by magus level; spend arcane pool points as the panache cost to use it. Can be taken multiple times for different deeds.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Requires the flamboyant arcana; effective swashbuckler level for the deed's own scaling is treated as 0.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneEdge",
    name: "Arcane Edge",
    summary:
      "Immediate action, 1 arcane pool point, after hitting with a slashing or piercing weapon: inflict bleed damage equal to your Intelligence modifier (minimum 0).",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; roll the bleed damage manually.", "damage"),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneRedoubt",
    name: "Arcane Redoubt",
    summary:
      "Swift action, 1 arcane pool point: treat your shield bonus to AC (including any enhancement bonus) as a bonus to touch AC until the start of your next turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; temporary touch-AC conversion — apply manually while active.",
        "ac",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "arcaneScent",
    name: "Arcane Scent",
    summary:
      "1 arcane pool point: gain the scent special quality (spellcasters only) for 1 hour per level, plus a once-per-creature-per-day Spellcraft check to gauge a detected creature's highest spell level.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; situational detection ability — not a discrete sheet stat.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "arcingPoolStrike",
    name: "Arcing Pool Strike",
    summary:
      "When making a pool strike that hits, spend 1 additional arcane pool point to also hit a number of enemies within 15 ft. equal to your Intelligence modifier (minimum 0) with the same energy damage.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Requires the pool strike arcana; costs 1 additional arcane pool point.")],
    displayOnly: true,
  },
  {
    id: "baneBlade",
    name: "Bane Blade",
    summary:
      "Whenever you enhance your weapon with your arcane pool, spend 1 additional point to add the bane special ability.",
    minLevel: 15,
    changes: [],
    contextNotes: [
      note("Costs 1 additional arcane pool point on top of the weapon enhancement itself."),
    ],
    displayOnly: true,
  },
  {
    id: "bookBound",
    name: "Book-Bound",
    summary:
      "While wielding your spellbook in your off hand, take an immediate action 3/day to gain a +4 bonus on a concentration check attempted within the next round (stacks with the concentrate arcana).",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Usable 3/day; requires wielding your spellbook in your off hand.")],
    displayOnly: true,
  },
  {
    id: "circleOfOrder",
    name: "Circle of Order",
    summary:
      "Swift action, 1 arcane pool point: gain a dodge bonus to AC equal to half your magus level (max +10) against chaotic-aligned attacks and effects until the start of your next turn.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; bonus applies only against chaotic-aligned attacks/effects — apply manually.",
        "ac",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "clingingPoolStrike",
    name: "Clinging Pool Strike",
    summary:
      "When making a pool strike, spend 1 additional arcane pool point so the target also takes half the strike's energy damage again at the start of its next turn.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Requires the pool strike arcana; costs 1 additional arcane pool point and stacks with its other modifiers.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "darkShifter",
    name: "Dark Shifter",
    summary:
      "Move action, 1 arcane pool point: relocate the target of an ongoing darkness-descriptor spell effect within its original range (caster level check required if you didn't create the effect).",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; situational battlefield-control ability, not a discrete sheet stat.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "devotedBlade",
    name: "Devoted Blade",
    summary:
      "Whenever you enhance your weapon with your arcane pool, spend 1 additional point to add anarchic, axiomatic, holy, or unholy — limited to the option matching your own alignment.",
    minLevel: 12,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 additional arcane pool point on top of the weapon enhancement itself; alignment-restricted to your own.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "disruptive",
    name: "Disruptive",
    summary: "Gain Disruptive as a bonus feat.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Grants Disruptive as a bonus feat (prerequisites already satisfied) — add it to doc.build.feats separately; this table doesn't auto-grant it.",
        "bonusFeats",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "distantSpellstrike",
    name: "Distant Spellstrike",
    summary:
      "Spells delivered through a ranged weapon attack via spellstrike use the weapon's maximum range instead of the spell's own range, if greater.",
    minLevel: 12,
    changes: [],
    contextNotes: [
      note(
        "Requires ranged spellstrike (Eldritch Archer/Myrmidarch archetype); range-extension only, no numeric sheet effect.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "divinatoryStrike",
    name: "Divinatory Strike",
    summary:
      "On a melee critical hit, automatically gain the result of a natural-20 Knowledge check to identify the struck creature (your normal bonuses still apply).",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Situational, once per critical hit — not tracked as a discrete sheet stat."),
    ],
    displayOnly: true,
  },
  {
    id: "enduringBlade",
    name: "Enduring Blade",
    summary:
      "Whenever you enchant your weapon with your arcane pool, spend 1 additional point to extend the enchantment's duration to 1 minute per magus level.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note("Costs 1 additional arcane pool point on top of the weapon enhancement itself."),
    ],
    displayOnly: true,
  },
  {
    id: "flamboyantArcana",
    name: "Flamboyant Arcana",
    summary:
      "Gain the derring-do and opportune parry and riposte swashbuckler deeds, usable only by spending arcane pool points (never panache points, and this arcana grants no panache pool of its own).",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Prerequisite for the arcane deed arcana; deeds gained this way draw only from your arcane pool.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "ghostBlade",
    name: "Ghost Blade",
    summary:
      "Whenever you enchant your weapon with your arcane pool, spend 1 additional point to add the brilliant energy and ghost touch special abilities to the available options.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note("Costs 1 additional arcane pool point on top of the weapon enhancement itself."),
    ],
    displayOnly: true,
  },
  {
    id: "greaterArcaneRedoubt",
    name: "Greater Arcane Redoubt",
    summary:
      "When using arcane redoubt, spend 1 additional arcane pool point to also apply your shield bonus to AC on Reflex saves; when targeted by a Reflex-save effect while active, spend 2 points for evasion or 4 for improved evasion.",
    minLevel: 12,
    changes: [],
    contextNotes: [
      note(
        "Requires the arcane redoubt arcana; each option layers an additional arcane pool point cost.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "intuitiveProtection",
    name: "Intuitive Protection",
    summary:
      "Immediate action, 1 arcane pool point, after identifying an opponent's conjuration (summoning) spell with Spellcraft: cast protection from chaos/evil/good/law on yourself (magic circle instead at 7th level) for a number of rounds equal to your magus level.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; requires identifying the triggering spell first."),
    ],
    displayOnly: true,
  },
  {
    id: "kiArcana",
    name: "Ki Arcana",
    summary: "Spend arcane pool points and ki points from another class's ki pool interchangeably.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Requires levels in a class with its own ki pool; pools become fungible, not a numeric change.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "lingeringPain",
    name: "Lingering Pain",
    summary:
      "Immediate action, 1 arcane pool point, after hitting with a weapon attack: that attack's damage (including a spellstrike spell's damage) counts as continuous damage for the target's concentration checks until the start of your next turn.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; affects the target's own concentration checks, not yours.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "naturalSpellCombat",
    name: "Natural Spell Combat",
    summary:
      "Use spell combat with a chosen natural attack instead of a weapon, gaining a +2 bonus on concentration checks (doesn't stack if selected again for another natural attack).",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Can be selected multiple times, once per natural attack type; the +2 concentration bonus doesn't stack across picks.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "planarHunter",
    name: "Planar Hunter",
    summary:
      "Whenever you enhance your weapon with your arcane pool, spend 1 additional point to add the planar special ability, or 2 additional points for phase locking.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note("Costs additional arcane pool points on top of the weapon enhancement itself."),
    ],
    displayOnly: true,
  },
  {
    id: "poolRay",
    name: "Pool Ray",
    summary:
      "Standard action, 1 arcane pool point: infuse a ranged weapon so your next attack with it can release a charge for 1d6 energy damage (acid/cold/electricity/fire, chosen on activation), scaling by 1d6 every 3 levels from 6th; a miss wastes the charge.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; roll the scaling energy damage manually.", "damage"),
    ],
    displayOnly: true,
  },
  {
    id: "prescientAttack",
    name: "Prescient Attack",
    summary:
      "Immediate action, 1 arcane pool point, after hitting with a weapon attack: the target loses its Dexterity bonus to AC against your attacks until the end of your next turn.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note("Costs 1 arcane pool point per use; apply the denied-Dex effect manually."),
    ],
    displayOnly: true,
  },
  {
    id: "prescientDefense",
    name: "Prescient Defense",
    summary:
      "Immediate action, 1 arcane pool point, after hitting with a weapon attack: gain a bonus to AC and Reflex saves equal to your Intelligence modifier (minimum 0) against that opponent until the start of your next turn.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; bonus is scoped to a single opponent — apply manually.",
        "ac",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "rakshasasFortune",
    name: "Rakshasa's Fortune",
    summary:
      "When casting a polymorph-subschool spell on yourself, draw a harrow card as a free action: a matching alignment doubles the spell's duration and grants extra chosen abilities, a partial match grants one extra ability, and an opposed match halves the duration and forfeits an ability.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Requires owning a complete harrow deck; situational draw effect, not a discrete sheet stat.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "rangerTrap",
    name: "Ranger Trap",
    summary: "Learn one ranger trap.",
    minLevel: 10,
    changes: [],
    contextNotes: [note("Which trap you learn is a separate pick — record it in a note.")],
    displayOnly: true,
  },
  {
    id: "reachMagic",
    name: "Reach Magic",
    summary:
      "Once per day, cast a spell as if affected by the Reach Spell feat, at no increase to casting time or spell level.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Once-per-day metamagic swap — apply manually when cast.")],
    displayOnly: true,
  },
  {
    id: "reachSpellstrike",
    name: "Reach Spellstrike",
    summary:
      "Deliver touch-range spells through ranged spellstrike out to close range (25 ft. + 5 ft. per 2 caster levels).",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Requires ranged spellstrike (Eldritch Archer/Myrmidarch archetype); range-extension only, no numeric sheet effect.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "rodMastery",
    name: "Rod Mastery",
    summary:
      "When using a rod, calculate its spells' save DCs from your own Intelligence modifier (minimum 0) instead of the rod's default minimum caster modifier.",
    minLevel: 3,
    changes: [],
    contextNotes: [note("Mechanic substitution only — no dedicated rod-DC sheet stat to modify.")],
    displayOnly: true,
  },
  {
    id: "rodWielder",
    name: "Rod Wielder",
    summary:
      "Add your Intelligence bonus (minimum 0) to caster level checks to overcome spell resistance when casting from a rod or delivering a rod's spell through spellstrike.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note("Mechanic substitution only — no dedicated caster-level-check sheet stat to modify."),
    ],
    displayOnly: true,
  },
  {
    id: "scrollMastery",
    name: "Scroll Mastery",
    summary:
      "1 arcane pool point: when using a scroll, calculate its spell's save DC from your own Intelligence modifier instead of the scroll's default minimum caster modifier.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 arcane pool point per use; mechanic substitution only — no dedicated scroll-DC sheet stat to modify.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "spellScars",
    name: "Spell-Scars",
    summary:
      "Inscribe spells as skin tattoos usable like scrolls (consumed on cast) or prepared without expending them (as Spell Mastery); up to 18 total spell levels of scars at once, using the normal scroll-scribing rules minus Scribe Scroll.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "18-spell-level capacity is a bookkeeping cap, not a modeled resource pool — track it in a note.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "spellTrickery",
    name: "Spell Trickery",
    summary:
      "Once per day, after a successful dirty trick combat maneuver, cast a prepared illusion or enchantment spell (1 standard action casting time or less) as a swift action.",
    minLevel: 12,
    changes: [],
    contextNotes: [note("Once-per-day action-economy swap — apply manually when triggered.")],
    displayOnly: true,
  },
  {
    id: "spellbreaker",
    name: "Spellbreaker",
    summary: "Gain Spellbreaker as a bonus feat.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Grants Spellbreaker as a bonus feat (prerequisites already satisfied) — add it to doc.build.feats separately; this table doesn't auto-grant it.",
        "bonusFeats",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "tabrissStep",
    name: "Tabris's Step",
    summary:
      "Swift action, 1 arcane pool point: gain water walk for 10 minutes per level; spend 2 points instead to extend it to a number of touched creatures equal to your magus level.",
    minLevel: 6,
    changes: [],
    contextNotes: [
      note("Costs 1-2 arcane pool points per use depending on how many creatures are affected."),
    ],
    displayOnly: true,
  },
  {
    id: "throwingMagus",
    name: "Throwing Magus",
    summary:
      "Whenever you enhance your weapon with your arcane pool, spend 1 additional point to add the returning and throwing weapon abilities; regain 1 arcane pool point (up to your Intelligence modifier per day) whenever a thrown, arcane-pool-enhanced weapon hits.",
    minLevel: 3,
    changes: [],
    contextNotes: [
      note(
        "Costs 1 additional arcane pool point on top of the weapon enhancement; the regained-point daily cap is a bookkeeping detail to track in a note.",
      ),
    ],
    displayOnly: true,
  },
  {
    id: "thunderousPoolStrike",
    name: "Thunderous Pool Strike",
    summary:
      "When making a pool strike, spend 1 additional arcane pool point to deal sonic damage instead and deafen the target for 1 round (DC 10 + 1/2 magus level + Intelligence modifier).",
    minLevel: 6,
    changes: [],
    contextNotes: [note("Requires the pool strike arcana; costs 1 additional arcane pool point.")],
    displayOnly: true,
  },
  {
    id: "visionCloudingStrike",
    name: "Vision-Clouding Strike",
    summary:
      "Swift action, 1+ arcane pool points: empower your weapon for 1 minute so a struck creature that fails a Will save (DC 1/2 level + Intelligence modifier) treats you as being in dim light for 1d4 rounds, +1 round per additional point spent.",
    minLevel: 9,
    changes: [],
    contextNotes: [
      note(
        "Costs 1+ arcane pool points per use, scaling the duration; true seeing (but not darkvision) penetrates the effect.",
      ),
    ],
    displayOnly: true,
  },
];

export const MAGUS_ARCANA: Record<string, MagusArcanaDef> = Object.fromEntries(
  ARCANA_LIST.map((a) => [a.id, a]),
);

export const MAGUS_ARCANA_IDS: readonly string[] = ARCANA_LIST.map((a) => a.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.magusArcana` (see that type's doc comment) is the FULL published
 * magus-arcana catalog (~64 entries after junk filtering), prose only. The
 * hand-verified table above stays authoritative for MECHANICS — this section
 * only merges the two for BROWSING (the picker) and for resolving a picked id
 * back to a definition (`collect.ts`/ `archetypes.ts`), mirroring
 * `rage-powers.ts`'s `mergedRagePowerCatalog` exactly.
 *
 * Matching is by NORMALIZED NAME, never id — same rationale as rage
 * powers/hexes.
 *
 * Collision audit (all 64 hand-authored entries, run against the pinned Pf
 * Data 1e slice): all 20 matched a vendored entry by normalized name, with NO
 * naming drift, so `ARCANA_NAME_ALIASES` is empty (kept for a future
 * hand-authored addition that DOES drift). No vendored-catalog-internal name
 * collisions either — every one of the 64 vendored arcana has a unique
 * normalized name.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const ARCANA_NAME_ALIASES: Record<string, string> = {};

function normalizeArcanaName(name: string): string {
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
export interface MergedMagusArcanaEntry extends MagusArcanaDef {
  /** Ability-type suffix as published, e.g. "(Ex)"/"(Su)"/"(Sp)" — undefined when no vendored counterpart backs this id. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredArcanaToDef(entry: MagusArcana): MergedMagusArcanaEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    // 3rd is the earliest ANY magus arcana can be selected (UM RAW) — this
    // source carries no per-entry level field at all (unlike rage powers'
    // non-gate `level`, there isn't even a misleading number to avoid using
    // here). A vendored-only entry with a higher stated minimum only has that
    // prose inside `description` (do not attempt to parse it out
    // structurally — see `MagusArcana`'s doc comment).
    minLevel: 3,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked magus-arcana id (`doc.build.magusArcana` entries) to its
 * definition — hand-authored table first (mechanics-authoritative), falling
 * back to the vendored catalog for an id that only exists there. Used by
 * `collect.ts` (modifier collection) and `archetypes.ts` (the Class Features
 * list) instead of indexing `MAGUS_ARCANA` directly, so a vendored-only pick
 * resolves to a real (display-only) definition rather than being silently
 * dropped.
 */
export function resolveMagusArcanum(id: string, refData: RefData): MagusArcanaDef | undefined {
  const hand = MAGUS_ARCANA[id];
  if (hand) return hand;
  const vendored = refData.magusArcana?.[id];
  return vendored ? vendoredArcanaToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and mechanics, but
 * carrying the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today —
 * see the collision-audit comment above). `!entry.displayOnly` marks which
 * rows have live mechanics, for the picker's "M" badge — every base arcana
 * here is `displayOnly` (see the file's top doc comment), so the badge never
 * actually appears yet.
 */
export function mergedMagusArcanaCatalog(refData: RefData): MergedMagusArcanaEntry[] {
  const handByNormName = new Map<string, MagusArcanaDef>();
  for (const a of ARCANA_LIST) {
    handByNormName.set(normalizeArcanaName(ARCANA_NAME_ALIASES[a.id] ?? a.name), a);
  }

  const usedHandIds = new Set<string>();
  const merged: MergedMagusArcanaEntry[] = [];
  for (const v of Object.values(refData.magusArcana ?? {})) {
    const handMatch = handByNormName.get(normalizeArcanaName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredArcanaToDef(v));
    }
  }
  for (const a of ARCANA_LIST) {
    if (!usedHandIds.has(a.id)) merged.push(a);
  }
  return merged;
}

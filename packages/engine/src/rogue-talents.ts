/**
 * Clean-room PF1 Rogue Talents table (issue #65): hand-authored from the
 * published rules (verified against aonprd.com's "Talents - Rogue" and
 * "Talents - Rogue (Unchained)" listings), mirroring `witch-hexes.ts`'s
 * posture — rogue talents are NOT part of the vendored Foundry data pack
 * (both the base Rogue and Rogue (Unchained) class defs only link a single
 * generic "Rogue Talents" stub `ClassFeature`, no per-talent breakdown), so
 * there is no upstream JSON to normalize.
 *
 * Scope: FULL vendored parity as of issue #74's Phase 5 extension — all 234
 * vendored talents (regular + advanced, chained + Unchained lists, the
 * catfolk-only group, and the "(Unchained Rogue)" revised variants). SHARED
 * between the chained rogue and Rogue (Unchained) (`build.rogueTalents` —
 * both classes draw talents from the same picker); `chainedOnly`/
 * `unchainedOnly` flag which list an entry belongs to (from the vendored
 * `R_`/`UR_` category prefixes), soft-noted (never hidden), same
 * soft-filtering posture as `minLevel` (2 regular / 10 advanced).
 *
 * Modelling posture (mirrors `witch-hexes.ts`'s honesty bar): almost every
 * talent here is a situational/activated/forgo-sneak-damage/prose-tier
 * ability with no flat always-on number the engine tracks. The exceptions
 * carry a genuine, unconditional mechanical grant:
 *   - Combat Trick grants one generic bonus combat feat SLOT — `bonusFeatSlot: true`,
 *     bridged into `classBonusFeatSlots` in `apps/web/src/model/feats.ts`.
 *   - A dozen talents grant a SPECIFIC feat outright, no player choice needed
 *     (Finesse Rogue's Weapon Finesse, Strong Impression's Intimidating
 *     Prowess, Unbalancing Trick's Improved Trip, ...) — `grantsFeat`, each
 *     name verified against the vendored `RefData.feats`, bridged into
 *     `grantedFeats` in `feats.ts`.
 *   - Stony Skin's always-on DR 2/adamantine is the one entry with real
 *     `changes[]` (consumed by `collect.ts`'s rogue-talent loop).
 * Weapon Training (grants Weapon Focus) and Firearm Training (grants Exotic
 * Weapon Proficiency (Firearms)) are DELIBERATELY left note-tier rather than
 * wired as `grantsFeat`: both need a per-instance CHOICE (a weapon pick — the
 * vendored Exotic Weapon Proficiency is one parameterized feat), and
 * `GrantedFeat` (the fixed-grant shape `feats.ts` has) has no slot for one —
 * auto-applying would either guess or silently omit the choice, neither of
 * which is honest. Superior Sniper's grant forks when Expert Sniper is
 * already known, so it also stays note-tier.
 */

import type { Change, ContextNote, RefData, RogueTalent, SourceRef } from "@pf1/schema";

export interface RogueTalentDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest rogue level this talent can be selected at — 2 (the first
   * talent slot) for a regular talent, 10 for an advanced talent (PF1 RAW:
   * "at 10th level, and every two levels thereafter, a rogue can choose one
   * of the following advanced talents"). Soft-filtered only; never blocks.
   */
  minLevel: number;
  /** True if this talent appears only on the Rogue (Unchained) list (the vendored `UR_` category prefix — Pathfinder Unchained additions and the "(Unchained Rogue)" revised variants). Soft-noted, never hidden. */
  unchainedOnly?: boolean;
  /** True if this talent appears only on the chained Rogue list (the vendored `R_` category prefix — e.g. Finesse Rogue, which Unchained's free Finesse Training obsoletes). Soft-noted, never hidden. */
  chainedOnly?: boolean;
  /**
   * Feat name (lowercase, matched against `RefData.feats` by name) this
   * talent grants outright, no player-chosen target needed. See
   * `apps/web/src/model/feats.ts`'s `grantedFeats` bridge.
   */
  grantsFeat?: string;
  /** True if this talent grants one generic bonus combat-feat SLOT (Combat Trick). See `feats.ts`'s `classBonusFeatSlots` bridge. */
  bonusFeatSlot?: boolean;
  /** Typed modifiers granted by the talent (empty for all but Stony Skin — see file doc comment). */
  changes: Change[];
  contextNotes?: ContextNote[];
  /** Derived: false only when `changes` carries a real always-on modifier. Drives the picker's "M" badge. */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTalent {
  id: string;
  name: string;
  summary: string;
  /** Defaults to 2 (regular talent); 10 for an advanced talent. */
  minLevel?: number;
  unchainedOnly?: boolean;
  chainedOnly?: boolean;
  grantsFeat?: string;
  bonusFeatSlot?: boolean;
  /** Set only on Stony Skin (always-on DR) — see {@link RogueTalentDef.displayOnly}. */
  changes?: Change[];
  contextNotes?: ContextNote[];
}

function toDef(e: RawTalent): RogueTalentDef {
  const changes = e.changes ?? [];
  return {
    id: e.id,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 2,
    unchainedOnly: e.unchainedOnly,
    chainedOnly: e.chainedOnly,
    grantsFeat: e.grantsFeat,
    bonusFeatSlot: e.bonusFeatSlot,
    changes,
    contextNotes: e.contextNotes,
    displayOnly: changes.length === 0,
  };
}

const TALENT_LIST: RogueTalentDef[] = [
  toDef({
    id: "bleedingAttack",
    name: "Bleeding Attack",
    summary:
      "A sneak attack causes 1 additional point of bleed damage per die of sneak attack damage, each round until healed.",
    contextNotes: [
      note("Per-sneak-attack-die rider — no persistent 'currently bleeding' state tracked here."),
    ],
  }),
  toDef({
    id: "camouflage",
    name: "Camouflage",
    summary:
      "Once per day, craft camouflage granting a +4 bonus on Stealth checks in matching terrain.",
  }),
  toDef({
    id: "cannyObserver",
    name: "Canny Observer",
    summary:
      "Gain a +4 bonus on Perception checks made to overhear conversations or spot concealed objects/traps.",
    contextNotes: [
      note(
        "Scoped to specific check types, not all Perception checks — apply by hand.",
        "skill.per",
      ),
    ],
  }),
  toDef({
    id: "combatTrick",
    name: "Combat Trick",
    summary: "Gain a bonus combat feat.",
    bonusFeatSlot: true,
  }),
  toDef({
    id: "doubleDebilitation",
    name: "Double Debilitation",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "Whenever you inflict a penalty against a target using Debilitating Injury, select two penalties to inflict instead of one.",
    contextNotes: [
      note("Modifies Debilitating Injury (target-scoped, note-tier — see the class feature row)."),
    ],
  }),
  toDef({
    id: "fastGetaway",
    name: "Fast Getaway",
    summary:
      "After a successful sneak attack or Sleight of Hand check, spend a move action to withdraw.",
  }),
  toDef({
    id: "fastPicks",
    name: "Fast Picks",
    chainedOnly: true,
    summary: "Open locks with Disable Device as a standard action instead of a full-round action.",
  }),
  toDef({
    id: "fastStealth",
    name: "Fast Stealth",
    summary: "Move at full speed while using Stealth with no penalty.",
  }),
  toDef({
    id: "finesseRogue",
    name: "Finesse Rogue",
    chainedOnly: true,
    summary: "Gain Weapon Finesse as a bonus feat.",
    grantsFeat: "weapon finesse",
  }),
  toDef({
    id: "kiPool",
    name: "Ki Pool",
    chainedOnly: true,
    summary:
      "Gain a ki pool of points equal to your Wisdom modifier (minimum 1/day); spend 1 point for a +10-foot bonus to speed until the end of your turn.",
    contextNotes: [
      note(
        "A real per-day resource, but talent-driven — not wired as a live pool here; track by hand.",
      ),
    ],
  }),
  toDef({
    id: "ledgeWalker",
    name: "Ledge Walker",
    chainedOnly: true,
    summary:
      "Move at full speed along narrow surfaces or uneven ground using Acrobatics without penalty, and are not flat-footed while doing so.",
  }),
  toDef({
    id: "majorMagic",
    name: "Major Magic",
    summary: "Cast a chosen 1st-level sorcerer/wizard spell twice per day as a spell-like ability.",
    contextNotes: [note("Requires Minor Magic and Intelligence 11+.")],
  }),
  toDef({
    id: "minorMagic",
    name: "Minor Magic",
    summary:
      "Cast a chosen 0-level sorcerer/wizard spell three times per day as a spell-like ability.",
    contextNotes: [note("Requires Intelligence 10+.")],
  }),
  toDef({
    id: "offensiveDefense",
    name: "Offensive Defense",
    chainedOnly: true,
    summary: "Gain a +1 dodge bonus to AC per die of sneak attack damage rolled, for 1 round.",
    contextNotes: [note("Conditional, 1-round window after a sneak attack — apply by hand.", "ac")],
  }),
  toDef({
    id: "powerfulSneak",
    name: "Powerful Sneak",
    chainedOnly: true,
    summary:
      "Take a -2 penalty on a full attack to treat all 1s rolled on sneak attack dice as 2s.",
  }),
  toDef({
    id: "quickDisable",
    name: "Quick Disable",
    chainedOnly: true,
    summary: "Halve the normal time needed to disable a trap (minimum 1 round).",
  }),
  toDef({
    id: "resiliency",
    name: "Resiliency",
    summary:
      "Once per day, as an immediate action when reduced below 0 hit points, gain temporary hit points equal to your rogue level for 1 minute.",
    contextNotes: [
      note(
        "No temporary-hit-points tracking in this engine (same gap as Rage's temp HP) — apply by hand.",
      ),
    ],
  }),
  toDef({
    id: "rogueCrawl",
    name: "Rogue Crawl",
    chainedOnly: true,
    summary: "Move at half speed while prone, and may take a 5-foot step while crawling.",
  }),
  toDef({
    id: "ropeMaster",
    name: "Rope Master",
    summary:
      "Climb a rope at normal speed, take 10 on Acrobatics along narrow surfaces even when threatened, and gain a +4 bonus to escape a rope/net.",
  }),
  toDef({
    id: "snipersEye",
    name: "Sniper's Eye",
    chainedOnly: true,
    summary:
      "Apply sneak attack damage on ranged attacks against targets with concealment (not total concealment) within 30 feet.",
  }),
  toDef({
    id: "standUp",
    name: "Stand Up",
    chainedOnly: true,
    summary:
      "Stand up from prone as a free action (still provokes an attack of opportunity if threatened).",
  }),
  toDef({
    id: "surpriseAttack",
    name: "Surprise Attack",
    chainedOnly: true,
    summary:
      "During the surprise round, all creatures you attack are treated as flat-footed, even if they've already acted.",
  }),
  toDef({
    id: "survivalist",
    name: "Survivalist",
    summary: "Add Heal and Survival to your list of class skills.",
    contextNotes: [
      note(
        "Class-skill flags aren't tracked separately from the base class list — record for reference.",
      ),
    ],
  }),
  toDef({
    id: "trapSpotter",
    name: "Trap Spotter",
    summary:
      "Whenever you come within 10 feet of a trap, receive an automatic Perception check to notice it.",
  }),
  toDef({
    id: "underhanded",
    name: "Underhanded",
    summary:
      "Gain a +4 circumstance bonus on Sleight of Hand checks made to conceal a weapon on your body.",
    contextNotes: [
      note("Scoped to concealing a weapon, not all Sleight of Hand checks.", "skill.slt"),
    ],
  }),
  toDef({
    id: "weaponTraining",
    name: "Weapon Training",
    summary: "Gain Weapon Focus as a bonus feat.",
    contextNotes: [
      note(
        "Grants Weapon Focus for a weapon you choose — not auto-applied (no weapon-choice slot on a talent grant); add Weapon Focus by hand and pick a weapon.",
      ),
    ],
  }),
  toDef({
    id: "firearmTraining",
    name: "Firearm Training",
    summary: "Gain Exotic Weapon Proficiency (Firearms) as a bonus feat.",
    contextNotes: [note("Not auto-applied — add Exotic Weapon Proficiency (Firearms) by hand.")],
  }),
  // ---- full-catalog extension (issue #74 Phase 5; vendored parity) ----
  toDef({
    id: "accuratePoisoner",
    name: "Accurate Poisoner",
    summary:
      "When a sneak attack hits with a poisoned weapon, forgo the sneak attack damage to extend the poison's duration by 2 (rounds or minutes, matching its normal duration unit).",
  }),
  toDef({
    id: "acrobaticAssist",
    name: "Acrobatic Assist",
    chainedOnly: true,
    summary:
      "Spend an attack of opportunity to aid an adjacent ally's Acrobatics check made while moving through your space or an adjacent one; on a success, the ally also gains a +1 dodge bonus to AC against attacks of opportunity from moving through a threatened area, until the end of their turn.",
    contextNotes: [
      note("Grants a bonus to an ally, not to you — apply to the ally's sheet by hand.", "ac"),
    ],
  }),
  toDef({
    id: "acrobaticStunt",
    name: "Acrobatic Stunt",
    chainedOnly: true,
    summary:
      "Once per day when flanked by two or more foes, spend an immediate action to beat the highest CMD among them (+2 per attacker beyond the second) with an Acrobatics check, letting you take a 5-foot step to escape the flank; failure leaves you prone. Usable one additional time per day per 5 rogue levels.",
    contextNotes: [
      note("Requires training (ranks) in Acrobatics to select this talent.", "skill.acr"),
    ],
  }),
  toDef({
    id: "againstTheWall",
    name: "Against the Wall",
    minLevel: 10,
    summary:
      "You're treated as flanking any opponent adjacent to a stone wall, worked or unworked.",
  }),
  toDef({
    id: "alignedDisguise",
    name: "Aligned Disguise",
    minLevel: 10,
    summary:
      "While using disguise self as a spell-like ability, also mask your alignment aura against detection effects like detect evil — appearing as any alignment, or none. Doesn't protect against effects that cause harm based on alignment.",
    contextNotes: [
      note(
        "Requires already having disguise self as a spell-like ability (e.g. from Minor or Major Magic).",
      ),
    ],
  }),
  toDef({
    id: "alignedSneakAttack",
    name: "Aligned Sneak Attack",
    summary:
      "A sneak attack against a target with alignment-based damage reduction reduces that DR by an amount equal to the number of sneak attack dice rolled, until the end of your turn.",
  }),
  toDef({
    id: "ambuscadingGrapple",
    name: "Ambuscading Grapple",
    summary:
      "When a combat maneuver check to grapple an unaware opponent succeeds, immediately deal sneak attack damage to them; this counts as landing a sneak attack for other abilities and talents.",
  }),
  toDef({
    id: "anotherDay",
    name: "Another Day",
    minLevel: 10,
    summary:
      "Once per day, as an immediate action when a melee attack would drop you to 0 or fewer hit points, take a 5-foot step; if it carries you out of the attacker's reach, you take no damage from that blow, but you're staggered on your next turn.",
  }),
  toDef({
    id: "armorPiercer",
    name: "Armor Piercer",
    summary:
      "On a sneak attack hit, forgo one or more sneak attack dice to reduce the target's natural armor bonus by that amount (minimum +0) until the end of your next turn; the same creature can't be affected again for 1 minute.",
  }),
  toDef({
    id: "aspexiasMysticism",
    name: "Aspexia's Mysticism",
    summary: "Gain Psychic Sensitivity as a bonus feat.",
    grantsFeat: "psychic sensitivity",
  }),
  toDef({
    id: "assaultLeader",
    name: "Assault Leader",
    summary:
      "Once per day, when a melee attack against a flanked opponent misses, designate another ally also flanking that opponent; the ally may immediately make one melee attack against it as an immediate action.",
  }),
  toDef({
    id: "bardicPretender",
    name: "Bardic Pretender",
    summary:
      "You're treated as having the inspire competence bardic performance ability for the purpose of meeting prestige-class prerequisites, though you gain no actual bardic performance.",
    contextNotes: [
      note("Prerequisite work-around only — grants no functional ability at the table."),
    ],
  }),
  toDef({
    id: "befuddlingStrike",
    name: "Befuddling Strike",
    chainedOnly: true,
    summary:
      "A sneak attack hit inflicts a -2 penalty on the target's attack rolls against you for 1d4 rounds.",
  }),
  toDef({
    id: "blackMarketConnections",
    name: "Black Market Connections",
    summary:
      "Treat every settlement as one size larger (two, with a successful Diplomacy check) when determining what magic items are for sale and their value, and can use Diplomacy to fence stolen goods on the black market.",
  }),
  toDef({
    id: "blindingStrike",
    name: "Blinding Strike",
    minLevel: 15,
    summary: "Gain Blinding Critical as a bonus feat, even without meeting its prerequisites.",
    grantsFeat: "blinding critical",
    contextNotes: [
      note(
        "Requires the Obscuring Blow talent and rogue level 15+ before this talent can be chosen.",
      ),
    ],
  }),
  toDef({
    id: "bomber",
    name: "Bomber",
    chainedOnly: true,
    summary:
      "Craft a number of bombs per day equal to your Intelligence modifier (minimum 1); they function as alchemist's bombs but deal your sneak attack damage instead (no Intelligence bonus added).",
    contextNotes: [
      note(
        "A real per-day resource, but talent-driven — not wired as a live pool here; track by hand.",
      ),
    ],
  }),
  toDef({
    id: "bombersDiscovery",
    name: "Bomber's Discovery",
    chainedOnly: true,
    summary: "Gain an alchemist discovery that modifies a bomb.",
    contextNotes: [note("Requires the Bomber talent.")],
  }),
  toDef({
    id: "cardSharp",
    name: "Card Sharp",
    chainedOnly: true,
    summary:
      "Gain Deadly Dealer as a bonus feat, even without meeting its prerequisites. Thrown cards count as darts, and Arcane Strike is needed to imbue them with extra power.",
    grantsFeat: "deadly dealer",
  }),
  toDef({
    id: "carefulStab",
    name: "Careful Stab",
    summary:
      "When precision damage would drop a creature below 0 hit points, you may instead leave it at -1 hp and stable.",
  }),
  toDef({
    id: "castling",
    name: "Castling",
    summary:
      "Treat soft cover from creatures your size or larger as full cover instead, though it doesn't let you attempt Stealth checks.",
  }),
  toDef({
    id: "certainty",
    name: "Certainty",
    unchainedOnly: true,
    summary:
      "Once per day, reroll a skill check and take the better result for one skill you selected with Rogue's Edge; usable one additional time per day at 10th level and every 5 levels thereafter. Can be taken multiple times, each for a different skill.",
    contextNotes: [
      note(
        "Requires the Rogue's Edge class feature; pick which Rogue's Edge skill it applies to.",
        "skills",
      ),
    ],
  }),
  toDef({
    id: "charmer",
    name: "Charmer",
    chainedOnly: true,
    summary:
      "Once per day, roll twice and take the better result on a Diplomacy check, chosen before rolling; usable one additional time per day per 5 rogue levels.",
  }),
  toDef({
    id: "claimedTurf",
    name: "Claimed Turf",
    summary:
      "Gain the Renown vigilante social talent tied to a specific community, and may pick from a list of vigilante social talents (celebrity discount, celebrity perks, gossip collector, great renown, incredible renown, loyal aid, safe house) in place of future rogue talents, using rogue level as vigilante level for prerequisites.",
    contextNotes: [
      note(
        "Grants access to vigilante social talents as alternate talent picks — not modeled as separate selectable entries here; track by hand.",
      ),
    ],
  }),
  toDef({
    id: "climbingStunt",
    name: "Climbing Stunt",
    chainedOnly: true,
    summary: "Take a -10 penalty on a Climb check to climb at full speed.",
    contextNotes: [note("Requires training (ranks) in Climb to select this talent.", "skill.clm")],
  }),
  toDef({
    id: "cloyingShades",
    name: "Cloying Shades",
    summary:
      "When you use dimension door (including via Abundant Step or Shadow Jump), creatures adjacent to you at the start and end of the teleport become entangled by shadows for 1 round unless they succeed on a Reflex save (DC 10 + 1/2 rogue level + Intelligence or Charisma modifier, whichever is higher).",
    contextNotes: [
      note(
        "Requires dimension door as a spell or spell-like ability (including via Abundant Step or Shadow Jump) before selecting.",
      ),
    ],
  }),
  toDef({
    id: "coaxInformation",
    name: "Coax Information",
    chainedOnly: true,
    summary:
      "Use Bluff or Diplomacy in place of Intimidate to force an opponent to act friendly toward you.",
  }),
  toDef({
    id: "coaxInformationUnchained",
    name: "Coax Information",
    unchainedOnly: true,
    summary:
      "Use Bluff or Diplomacy in place of Intimidate to force an opponent to act friendly toward you; when the attitude shift ends, the target's attitude returns to its prior level instead of dropping by one step.",
  }),
  toDef({
    id: "combatSwipe",
    name: "Combat Swipe",
    chainedOnly: true,
    summary: "Gain Improved Steal as a bonus feat, even without meeting its prerequisites.",
    grantsFeat: "improved steal",
    contextNotes: [
      note(
        "The reference text's 'this talent does not exist' line is a feat-tax-variant editorial note, not standard rules.",
      ),
    ],
  }),
  toDef({
    id: "combatSwipeUnchainedRogue",
    name: "Combat Swipe (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Gain Improved Steal as a bonus feat, even without meeting its prerequisites; at 6th level, treat yourself as meeting all prerequisites for Greater Steal (you must still take the feat normally).",
    grantsFeat: "improved steal",
    contextNotes: [
      note(
        "The reference text's 'this talent does not exist' line is a feat-tax-variant editorial note, not standard rules.",
      ),
    ],
  }),
  toDef({
    id: "confoundingBlades",
    name: "Confounding Blades",
    minLevel: 10,
    summary:
      "A melee sneak attack hit prevents the target from making attacks of opportunity for 1d4+1 rounds.",
    contextNotes: [note("Requires the Slow Reactions talent before this talent can be chosen.")],
  }),
  toDef({
    id: "convincingLie",
    name: "Convincing Lie",
    chainedOnly: true,
    summary:
      "A successful Bluff check to sell a lie is so convincing that anyone who later questions the story uses your Bluff modifier instead of their own (or keeps their own +2, if it's already better). The effect lasts 1/2 your rogue level + your Charisma modifier, in days.",
  }),
  toDef({
    id: "cripplingStrike",
    name: "Crippling Strike",
    minLevel: 10,
    summary: "A sneak attack also deals 2 points of Strength damage to the target.",
  }),
  toDef({
    id: "cunningTrigger",
    name: "Cunning Trigger",
    summary: "As a swift action, remotely trigger any trap within 30 feet that you built.",
  }),
  toDef({
    id: "cuttingEdge",
    name: "Cutting Edge",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "Immediately gain two additional skills chosen for Rogue's Edge. Can be selected multiple times.",
    contextNotes: [note("Requires the Rogue's Edge class feature.", "skills")],
  }),
  toDef({
    id: "dampenPresence",
    name: "Dampen Presence",
    summary:
      "Gain Dampen Presence as a bonus feat without needing to meet its prerequisites, and count as having Skill Focus (Stealth) for the purpose of any feat that lists Dampen Presence as a prerequisite.",
    grantsFeat: "dampen presence",
  }),
  toDef({
    id: "danceOfDisorientingShadows",
    name: "Dance of Disorienting Shadows",
    minLevel: 10,
    summary:
      "Use a Perform (dance) check in place of a combat maneuver check when attempting a reposition maneuver.",
    contextNotes: [note("Substitutes Perform (dance) for the reposition CMB check.", "skill.prf")],
  }),
  toDef({
    id: "deadlyCocktail",
    name: "Deadly Cocktail",
    minLevel: 10,
    summary:
      "Apply two doses of poison to a weapon at once — either two different poisons that each act independently, or two doses of the same poison, extending its frequency by 50% and increasing its save DC by 2.",
    contextNotes: [note("Exception to the normal one-dose-at-a-time rule for injury poisons.")],
  }),
  toDef({
    id: "deadlyScratch",
    name: "Deadly Scratch",
    chainedOnly: true,
    summary: "Apply poison to your claws without risk of poisoning yourself.",
    contextNotes: [
      note(
        "Catfolk rogues only, and requires the cat's claws racial trait plus the poison use class feature.",
      ),
    ],
  }),
  toDef({
    id: "deadlySneak",
    name: "Deadly Sneak",
    chainedOnly: true,
    minLevel: 10,
    summary:
      "When using the Powerful Sneak talent, treat all 1s and 2s rolled on sneak attack damage dice as 3s instead.",
    contextNotes: [note("Requires the Powerful Sneak talent before this talent can be chosen.")],
  }),
  toDef({
    id: "deadlySneakUnchainedRogue",
    name: "Deadly Sneak (Unchained Rogue)",
    unchainedOnly: true,
    minLevel: 10,
    summary:
      "When using the Powerful Sneak talent, reroll each sneak attack die that shows a 1 or 2, once per die per attack.",
    contextNotes: [note("Requires the Powerful Sneak talent before this talent can be chosen.")],
  }),
  toDef({
    id: "defensiveRoll",
    name: "Defensive Roll",
    minLevel: 10,
    summary:
      "Once per day, when a weapon or physical blow would drop you to 0 or fewer hit points, attempt a Reflex save (DC = damage dealt) to take only half damage instead of full. Requires being aware of the attack and not denied your Dexterity bonus to AC; Evasion doesn't apply to this roll.",
  }),
  toDef({
    id: "deftPalm",
    name: "Deft Palm",
    summary:
      "Make a Sleight of Hand check to conceal a weapon in plain sight, even while being observed.",
    contextNotes: [note("Scoped to concealing a weapon while it's in plain view.", "skill.slt")],
  }),
  toDef({
    id: "demandAttention",
    name: "Demand Attention",
    chainedOnly: true,
    summary:
      "Once per round, forgo your sneak attack damage on a hit to force a Will save (DC 10 + sneak attack dice forgone + your Charisma modifier); on a failure the target becomes distracted until your next turn, losing track of others within 30 feet and automatically failing Perception checks against anything beyond that range.",
  }),
  toDef({
    id: "demonLantern",
    name: "Demon Lantern",
    chainedOnly: true,
    summary:
      "Once per day, cast dancing lights to instead conjure a single demon's lantern, which functions as hypnotic pattern (DC 11 + your Intelligence modifier) against one creature with Hit Dice no greater than your level, while also shedding torchlight.",
    contextNotes: [
      note(
        "Requires the Minor Magic talent with dancing lights chosen as its spell, and Intelligence 11+.",
      ),
    ],
  }),
  toDef({
    id: "developedPoisonImmunity",
    name: "Developed Poison Immunity",
    summary:
      "Choose an animal or plant poison you've survived; you automatically succeed on Fortitude saves against future exposure to that specific poison.",
  }),
  toDef({
    id: "disablingStunt",
    name: "Disabling Stunt",
    chainedOnly: true,
    summary:
      "As a standard action that doesn't provoke, attempt a Disable Device check against a construct's CMD; success lets you ignore that construct's damage reduction against your sneak attack damage for 1 minute.",
    contextNotes: [
      note(
        "Requires training in Disable Device; the normal penalty applies without thieves' tools.",
      ),
    ],
  }),
  toDef({
    id: "disarmingLuck",
    name: "Disarming Luck",
    chainedOnly: true,
    summary:
      "Once per day, if you fail a Disable Device check by 5 or more, reroll it as a free action, taking the new result even if it's worse.",
    contextNotes: [note("Catfolk rogues only.")],
  }),
  toDef({
    id: "diseaseUse",
    name: "Disease Use",
    chainedOnly: true,
    summary:
      "As a standard action, foul a weapon with filth so its next successful hit inflicts filth fever on the target; the filth disperses after that hit and must be reapplied.",
    contextNotes: [note("You risk exposure to the disease only if the fouled weapon damages you.")],
  }),
  toDef({
    id: "dispellingAttack",
    name: "Dispelling Attack",
    minLevel: 10,
    summary:
      "A melee attack that deals sneak attack damage also functions as a targeted dispel magic against the target's lowest-level active spell effect, using your rogue level as caster level.",
    contextNotes: [note("Requires the Major Magic talent.")],
  }),
  toDef({
    id: "distractingAttack",
    name: "Distracting Attack",
    summary:
      "On a melee hit that deals sneak attack damage, forgo the extra damage to make the target flat-footed against an ally of your choosing (not yourself) until the start of your next turn.",
    contextNotes: [note("No effect against a creature with uncanny dodge.")],
  }),
  toDef({
    id: "eerieDisappearance",
    name: "Eerie Disappearance",
    minLevel: 6,
    summary:
      "As a full-round action, move up to your speed; if you end in cover or concealment, each observer must beat your Stealth with a Perception check or lose track of your location. Afterward, make one Intimidate check to demoralize every foe within 60 feet who saw you moving but doesn't know where you ended up.",
    contextNotes: [
      note("Requires rogue level 6 or higher, not the usual level 10 floor for advanced talents."),
    ],
  }),
  toDef({
    id: "eldritchConduit",
    name: "Eldritch Conduit",
    summary:
      "As a full-round action, activate two potions, wands, or scrolls at once, expending or draining a charge from each as normal; take the magical effect of one item but calculate it using the other item's caster level. A single Use Magic Device check operates both.",
  }),
  toDef({
    id: "emboldeningStrike",
    name: "Emboldening Strike",
    summary:
      "On a melee hit that deals sneak attack damage, grant yourself a +1 circumstance bonus on saving throws for every 2 sneak attack dice rolled (minimum +1), lasting 1 round.",
    contextNotes: [note("Conditional, 1-round window after a sneak attack — apply by hand.")],
  }),
  toDef({
    id: "entanglementOfBlades",
    name: "Entanglement of Blades",
    minLevel: 10,
    chainedOnly: true,
    summary:
      "On a melee hit that deals sneak attack damage, the target cannot take a 5-foot step until the start of your next turn.",
  }),
  toDef({
    id: "escapingStunt",
    name: "Escaping Stunt",
    chainedOnly: true,
    summary:
      "As an immediate action, substitute an Escape Artist check for a Reflex save against an effect that would entangle you. Once per day (plus one more per 5 rogue levels), substitute an Escape Artist check for your CMD, as an immediate action, when targeted by a grapple attempt.",
    contextNotes: [note("Requires training in Escape Artist.")],
  }),
  toDef({
    id: "esotericScholar",
    name: "Esoteric Scholar",
    summary:
      "Once per day, attempt a Knowledge check untrained, even in a skill you have no ranks in.",
  }),
  toDef({
    id: "expertCypher",
    name: "Expert Cypher",
    summary:
      "Decipher a page of text with Linguistics as a full-round action instead of taking 1 minute. When using Use Magic Device to cast from a scroll, you're treated as meeting the spell's minimum ability score requirement, and you may use Intelligence in place of Charisma for Use Magic Device checks.",
    contextNotes: [
      note(
        "Lets you substitute Intelligence for Charisma on Use Magic Device checks.",
        "skill.umd",
      ),
    ],
  }),
  toDef({
    id: "expertLeaper",
    name: "Expert Leaper",
    chainedOnly: true,
    summary:
      "Always treated as having a running start for jump checks. When deliberately falling, a DC 15 Acrobatics check ignores the first 20 feet of the fall instead of the first 10.",
  }),
  toDef({
    id: "expertLeaperUnchainedRogue",
    name: "Expert Leaper (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Always treated as having a running start for jump checks, adding your rogue level to the result. When deliberately falling, a DC 15 Acrobatics check ignores the first 20 feet of the fall instead of the first 10, plus another 10 feet for every 5 the check exceeds the DC.",
  }),
  toDef({
    id: "extinguishingStrike",
    name: "Extinguishing Strike",
    summary:
      "On a melee hit that deals sneak attack damage, any nonmagical light source the target carries is extinguished. Once per day, also attempt a dispel check (as dispel magic, using your rogue level as caster level) against a magical light source the target carries.",
  }),
  toDef({
    id: "extraEarthcraft",
    name: "Extra Earthcraft",
    summary: "Gain 2 additional earthcraft points each day.",
    contextNotes: [note("Requires the Earthcraft ability.")],
  }),
  toDef({
    id: "faceInTheCrowd",
    name: "Face in the Crowd",
    chainedOnly: true,
    summary:
      "Opposed Perception and Sense Motive checks against your Bluff, Disguise, Sleight of Hand, or Stealth take a -2 penalty while you're within 30 feet of at least two non-hostile creatures of your apparent type, or -4 within 30 feet of eight or more such creatures (or in a crowd's square).",
  }),
  toDef({
    id: "falseAttacker",
    name: "False Attacker",
    summary:
      "When you strike a foe from hiding, attempt an immediate Bluff check (opposed by the target's higher of Sense Motive or Perception) before damage is rolled to convince it that someone else attacked. Success, combined with retained cover or concealment, keeps your Stealth intact.",
  }),
  toDef({
    id: "falseFriend",
    name: "False Friend",
    summary:
      "Gain a +4 bonus on Bluff checks to convince a stranger that the two of you are already well acquainted.",
    contextNotes: [
      note(
        "Scoped to Bluff checks made to fake a prior acquaintance, not all Bluff checks.",
        "skill.blf",
      ),
    ],
  }),
  toDef({
    id: "familiar",
    name: "Familiar",
    minLevel: 10,
    summary:
      "Gain a familiar exactly as the wizard's arcane bond class feature, using an effective wizard level equal to your rogue level minus 4.",
    contextNotes: [note("Requires the Minor Magic and Major Magic talents.")],
  }),
  toDef({
    id: "fastFingers",
    name: "Fast Fingers",
    chainedOnly: true,
    summary:
      "Once per day (plus one more per 5 rogue levels), roll a Sleight of Hand check twice and take the better result; you must choose to use this before rolling.",
  }),
  toDef({
    id: "fastTumble",
    name: "Fast Tumble",
    minLevel: 10,
    summary:
      "When using Acrobatics to move through a threatened square at full speed without provoking an attack of opportunity, the DC no longer increases by 10.",
  }),
  toDef({
    id: "favoredTerrain",
    name: "Favored Terrain",
    minLevel: 5,
    summary:
      "Gain one favored terrain from the ranger's list, with the bonuses of the ranger class feature. If you also have Hide in Plain Sight, this terrain must match one chosen there; existing ranger levels count as +5 rogue levels for scaling this bonus.",
    contextNotes: [note("Requires rogue level 5 or higher, not the usual level-2 floor.")],
  }),
  toDef({
    id: "feat",
    name: "Feat",
    minLevel: 10,
    summary: "Take any feat you qualify for in place of an advanced rogue talent.",
  }),
  toDef({
    id: "feintFromShadows",
    name: "Feint from Shadows",
    summary:
      "Feint with a ranged weapon against a target within 30 feet, requiring concealment (not total concealment) from it, causing the target to lose its Dexterity bonus to AC against your next melee or ranged attack.",
  }),
  toDef({
    id: "flyingStunt",
    name: "Flying Stunt",
    chainedOnly: true,
    summary:
      "As a swift action while charging a target from above, attempt a Fly check against its CMD; success adds your Dexterity modifier as precision damage to the attack (not multiplied on a critical hit, and blocked by immunity to sneak attacks).",
    contextNotes: [note("Requires training in Fly.")],
  }),
  toDef({
    id: "focusingAttack",
    name: "Focusing Attack",
    summary:
      "Choose the confused, shaken, or sickened condition; whenever you have that condition and hit with a melee attack that deals sneak attack damage, the condition ends. May be taken up to three times for three different conditions, but only one condition clears per qualifying hit.",
  }),
  toDef({
    id: "followAlong",
    name: "Follow Along",
    summary:
      "When you succeed on a save against an enchantment effect, you learn what it would have done on a failure, letting you feign being affected. An opposed Bluff check against the caster's Sense Motive maintains the ruse, and while it holds the caster is flat-footed against your first attack.",
  }),
  toDef({
    id: "followClues",
    name: "Follow Clues",
    summary: "Use Perception in place of Survival to follow tracks.",
    contextNotes: [note("Substitutes for Survival when following tracks only.", "skill.per")],
  }),
  toDef({
    id: "fortifiedPosition",
    name: "Fortified Position",
    summary:
      "Whenever cover grants you a bonus on Reflex saves, gain an equal bonus on Fortitude saves.",
  }),
  toDef({
    id: "foundersBlessing",
    name: "Founders' Blessing",
    minLevel: 10,
    summary:
      "Once per day, spend 10 minutes communing to gain a luck bonus equal to your rogue level on a skill you have no ranks in, treating yourself as trained in it for 8 hours.",
  }),
  toDef({
    id: "frugalTrapsmith",
    name: "Frugal Trapsmith",
    minLevel: 10,
    summary: "Pay only 75% of the normal cost when constructing a mechanical trap.",
  }),
  toDef({
    id: "getawayArtist",
    name: "Getaway Artist",
    summary:
      "Add Fly, Handle Animal, and Ride to your class skills, and gain a +2 bonus on all driving checks.",
    contextNotes: [
      note(
        "Class-skill flags aren't tracked separately from the base class list — record for reference.",
      ),
    ],
  }),
  toDef({
    id: "getawayMaster",
    name: "Getaway Master",
    minLevel: 10,
    summary: "Gain a +10 bonus on all driving checks.",
    contextNotes: [note("Requires the Getaway Artist talent.")],
  }),
  toDef({
    id: "glibFacade",
    name: "Glib Facade",
    minLevel: 10,
    summary:
      "Once per day, cast glibness as a spell-like ability, using your rogue level as caster level.",
    contextNotes: [note("Requires the Innocent Facade talent.")],
  }),
  toDef({
    id: "gloomMagic",
    name: "Gloom Magic",
    summary:
      "Cast darkness twice per day as a spell-like ability (caster level equal to your rogue level) that doesn't impair your own vision.",
    contextNotes: [note("Requires Intelligence 12+ and the Minor Magic talent.")],
  }),
  toDef({
    id: "gotYourBack",
    name: "Got Your Back",
    chainedOnly: true,
    summary:
      "Once per round, spend an attack of opportunity as an immediate action to attempt an aid another check improving a flanking ally's attack against the shared target.",
  }),
  toDef({
    id: "gracefulAthlete",
    name: "Graceful Athlete",
    summary: "Gain Graceful Athlete as a bonus feat, provided you meet its prerequisites.",
    grantsFeat: "graceful athlete",
    contextNotes: [note("RAW you must meet the feat's prerequisites to take this talent.")],
  }),
  toDef({
    id: "gracefulFaller",
    name: "Graceful Faller",
    chainedOnly: true,
    summary:
      "Land on your feet even when a fall would deal lethal damage. If you also have the nimble faller racial trait, treat any fall as 20 feet shorter for damage purposes.",
    contextNotes: [note("Catfolk rogues only.")],
  }),
  toDef({
    id: "grazingShot",
    name: "Grazing Shot",
    minLevel: 10,
    summary:
      "As a standard action, fire a hand crossbow at a foe who has cover from another creature, making one attack roll compared against both targets' AC — each hit deals 1 point of damage, with precision damage and special weapon properties applying to only one target (poison on the bolt affects both).",
    contextNotes: [note("Drow only.")],
  }),
  toDef({
    id: "greaterGloomMagic",
    name: "Greater Gloom Magic",
    summary:
      "Once per day, cast deeper darkness as a spell-like ability at a caster level equal to your rogue level; the darkness doesn't impair your own vision.",
    contextNotes: [note("Requires Intelligence 13+ and the Gloom Magic and Minor Magic talents.")],
  }),
  toDef({
    id: "greaterMultitalented",
    name: "Greater Multitalented",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "Lets the Multitalented talent's bonus daily talent-use be spent on advanced talents too, instead of only regular ones.",
    contextNotes: [note("Requires the Multitalented talent.")],
  }),
  toDef({
    id: "greaterTerrainMastery",
    name: "Greater Terrain Mastery",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "Increase your Terrain Mastery bonus in your chosen favored terrain to +4, rising by another +2 at 13th and 18th level (maximum +8).",
    contextNotes: [
      note("Requires the Terrain Mastery talent; scoped to your single chosen terrain."),
    ],
  }),
  toDef({
    id: "greenTongue",
    name: "Green Tongue",
    summary:
      "Gain a bonus language (Aklo, Aquan, Auran, Giant, Ignan, Sylvan, or Terran), and can attempt a DC 15 Linguistics check to convey basic concepts to magical beasts and monstrous humanoids you don't share a language with.",
  }),
  toDef({
    id: "grigJig",
    name: "Grig Jig",
    summary:
      "Once per day (plus one more per 5 rogue levels), spend a full-round action on a Perform (dance) check opposed by a nearby humanoid's Will save to force it to dance uncontrollably alongside you; the effect ends if you stop dancing or the target is endangered.",
    contextNotes: [note("Requires Intelligence 12+. Mind-affecting effect.")],
  }),
  toDef({
    id: "grit",
    name: "Grit",
    summary:
      "Gain the Amateur Gunslinger feat and one grit feat of your choice, provided you qualify for the chosen grit feat's prerequisites.",
    grantsFeat: "amateur gunslinger",
    contextNotes: [
      note("Requires the Firearm Training talent."),
      note("The accompanying grit feat is a player choice — add it by hand."),
    ],
  }),
  toDef({
    id: "guilefulPolyglot",
    name: "Guileful Polyglot",
    chainedOnly: true,
    summary:
      "Gain four additional languages if you have at least 1 rank in Linguistics, or two if you don't; later gaining Linguistics ranks adds two more, to a maximum of four bonus languages total.",
  }),
  toDef({
    id: "hairpinTrick",
    name: "Hairpin Trick",
    summary:
      "Take no penalty on Disable Device checks using improvised tools, and can attempt such checks with no tools at all at only a -4 penalty; treats owned non-improvised thieves' tools as masterwork, doubling their masterwork bonus from +2 to +4.",
  }),
  toDef({
    id: "hamstringStrike",
    name: "Hamstring Strike",
    minLevel: 10,
    chainedOnly: true,
    summary:
      "On a successful sneak attack, forgo the sneak attack damage to knock the target prone and deny it move actions on its next turn, unless it succeeds a Fortitude save (DC 10 + 1/2 rogue level + Dexterity modifier).",
  }),
  toDef({
    id: "hardMinded",
    name: "Hard Minded",
    minLevel: 10,
    summary:
      "Automatically get a save each round to disbelieve any illusion you can see, even without interacting with it; on a failed non-disbelief save against an illusion, get one extra attempt 1 round later at the same DC.",
  }),
  toDef({
    id: "hardToFool",
    name: "Hard to Fool",
    chainedOnly: true,
    summary:
      "Once per day (plus one more per 5 rogue levels), roll twice on a Sense Motive check and keep the better result; must declare the use before rolling.",
  }),
  toDef({
    id: "harrowStrike",
    name: "Harrow Strike",
    minLevel: 10,
    chainedOnly: true,
    summary:
      "Once per day (twice more at 15th and 20th level), on a successful sneak attack forgo the sneak attack damage to draw a harrow card and instead deal ability damage — equal to your sneak attack dice — to the ability score tied to the card's suit.",
    contextNotes: [note("Requires owning a harrow deck.")],
  }),
  toDef({
    id: "headsUp",
    name: "Heads Up",
    chainedOnly: true,
    summary:
      "As an immediate or swift action, let one adjacent ally treat a Perception check you just made as their own result.",
  }),
  toDef({
    id: "hiddenMind",
    name: "Hidden Mind",
    minLevel: 10,
    chainedOnly: true,
    summary:
      "Gain constant protection from divination effects as if under a personal nondetection spell, with caster level equal to your rogue level.",
  }),
  toDef({
    id: "hideInPlainSight",
    name: "Hide in Plain Sight",
    minLevel: 10,
    summary:
      "Choose a favored terrain; while within it, use Stealth to hide even while directly observed. Can be taken more than once for different terrains.",
    contextNotes: [note("Scoped to your chosen terrain(s) only.", "skill.ste")],
  }),
  toDef({
    id: "holdBreath",
    name: "Hold Breath",
    chainedOnly: true,
    summary:
      "Increase the number of rounds you can hold your breath by 2. Can be taken multiple times, stacking each time.",
  }),
  toDef({
    id: "honeyedWords",
    name: "Honeyed Words",
    chainedOnly: true,
    summary:
      "Once per day (plus one more per 5 rogue levels), roll twice on a Bluff check and keep the better result; must declare the use before rolling.",
  }),
  toDef({
    id: "huntersSurprise",
    name: "Hunter's Surprise",
    minLevel: 10,
    summary:
      "Once per day, designate an adjacent enemy as your prey; until the end of your next turn, apply sneak attack damage to all attacks against it even without flanking or flat-footedness.",
  }),
  toDef({
    id: "improvedEvasion",
    name: "Improved Evasion",
    minLevel: 10,
    summary:
      "Like evasion, but a failed Reflex save against an attack that allows a save for half damage now takes only half damage instead of full (still no benefit while helpless).",
  }),
  toDef({
    id: "improvedShadowsChill",
    name: "Improved Shadow's Chill",
    minLevel: 10,
    summary:
      "Melee sneak attack damage becomes cold damage instead of its normal type; regular weapon damage is unaffected.",
    contextNotes: [note("Requires a racial cold resistance trait and the Shadow's Chill talent.")],
  }),
  toDef({
    id: "innocentFacade",
    name: "Innocent Facade",
    summary:
      "Once per day, cast innocence as a spell-like ability using your rogue level as caster level.",
    contextNotes: [note("Requires the Minor Magic talent.")],
  }),
  toDef({
    id: "innocuousServant",
    name: "Innocuous Servant",
    summary:
      "Gain a +2 bonus on Disguise checks to pass as an unimportant servant, +2 on Bluff to maintain the guise, and +2 on Diplomacy to gather information among fellow servants while so disguised (or gather it passively over 1d4 days with a Bluff check instead of direct questioning); all three bonuses rise to +4 at 8th level.",
    contextNotes: [
      note("Scoped to appearing and acting as a generic servant, not general skill use.", "skills"),
    ],
  }),
  toDef({
    id: "ironGuts",
    name: "Iron Guts",
    summary:
      "Gain a +1 bonus on saves against ingested poisons, and a +4 bonus on saves against effects that would nauseate or sicken you.",
  }),
  toDef({
    id: "justAFaceInTheCrowd",
    name: "Just a Face in the Crowd",
    summary:
      "Gain a bonus equal to half your rogue level on Disguise and Perception checks whenever 10 or more creatures of your size are within 30 feet of you.",
    contextNotes: [note("Conditional on nearby crowd size — apply by hand.", "skills")],
  }),
  toDef({
    id: "knockOutBlow",
    name: "Knock-Out Blow",
    minLevel: 10,
    summary:
      "Once per day, declare before attacking that you'll forgo sneak attack damage on a hit to instead knock the target unconscious for 1d4 rounds; a successful Fortitude save (DC 10 + 1/2 rogue level + Intelligence modifier) reduces this to staggered for 1 round.",
  }),
  toDef({
    id: "knockoutQueen",
    name: "Knockout Queen",
    summary:
      "Once per day, spend 30 minutes and 25 gp per dose to craft drow poison, up to one dose per 3 rogue levels (minimum 1); no skill check is needed, but unused doses spoil within 24 hours.",
  }),
  toDef({
    id: "lastDitchEffort",
    name: "Last Ditch Effort",
    chainedOnly: true,
    summary:
      "Once per day, if you accidentally trigger a trap while trying to disarm it, immediately attempt a second Disable Device check at a -5 penalty to disarm it anyway — the second result applies even if it's worse.",
  }),
  toDef({
    id: "lastingPoison",
    name: "Lasting Poison",
    chainedOnly: true,
    summary:
      "Apply poison to a weapon so it remains effective for two successful attacks instead of one, though saves against it gain a +2 circumstance bonus; a full-round action to apply, or standard action with Swift Poison.",
  }),
  toDef({
    id: "lastingPoisonUnchainedRogue",
    name: "Lasting Poison (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Apply poison to a weapon so it remains effective for a number of successful attacks equal to your Dexterity modifier (minimum two) instead of one, though saves against it gain a +2 circumstance bonus; a full-round action to apply, or standard action with Swift Poison.",
  }),
  toDef({
    id: "ledgeWalkerUnchainedRogue",
    name: "Ledge Walker (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Move at full speed along narrow surfaces using Acrobatics without penalty, and retain your Dexterity bonus to AC (not flat-footed) while doing so.",
  }),
  toDef({
    id: "lightWalker",
    name: "Light Walker",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "Move through difficult terrain at full speed, and can take 5-foot steps into difficult terrain.",
    contextNotes: [note("Requires the Ledge Walker talent.")],
  }),
  toDef({
    id: "lingeringPoison",
    name: "Lingering Poison",
    summary:
      "Delay a delivered contact or injury poison's onset by up to 1 day (minimum 1 round) instead of its normal onset time; the poison can still be found early by detect poison and similar effects.",
  }),
  toDef({
    id: "maneuveringDodge",
    name: "Maneuvering Dodge",
    summary:
      "Whenever an equal-or-larger foe misses you with a melee attack, gain a +2 bonus (+4 at 8th level) on Acrobatics, Climb, Fly, and Swim checks for 1 round.",
    contextNotes: [
      note("Conditional 1-round window after being missed in melee — apply by hand.", "skills"),
    ],
  }),
  toDef({
    id: "masterOfDisguise",
    name: "Master of Disguise",
    minLevel: 10,
    chainedOnly: true,
    summary: "Once per day, gain a +10 bonus on a single Disguise check.",
  }),
  toDef({
    id: "masterTricks",
    name: "Master Tricks",
    minLevel: 10,
    summary:
      "Choose a ninja trick from the master trick list in place of an advanced rogue talent (can't duplicate a talent you already have by name).",
    contextNotes: [
      note("Requires the Ki Pool talent to use any ki-costing tricks chosen this way."),
    ],
  }),
  toDef({
    id: "mienOfDespair",
    name: "Mien of Despair",
    summary:
      "When you successfully demoralize a foe with Intimidate or land a successful feint against it, it loses all morale bonuses and can't gain new ones for 1d4+1 rounds.",
  }),
  toDef({
    id: "multitalented",
    name: "Multitalented",
    unchainedOnly: true,
    summary:
      "Gain one extra daily use of a once-per-day rogue talent (two more at 10th and 18th level, up to 3 bonus uses total); the extra uses can be split across different talents, but never spent on an advanced talent.",
  }),
  toDef({
    id: "nimbleClimberUnchained",
    name: "Nimble Climber",
    unchainedOnly: true,
    summary:
      "Whenever you fail a Climb check by 5 or more, attempt a Reflex save (same DC as the Climb check) to catch yourself and avoid falling.",
  }),
  toDef({
    id: "nimbleClimberCatfolk",
    name: "Nimble Climber",
    chainedOnly: true,
    summary:
      "Gain a +4 bonus on Climb checks; if you also have the climber racial trait, take 10 on Climb checks even when threatened or distracted.",
    contextNotes: [note("Catfolk rogues only.")],
  }),
  toDef({
    id: "ninjaTrick",
    name: "Ninja Trick",
    summary:
      "Choose a trick from the ninja trick list in place of a rogue talent (can't duplicate a talent you already have by name); can be taken multiple times.",
    contextNotes: [
      note("Requires the Ki Pool talent to use any ki-costing tricks chosen this way."),
    ],
  }),
  toDef({
    id: "obfuscateStory",
    name: "Obfuscate Story",
    chainedOnly: true,
    summary:
      "While someone else recounts an event, make an opposed Diplomacy check to subtly muddle the accuracy of their account; if you fail, the target gets a Sense Motive check (DC = your failed Diplomacy result) to realize you interfered.",
  }),
  toDef({
    id: "obscuringBlow",
    name: "Obscuring Blow",
    summary:
      "Once per day, declare before attacking to forgo sneak attack damage on a hit; the target instead grants all other creatures a 20% miss chance against it for half your rogue level in rounds, reduced to 1 round on a successful Fortitude save.",
  }),
  toDef({
    id: "occultDungeoneer",
    name: "Occult Dungeoneer",
    summary:
      "Use spell-trigger and spell-completion items as though detect secret doors, detect snares and pits, knock, locate object, and obscure object were on your spell list, using your rogue level as caster level; also cast knock as a supernatural ability once per day.",
  }),
  toDef({
    id: "oneOfThoseFaces",
    name: "One of Those Faces",
    summary:
      "Cast disguise self as a spell-like ability for up to 10 minutes per character level each day, usable in 10-minute increments; once used, you must keep the same alternate appearance for the next 24 hours.",
  }),
  toDef({
    id: "opportunist",
    name: "Opportunist",
    minLevel: 10,
    summary:
      "Once per round, make an attack of opportunity against a foe that another character just struck in melee — this doesn't grant a second use per round even with Combat Reflexes.",
  }),
  toDef({
    id: "papercraftTools",
    name: "Papercraft Tools",
    chainedOnly: true,
    summary:
      "Destroy a card from a deck of cards to attempt a Disable Device check as though you had thieves' tools; a harrow card counts as masterwork tools (+2 circumstance bonus) but is still destroyed after use.",
  }),
  toDef({
    id: "peerlessManeuver",
    name: "Peerless Maneuver",
    chainedOnly: true,
    summary:
      "Once per day, roll twice on an Acrobatics check and take the better result; gain one additional use per day for every 5 rogue levels.",
  }),
  toDef({
    id: "petrifyingStrike",
    name: "Petrifying Strike",
    minLevel: 10,
    summary:
      "Sneak attacks also deal 2 points of Dexterity damage from magical petrification, in addition to the normal sneak attack damage.",
  }),
  toDef({
    id: "philologist",
    name: "Philologist",
    chainedOnly: true,
    summary:
      "Reroll any failed Linguistics check to decipher unfamiliar writing, and never draw a false conclusion from a failed Wisdom check after a failed Linguistics check; limited to one reroll per document.",
    contextNotes: [note("Scoped to deciphering unfamiliar writing.", "skill.lin")],
  }),
  toDef({
    id: "pierceTheDarkness",
    name: "Pierce the Darkness",
    minLevel: 10,
    summary:
      "Gain blindsense out to 5 feet against creatures obscured by darkness or your own blindness, though the normal concealment miss chance still applies against them.",
  }),
  toDef({
    id: "poisonUse",
    name: "Poison Use",
    summary: "Never risk accidentally poisoning yourself while applying poison to a weapon.",
  }),
  toDef({
    id: "positioningAttack",
    name: "Positioning Attack",
    summary:
      "Once per day, after hitting with a melee attack, move up to 30 feet without provoking attacks of opportunity, ending adjacent to the creature you hit.",
  }),
  toDef({
    id: "powerfulSneakUnchainedRogue",
    name: "Powerful Sneak (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "During a full attack, take a -2 penalty on all attack rolls until your next turn to treat 1s rolled on sneak attack damage dice as 2s; each die can be adjusted only once per attack.",
  }),
  toDef({
    id: "quickDisableUnchainedRogue",
    name: "Quick Disable (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Halve the time needed to disable a trap (minimum 1 round), and reduce the time to open a lock that would normally take a full-round action down to a standard action.",
  }),
  toDef({
    id: "quickDisguise",
    name: "Quick Disguise",
    summary:
      "Reduce the time needed to alter your appearance with Disguise: 1 full-round action for minor details, plus 1 minute each (cumulative) to change gender, race, age category, or size category.",
  }),
  toDef({
    id: "quickScrounge",
    name: "Quick Scrounge",
    chainedOnly: true,
    summary:
      "Search a creature, object, or area in half the normal time; a Perception check that would take a full-round action or less drops one step on the action-type ladder (as fast as an immediate action), though free or action-less checks are unaffected.",
  }),
  toDef({
    id: "quickShot",
    name: "Quick Shot",
    minLevel: 10,
    unchainedOnly: true,
    summary:
      "When you roll initiative with a loaded ranged weapon in hand, make one attack with it as a swift action; if multiple rogues have this talent, initiative order determines who fires first.",
  }),
  toDef({
    id: "quickTrapsmith",
    name: "Quick Trapsmith",
    summary:
      "As a full-round action, assemble pre-purchased components on hand into a simple trap with a CR no higher than half your rogue level, subject to GM discretion on trap type.",
  }),
  toDef({
    id: "rapidBoost",
    name: "Rapid Boost",
    summary:
      "Once per day, roll twice on a Sleight of Hand check and take the better result; gain one additional use per day for every 5 rogue levels.",
  }),
  toDef({
    id: "rapidPerception",
    name: "Rapid Perception",
    chainedOnly: true,
    summary:
      "Make an intentional Perception check to search for a specific item or creature as a swift action instead of a move action; when searching for an invisible creature this way, halve its Stealth bonus from invisibility.",
  }),
  toDef({
    id: "redirectAttack",
    name: "Redirect Attack",
    minLevel: 10,
    summary:
      "Once per day, when hit by a melee attack, redirect it as a free action to strike an adjacent creature within the original attack's reach; the attacker rerolls the attack roll against the new target.",
  }),
  toDef({
    id: "reflexiveShadowShield",
    name: "Reflexive Shadow Shield",
    minLevel: 10,
    summary:
      "Once per day as an immediate action, gain cold or electricity resistance equal to half your rogue level for 1 round; doesn't stack with other resistance to that energy type unless it comes from the shadowy resistance racial trait.",
    contextNotes: [note("Requires the Resiliency talent.")],
  }),
  toDef({
    id: "resonatingRumbles",
    name: "Resonating Rumbles",
    minLevel: 10,
    summary:
      "On a successful sneak attack against a creature with tremorsense, subtract 3 dice from the sneak attack damage to suppress that tremorsense for half your rogue level in rounds.",
  }),
  toDef({
    id: "ridingStunt",
    name: "Riding Stunt",
    chainedOnly: true,
    summary:
      "Take only a -2 penalty (instead of -5) riding bareback, use the better of your Ride or mount's jump modifier when directing a leap, gain a +5 competence bonus softening falls or fast mounting/dismounting, and recover from cover on a mount with a DC 15 Ride check as a free action instead of a move action.",
    contextNotes: [note("Requires ranks in Ride to select.", "skill.rid")],
  }),
  toDef({
    id: "rogueCrawlUnchainedRogue",
    name: "Rogue Crawl (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Move at half speed while prone (still provoking attacks of opportunity), take a 5-foot step while crawling, and reduce the attack roll and AC penalties for being prone by 2.",
  }),
  toDef({
    id: "rumormonger",
    name: "Rumormonger",
    minLevel: 10,
    summary:
      "Spread a rumor through a town or city with a Bluff check (DC scales from 18 for a small town to 35 for a metropolis), usable a number of times per week equal to your Charisma modifier (minimum 0); success plants the rumor as accepted fact over about a week, while failure can backfire.",
  }),
  toDef({
    id: "sacredSneakAttack",
    name: "Sacred Sneak Attack",
    chainedOnly: true,
    summary:
      "Sneak attack damage against undead or evil outsiders counts as good-aligned for overcoming damage reduction (normal weapon damage is unaffected).",
    contextNotes: [note("Requires a good alignment to select.")],
  }),
  toDef({
    id: "sacrificeSelf",
    name: "Sacrifice Self",
    chainedOnly: true,
    summary:
      "On a successful Reflex save against an area effect, forgo your own evasion to halve that effect's damage for an adjacent ally instead; with improved evasion, a second successful save negates the damage to both of you entirely.",
    contextNotes: [
      note("Requires the evasion class feature; the secondary negation requires improved evasion."),
    ],
  }),
  toDef({
    id: "scavenger",
    name: "Scavenger",
    chainedOnly: true,
    summary:
      "Pick up and stow an object as a single swift action instead of two move actions, and gain a +2 bonus on Sleight of Hand checks to pick the pockets of stunned or disabled creatures.",
    contextNotes: [
      note(
        "The +2 bonus is scoped to picking the pockets of stunned or disabled creatures, not all Sleight of Hand checks.",
        "skill.slt",
      ),
    ],
  }),
  toDef({
    id: "scrySlip",
    name: "Scry Slip",
    summary:
      "When targeted by a scrying effect that allows a Will save, the caster must also beat a caster level check (DC 15 + your class level) or the scrying fails; this protection extends to items you're carrying.",
  }),
  toDef({
    id: "scryingFamiliarity",
    name: "Scrying Familiarity",
    summary:
      "Roll twice and take the better result on saves against scrying divinations, on Perception checks to spot scrying sensors, and on caster level checks to beat spell resistance with a scrying effect; also Stealth-check against a noticed sensor's caster to avoid detection.",
  }),
  toDef({
    id: "sczarniSmuggler",
    name: "Sczarni Smuggler",
    summary:
      "Forge documents needing no specific signature from only a glimpse of a similar one (+8 bonus on the Linguistics check), replicate a person's handwriting from a small sample, always take 10 on Diplomacy checks to offer bribes, and gain an extra advantage at the start of urban pursuits.",
    contextNotes: [
      note(
        "The +8 bonus applies only to forging a document from a similar example, not all Linguistics checks.",
        "skill.lin",
      ),
    ],
  }),
  toDef({
    id: "seeInDarkness",
    name: "See in Darkness",
    minLevel: 10,
    summary:
      "Gain the see in darkness ability, seeing perfectly in darkness of any kind, magical or not.",
    contextNotes: [note("Requires darkvision to select.")],
  }),
  toDef({
    id: "setUp",
    name: "Set-Up",
    chainedOnly: true,
    summary:
      "On a successful melee sneak attack, forgo the extra sneak attack dice so the first melee attack an adjacent ally makes against that target before your next turn treats it as flanked, even without actual flanking position.",
  }),
  toDef({
    id: "severAlignment",
    name: "Sever Alignment",
    summary:
      "Against a creature with an alignment subtype, forgo sneak attack damage on a hit to force a Fortitude save (DC 10 + half rogue level + Intelligence modifier) or the target loses damage reduction and regeneration keyed to an alignment (such as DR 10/good or regeneration 10 [good]).",
    contextNotes: [note("Requires the Aligned Sneak Attack talent.")],
  }),
  toDef({
    id: "shadesOfGray",
    name: "Shades of Gray",
    summary:
      "Gain the benefits of undetectable alignment at will while conscious, protecting against attempts to discern your alignment.",
  }),
  toDef({
    id: "shadowDuplicate",
    name: "Shadow Duplicate",
    summary:
      "Once per day as an immediate action when hit, create a mirror-image-style shadow duplicate (caster level equal to rogue level) that lasts a number of rounds equal to your rogue level, with the GM randomly deciding whether an attack strikes you or the duplicate; gain one additional use per day for every 5 rogue levels.",
    contextNotes: [note("Does not stack with the mirror image spell.")],
  }),
  toDef({
    id: "shadowsChill",
    name: "Shadow's Chill",
    summary:
      "On a melee sneak attack, a number of the sneak attack damage dice's worth of damage becomes cold damage instead of the normal type (the rest of the sneak attack and weapon damage are unaffected).",
    contextNotes: [note("Requires racial cold resistance to select.")],
  }),
  toDef({
    id: "shoveAside",
    name: "Shove Aside",
    chainedOnly: true,
    summary:
      "When you and an adjacent ally are both caught by an effect requiring a saving throw, take a -4 penalty on your own save to grant your ally a +4 bonus on theirs; you lose evasion (or it's reduced from improved evasion to evasion) against that attack.",
    contextNotes: [note("Requires the evasion class feature.")],
  }),
  toDef({
    id: "shrinewalk",
    name: "Shrinewalk",
    minLevel: 10,
    summary:
      "Mark a location with a unique, non-magical sigil to designate it as your shrine, then use word of recall once per day to return there; defacing the marking disables it, and creating a new shrine replaces the old one.",
  }),
  toDef({
    id: "signaturePoison",
    name: "Signature Poison",
    summary:
      "Designate one poison as your signature poison, increasing its save DC by +2 whenever you use it; can be taken multiple times for different poisons.",
  }),
  toDef({
    id: "silencingStrike",
    name: "Silencing Strike",
    summary:
      "A creature damaged by your sneak attack is struck mute for 1 round unless it succeeds at a Will save (DC 10 + half rogue level + Charisma modifier); usable a number of times per day equal to half your rogue level.",
  }),
  toDef({
    id: "singleMindedAppraiser",
    name: "Single-Minded Appraiser",
    chainedOnly: true,
    summary: "Always take 10 when appraising gems and jewelry.",
    contextNotes: [note("Catfolk rogues only.")],
  }),
  toDef({
    id: "skillMastery",
    name: "Skill Mastery",
    chainedOnly: true,
    minLevel: 10,
    summary:
      "Choose a number of skills equal to 3 + your Intelligence modifier; you can take 10 on checks with those skills even under stress or distraction that would normally prevent it. Can be selected multiple times for additional skills.",
  }),
  toDef({
    id: "skillMasteryUnchained",
    name: "Skill Mastery",
    unchainedOnly: true,
    minLevel: 10,
    summary:
      "Choose a number of skills equal to your Intelligence modifier; you can take 10 on checks with those skills even under stress or distraction that would normally prevent it. Can be selected multiple times for additional skills.",
    contextNotes: [
      note(
        "Also applies to any skills chosen through the Unchained-only rogue's edge class feature.",
      ),
    ],
  }),
  toDef({
    id: "sleightOfHandStunt",
    name: "Sleight of Hand Stunt",
    chainedOnly: true,
    summary:
      "In place of an attack of opportunity against a foe firing a ranged weapon while threatened, attempt a Sleight of Hand check against the attacker's CMD to pluck the ammunition and negate the attack — usable as many times per round as you have attacks of opportunity.",
    contextNotes: [note("Requires training in Sleight of Hand (at least 1 rank).", "skill.slt")],
  }),
  toDef({
    id: "slipperyMind",
    name: "Slippery Mind",
    minLevel: 10,
    summary:
      "If you fail a save against an enchantment effect, you get one extra chance to reattempt the same save at the same DC 1 round later.",
  }),
  toDef({
    id: "slowReactions",
    name: "Slow Reactions",
    summary:
      "A creature damaged by your sneak attack can't make attacks of opportunity for 1 round.",
  }),
  toDef({
    id: "snapShot",
    name: "Snap Shot",
    chainedOnly: true,
    summary:
      "Treat your initiative as a 20 during a surprise round, though you may only take a ranged attack action that round; your normal initiative applies afterward. Multiple rogues with this talent act in their own initiative order before everyone else.",
  }),
  toDef({
    id: "sneakTraining",
    name: "Sneak Training",
    summary:
      "Counts as having the sneak attack class feature (at your rogue level) for meeting prestige class prerequisites; doesn't improve or grant sneak attack damage itself.",
    contextNotes: [
      note("Prerequisite-qualification only — doesn't change sneak attack damage on the sheet."),
    ],
  }),
  toDef({
    id: "sneakyManeuver",
    name: "Sneaky Maneuver",
    chainedOnly: true,
    summary:
      "Instead of sneak attack damage on a melee hit, take a -2 penalty on the attack roll to attempt a dirty trick, disarm, steal, sunder, or trip combat maneuver as a swift action after the hit lands.",
    contextNotes: [
      note(
        "The maneuver still provokes an attack of opportunity unless another ability prevents it.",
      ),
    ],
  }),
  toDef({
    id: "spellStoring",
    name: "Spell Storing",
    summary:
      "Store a single targeted harmless spell of 2nd level or lower (1 standard action casting time) cast on you instead of letting it take effect immediately; release the stored spell later as a standard action.",
    contextNotes: [note("Requires 1 rank of Use Magic Device.", "skill.umd")],
  }),
  toDef({
    id: "stalkerTalent",
    name: "Stalker Talent",
    minLevel: 10,
    summary:
      "Select a vigilante talent, treating yourself as a 10th-level stalker-specialization vigilante for choosing and using it regardless of actual rogue level; your sneak attack counts as a reduced-damage hidden strike for that talent's purposes.",
    contextNotes: [note("Can't apply hidden strike talents to your sneak attacks through this.")],
  }),
  toDef({
    id: "standUpUnchainedRogue",
    name: "Stand Up (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "Stand up from prone as a free action (still provoking if threatened), or as a swift action without provoking.",
  }),
  toDef({
    id: "stealTheStory",
    name: "Steal the Story",
    chainedOnly: true,
    summary:
      "After using Obfuscate Story, attempt another opposed Diplomacy check to further discredit the target, imposing a penalty on their Diplomacy and Intimidate checks against anyone who heard the story — equal to your highest of Intelligence, Wisdom, or Charisma bonus — until the target repairs their reputation.",
    contextNotes: [note("Requires the Obfuscate Story talent.")],
  }),
  toDef({
    id: "stealthStunt",
    name: "Stealth Stunt",
    chainedOnly: true,
    summary:
      "While benefiting from concealment, forgo an attack of opportunity to attempt a Stealth check against the provoking foe's CMD; success treats that foe as flat-footed against your next melee attack before your following turn ends.",
    contextNotes: [note("Requires training in Stealth (at least 1 rank).", "skill.ste")],
  }),
  toDef({
    id: "stealthySniper",
    name: "Stealthy Sniper",
    minLevel: 10,
    summary: "Take only a -10 penalty (instead of -20) on Stealth checks made to snipe.",
    contextNotes: [note("Scoped to sniping Stealth checks only.", "skill.ste")],
  }),
  toDef({
    id: "stemTheFlow",
    name: "Stem the Flow",
    chainedOnly: true,
    summary:
      "On a successful sneak attack against a creature that channels energy, forgo 3d6 points of sneak attack damage to prevent it from channeling energy for a number of rounds equal to half your rogue level.",
  }),
  toDef({
    id: "stonySkin",
    name: "Stony Skin",
    minLevel: 10,
    summary:
      "Gain DR 2/adamantine. Can be selected up to two more times, each adding 1 more point of DR.",
    changes: [{ formula: "2", target: "dr.adamantine", type: "untyped" }],
    contextNotes: [
      note(
        "Repeat selections (+1 DR each, up to +2 more) aren't tracked — the sheet applies the base DR 2.",
      ),
    ],
  }),
  toDef({
    id: "strongImpression",
    name: "Strong Impression",
    summary: "Gain Intimidating Prowess as a bonus feat.",
    grantsFeat: "intimidating prowess",
  }),
  toDef({
    id: "strongStroke",
    name: "Strong Stroke",
    summary:
      "Roll twice on Swim checks and take the better result (or a +2 insight bonus on both rolls if another effect already grants a reroll); when forced to take the worse of two rolls, roll only once for Swim checks instead.",
    contextNotes: [note("Scoped to Swim checks only.", "skill.swm")],
  }),
  toDef({
    id: "superiorSniper",
    name: "Superior Sniper",
    summary:
      "Gain Expert Sniper as a bonus feat — or, if you already have it, any feat that lists Expert Sniper as a prerequisite, provided you meet its other prerequisites.",
    contextNotes: [
      note(
        "Not auto-applied — the grant forks if you already have Expert Sniper; add the feat by hand.",
      ),
    ],
  }),
  toDef({
    id: "suppressPoison",
    name: "Suppress Poison",
    summary:
      "As an immediate action after failing a save against a poison, attempt that save again; success delays the poison's effect on you for a number of rounds equal to your Constitution modifier (minimum 1), though it still counts against the poison's duration.",
    contextNotes: [note("Only works against poisons with immediate onset.")],
  }),
  toDef({
    id: "surpriseAttackUnchainedRogue",
    name: "Surprise Attack (Unchained Rogue)",
    unchainedOnly: true,
    summary:
      "During the surprise round, every creature you attack counts as flat-footed even if it has already acted, and you add half your rogue level to sneak attack damage rolls made that round.",
  }),
  toDef({
    id: "swiftPoison",
    name: "Swift Poison",
    summary: "Apply poison to a weapon as a move action instead of a standard action.",
  }),
  toDef({
    id: "swiftTracker",
    name: "Swift Tracker",
    summary:
      "Follow tracks at your normal speed without penalty on Survival checks, and the penalty for tracking at up to double speed drops to -10.",
    contextNotes: [note("Scoped to Survival checks made while following tracks.", "skill.sur")],
  }),
  toDef({
    id: "swimmingStunt",
    name: "Swimming Stunt",
    chainedOnly: true,
    summary:
      "Once per round against an underwater foe eligible for sneak attack, attempt a free Swim check against its CMD; on a successful attack and check that deals sneak attack damage, forgo sneak attack dice to reduce the target's remaining breath-holding rounds by 1 round per die forgone.",
    contextNotes: [note("Requires training in Swim (at least 1 rank).", "skill.swm")],
  }),
  toDef({
    id: "terrainMastery",
    name: "Terrain Mastery",
    summary:
      "Gain a favored terrain as the ranger ability of the same name, though it doesn't scale with rogue level. Can be selected multiple times for additional terrains.",
  }),
  toDef({
    id: "theWholeTime",
    name: "The Whole Time",
    summary:
      "Use spell trigger and spell completion items as though invisibility, greater invisibility, and vanish were on your spell list. If a weapon or spell attack reveals you, sheathe your weapon as a free action and attempt an opposed Bluff or Disguise check to leave no obvious sign you were the attacker.",
  }),
  toDef({
    id: "thoughtfulReexamining",
    name: "Thoughtful Reexamining",
    chainedOnly: true,
    minLevel: 10,
    summary:
      "Once per day, reroll a failed Knowledge, Sense Motive, or Perception check to try for better information, any time later the same day.",
  }),
  toDef({
    id: "thrillOfTheChase",
    name: "Thrill of the Chase",
    summary:
      "During a chase or pursuit, gain one d20 reroll usable after seeing the original result but before it's revealed (must keep the second result), once per chase or per day during a pursuit; also gain Run as a bonus feat.",
    grantsFeat: "run",
  }),
  toDef({
    id: "toxicRegurgitation",
    name: "Toxic Regurgitation",
    summary:
      "Drink a non-inhaled poison as a standard action and suspend its effect within you (no saves needed) for a number of hours equal to your Constitution modifier (minimum 1), after which you must expel it or suffer its effects; while suspended, spit it at a creature within 10 feet as a ranged touch attack that exposes them to it as a contact poison. Only one poison can be suspended at a time.",
  }),
  toDef({
    id: "umbralGear",
    name: "Umbral Gear",
    summary:
      "As a standard action in dim light or darkness, conjure one quasi-real mundane item (crowbar, 50 feet of silk rope, glass cutter, a light weapon you're proficient with, a reversible cloak, thieves' tools, or a wire saw), usable for a total of 10 + your rogue level minutes per day in 1-minute increments. Can be selected multiple times for +10 minutes per day each; a second selection also adds masterwork/grappling-hook variants to the item list.",
  }),
  toDef({
    id: "unbalancingTrick",
    name: "Unbalancing Trick",
    summary:
      "Gain Improved Trip as a bonus feat, ignoring its prerequisites; at 6th rogue level, you're treated as meeting Greater Trip's prerequisites too (though you must still take the feat to gain its benefits).",
    grantsFeat: "improved trip",
  }),
  toDef({
    id: "underhandedTrick",
    name: "Underhanded Trick",
    summary:
      "Gain Improved Dirty Trick as a bonus feat, ignoring its prerequisites; at 6th rogue level, you're treated as meeting Greater Dirty Trick's prerequisites too (though you must still take the feat). If your dirty trick blinds a target, it can't remove that condition during the first round.",
    grantsFeat: "improved dirty trick",
  }),
  toDef({
    id: "unlockKi",
    name: "Unlock Ki",
    minLevel: 10,
    summary:
      "Increase your Ki Pool talent's points to 1/2 your rogue level plus your highest mental ability modifier; spend 2 ki points as a swift action to gain that skill's unlocks for one skill you have ranks in, lasting 1 minute.",
    contextNotes: [note("Requires the Ki Pool talent.")],
  }),
  toDef({
    id: "unwittingAlly",
    name: "Unwitting Ally",
    minLevel: 10,
    summary:
      "As a swift action, attempt a Bluff check opposed by a visible, listening foe's Sense Motive to make them act as an ally for flanking purposes until the start of your next turn; can't retry against the same foe for 24 hours, and failing by 5 or more locks out anyone who witnessed the attempt for 24 hours too.",
  }),
  toDef({
    id: "viciousClaws",
    name: "Vicious Claws",
    chainedOnly: true,
    summary:
      "Roll sneak attack damage using d8s instead of d6s when the sneak attack is made with your claws.",
    contextNotes: [note("Catfolk rogues only, and requires the cat's claws racial trait.")],
  }),
  toDef({
    id: "wallScramble",
    name: "Wall Scramble",
    summary:
      "Roll twice on Climb checks and take the better result (or a +2 insight bonus on both rolls if another effect already grants a reroll); when forced to take the worse of two rolls, roll only once for Climb checks instead.",
    contextNotes: [note("Scoped to Climb checks only.", "skill.clm")],
  }),
  toDef({
    id: "weaponSnatcher",
    name: "Weapon Snatcher",
    minLevel: 10,
    summary:
      "Use a Sleight of Hand check in place of the combat maneuver check when attempting to disarm an opponent.",
    contextNotes: [note("Scoped to the disarm maneuver only.", "skill.slt")],
  }),
  toDef({
    id: "wildMagic",
    name: "Wild Magic",
    summary:
      "Cast a chosen 0-level druid spell three times per day as a spell-like ability, at a caster level equal to your rogue level and a save DC of 10 + your Wisdom modifier.",
    contextNotes: [note("Requires Wisdom 10+.")],
  }),
  toDef({
    id: "withoutATrace",
    name: "Without a Trace",
    chainedOnly: true,
    summary:
      "When evasion or improved evasion lets you avoid damage, attempt to hide as an immediate action: a Stealth check at -20, gaining +1 per die of damage the attack would have dealt. Usable even while observed, as long as you have cover, concealment, or an ability permitting Stealth without them.",
  }),
];

export const ROGUE_TALENTS: Record<string, RogueTalentDef> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const ROGUE_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.rogueTalents` (see that type's doc comment) is
 * the FULL published catalog (234 entries after junk filtering), prose only.
 * The hand-authored table above stays authoritative for MECHANICS — this
 * section only merges the two for BROWSING (the picker) and for resolving a
 * picked id back to a definition, mirroring `rage-powers.ts`'s identical
 * "vendored catalog overlay" section (matching by NORMALIZED NAME,
 * hand-authored wins the collision).
 *
 * Collision audit (all 234 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every entry matches a vendored row — no `NAME_ALIASES`
 * needed, and the vendored-only fallback path only exists for future data
 * bumps. Three vendored SAME-NAME pairs can't be told apart by name and are
 * paired explicitly by vendored id instead (`ROGUE_TALENT_VENDORED_IDS`).
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see `rage-powers.ts`'s identical map. Empty: the full-catalog audit found no drift. */
const ROGUE_TALENT_NAME_ALIASES: Record<string, string> = {};

/**
 * Explicit hand-id → vendored-id pairings for the three vendored SAME-NAME
 * pairs (a chained/R_ or catfolk row and an Unchained/UR_ row that share the
 * literal `name`, unlike the "(Unchained Rogue)"-suffixed variants). Name
 * matching can't tell these apart, so they're paired by vendored id instead;
 * entries in this map are excluded from name matching entirely.
 */
const ROGUE_TALENT_VENDORED_IDS: Record<string, string> = {
  coaxInformation: "coax_information",
  coaxInformationUnchained: "coax_information_unchained_rogue",
  nimbleClimberCatfolk: "nimble_climber_catfolk",
  nimbleClimberUnchained: "nimble_climber",
  skillMastery: "skill_mastery",
  skillMasteryUnchained: "skill_mastery_unchained_rogue",
};

function normalizeTalentName(name: string): string {
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

/** A catalog entry the picker can browse — either the hand-authored def with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedRogueTalentEntry extends RogueTalentDef {
  nameSuffix?: string;
  /** Vendored grouping tag (see `RogueTalent`'s doc comment for the `R_`/`UR_`/`Advanced ` prefix conventions), when present. */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  sources?: SourceRef[];
}

function vendoredToDef(entry: RogueTalent): MergedRogueTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    summary: plainTextPreview(entry.description ?? ""),
    // Category-derived floor for a future-data-bump entry with no hand def
    // (same posture as alchemist-discoveries' vendored fallback).
    minLevel: /Advanced/.test(entry.category ?? "") ? 10 : 2,
    unchainedOnly: entry.category?.startsWith("UR_") || undefined,
    chainedOnly: entry.category?.startsWith("R_") || undefined,
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked rogue-talent id (`doc.build.rogueTalents` entries) to its
 * definition — hand-authored table first, falling back to the vendored
 * catalog for an id that only exists there. Used by `archetypes.ts` (the
 * Class Features list) instead of indexing `ROGUE_TALENTS` directly, so a
 * vendored-only pick resolves to a real (display-only) definition rather than
 * being silently dropped — mirrors `resolveRagePower`.
 */
export function resolveRogueTalent(id: string, refData: RefData): RogueTalentDef | undefined {
  const hand = ROGUE_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.rogueTalents?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id, but carrying the
 * vendored entry's prose/sources along for display) — mirrors
 * `mergedRagePowerCatalog` exactly. `!entry.displayOnly` marks which rows
 * have live mechanics for the picker's "M" badge (only Stony Skin sets it —
 * feat grants/slots are surfaced via their own picker tag instead; see file
 * doc comment).
 */
export function mergedRogueTalentCatalog(refData: RefData): MergedRogueTalentEntry[] {
  const handByNormName = new Map<string, RogueTalentDef>();
  const handByVendoredId = new Map<string, RogueTalentDef>();
  for (const t of TALENT_LIST) {
    const vendoredId = ROGUE_TALENT_VENDORED_IDS[t.id];
    if (vendoredId) handByVendoredId.set(vendoredId, t);
    else handByNormName.set(normalizeTalentName(ROGUE_TALENT_NAME_ALIASES[t.id] ?? t.name), t);
  }

  const vendored = Object.values(refData.rogueTalents ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedRogueTalentEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeTalentName(v.name);
    const handMatch =
      handByVendoredId.get(v.id) ??
      (seenNormNames.has(norm) ? undefined : handByNormName.get(norm));
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        category: v.category,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const t of TALENT_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}

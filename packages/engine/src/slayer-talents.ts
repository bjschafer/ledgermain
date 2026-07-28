/**
 * Clean-room PF1 slayer talent table (Advanced Class Guide + splatbooks,
 * issue #74's hand-table follow-up): hand-authored from the published rules
 * (verified against `legacy.aonprd.com`'s book-scoped ACG Slayer class page
 * for the core "Slayer Talents"/"Advanced Talents"/"Studied Target" class
 * features, and `aonprd.com`'s compiled "Talents - Slayer" index for the
 * splatbook-sourced entries), overlaid onto the full 43-entry vendored
 * catalog (`RefData.slayerTalents`) the same way `rage-powers.ts` grew its
 * overlay onto `RefData.ragePowers` — this file's previous state (a pure
 * "catalog from data, no mechanics" table, see git history) was deliberately
 * shaped to make this promotion a drop-in rather than a restructuring.
 *
 * Scope: ALL 43 vendored entries get a hand-authored `SlayerTalentDef` below
 * (unlike `rage-powers.ts`/`witch-hexes.ts`, which scope down to a curated
 * "core" subset of a much larger published catalog, the vendored slayer
 * talent list is small enough — 43 entries after junk filtering — to cover
 * completely in one pass).
 *
 * IDs deliberately reuse the vendored snake_case slug (`aligned_sneak_attack`,
 * `poison_use`, ...) rather than inventing new camelCase ids the way
 * `rage-powers.ts`/`witch-hexes.ts` do — UNLIKE those two files, this one
 * already shipped a live, vendored-only picker (`SlayerTalentPicker`) that
 * stores picks in `doc.build.slayerTalents` keyed by the vendored id. Reusing
 * the same ids means `resolveSlayerTalent`'s hand-table-first lookup resolves
 * an ALREADY-STORED pick from before this overlay existed without any
 * migration, and the id-vs-name double-match (see the overlay section below)
 * is redundant-by-construction rather than load-bearing — kept anyway for
 * consistency with the sibling files and as a safety net if a future
 * `refdata-update` ever reshuffles the vendored slugs.
 *
 * `category`/`nameSuffix` are copied verbatim from the vendored entry (not
 * re-derived) since the hand-authored table was built by reading the same
 * source data — `category` still drives `isAdvancedSlayerTalent` exactly as
 * before.
 *
 * Modelling posture (mirrors `witch-hexes.ts`/`rage-powers.ts`'s honesty
 * bar): the overwhelming majority of slayer talents are sneak-attack riders,
 * studied-target riders, or activated/situational abilities with no flat
 * always-on number — see the per-entry `contextNotes` below for the specific
 * reason each one stays `displayOnly`. Three well-documented blocker
 * categories recur constantly enough to name once here rather than
 * per-entry:
 *
 *   - **Studied Target riders** (Eternal Opposition, Marksman's Shot, Studied
 *     Ally, Swallow Reversal, ...): the slayer's own "Studied Target" class
 *     feature (a scaling bonus vs. a chosen foe, ACG p. 51) is not itself
 *     modeled as a toggle/buff anywhere in this engine — confirmed via the
 *     Nature Fang druid archetype's own extraction audit
 *     (`archetype-extracted/druid.ts`'s `druid:nature-fang:studied-target:1`
 *     entry, bucketed `subsystem`, "no Change-shaped number to extract").
 *     A rider on an unmodeled base mechanic has nothing to ride on, so it
 *     stays a note.
 *   - **Ally-targeted effects** (Studied Ally): the bonus lands on a
 *     creature OTHER than the slayer, same carve-out as `witch-hexes.ts`'s
 *     Ward entry — there's no reliable "apply to a chosen ally" Change
 *     target on this sheet.
 *   - **Sub-skill-scoped bonuses** (Sure Footing's Acrobatics-on-narrow-
 *     surfaces-only, Toxin Training's saves-vs-poison-targeting-one-ability-
 *     score-only): same near-miss shape as `rage-powers.ts`'s Raging Leaper/
 *     Superstition — an unconditional Change on the whole skill/save would
 *     overstate a bonus the rules scope to one specific use.
 *
 * Two entries clear the bar for a real, unconditional (formula-conditional,
 * not buff-gated) `Change` — no `activeWhenBuff` needed anywhere in this
 * table, since armor type and skill bonuses are ordinary build-time state,
 * not a toggled buff:
 *
 *   - **Foil Scrutiny**: a flat +2 on two NAMED (non-parameterized) skills,
 *     Bluff and Disguise — the accompanying Will-save-vs-mind-reading half is
 *     left as a note (save-vs-category-only, no target for that).
 *   - **Armored Marauder** / **Armored Swiftness**: both read `@armor.type`
 *     (0 none/1 light/2 med/3 heavy — `rolldata.ts`) to conditionally apply
 *     an `acpA`/`mDexA` reduction ONLY while heavy armor is actually worn,
 *     the same "formula reads the character's own state" shape the cookbook's
 *     oracle-curse Lame example uses. Armored Marauder's heavy-armor
 *     PROFICIENCY grant and Armored Swiftness's heavy-armor SPEED-PENALTY
 *     removal are both left as notes: proficiency isn't Change-shaped at
 *     all, and the heavy-armor speed penalty is a hardcoded rule in
 *     `compute.ts` (`armorSpeedPenalty`), not a Change any target could
 *     suppress — see `compute.ts`'s own Slow-and-Steady carve-out for the
 *     identical shape of gap.
 */

import type { Change, ContextNote, RefData, SlayerTalent, SourceRef } from "@pf1/schema";

/** True when a vendored talent's own `category` marks it as the 10th-level "Advanced" tier. */
export function isAdvancedSlayerTalent(category: string | undefined): boolean {
  return category?.startsWith("Advanced ") ?? false;
}

/** A hand-verified slayer-talent catalog entry. */
export interface SlayerTalentDef {
  id: string;
  name: string;
  nameSuffix?: string;
  category?: string;
  /** True for the 10th-level "Advanced Slayer Talents" tier — see `isAdvancedSlayerTalent`. */
  advanced: boolean;
  /** Earliest slayer level this talent can be selected at (1 = no extra prerequisite beyond having the class feature; 10 for every Advanced-tier entry; occasionally higher for a RAW-stated level prerequisite, e.g. Deadly Range/Jaguar's Grace at 4th). Soft-filtered only, never blocks. */
  minLevel: number;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Typed modifiers this talent grants — empty for most entries (see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (DC formula, prerequisite chain, why a related number isn't modeled). */
  contextNotes?: ContextNote[];
  /** True when this talent has no live `Change` — see file doc comment for the two exceptions. */
  displayOnly: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTalent {
  id: string;
  name: string;
  nameSuffix?: string;
  category?: string;
  minLevel?: number;
  summary: string;
  contextNotes?: ContextNote[];
  /** Real Changes — omitted/empty for every entry except Foil Scrutiny/Armored Marauder/Armored Swiftness, see file doc comment. */
  changes?: Change[];
}

function build(entries: RawTalent[]): SlayerTalentDef[] {
  return entries.map((e) => {
    const advanced = isAdvancedSlayerTalent(e.category);
    const changes = e.changes ?? [];
    return {
      id: e.id,
      name: e.name,
      nameSuffix: e.nameSuffix,
      category: e.category,
      advanced,
      minLevel: e.minLevel ?? (advanced ? 10 : 1),
      summary: e.summary,
      changes,
      contextNotes: e.contextNotes,
      displayOnly: changes.length === 0,
    };
  });
}

/**
 * `@armor.type` (0 none, 1 light, 2 med, 3 heavy — `rolldata.ts`) gate shared
 * by Armored Marauder/Armored Swiftness: both RAW-scope their bonus to heavy
 * armor specifically ("of any heavy armor the slayer wears"), unlike the
 * fighter's Armor Training (which applies to any worn armor) — so this reads
 * current gear state directly rather than an unconditional formula, the same
 * "formula reads the character's own roll data" shape as `oracle-curses.ts`'s
 * Lame curse.
 */
const IF_HEAVY_ARMOR_PER_6_LEVELS = "if(eq(@armor.type, 3), floor(@classes.slayer.level / 6), 0)";

const TALENT_LIST: SlayerTalentDef[] = build([
  {
    id: "aligned_sneak_attack",
    name: "Aligned Sneak Attack",
    nameSuffix: "(Su)",
    category: "Other Sneak Attack Talents",
    summary:
      "A sneak attack against a foe with alignment-based damage reduction chips away at that DR by an amount equal to the sneak attack dice rolled, until the end of your turn.",
  },
  {
    id: "armored_marauder",
    name: "Armored Marauder",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "Grants heavy armor proficiency, and reduces the armor check penalty of any heavy armor you wear by 1 per 6 slayer levels.",
    changes: [{ formula: IF_HEAVY_ARMOR_PER_6_LEVELS, target: "acpA", type: "untyped" }],
    contextNotes: [
      note(
        "The heavy armor proficiency grant itself isn't tracked as a proficiency on this sheet — only the ACP reduction (applied automatically while heavy armor is worn) is modeled.",
      ),
    ],
  },
  {
    id: "armored_swiftness",
    name: "Armored Swiftness",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "Lets you move at full speed in heavy armor, and raises the maximum Dexterity bonus of heavy armor you wear by 1 per 6 slayer levels. Requires Armored Marauder.",
    changes: [{ formula: IF_HEAVY_ARMOR_PER_6_LEVELS, target: "mDexA", type: "untyped" }],
    contextNotes: [
      note(
        "The heavy-armor land-speed penalty this talent removes is a hardcoded rule on this sheet (not a Change any target can suppress), so speed still shows reduced while wearing heavy armor — only the max-Dex increase is modeled. Also requires the Armored Marauder talent (not enforced as a hard prerequisite here).",
        "landSpeed",
      ),
    ],
  },
  {
    id: "assassinate",
    name: "Assassinate",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "After spending a full round studying a target, a sneak attack against it while flat-footed can outright kill it unless it makes a Fortitude save; a target that saves is immune to your Assassinate for 24 hours.",
    contextNotes: [
      note(
        "Fortitude save DC = 10 + 1/2 slayer level + Int modifier. Automatically fails if the target recognizes you as an enemy — GM-judged, not tracked here.",
      ),
    ],
  },
  {
    id: "blood_reader",
    name: "Blood Reader",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "While you can see a living studied target, you always know its exact current hit points.",
  },
  {
    id: "castling",
    name: "Castling",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Soft cover from a creature your size or larger counts as full cover for you — but it still doesn't let you attempt Stealth checks off of it.",
  },
  {
    id: "catfolk_rogue_talent",
    name: "Catfolk Rogue Talent",
    category: "Other Talents",
    summary:
      "Catfolk only: take one of four catfolk-specific rogue talents (deadly scratch, graceful faller, nimble climber, or vicious claws) in place of a slayer talent; level-based effects use your slayer level.",
  },
  {
    id: "deadly_range",
    name: "Deadly Range",
    nameSuffix: "(Ex)",
    category: "Other Sneak Attack Talents",
    minLevel: 4,
    summary:
      "Extends the range at which you can deal sneak attack damage by 10 feet; can be taken more than once, stacking each time. Requires slayer level 4+.",
    contextNotes: [note("No sneak-attack-range target on this sheet to auto-apply the +10 ft to.")],
  },
  {
    id: "eternal_opposition",
    name: "Eternal Opposition",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "Samsaran only: while your studied target is a dragon, fey, outsider, or undead, gain a +2 insight bonus to AC against its attacks and on saves against its abilities.",
    contextNotes: [
      note(
        "Rides on Studied Target, which isn't modeled as a toggle on this sheet (see file doc comment), and is further scoped to one specific foe's creature type — apply manually while the condition holds.",
        "ac",
      ),
    ],
  },
  {
    id: "experience_across_ages",
    name: "Experience Across Ages",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Samsaran only: once per day (plus one more use per 5 slayer levels), spend a swift action to make a Knowledge check as though you had ranks equal to your slayer level.",
  },
  {
    id: "extra_earthcraft",
    name: "Extra Earthcraft",
    category: "Other Talents",
    summary: "Grants 2 additional earthcraft points per day. Requires the earthcraft ability.",
    contextNotes: [note("Earthcraft is a resource pool this app doesn't track at all yet.")],
  },
  {
    id: "focused_poison",
    name: "Focused Poison",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    minLevel: 6,
    summary:
      "Trade away future studied-target capacity to sharpen your poisons: for each additional studied target you give up, poisons used against your CURRENT studied target gain +1 DC. Requires slayer level 6+ and Poison Use.",
    contextNotes: [note("Rides on Studied Target (not modeled) and poison DCs (not tracked).")],
  },
  {
    id: "foil_scrutiny",
    name: "Foil Scrutiny",
    category: "Other Talents",
    summary:
      "Grants a +2 bonus on Bluff and Disguise checks, plus a +2 bonus on Will saves to resist mind-reading effects such as detect thoughts or discern lies.",
    changes: [
      { formula: "2", target: "skill.blf", type: "untyped" },
      { formula: "2", target: "skill.dis", type: "untyped" },
    ],
    contextNotes: [
      note(
        "The Will-save bonus is scoped to mind-reading effects only, not every Will save — no target for a saves-vs-a-category-only bonus, so apply it manually.",
        "will",
      ),
    ],
  },
  {
    id: "fortified_position",
    name: "Fortified Position",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Whenever you gain a bonus on Reflex saves from cover, you gain an equal bonus on Fortitude saves.",
    contextNotes: [note("Cover isn't tracked as sheet state, so this can't be auto-applied.")],
  },
  {
    id: "graceful_athlete",
    name: "Graceful Athlete",
    category: "Other Talents",
    summary: "Grants Graceful Athlete as a bonus feat (its prerequisites still apply).",
    contextNotes: [
      note("Feat grant — add Graceful Athlete to Feats by hand if prerequisites are met."),
    ],
  },
  {
    id: "inured_to_terror",
    name: "Inured to Terror",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Samsaran only: as an immediate action after failing a fear save, retry it to step the effect down a rank (panicked to frightened, frightened to shaken, or shaken to unaffected). Also raises the DC of Intimidate checks made to demoralize you by 2.",
    contextNotes: [
      note(
        "The reroll-and-downgrade mechanic and the raised demoralize DC (a bonus to an opponent's DC, not to your own roll) aren't Change-shaped.",
      ),
    ],
  },
  {
    id: "jaguars_grace",
    name: "Jaguar's Grace",
    nameSuffix: "(Ex)",
    category: "Other Sneak Attack Talents",
    minLevel: 4,
    summary:
      "Drop the usual -4 penalty for dealing nonlethal damage with a normally-lethal weapon, and sneak attack damage can be dealt nonlethally this way. Requires slayer level 4+.",
  },
  {
    id: "jaguars_pounce",
    name: "Jaguar's Pounce",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "On a successful sneak attack, immediately attempt a disarm or trip combat maneuver as an immediate action as though the target were flat-footed, without provoking an attack of opportunity. Requires Jaguar's Grace.",
  },
  {
    id: "jaguars_protection",
    name: "Jaguar's Protection",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "A foe you deal sneak attack damage to takes a -2 penalty on attack rolls against anyone but you, for 1 minute. Requires Jaguar's Pounce.",
    contextNotes: [
      note("The penalty lands on the ENEMY's future attack rolls against others — not this sheet."),
    ],
  },
  {
    id: "marksmans_shot",
    name: "Marksman's Shot",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "As an attack action, make a single ranged attack at your highest attack bonus against your studied target; a sneak attack that hits doubles its sneak attack dice.",
    contextNotes: [note("Rides on Studied Target, not modeled as a toggle on this sheet.")],
  },
  {
    id: "mountainside_ambush",
    name: "Mountainside Ambush",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "Samsaran only: a sneak attack from higher ground (while standing on solid ground) against a target unaware of you deals maximum sneak attack damage instead of a roll.",
  },
  {
    id: "mystic_veil",
    name: "Mystic Veil",
    nameSuffix: "(Sp)",
    category: "Other Talents",
    summary:
      "Samsaran only: cast silent image as a spell-like ability once per 2 slayer levels per day (caster level = slayer level); concentration checks use Intelligence, and the disbelieve DC is 11 + Int modifier. Requires Intelligence 11+.",
  },
  {
    id: "one_of_those_faces",
    name: "One of Those Faces",
    nameSuffix: "(Sp)",
    category: "Other Talents",
    summary:
      "Use disguise self as a spell-like ability for up to 10 minutes per character level each day, spent in 10-minute increments; once used, you keep the same alternate appearance for the next 24 hours.",
  },
  {
    id: "poison_use",
    name: "Poison Use",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "You're trained enough with poison that you can't accidentally poison yourself while applying it to a weapon.",
  },
  {
    id: "ranger_combat_style",
    name: "Ranger Combat Style",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Pick a ranger combat style and gain one of its feats, ignoring the feat's normal prerequisites; taking this talent again at 6th and 10th level unlocks that style's higher-level feat lists.",
  },
  {
    id: "reaping_stalker",
    name: "Reaping Stalker",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "Any sickle or scythe you wield is treated as one size category larger for its damage dice, and its critical threat range widens by 1 (doesn't stack with other threat-range boosts).",
    contextNotes: [
      note("No weapon-damage-die-size target on this sheet to apply the size step to."),
    ],
  },
  {
    id: "recall_training",
    name: "Recall Training",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Samsaran only: once per day, spend a move action to gain the benefit of a combat feat you don't have for 1 minute per slayer level (you must otherwise meet its prerequisites).",
  },
  {
    id: "redirect_poison",
    name: "Redirect Poison",
    category: "Other Talents",
    summary:
      "When a creature's poisoned attack against you misses, spend an immediate action to attempt redirecting that poison onto a creature within your reach instead (manufactured weapons only, not natural attacks).",
  },
  {
    id: "rogue_and_ninja_advanced_talents",
    name: "Rogue and Ninja Advanced Talents",
    category: "Advanced Slayer Talents",
    summary:
      "Take an advanced rogue talent or ninja master trick in place of a slayer advanced talent; can be selected multiple times for different picks, but never the same one twice.",
  },
  {
    id: "rogue_talent",
    name: "Rogue Talent",
    category: "Other Talents",
    summary:
      "Take a talent from the shared rogue-talent list in place of a slayer talent (rogue-level-based effects use your slayer level); can be taken multiple times for different picks.",
  },
  {
    id: "scrying_familiarity",
    name: "Scrying Familiarity",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Roll twice and keep the better result on saves against scrying effects, on Perception checks to notice a scrying sensor, and on caster level checks to beat your spell resistance with a scrying effect; spotting a sensor lets you attempt Stealth against the caster's caster level check to avoid detection.",
    contextNotes: [note("A roll-twice-keep-better mechanic isn't Change-shaped on this sheet.")],
  },
  {
    id: "sever_alignment",
    name: "Sever Alignment",
    nameSuffix: "(Su)",
    category: "Primary Sneak Attack Talents",
    summary:
      "Forgo sneak attack damage against a foe with an alignment subtype to instead force a Fortitude save that, on a failure, strips its alignment-based damage reduction and regeneration. Requires Aligned Sneak Attack.",
    contextNotes: [note("Fortitude save DC = 10 + 1/2 slayer level + Int modifier.")],
  },
  {
    id: "slayer_camouflage",
    name: "Slayer Camouflage",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "Use Stealth to hide in any of your favored terrains, even where the terrain grants no cover or concealment. Requires the terrain mastery rogue talent.",
    contextNotes: [note("Favored terrain isn't tracked as sheet state here.")],
  },
  {
    id: "slowing_strike",
    name: "Slowing Strike",
    nameSuffix: "(Ex)",
    category: "Primary Sneak Attack Talents",
    summary:
      "A foe damaged by your sneak attack has one of its movement speeds halved for 1d4 rounds (Fortitude negates); against a flier, its maneuverability also drops a step and it risks falling if airborne.",
    contextNotes: [note("Fortitude save DC = 10 + 1/2 slayer level + Int modifier.")],
  },
  {
    id: "sticks_and_stones",
    name: "Sticks and Stones",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary: "Grants Catch Off-Guard as a bonus feat.",
    contextNotes: [note("Feat grant — add Catch Off-Guard to Feats by hand.")],
  },
  {
    id: "studied_ally",
    name: "Studied Ally",
    nameSuffix: "(Ex)",
    category: "Studied Target Talents",
    summary:
      "Spend a move action (a move or swift action at 7th level) to study a friendly creature instead of an enemy, gaining a scaling bonus on checks/attack rolls to aid another on their behalf. Counts against your normal studied-target limit.",
    contextNotes: [
      note(
        "Rides on Studied Target (not modeled) and the bonus lands on an ALLY's rolls, not yours — no reliable ally-targeted Change here.",
      ),
    ],
  },
  {
    id: "sunlight_strike",
    name: "Sunlight Strike",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "As a swift action, reflect sunlight (or another bright light source) into an adjacent foe's eyes, dazzling it for 1 round.",
  },
  {
    id: "sure_footing",
    name: "Sure Footing",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "+5 bonus on Acrobatics checks made to move across narrow surfaces or loose/uneven ground.",
    contextNotes: [
      note(
        "Scoped to narrow-surface/uneven-ground movement checks only, not all of Acrobatics (which also covers jump/balance/tumble) — an unconditional Change on the whole skill would overstate it, so apply manually.",
        "skill.acr",
      ),
    ],
  },
  {
    id: "swallow_reversal",
    name: "Swallow Reversal",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "As an attack action, make a single melee attack against your studied target at your highest base attack bonus, rolling twice and keeping the higher result; usable at will, but only once per day against any given target.",
    contextNotes: [note("Rides on Studied Target, not modeled as a toggle on this sheet.")],
  },
  {
    id: "toxin_training",
    name: "Toxin Training",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    minLevel: 4,
    summary:
      "Pick an ability score: gain a +4 bonus on saves against poisons that deal damage to it. Can be taken multiple times, each time for a different ability score. Requires slayer level 4+ and Poison Use.",
    contextNotes: [
      note(
        "Scoped to saves against poisons targeting one specific ability score, not saves in general — no target for a saves-vs-a-category-only bonus, same as Superstition/Witch Hunter in this app's rage-power table.",
        "fort",
      ),
    ],
  },
  {
    id: "trapfinding",
    name: "Trapfinding",
    category: "Other Talents",
    summary:
      "Adds Disable Device to your class skill list, and grants the rogue's trapfinding and trap sense abilities, using your slayer level as your effective rogue level.",
    contextNotes: [
      note(
        "Trapfinding/trap sense are an unmodeled subsystem in this app (no Perception-vs-traps or AC/Reflex-vs-traps bonus anywhere), and the class-skill grant isn't wired for slayer talents either — both stay manual.",
      ),
    ],
  },
  {
    id: "unbalancing_trick",
    name: "Unbalancing Trick",
    nameSuffix: "(Ex)",
    category: "Other Talents",
    summary:
      "Grants Improved Trip as a bonus feat even without its prerequisites; at 6th level you're also treated as meeting Greater Trip's prerequisites (you must still take the feat itself for its benefits).",
    contextNotes: [note("Feat grant — add Improved Trip to Feats by hand.")],
  },
  {
    id: "woodland_stride",
    name: "Woodland Stride",
    nameSuffix: "(Ex)",
    category: "Advanced Slayer Talents",
    summary:
      "Move through natural undergrowth (thorns, briars, overgrown terrain) at your normal speed without taking damage or suffering any other impairment. Magically-manipulated terrain still affects you as normal.",
  },
]);

export const SLAYER_TALENTS: Record<string, SlayerTalentDef> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const SLAYER_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74: `RefData.slayerTalents` (see that type's doc comment) is the
 * FULL published catalog (43 entries after junk filtering), prose only. The
 * hand-verified table above stays authoritative for MECHANICS — this section
 * only merges the two for BROWSING (the picker) and for resolving a picked id
 * back to a definition (`collect.ts`/`archetypes.ts`), mirroring
 * `witch-hexes.ts`'s `mergedWitchHexCatalog`/`resolveWitchHex` exactly.
 *
 * Matching is by NORMALIZED NAME (same convention as every sibling overlay),
 * though in practice every hand-authored id here IS the vendored id already
 * (see file doc comment), so `resolveSlayerTalent`'s id-first lookup and this
 * name match agree for all 43 entries — verified during authoring, not
 * merely assumed. `SLAYER_TALENT_NAME_ALIASES` is empty for the same reason
 * `RAGE_POWER_NAME_ALIASES`/`HEX_NAME_ALIASES` start empty: kept as a place
 * for a FUTURE hand-authored addition (a new splatbook talent) to record any
 * drift, should one ever occur.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const SLAYER_TALENT_NAME_ALIASES: Record<string, string> = {};

function normalizeTalentName(name: string): string {
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
export interface MergedSlayerTalentEntry extends SlayerTalentDef {
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredTalentToDef(entry: SlayerTalent): MergedSlayerTalentEntry {
  const advanced = isAdvancedSlayerTalent(entry.category);
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    advanced,
    minLevel: advanced ? 10 : 1,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked slayer-talent id (`doc.build.slayerTalents` entries) to
 * its definition — hand-authored table first (mechanics-authoritative),
 * falling back to the vendored catalog for an id that only exists there (a
 * future vendored addition not yet hand-authored). Used by `collect.ts`
 * (modifier collection) and `archetypes.ts` (the Class Features list).
 */
export function resolveSlayerTalent(id: string, refData: RefData): SlayerTalentDef | undefined {
  const hand = SLAYER_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.slayerTalents?.[id];
  return vendored ? vendoredTalentToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id/category, but carrying
 * the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today, see
 * file doc comment — the fallback exists for a future addition).
 * `!entry.displayOnly` marks which rows carry live mechanics, for the
 * picker's "M" badge (same convention as `mergedRagePowerCatalog`).
 */
export function mergedSlayerTalentCatalog(refData: RefData): MergedSlayerTalentEntry[] {
  const handByNormName = new Map<string, SlayerTalentDef>();
  for (const t of TALENT_LIST) {
    handByNormName.set(normalizeTalentName(SLAYER_TALENT_NAME_ALIASES[t.id] ?? t.name), t);
  }

  const usedHandIds = new Set<string>();
  const merged: MergedSlayerTalentEntry[] = [];
  for (const v of Object.values(refData.slayerTalents ?? {})) {
    const handMatch = handByNormName.get(normalizeTalentName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredTalentToDef(v));
    }
  }
  for (const t of TALENT_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}

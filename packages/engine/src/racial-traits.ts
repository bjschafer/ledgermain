/**
 * Clean-room PF1 alternate racial traits table (DESIGN §6): hand-authored from
 * the published rules (Advanced Race Guide / core races, Inner Sea Races for
 * the Sylph "Mostly Human" alternate, public SRD/OGL content) — alternate
 * racial traits are NOT part of the vendored Foundry data pack (only each
 * race's *standard* traits are, as `Race.changes`/`Race.contextNotes`), so
 * there is no upstream JSON to normalize. Same posture as
 * `traits.ts`/`bloodlines.ts`/`tables.ts` for content the compendium doesn't
 * carry.
 *
 * What an alternate racial trait does: it swaps one or more of a race's
 * STANDARD traits for an alternate. In this engine that is two operations,
 * both gated on the trait being active (`build.racialTraits`) AND its `race`
 * matching the character's current race (a stale id from a race change gets
 * nothing — see `collect.ts`):
 *
 *   1. Apply the alternate's own `changes[]` through the normal
 *      `collectModifiers` pipeline (identical to how `Race.changes`, traits,
 *      and bloodline powers flow).
 *   2. Suppress the replaced standard trait's *structured* race change via
 *      `suppressTargets` — the set of `Race.changes` targets to drop while this
 *      trait is active. For the seven core races the swappable standard traits
 *      are structured `changes` (Human's `bonusFeats`/`bonusSkillRanks`,
 *      Keen Senses' `skill.per`, Intimidating's `skill.int`, Sure-Footed's
 *      `skill.acr`+`skill.clm`), so suppressing by target keeps every computed
 *      number correct.
 *
 * Modelling notes / deliberate limitations (mirror `traits.ts`):
 *   - Standard traits that are `Race.contextNotes` rather than `changes` (all
 *     of Dwarf's swappable traits: Stonecunning, Hardy, Greed, Hatred,
 *     Defensive Training, Stability; Elf's Elven Magic; Gnome's Defensive
 *     Training/Hatred) carry no computed number, so there is nothing for
 *     `suppressTargets` to drop — those alternates are surfaced as options
 *     with their own `contextNotes`, and `replaces` records the swap for the
 *     UI. The race's standard-trait reminders (`Race.contextNotes`) render on
 *     the sheet via `raceContextNotesFor`, so the alternates that replace a
 *     note-only standard trait carry `suppressNotes` (see {@link
 *     AlternateRacialTrait.suppressNotes} and {@link
 *     effectiveRaceContextNotes} below) to drop the retired note rather than
 *     leave it showing alongside the replacement.
 *   - Benefits that are a feat grant (Focused Study's Skill Focus chain,
 *     Ancestral Arms' weapon proficiency, Shaman's Apprentice's Endurance)
 *     carry `displayOnly: true` with a `contextNotes` reminder rather than a
 *     flat always-on number that would over-apply — the same bar `traits.ts`
 *     uses. A bonus scoped to a category of effects (Eternal Hope's "+2 vs
 *     fear and despair", Steel Soul's "+4 vs spells") is instead a real
 *     `Change` carrying `saveCategories`, which keeps it off the headline
 *     save while still computing the situational total.
 *   - Speed-changing alternates that ADD to base speed (Sylph Like the Wind:
 *     +5 ft) go through the normal pipeline via the engine's `landSpeed`
 *     change target — `compute.ts`'s `applySpeedTarget` folds any additive
 *     `landSpeed` modifier onto `Race.speeds.land` alongside fly/swim/climb/
 *     burrow, the same mechanism feats/buffs already use for speed boosts.
 *     Speed-changing alternates that instead REPLACE the tabled base speed
 *     outright (Halfling Fleet of Foot: reset to 30 ft, a no-op for Halflings
 *     but relevant for subraces/size changes) remain deliberately omitted:
 *     base speed is read straight off `Race.speeds`, and there's no delta to
 *     express with a `Change` for a flat override — that needs new machinery
 *     (e.g. a `set` operator honored here, mirroring the `set` handling
 *     `applySpeedTarget` already does for other sources) and is left for a
 *     follow-up rather than bundled into this table.
 *
 * Scope: the seven core races (Human, Half-Elf, Half-Orc, Elf, Dwarf, Gnome,
 * Halfling), plus the Sylph (owner plays one — ARG/Inner Sea Races). The
 * table is pure data; extending it to further non-core races is additive.
 *
 * Map key / id: a stable `${race-slug}-${trait-slug}` string, used directly as
 * the `build.racialTraits` entry and `RACIAL_TRAITS[id]` lookup.
 */

import type { CharacterDoc, Change, ContextNote, Race, RefData } from "@pf1/schema";

export interface AlternateRacialTrait {
  /** Stable slug, e.g. "human-focused-study". */
  id: string;
  /**
   * The race this trait belongs to, by NAME (matches the existing race-by-name
   * precedent in `model/race.ts`/`model/feats.ts`; the engine keys races by an
   * opaque id but their display name is the stable human-facing handle). Only
   * applied when it equals the character's current race name.
   */
  race: string;
  name: string;
  /** Short rules summary shown in the picker. */
  summary: string;
  /**
   * Standard trait name(s) this alternate replaces — display strings used both
   * to show the swap in the UI and to detect conflicts (two chosen alternates
   * that replace the same standard trait, see `model/racialTraits.ts`).
   */
  replaces: string[];
  /** Typed modifiers granted by the alternate (empty when purely prose/situational). */
  changes: Change[];
  /**
   * `Race.changes` targets to drop while this alternate is active — the
   * structured standard trait(s) being swapped out. Omitted when the replaced
   * standard trait is a contextNote (no computed number to suppress).
   */
  suppressTargets?: string[];
  /**
   * Substrings to match against `Race.contextNotes[].text` for the replaced
   * standard trait(s) — dropped from {@link effectiveRaceContextNotes} while
   * this alternate is active. Race contextNotes carry no stable id in the
   * vendored data, just `target` + free-text `text` (see
   * `packages/schema/src/primitives.ts` `ContextNote`), and `target` alone
   * isn't reliably 1:1 with a standard trait within a race (e.g. Gnome's
   * Illusion Resistance and Defensive Training notes could plausibly collide
   * on a shared target in a future data update) — a substring unique to the
   * replaced trait's actual vendored wording is the more robust match. Omitted
   * when the replaced standard trait is a structured `Change` (nothing in
   * `Race.contextNotes` to suppress) or has no vendored contextNote at all.
   */
  suppressNotes?: string[];
  /** Non-mechanical reminders (situational scope, feat grants, class-skill grants). */
  contextNotes?: ContextNote[];
  /** True when the alternate has no flat modifier the static sheet applies. */
  displayOnly?: boolean;
  /**
   * A limited-use pool the alternate grants (Sylph's Storm in the Blood: 2 hp
   * of fast healing per level per day). `resources.ts`'s `deriveResourcePools`
   * turns this into a tracker row, the same way a class feature's
   * `uses.maxFormula` or a feat's becomes one. Omitted for every alternate
   * whose benefit is always-on or unmetered.
   */
  resourcePool?: RacialTraitResourcePool;
}

/**
 * A per-day (or per-whatever) pool granted by an alternate racial trait —
 * hand-authored alongside the trait, since alternates aren't vendored and so
 * carry no `uses.maxFormula` to read (see the module doc comment).
 */
export interface RacialTraitResourcePool {
  /** Max uses, evaluated against character-level roll data (`@attributes.hd.total`, `@abilities.*`). */
  usesFormula: string;
  /** Recharge period, e.g. "day". */
  per?: string;
  /** One-line sub-label for the tracker row: what a use buys, and what a "use" counts. */
  detail?: string;
}

const c = (formula: string, target: string, type = "racial"): Change => ({
  formula,
  target,
  type,
});

const TRAIT_LIST: AlternateRacialTrait[] = [
  // ── Human ──────────────────────────────────────────────────────────────────
  {
    id: "human-focused-study",
    race: "Human",
    name: "Focused Study",
    summary:
      "Gain Skill Focus as a bonus feat at 1st, 8th, and 16th level (in place of the human bonus feat).",
    replaces: ["Bonus Feat"],
    changes: [],
    suppressTargets: ["bonusFeats"],
    displayOnly: true,
    contextNotes: [
      { target: "bonusFeats", text: "Skill Focus at 1st, 8th, and 16th level (choose the skill)." },
    ],
  },
  {
    id: "human-eye-for-talent",
    race: "Human",
    name: "Eye for Talent",
    summary:
      "+2 racial bonus on Sense Motive checks; a chosen companion/cohort/etc. gains +2 to one ability score (in place of the bonus feat).",
    // ARG: "This racial trait replaces the bonus feat trait." (The vendored
    // pack's own entry agrees.)
    replaces: ["Bonus Feat"],
    changes: [c("2", "skill.sen")],
    suppressTargets: ["bonusFeats"],
    contextNotes: [
      {
        target: "skill.sen",
        text: "Companion creature (animal companion, cohort, familiar, etc.) gains +2 to one ability score.",
      },
    ],
  },
  {
    id: "human-heart-of-the-wilderness",
    race: "Human",
    name: "Heart of the Wilderness",
    summary:
      "+1/2 racial bonus per Hit Die on Survival; +5 racial bonus on Constitution checks to stabilize and to avoid death from negative HP (in place of the extra skill rank).",
    replaces: ["Skilled"],
    changes: [c("floor(@attributes.hd.total / 2)", "skill.sur")],
    suppressTargets: ["bonusSkillRanks"],
    contextNotes: [
      {
        target: "skill.sur",
        text: "+5 racial on Con checks to stabilize when dying and to avoid death from negative HP.",
      },
    ],
  },

  // ── Half-Elf ───────────────────────────────────────────────────────────────
  {
    id: "half-elf-ancestral-arms",
    race: "Half-Elf",
    name: "Ancestral Arms",
    summary:
      "Proficiency with one martial or exotic weapon, or one combat-oriented feat, at 1st level (in place of the adaptability bonus feat).",
    replaces: ["Adaptability"],
    changes: [],
    suppressTargets: ["bonusFeats"],
    displayOnly: true,
    contextNotes: [
      {
        target: "bonusFeats",
        text: "Proficiency with one martial/exotic weapon (or one combat feat) chosen at creation.",
      },
    ],
  },
  {
    id: "half-elf-dual-minded",
    race: "Half-Elf",
    name: "Dual Minded",
    summary: "+2 racial bonus on Will saving throws (in place of the multitalented trait).",
    // Also disables the multitalented second-favored-class benefit — see
    // model/race.ts:isMultitalented, which checks for this trait.
    replaces: ["Multitalented"],
    changes: [c("2", "will")],
  },

  // ── Half-Orc ───────────────────────────────────────────────────────────────
  {
    id: "half-orc-sacred-tattoo",
    race: "Half-Orc",
    name: "Sacred Tattoo",
    summary: "+1 luck bonus on all saving throws (in place of orc ferocity).",
    replaces: ["Orc Ferocity"],
    changes: [c("1", "allSavingThrows", "luck")],
  },
  {
    id: "half-orc-shamans-apprentice",
    race: "Half-Orc",
    name: "Shaman's Apprentice",
    summary: "Gain Endurance as a bonus feat (in place of the intimidating trait).",
    replaces: ["Intimidating"],
    changes: [],
    suppressTargets: ["skill.int"],
    displayOnly: true,
    contextNotes: [{ target: "bonusFeats", text: "Gain Endurance as a bonus feat." }],
  },
  {
    id: "half-orc-toothy",
    race: "Half-Orc",
    name: "Toothy",
    summary:
      "Protruding tusks grant a bite attack (1d4, primary natural attack) (in place of the intimidating trait).",
    replaces: ["Intimidating"],
    changes: [],
    suppressTargets: ["skill.int"],
    displayOnly: true,
    contextNotes: [
      { target: "attack", text: "Bite attack: 1d4 damage, treated as a primary natural attack." },
    ],
  },

  // ── Elf ────────────────────────────────────────────────────────────────────
  {
    id: "elf-fleet-footed",
    race: "Elf",
    name: "Fleet-Footed",
    summary:
      "Gain Run as a bonus feat and +2 racial bonus on initiative checks (in place of keen senses and elven magic).",
    replaces: ["Keen Senses", "Elven Magic"],
    changes: [c("2", "init")],
    suppressTargets: ["skill.per"],
    // Elven Magic is the vendored Elf's only contextNote-only standard trait —
    // all three of its Race.contextNotes entries (save vs enchantment/sleep
    // immunity, Spellcraft to identify items, caster level vs SR) go away with
    // it.
    suppressNotes: ["Enchantment Effects", "Identify Magic Items", "overcome Spell Resistance"],
    contextNotes: [{ target: "init", text: "Gain Run as a bonus feat." }],
  },
  {
    id: "elf-urbanite",
    race: "Elf",
    name: "Urbanite",
    summary:
      "+2 racial bonus on Diplomacy to gather information and on Sense Motive to get a hunch about a social situation (in place of keen senses).",
    replaces: ["Keen Senses"],
    changes: [],
    suppressTargets: ["skill.per"],
    displayOnly: true,
    contextNotes: [
      {
        target: "skill.dip",
        text: "+2 racial on Diplomacy to gather information and Sense Motive to get a social hunch (situational — not auto-applied).",
      },
    ],
  },
  {
    id: "elf-dreamspeaker",
    race: "Elf",
    name: "Dreamspeaker",
    summary:
      "+1 to the saving-throw DC of sleep and dream spells you cast; dream spell-like ability 1/day (in place of elven magic).",
    replaces: ["Elven Magic"],
    changes: [],
    displayOnly: true,
    // See elf-fleet-footed above: Elven Magic's three vendored contextNotes,
    // all dropped.
    suppressNotes: ["Enchantment Effects", "Identify Magic Items", "overcome Spell Resistance"],
    contextNotes: [
      {
        target: "cl",
        text: "+1 save DC for sleep/dream spells; cast dream as a spell-like ability 1/day (caster level = character level).",
      },
    ],
  },

  // ── Gnome ──────────────────────────────────────────────────────────────────
  {
    id: "gnome-gift-of-tongues",
    race: "Gnome",
    name: "Gift of Tongues",
    summary:
      "+1 racial bonus on Bluff and Diplomacy; learn one new language each time you gain a rank in Linguistics (in place of defensive training and hatred).",
    replaces: ["Defensive Training", "Hatred"],
    changes: [c("1", "skill.blf"), c("1", "skill.dip")],
    // Defensive Training ("Dodge vs Giants") and Hatred ("vs Humanoids
    // (Reptillian, Goblinoid)") are the two vendored Gnome contextNotes this
    // replaces. Gnome's third contextNote (Illusion Resistance, "vs Illusion
    // Effects") is a DIFFERENT standard trait this alternate doesn't touch —
    // matched by substring, not by the shared `allSavingThrows`/`ac` targets,
    // so it's never accidentally dropped.
    suppressNotes: ["Dodge vs Giants", "Humanoids (Reptillian, Goblinoid)"],
  },
  {
    id: "gnome-eternal-hope",
    race: "Gnome",
    name: "Eternal Hope",
    summary:
      "+2 racial bonus on saves vs fear and despair; 1/day reroll a natural 1 before the result is revealed (in place of defensive training and hatred).",
    replaces: ["Defensive Training", "Hatred"],
    changes: [
      {
        target: "allSavingThrows",
        type: "racial",
        formula: "2",
        saveCategories: ["fear", "despair"],
      },
    ],
    // See gnome-gift-of-tongues above.
    suppressNotes: ["Dodge vs Giants", "Humanoids (Reptillian, Goblinoid)"],
    contextNotes: [
      {
        target: "allSavingThrows",
        text: "1/day reroll a natural 1 (take the new roll).",
      },
    ],
  },

  // ── Halfling ───────────────────────────────────────────────────────────────
  {
    id: "halfling-outrider",
    race: "Halfling",
    name: "Outrider",
    summary: "+2 racial bonus on Ride and Handle Animal checks (in place of sure-footed).",
    replaces: ["Sure-Footed"],
    changes: [c("2", "skill.rid"), c("2", "skill.han")],
    suppressTargets: ["skill.acr", "skill.clm"],
  },
  {
    id: "halfling-practicality",
    race: "Halfling",
    name: "Practicality",
    summary:
      "+2 racial bonus on Sense Motive and on any one Craft or Profession; +2 racial on saves vs illusions (in place of fearless and sure-footed).",
    // ARG: "This racial trait replaces fearless and sure-footed." Fearless is
    // the race's "+2 Racial vs Fear" contextNote, hence the suppressNotes.
    replaces: ["Fearless", "Sure-Footed"],
    changes: [
      c("2", "skill.sen"),
      { target: "allSavingThrows", type: "racial", formula: "2", saveCategories: ["illusion"] },
    ],
    suppressTargets: ["skill.acr", "skill.clm"],
    suppressNotes: ["vs Fear"],
    contextNotes: [
      {
        target: "allSavingThrows",
        text: "+2 racial on one chosen Craft or Profession skill.",
      },
    ],
  },

  // ── Dwarf
  // ────────────────────────────────────────────────────────────────── Dwarf's
  // swappable standard traits are all Race.contextNotes (no computed number),
  // so these alternates carry no `suppressTargets` — they surface the choice
  // and their own reminders; `replaces` records the swap. Each DOES carry
  // `suppressNotes`: Dwarf's six vendored contextNotes are each a distinct
  // standard trait with a unique target (Stability/cmd,
  // Stonecunning/skill.per, Defensive Training/ac, Hardy/allSavingThrows,
  // Greed/skill.apr, Hatred/attack), so a substring drawn from each note's own
  // wording is enough to identify the one being replaced.
  {
    id: "dwarf-lorekeeper",
    race: "Dwarf",
    name: "Lorekeeper",
    summary:
      "+2 racial bonus on Knowledge (history) checks about dwarves and their enemies, usable untrained (in place of greed).",
    replaces: ["Greed"],
    changes: [],
    displayOnly: true,
    suppressNotes: ["Appraise Items with Gems"], // Greed
    contextNotes: [
      {
        target: "skill.khi",
        text: "+2 racial on Knowledge (history) about dwarves/dwarven enemies, always usable untrained (narrow — not auto-applied).",
      },
    ],
  },
  {
    id: "dwarf-steel-soul",
    race: "Dwarf",
    name: "Steel Soul",
    summary:
      "Retain the +2 vs poison but gain +4 racial bonus on saves against spells and spell-like abilities (in place of the hardy trait).",
    replaces: ["Hardy"],
    changes: [
      { target: "allSavingThrows", type: "racial", formula: "2", saveCategories: ["poison"] },
      { target: "allSavingThrows", type: "racial", formula: "4", saveCategories: ["spell", "sla"] },
    ],
    suppressNotes: ["Poisons, Spells and Spell-likes"], // Hardy
  },
  {
    id: "dwarf-rock-stepper",
    race: "Dwarf",
    name: "Rock Stepper",
    summary:
      "Ignore difficult terrain created by rubble, broken ground, or steep stairs when taking a 5-foot step (in place of stonecunning).",
    replaces: ["Stonecunning"],
    changes: [],
    displayOnly: true,
    suppressNotes: ["Notice Unusual Stonework"], // Stonecunning
    contextNotes: [
      {
        target: "landSpeed",
        text: "Ignore difficult terrain from rubble, broken ground, and uneven stone when taking a 5-foot step.",
      },
    ],
  },

  // ── Sylph (ARG / Inner Sea Races) ───────────────────────────────────────────
  // None of the four swappable standard traits below (Energy Resistance,
  // Spell-Like Ability, Air Affinity, Type) carry a vendored `Race.changes` OR
  // `Race.contextNotes` entry for the Sylph (its `changes[]` is just the
  // Dex/Int/Con ability adjustments, `contextNotes` is empty) — the compendium
  // models them only as prose in `Race.description`. So, same as the Dwarf
  // section above, there is nothing structured to suppress; `replaces` alone
  // records the swap for the UI/conflict-detection.
  {
    id: "sylph-like-the-wind",
    race: "Sylph",
    name: "Like the Wind",
    summary: "+5 ft racial bonus to base speed (in place of electricity resistance 5).",
    replaces: ["Energy Resistance"],
    changes: [c("5", "landSpeed")],
  },
  {
    id: "sylph-whispering-wind",
    race: "Sylph",
    name: "Whispering Wind",
    summary: "+4 racial bonus on Stealth checks (in place of the feather fall spell-like ability).",
    replaces: ["Spell-Like Ability"],
    changes: [c("4", "skill.ste")],
  },
  {
    id: "sylph-storm-in-the-blood",
    race: "Sylph",
    name: "Storm in the Blood",
    summary:
      "Fast healing 2 for 1 round whenever you take electricity damage, up to 2 hp per level per day (in place of air affinity).",
    replaces: ["Air Affinity"],
    changes: [],
    displayOnly: true,
    contextNotes: [
      {
        target: "fastHealing",
        text: "Fast healing 2 for 1 round when taking electricity damage (whether or not resistance absorbs it), up to 2 hp/level/day (situational — not auto-applied).",
      },
    ],
    // The daily cap is measured in hit points healed, not activations (ARG:
    // "up to a maximum number of hit points equal to twice your character
    // level"), so a use here is 1 hp — a typical trigger heals 2 and spends 2.
    resourcePool: {
      usesFormula: "2 * @attributes.hd.total",
      per: "day",
      detail: "Fast healing 2 for 1 round when you take electricity damage · 1 use = 1 hp healed",
    },
  },
  {
    id: "sylph-mostly-human",
    race: "Sylph",
    name: "Mostly Human",
    summary:
      "Counts as both a humanoid (human) and an outsider (native) for all purposes, at the cost of automatic Auran (in place of the standard type/subtype/languages).",
    replaces: ["Type", "Languages"],
    changes: [],
    displayOnly: true,
    contextNotes: [
      {
        target: "type",
        text: "Type/subtype becomes humanoid (human) and outsider (native) simultaneously (affected by both, e.g. charm person and enlarge person); no longer automatically knows Auran (may still choose it as a bonus language with sufficient Int).",
      },
    ],
  },
];

/** All alternate racial traits, keyed by id (stable `${race}-${trait}` slug). */
export const RACIAL_TRAITS: Readonly<Record<string, AlternateRacialTrait>> = Object.fromEntries(
  TRAIT_LIST.map((t) => [t.id, t]),
);

/**
 * The alternate racial traits available to a given race, by race NAME
 * (`Race.name`). Returns `[]` for races with no authored alternates.
 */
export function alternateRacialTraitsForRace(raceName: string): AlternateRacialTrait[] {
  return TRAIT_LIST.filter((t) => t.race === raceName);
}

/* --------------------------------------------- race contextNotes */

/**
 * `race.contextNotes`, minus any dropped by an active alternate racial
 * trait's `suppressNotes`, and minus any dropped by an active VENDORED
 * alternate whose replaced standard trait has a verified entry in
 * {@link VENDORED_STANDARD_TRAIT_NOTES} — the contextNotes analogue of how
 * `collectModifiers` drops a `Race.changes` entry whose target is in an
 * active alternate's `suppressTargets`/`vendoredTraitSuppressTargets`.
 * `activeVendoredTraits` takes the minimal shape `vendoredTraitSuppressTargets`
 * already accepts (name + `replacedTraitNames`) rather than the full
 * `RacialTrait`, so a caller with only that much on hand doesn't need to look
 * anything else up. Defaults to `[]` so the hand-authored-only call sites
 * (and the existing tests) don't need to pass it.
 */
export function effectiveRaceContextNotes(
  race: Race | undefined,
  activeTraits: readonly AlternateRacialTrait[],
  activeVendoredTraits: readonly { name: string; replacedTraitNames: string[] }[] = [],
): ContextNote[] {
  if (!race) return [];
  const suppressedFragments = [
    ...activeTraits.flatMap((t) => t.suppressNotes ?? []),
    ...activeVendoredTraits.flatMap((t) => vendoredTraitSuppressNoteFragments(t, race.name)),
  ];
  if (suppressedFragments.length === 0) return race.contextNotes;
  return race.contextNotes.filter(
    (cn) => !suppressedFragments.some((fragment) => cn.text.includes(fragment)),
  );
}

/**
 * Convenience wrapper around {@link effectiveRaceContextNotes} that resolves
 * both "the character's currently-active alternate racial traits for their
 * race" (same `doc.build.racialTraits` -> `RACIAL_TRAITS` -> filter-by-
 * current-race lookup `collectModifiers` and {@link hasSlowAndSteady} each do
 * inline) AND, when `refData` is given, their active VENDORED picks the same
 * way `collectModifiers` resolves `activeVendoredTraits` — factored out here
 * so a UI consumer doesn't have to reimplement either lookup. `refData` is
 * optional (and the vendored half is skipped without it) so existing
 * hand-authored-only callers keep compiling unchanged.
 */
export function raceContextNotesFor(
  doc: CharacterDoc,
  race: Race | undefined,
  refData?: RefData,
): ContextNote[] {
  if (!race) return [];
  const activeTraits = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is AlternateRacialTrait => t != null && t.race === race.name);
  const activeVendoredTraits = refData
    ? (doc.build.vendoredRacialTraits ?? [])
        .map((id) => refData.racialTraits[id])
        .filter((t): t is NonNullable<typeof t> => t != null && t.race.includes(race.name))
    : [];
  return effectiveRaceContextNotes(race, activeTraits, activeVendoredTraits);
}

/* ---------------------------------------------------- slow and steady */

/**
 * Creature subtypes whose standard racial traits include "Slow and Steady"
 * (d20pfsrd, core rule, clean-room): "base speed is never modified by armor
 * or encumbrance." In the vendored 80-race slice this is exactly Dwarf and
 * Duergar — both carry `dwarf` in `Race.creatureSubtypes`, and their
 * `Race.description` prose confirms the trait (no other race in the slice
 * has it). Keying off the subtype rather than a hardcoded race-name list
 * means any future dwarf-subtype race added to the vendored data inherits
 * this automatically, matching how the subtype grants the trait per RAW.
 */
const SLOW_AND_STEADY_SUBTYPES: ReadonlySet<string> = new Set(["dwarf"]);

/**
 * Virtual `suppressTargets` entry an alternate racial trait can use to swap
 * away Slow and Steady, disabling the armor/encumbrance exemption below. Not
 * a real `Change` target — Slow and Steady isn't modeled as a `Race.changes`
 * entry (it's baked directly into `Race.speeds.land` reading 20 instead of
 * 30), so `collectModifiers` never sees it; only {@link hasSlowAndSteady}
 * reads it. No alternate in `TRAIT_LIST` swaps it away today (Dwarf's
 * published alternates — Lorekeeper, Steel Soul, Rock Stepper, etc. — replace
 * Greed/Hardy/Stonecunning instead, never Slow and Steady), but the hook
 * exists so a future one can flip it off without new machinery.
 */
export const SLOW_AND_STEADY_SUPPRESS_TARGET = "slowAndSteady";

/** True when `race` carries the Slow and Steady trait (armor/encumbrance-immune base speed). */
export function raceHasSlowAndSteady(race: Race | undefined): boolean {
  return !!race && race.creatureSubtypes.some((s) => SLOW_AND_STEADY_SUBTYPES.has(s));
}

/**
 * True when any of `traits` (a character's currently-active alternate racial
 * traits for their race) has swapped away Slow and Steady. Split out from
 * {@link hasSlowAndSteady} as its own pure function so the suppression
 * mechanism is unit-testable independent of `RACIAL_TRAITS` lookup — no
 * published Dwarf alternate currently sets this (see the constant's doc
 * comment above), so this is otherwise unexercised by real data today.
 */
export function slowAndSteadySuppressedBy(traits: readonly AlternateRacialTrait[]): boolean {
  return traits.some((t) => t.suppressTargets?.includes(SLOW_AND_STEADY_SUPPRESS_TARGET));
}

/**
 * True when `doc`'s race has Slow and Steady and no active alternate racial
 * trait has swapped it away — i.e. `compute.ts`'s armor-weight-class and
 * (optional) encumbrance land-speed reductions should both be skipped.
 * `race` is the already-resolved `refData.races[doc.identity.race]` (may be
 * `undefined` for a stale/unknown race id, same posture as `collectModifiers`).
 */
export function hasSlowAndSteady(doc: CharacterDoc, race: Race | undefined): boolean {
  if (!raceHasSlowAndSteady(race)) return false;
  const activeRacialTraits = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is AlternateRacialTrait => t != null && t.race === race!.name);
  return !slowAndSteadySuppressedBy(activeRacialTraits);
}

/* -------------------------------------------------- flexible ability +2 --- */

/**
 * Virtual `suppressTargets`/`VENDORED_STANDARD_TRAIT_TARGETS` entry an
 * alternate racial trait can use to retire the flexible +2 ability bonus
 * (Human/Half-Elf/Half-Orc's player-chosen `doc.identity.flexibleAbility`,
 * granted by `tables.ts`'s `raceGrantsFlexibleAbility`). Not a real `Change`
 * target, same posture as {@link SLOW_AND_STEADY_SUPPRESS_TARGET} above: the
 * flexible +2 is pushed directly in `collect.ts` from
 * `doc.identity.flexibleAbility` rather than a `Race.changes` entry (there is
 * no vendored target to suppress by name), so only that push site reads this
 * sentinel out of the `suppressed` set — never `evalChange`.
 */
export const FLEXIBLE_ABILITY_SUPPRESS_TARGET = "flexibleAbility";

/* ------------------- vendored alternate-trait suppression ------ */

/**
 * Verified mapping from a race's STANDARD trait name (as it appears in the
 * vendored catalog's `RacialTrait.replacedTraitNames`) to the `Race.changes`
 * targets that standard trait contributes — audited by hand against
 * `races.json`'s change lists exactly like the core-race `suppressTargets`
 * audit above. `collect.ts` uses this to drop a replaced standard trait's
 * structured bonus while a vendored alternate that names it is active, so
 * e.g. an Aasimar taking Deathless Spirit stops showing Celestial
 * Resistance's acid/cold/electricity 5 alongside it.
 *
 * Deliberately unmapped names, recorded here so the next audit doesn't
 * re-litigate them:
 *   - "Base Statistics" is safe to map ONLY for a race where every entry
 *     naming it carries a real replacement ability array — suppressing the
 *     standard ability changes with nothing landing would zero the
 *     character's racial modifiers instead of swapping them, worse than the
 *     double-count it prevents. The mapped races (Tiefling/Aasimar/Dhampir
 *     heritages, the four geniekin soul lines, Skinwalker's nine "-Kin")
 *     get their arrays from `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` in
 *     `@pf1/data-pipeline`, hand-transcribed from each entry's own prose
 *     with a verbatim drift guard; the "-Kin" entries transcribe only the
 *     always-on pair, their "+2 X while shapechanged" tail staying prose.
 *     Everywhere else "Base Statistics" is the pack's generic tag for a
 *     regional/cultural BUNDLE with no ability content at all — Elf and
 *     Dwarf's twenty ARG/Heroes-from-the-Fringe regional variants, Gnome's
 *     seven, Halfling's five, Half-Orc's five, Half-Elf's bundles, and the
 *     two Outsear entries are recommendation lists ("these elves often have
 *     the X and Y alternate traits") or pure lore, verified against the
 *     published text: nothing replaces the array, so those races must NOT
 *     map the key. Goblin's "Base Statistics" (Oversized Goblins) stays
 *     unmapped for a third reason: its own `changes` (`size` +1, `str` +4,
 *     `dex` -2) don't even match its own prose ("+2 Str, +2 Dex, -2 Cha") —
 *     a vendored data inconsistency, not a clean swap, so it's left alone
 *     rather than risk compounding it. One Changeling wrinkle of the same
 *     kind, recorded for the next audit: the Winter-Born (Snow May) BUNDLE's
 *     prose says "+2 Int, +2 Cha, -2 Con" while its "Ability Modifiers
 *     (Changeling - Snow May)" sibling (the entry that actually applies)
 *     ships +2 Int/+2 Wis/-2 Con — unresolved against the printed book, and
 *     the bundles are inert either way (their "Base Statistics" key is
 *     deliberately unmapped for Changeling; the siblings suppress via the
 *     "Ability Modifiers (" prefix inference).
 *   - Human's picker-visible swaps name "Bonus Feat" and "Skilled", both
 *     mapped (the race's only structured changes). Its "+2 to One Ability
 *     Score" standard trait has no `Race.changes` entry to suppress (the
 *     builder's point-buy owns it), and its "Base Statistics" entries are
 *     bundle tags like everyone else's.
 *   - Prose-only standard traits (Spell-Like Ability, Fiendish Sorcery,
 *     Swordtrained, Natural Weapon, Kitsune Magic, Swarming, Rodent Empathy,
 *     Light Sensitivity, Languages, Subtype/Type, Fire/Earth/Water/Air
 *     Affinity, Cat's Luck, Change Shape, Verdant Burst, Pass without Trace,
 *     Plantspeech, Poison Use, Shadow Blending, Ferocity, Weapon
 *     Familiarity, Elemental Assault, Blood Frenzy, Speak with Sharks, Ink
 *     Cloud, Tentacle Sense, Frenzy, Seasoned, Lifebound, Nanite Surge,
 *     Ganzi Oddity, Water Dependent, Amphibious, Swamp Stride, Slapping
 *     Tail, Shadow Magic, Light and Dark, Seed, Ghoran's Natural Magic
 *     (which the pack's `replacedTraitNames` misspell "Nature Magic"),
 *     Past-Life Knowledge / Past Life Knowledge and Kasatha's Stalker
 *     (class-skill grants), Aphorite's Skilled and Samsaran's Shards of the
 *     Past (player-chosen skills, no fixed target), Half-Elf's Multitalented,
 *     Elf Blood, and Bonus Languages, and Half-Orc's Orc Ferocity and Orc
 *     Blood): no structured change to drop. Fetchling's "Shadowy Resistance" belongs here too despite
 *     naming a resistance in prose (cold/electricity 5) — this vendored
 *     slice carries no `eres.cold`/`eres.electricity` change for Fetchling
 *     at all, so there's nothing to suppress. Suli's "Energy Resistance" is
 *     the same story: the published trait grants acid/cold/electricity/fire
 *     5, but Suli's vendored `Race.changes` carry no `eres.*` at all.
 *   - Ratfolk "Slow Speed" (Surface Sprinter), Goblin "Fast Movement",
 *     Hobgoblin "Normal Speed", Catfolk "Sprinter", Wyvaran "Flight",
 *     Vanara "Normal Speed" (its climb speed), Locathah "Fast Swimmer" and
 *     "Slow Speed", Merfolk "Slow Speed" (Strongtail), Trox "Burrow":
 *     base/bonus speed reads off `Race.speeds`, not a change target.
 *     Alternates that state their own new speeds (Tree Stranger, Strongtail,
 *     Secret Magic, Strong Limbs) ship `set`-operator `landSpeed`/
 *     `swimSpeed` changes that already override correctly on their own.
 *   - Ratfolk "Tinker"'s Craft (alchemy) half and Kobold "Crafty"'s Craft
 *     (trapmaking)/Profession (miner) halves: the vendored race changes only
 *     carry the Perception (and, for Ratfolk, UMD) half as a structured
 *     target, so that's what suppression can honestly drop. Same
 *     partial-halves shape: Ghoran "Delicious" (the Escape Artist -2 is
 *     structured, the CMB-to-escape-grapples half has no target), Nagaji
 *     "Serpent's Sense" (Perception is structured, the vs.-reptiles Handle
 *     Animal half is a contextNote), Duskwalker "Ward against Corruption"
 *     (the undeath-transform immunity is structured, the +2 save vs.
 *     negative energy/death effects is a contextNote).
 *   - Duergar "Stability" and Vine Leshy "Unassuming Foliage": both are
 *     modeled as a `Race.contextNotes` line (+4 CMD vs. bull rush/trip;
 *     +4 Stealth in forests), not a `Race.changes` entry — this suppression
 *     mechanism only reaches `changes` targets, so it can't touch either.
 *     Also contextNotes-only, audited the same way: Gillman "Enchantment
 *     Resistance", Grippli "Camouflage", Strix "Nocturnal" and "Suspicious",
 *     Wayang "Shadow Resistance", Nagaji "Resistant", Syrinx "Nocturnal" and
 *     "Pride", Svirfneblin "Hatred", Aquatic Elf "Elven Magic", and
 *     "Aphorite Resistances" (whose electricity resistance 5 is folded into
 *     the same save note rather than an `eres` change).
 *   - Drow "Spell Resistance": the vendored `Race` record carries no `sr`
 *     field at all (SR isn't modeled as a structured value anywhere in this
 *     slice), so there is nothing for suppression to drop; alternates that
 *     name it (Daylight Adaptation, Champion of Dark Powers, Poison Minion)
 *     have no numeric effect on SR either way.
 *   - Skinwalker "Spell-Like Ability (Skinwalker)" / "Change Shape
 *     (Skinwalker)" (named by every heritage's Alternate Spell-Like Ability /
 *     Change Shape variant): prose-only, as is the "+2 to one physical
 *     ability score while shapechanged" rider, which has no structured
 *     representation at all. The nine "…-Kin" heritage bundles replace "Base
 *     Statistics" (the rule above), and Beast Talker's `replacedTraitNames`
 *     is a prose fragment ("alters the change shape and spell-like ability
 *     racial traits") no name-keyed lookup can match — harmless, since both
 *     traits it alters are prose-only anyway.
 *   - Changeling "Claws", "Sea Lungs", "Hulking Changeling", "Green Widow",
 *     "Hag Trait", and "Hag Racial Trait (Changeling)" (the pack's collective
 *     name for the baked-in one-of-nine hag heritage trait): all prose-only —
 *     the base race's structured changes are just abilities + natural armor +
 *     darkvision.
 *   - Gathlain "Spell-Like Abilities" / "Spell-Like Ability" / "Feather Step
 *     Spell-Like Ability": prose-only. The pack names the same standard speed
 *     trait three different ways ("Racial Fly Speed", "Speed", "Normal Speed
 *     (Gathlain)"), but all are unreachable regardless: base land/fly speed
 *     reads off `Race.speeds`, and the alternates' own `set`-operator
 *     `landSpeed`/`flySpeed` changes already override it in
 *     `applySpeedTarget`. The one residual wart is Sticky Tendrils, whose
 *     prose trades flight away entirely but whose vendored changes never
 *     touch `flySpeed` — a picked Sticky Tendrils gathlain incorrectly keeps
 *     fly 40 ft., and suppression has no target to fix that with.
 *
 * Two names are intentional aliases for the same real trait rather than
 * separate ones: Drow's "Keen Sight" (named by Ambitious Schemer) is the
 * vendored pack's own literal text for what its description note calls "a
 * likely reference to the Keen Senses (Drow) trait" — both keys point at the
 * same `skill.per` target. Likewise Drow's "Darkvision" (named by Surface
 * Infiltrator) is this race's actual "Superior Darkvision" trait; the pack
 * just doesn't say "Superior" there, unlike Duergar's Daysighted which does.
 *
 * One outright pack mislabel, harmless either way: Strix Wing-Clipped's
 * `replacedTraitNames` say "Normal Speed", but the published text replaces
 * Suspicious (verified on two mirrors; there is no speed-replacement
 * language at all). Neither key would suppress anything — Suspicious is
 * contextNotes-only and base speed isn't a change target — so the wrong
 * label costs nothing, but don't mistake it for a real speed swap.
 *
 * Vine Leshy's "Ability Scores" (named by Agile) is the one heritage-shaped
 * exception to the Base Statistics rule above: unlike every other race's
 * empty-`changes` heritage bundle, Agile ships a real, internally consistent
 * full replacement (`dex` +2, `wis` +2, `int` -2 in place of `con` +2,
 * `wis` +2, `int` -2) — safe to suppress because there's a genuine
 * replacement landing, not a zeroed-out gap.
 *
 * Two more verified full-replacement exceptions of the same shape:
 *
 * Changeling's ten "Ability Modifiers (Changeling - <Hag> May)" heritage
 * entries (Blood of the Coven) each ship a complete three-change ability
 * array (e.g. Brine May: `dex` +2, `wis` +2, `con` -2) — and they MUST
 * suppress the base array, because they're typed `untyped` rather than
 * `racial` and would otherwise sum with it outright (+4 Cha for most Mays)
 * instead of merely double-displaying. They ship an empty
 * `replacedTraitNames`, so `vendoredTraitSuppressTargets` infers the
 * "Ability Score Modifiers" key from the `"Ability Modifiers ("` name prefix
 * (a Changeling-only naming pattern in this slice), the same way it infers
 * `"Skilled ("` heritage entries.
 *
 * Gathlain's Tree-Born names "Constitution Penalty" + "Speed", but its
 * vendored bundle is designed as a full ability-array replacement: its own
 * changes re-supply `cha` +2 and `dex` +2 alongside the speed sets, and its
 * description note tells the player to remove the base ability modifiers
 * wholesale. So "Constitution Penalty" maps to the whole base trio
 * (`cha`/`con`/`dex`) — suppress all three, let the bundle's own pair land,
 * and the net effect is exactly the published "no Constitution penalty,
 * slower speeds." Mapping only `con` would instead double-display Cha/Dex
 * (and double-count Dex, whose replacement is typed `base`, not `racial`).
 *
 * Half-Elf and Half-Orc's "Ability Score Modifiers" key is a different shape
 * again: neither race's flexible +2 is a `Race.changes` entry at all (it's
 * `doc.identity.flexibleAbility`, pushed directly in `collect.ts` — see
 * {@link FLEXIBLE_ABILITY_SUPPRESS_TARGET}), so there is no real target to
 * suppress. The key instead names that sentinel, gating the flexible-+2 push
 * itself rather than dropping a `Race.changes` entry. Verified against the
 * two vendored entries that name it: Half-Elf's Kindred-Raised ("This
 * racial trait replaces the half-elf's usual racial ability score
 * modifiers, as well as adaptability, elven immunities, keen senses, and
 * multitalented.") and Half-Orc's Orc Atavism ("This racial trait replaces
 * the half-orc's usual racial ability score modifiers, as well as
 * intimidating, orc blood, and orc ferocity."). Human's flexible +2 is the
 * same shape under a different vendored literal, "+2 to One Ability Score"
 * (named by Dual Talent and Versatile Human: "This racial trait replaces
 * the +2 bonus to any one ability score, the bonus feat, and the skilled
 * traits."), so that key carries the sentinel too.
 */
export const VENDORED_STANDARD_TRAIT_TARGETS: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  Aasimar: {
    Skilled: ["skill.dip", "skill.per"],
    "Celestial Resistance": ["eres.acid", "eres.cold", "eres.electricity"],
    Darkvision: ["sensedv"],
    "Base Statistics": ["cha", "wis"],
  },
  Tiefling: {
    Skilled: ["skill.blf", "skill.ste"],
    "Fiendish Resistance": ["eres.cold", "eres.electricity", "eres.fire"],
    Darkvision: ["sensedv"],
    "Base Statistics": ["cha", "dex", "int"],
  },
  Dhampir: {
    Manipulative: ["skill.blf", "skill.per"],
    Darkvision: ["sensedv"],
    "Low-Light Vision": ["sensell"],
    "Base Statistics": ["cha", "con", "dex"],
  },
  Kitsune: {
    Agile: ["skill.acr"],
    "Ability Score Modifiers": ["cha", "dex", "str"],
    "Low-Light Vision": ["sensell"],
  },
  Ratfolk: {
    Tinker: ["skill.per", "skill.umd"],
    Darkvision: ["sensedv"],
  },
  Tengu: {
    Sneaky: ["skill.per", "skill.ste"],
    "Gifted Linguist": ["skill.lin"],
    "Low-Light Vision": ["sensell"],
  },
  Ifrit: {
    "Energy Resistance": ["eres.fire"],
    "Base Statistics": ["cha", "dex", "wis"],
  },
  Oread: {
    "Energy Resistance": ["eres.acid"],
    "Base Statistics": ["cha", "str", "wis"],
  },
  Undine: {
    "Energy Resistance": ["eres.cold"],
    Darkvision: ["sensedv"],
    "Base Statistics": ["dex", "str", "wis"],
  },
  Drow: {
    "Drow Immunities": ["immEffect.magicSleep"],
    "Keen Senses": ["skill.per"],
    "Keen Sight": ["skill.per"],
    Darkvision: ["sensedv"],
  },
  Kobold: {
    Armor: ["nac"],
    Crafty: ["skill.per"],
    Darkvision: ["sensedv"],
  },
  Duergar: {
    "Duergar Immunities": ["immEffect.paralysis", "immEffect.phantasms", "immEffect.poison"],
    "Superior Darkvision": ["sensedv"],
  },
  Hobgoblin: {
    Sneaky: ["skill.ste"],
    Darkvision: ["sensedv"],
  },
  Goblin: {
    Skilled: ["skill.rid", "skill.ste"],
  },
  Fetchling: {
    Skilled: ["skill.kpl", "skill.ste"],
    "Low-Light Vision": ["sensell"],
  },
  Catfolk: {
    "Natural Hunter": ["skill.per", "skill.ste", "skill.sur"],
    "Low-Light Vision": ["sensell"],
  },
  "Vine Leshy": {
    Climber: ["skill.clm"],
    Darkvision: ["sensedv"],
    "Low-Light Vision": ["sensell"],
    "Ability Scores": ["int", "con", "wis"],
  },
  Skinwalker: {
    "Animal-Minded": ["skill.han"],
    "Base Statistics": ["int", "wis"],
  },
  Human: {
    "Bonus Feat": ["bonusFeats"],
    Skilled: ["bonusSkillRanks"],
    "+2 to One Ability Score": [FLEXIBLE_ABILITY_SUPPRESS_TARGET],
  },
  "Half-Elf": {
    Adaptability: ["bonusFeats"],
    "Keen Senses": ["skill.per"],
    "Elven Immunities": ["immEffect.magicSleep"],
    "Low-Light Vision": ["sensell"],
    "Ability Score Modifiers": [FLEXIBLE_ABILITY_SUPPRESS_TARGET],
  },
  "Half-Orc": {
    Intimidating: ["skill.int"],
    Darkvision: ["sensedv"],
    "Ability Score Modifiers": [FLEXIBLE_ABILITY_SUPPRESS_TARGET],
  },
  Changeling: {
    "Ability Score Modifiers": ["cha", "con", "wis"],
    "Natural Armor": ["nac"],
  },
  Gathlain: {
    "Natural Armor": ["nac"],
    "Low-Light Vision": ["sensell"],
    // Tree-Born's full-replacement bundle — see the module doc comment.
    "Constitution Penalty": ["cha", "con", "dex"],
  },
  Sylph: {
    "Energy Resistance": ["eres.electricity"],
    "Base Statistics": ["con", "dex", "int"],
  },
  Ghoran: {
    "Natural Armor": ["nac"],
    // The Escape Artist half only — see the partial-halves note above.
    Delicious: ["skill.esc"],
  },
  Wyvaran: {
    Darkvision: ["sensedv"],
  },
  Vanara: {
    Nimble: ["skill.acr", "skill.ste"],
  },
  Locathah: {
    "Low-Light Vision": ["sensell"],
    "Natural Armor": ["nac"],
  },
  Shabti: {
    "Immune to Undeath": ["immEffect.undeath"],
  },
  Merfolk: {
    "Low-Light Vision": ["sensell"],
    Armor: ["nac"],
  },
  Suli: {
    "Low-Light Vision": ["sensell"],
  },
  Wyrwood: {
    Darkvision: ["sensedv"],
    "Low-Light Vision": ["sensell"],
  },
  Wayang: {
    Lurker: ["skill.per", "skill.ste"],
  },
  Duskwalker: {
    // The undeath-immunity half only — see the partial-halves note above.
    "Ward against Corruption": ["immEffect.undeath"],
    Skilled: ["skill.hea", "skill.kre"],
  },
  "Aquatic Elf": {
    "Elven Immunities": ["immEffect.magicSleep"],
    "Low-Light Vision": ["sensell"],
    "Keen Senses": ["skill.per"],
  },
  Vishkanya: {
    "Keen Senses": ["skill.per"],
    "Low-Light Vision": ["sensell"],
    // The pack's name for the Escape Artist half of Limber.
    "Escape Artist Racial Bonus": ["skill.esc"],
  },
  Svirfneblin: {
    Skilled: ["skill.ste", "skill.crf", "skill.per"],
    Fortunate: ["allSavingThrows"],
  },
  Nagaji: {
    // The Perception half only — see the partial-halves note above.
    "Serpent's Sense": ["skill.per"],
  },
};

/**
 * The standard trait name(s) `trait` replaces, resolved the same way for both
 * {@link vendoredTraitSuppressTargets} and
 * {@link vendoredTraitSuppressNoteFragments} — shared so the two heritage
 * inferences below aren't kept in sync by hand across both functions.
 *
 * Two inferences beyond `replacedTraitNames`, both for heritage-variant
 * entries that ship with an EMPTY `replacedTraitNames` (the pack models a
 * heritage as a bundle of nameless swaps):
 *
 *   - A name starting with `"Skilled ("` (and the dhampir pack's `"Alternate
 *     Skill Modifiers"` spelling, which DOES carry `replacedTraitNames`) is
 *     that heritage's replacement for the race's standard Skilled modifiers.
 *     Without this, picking a heritage's Skilled variant double-counts both
 *     skill pairs.
 *   - A name starting with `"Ability Modifiers ("` (the Changeling hag-May
 *     heritages, this slice's only use of that prefix) is that heritage's
 *     complete replacement ability array — see the map doc comment above for
 *     why these must suppress (their `untyped` changes would SUM with the
 *     base `racial` ones).
 */
function resolveReplacedTraitNames(trait: {
  name: string;
  replacedTraitNames: string[];
}): string[] {
  if (trait.replacedTraitNames.length > 0) return trait.replacedTraitNames;
  if (trait.name.startsWith("Skilled (")) return ["Skilled"];
  if (trait.name.startsWith("Ability Modifiers (")) return ["Ability Score Modifiers"];
  return [];
}

/**
 * The `Race.changes` targets a picked vendored alternate suppresses for
 * `raceName`, per the verified mapping above — empty for an unmapped race or
 * an alternate that only replaces prose traits.
 */
export function vendoredTraitSuppressTargets(
  trait: { name: string; replacedTraitNames: string[] },
  raceName: string,
): string[] {
  const raceMap = VENDORED_STANDARD_TRAIT_TARGETS[raceName];
  if (!raceMap) return [];
  return resolveReplacedTraitNames(trait).flatMap((name) => [...(raceMap[name] ?? [])]);
}

/* ------------------- vendored alternate-trait note suppression ------ */

/**
 * Verified mapping from a race's STANDARD trait name (as it appears in the
 * vendored catalog's `RacialTrait.replacedTraitNames`) to substrings matched
 * against `Race.contextNotes[].text` for that trait — the contextNotes
 * analogue of {@link VENDORED_STANDARD_TRAIT_TARGETS} above, covering the
 * standard traits that carry no `Race.changes` entry at all (a situational
 * reminder rather than a flat number), so a vendored alternate that replaces
 * one has something to retire. Audited by hand against `races.json`'s
 * `contextNotes` arrays the same way as the structured map: every entry below
 * cites the exact vendored text and the alternate(s) whose own
 * `replacedTraitNames` (verified against `racial-traits.json`) name it.
 *
 *   - Duergar "Stability" and Dwarf "Stability": both `{cmd, "+4 Racial vs
 *     Bull Rush and Trip while on ground"}` — the identical note text (a
 *     Duergar's own write-up borrows the dwarf's wholesale), now promoted to
 *     a real `maneuverCategories` bonus by `race-maneuver-notes.ts`, so
 *     unlike every other entry in this map it retires a NUMBER, not just a
 *     reminder. Duergar's copy is replaced (alongside the already-structured
 *     "Duergar Immunities") by "Dwarf Traits"; Dwarf's own copy is replaced
 *     by "Relentless" and "Tightfisted" (the latter also names
 *     "Stonecunning", which stays unmapped — see the closing paragraph
 *     below).
 *   - Vine Leshy "Unassuming Foliage": `{skill.ste, "+4 Racial in Forests"}` —
 *     Vine Leshy's only contextNote. Replaced by "Swamp Leshy" and "Seasoned
 *     Spirit" (both also name "Climber", already structured-suppressed).
 *   - Gillman "Enchantment Resistance": `{allSavingThrows, "+2 Racial vs
 *     Enchantment Effects (non-aboleths)\n-2 Racial vs Enchantment Effects
 *     (aboleths)"}` — Gillman's only contextNote. Replaced by "Taskmaster",
 *     "Slimehunter", "Deep Gillman", "Venomkissed", "Truthseer".
 *   - Grippli "Camouflage": `{skill.ste, "+4 Racial in Marshes and Forested
 *     Areas"}` — Grippli's only contextNote. Replaced by "Toxic Skin" and
 *     "Jumper".
 *   - Strix "Nocturnal": the pair `{skill.ste, "+2 Racial to Stealth in Dim
 *     Light or Darkness"}` / `{skill.per, "+2 Racial to Perception in Dim
 *     Light or Darkness"}`, both matched by the "Dim Light or Darkness"
 *     fragment they share. Replaced by "Frightening" and "Dayguard". Strix
 *     "Suspicious": `{allSavingThrows, "+2 Racial vs. Illusions"}`. Replaced
 *     by "Tough", "Nimble (Strix)", and "Cautious Brawler" (whose own
 *     `replacedTraitNames` also names "Hatred" — the published Strix Hatred
 *     trait is real, +1 vs. humans, per d20pfsrd, but this vendored slice
 *     carries no contextNote or change for it at all, same gap as Fetchling's
 *     Shadowy Resistance below, so there is nothing that key could suppress).
 *   - Wayang "Shadow Resistance": `{allSavingThrows, "+2 Racial vs. Shadow
 *     Subschool"}` — Wayang's only contextNote. Replaced by "Poison Minion
 *     (wayang)" and "Scion of Shadows" (both also name "Light and Dark", the
 *     prose-only trait already noted unmapped above, and the former also
 *     names "Lurker", already structured-suppressed).
 *   - Nagaji "Resistant": `{allSavingThrows, "+2 Racial vs. Mind-Affecting
 *     Effects and Poison"}`. Replaced by "Serpent Affinity". Nagaji "Serpent's
 *     Sense" (the Handle Animal half only, per the partial-halves note above
 *     — the Perception half is structured and already suppressed):
 *     `{skill.han, "+2 Racial vs. Reptiles"}`. Replaced by "Hypnotic Gaze".
 *   - Syrinx "Nocturnal": the pair `{skill.per, "+2 Racial at Night"}` /
 *     `{skill.ste, "+2 Racial at Night"}`, both matched by "at Night". Syrinx
 *     "Pride": `{allSavingThrows, "+2 Racial vs. Mind-Affecting Effects"}`.
 *     Both replaced by "Oppressive" (the slice's one alternate naming either).
 *   - Svirfneblin "Hatred": `{attack, "+1 vs. Reptilian and Dwarf"}` —
 *     Svirfneblin's only contextNote. Replaced by "Stalwart Watcher"
 *     (alongside "Skilled", already structured-suppressed).
 *   - Aquatic Elf "Elven Magic": both of Aquatic Elf's contextNotes —
 *     `{skill.spl, "+2 to Identify Magic Items"}` and `{allSavingThrows, "+2
 *     Racial vs Enchantment Effects\nImmune to Magic Sleep"}` — belong to
 *     Elven Magic, a real trait distinct from the already-structured "Elven
 *     Immunities" (whose `immEffect.magicSleep` change is a separate `Change`
 *     that happens to restate the same sleep immunity as prose here; dropping
 *     this note doesn't touch that change). Replaced by "Surfacer
 *     Antagonist".
 *   - Aphorite "Aphorite Resistances": `{allSavingThrows, "+2 vs Poison and
 *     Mind-affecting effects"}` — Aphorite's only contextNote (its
 *     electricity resistance, mentioned in the module doc comment above, has
 *     no `eres` change to suppress, but the save note itself is droppable).
 *     Replaced by "Share Knowledge".
 *   - Duskwalker "Ward against Corruption" (the +2 save half only, per the
 *     partial-halves note above — the undeath-transform-immunity half is
 *     structured and already suppressed): `{allSavingThrows, "+2 Racial vs.
 *     Negative Energy and Death effects"}`. Replaced by "Yamaraj's Baliff" and
 *     "Olethros's Agent".
 *
 * A full sweep of every other `replacedTraitNames` entry across the vendored
 * catalog turned up nothing else contextNotes-only and unmapped: the bulk are
 * either prose traits already recorded unmapped in the module doc comment
 * above, or one of the seven core races' (Elf/Dwarf/Gnome/Halfling) dozens of
 * regional-variant/heritage bundles — those four races are handled entirely
 * by the hand-authored `RACIAL_TRAITS` table's own `suppressNotes`, not this
 * vendored map, so they're deliberately absent here the same way they're
 * absent from {@link VENDORED_STANDARD_TRAIT_TARGETS}. Dwarf is the one
 * exception, and only for Stability: every OTHER Dwarf note-only trait
 * (Stonecunning, Hardy, Greed, Hatred, Defensive Training) stays on the
 * hand-authored `RACIAL_TRAITS` route as before, unmapped here.
 */
export const VENDORED_STANDARD_TRAIT_NOTES: Readonly<
  Record<string, Readonly<Record<string, readonly string[]>>>
> = {
  Duergar: {
    Stability: ["Bull Rush and Trip"],
  },
  Dwarf: {
    Stability: ["Bull Rush and Trip"],
  },
  "Vine Leshy": {
    "Unassuming Foliage": ["Racial in Forests"],
  },
  Gillman: {
    "Enchantment Resistance": ["vs Enchantment Effects"],
  },
  Grippli: {
    Camouflage: ["Marshes and Forested Areas"],
  },
  Strix: {
    Nocturnal: ["Dim Light or Darkness"],
    Suspicious: ["vs. Illusions"],
  },
  Wayang: {
    "Shadow Resistance": ["Shadow Subschool"],
  },
  Nagaji: {
    Resistant: ["Mind-Affecting Effects and Poison"],
    "Serpent's Sense": ["vs. Reptiles"],
  },
  Syrinx: {
    Nocturnal: ["at Night"],
    Pride: ["Mind-Affecting Effects"],
  },
  Svirfneblin: {
    Hatred: ["vs. Reptilian and Dwarf"],
  },
  "Aquatic Elf": {
    "Elven Magic": ["Identify Magic Items", "Enchantment Effects"],
  },
  Aphorite: {
    "Aphorite Resistances": ["Poison and Mind-affecting effects"],
  },
  Duskwalker: {
    "Ward against Corruption": ["Negative Energy and Death effects"],
  },
};

/**
 * The `Race.contextNotes` text fragments a picked vendored alternate
 * suppresses for `raceName`, per {@link VENDORED_STANDARD_TRAIT_NOTES} —
 * empty for an unmapped race or an alternate that only replaces a structured
 * or prose-only standard trait. Mirrors {@link vendoredTraitSuppressTargets}
 * exactly, against the notes map instead of the targets map.
 */
export function vendoredTraitSuppressNoteFragments(
  trait: { name: string; replacedTraitNames: string[] },
  raceName: string,
): string[] {
  const raceMap = VENDORED_STANDARD_TRAIT_NOTES[raceName];
  if (!raceMap) return [];
  return resolveReplacedTraitNames(trait).flatMap((name) => [...(raceMap[name] ?? [])]);
}

/**
 * True when every name in `trait.replacedTraitNames` (the literal list the
 * picker displays on its "replaces" tag) has a verified entry in EITHER
 * {@link VENDORED_STANDARD_TRAIT_TARGETS} or
 * {@link VENDORED_STANDARD_TRAIT_NOTES} for `raceName` — i.e. the swap is
 * fully automatic (every named standard trait actually gets suppressed, be it
 * a computed number or a contextNotes reminder) and there is nothing left for
 * the player to retire by hand. `false` for an empty `replacedTraitNames`
 * (nothing named to check — the picker doesn't show a "replaces" tag at all
 * in that case) or for any name missing from both maps, which is the
 * ordinary case for most of the ~80-race catalog (see both maps' doc
 * comments for what's deliberately left unmapped and why).
 *
 * Checked against the RAW `replacedTraitNames`, not
 * {@link resolveReplacedTraitNames}'s heritage-bundle inference: a bundle
 * with an empty `replacedTraitNames` shows no "replaces" tag to begin with,
 * so there is nothing here to mark either way.
 */
export function vendoredTraitFullyHandled(
  trait: { replacedTraitNames: string[] },
  raceName: string,
): boolean {
  if (trait.replacedTraitNames.length === 0) return false;
  const targetMap = VENDORED_STANDARD_TRAIT_TARGETS[raceName];
  const noteMap = VENDORED_STANDARD_TRAIT_NOTES[raceName];
  return trait.replacedTraitNames.every(
    (name) => targetMap?.[name] !== undefined || noteMap?.[name] !== undefined,
  );
}

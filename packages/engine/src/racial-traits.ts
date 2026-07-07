/**
 * Clean-room PF1 alternate racial traits table (issue #35, DESIGN §6):
 * hand-authored from the published rules (Advanced Race Guide / core races,
 * Inner Sea Races for the Sylph "Mostly Human" alternate, public SRD/OGL
 * content) — alternate racial traits are NOT part of the vendored Foundry
 * data pack (only each race's *standard* traits are, as
 * `Race.changes`/`Race.contextNotes`), so there is no upstream JSON to
 * normalize. Same posture as `traits.ts`/`bloodlines.ts`/`tables.ts` for
 * content the compendium doesn't carry.
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
 *   - Standard traits that are `Race.contextNotes` rather than `changes`
 *     (all of Dwarf's swappable traits: Stonecunning, Hardy, Greed, Hatred,
 *     Defensive Training, Stability; Elf's Elven Magic; Gnome's Defensive
 *     Training/Hatred) carry no computed number, so there is nothing for
 *     `suppressTargets` to drop — those alternates are surfaced as options
 *     with their own `contextNotes`, and `replaces` records the swap for the
 *     UI. Race contextNotes aren't rendered on the sheet today (issue #41),
 *     so no stale reminder actually shows yet, but the alternates that
 *     replace a note-only standard trait still carry `suppressNotes` (see
 *     {@link AlternateRacialTrait.suppressNotes} and
 *     {@link effectiveRaceContextNotes} below) so a future consumer that
 *     surfaces `Race.contextNotes` gets the correct filtered list for free
 *     instead of re-discovering this gap.
 *   - Benefits that are a feat grant (Focused Study's Skill Focus chain,
 *     Ancestral Arms' weapon proficiency, Shaman's Apprentice's Endurance) or
 *     conditional on a situation the static sheet can't detect (Eternal Hope's
 *     "+2 vs fear and despair", Steel Soul's "+4 vs spells") carry
 *     `displayOnly: true` with a `contextNotes` reminder rather than a flat
 *     always-on number that would over-apply — the same bar `traits.ts` uses.
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

import type { CharacterDoc, Change, ContextNote, Race } from "@pf1/schema";

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
   * this alternate is active (issue #41). Race contextNotes carry no stable
   * id in the vendored data, just `target` + free-text `text` (see
   * `packages/schema/src/primitives.ts` `ContextNote`), and `target` alone
   * isn't reliably 1:1 with a standard trait within a race (e.g. Gnome's
   * Illusion Resistance and Defensive Training notes could plausibly collide
   * on a shared target in a future data update) — a substring unique to the
   * replaced trait's actual vendored wording is the more robust match.
   * Omitted when the replaced standard trait is a structured `Change`
   * (nothing in `Race.contextNotes` to suppress) or has no vendored
   * contextNote at all.
   */
  suppressNotes?: string[];
  /** Non-mechanical reminders (situational scope, feat grants, class-skill grants). */
  contextNotes?: ContextNote[];
  /** True when the alternate has no flat modifier the static sheet applies. */
  displayOnly?: boolean;
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
      "+2 racial bonus on Sense Motive checks; a chosen companion/cohort/etc. gains +2 to one ability score (in place of the extra skill rank).",
    replaces: ["Skilled"],
    changes: [c("2", "skill.sen")],
    suppressTargets: ["bonusSkillRanks"],
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
    // Elven Magic is the vendored Elf's only contextNote-only standard trait
    // — all three of its Race.contextNotes entries (save vs enchantment/sleep
    // immunity, Spellcraft to identify items, caster level vs SR) go away
    // with it (issue #41).
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
    // all dropped (issue #41).
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
    // replaces (issue #41). Gnome's third contextNote (Illusion Resistance,
    // "vs Illusion Effects") is a DIFFERENT standard trait this alternate
    // doesn't touch — matched by substring, not by the shared
    // `allSavingThrows`/`ac` targets, so it's never accidentally dropped.
    suppressNotes: ["Dodge vs Giants", "Humanoids (Reptillian, Goblinoid)"],
  },
  {
    id: "gnome-eternal-hope",
    race: "Gnome",
    name: "Eternal Hope",
    summary:
      "+2 racial bonus on saves vs fear and despair; 1/day reroll a natural 1 before the result is revealed (in place of defensive training and hatred).",
    replaces: ["Defensive Training", "Hatred"],
    changes: [],
    displayOnly: true,
    // See gnome-gift-of-tongues above.
    suppressNotes: ["Dodge vs Giants", "Humanoids (Reptillian, Goblinoid)"],
    contextNotes: [
      {
        target: "allSavingThrows",
        text: "+2 racial vs fear and despair effects; 1/day reroll a natural 1 (take the new roll).",
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
      "+2 racial bonus on Sense Motive and on any one Craft or Profession; +2 racial on saves vs illusions (in place of sure-footed).",
    replaces: ["Sure-Footed"],
    changes: [c("2", "skill.sen")],
    suppressTargets: ["skill.acr", "skill.clm"],
    contextNotes: [
      {
        target: "allSavingThrows",
        text: "+2 racial vs illusions; +2 racial on one chosen Craft or Profession skill.",
      },
    ],
  },

  // ── Dwarf ──────────────────────────────────────────────────────────────────
  // Dwarf's swappable standard traits are all Race.contextNotes (no computed
  // number), so these alternates carry no `suppressTargets` — they surface the
  // choice and their own reminders; `replaces` records the swap. Each DOES
  // carry `suppressNotes` (issue #41): Dwarf's six vendored contextNotes are
  // each a distinct standard trait with a unique target (Stability/cmd,
  // Stonecunning/skill.per, Defensive Training/ac, Hardy/allSavingThrows,
  // Greed/skill.apr, Hatred/attack), so a substring drawn from each note's
  // own wording is enough to identify the one being replaced.
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
    changes: [],
    displayOnly: true,
    suppressNotes: ["Poisons, Spells and Spell-likes"], // Hardy
    contextNotes: [
      {
        target: "allSavingThrows",
        text: "+2 racial vs poison; +4 racial vs spells and spell-like abilities (vs-spells only — not auto-applied).",
      },
    ],
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

/* --------------------------------------------- race contextNotes (issue #41) */

/**
 * `race.contextNotes`, minus any dropped by an active alternate racial
 * trait's `suppressNotes` — the contextNotes analogue of how `collectModifiers`
 * drops a `Race.changes` entry whose target is in an active alternate's
 * `suppressTargets`. Not wired into `collectModifiers`/`compute.ts` itself:
 * race contextNotes aren't surfaced on the sheet anywhere today (see the
 * module doc comment above), so there is no consumer to call this from yet —
 * it exists so that whenever one is added, it reads through this function
 * instead of `race.contextNotes` directly and gets the correct filtered list
 * for free, rather than re-discovering the suppression gap issue #41 flagged.
 */
export function effectiveRaceContextNotes(
  race: Race | undefined,
  activeTraits: readonly AlternateRacialTrait[],
): ContextNote[] {
  if (!race) return [];
  const suppressedFragments = activeTraits.flatMap((t) => t.suppressNotes ?? []);
  if (suppressedFragments.length === 0) return race.contextNotes;
  return race.contextNotes.filter(
    (cn) => !suppressedFragments.some((fragment) => cn.text.includes(fragment)),
  );
}

/**
 * Convenience wrapper around {@link effectiveRaceContextNotes} that resolves
 * "the character's currently-active alternate racial traits for their race"
 * itself — same `doc.build.racialTraits` -> `RACIAL_TRAITS` -> filter-by-
 * current-race lookup `collectModifiers` and {@link hasSlowAndSteady} each do
 * inline, factored out here so a future UI consumer doesn't have to
 * reimplement it a third time.
 */
export function raceContextNotesFor(doc: CharacterDoc, race: Race | undefined): ContextNote[] {
  if (!race) return [];
  const activeTraits = (doc.build.racialTraits ?? [])
    .map((id) => RACIAL_TRAITS[id])
    .filter((t): t is AlternateRacialTrait => t != null && t.race === race.name);
  return effectiveRaceContextNotes(race, activeTraits);
}

/* ---------------------------------------------------- slow and steady (#52) */

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

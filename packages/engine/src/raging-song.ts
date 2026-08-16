/**
 * Clean-room PF1 skald Raging Song performance types, hand-authored from the
 * published Advanced Class Guide rules (Inspired Rage verified against
 * aonprd.com's live Skald class page, "Inspired Rage" ability, 2026-07-08;
 * Song of Marching, Song of Strength, Dirge of Doom, and Song of the Fallen
 * verified the same way, plus cross-checked against the vendored
 * `class-features.json` description text, 2026-08-15).
 *
 * Raging Song (the rounds/day pool everything below draws from) is ALREADY
 * fully vendored — `RefData.classFeatures`'s "Raging Song" entry (tag
 * `ragingSong`) carries `uses.maxFormula: "3 + @abilities.cha.mod + (floor(
 * @class.unlevel - 1) * 2)"`, verified against aonprd.com to match RAW
 * exactly ("3 + Cha modifier rounds/day at 1st level, +2 rounds/day per
 * level thereafter") — `deriveResourcePools` derives the pool with zero
 * hand-authoring needed there. None of the five performance types below
 * carry a vendored `grantsBuffs` (unlike bard's Inspire Courage, which
 * resolves to a real vendored buff) — this module is the hand-authored
 * substitute, wired onto the Raging Song pool's `tableOptions` field
 * (`resources.ts`) as `ToggleBuffOption`s via `ragingSongToggleOptions`.
 *
 * RAW numbers (Inspired Rage, vendored description, verified against
 * aonprd.com):
 *   - +2 morale bonus to Str, +2 morale to Con, +1 morale on Will saves, -1
 *     penalty to AC, at 1st level.
 *   - Will bonus increases by 1 at 4th level and every 4 levels thereafter
 *     (1 at L1-3, 2 at L4-7, 3 at L8-11, 4 at L12-15, 5 at L16-19, 6 at L20)
 *     — `1 + floor(level / 4)`.
 *   - Str/Con bonus increases by 2 at 8th AND 16th (2 at L1-7, 4 at L8-15, 6
 *     at L16-20) — `2 + 2 * floor(level / 8)`.
 *   - AC penalty stays flat at -1 the whole time.
 *   - Unlike barbarian rage, no fatigue after the song ends (nothing here
 *     applies fatigue in the first place, so this is automatically honored).
 *
 * RAW numbers for the other four performance types, verified against
 * aonprd.com and the vendored description text (2026-08-15):
 *   - Song of Marching (3rd): allies within 60 feet may hustle for the next
 *     hour without the fatigue/nonlethal-damage cost a hustle normally
 *     accrues (treated as a walk for that purpose). Only 1 round of raging
 *     song is spent for the whole hour, but the skald must keep performing
 *     the whole time or the effect ends early. No numeric Change target.
 *   - Song of Strength (6th): once each round, allies within 60 feet who can
 *     hear the skald may add 1/2 the skald's level to a Strength check or a
 *     Strength-based skill check. The Strength-based-skill half is modeled
 *     as real `Change`s on Climb (`skill.clm`) and Swim (`skill.swm`); the
 *     bare-ability-check half has no Change target in this engine (no
 *     "ability check" target exists) and is a context note instead. Neither
 *     aonprd.com nor the vendored text states a minimum bonus, but the
 *     ability doesn't unlock until 6th level, where floor(level / 2) is
 *     already 3, so a `max(1, ...)` floor is a no-op in practice; kept for
 *     defensiveness at exactly the unlock level.
 *   - Dirge of Doom (10th): enemies within 30 feet who can see and hear the
 *     performance become shaken, no save, for as long as they remain in
 *     range and the performance continues. Mind-affecting fear effect; can't
 *     escalate an already-shaken target to frightened or panicked.
 *   - Song of the Fallen (14th): the skald spends 1 round of raging song to
 *     bring a dead ally within 60 feet back to life, alive but staggered,
 *     with the same limitations as raise dead. Costs another round of
 *     raging song per revived ally per round to sustain; a sustained ally
 *     dies automatically if the performance ends or is interrupted.
 *
 * Scope/deferrals (task brief), all note-tier rather than modeled:
 *   - Every performance type below is written as "allies gain..." /
 *     "enemies become..." — this app tracks ONE character, so ally-facing
 *     toggles apply to the skald's own sheet (exactly like Rage applies to a
 *     barbarian's own sheet), not to a party of allies, and enemy-facing or
 *     no-numeric-target effects (Song of Marching, Dirge of Doom, Song of
 *     the Fallen) are context notes carrying the real numbers rather than a
 *     modeled `Change`. A context note says so on each.
 *   - The skill/ability restriction on allies affected by Inspired Rage (no
 *     Cha/Dex/Int-based skill checks except Acrobatics/Fly/Intimidate/Ride,
 *     no patience/concentration abilities) is a note, not enforced.
 *   - Rage Powers granted via raging song (3rd level onward) are deferred
 *     with an honest note — the barbarian's own Rage Powers have no picker
 *     in this app yet either (deferred), so skald's inherits the identical
 *     non-treatment rather than a bespoke partial one.
 */

import type { Change } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

const INSPIRED_RAGE_CHANGES: Change[] = [
  { formula: "2 + 2 * floor(@classes.skald.level / 8)", target: "str", type: "morale" },
  { formula: "2 + 2 * floor(@classes.skald.level / 8)", target: "con", type: "morale" },
  { formula: "1 + floor(@classes.skald.level / 4)", target: "will", type: "morale" },
  { formula: "-1", target: "ac", type: "untyped" },
];

/** The Raging Song pool's `tableOptions` entry — see file doc comment for RAW numbers and deferrals. */
export const SKALD_INSPIRED_RAGE: ToggleBuffOption = {
  id: "ragingSong:inspiredRage",
  name: "Inspired Rage",
  changes: INSPIRED_RAGE_CHANGES,
  contextNotes: [
    {
      target: "allChecks",
      text: "RAW this buffs your ALLIES (Str/Con/Will up, AC down), not you — this tracker applies it to your own sheet the same way Rage applies to a barbarian, since it only tracks one character. Sharing it with the rest of the party isn't modeled.",
    },
    {
      target: "allChecks",
      text: "Affected allies other than you can't use Cha/Dex/Int-based skill checks (except Acrobatics, Fly, Intimidate, Ride) or abilities requiring patience/concentration while raging — not enforced.",
    },
    {
      target: "allChecks",
      text: "Rage Powers granted via raging song (3rd level onward) aren't modeled here, the same as the barbarian's own Rage Powers, which have no picker in this app yet either.",
    },
  ],
};

const SONG_OF_STRENGTH_STR_SKILL_CHANGES: Change[] = [
  {
    formula: "max(1, floor(@classes.skald.level / 2))",
    target: "skill.clm",
    type: "untyped",
  },
  {
    formula: "max(1, floor(@classes.skald.level / 2))",
    target: "skill.swm",
    type: "untyped",
  },
];

/** The Raging Song pool's Song of Marching option (3rd level). Note tier: no numeric target. */
export const SKALD_SONG_OF_MARCHING: ToggleBuffOption = {
  id: "ragingSong:songOfMarching",
  name: "Song of Marching",
  changes: [],
  contextNotes: [
    {
      target: "allChecks",
      text: "RAW this lets ALLIES within 60 feet hustle for the next hour without the fatigue or nonlethal damage a hustle normally costs, as long as you keep performing. Only 1 round of raging song is spent for the whole hour. This tracker applies the toggle to your own sheet only; sharing it with the rest of the party isn't modeled.",
    },
  ],
};

/** The Raging Song pool's Song of Strength option (6th level). Str-based skill half is a real Change; the bare ability-check half is note-tier. */
export const SKALD_SONG_OF_STRENGTH: ToggleBuffOption = {
  id: "ragingSong:songOfStrength",
  name: "Song of Strength",
  changes: SONG_OF_STRENGTH_STR_SKILL_CHANGES,
  contextNotes: [
    {
      target: "allChecks",
      text: "RAW this buffs ALLIES within 60 feet who can hear you, not you alone. This tracker applies it to your own sheet only, the same way Inspired Rage does; sharing it with the rest of the party isn't modeled.",
    },
    {
      target: "allChecks",
      text: "Once each round, you and affected allies add half your skald level to a Strength check or a Strength-based skill check. The Strength-based-skill half is applied above to Climb and Swim. Bare Strength ability checks have no Change target in this engine, so that half isn't applied as a number here, track it manually.",
    },
  ],
};

/** The Raging Song pool's Dirge of Doom option (10th level). Enemy-facing, note tier: no self-facing sheet number. */
export const SKALD_DIRGE_OF_DOOM: ToggleBuffOption = {
  id: "ragingSong:dirgeOfDoom",
  name: "Dirge of Doom",
  changes: [],
  contextNotes: [
    {
      target: "allChecks",
      text: "Enemies within 30 feet who can see and hear your performance become shaken, no save, for as long as they stay in range and you keep performing. Mind-affecting fear effect; it can't escalate an already-shaken target to frightened or panicked. Enemy-facing, so there's no number to add to your own sheet.",
    },
  ],
};

/** The Raging Song pool's Song of the Fallen option (14th level). Note tier: no self-facing sheet number. */
export const SKALD_SONG_OF_THE_FALLEN: ToggleBuffOption = {
  id: "ragingSong:songOfTheFallen",
  name: "Song of the Fallen",
  changes: [],
  contextNotes: [
    {
      target: "allChecks",
      text: "Spend 1 round of raging song to bring a dead ally within 60 feet back to life, alive but staggered, with the same limitations as raise dead. Spend another round of raging song per revived ally each round to sustain them, they die automatically if you stop performing or are interrupted. There's no number to add to your own sheet.",
    },
  ],
};

/** The Raging Song pool's `tableOptions`, filtered to the performance types the skald has unlocked at `skaldLevel`. See file doc comment for RAW numbers and deferrals. */
export function ragingSongToggleOptions(skaldLevel: number): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];
  if (skaldLevel >= 1) options.push(SKALD_INSPIRED_RAGE);
  if (skaldLevel >= 3) options.push(SKALD_SONG_OF_MARCHING);
  if (skaldLevel >= 6) options.push(SKALD_SONG_OF_STRENGTH);
  if (skaldLevel >= 10) options.push(SKALD_DIRGE_OF_DOOM);
  if (skaldLevel >= 14) options.push(SKALD_SONG_OF_THE_FALLEN);
  return options;
}

/** Resource-pool `detail` line for the Raging Song pool — see `resources.ts`'s `feature.tag === "ragingSong"` branch. */
export const RAGING_SONG_DETAIL = "rounds/day · toggle songs below";

/**
 * Clean-room PF1 skald Inspired Rage (issue #65), hand-authored from the
 * published Ultimate Combat rules (verified against aonprd.com's live Skald
 * class page, "Inspired Rage" ability, 2026-07-08).
 *
 * Raging Song (the rounds/day pool everything below draws from) is ALREADY
 * fully vendored — `RefData.classFeatures`'s "Raging Song" entry (tag
 * `ragingSong`) carries `uses.maxFormula: "3 + @abilities.cha.mod + (floor(
 * @class.unlevel - 1) * 2)"`, verified against aonprd.com to match RAW
 * exactly ("3 + Cha modifier rounds/day at 1st level, +2 rounds/day per
 * level thereafter") — `deriveResourcePools` derives the pool with zero
 * hand-authoring needed there. "Inspired Rage" itself (the flagship, 1st-
 * level performance type) carries NO vendored `grantsBuffs` at all (unlike
 * bard's Inspire Courage, which resolves to a real vendored buff) — this
 * module is the hand-authored substitute, wired onto the Raging Song pool's
 * `tableOptions` field (`resources.ts`) as a single `ToggleBuffOption`.
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
 * Scope/deferrals (issue #65 task brief), all note-tier rather than modeled:
 *   - Inspired Rage is written as "allies gain..." — this app tracks ONE
 *     character, so the toggle applies the buff to the skald's OWN sheet
 *     (exactly like Rage applies to a barbarian's own sheet), not to a party
 *     of allies. A context note says so.
 *   - The skill/ability restriction on affected allies (no Cha/Dex/Int-based
 *     skill checks except Acrobatics/Fly/Intimidate/Ride, no
 *     patience/concentration abilities) is a note, not enforced.
 *   - Song of Marching (3rd), Song of Strength (6th), Dirge of Doom (10th),
 *     and Song of the Fallen (14th) — the other raging-song performance
 *     types — are deferred entirely (not built here), same as bard's other
 *     performance types beyond Inspire Courage.
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
      text: "Only Inspired Rage (1st) is modeled. Song of Marching (3rd), Song of Strength (6th), Dirge of Doom (10th), and Song of the Fallen (14th) are deferred, as are Rage Powers granted via raging song (3rd+) — the barbarian's own Rage Powers have no picker in this app yet either.",
    },
  ],
};

/** Resource-pool `detail` line for the Raging Song pool — see `resources.ts`'s `feature.tag === "ragingSong"` branch. */
export const RAGING_SONG_DETAIL = "rounds/day · Inspired Rage below";

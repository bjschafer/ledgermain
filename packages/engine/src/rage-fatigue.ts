/**
 * Which active buffs trigger PF1's "fatigued after rage ends" aftermath, and
 * which don't — the rule is NOT uniform across the rage family (issue #67),
 * verified against aonprd.com's live Barbarian / Barbarian (Unchained) /
 * Bloodrager / Rage-spell pages (2026-07-25):
 *
 *   - Chained Rage (CRB barbarian, buff name "Rage"): "A barbarian can end
 *     her rage as a free action and is fatigued after rage for a number of
 *     rounds equal to 2 times the number of rounds spent in the rage" —
 *     UNLESS she has Tireless Rage (17th level): "a barbarian no longer
 *     becomes fatigued at the end of her rage."
 *   - Bloodrage (ACG bloodrager, `bloodrage.ts`'s `BLOODRAGE_BUFF`, name
 *     "Bloodrage"): identical aftermath — "When the bloodrage ends, he's
 *     fatigued for a number of rounds equal to twice the number of rounds
 *     spent in the bloodrage" — UNLESS Tireless Bloodrage (17th level): "a
 *     bloodrager no longer becomes fatigued at the end of his bloodrage."
 *   - Rage (Unchained) (buff name "Rage (Unchained)"): "A barbarian can end
 *     her rage as a free action, and is fatigued for 1 minute after a rage
 *     ends" — a real but DIFFERENT aftermath (flat 1 minute, not 2x rounds
 *     raged) that this table deliberately does NOT trigger: this tracker has
 *     no timed-condition model (see below), so the only honest options are
 *     "untimed toggle" or "nothing," and an untimed toggle would overstate a
 *     genuinely time-boxed 1-minute effect worse than omitting it.
 *   - Rage (Spell) (buff name "Rage (Spell)"): "The effect is otherwise
 *     identical with a barbarian's rage except that the subjects aren't
 *     fatigued at the end of the rage" — explicitly excluded.
 *   - Inspired Rage (skald's Raging Song, `raging-song.ts`'s
 *     `SKALD_INSPIRED_RAGE`): grants no fatigue at all per its own RAW (see
 *     that file's doc comment) — excluded.
 *
 * This tracker has no "rounds spent active" counter (`ActiveBuff` only
 * carries `remainingRounds`, a countdown to zero, never an elapsed count)
 * and `live.conditions` has no duration model at all (a flat id array) — so
 * there is nowhere to store "fatigued for 2x rounds raged" as an actual
 * timer. The honest floor is auto-activating the `fatigued` condition
 * UNTIMED the moment a covered buff ends (expires or is toggled off); the
 * player clears it by hand once the real-world duration has passed.
 *
 * Keyed by `ActiveBuff.name` (a stable snapshot, not `RefData.buffs`' id —
 * see `buff-effects.ts`'s `BUFF_CHANGE_PATCHES` doc comment for why), so
 * this applies identically regardless of which UI path ended the buff
 * (manual removal, a linked resource-pool toggle, or the round clock).
 */

import type { CharacterDoc } from "@pf1/schema";

const RAGE_FATIGUE_BUFF_NAMES: ReadonlySet<string> = new Set(["Rage", "Bloodrage"]);

/** Barbarian/bloodrager level negates the aftermath entirely at 17th (Tireless Rage/Bloodrage). */
const TIRELESS_LEVEL_BY_BUFF: Readonly<Record<string, string>> = {
  Rage: "barbarian",
  Bloodrage: "bloodrager",
};

/**
 * True when `buffName` ending should auto-apply the fatigued condition for
 * this character right now — combines {@link RAGE_FATIGUE_BUFF_NAMES}'
 * membership with the granting class's own Tireless Rage/Bloodrage level
 * gate. Non-rage buffs (and Rage (Unchained)/Rage (Spell)/Inspired Rage,
 * deliberately absent from the table above) always return `false`.
 */
export function rageFatigueApplies(doc: CharacterDoc, buffName: string): boolean {
  if (!RAGE_FATIGUE_BUFF_NAMES.has(buffName)) return false;
  const classTag = TIRELESS_LEVEL_BY_BUFF[buffName];
  const level = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
  return level < 17;
}

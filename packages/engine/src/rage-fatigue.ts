/**
 * Which active buffs trigger PF1's "fatigued after rage ends" aftermath, for
 * how long, and which don't — the rule is NOT uniform across the rage family
 * (issue #67), verified against aonprd.com's live Barbarian / Barbarian
 * (Unchained) / Bloodrager / Rage-spell pages (2026-07-25):
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
 *     ends" — the same aftermath on a different clock (a flat 10 rounds,
 *     regardless of how long the rage ran).
 *   - Rage (Spell) (buff name "Rage (Spell)"): "The effect is otherwise
 *     identical with a barbarian's rage except that the subjects aren't
 *     fatigued at the end of the rage" — explicitly excluded.
 *   - Inspired Rage (skald's Raging Song, `raging-song.ts`'s
 *     `SKALD_INSPIRED_RAGE`): grants no fatigue at all per its own RAW (see
 *     that file's doc comment) — excluded.
 *
 * The two clocks differ in what they need from the tracker. Unchained's flat
 * minute is always knowable. The chained "2x rounds spent raging" needs the
 * elapsed duration, which is `ActiveBuff.roundsActive` — accurate only for a
 * table that advances the round clock. When it reads zero the rage was ended
 * without the clock ever moving, and the honest answer is an UNTIMED fatigue
 * (the long-standing behavior) for the player to clear by hand, rather than a
 * confident "0 rounds" that would clear itself instantly.
 *
 * Keyed by `ActiveBuff.name` (a stable snapshot, not `RefData.buffs`' id —
 * see `buff-effects.ts`'s `BUFF_CHANGE_PATCHES` doc comment for why), so
 * this applies identically regardless of which UI path ended the buff
 * (manual removal, a linked resource-pool toggle, or the round clock).
 */

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

/** How each rage flavor's aftermath duration is derived from the ended buff. */
type FatigueClock =
  | { kind: "twiceRoundsRaged"; tirelessClassTag: string }
  | { kind: "fixed"; rounds: number };

const RAGE_FATIGUE_CLOCKS: Readonly<Record<string, FatigueClock>> = {
  Rage: { kind: "twiceRoundsRaged", tirelessClassTag: "barbarian" },
  Bloodrage: { kind: "twiceRoundsRaged", tirelessClassTag: "bloodrager" },
  "Rage (Unchained)": { kind: "fixed", rounds: 10 },
};

/** PF1 rounds in the 1 minute Rage (Unchained) states outright. */
export const UNCHAINED_RAGE_FATIGUE_ROUNDS = 10;

export interface RageFatigue {
  /**
   * Rounds the fatigue lasts, or `undefined` for an untimed one the player
   * clears by hand (a chained rage ended without the round clock running).
   */
  rounds?: number;
}

/**
 * The fatigue a rage buff's ending inflicts on this character right now, or
 * `null` when it inflicts none — a non-rage buff, Rage (Spell)/Inspired Rage,
 * or a barbarian/bloodrager who has reached 17th level and Tireless
 * Rage/Bloodrage.
 */
export function rageFatigueOnEnd(
  doc: CharacterDoc,
  buff: Pick<ActiveBuff, "name" | "roundsActive">,
): RageFatigue | null {
  const clock = RAGE_FATIGUE_CLOCKS[buff.name];
  if (!clock) return null;
  if (clock.kind === "fixed") return { rounds: clock.rounds };

  const level = doc.identity.classes.find((c) => c.tag === clock.tirelessClassTag)?.level ?? 0;
  if (level >= 17) return null;
  const raged = buff.roundsActive ?? 0;
  return raged > 0 ? { rounds: raged * 2 } : {};
}

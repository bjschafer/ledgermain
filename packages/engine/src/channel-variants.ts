/**
 * Archetype overrides for the Channel Energy pipeline. The base subsystem is
 * fully generic — dice, save DC, and uses/day all evaluate the granting
 * class's vendored formulas (`resources.ts` `actionBasedDetail`/`processGrant`
 * and `ability-dcs.ts` `channelInstances`) — but a handful of archetypes
 * change the progression itself: different dice, a different pool size, an
 * effective-level offset, or a pool of their own where the base class spends
 * another resource. Those cannot ride the generic path (the vendored
 * archetype features carry no formulas of their own), so this table
 * substitutes formulas at the same three evaluation points.
 *
 * Keyed by the vendored archetype id (`"cleric:fiendish-vessel"` — the
 * `class:slug` shape `build.archetypes` stores, same matching convention as
 * `bardic-performance-variants/`). A def applies to the granting class's
 * channel feature (the `CHANNEL_ENERGY_NAME_RE` family) whenever the
 * character has the archetype active on that class. Formulas are evaluated
 * with `@class.unlevel` bound to the granting class's level, exactly like
 * the vendored formulas they replace. Clean-room: every formula here is
 * derived from the published archetype text (aonprd.com / d20pfsrd.com),
 * cited per entry — never from Foundry source.
 *
 * Only progression-shaped changes belong here. A variant that retargets WHO
 * the channel affects (Iron Priest's constructs), restricts the energy
 * choice, or bolts on a rider effect stays prose in its classification note:
 * the numbers on the sheet are unchanged, and `note` on a def exists for the
 * reminder text that accompanies a real formula change, not as a general
 * annotation surface.
 */

import type { CharacterDoc } from "@pf1/schema";

export interface ChannelVariantDef {
  /** Vendored archetype id, `class:slug` — must equal this def's table key. */
  archetypeId: string;
  /** Pool display name when the archetype renames the feature ("Channel Evil"). */
  displayName?: string;
  /**
   * Replaces the vendored `uses.maxFormula` — or SUPPLIES one for a feature
   * whose vendored uses is a `source` pointer at another pool (Hospitaler's
   * own channel pool where the base paladin spends Lay on Hands), which then
   * derives its own per-day pool row instead of merging into the source's.
   */
  usesFormula?: string;
  /** Replaces the channel action's damage/healing dice formula. */
  damageFormula?: string;
  /** Replaces the save `dcFormula` (effective-level offsets change the DC too). */
  dcFormula?: string;
  /** Rider reminder appended to the pool's detail line. */
  note?: string;
}

/**
 * See the module doc comment. Entries beyond the seeded first one are
 * authored by the channel content wave; the fiendish vessel is the
 * coordinator-authored pattern entry.
 */
export const CHANNEL_VARIANTS: Readonly<Record<string, ChannelVariantDef>> = {
  // Channel Evil (Cheliax, Empire of Devils p.21, verified via aonprd): d4s
  // on the cleric schedule ("1d4 ... increases by 1d4 at every two levels
  // beyond 1st, to a maximum of 10d4 at 19th" — the same ceil(level/2) count
  // as the base d6 progression), heals evil and harms good, DC and uses/day
  // unchanged (10 + 1/2 level + Cha; 3 + Cha).
  "cleric:fiendish-vessel": {
    archetypeId: "cleric:fiendish-vessel",
    displayName: "Channel Evil",
    damageFormula: "(ceil(@class.unlevel/2))d4",
    note: "heals evil creatures and harms good ones; a good creature that fails its save is sickened for 1d4 rounds",
  },
};

/**
 * The chosen archetype's channel variant for the given granting class, if
 * any — first match wins (a class can only meaningfully have one channel
 * variant; the vendored archetype conflict rules prevent stacking two).
 */
export function channelVariantFor(
  doc: CharacterDoc,
  classTag: string,
): ChannelVariantDef | undefined {
  for (const id of doc.build.archetypes ?? []) {
    const def = CHANNEL_VARIANTS[id];
    if (def && id.startsWith(`${classTag}:`)) return def;
  }
  return undefined;
}

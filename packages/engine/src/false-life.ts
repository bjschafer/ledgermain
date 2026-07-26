/**
 * Hand-authored substitute for the False Life spell's buff (CRB p. 239),
 * which — unlike Divine Power/Greater Heroism/Aid, all of which correctly
 * resolve to a vendored `Buff` — doesn't exist as a `RefData.buffs` entry at
 * all: the vendored "False Life" spell (`spells.json`) carries no linked
 * buff, and no buff of that name exists anywhere in the vendored slice.
 * Confirmed against aonprd.com (2026-07-25): "You gain temporary hit points
 * equal to 1d10 + 1 per caster level (maximum +10)," duration "1 hour/level
 * or until discharged."
 *
 * The temp-HP grant is dice-based (`1d10 + ...`), so — exactly like Aid's own
 * gap (`packages/data-pipeline/src/supplements.ts`'s
 * `SUPPLEMENTAL_BUFF_CONTEXT_NOTES`) — it can't be a static numeric `Change`;
 * `changes: []` with a `contextNotes` reminder is the honest option.
 *
 * Deliberately NOT added to `RefData.buffs` (would need a data-pipeline
 * rebuild the way Aid's context note was, but for a wholly NEW entity rather
 * than a patch to an existing one — disproportionate for one spell, and
 * unlike a supplements.ts patch there is no existing vendored id to key off
 * of). Instead this mirrors `bloodrage.ts`'s `BLOODRAGE_BUFF`: a plain,
 * self-contained `Buff`-shaped object that `makeActiveBuff` (`model/buffs.ts`)
 * accepts directly, wired onto the spell-buff picker via
 * `model/spellBuffs.ts`'s hand-authored fallback so casting False Life offers
 * the same one-click "apply" the vendored buff-spells get.
 */

import type { Buff } from "@pf1/schema";

export const FALSE_LIFE_BUFF_ID = "engine:spell-false-life";

export const FALSE_LIFE_BUFF: Buff = {
  id: FALSE_LIFE_BUFF_ID,
  name: "False Life",
  uuid: "Local.pf1-clean-room.buffs.false-life",
  subType: "spell",
  changes: [],
  contextNotes: [
    {
      target: "tempHp",
      text: "Grants 1d10 + 1 per caster level (max +10) temporary hit points — dice-based, not modeled as a static bonus; roll it and add it by hand.",
    },
  ],
  duration: { end: "initiative", units: "hour", value: "@item.level" },
};

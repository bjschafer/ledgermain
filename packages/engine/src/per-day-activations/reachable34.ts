/**
 * Per-day activation shard: features whose classification verdicts live in
 * `class-feature-classification/reachable3.ts` / `reachable4.ts`. See
 * `types.ts` for what belongs in this table and `index.ts` for the merge.
 *
 * RAW sources (verified against aonprd.com's live class pages, 2026-08-16):
 *   - Sacred Armor (warpriest, Advanced Class Guide): "This power grants the
 *     armor a +1 enhancement bonus. For every 3 levels beyond 7th, this bonus
 *     increases by 1 (to a maximum of +5 at 19th level)." Modeled the same
 *     weapon-agnostic way `sacred-weapon-spends.ts` models Sacred Weapon's
 *     identical mechanic (no engine target represents "enhance one carried
 *     armor" directly, so it lands on `ac`/`enhancement`).
 */

import type { PerDayActivationDef } from "./types.js";

export const PER_DAY_ACTIVATIONS_REACHABLE_34: Readonly<
  Record<string, readonly PerDayActivationDef[]>
> = {
  UBv1y1h93jrnhWxO: [
    {
      slug: "enhance",
      name: "Sacred Armor",
      classTag: "warpriest",
      changes: [
        {
          formula: "min(5, 1 + floor((@classes.warpriest.level - 7) / 3))",
          target: "ac",
          type: "enhancement",
        },
      ],
      contextNotes: [
        {
          target: "allChecks",
          text: "Activating (or re-declaring) this enhancement is a swift action. It costs 1 minute from the Sacred Armor pool per minute it stays active, in 1-minute increments; that pool is not auto-decremented while this toggle is on, so track your own minutes spent.",
        },
        {
          target: "allChecks",
          text: "Ends immediately if the armor is removed or leaves your possession; can't be applied to a shield.",
        },
        {
          target: "allChecks",
          text: "You can trade part of this bonus for an armor special ability (energy resistance, fortification, and so on) instead of a flat enhancement bonus; that trade isn't modeled here.",
        },
      ],
    },
  ],
};

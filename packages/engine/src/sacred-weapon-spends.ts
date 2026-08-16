/**
 * Sacred Weapon (warpriest) spend toggle — the `tableOptions` counterpart to
 * `bardic-performances.ts` / `raging-song.ts` for the Sacred Weapon resource
 * pool (`resources.ts`'s `feature.tag === "sacredWeapon"` branch).
 *
 * Sacred Weapon's rounds/day pool is already fully vendored
 * (`class-features.json` id `YGbFrqaGvnCbAKKV`, tag `sacredWeapon`,
 * `uses.maxFormula: "if(gte(@class.unlevel, 4), @class.unlevel)"`, per day)
 * and rides `deriveResourcePools` for free; what's missing is the swift-action
 * enhancement-bonus activation itself, which the vendored feature carries as
 * `changes: []` (no engine target models "add an enhancement bonus to one
 * carried item" directly — this table's `attack`/`wdamage` pair is the same
 * weapon-agnostic approximation `judgments.ts`'s Destruction and the
 * vendored Inspire Courage buff already use).
 *
 * RAW (Advanced Class Guide, verified against aonprd.com's live Warpriest
 * class page, "Sacred Weapon" ability): "At 4th level, the warpriest gains
 * the ability to enhance one of his sacred weapons with divine power as a
 * swift action. This power grants the weapon a +1 enhancement bonus. For
 * every 4 levels beyond 4th, this bonus increases by 1 (to a maximum of +5
 * at 20th level) ... The warpriest can use this ability a number of rounds
 * per day equal to his warpriest level ... The warpriest can also choose to
 * grant the weapon one or more of the following weapon special abilities
 * instead of an enhancement bonus: ..." The weapon-special-ability trade is a
 * player choice with no numeric equivalent — context note only, matching how
 * occultist Aegis/Legacy Weapon (`occultist-implements.ts`) treat the same
 * "or an equivalent special ability instead" branch.
 *
 * Below 4th level the vendored `uses.maxFormula` already evaluates to 0
 * rounds/day, so `deriveResourcePools` never surfaces a pool row to attach a
 * toggle to in the first place — the `classLevel < 4` guard below is just
 * defensive, not load-bearing.
 *
 * Archetype gating: `collectGrantedFeatures` (archetypes.ts) grants base-class
 * features purely by level, with no archetype-replacement filtering — so the
 * Sacred Weapon POOL still derives even for an archetype that fully replaces
 * the feature (verified against `archetype-extracted/warpriest.ts`'s own
 * class note 2 and its per-archetype classification entries). This table
 * therefore has to do its own suppression, unlike a vendored Change (which an
 * archetype's replacement machinery would otherwise suppress automatically).
 * Archetypes whose classification note says they remove or reshape the
 * enhancement-bonus mechanic specifically (not merely the separate
 * damage-die-by-level table, a different subsystem neither this file nor
 * `warpriest.ts` models) are excluded:
 *   - Sacred Fist: Flurry of Blows "replac[es] sacred weapon" outright.
 *   - Mantis Zealot: Sneak Attack "replacing sacred weapon" outright.
 *   - Champion of the Faith: its own "Sacred Weapon" feature explicitly
 *     "removes sacred weapon's enhancement-bonus scaling" in favor of an
 *     alignment-vs-DR property and a special-ability grant.
 *   - Shieldbearer: its own "Sacred Weapon" feature "redefines sacred weapon
 *     to apply to shields ... with its own delayed (7th-level) enhancement
 *     cadence" — a different target and formula than this table's.
 * Molthuni Arsenal Chaplain (caps the damage-die table at 1d6) and Feral
 * Champion (redirects the damage-die table onto claws) only touch that
 * separate table, so they're left reachable here.
 */

import type { Change } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Sacred Weapon — see `resources.ts`'s `feature.tag === "sacredWeapon"` branch. */
export const SACRED_WEAPON_DETAIL = "rounds/day · toggle enhancement below";

/**
 * Warpriest archetype ids whose own "Sacred Weapon" (or its replacement)
 * removes or reshapes the enhancement-bonus mechanic this table models —
 * see file doc comment.
 */
const SACRED_WEAPON_ENHANCEMENT_REPLACED = new Set<string>([
  "warpriest:sacred-fist",
  "warpriest:mantis-zealot",
  "warpriest:champion-of-the-faith",
  "warpriest:shieldbearer",
]);

const SACRED_WEAPON_ENHANCEMENT_CHANGES: Change[] = [
  {
    formula: "min(5, 1 + floor((@classes.warpriest.level - 4) / 4))",
    target: "attack",
    type: "enhancement",
  },
  {
    formula: "min(5, 1 + floor((@classes.warpriest.level - 4) / 4))",
    target: "wdamage",
    type: "enhancement",
  },
];

/**
 * Sacred Weapon's `tableOptions`, filtered to what the character has
 * unlocked at `classLevel`, with the character's warpriest archetypes
 * applied.
 */
export function sacredWeaponToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
): ToggleBuffOption[] {
  if (classLevel < 4) return [];
  if (classArchetypeIds.some((id) => SACRED_WEAPON_ENHANCEMENT_REPLACED.has(id))) return [];
  return [
    {
      id: "sacredWeapon:enhance",
      name: "Sacred Weapon",
      changes: SACRED_WEAPON_ENHANCEMENT_CHANGES,
      contextNotes: [
        {
          target: "allChecks",
          text: "Activating (or re-declaring) this enhancement is a swift action. It costs 1 round from the Sacred Weapon pool per round it stays active; that pool is not auto-decremented while this toggle is on, so track your own rounds spent.",
        },
        {
          target: "allChecks",
          text: "Applies to one designated sacred weapon at a time: turn this off before making attacks with a different weapon.",
        },
        {
          target: "allChecks",
          text: "You can trade part of this bonus for a weapon special ability (flaming, keen, and so on) instead of a flat enhancement bonus; that trade isn't modeled here.",
        },
      ],
    },
  ];
}

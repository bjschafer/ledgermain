/**
 * Which surface renders each toggle-buff namespace's active rows.
 *
 * `BuffsPanel` lists every active buff except the ones a dedicated panel
 * already renders and toggles itself. Keeping that decision here, beside the
 * namespace, is the whole point: a panel that claims a namespace registers it
 * once, instead of `BuffsPanel` growing another subtraction that the next
 * namespace can silently forget to join and double-render.
 *
 * `test/panelOwnedBuffs.test.ts` scans the engine's toggle tables for
 * namespaces and fails on one that is missing from this map, so adding a
 * namespace is a decision rather than an omission. Namespaces toggled from
 * this app rather than the engine (skinwalker's change shape) are listed here
 * by hand, since the scan only reaches engine source.
 *
 * `"buffs"` is the historical default, not an oversight: a Judgment or a
 * panache deed toggled from Resources still appears in the buff list, which
 * doubles as the one place to see everything currently running.
 */

import { isCombatStanceActiveBuff } from "@pf1/engine";
import type { ActiveBuff } from "@pf1/schema";

export type BuffRowOwner =
  /** A dedicated tracker panel renders and toggles these rows; BuffsPanel hides them. */
  | { owner: "panel"; panel: string }
  /** Toggled wherever it is toggled, and still listed by BuffsPanel. */
  | { owner: "buffs" };

export const TOGGLE_BUFF_NAMESPACES: Readonly<Record<string, BuffRowOwner>> = {
  combatStance: { owner: "panel", panel: "Stances" },
  combatStyle: { owner: "panel", panel: "Stances" },
  arcanePool: { owner: "buffs" },
  arcaneReservoir: { owner: "buffs" },
  grit: { owner: "buffs" },
  kiPool: { owner: "buffs" },
  panache: { owner: "buffs" },
  ragingSong: { owner: "buffs" },
  sacredWeapon: { owner: "buffs" },
  skinwalker: { owner: "buffs" },
};

/**
 * Whether a dedicated panel already owns this row. Takes the same
 * `buffId`/`effectTag` pair as a gate check, so it answers for a vendored
 * `RefData.buffs` entry (pass `{ buffId }`) as well as an active buff.
 *
 * Combat stances are the one namespace that cannot be decided from the tag
 * prefix alone: the pinned reference data carries Fighting Defensively and
 * Total Defense as ordinary buffs, and those ids have to be claimed too or an
 * older saved doc offers the player a second, stacking copy.
 */
export function isPanelOwnedBuff(buff: Pick<ActiveBuff, "buffId" | "effectTag">): boolean {
  if (isCombatStanceActiveBuff(buff)) return true;
  const namespace = buff.effectTag?.split(":")[0];
  return namespace !== undefined && TOGGLE_BUFF_NAMESPACES[namespace]?.owner === "panel";
}

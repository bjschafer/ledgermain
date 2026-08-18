/**
 * The commonly-picked splatbook Improved Familiar species beyond the CRB
 * table: silvanshee agathion, lyrakien azata, cassisian angel, nosoi
 * psychopomp, cacodaemon, arbiter inevitable, paracletus aeon, voidworm
 * protean, brownie, and faerie dragon. Hand-authored clean-room from the
 * published Bestiary 2/3/4 stat blocks (aonprd.com / d20pfsrd.com) — see
 * `types.ts` for the authoring rules. Each entry's `prereq` comes from the
 * published expanded Improved Familiar table (alignment + caster level),
 * not guessed from the creature's own alignment line.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_SPLAT: Readonly<Record<string, ImprovedFamiliar>> = {
  // Authored by the content wave — see the module doc comment.
};

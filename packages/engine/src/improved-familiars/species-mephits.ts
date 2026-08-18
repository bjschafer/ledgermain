/**
 * The ten mephits (air/dust/earth/fire/ice/magma/ooze/salt/steam/water) —
 * the CRB Improved Familiar table's "Mephit (any type)" CL 7 row.
 * Hand-authored clean-room from the published Bestiary stat blocks
 * (aonprd.com / d20pfsrd.com) — see `types.ts` for the authoring rules. The
 * ten share a chassis (Small outsider, 3 HD, DR 5/magic, breath weapon) but
 * differ per element in ability scores, resistances/vulnerabilities, SLAs,
 * and fast-healing conditions — author each entry in full rather than
 * factoring a helper, so every printed departure stays visible next to its
 * citation.
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_MEPHITS: Readonly<Record<string, ImprovedFamiliar>> = {
  // Authored by the content wave — see the module doc comment.
};

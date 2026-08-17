/**
 * Druid + ranger + paladin + antipaladin archetype features that modify the
 * tracked companion/mount — one wave shard of
 * `COMPANION_EFFECT_ARCHETYPE_FEATURES` (see `index.ts`). Keys are
 * archetype-feature classification keys; verify every number against the
 * vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const DRUID_RANGER_PALADIN_COMPANION_EFFECTS: Readonly<
  Record<string, ArchetypeCompanionEffect>
> = {
  // "The ranger's effective druid level for his animal companions is now
  // equal to his ranger level" — +3 undoes hunters-bond's −3 offset exactly,
  // so it needs (and only applies on top of) the hunters-bond source.
  "ranger:beast-master:strong-bond:12": {
    archetypeId: "ranger:beast-master",
    minLevel: 12,
    source: "Strong Bond",
    level: { grants: false, mode: "flat", amount: 3 },
  },
};

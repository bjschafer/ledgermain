/**
 * Archetype features from every other class (barbarian, bloodrager, brawler,
 * fighter, inquisitor, vigilante, ...) that modify the tracked
 * companion/mount — one wave shard of `COMPANION_EFFECT_ARCHETYPE_FEATURES`
 * (see `index.ts`). Keys are archetype-feature classification keys; verify
 * every number against the vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const OTHER_CLASS_COMPANION_EFFECTS: Readonly<Record<string, ArchetypeCompanionEffect>> = {};

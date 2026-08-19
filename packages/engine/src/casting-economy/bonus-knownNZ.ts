import type { BonusKnownSpellsDef } from "./types.js";

/**
 * Fixed bonus-known-spell grants from archetype features, classes N–Z by
 * class tag, keyed by vendored `archetypeFeatures` pack id (the oracle
 * archetype Bonus Spell schedules live here). See `BonusKnownSpellsDef` in
 * `types.ts` for the charter (fixed schedules only; player-chosen additions
 * are residue).
 */
export const ARCHETYPE_BONUS_KNOWN_SPELLS_NZ: Readonly<Record<string, BonusKnownSpellsDef>> = {};

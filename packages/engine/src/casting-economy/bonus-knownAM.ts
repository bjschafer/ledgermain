import type { BonusKnownSpellsDef } from "./types.js";

/**
 * Fixed bonus-known-spell grants from archetype features, classes A–M by
 * class tag, keyed by vendored `archetypeFeatures` pack id. See
 * `BonusKnownSpellsDef` in `types.ts` for the charter (fixed schedules only;
 * player-chosen additions are residue).
 */
export const ARCHETYPE_BONUS_KNOWN_SPELLS_AM: Readonly<Record<string, BonusKnownSpellsDef>> = {};

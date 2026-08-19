import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by archetype features, classes N–Z by class
 * tag, keyed by vendored `archetypeFeatures` pack id (same keying and shard
 * split as `ARCHETYPE_SLA_GRANTS_NZ`). See `types.ts` for the charter.
 */
export const ARCHETYPE_CASTING_ADJUSTMENTS_NZ: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {
  "occultist:silksworn:devoted-mystic:1": [
    { slug: "extra-slot-8", kind: "slots", spellLevels: "each", delta: 1, minLevel: 8 },
    { slug: "extra-slot-12", kind: "slots", spellLevels: "each", delta: 1, minLevel: 12 },
    { slug: "extra-slot-16", kind: "slots", spellLevels: "each", delta: 1, minLevel: 16 },
  ],
  "oracle:purifier:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "paladin:silver-champion:dragon-magic:4": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "ranger:nirmathi-irregular:spells:4": [
    { slug: "extra-spell", kind: "slots", spellLevels: "each", delta: 1 },
  ],
  "sorcerer:umbral-scion:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "summoner:morphic-savant:chaos-magic:2": [
    { slug: "fewer-known", kind: "known", spellLevels: [1, 2, 3, 4, 5, 6], delta: -1 },
  ],
  "summoner:unwavering-conduit:law-magic:0": [
    { slug: "fewer-known", kind: "known", spellLevels: [1, 2, 3, 4, 5, 6], delta: -1 },
  ],
  "witch:witch-watcher:diminished-spellcasting:0": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
};

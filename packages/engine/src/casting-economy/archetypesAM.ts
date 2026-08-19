import type { CastingAdjustmentDef } from "./types.js";

/**
 * Casting-economy edits granted by archetype features, classes A–M by class
 * tag, keyed by vendored `archetypeFeatures` pack id (same keying and shard
 * split as `ARCHETYPE_SLA_GRANTS_AM`). See `types.ts` for the charter.
 */
export const ARCHETYPE_CASTING_ADJUSTMENTS_AM: Readonly<
  Record<string, readonly CastingAdjustmentDef[]>
> = {
  // ── alchemist ──
  "alchemist:energy-scientist:limited-extracts:1": [
    { slug: "fewer-extracts", kind: "slots", spellLevels: "each", delta: -1 },
  ],

  // ── arcanist ──
  "arcanist:eldritch-font:font-of-power:1": [
    { slug: "extra-slot", kind: "slots", spellLevels: "each", delta: 1 },
    { slug: "fewer-prepared", kind: "prepared", spellLevels: "each", delta: -1 },
  ],

  // ── bard ──
  "bard:arrowsong-minstrel:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],

  // ── bloodrager ──
  "bloodrager:bloody-knuckled-rowdy:reduced-spells-known:1": [
    { slug: "fewer-known", kind: "known", spellLevels: "each", delta: -1 },
  ],

  // ── cleric ──
  "cleric:angelfire-apostle:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "cleric:cloistered-cleric:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "cleric:crusader:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],

  // ── druid ──
  "druid:survivor:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],

  // ── magus ──
  "magus:esoteric:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:iron-ring-striker:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:kapenia-dancer:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:kensai:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:myrmidarch:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:skirnir:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
  "magus:soul-forger:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],

  // ── medium ──
  "medium:rivethun-spirit-channeler:mind-and-soul:1": [
    { slug: "fewer-known", kind: "known", spellLevels: "each", delta: -1 },
  ],

  // ── mesmerist ──
  "mesmerist:umbral-mesmerist:diminished-spellcasting:1": [
    { slug: "fewer-slots", kind: "slots", spellLevels: "each", delta: -1 },
  ],
};

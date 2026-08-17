/**
 * Cavalier + hunter archetype features that modify the tracked mount /
 * companion — one wave shard of `COMPANION_EFFECT_ARCHETYPE_FEATURES` (see
 * `index.ts`). Keys are archetype-feature classification keys; verify every
 * number against the vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const CAVALIER_HUNTER_COMPANION_EFFECTS: Readonly<Record<string, ArchetypeCompanionEffect>> =
  {
    // "It gains a +2 bonus to Strength, but takes a -2 penalty to Dexterity."
    "cavalier:fell-rider:brute-steed:1": {
      archetypeId: "cavalier:fell-rider",
      minLevel: 1,
      source: "Brute Steed",
      changes: [
        { target: "str", type: "untyped", formula: "2" },
        { target: "dex", type: "untyped", formula: "-2" },
      ],
    },
  };

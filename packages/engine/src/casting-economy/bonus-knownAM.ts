import type { BonusKnownSpellsDef } from "./types.js";

/**
 * Fixed bonus-known-spell grants from archetype features, classes A–M by
 * class tag, keyed by vendored `archetypeFeatures` pack id. See
 * `BonusKnownSpellsDef` in `types.ts` for the charter (fixed schedules only;
 * player-chosen additions are residue).
 */
export const ARCHETYPE_BONUS_KNOWN_SPELLS_AM: Readonly<Record<string, BonusKnownSpellsDef>> = {
  "bard:brazen-deceiver:invoke-vyriavaxus:2": {
    spells: [
      { spell: "Bleed", atLevel: 2, spellLevel: 0 },
      { spell: "Touch of Fatigue", atLevel: 2, spellLevel: 0 },
      { spell: "Darkness", atLevel: 6, spellLevel: 2 },
      { spell: "Darkvision", atLevel: 6, spellLevel: 2 },
      { spell: "Shadow Conjuration", atLevel: 10, spellLevel: 4 },
      { spell: "Shadow Step", atLevel: 10, spellLevel: 4 },
      { spell: "Shadow Evocation", atLevel: 14, spellLevel: 5 },
      { spell: "Shadow Walk", atLevel: 14, spellLevel: 5 },
      { spell: "Shadow Conjuration, Greater", atLevel: 18, spellLevel: 6 },
      { spell: "Shadow Evocation, Greater", atLevel: 18, spellLevel: 6 },
    ],
  },
  "bard:flamesinger:fire-music:1": {
    spells: [
      { spell: "Summon Monster I", atLevel: 4, spellLevel: 1 },
      { spell: "Summon Monster II", atLevel: 4, spellLevel: 2 },
      { spell: "Summon Monster III", atLevel: 7, spellLevel: 3 },
      { spell: "Summon Monster IV", atLevel: 10, spellLevel: 4 },
      { spell: "Summon Monster V", atLevel: 13, spellLevel: 5 },
      { spell: "Summon Monster VI", atLevel: 16, spellLevel: 6 },
    ],
  },
  "investigator:ruthless-agent:concoction-of-truth:7": {
    spells: [{ spell: "Discern Lies", atLevel: 7, spellLevel: 3 }],
  },
  "mesmerist:projectionist:spells:1": {
    spells: [
      { spell: "Enter Image", atLevel: 4, spellLevel: 2 },
      { spell: "Object Possession, Lesser", atLevel: 7, spellLevel: 3 },
      { spell: "Riding Possession", atLevel: 10, spellLevel: 4 },
      { spell: "Object Possession", atLevel: 13, spellLevel: 5 },
      { spell: "Object Possession, Greater", atLevel: 16, spellLevel: 6 },
    ],
  },
};

/**
 * The CRB Improved Familiar table's CL 7 rows other than the mephits: imp,
 * quasit, homunculus, pseudodragon. Hand-authored clean-room from the
 * published Bestiary stat blocks (aonprd.com / d20pfsrd.com) — see
 * `types.ts` for the authoring rules (reverse-derived `baseSaves`/
 * `ownSkillRanks`, printed prereqs, defenses as display strings, SLA slugs
 * frozen once shipped).
 */

import type { ImprovedFamiliar } from "./types.js";

export const IMPROVED_FAMILIARS_CRB_OUTSIDERS: Readonly<Record<string, ImprovedFamiliar>> = {
  // The imp is the coordinator-authored pattern entry — every reverse
  // derivation below was solved against the printed stat block (Bestiary
  // p.78 via d20pfsrd.com): baseSaves subtract the ability mods back out
  // (Fort +1/Ref +6/Will +4 − Con 0/Dex 3/Wis 1), ownSkillRanks solve each
  // printed skill total (e.g. Fly +21 = Dex 3 + size 4 + perfect 8 + 3
  // ranks + class 3), and every reconciling skill is listed in classSkills.
  imp: {
    name: "Imp",
    size: "tiny",
    typeKind: "outsider",
    creatureType: "Outsider (devil, evil, extraplanar, lawful)",
    hd: 3,
    abilities: { str: 10, dex: 17, con: 10, wis: 12, cha: 14 },
    ownInt: 13,
    baseSaves: { fort: 1, ref: 3, will: 3 },
    naturalArmor: 1,
    attacks: [{ name: "Sting", count: 1, damageDice: "1d4", note: "plus poison (Fort DC 13)" }],
    speeds: { land: 20, fly: 50 },
    senses: ["darkvision 60 ft.", "see in darkness"],
    flyManeuverability: "perfect",
    ownSkillRanks: { acr: 3, blf: 3, fly: 3, kar: 3, kpl: 3, per: 3, spl: 3 },
    classSkills: ["acr", "blf", "fly", "kar", "kpl", "per", "spl"],
    defenses: {
      dr: "5/good or silver",
      fastHealing: 2,
      resist: ["acid 10", "cold 10"],
      immune: ["fire", "poison"],
    },
    slas: [
      { slug: "detect-good", name: "Detect Good", frequency: "constant", cl: 6 },
      { slug: "detect-magic", name: "Detect Magic", frequency: "constant", cl: 6 },
      {
        slug: "invisibility",
        name: "Invisibility",
        frequency: "atWill",
        cl: 6,
        note: "self only",
      },
      { slug: "augury", name: "Augury", frequency: { uses: 1, per: "day" }, cl: 6 },
      { slug: "suggestion", name: "Suggestion", frequency: { uses: 1, per: "day" }, cl: 6 },
      {
        slug: "commune",
        name: "Commune",
        frequency: { uses: 1, per: "week" },
        cl: 12,
        note: "6 questions",
      },
    ],
    languages: ["Common", "Infernal"],
    specialNotes: [
      "Poison (sting): Fort DC 13, 1/round for 6 rounds, 1d2 Dex, cure 1 save",
      "Change shape (boar, giant spider, rat, or raven; beast shape I)",
      "Own feats: Dodge (its +1 dodge AC is not folded into the derived AC), Weapon Finesse",
    ],
    prereq: { casterLevel: 7, alignment: "LE" },
    source: "Bestiary p.78 (CRB Improved Familiar table)",
  },
};

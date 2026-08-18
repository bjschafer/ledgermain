/**
 * The four Improved Familiar templates (celestial/fiendish from the CRB
 * table, entropic/resolute from Bestiary 2), applicable to any standard
 * `BASE_FAMILIARS` animal — see `types.ts`'s `FamiliarTemplate` doc comment.
 * Clean-room from the published template rules (aonprd.com / d20pfsrd.com);
 * verify every tier number against the published simple-template text before
 * wiring, and keep the smite/aligned-strike ability as `note` prose (it's a
 * once-per-day rider with no always-on number).
 */

import type { FamiliarTemplate } from "./types.js";

export const FAMILIAR_TEMPLATES: Readonly<Record<string, FamiliarTemplate>> = {
  // Coordinator-authored pattern entry (verified against the published
  // simple template): tier table is 1–4 HD resist 5 / no DR, 5–10 HD resist
  // 10 / DR 5/evil, 11+ HD resist 15 / DR 10/evil. SR is CR+5 — a 1-HD
  // familiar's CR sits below 1, so the reachable tier rounds to SR 5; the
  // higher tiers omit SR rather than approximate a CR this module doesn't
  // model (unreachable today: every BASE_FAMILIARS animal is 1 HD).
  celestial: {
    id: "celestial",
    name: "Celestial",
    senses: ["darkvision 60 ft."],
    defensesForHd: (hd) =>
      hd >= 11
        ? { resist: ["acid 15", "cold 15", "electricity 15"], dr: "10/evil" }
        : hd >= 5
          ? { resist: ["acid 10", "cold 10", "electricity 10"], dr: "5/evil" }
          : { resist: ["acid 5", "cold 5", "electricity 5"], sr: 5 },
    note: "Smite evil 1/day (swift action): adds its Cha bonus to attack rolls and its HD to damage against an evil foe, until the target dies or the celestial rests.",
    prereq: { casterLevel: 3, alignment: "NG" },
    source: "Bestiary p.294 (celestial creature); CRB Improved Familiar table",
  },
  // Same tier shape as celestial, mirrored to evil energy types (cold/fire
  // instead of acid/cold/electricity) and a good-aligned bypass.
  fiendish: {
    id: "fiendish",
    name: "Fiendish",
    senses: ["darkvision 60 ft."],
    defensesForHd: (hd) =>
      hd >= 11
        ? { resist: ["cold 15", "fire 15"], dr: "10/good" }
        : hd >= 5
          ? { resist: ["cold 10", "fire 10"], dr: "5/good" }
          : { resist: ["cold 5", "fire 5"], sr: 5 },
    note: "Smite good 1/day (swift action): adds its Cha bonus to attack rolls and its HD to damage against a good foe, until the target dies or the fiendish creature rests.",
    prereq: { casterLevel: 3, alignment: "NE" },
    source: "Bestiary p.294 (fiendish creature); CRB Improved Familiar table",
  },
  // Bestiary 2's chaos-aligned counterpart to fiendish/resolute: resists
  // acid/fire (not cold), DR bypassed by lawful.
  entropic: {
    id: "entropic",
    name: "Entropic",
    senses: ["darkvision 60 ft."],
    defensesForHd: (hd) =>
      hd >= 11
        ? { resist: ["acid 15", "fire 15"], dr: "10/lawful" }
        : hd >= 5
          ? { resist: ["acid 10", "fire 10"], dr: "5/lawful" }
          : { resist: ["acid 5", "fire 5"], sr: 5 },
    note: "Smite law 1/day (swift action): adds its Cha bonus to attack rolls and its HD to damage against a lawful foe, until the target dies or the entropic creature rests.",
    prereq: { casterLevel: 3, alignment: "CN" },
    source: "Bestiary 2 p.294 (entropic creature); CRB Improved Familiar table",
  },
  // Bestiary 2's law-aligned counterpart to entropic: resists acid/cold/fire
  // (verified against three independent source pulls — NOT acid/cold/sonic),
  // DR bypassed by chaotic.
  resolute: {
    id: "resolute",
    name: "Resolute",
    senses: ["darkvision 60 ft."],
    defensesForHd: (hd) =>
      hd >= 11
        ? { resist: ["acid 15", "cold 15", "fire 15"], dr: "10/chaotic" }
        : hd >= 5
          ? { resist: ["acid 10", "cold 10", "fire 10"], dr: "5/chaotic" }
          : { resist: ["acid 5", "cold 5", "fire 5"], sr: 5 },
    note: "Smite chaos 1/day (swift action): adds its Cha bonus to attack rolls and its HD to damage against a chaotic foe, until the target dies or the resolute creature rests.",
    prereq: { casterLevel: 3, alignment: "LN" },
    source: "Bestiary 2 p.294 (resolute creature); CRB Improved Familiar table",
  },
};

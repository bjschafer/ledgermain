/**
 * Machine-extracted mechanical effects for archetype class features (issue
 * #45 — the prose→Change extraction pipeline, pilot slice scoped to fighter
 * archetypes). Clean-room from the published PF1 rules — the vendored prose
 * this was extracted from (`archetype-features.json`) is OGL, so reading it
 * is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." `collect.ts` and `archetypes.ts`
 * both resolve through {@link resolveArchetypeFeatureEffect}, which always
 * checks the hand-verified table FIRST — an id present in both tables is
 * governed entirely by the hand-verified entry, so the two tables can never
 * silently double-apply. (No fighter id is present in both tables today; the
 * precedence rule is exercised by a dedicated fixture test.)
 *
 * Extraction pass (2026-07-06): every feature of every vendored fighter
 * archetype was read and classified as `numeric` / `situational` /
 * `subsystem` / `blocked` — see `archetype-classification.ts` for the full,
 * per-feature audit. Only `numeric` features get an entry here. The honesty
 * bar is identical to the hand-verified table's: a bonus scoped to a specific
 * maneuver, weapon, enemy state, or action (real number, but the static sheet
 * can't safely apply it everywhere) is `situational`, not `numeric` — see the
 * classification file and IMPLEMENTATION_PLAN.md's dated pipeline section for
 * the full rubric.
 *
 * Confidence rubric:
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism (e.g. Armor Training's mDexA/acpA), or a single, clearly-worded,
 *    fully general (no scope restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from prose
 *    (an irregular schedule, a delayed onset), or the bonus is gated on a
 *    real-but-partial condition this engine CAN check (`@armor.type`) while a
 *    second, textually-present condition (encumbrance, a specific shield)
 *    can't be checked and is dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pilot batch — reserved for future waves with
 *    messier prose.
 */

import type { Change } from "@pf1/schema";

import type { ArchetypeFeatureEffect } from "./archetype-effects.js";

export type ExtractionConfidence = "high" | "medium" | "low";

export interface ExtractedArchetypeFeatureEffect extends ArchetypeFeatureEffect {
  /** How confident the extraction pass is in this entry — see the rubric above. */
  confidence: ExtractionConfidence;
  /** The exact source sentence(s) the number(s) were extracted from. */
  provenance: string;
}

const c = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});

export const ARCHETYPE_FEATURE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── Armor Training reflavors (literal — identical progression) ───────────

  "fighter:aerial-assaulter:armor-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
    confidence: "high",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. Every four " +
      "levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 each time, to a " +
      "maximum -4 reduction of the armor check penalty and a +4 increase of the maximum " +
      "Dexterity bonus allowed.",
  },
  "fighter:aldori-defender:defensive-parry:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
    confidence: "high",
    provenance:
      "Starting at 3rd level, a fighter learns to be more maneuverable while wearing armor. " +
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum of " +
      "0) and increases the maximum Dexterity bonus allowed by his armor by 1. Every four " +
      "levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 each time.",
  },
  "fighter:child-of-acavna-and-amaznen:eldritch-armor-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) =>
      `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor); arcane spell ` +
      `failure reduction not modeled`,
    confidence: "high",
    provenance:
      "At 3rd level, a child of Acavna and Amaznen gains eldritch armor training. This " +
      "functions as armor training, except as a swift action she can also reduce the arcane " +
      "spell failure chance due to armor she is wearing by 15% for any spells she casts this " +
      "round.",
  },

  // ── Armor Training reflavors (modified cadence) ───────────────────────────

  "fighter:cyber-soldier:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level these bonuses increase by +1.",
  },
  "fighter:mobile-fighter:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level, these bonuses increase by +1.",
  },
  "fighter:tactician:armor-training:3": {
    changes: [
      c("if(gte(@class.unlevel, 7), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 7), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 7 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. At 7th " +
      "level, these bonuses increase by +1.",
  },
  "fighter:dragoon:armor-training:3": {
    changes: [c("1", "mDexA"), c("-1", "acpA")],
    detail: () => "+1 max Dex / -1 ACP (armor)",
    confidence: "medium",
    provenance:
      "Whenever he is wearing armor, he reduces the armor check penalty by 1 (to a minimum " +
      "of 0) and increases the maximum Dexterity bonus allowed by his armor by 1. In addition, " +
      "a fighter can also move at his normal speed while wearing medium armor." +
      " (no further scaling stated)",
  },
  "fighter:rondelero-duelist:armor-training:7": {
    changes: [
      c("if(gte(@class.unlevel, 15), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 15), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 15 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Starting at 7th level, a fighter learns to be more maneuverable while wearing armor. " +
      "... At level 15, these bonuses increase by +1 each.",
  },
  "fighter:weapon-bearer-squire:armor-training:7": {
    changes: [
      c("clamp(floor((@class.unlevel - 3) / 4), 0, 3)", "mDexA"),
      c("-clamp(floor((@class.unlevel - 3) / 4), 0, 3)", "acpA"),
    ],
    detail: (level) => `+${Math.min(3, Math.floor((level - 3) / 4))} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Starting at 7th level, a fighter learns to be more maneuverable while wearing armor. " +
      "... Every four levels thereafter (7th, 11th, and 15th), these bonuses increase by +1 " +
      "each time.",
  },

  // ── General, unconditional skill/save/init/CMB-CMD/natural-armor bonuses ─

  "fighter:aerial-assaulter:aerial-expertise:2": {
    changes: [c("min(10, 2 + 2 * floor((@class.unlevel - 2) / 4))", "skill.fly")],
    detail: (level) => `+${Math.min(10, 2 + 2 * Math.floor((level - 2) / 4))} Fly`,
    confidence: "high",
    provenance:
      "At 2nd level, an aerial assaulter gains a +2 bonus on Fly checks. ... At 6th level and " +
      "every 4 levels thereafter, this bonus on Fly checks increases by an additional 2, to a " +
      "maximum of +10 at 18th level.",
  },
  "fighter:tactician:tactical-awareness:2": {
    changes: [c("min(5, 1 + floor((@class.unlevel - 2) / 4))", "init")],
    detail: (level) => `+${Math.min(5, 1 + Math.floor((level - 2) / 4))} initiative`,
    confidence: "high",
    provenance:
      "At 2nd level, a tactician gains a +1 bonus on initiative checks. This bonus increases " +
      "by +1 for every four levels after 2nd level (to a maximum of +5 at 18th level).",
  },
  "fighter:lore-warden-pfs-field-guide:maneuver-mastery:3": {
    changes: [
      c("min(8, 2 + 2 * floor((@class.unlevel - 3) / 4))", "cmb"),
      c("min(8, 2 + 2 * floor((@class.unlevel - 3) / 4))", "cmd"),
    ],
    detail: (level) => `+${Math.min(8, 2 + 2 * Math.floor((level - 3) / 4))} CMB/CMD`,
    confidence: "high",
    provenance:
      "At 3rd level, a lore warden gains a +2 bonus on all CMB checks and to his CMD. This " +
      "bonus increases to +4 at 7th level, +6 at 11th level, and +8 at 15th level.",
  },
  "fighter:dragonheir-scion:draconic-defense:3": {
    changes: [c("if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 7), 2, 1))", "nac", "base")],
    detail: (level) =>
      `+${level >= 13 ? 3 : level >= 7 ? 2 : 1} natural armor (energy resistance vs. chosen ` +
      `energy type not modeled — energy type isn't tracked in the schema)`,
    confidence: "high",
    provenance:
      "At 3rd level, a dragonheir scion gains a +1 natural armor bonus and energy resistance " +
      "5 against her energy type. At 7th level, this increases to a +2 natural armor bonus " +
      "and energy resistance 10; at 13th level, it increases to a +3 natural armor bonus and " +
      "energy resistance 20.",
  },
  "fighter:swarm-fighter:athletic-prowess:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.acr"),
      c("floor(@class.unlevel / 2)", "skill.clm"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Acrobatics/Climb`,
    confidence: "high",
    provenance:
      "A swarm fighter adds Acrobatics and Climb to her class skills, and gains a bonus on " +
      "checks with these skills equal to 1/2 her swarm fighter level.",
  },

  // ── Bonuses gated on `@armor.type` (a real, if partial, condition check) ──
  // `@armor.type` (0 none, 1 light, 2 med, 3 heavy — see rolldata.ts) already
  // has precedent in the hand-verified table (Savage Barbarian's Natural
  // Toughness). Each of these also has a SECOND textual condition (an
  // encumbrance/load state, or "not using a shield") the engine has no roll
  // data for at all — dropped rather than guessed at, and called out in
  // `detail` so the UI doesn't imply full RAW fidelity.

  // NOTE: Warlord's "Sun-Bronzed Skin" (DR 5/- while unarmored/no shield) was
  // extracted, hand-computed, and then DELIBERATELY DROPPED after discovering
  // a real engine-pipeline limitation: a conditional `dr`-target Change
  // formula (`if(eq(@armor.type,0),5,0)`) always contributes a modifier, even
  // when it evaluates to 0 — unlike `ac`/`skill.*`, which are always-rendered
  // totals a zero component quietly disappears into, `defenses.ts` only
  // materializes `DerivedSheet.defenses` (and `Sheet.tsx`'s whole "Defenses"
  // stat-group) when at least one dr/resistance/sr entry exists at all, so an
  // armored Warlord with no other DR source would show a spurious "DR/— 0"
  // seal that shouldn't be there. Recorded as `situational` in
  // `archetype-classification.ts` instead — see that file for the full
  // writeup; this is a real process-doc finding (avoid conditional Changes on
  // `dr`/`eres` targets specifically), not a shortcut.
  "fighter:free-hand-fighter:elusive:3": {
    changes: [c("if(lte(@armor.type, 1), 1 + floor((@class.unlevel - 3) / 4), 0)", "ac", "dodge")],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 4)} dodge AC (light/no armor; medium+ load not checked)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a free hand fighter gains a +1 dodge bonus to AC. This bonus increases " +
      "by +1 for every four levels after 2nd. This bonus does not apply when wearing medium " +
      "or heavy armor or carrying a medium or heavier load.",
  },
  "fighter:skirmisher:mobility-training:3": {
    changes: [
      c("if(lte(@armor.type, 1), min(4, 1 + floor((@class.unlevel - 3) / 4)), 0)", "ac", "dodge"),
      c(
        "if(lte(@armor.type, 1), if(gte(@class.unlevel, 7), 10, 5), 0)",
        "landSpeed",
        "enhancement",
      ),
    ],
    detail: (level) =>
      `+${Math.min(4, 1 + Math.floor((level - 3) / 4))} dodge AC / +${level >= 7 ? 10 : 5} ft. ` +
      `land speed (light/no armor; light load not checked)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a skirmisher learns to be more maneuverable while wearing light or no " +
      "armor. He gains a +1 dodge bonus to AC while wearing light or no armor and while " +
      "carrying no more than a light load. ... This bonus increases by 1 for every 4 levels " +
      "beyond 3rd (to a maximum of +4 at 15th level). In addition, a skirmisher gains an " +
      "enhancement bonus of +5 feet to his base speed. At 7th level, the bonus increases to " +
      "+10 feet.",
  },
};

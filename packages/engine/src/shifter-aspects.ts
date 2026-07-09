/**
 * Clean-room PF1 shifter aspect table (Pathfinder Player Companion: Blood of
 * the Beast, issue #65): hand-authored from the published rules (verified
 * against aonprd.com's Shifter Aspects listing, cross-checked against
 * d20pfsrd.com's mirror — both agree verbatim on every number below),
 * mirroring `witch-hexes.ts`'s posture — aspects are NOT part of the
 * vendored Foundry data pack (the Shifter class def only links the generic
 * "Shifter Aspect"/"Chimeric Aspect"/"Greater Chimeric Aspect"/"Final
 * Aspect" stub `ClassFeature`s, no per-aspect breakdown — confirmed:
 * `class-features.json` carries no per-aspect entries), so there is no
 * upstream JSON to normalize.
 *
 * IMPORTANT — do not confuse with hunter's Animal Focus (a different,
 * concurrently-built subsystem): both rhyme (animal-themed, minor
 * ability-bonus-at-1st/8th/15th shape) but are NOT mechanically identical —
 * e.g. hunter's Animal Focus (Wolf) buff scales scent range on a totally
 * different formula shape than shifter's Wolf aspect. This file is
 * deliberately self-contained (its own table, its own toggle model, no
 * shared module with any hunter code) per this project's convention of
 * keeping concurrently-developed class subsystems isolated until a later
 * unification pass, if any.
 *
 * Scope: all 30 Blood of the Beast aspects.
 *
 * Budget (PF1 RAW, "Shifter Aspect" class feature text): a shifter knows 1
 * aspect at 1st level, a 2nd at 5th, a 3rd at 10th, a 4th at 15th, and (via
 * the 20th-level "Final Aspect" class feature) a 5th at 20th — see
 * `model/shifterAspects.ts` for the budget math. Chimeric Aspect (9th) and
 * Greater Chimeric Aspect (14th) do NOT add to this budget — they let a
 * shifter manifest MULTIPLE of her already-known aspects' minor forms
 * simultaneously (2 at 9th, 3 at 14th, all of them at 20th via Final
 * Aspect); this table does not model the "how many minor forms active at
 * once" cap at all — see `model/shifterAspects.ts`'s toggle, which lets
 * every known aspect's minor form be toggled independently (the player is
 * trusted to only have as many active as their level allows, same
 * trust-the-player posture as everything else in this project's hybrid
 * prereqs philosophy).
 *
 * Major form (turning into the aspect's full battle form via the Wild Shape
 * class feature, 4th level) is a polymorph-family effect and is explicitly
 * DEFERRED to issue #70 (the project's dedicated polymorph/wild-shape
 * effort) — this table only covers each aspect's MINOR form (the passive,
 * always-available swift-action toggle).
 *
 * Modelling posture: unlike witch hexes/discoveries (where almost nothing
 * clears the bar), a genuine plurality of minor forms here ARE flat,
 * unconditional, self-targeting numbers once the minor form is active — a
 * real toggleable buff, same shape as Mutagen/Rage (see
 * `minorFormChanges`). The ones that AREN'T (a feat grant, a narrow-use-case
 * skill bonus, a maneuver-specific bonus, a conditional-trigger bonus, a
 * damage rider, an ability grant with no Change target, or a sense grant
 * whose "if you already have X, add Y instead" RAW clause the engine's
 * lowest-wins set-change resolution would handle backwards) are called out
 * in `contextNotes` instead, with `minorFormChanges: []` — same discipline
 * as `witch-hexes.ts`'s Cauldron/Flight/Ward carve-outs.
 */

import type { Change, ContextNote } from "@pf1/schema";

export interface ShifterAspectDef {
  id: string;
  name: string;
  /** Short rules summary of the minor form's benefit (paraphrased, not verbatim SRD text). */
  summary: string;
  /** One-line pointer to the major form (Wild Shape) — always a deferred-to-#70 note. */
  majorFormNote: string;
  /**
   * Typed modifiers the minor form applies while toggled on (empty when no
   * part of the benefit clears the honesty bar — see file doc comment).
   * Formulas reference `@classes.shifter.level` (the standard roll-data path
   * for a class-scoped level lookup — see `resources.ts`'s Rage precedent,
   * which uses the identical `@classes.<tag>.level` shape).
   */
  minorFormChanges: Change[];
  /** Non-mechanical reminders for the parts of the minor form not covered by `minorFormChanges`. */
  contextNotes?: ContextNote[];
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const MAJOR_FORM_NOTE =
  "Major form (Wild Shape into this aspect's battle form) is a polymorph-family effect — deferred to issue #70.";

/** `if(gte(@classes.shifter.level, 15), v15, if(gte(@classes.shifter.level, 8), v8, v1))` */
function scaledChange(target: string, type: string, v1: number, v8: number, v15: number): Change {
  return {
    formula: `if(gte(@classes.shifter.level, 15), ${v15}, if(gte(@classes.shifter.level, 8), ${v8}, ${v1}))`,
    target,
    type,
  };
}

interface RawAspect {
  id: string;
  name: string;
  summary: string;
  minorFormChanges?: Change[];
  contextNotes?: ContextNote[];
}

function build(entries: RawAspect[]): ShifterAspectDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    summary: e.summary,
    majorFormNote: MAJOR_FORM_NOTE,
    minorFormChanges: e.minorFormChanges ?? [],
    contextNotes: e.contextNotes,
  }));
}

const ASPECT_LIST: ShifterAspectDef[] = build([
  {
    id: "bat",
    name: "Bat",
    summary:
      "Darkvision 60 ft. (90 ft. at 8th/15th; +30 ft. instead if you already have darkvision).",
    contextNotes: [
      note(
        "Darkvision grant/increase — the engine resolves competing 'set' darkvision changes by lowest-value, which would be wrong for a beneficial grant like this; apply manually rather than risk suppressing a better existing source.",
        "sensedv",
      ),
    ],
  },
  {
    id: "bear",
    name: "Bear",
    summary: "+2 enhancement bonus to Constitution (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("con", "enhancement", 2, 4, 6)],
  },
  {
    id: "boar",
    name: "Boar",
    summary:
      "Gain Diehard as a bonus feat. At 8th level, add your Hit Dice to Constitution when determining the negative HP at which you die.",
    contextNotes: [
      note("Grants a bonus feat — add it to Feats separately.", "bonusFeats"),
      note(
        "Death-threshold adjustment — this engine doesn't model an incapacitation/death threshold stat.",
      ),
    ],
  },
  {
    id: "bull",
    name: "Bull",
    summary: "+2 enhancement bonus to Strength (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("str", "enhancement", 2, 4, 6)],
  },
  {
    id: "crocodile",
    name: "Crocodile",
    summary:
      "+2 competence bonus on Swim checks and grapple combat maneuver checks (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("skill.swm", "competence", 2, 4, 6)],
    contextNotes: [
      note(
        "The grapple-maneuver portion is maneuver-specific, not a generic CMB Change target — apply manually.",
        "cmb",
      ),
    ],
  },
  {
    id: "deinonychus",
    name: "Deinonychus",
    summary: "+2 bonus on Initiative checks (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("init", "untyped", 2, 4, 6)],
  },
  {
    id: "dolphin",
    name: "Dolphin",
    summary:
      "+4 competence bonus on Knowledge checks to identify a creature's abilities/weaknesses (+6 at 8th level, +8 at 15th).",
    contextNotes: [
      note(
        "Narrow use-case (identifying a specific creature), not a general Knowledge-check bonus — applying it to all Knowledge checks would overstate it.",
        "skill.kno",
      ),
    ],
  },
  {
    id: "dragonfly",
    name: "Dragonfly",
    summary:
      "+10 ft. enhancement bonus to speed when charging (+20 ft. at 8th level, +30 ft. at 15th).",
    contextNotes: [note("Charge-only — not an unconditional speed Change target.", "landSpeed")],
  },
  {
    id: "electricEel",
    name: "Electric Eel",
    summary: "Attacks deal +1 electricity damage (+1d3 at 8th level, +1d6 at 15th).",
    contextNotes: [
      note("Damage rider on attacks — this engine has no per-attack damage-rider target."),
    ],
  },
  {
    id: "elephant",
    name: "Elephant",
    summary:
      "+4 bonus on bull rush and overrun combat maneuver checks (+6 at 8th level, +8 at 15th).",
    contextNotes: [
      note("Maneuver-specific, not a generic CMB Change target — apply manually.", "cmb"),
    ],
  },
  {
    id: "falcon",
    name: "Falcon",
    summary: "+4 competence bonus on Perception checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.per", "competence", 4, 6, 8)],
  },
  {
    id: "frog",
    name: "Frog",
    summary:
      "+4 competence bonus on Acrobatics checks when jumping and on Swim checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.swm", "competence", 4, 6, 8)],
    contextNotes: [
      note(
        "The Acrobatics portion is scoped to jump checks only, not general Acrobatics — applying it broadly would overstate it.",
        "skill.acr",
      ),
    ],
  },
  {
    id: "giantWasp",
    name: "Giant Wasp",
    summary: "+4 bonus on Will saves against mind-affecting effects (+6 at 8th level, +8 at 15th).",
    contextNotes: [
      note(
        "Scoped to mind-affecting effects only, not general Will saves — applying it broadly would overstate it.",
        "will",
      ),
    ],
  },
  {
    id: "horse",
    name: "Horse",
    summary:
      "Gain Endurance as a bonus feat and +5 ft. enhancement bonus to speed. Gain Run at 8th level (or run at 6x speed if you already have it); speed bonus increases to +15 ft. at 15th.",
    minorFormChanges: [
      {
        formula: "if(gte(@classes.shifter.level, 15), 15, 5)",
        target: "landSpeed",
        type: "enhancement",
      },
    ],
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "lion",
    name: "Lion",
    summary: "+4 competence bonus on Intimidate checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.int", "competence", 4, 6, 8)],
  },
  {
    id: "lizard",
    name: "Lizard",
    summary: "+4 competence bonus on Acrobatics checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.acr", "competence", 4, 6, 8)],
  },
  {
    id: "mantis",
    name: "Mantis",
    summary: "Gain Lunge as a bonus feat. At 12th level, gain +5 ft. reach.",
    minorFormChanges: [
      { formula: "if(gte(@classes.shifter.level, 12), 5, 0)", target: "reach", type: "untyped" },
    ],
    contextNotes: [note("Grants a bonus feat — add it to Feats separately.", "bonusFeats")],
  },
  {
    id: "monkey",
    name: "Monkey",
    summary: "+4 competence bonus on Climb checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.clm", "competence", 4, 6, 8)],
  },
  {
    id: "mouse",
    name: "Mouse",
    summary: "Gain evasion, as the rogue class feature (improved evasion at 12th level).",
    contextNotes: [note("Ability grant, not a numeric Change.")],
  },
  {
    id: "octopus",
    name: "Octopus",
    summary: "+4 competence bonus on Escape Artist checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.esc", "competence", 4, 6, 8)],
  },
  {
    id: "owl",
    name: "Owl",
    summary: "+4 competence bonus on Stealth checks (+6 at 8th level, +8 at 15th).",
    minorFormChanges: [scaledChange("skill.ste", "competence", 4, 6, 8)],
  },
  {
    id: "peafowl",
    name: "Peafowl",
    summary: "+2 enhancement bonus to Charisma (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("cha", "enhancement", 2, 4, 6)],
  },
  {
    id: "scorpion",
    name: "Scorpion",
    summary:
      "+2 competence bonus on Stealth checks and grapple combat maneuver checks (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("skill.ste", "competence", 2, 4, 6)],
    contextNotes: [
      note(
        "The grapple-maneuver portion is maneuver-specific, not a generic CMB Change target — apply manually.",
        "cmb",
      ),
    ],
  },
  {
    id: "snake",
    name: "Snake",
    summary:
      "+2 bonus on attack rolls made as attacks of opportunity and +2 dodge bonus to AC against attacks of opportunity (+4 at 8th level, +6 at 15th).",
    contextNotes: [
      note(
        "Scoped to attacks of opportunity only — not an unconditional attack/AC Change target.",
        "attack",
      ),
    ],
  },
  {
    id: "snappingTurtle",
    name: "Snapping Turtle",
    summary: "+2 enhancement bonus to Wisdom (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("wis", "enhancement", 2, 4, 6)],
  },
  {
    id: "spider",
    name: "Spider",
    summary:
      "+2 competence bonus on Climb checks, Stealth checks, and saves/checks vs. webs (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [
      scaledChange("skill.clm", "competence", 2, 4, 6),
      scaledChange("skill.ste", "competence", 2, 4, 6),
    ],
    contextNotes: [
      note(
        "The web-save/break-free portion is situational, not an unconditional saving-throw Change target.",
      ),
    ],
  },
  {
    id: "stag",
    name: "Stag",
    summary: "+5 ft. enhancement bonus to speed (+10 ft. at 8th level, +20 ft. at 15th).",
    minorFormChanges: [scaledChange("landSpeed", "enhancement", 5, 10, 20)],
  },
  {
    id: "tiger",
    name: "Tiger",
    summary: "+2 enhancement bonus to Dexterity (+4 at 8th level, +6 at 15th).",
    minorFormChanges: [scaledChange("dex", "enhancement", 2, 4, 6)],
  },
  {
    id: "wolf",
    name: "Wolf",
    summary:
      "Gain scent (10 ft. range, or +10 ft. if you already have scent); range increases to 20 ft. at 8th level and 30 ft. at 15th.",
    contextNotes: [
      note(
        "Scent grant/increase — the engine resolves competing 'set' sense changes by lowest-value, which would be wrong for a beneficial grant like this; apply manually rather than risk suppressing a better existing source.",
        "sensesc",
      ),
    ],
  },
  {
    id: "wolverine",
    name: "Wolverine",
    summary:
      "+1 hit point per Hit Die; treat Constitution as 4 higher for the negative-HP death threshold. Gain Diehard as a bonus feat at 8th level; treat Constitution as 8 higher at 15th.",
    contextNotes: [
      note(
        "Per-Hit-Die HP bonus and death-threshold adjustment — this engine doesn't model an incapacitation/death threshold stat.",
      ),
      note("Grants a bonus feat at 8th level — add it to Feats separately.", "bonusFeats"),
    ],
  },
]);

export const SHIFTER_ASPECTS: Record<string, ShifterAspectDef> = Object.fromEntries(
  ASPECT_LIST.map((a) => [a.id, a]),
);

export const SHIFTER_ASPECT_IDS: readonly string[] = ASPECT_LIST.map((a) => a.id);

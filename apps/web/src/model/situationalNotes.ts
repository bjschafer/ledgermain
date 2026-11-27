/**
 * Where a situational note belongs on the live sheet. The engine carries every
 * active note on `DerivedSheet.situationalNotes`; this module is the single
 * target-to-surface map the seals, skill rows, and skills header share, so a
 * note like "+4 Perception to notice traps" lands on the Perception row rather
 * than only on the feat that granted it.
 *
 * Targets that name no single sheet surface (spell effects, caster level,
 * ability checks, damage, defenses, senses, speed, ...) stay unmapped: their
 * note remains on the source row, which is the honest place for a reminder
 * with nowhere specific to be consulted.
 */

import { PARAMETERIZED_SKILL_PREFIXES } from "@pf1/engine";
import type { SituationalNote } from "@pf1/schema";

/** A sheet location a note can be shown on. `skills` is the section header. */
export type SituationalSurface =
  | "ac"
  | "cmd"
  | "cmb"
  | "fort"
  | "ref"
  | "will"
  | "init"
  | "melee"
  | "ranged"
  | "skills"
  | `skill:${string}`;

const SAVE_SURFACES = ["fort", "ref", "will"] as const;

const MELEE_TARGETS = new Set(["melee", "meleeWeapon", "mattack"]);
const RANGED_TARGETS = new Set(["ranged", "rangedWeapon", "rattack"]);

/**
 * `skills` and the six `<ability>Skills` targets apply to a whole family of
 * rows, so they get one marker on the section header rather than a badge on
 * every row. Ability CHECKS (`strChecks`, `allChecks`, ...) are not skills and
 * have no sheet surface, so they stay unmapped.
 */
const ALL_SKILLS_TARGETS = new Set([
  "skills",
  "strSkills",
  "dexSkills",
  "conSkills",
  "intSkills",
  "wisSkills",
  "chaSkills",
]);

export function noteSurfaces(target: string): SituationalSurface[] {
  switch (target) {
    case "ac":
      return ["ac"];
    case "cmd":
      return ["cmd"];
    case "cmb":
      return ["cmb"];
    case "allSavingThrows":
      return [...SAVE_SURFACES];
    case "fort":
    case "ref":
    case "will":
      return [target];
    case "init":
      return ["init"];
    case "attack":
      return ["melee", "ranged"];
    default:
      break;
  }

  if (MELEE_TARGETS.has(target)) return ["melee"];
  if (RANGED_TARGETS.has(target)) return ["ranged"];
  if (ALL_SKILLS_TARGETS.has(target)) return ["skills"];

  if (target.startsWith("skill.")) {
    const id = target.slice("skill.".length);
    // A bare Craft/Profession/Perform target covers every instance of that
    // family, which is a section-level reminder rather than one row's.
    return PARAMETERIZED_SKILL_PREFIXES.has(id) ? ["skills"] : [`skill:${id}`];
  }

  // A maneuver-scoped target ("cmb.trip") still belongs on the maneuver's own
  // seal; the seal already prints the situational total beside its headline.
  if (target.startsWith("cmb.")) return ["cmb"];
  if (target.startsWith("cmd.")) return ["cmd"];

  return [];
}

/** Group notes by every surface they belong on, preserving engine order. */
export function groupSituationalNotes(
  notes: readonly SituationalNote[],
): Map<SituationalSurface, SituationalNote[]> {
  const grouped = new Map<SituationalSurface, SituationalNote[]>();
  for (const note of notes) {
    for (const surface of noteSurfaces(note.target)) {
      const existing = grouped.get(surface);
      if (existing) existing.push(note);
      else grouped.set(surface, [note]);
    }
  }
  return grouped;
}

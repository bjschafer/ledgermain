/**
 * Class alignment restrictions — soft-warning only, same hybrid posture as
 * `archetypeConflictWarnings`/`prereqs.ts`: PF1 restricts a handful of base
 * classes to a subset of the nine alignments, but nothing in this app ever
 * hard-blocks a build choice, so a mismatch surfaces as a warning in the
 * Classes section, never a block. A homebrew table can toggle
 * `settings.ignoreClassAlignmentRestrictions` to suppress the warnings
 * entirely (unrestricted-alignment house rule).
 *
 * The vendored Foundry class data (`packages/data-pipeline/data/classes.json`)
 * carries alignment restrictions only as prose inside `description` — no
 * structured field — so this is a small hand-authored, clean-room table (PF1
 * CRB rules, cross-checked against d20pfsrd.com / Archives of Nethys; never
 * transcribed from Foundry's GPL system code — see CLAUDE.md's licensing
 * section). Only classes with an actual restriction get an entry; every class
 * tag absent from this table (fighter, rogue, wizard, sorcerer, arcanist,
 * magus, ranger, bard, oracle,...) is alignment-unrestricted in PF1 — notably
 * Bard, whose 3.5e "any nonlawful" restriction PF1 dropped.
 *
 * Cleric is deliberately excluded: PF1 RAW restricts a cleric to within one
 * step of their deity's alignment, but `RefData` carries no deity->alignment
 * mapping (and `identity.deity` is free text), so there is nothing structured
 * to check this against — inventing a deity table is out of scope here.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import { normalizeAlignmentCode } from "./names.js";

export interface ClassAlignmentRestriction {
  /** Alignment codes this class permits (from the 9-cell PF1 grid). */
  allowed: readonly string[];
  /** Short one-line flavor text: what happens if the alignment is violated. */
  exFlavor: string;
}

/**
 * classTag -> restriction, for the base classes in the vendored data slice
 * that actually carry one (CRB p. 26-95 class alignment entries).
 */
export const CLASS_ALIGNMENT_RESTRICTIONS: Record<string, ClassAlignmentRestriction> = {
  barbarian: {
    // CRB: "Any nonlawful" — excludes LG/LN/LE.
    allowed: ["NG", "CG", "N", "CN", "NE", "CE"],
    exFlavor:
      "A barbarian who becomes lawful loses the ability to rage and cannot gain new rage powers.",
  },
  monk: {
    // CRB: "Any lawful" — excludes NG/CG/N/CN/NE/CE.
    allowed: ["LG", "LN", "LE"],
    exFlavor:
      "A monk who becomes nonlawful cannot gain new monk levels but retains existing class abilities.",
  },
  paladin: {
    // CRB: "Lawful good" only.
    allowed: ["LG"],
    exFlavor:
      "A paladin who ceases to be lawful good loses all paladin spells and abilities (except proficiencies) until atoned.",
  },
  druid: {
    // CRB: "Any neutral" — must have a neutral component (LN/NG/N/CN/NE);
    // excludes the four extreme alignments LG/CG/LE/CE.
    allowed: ["LN", "NG", "N", "CN", "NE"],
    exFlavor: "A druid who ceases to be neutral loses all druid spells and abilities until atoned.",
  },
  shifter: {
    // ACG: "Any neutral", same restriction shape as druid (a shifter is a
    // druid-derived class) — must have a neutral component; excludes the four
    // extreme alignments LG/CG/LE/CE.
    allowed: ["LN", "NG", "N", "CN", "NE"],
    exFlavor:
      "A shifter who ceases to revere nature, changes to a prohibited alignment, or teaches Druidic to a non-druid/non-shifter loses all her supernatural abilities.",
  },
  antipaladin: {
    // APG: "Any evil" — excludes LG/NG/CG/LN/N/CN, the mirror-image
    // restriction of paladin's "Lawful good" only.
    allowed: ["LE", "NE", "CE"],
    exFlavor:
      "An antipaladin who ceases to be evil loses all antipaladin spells and abilities (except proficiencies) until she atones (see the atonement spell description).",
  },
};

/**
 * The seven non-caster classes added to the vendored data slice alongside
 * shifter (cavalier, gunslinger, brawler, slayer, swashbuckler, vigilante)
 * are all "Any" per their class descriptions (Advanced Class Guide /
 * Ultimate Combat / Ultimate Intrigue) — verified against aonprd.com and
 * intentionally absent from `CLASS_ALIGNMENT_RESTRICTIONS` above, same as
 * fighter/rogue/wizard/etc.
 */

export interface ClassAlignmentWarning {
  classTag: string;
  className: string;
  message: string;
}

/**
 * Per-class alignment warnings for `doc`'s current build. Warns once per
 * offending class (multiclass-aware — e.g. a Barbarian/Monk with a chaotic
 * alignment gets one warning for the Monk side only). Returns `[]` when:
 * - no alignment is set (legacy docs, or a player who hasn't picked one yet)
 * - the alignment text doesn't normalize to a recognized code (nothing to
 *   check against)
 * - `settings.ignoreClassAlignmentRestrictions` is set (homebrew toggle)
 */
export function classAlignmentWarnings(
  doc: CharacterDoc,
  refData: RefData,
): ClassAlignmentWarning[] {
  if (doc.build.settings?.ignoreClassAlignmentRestrictions) return [];
  const raw = doc.identity.alignment;
  if (!raw) return [];
  const code = normalizeAlignmentCode(raw);
  if (!code) return [];

  const classesByTag = Object.values(refData.classes);
  const warnings: ClassAlignmentWarning[] = [];
  for (const cls of doc.identity.classes) {
    const restriction = CLASS_ALIGNMENT_RESTRICTIONS[cls.tag];
    if (!restriction) continue;
    if (restriction.allowed.includes(code)) continue;
    const className = classesByTag.find((c) => c.tag === cls.tag)?.name ?? cls.tag;
    warnings.push({
      classTag: cls.tag,
      className,
      message: `${className} requires ${allowedAlignmentsLabel(restriction.allowed)}. ${restriction.exFlavor}`,
    });
  }
  return warnings;
}

/** "Lawful Good" / "Lawful Good / Lawful Neutral / Lawful Evil" etc. */
function allowedAlignmentsLabel(codes: readonly string[]): string {
  return codes.map((c) => ALIGNMENT_FULL_LABELS[c] ?? c).join(" / ");
}

const ALIGNMENT_FULL_LABELS: Record<string, string> = {
  LG: "Lawful Good",
  NG: "Neutral Good",
  CG: "Chaotic Good",
  LN: "Lawful Neutral",
  N: "Neutral",
  CN: "Chaotic Neutral",
  LE: "Lawful Evil",
  NE: "Neutral Evil",
  CE: "Chaotic Evil",
};

/** Law axis order (Lawful -> Neutral -> Chaotic) for {@link alignmentWithinOneStep}'s distance check. */
const LAW_AXIS_ORDER: Record<string, number> = { L: 0, N: 1, C: 2 };
/** Moral axis order (Good -> Neutral -> Evil) for {@link alignmentWithinOneStep}'s distance check. */
const MORAL_AXIS_ORDER: Record<string, number> = { G: 0, N: 1, E: 2 };

/** A code's law/moral axis letters; bare "N" (true neutral) sits at the middle of both axes. */
function alignmentAxes(code: string): { law: string; moral: string } {
  return code === "N" ? { law: "N", moral: "N" } : { law: code[0]!, moral: code[1]! };
}

/**
 * Whether two alignments (free text or codes, e.g. "LE", "lawful evil") are
 * within one step of each other on BOTH axes (PF1's usual "one step"
 * alignment rule, e.g. the Improved Familiar feat's alignment prereq).
 * `undefined` when either fails to parse via `normalizeAlignmentCode` —
 * callers should treat that as "nothing to check", not a failed check.
 */
export function alignmentWithinOneStep(a: string, b: string): boolean | undefined {
  const codeA = normalizeAlignmentCode(a);
  const codeB = normalizeAlignmentCode(b);
  if (!codeA || !codeB) return undefined;
  const axesA = alignmentAxes(codeA);
  const axesB = alignmentAxes(codeB);
  const lawDist = Math.abs(LAW_AXIS_ORDER[axesA.law]! - LAW_AXIS_ORDER[axesB.law]!);
  const moralDist = Math.abs(MORAL_AXIS_ORDER[axesA.moral]! - MORAL_AXIS_ORDER[axesB.moral]!);
  return lawDist <= 1 && moralDist <= 1;
}

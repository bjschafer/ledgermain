/**
 * Prestige-class entry-requirement gating (issue #66 chunk 3) — the class-level
 * counterpart to `prereqs.ts`'s feat gating, same hybrid policy (DESIGN.md §4):
 * HARD-BLOCK only on structured signals (`Class.prereqs`, issue #66 chunk 4),
 * NEVER on free-text prose (`prereqText`, always shown as a soft advisory
 * line). See `packages/schema/src/refdata.ts`'s `Class.prereqs` doc comment
 * for the structured shape and what's deliberately left prose-only per class
 * (alignment, race, parametrized skills like "Perform (oratory)", OR/count
 * requirements like "any three metamagic feats", etc).
 *
 * Unlike feat prereqs, this only ever gates ADDING a class (at level 1) — an
 * already-added prestige class is never retroactively blocked by a later
 * change (e.g. losing a prerequisite feat). Callers should only invoke
 * `evaluateClassPrereqs` for classes not yet on `identity.classes`; it is
 * still safe (just pointless) to call for an already-added class.
 */
import type { CharacterDoc, Class, RefData } from "@pf1/schema";

import { featNameSlug } from "@pf1/engine";

import { CASTER_KIND, effectiveCasterClassLevel } from "./casterLevel.js";
import { SKILL_NAMES } from "./names.js";
import { accessibleSpellLevels, casterModelFor } from "./spellcasting.js";

export interface PrereqCheck {
  label: string;
  met: boolean;
}

export interface ClassPrereqResult {
  /** True if any structured prerequisite is unmet — the class can't be added. */
  blocked: boolean;
  /** True if there's unverifiable prose to show (advisory, never blocking). */
  warn: boolean;
  /** Structured checks with live met/unmet status. */
  checks: PrereqCheck[];
  /** Verbatim published requirements line (HTML-stripped plain text). */
  softText?: string;
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", ... */
function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Whether some caster class already in the build can, at its current
 * *effective* class level (issue #66 chunk 2 — advancement-aware, so an
 * existing prestige class's casting-advancement slot counts), access spells
 * of `req.spellLevel` and matches `req.kind` (an `"any"` requirement accepts
 * arcane, divine, OR psychic — same posture as `slotAcceptsKind` in
 * `casterLevel.ts`). A caster class with no `CASTER_MODELS` entry (none in
 * the current registry, but defensive against future gaps) can't be verified
 * structurally and is skipped here — honest per this module's doc comment;
 * the class's `prereqText` carries it as a soft advisory instead.
 */
function meetsCastingRequirement(
  doc: CharacterDoc,
  refData: RefData,
  req: { kind: "arcane" | "divine" | "any"; spellLevel: number },
): boolean {
  for (const c of doc.identity.classes) {
    const kind = CASTER_KIND[c.tag];
    if (!kind) continue;
    if (req.kind !== "any" && kind !== req.kind) continue;
    const model = casterModelFor(c.tag);
    if (!model) continue;
    const level = effectiveCasterClassLevel(doc, refData, c.tag);
    if (level <= 0) continue;
    if (accessibleSpellLevels(model, level).includes(req.spellLevel)) return true;
  }
  return false;
}

/**
 * Evaluate `cls.prereqs` (if present) against the current build. Structured
 * checks:
 *  - `bab` — from the derived sheet's BAB (caller passes it in, so this stays
 *    a pure function of primitives rather than needing a full `DerivedSheet`).
 *  - `feats` — matched against selected feats (`doc.build.feats`) by
 *    `featNameSlug`, same matching approach as `prereqs.ts`. A required name
 *    that doesn't resolve to any vendored feat is skipped entirely (never
 *    added as an unmet check) — it can never be hard-blocked on a feat that
 *    doesn't exist in the slice; `prereqText` still shows it as prose.
 *  - `skillRanks` — invested ranks read straight off `doc.build.skillRanks`
 *    (there's no per-skill lookup helper in `model/skills.ts`; every other
 *    model file reads this map directly the same way).
 *  - `casting` — see `meetsCastingRequirement` above.
 *
 * A class with no `prereqs` at all (shouldn't happen for a `subType:
 * "prestige"` entry today, but defensive) is always unblocked.
 *
 * `prereqText` is shown WHOLE as the soft advisory line — unlike
 * `prereqs.ts`'s `filterProseFragments`, this doesn't try to strip fragments
 * already covered by a met structured check: the class prereq prose is
 * formatted as "Category: items." sentences (e.g. "Feats: Point-Blank Shot,
 * Precise Shot, Weapon Focus (longbow or shortbow)."), and several classes mix
 * a structured item with an unstructured one in the SAME sentence (that
 * example: two structured feats plus one parametrized "Weapon Focus (longbow
 * or shortbow)" in one "Feats:" sentence), so a clean per-fragment drop isn't
 * reliably possible the way it is for feats. The redundancy this leaves (a
 * met ✓ check next to prose repeating it) is acceptable per issue #66 chunk
 * 3's scope — issue #49's fragment-filtering fix is feat-specific.
 */
export function evaluateClassPrereqs(
  cls: Class,
  doc: CharacterDoc,
  refData: RefData,
  bab: number,
): ClassPrereqResult {
  const p = cls.prereqs;
  if (!p) return { blocked: false, warn: false, checks: [] };

  const checks: PrereqCheck[] = [];

  if (p.bab != null) {
    checks.push({ label: `BAB +${p.bab}`, met: bab >= p.bab });
  }

  for (const featName of p.feats ?? []) {
    const slug = featNameSlug(featName);
    const matched = Object.values(refData.feats).find((f) => featNameSlug(f.name) === slug);
    if (!matched) continue; // unresolvable name: prose-advisory only, never a hard block
    checks.push({ label: matched.name, met: doc.build.feats.includes(matched.id) });
  }

  for (const sr of p.skillRanks ?? []) {
    const invested = doc.build.skillRanks[sr.skill] ?? 0;
    const label = `${SKILL_NAMES[sr.skill] ?? sr.skill} ${sr.ranks} ranks`;
    checks.push({ label, met: invested >= sr.ranks });
  }

  for (const cr of p.casting ?? []) {
    const kindLabel = cr.kind === "any" ? "" : `${cr.kind} `;
    const label = `Able to cast ${ordinal(cr.spellLevel)}-level ${kindLabel}spells`;
    checks.push({ label, met: meetsCastingRequirement(doc, refData, cr) });
  }

  const blocked = checks.some((c) => !c.met);
  const softText = p.prereqText?.trim() || undefined;
  const warn = !blocked && softText != null;

  return { blocked, warn, checks, softText };
}

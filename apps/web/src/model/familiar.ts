/**
 * Pure transitions + derivation wrapper for a tracked familiar
 * (`doc.build.familiar` / `doc.live.familiar` — see the schema doc comments
 * on those fields, and `@pf1/engine` `familiar.ts` for the derivation rules).
 * Mirrors `model/hp.ts`'s damage/heal shape for the familiar's own HP pool.
 */

import {
  BASE_FAMILIARS,
  buildRollData,
  CONDITION_LADDERS,
  deriveFamiliar,
  FAMILIAR_TEMPLATES,
  familiarSpecies,
  featNameSlug,
  isImprovedFamiliar,
  resolveSorcererBloodlineOrMutation,
  type DerivedFamiliar,
  type ImprovedFamiliarPrereq,
} from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, FamiliarBuild, RefData, ResolvedStat } from "@pf1/schema";

import { alignmentWithinOneStep } from "./alignment.js";
import { effectiveCasterLevel } from "./casterLevel.js";
import { toggleConditionIn } from "./conditions.js";
import { normalizeAlignmentCode } from "./names.js";

/**
 * Set (or replace) the tracked familiar's species + name. A blank (or
 * whitespace-only) name falls back to the species' own display name (e.g.
 * "Cat") — every consumer displays `build.familiar.name` directly with no
 * fallback of its own, so this is the one place that guarantees it's never
 * empty (a blank name would otherwise render as a blank heading in the
 * tracker's Familiar panel and elsewhere).
 *
 * Switching species while the name still exactly matches the OLD species'
 * own auto-defaulted name (i.e. the player never customized it) re-defaults
 * to the NEW species' name instead of carrying the stale one forward —
 * swapping Cat for Owl shouldn't leave an owl named "Cat". A name the player
 * actually typed is preserved across a species swap, as before.
 *
 * Looks up the species across BOTH `BASE_FAMILIARS` and the Improved
 * Familiar tables (`familiarSpecies`, one shared id namespace), so an
 * improved species auto-names correctly too (e.g. "Imp", not "Familiar").
 * Switching TO an improved species drops any standard-animal `template`
 * (`FamiliarBuild.template`) — the two are mutually exclusive.
 */
export function setFamiliar(doc: CharacterDoc, speciesId: string, name: string): CharacterDoc {
  const existing = doc.build.familiar;
  const hadAutoName =
    existing != null &&
    existing.speciesId !== speciesId &&
    existing.name === (familiarSpecies(existing.speciesId)?.name ?? existing.name);
  const trimmed = hadAutoName ? "" : name.trim();
  const newSpecies = familiarSpecies(speciesId);
  const fallbackName = newSpecies?.name ?? "Familiar";
  const nextFamiliar: FamiliarBuild = {
    ...doc.build.familiar,
    speciesId,
    name: trimmed || fallbackName,
  };
  if (newSpecies && isImprovedFamiliar(newSpecies)) {
    delete nextFamiliar.template;
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      familiar: nextFamiliar,
    },
  };
}

/**
 * Set (or clear, `templateId: undefined`) the Improved Familiar template
 * (`FAMILIAR_TEMPLATES`, e.g. "celestial") applied to a standard animal
 * species. No-ops when there's no familiar yet, when the current species is
 * itself an improved species (templates only apply to standard animals — see
 * `FamiliarBuild.template`'s schema doc comment), or when `templateId` isn't
 * a recognized template id.
 */
export function setFamiliarTemplate(
  doc: CharacterDoc,
  templateId: string | undefined,
): CharacterDoc {
  const build = doc.build.familiar;
  if (!build) return doc;
  const species = familiarSpecies(build.speciesId);
  if (species && isImprovedFamiliar(species)) return doc;
  if (templateId !== undefined && !FAMILIAR_TEMPLATES[templateId]) return doc;

  const nextFamiliar: FamiliarBuild = { ...build };
  if (templateId === undefined) delete nextFamiliar.template;
  else nextFamiliar.template = templateId;
  return { ...doc, build: { ...doc.build, familiar: nextFamiliar } };
}

/** The improved species' own SLA def for `slug`, or `undefined` when there's no familiar/species/def. */
function familiarSlaDef(doc: CharacterDoc, slug: string) {
  const build = doc.build.familiar;
  if (!build) return undefined;
  const species = familiarSpecies(build.speciesId);
  if (!species || !isImprovedFamiliar(species)) return undefined;
  return species.slas?.find((s) => s.slug === slug);
}

/**
 * Record one more use of a familiar spell-like ability spent today
 * (`live.familiar.slaUses[slug]`), clamped to the def's `usesMax`. No-ops for
 * an unmetered (constant/at-will) or unrecognized slug.
 */
export function spendFamiliarSla(doc: CharacterDoc, slug: string): CharacterDoc {
  const def = familiarSlaDef(doc, slug);
  if (!def || typeof def.frequency !== "object") return doc;
  const current = doc.live.familiar?.slaUses?.[slug] ?? 0;
  const spent = Math.min(def.frequency.uses, current + 1);
  return withFamiliarLive(doc, { slaUses: { ...doc.live.familiar?.slaUses, [slug]: spent } });
}

/**
 * Undo one spent use of a familiar spell-like ability
 * (`live.familiar.slaUses[slug]`), clamped at 0. No-ops for an unmetered
 * (constant/at-will) or unrecognized slug.
 */
export function restoreFamiliarSla(doc: CharacterDoc, slug: string): CharacterDoc {
  const def = familiarSlaDef(doc, slug);
  if (!def || typeof def.frequency !== "object") return doc;
  const current = doc.live.familiar?.slaUses?.[slug] ?? 0;
  const spent = Math.max(0, current - 1);
  return withFamiliarLive(doc, { slaUses: { ...doc.live.familiar?.slaUses, [slug]: spent } });
}

/** Clear every familiar SLA's spent-uses counter (e.g. alongside the New Day rest action). No-ops when absent. */
export function resetFamiliarSlaUses(doc: CharacterDoc): CharacterDoc {
  const current = doc.live.familiar;
  if (!current || !current.slaUses) return doc;
  const familiar = { ...current };
  delete familiar.slaUses;
  return { ...doc, live: { ...doc.live, familiar } };
}

/**
 * Soft, non-blocking warnings for the published Improved Familiar table
 * prerequisites (`ImprovedFamiliar.prereq` / `FamiliarTemplate.prereq`) —
 * hybrid-prereq posture (see CLAUDE.md): every warning here is informational
 * only, and the picker always allows the pick regardless. Checks, in order:
 * caster level (best single-class caster level, advancement-aware), the
 * Improved Familiar feat itself (also accepts its Improved Familiar Bond
 * follow-up), and alignment (within one step on each axis of the familiar's
 * own alignment, when both the master's alignment and the prereq's parse).
 */
export function improvedFamiliarPrereqWarnings(
  doc: CharacterDoc,
  refData: RefData,
  prereq: ImprovedFamiliarPrereq,
): string[] {
  const warnings: string[] = [];

  const cl = effectiveCasterLevel(doc, refData);
  if (cl < prereq.casterLevel) {
    warnings.push(`Requires caster level ${prereq.casterLevel} (currently ${cl})`);
  }

  const hasFeat = doc.build.feats.some((id) => {
    const feat = refData.feats[id];
    if (!feat) return false;
    const slug = featNameSlug(feat.name);
    return slug === "improved-familiar" || slug === "improved-familiar-bond";
  });
  if (!hasFeat) warnings.push("Requires the Improved Familiar feat");

  if (prereq.alignment) {
    const masterCode = doc.identity.alignment
      ? normalizeAlignmentCode(doc.identity.alignment)
      : undefined;
    if (masterCode && alignmentWithinOneStep(masterCode, prereq.alignment) === false) {
      warnings.push(`Alignment must be within one step of ${prereq.alignment}`);
    }
  }

  return warnings;
}

/** Update the tracked familiar's free-text notes. No-ops if there's no familiar yet. */
export function setFamiliarNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.familiar) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      familiar: { ...doc.build.familiar, notes: trimmed.length > 0 ? trimmed : undefined },
    },
  };
}

/** Remove the tracked familiar entirely (build choice + live state both clear). */
export function clearFamiliar(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.familiar;
  const live = { ...doc.live };
  delete live.familiar;
  return { ...doc, build, live };
}

function withFamiliarLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["familiar"]>>,
): CharacterDoc {
  return {
    ...doc,
    live: { ...doc.live, familiar: { ...doc.live.familiar, ...patch } },
  };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the familiar's HP pool. */
export function applyFamiliarDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.familiar?.damage ?? 0;
  return withFamiliarLive(doc, { damage: current + dmg });
}

/** Heal the familiar's HP, floored at 0 damage (never below full health). */
export function healFamiliar(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.familiar?.damage ?? 0;
  return withFamiliarLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the familiar. */
export function addFamiliarNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.familiar?.nonlethal ?? 0;
  return withFamiliarLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the familiar, floored at 0. */
export function healFamiliarNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.familiar?.nonlethal ?? 0;
  return withFamiliarLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the familiar (e.g. alongside the master's own Rest action). */
export function restFamiliar(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.familiar && !doc.build.familiar) return doc;
  return withFamiliarLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether the familiar's OWN condition `id` is currently active (independent of the master's `live.conditions`). */
export function hasFamiliarCondition(doc: CharacterDoc, id: string): boolean {
  return (doc.live.familiar?.conditions ?? []).includes(id);
}

/** The familiar's active condition id, if any, that supersedes `id` on its `CONDITION_LADDERS` ladder (mirrors `model/conditions.ts`'s `supersedingCondition`, scoped to the familiar's own list). */
export function familiarSupersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = CONDITION_LADDERS.find((ladder) => ladder.includes(id));
  if (!pos) return undefined;
  const index = pos.indexOf(id);
  const conditions = doc.live.familiar?.conditions ?? [];
  return pos.slice(index + 1).find((sibling) => conditions.includes(sibling));
}

/** True when the familiar's condition `id` is implied by a stricter active sibling (see `familiarSupersedingCondition`) — the UI shows it as covered rather than independently toggleable. */
export function isFamiliarConditionImplied(doc: CharacterDoc, id: string): boolean {
  return familiarSupersedingCondition(doc, id) !== undefined;
}

/**
 * Toggle one of the familiar's OWN active conditions (`live.familiar.conditions`)
 * — reuses `model/conditions.ts`'s `toggleConditionIn` for the same
 * ladder-aware auto-upgrade/implied-condition behavior the master's own
 * `live.conditions` gets, just scoped to the familiar's separate array.
 * No-ops if there's no familiar yet.
 */
export function toggleFamiliarCondition(doc: CharacterDoc, id: string): CharacterDoc {
  if (!doc.build.familiar) return doc;
  const conditions = toggleConditionIn(doc.live.familiar?.conditions ?? [], id);
  return withFamiliarLive(doc, { conditions });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the familiar. */
export function isSharedWithFamiliar(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.familiar?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the familiar's derived sheet. */
export function toggleSharedBuff(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.familiar?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withFamiliarLive(doc, { sharedBuffIds });
}

/** Set whether the familiar is within arm's reach (Alertness benefit — see schema doc comment). */
export function setFamiliarInReach(doc: CharacterDoc, inReach: boolean): CharacterDoc {
  return { ...doc, live: { ...doc.live, familiarInReach: inReach } };
}

/** Extract a `ResolvedStat`'s BASE component (pre-ability-modifier tabled value) — see `compute.ts`'s `computeSave`. */
function baseComponent(stat: ResolvedStat): number {
  return stat.components.find((c) => c.type === "base")?.value ?? 0;
}

/**
 * Derive the tracked familiar's full stat block from the character's already-
 * computed master `DerivedSheet`, or `undefined` if there's no familiar.
 * Reconstructs a roll-data context for evaluating shared-buff formulas from
 * the master's own final abilities/speeds/BAB (see `@pf1/engine` `familiar.ts`'s
 * doc comment on why a slight approximation here — post-buff speeds rather
 * than race-base — is an acceptable v1 simplification: shared buffs only ever
 * target AC/saves/skills with plain-number formulas in practice).
 */
export function deriveFamiliarSheet(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
): DerivedFamiliar | undefined {
  if (!doc.build.familiar) return undefined;
  const rollData = buildRollData(doc, refData, sheet.abilities, sheet.speeds, sheet.bab);
  return deriveFamiliar(
    doc,
    {
      maxHp: sheet.hp.max,
      bab: sheet.bab,
      baseSaves: {
        fort: baseComponent(sheet.saves.fort),
        ref: baseComponent(sheet.saves.ref),
        will: baseComponent(sheet.saves.will),
      },
    },
    rollData,
  );
}

/**
 * Whether the character plausibly has some source of a familiar, gating
 * `FamiliarPicker`'s visibility (a kineticist, say, has none). An existing
 * tracked familiar always counts, so switching away from its source never
 * hides it. Otherwise, checked data-driven wherever the compute pipeline
 * already resolves the choice, plus two spots it can't:
 *  - a Wizard's arcane bond, unless it's set to a bonded object (mirrors
 *    `ArcaneBondPicker`'s own choice, which `ClassesSection` used to encode
 *    inline here)
 *  - a Sorcerer with the Arcane bloodline (base or a wildblooded mutation
 *    that keeps its Arcane Bond power): the same familiar-or-object choice
 *    as a wizard's, but with no picker of its own to record which, so it's
 *    always offered once the power exists
 *  - any already-resolved, still-applied class feature literally named
 *    "familiar" (word-boundary, so "Proven Weapon Familiarity" doesn't
 *    false-positive) — catches a Witch's base Witch's Familiar, an
 *    Arcanist's Familiar exploit, and a cleric/inquisitor's Crocodile domain
 *  - the Familiar Bond feat (any class, given Iron Will) or its Improved
 *    Familiar Bond follow-up
 */
export function hasFamiliarSource(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
): boolean {
  if (doc.build.familiar) return true;

  const isWizard = doc.identity.classes.some((c) => c.tag === "wizard");
  if (isWizard && doc.build.arcaneBond?.type !== "object") return true;

  if (doc.build.sorcererBloodline) {
    const bloodline = resolveSorcererBloodlineOrMutation(doc.build.sorcererBloodline, refData);
    if (bloodline?.powers.some((p) => p.id === "arcaneBond")) return true;
  }

  if (sheet.classFeatures.some((f) => f.applied && /\bfamiliar\b/i.test(f.name))) return true;

  return doc.build.feats.some((id) => {
    const feat = refData.feats[id];
    if (!feat) return false;
    const slug = featNameSlug(feat.name);
    return slug === "familiar-bond" || slug === "improved-familiar-bond";
  });
}

export { BASE_FAMILIARS };

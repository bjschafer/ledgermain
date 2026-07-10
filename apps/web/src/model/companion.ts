/**
 * Pure transitions + derivation wrapper for a tracked animal companion
 * (`doc.build.animalCompanion` / `doc.live.animalCompanion` — see the schema
 * doc comments on those fields, and `@pf1/engine` `companion.ts` for the
 * derivation rules). Mirrors `model/familiar.ts`'s shape closely; the
 * differences are the companion's `source` toggles (Nature Bond / Hunter's
 * Bond / Mount), its player-assigned Ability Score Increases, and (issue #68)
 * its own feat/skill-rank investment, none of which a familiar has.
 */

import {
  BASE_COMPANIONS,
  buildRollData,
  companionAbilityIncreaseSlots,
  companionEffectiveLevel,
  CONDITION_LADDERS,
  deriveCompanion,
  featNameSlug,
  MOUNT_SPECIES_BY_RIDER_SIZE,
  type DerivedCompanion,
} from "@pf1/engine";
import type { AbilityId, AnimalCompanionBuild, CharacterDoc, RefData } from "@pf1/schema";

import { toggleConditionIn } from "./conditions.js";
import { ABILITY_IDS } from "./doc.js";
import type { PrereqContext } from "./prereqs.js";

/** Set (or replace) the tracked companion's species + name. Trims blank names to "Companion". */
export function setCompanion(doc: CharacterDoc, speciesId: string, name: string): CharacterDoc {
  const trimmedName = name.trim() || "Companion";
  const current = doc.build.animalCompanion;
  const build: AnimalCompanionBuild = {
    ...current,
    speciesId,
    name: trimmedName,
    source: current?.source ?? [],
  };
  return { ...doc, build: { ...doc.build, animalCompanion: build } };
}

/** Update the tracked companion's free-text notes. No-ops if there's no companion yet. */
export function setCompanionNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  if (!doc.build.animalCompanion) return doc;
  const trimmed = notes.trim();
  return {
    ...doc,
    build: {
      ...doc.build,
      animalCompanion: {
        ...doc.build.animalCompanion,
        notes: trimmed.length > 0 ? trimmed : undefined,
      },
    },
  };
}

/** Remove the tracked companion entirely (build choice + live state both clear). */
export function clearCompanion(doc: CharacterDoc): CharacterDoc {
  const build = { ...doc.build };
  delete build.animalCompanion;
  const live = { ...doc.live };
  delete live.animalCompanion;
  return { ...doc, build, live };
}

/**
 * Toggle a companion-granting class-feature source (`"nature-bond"` |
 * `"hunters-bond"` | `"hunter-companion"` | `"cavalier-mount"` |
 * `"samurai-mount"`) on/off. If the character has no `build.animalCompanion`
 * yet, turning a source on seeds one with a sensible default species
 * ("wolf") so the picker has something to show immediately.
 */
export function toggleCompanionSource(
  doc: CharacterDoc,
  source: "nature-bond" | "hunters-bond" | "hunter-companion" | "cavalier-mount" | "samurai-mount",
): CharacterDoc {
  const current = doc.build.animalCompanion;
  const currentSources = current?.source ?? [];
  const nextSources = currentSources.includes(source)
    ? currentSources.filter((s) => s !== source)
    : [...currentSources, source];
  const build: AnimalCompanionBuild = {
    speciesId: current?.speciesId ?? "wolf",
    name: current?.name ?? "Companion",
    ...current,
    source: nextSources,
  };
  return { ...doc, build: { ...doc.build, animalCompanion: build } };
}

/**
 * Set the ability the player has assigned to the ASI slot at `slotIndex`
 * (0 = the level-4 increase, 1 = level 9, etc. — see
 * `AnimalCompanionBuild.abilityIncreases`'s doc comment). Extends the array
 * with `"str"` defaults for any earlier unset slot so indices stay stable.
 * No-ops if there's no companion yet.
 */
export function setCompanionAbilityIncrease(
  doc: CharacterDoc,
  slotIndex: number,
  ability: AbilityId,
): CharacterDoc {
  const current = doc.build.animalCompanion;
  if (!current) return doc;
  const existing = current.abilityIncreases ?? [];
  const next = [...existing];
  while (next.length <= slotIndex) next.push("str");
  next[slotIndex] = ability;
  return {
    ...doc,
    build: { ...doc.build, animalCompanion: { ...current, abilityIncreases: next } },
  };
}

/**
 * Toggle a feat pick for the companion itself (issue #68 —
 * `build.animalCompanion.feats`). Free-choice, soft-capped against
 * `DerivedCompanion.bonusFeats` by the UI (never blocked here). No-ops if
 * there's no companion yet.
 */
export function toggleCompanionFeat(doc: CharacterDoc, featId: string): CharacterDoc {
  const current = doc.build.animalCompanion;
  if (!current) return doc;
  const existing = current.feats ?? [];
  const feats = existing.includes(featId)
    ? existing.filter((id) => id !== featId)
    : [...existing, featId];
  return { ...doc, build: { ...doc.build, animalCompanion: { ...current, feats } } };
}

/**
 * Set the companion's invested ranks in one of its six trackable skills
 * (issue #68 — `build.animalCompanion.skillRanks`). Only clamps to a
 * non-negative integer here; the per-skill hard cap at the companion's own
 * Hit Dice, and the soft total-budget warning, are both enforced/surfaced
 * downstream (`@pf1/engine` `deriveCompanion`'s clamp; the UI's own budget
 * display) rather than duplicated in this transition. No-ops if there's no
 * companion yet.
 */
export function setCompanionSkillRank(
  doc: CharacterDoc,
  skillId: string,
  ranks: number,
): CharacterDoc {
  const current = doc.build.animalCompanion;
  if (!current) return doc;
  const r = Number.isNaN(ranks) ? 0 : Math.max(0, Math.trunc(ranks));
  const next = { ...current.skillRanks };
  if (r <= 0) delete next[skillId];
  else next[skillId] = r;
  return { ...doc, build: { ...doc.build, animalCompanion: { ...current, skillRanks: next } } };
}

/**
 * The companion's own feat-prerequisite context (issue #68) — reuses
 * `model/prereqs.ts`'s `evaluatePrereqs`/`PrereqContext`, but built from the
 * COMPANION's own derived ability scores/BAB (not the master's), the
 * companion's own chosen feats (`doc.build.animalCompanion.feats`, not the
 * master's `build.feats`), and `casterLevel: 0` (no companion in
 * `BASE_COMPANIONS` casts). Mirrors `FeatsSection`'s own `PrereqContext`
 * construction for the master.
 */
export function companionFeatPrereqContext(
  doc: CharacterDoc,
  companion: DerivedCompanion,
  refData: RefData,
): PrereqContext {
  const abilityTotals = {} as Record<AbilityId, number>;
  for (const id of ABILITY_IDS) abilityTotals[id] = companion.abilities[id].score;
  return {
    abilityTotals,
    bab: companion.bab,
    casterLevel: 0,
    selectedFeats: new Set(doc.build.animalCompanion?.feats ?? []),
    refData,
  };
}

function withCompanionLive(
  doc: CharacterDoc,
  patch: Partial<NonNullable<CharacterDoc["live"]["animalCompanion"]>>,
): CharacterDoc {
  return {
    ...doc,
    live: { ...doc.live, animalCompanion: { ...doc.live.animalCompanion, ...patch } },
  };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply lethal damage to the companion's HP pool. */
export function applyCompanionDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const current = doc.live.animalCompanion?.damage ?? 0;
  return withCompanionLive(doc, { damage: current + dmg });
}

/** Heal the companion's HP, floored at 0 damage (never below full health). */
export function healCompanion(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.animalCompanion?.damage ?? 0;
  return withCompanionLive(doc, { damage: nonNeg(current - heal) });
}

/** Add nonlethal damage to the companion. */
export function addCompanionNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  const current = doc.live.animalCompanion?.nonlethal ?? 0;
  return withCompanionLive(doc, { nonlethal: current + add });
}

/** Heal nonlethal damage on the companion, floored at 0. */
export function healCompanionNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const current = doc.live.animalCompanion?.nonlethal ?? 0;
  return withCompanionLive(doc, { nonlethal: nonNeg(current - heal) });
}

/** Fully heal the companion (e.g. alongside the master's own Rest action). */
export function restCompanion(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.animalCompanion && !doc.build.animalCompanion) return doc;
  return withCompanionLive(doc, { damage: 0, nonlethal: 0 });
}

/** Whether the companion's OWN condition `id` is currently active (issue #68 — independent of the master's `live.conditions`). */
export function hasCompanionCondition(doc: CharacterDoc, id: string): boolean {
  return (doc.live.animalCompanion?.conditions ?? []).includes(id);
}

/** The companion's active condition id, if any, that supersedes `id` on its `CONDITION_LADDERS` ladder (mirrors `model/conditions.ts`'s `supersedingCondition`, scoped to the companion's own list). */
export function companionSupersedingCondition(doc: CharacterDoc, id: string): string | undefined {
  const pos = CONDITION_LADDERS.find((ladder) => ladder.includes(id));
  if (!pos) return undefined;
  const index = pos.indexOf(id);
  const conditions = doc.live.animalCompanion?.conditions ?? [];
  return pos.slice(index + 1).find((sibling) => conditions.includes(sibling));
}

/** True when the companion's condition `id` is implied by a stricter active sibling (see `companionSupersedingCondition`) — the UI shows it as covered rather than independently toggleable. */
export function isCompanionConditionImplied(doc: CharacterDoc, id: string): boolean {
  return companionSupersedingCondition(doc, id) !== undefined;
}

/**
 * Toggle one of the companion's OWN active conditions (issue #68 —
 * `live.animalCompanion.conditions`) — reuses `model/conditions.ts`'s
 * `toggleConditionIn` for the same ladder-aware auto-upgrade/implied-
 * condition behavior the master's own `live.conditions` gets, just scoped to
 * the companion's separate array. No-ops if there's no companion yet.
 */
export function toggleCompanionCondition(doc: CharacterDoc, id: string): CharacterDoc {
  if (!doc.build.animalCompanion) return doc;
  const conditions = toggleConditionIn(doc.live.animalCompanion?.conditions ?? [], id);
  return withCompanionLive(doc, { conditions });
}

/** Whether one of the master's active buffs (by instance id) is currently shared onto the companion. */
export function isSharedWithCompanion(doc: CharacterDoc, instanceId: string): boolean {
  return (doc.live.animalCompanion?.sharedBuffIds ?? []).includes(instanceId);
}

/** Toggle whether a master buff instance also applies to the companion's derived sheet. */
export function toggleSharedBuffCompanion(doc: CharacterDoc, instanceId: string): CharacterDoc {
  const current = doc.live.animalCompanion?.sharedBuffIds ?? [];
  const sharedBuffIds = current.includes(instanceId)
    ? current.filter((id) => id !== instanceId)
    : [...current, instanceId];
  return withCompanionLive(doc, { sharedBuffIds });
}

/**
 * Set (or clear, with `undefined`) which Animal Focus buff (a `RefData.buffs`
 * id, e.g. one of the 12 vendored "Animal Focus (<Animal>)" buffs — issue
 * #65) is applied to the companion. Display-only bookkeeping — see
 * `AnimalCompanionLiveState.focusBuffId`'s doc comment for why this isn't
 * wired into `deriveCompanion`'s numeric stat block. No-ops if there's no
 * companion yet.
 */
export function setCompanionFocus(doc: CharacterDoc, buffId: string | undefined): CharacterDoc {
  if (!doc.build.animalCompanion) return doc;
  return withCompanionLive(doc, { focusBuffId: buffId });
}

/**
 * Whether the character has hunter levels (the ACG Hunter class, which
 * grants Animal Focus — `refData.buffs` carries the 12 vendored "Animal
 * Focus (<Animal>)" entries, resolved generically as the Hunter's own
 * `linkedBuffIds` pool by `@pf1/engine` `deriveResourcePools`). Used to gate
 * the companion Focus picker in the tracker so a non-hunter's companion
 * panel doesn't show an irrelevant control.
 */
export function hunterLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "hunter")?.level ?? 0;
}

/** Cavalier class level, for gating the "Mount" companion-source chip (granted at 1st level, issue #68). */
export function cavalierLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "cavalier")?.level ?? 0;
}

/** Samurai class level, for gating the "Mount" companion-source chip (granted at 1st level, issue #68). */
export function samuraiLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "samurai")?.level ?? 0;
}

/**
 * The RAW-eligible mount species list for the character's OWN size (issue
 * #68) — `refData.races[doc.identity.race].size`, falling back to `"med"`
 * for an unresolved race id (the overwhelmingly common case, and the same
 * default {@link MOUNT_SPECIES_BY_RIDER_SIZE} keys off). Soft-note only, see
 * `@pf1/engine` `MOUNT_SPECIES_BY_RIDER_SIZE`'s doc comment — the picker
 * still allows any `BASE_COMPANIONS` species as a mount; this is surfaced as
 * a hint, never a restriction on the `<select>`.
 */
export function mountSpeciesHint(doc: CharacterDoc, refData: RefData): readonly string[] {
  const size = refData.races[doc.identity.race]?.size;
  return MOUNT_SPECIES_BY_RIDER_SIZE[size === "sm" ? "sm" : "med"];
}

/**
 * The 12 vendored "Animal Focus (<Animal>)" buffs (issue #65), sorted by
 * name — every Hunter Animal Focus aspect, read directly off
 * `refData.buffs` by name pattern rather than a hand-authored table (the
 * numbers are already fully vendored with correct per-level scaling
 * formulas). Used by both the self-focus
 * resource-pool toggle (`ResourcesPanel`'s generic `linkedBuffIds` handling)
 * and the companion-focus picker below.
 */
export function animalFocusBuffs(refData: RefData): { id: string; name: string }[] {
  return Object.values(refData.buffs)
    .filter((b) => b.name.startsWith("Animal Focus ("))
    .map((b) => ({ id: b.id, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Whether the character owns the Boon Companion feat (+4 effective druid
 * level, capped at character level — CRB "Boon Companion"). Resolved here
 * (rather than inside `@pf1/engine`'s pure `companion.ts`, which never takes
 * `RefData`) by turning each owned feat id into its name/slug the same way
 * `resources.ts`'s `FEAT_POOL_EFFECTS` lookup does.
 */
export function hasBoonCompanionFeat(doc: CharacterDoc, refData: RefData): boolean {
  return doc.build.feats.some((id) => {
    const feat = refData.feats[id];
    return feat != null && featNameSlug(feat.name) === "boon-companion";
  });
}

/**
 * Derive the tracked companion's full stat block from the character document,
 * or `undefined` if there's no companion (no `build.animalCompanion`, an
 * unknown species, or no companion-granting source chosen yet — see
 * `@pf1/engine` `deriveCompanion`'s doc comment). Unlike a familiar, the
 * companion has its own HD/BAB/saves, so it needs no master `DerivedSheet`
 * inputs — only enough roll-data context to evaluate any shared buffs'
 * formulas.
 */
export function deriveCompanionSheet(
  doc: CharacterDoc,
  refData: RefData,
): DerivedCompanion | undefined {
  if (!doc.build.animalCompanion) return undefined;
  const rollData = buildRollData(doc, refData);
  return deriveCompanion(doc, rollData, hasBoonCompanionFeat(doc, refData));
}

export { BASE_COMPANIONS, companionAbilityIncreaseSlots, companionEffectiveLevel };

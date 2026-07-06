/**
 * Which {@link Change} targets the engine actually consumes.
 *
 * `compute.ts` only reads a subset of the targets that appear in vendored
 * buff/item/race/feat data (via Foundry's authoring vocabulary). Anything
 * outside that subset is silently collected-and-ignored by
 * {@link collectModifiers}/`forTarget` — the number never reaches the sheet,
 * with no signal to the player that a buff or item only half-applies.
 *
 * This module is the single source of truth for "does the engine apply this
 * target," used to render an honest "partial" badge on buff/gear rows in the
 * UI. It does not change engine behavior.
 *
 * IMPORTANT — keep this in sync with compute.ts: whenever compute.ts starts
 * consuming a new `forTarget(...)` target (or a new target prefix), add it to
 * {@link APPLIED_TARGETS} / {@link APPLIED_TARGET_PREFIXES} in the same
 * change. This file was built by grepping every `forTarget(` call site in
 * compute.ts (plus the `skill.` prefix grouping in computeSkills and the
 * `attack.weapon.*`/`damage.weapon.*` per-group targets in
 * computeWeaponAttacks) — verify against the real call sites, don't guess.
 */

import type { Change } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

/**
 * Exact-match targets consumed by compute.ts.
 *
 * Includes `bonusFeats` and `bonusSkillRanks`, which are NOT read by the
 * engine at all — they're consumed directly by apps/web's model layer
 * (src/model/feats.ts and src/model/skills.ts budgets) outside of
 * `compute()`. They're still "applied" from the player's point of view, so
 * they belong in this set even though grep won't find them in compute.ts.
 */
const APPLIED_TARGETS = new Set<string>([
  // six abilities
  ...ABILITY_IDS,
  // saves
  "fort",
  "ref",
  "will",
  "allSavingThrows",
  // AC (computeAc)
  "ac",
  "aac",
  "sac",
  "nac",
  // combat maneuver
  "cmb",
  "cmd",
  // initiative
  "init",
  // hit points
  "hp",
  // whole-skills bonus (computeSkills globalSkillMods)
  "skills",
  // general/melee/ranged attack + damage
  "attack",
  "mattack",
  "rattack",
  "damage",
  "wdamage",
  "mwdamage",
  "rwdamage",
  "twdamage",
  // movement speeds
  "landSpeed",
  "flySpeed",
  "swimSpeed",
  "climbSpeed",
  "burrowSpeed",
  // size step shifts
  "size",
  // armor-training max-dex-bonus increase
  "mDexA",
  // armor-check-penalty reduction
  "acpA",
  // consumed outside compute() by apps/web/src/model/feats.ts + skills.ts
  "bonusFeats",
  "bonusSkillRanks",
  // spell resistance / damage reduction (computeDefenses, issue #21)
  "spellResist",
  "dr",
]);

/**
 * Prefix-matched targets: anything with the target string starting with one
 * of these (before a `.` separator) is consumed by compute.ts.
 *
 * - `skill.<id>` — per-skill bonuses, grouped by base skill id in computeSkills.
 * - `attack.weapon.<group>` / `damage.weapon.<group>` — per-weapon-group feat
 *   bonuses (e.g. Weapon Focus / Weapon Specialization, keyed by a weapon's
 *   free-text `.group` tag) AND semantic weapon-group bonuses (Weapon
 *   Training and its archetype reflavors, keyed by the weapon's vendored,
 *   normalized `.weaponGroups` — see `weapon-groups.ts`'s
 *   `normalizeWeaponGroup`/`WEAPON_GROUPS`, issue #45) in computeWeaponAttacks.
 * - `dr.<bypass>` / `eres.<energy>` — qualified DR / energy resistance
 *   (computeDefenses, issue #21). Not a vendored Foundry vocabulary (no
 *   `dr`/`eres`-shaped target occurs upstream today) — this engine's own
 *   convention so a user-authored buff can grant them.
 */
const APPLIED_TARGET_PREFIXES = ["skill.", "attack.weapon.", "damage.weapon.", "dr.", "eres."];

/** True if `compute()` (or the model-layer budgets it feeds) applies `target`. */
export function isTargetApplied(target: string): boolean {
  if (APPLIED_TARGETS.has(target)) return true;
  return APPLIED_TARGET_PREFIXES.some((prefix) => target.startsWith(prefix));
}

/** The subset of `changes` whose target the sheet does NOT apply anywhere. */
export function unappliedChanges(changes: readonly Change[]): Change[] {
  return changes.filter((c) => !isTargetApplied(c.target));
}

/**
 * Short human phrases for the common unapplied targets, for the UI's "not
 * auto-applied: …" tooltip. Falls back to the raw target string for anything
 * not listed here — the badge should still show up even if we haven't
 * bothered to give a target a friendly name yet.
 */
export const UNAPPLIED_TARGET_LABELS: Record<string, string> = {
  nattack: "natural attack rolls",
  ndamage: "natural attack damage",
  tattack: "touch attack rolls",
  concentration: "concentration checks",
  cl: "caster level",
  critConfirm: "crit confirmation rolls",
  reach: "reach",
  allChecks: "all ability checks",
  strChecks: "Str-based ability checks",
  dexChecks: "Dex-based ability checks",
  conChecks: "Con-based ability checks",
  intChecks: "Int-based ability checks",
  wisChecks: "Wis-based ability checks",
  chaChecks: "Cha-based ability checks",
  strSkills: "Str-based skill checks",
  dexSkills: "Dex-based skill checks",
  conSkills: "Con-based skill checks",
  intSkills: "Int-based skill checks",
  wisSkills: "Wis-based skill checks",
  chaSkills: "Cha-based skill checks",
  carryStr: "carrying capacity",
  carryMult: "carrying capacity",
  sensedv: "senses",
  sensebse: "senses",
  sensetr: "senses",
  senseall: "senses",
  strPen: "Strength penalties",
  dexPen: "Dexterity penalties",
  conPen: "Constitution penalties",
  intPen: "Intelligence penalties",
  wisPen: "Wisdom penalties",
  chaPen: "Charisma penalties",
};

/** Human label for an unapplied target, falling back to the raw string. */
export function unappliedTargetLabel(target: string): string {
  return UNAPPLIED_TARGET_LABELS[target] ?? target;
}

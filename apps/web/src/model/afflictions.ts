/**
 * Pure transitions + derived helpers for ability damage/drain/penalty (issue
 * #18) and negative levels (issue #19) — collectively "afflictions". The
 * mechanical effect (the -1-per-2-points modifier math, the drain-lowers-the-
 * score math, the negative-level penalties) all lives in the engine
 * (`@pf1/engine` `collectModifiers`); this module only edits `doc.live.*` and
 * answers the couple of display-only questions (unconscious? dying?) that the
 * engine deliberately does NOT model (PF1 RAW says "surface a warning," not
 * "compute a knockout").
 *
 * Natural healing: PF1 RAW heals 1 point of ability damage per ability per day
 * of rest. This is now wired into the single "new day" action (`model/rest.ts`
 * `restNewDay`, issue #30) via {@link restAbilityDamage} below — previously
 * this module deliberately left it unwired (issue #18) because "rest" was
 * fragmented across independent panel buttons with no single new-day event to
 * hook. Players can still adjust ability damage by hand via the per-ability
 * stepper for anything `restNewDay` doesn't cover (e.g. multiple recoveries at
 * once, or correcting a value).
 */
import type { AbilityId, CharacterDoc } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";
import type { DerivedSheet } from "@pf1/schema";

/** The three PF1 ability-affliction flavors this module edits. */
export type AbilityAfflictionKind = "damage" | "drain" | "penalty";

const KIND_TO_FIELD = {
  damage: "abilityDamage",
  drain: "abilityDrain",
  penalty: "abilityPenalty",
} as const satisfies Record<AbilityAfflictionKind, keyof CharacterDoc["live"]>;

function nonNegInt(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.trunc(n));
}

/** Current points of `kind` affliction on `ability` (0 when unset). */
export function getAbilityAffliction(
  doc: CharacterDoc,
  kind: AbilityAfflictionKind,
  ability: AbilityId,
): number {
  const map = doc.live[KIND_TO_FIELD[kind]] as Partial<Record<AbilityId, number>> | undefined;
  return map?.[ability] ?? 0;
}

/**
 * Set `kind` affliction points on `ability`, clamped to >= 0. A value of 0
 * removes the entry entirely (keeps the map tidy / matches back-compat "no
 * entry = 0" semantics rather than accumulating explicit zeros).
 */
export function setAbilityAffliction(
  doc: CharacterDoc,
  kind: AbilityAfflictionKind,
  ability: AbilityId,
  value: number,
): CharacterDoc {
  const field = KIND_TO_FIELD[kind];
  const current = (doc.live[field] as Partial<Record<AbilityId, number>> | undefined) ?? {};
  const clamped = nonNegInt(value);
  const next = { ...current };
  if (clamped === 0) delete next[ability];
  else next[ability] = clamped;
  return { ...doc, live: { ...doc.live, [field]: next } };
}

/** Every `{ability, kind, points}` currently active, for panel rendering. */
export function activeAbilityAfflictions(
  doc: CharacterDoc,
): { ability: AbilityId; kind: AbilityAfflictionKind; points: number }[] {
  const out: { ability: AbilityId; kind: AbilityAfflictionKind; points: number }[] = [];
  for (const kind of ["damage", "drain", "penalty"] as const) {
    const map = doc.live[KIND_TO_FIELD[kind]] as Partial<Record<AbilityId, number>> | undefined;
    if (!map) continue;
    for (const ability of ABILITY_IDS) {
      const points = map[ability] ?? 0;
      if (points > 0) out.push({ ability, kind, points });
    }
  }
  return out;
}

/**
 * Rest / new day: heal 1 point of ability DAMAGE per currently-damaged
 * ability (PF1 RAW natural healing, one day of rest = 1 point per ability).
 * Ability DRAIN (lowers the score itself; only restoration magic heals it)
 * and ability PENALTIES (tied to whatever ongoing effect caused them, not to
 * daily rest) are deliberately left untouched. Returns the same doc reference
 * when no ability currently has damage.
 */
export function restAbilityDamage(doc: CharacterDoc): CharacterDoc {
  const map = doc.live.abilityDamage;
  if (!map) return doc;
  let next = doc;
  for (const ability of ABILITY_IDS) {
    const points = map[ability] ?? 0;
    if (points > 0) next = setAbilityAffliction(next, "damage", ability, points - 1);
  }
  return next;
}

/** Negative levels, split temporary/permanent (both 0 when unset). */
export function getNegativeLevels(doc: CharacterDoc): { temporary: number; permanent: number } {
  return {
    temporary: doc.live.negativeLevels?.temporary ?? 0,
    permanent: doc.live.negativeLevels?.permanent ?? 0,
  };
}

/** Total negative levels (temporary + permanent) — what the engine penalizes by. */
export function totalNegativeLevels(doc: CharacterDoc): number {
  const { temporary, permanent } = getNegativeLevels(doc);
  return temporary + permanent;
}

/** Set the temporary or permanent negative-level count, clamped to >= 0. */
export function setNegativeLevels(
  doc: CharacterDoc,
  which: "temporary" | "permanent",
  value: number,
): CharacterDoc {
  const current = getNegativeLevels(doc);
  const next = { ...current, [which]: nonNegInt(value) };
  return { ...doc, live: { ...doc.live, negativeLevels: next } };
}

/** True when any affliction (ability or negative-level) is currently active. */
export function hasAnyAffliction(doc: CharacterDoc): boolean {
  return activeAbilityAfflictions(doc).length > 0 || totalNegativeLevels(doc) > 0;
}

const PHYSICAL_ABILITIES: ReadonlySet<AbilityId> = new Set(["str", "dex", "con"]);

/**
 * What reaching the damage threshold means for `ability` (PF1 RAW): physical
 * abilities (Str/Dex/Con) knock the character unconscious; mental abilities
 * (Int/Wis/Cha) leave them unable to act coherently.
 */
export function disabledByDamageLabel(ability: AbilityId): string {
  return PHYSICAL_ABILITIES.has(ability) ? "unconscious" : "unable to act coherently";
}

/**
 * Per-ability "unconscious/helpless" warning (PF1 RAW: Str/Dex/Con damage
 * reaching the current score) or "unable to act coherently" (Int/Wis/Cha).
 * Damage does not lower the score, but the engine's damage modifier-math
 * (see `@pf1/engine` collect.ts) subtracts `2*floor(points/2)` from the
 * derived `.total` as an implementation trick — so this backs that out to
 * recover the actual current score before comparing, rather than comparing
 * against the already-reduced total (which would trigger far too early).
 */
export function isDisabledByDamage(
  doc: CharacterDoc,
  derived: DerivedSheet,
  ability: AbilityId,
): boolean {
  const damage = getAbilityAffliction(doc, "damage", ability);
  if (damage === 0) return false;
  const backedOutTotal = derived.abilities[ability].total + 2 * Math.floor(damage / 2);
  return damage >= backedOutTotal;
}

/** True when total negative levels have reached/exceeded the character's Hit Dice (= level here). */
export function negLevelDeathWarning(doc: CharacterDoc, derived: DerivedSheet): boolean {
  const total = totalNegativeLevels(doc);
  return total > 0 && total >= derived.level;
}

/**
 * PF1 RAW: an ability score reduced to 0 or below has an immediate mechanical
 * consequence independent of HP — Str 0 leaves a creature helpless (unable to
 * move), Dex 0 leaves it paralyzed, Con 0 kills it outright (`model/hp.ts`
 * `hpState` enforces the death itself, checked first and independent of the
 * HP-loss dying track — see its doc comment), and Int/Wis/Cha 0 knocks it
 * unconscious. Reads the derived TOTAL (damage + drain + penalty, already
 * combined by the engine), not raw build score, so it reacts to drain and
 * penalties too, not just damage.
 *
 * Distinct from {@link isDisabledByDamage} above: that warns when ability
 * DAMAGE alone reaches the *current* score (RAW's separate "damage equals
 * current score" unconsciousness rule, issue #18). This one fires when the
 * derived total has actually been driven to 0 or below by any combination of
 * afflictions. The two can both be true for the same ability at once (heavy
 * damage alone can push the derived total to 0) — callers should word them so
 * they read as complementary facts, not a duplicated warning.
 */
export function abilityZeroWarnings(
  derived: DerivedSheet,
): { ability: AbilityId; effect: string }[] {
  return ABILITY_IDS.filter((id) => derived.abilities[id].total <= 0).map((ability) => ({
    ability,
    effect: ABILITY_ZERO_EFFECT[ability],
  }));
}

const ABILITY_ZERO_EFFECT: Record<AbilityId, string> = {
  str: "helpless (unable to move)",
  dex: "paralyzed",
  con: "dead",
  int: "unconscious",
  wis: "unconscious",
  cha: "unconscious",
};

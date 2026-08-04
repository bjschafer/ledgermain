/**
 * Unarmed strikes as a weapon entry.
 *
 * Nothing in the vendored Foundry weapon compendium is an unarmed strike (it
 * has Gauntlet, Cestus, Brass Knuckles, but the strike itself is a system-level
 * attack there, not an item), so the weapon picker can't offer one from
 * RefData. A monk or brawler is otherwise stuck hand-building a custom entry,
 * and everything downstream of the weapon list depends on that entry existing:
 * per-weapon saved rolls, the damage line, and the Weapon Focus / Weapon
 * Specialization / Improved Critical pickers, which offer exactly the distinct
 * `group` tags present on `build.weapons` (see `featChoiceOptions`).
 *
 * So this module synthesizes the entry: the right damage die for the
 * character's class level and race size, tagged {@link UNARMED_STRIKE_GROUP}
 * so the feat pickers pick it up, and left proficient (`proficiency`
 * undefined, which `isWeaponProficient` reads as "no penalty applies") —
 * unarmed strikes never take the non-proficient -4, and a monk's proficiency
 * list is 19 named weapons with no "simple" category token, so claiming any
 * category here would hand a monk a phantom -4.
 *
 * The die is a snapshot, not a live value: `WeaponInstance.damageDice` is a
 * display string the engine only ever rescales for effective size. It goes
 * stale on level-up, which {@link staleUnarmedDamage} exists to catch.
 */

import { featNameSlug, unarmedDamageDie } from "@pf1/engine";
import type { CharacterDoc, RefData, SizeId, WeaponInstance } from "@pf1/schema";

import { grantedFeats } from "./feats.js";

/**
 * The `WeaponInstance.group` tag every synthesized unarmed strike carries.
 * Free text by design: `group` is the exact-match key Weapon Focus and friends
 * store their choice against, so this string is what appears in those pickers.
 */
export const UNARMED_STRIKE_GROUP = "unarmed strike";

/** Class levels that advance unarmed damage, by class tag. */
const UNARMED_DAMAGE_CLASSES: Record<string, string> = {
  monk: "Monk",
  monkUnchained: "Monk",
  brawler: "Brawler",
};

/**
 * Base unarmed strike damage for a character with no class table to read
 * (PF1 CRB Table: Unarmed Attacks) — 1d3 for a Medium creature, one step down
 * for Small, one up for Large. Nonlethal without Improved Unarmed Strike.
 */
const BASE_UNARMED_DICE: Record<"sm" | "med" | "lg", string> = {
  sm: "1d2",
  med: "1d3",
  lg: "1d4",
};

/** Where a character's unarmed damage die comes from. */
export interface UnarmedStrikeSource {
  /** Display name of the class driving the die, absent when nothing does. */
  className?: string;
  /** That class's level (0 when no class drives the die). */
  level: number;
  /** The damage die at the character's size, e.g. "1d8". */
  dieLabel: string;
  /** True when the character has neither the class feature nor Improved Unarmed Strike. */
  nonlethal: boolean;
}

/** The character's base race size, which the unarmed damage table reads by column. */
function raceSize(doc: CharacterDoc, refData: RefData): SizeId {
  return refData.races[doc.identity.race]?.size ?? "med";
}

/** True when the character has Improved Unarmed Strike, taken or granted. */
export function hasImprovedUnarmedStrike(doc: CharacterDoc, refData: RefData): boolean {
  const slug = featNameSlug("Improved Unarmed Strike");
  const taken = [...doc.build.feats, ...(doc.build.extraFeats ?? []).map((e) => e.featId)];
  if (taken.some((featId) => featNameSlug(refData.feats[featId]?.name ?? featId) === slug)) {
    return true;
  }
  return grantedFeats(doc, refData).some((g) => featNameSlug(g.featName) === slug);
}

/**
 * The character's unarmed strike damage die and where it comes from. Monk,
 * Monk (Unchained) and brawler all read the same published table, so the
 * highest of those levels wins rather than summing them: no rule stacks them
 * for a character who multiclasses between two of them.
 */
export function unarmedStrikeSource(doc: CharacterDoc, refData: RefData): UnarmedStrikeSource {
  const size = raceSize(doc, refData);
  let best: { className: string; level: number } | undefined;
  for (const cls of doc.identity.classes) {
    const className = UNARMED_DAMAGE_CLASSES[cls.tag];
    if (!className || cls.level <= 0) continue;
    if (!best || cls.level > best.level) best = { className, level: cls.level };
  }
  if (best) {
    return {
      className: best.className,
      level: best.level,
      dieLabel: unarmedDamageDie(best.level, size).dieLabel,
      nonlethal: false,
    };
  }
  const column = size === "med" ? "med" : size === "lg" || size === "huge" ? "lg" : "sm";
  return {
    level: 0,
    dieLabel: BASE_UNARMED_DICE[column],
    nonlethal: !hasImprovedUnarmedStrike(doc, refData),
  };
}

/**
 * The weapon entry to add for this character's unarmed strike. `enhancement`
 * covers an amulet of mighty fists (the only way an unarmed strike carries an
 * enhancement bonus); it takes the same " +N" name suffix a magic weapon does.
 */
export function unarmedStrikeWeapon(
  doc: CharacterDoc,
  refData: RefData,
  enhancement = 0,
): WeaponInstance {
  const source = unarmedStrikeSource(doc, refData);
  return {
    name: enhancement > 0 ? `Unarmed Strike +${enhancement}` : "Unarmed Strike",
    attackAbility: "str",
    damageAbility: "str",
    damageDice: source.dieLabel,
    group: UNARMED_STRIKE_GROUP,
    category: "melee",
    ...(enhancement > 0 ? { enhancement } : {}),
  };
}

/** One-line summary of the synthesized entry, for the picker row. */
export function unarmedStrikeMeta(source: UnarmedStrikeSource): string {
  const parts = ["melee", source.dieLabel, "crit ×2", `type: ${UNARMED_STRIKE_GROUP}`];
  if (source.className) parts.push(`${source.className} ${source.level}`);
  else if (source.nonlethal) parts.push("nonlethal without Improved Unarmed Strike");
  return parts.join(" · ");
}

/** True when `w` is an unarmed strike entry (however the player named it). */
export function isUnarmedStrike(w: WeaponInstance): boolean {
  return (w.group ?? "").trim().toLowerCase() === UNARMED_STRIKE_GROUP;
}

/**
 * The die an unarmed strike entry should be showing, when that differs from
 * the one stored on it (the character levelled up, or the entry was hand-built
 * at the wrong size). `undefined` when the entry is already right, isn't an
 * unarmed strike, or carries no die at all.
 */
export function staleUnarmedDamage(
  w: WeaponInstance,
  doc: CharacterDoc,
  refData: RefData,
): string | undefined {
  if (!isUnarmedStrike(w) || !w.damageDice) return undefined;
  const expected = unarmedStrikeSource(doc, refData).dieLabel;
  return w.damageDice.trim().toLowerCase() === expected ? undefined : expected;
}

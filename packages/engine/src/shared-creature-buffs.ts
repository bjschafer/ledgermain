/**
 * Shared "buff sharing" routing logic for creatures that ride along with a
 * master character and can receive a subset of the master's active buffs
 * applied onto their OWN derived sheet — currently the tracked familiar
 * (`familiar.ts`, issue #44) and the tracked animal companion
 * (`companion.ts`). Both follow the identical PF1 "Share Spells"-style rule:
 * a shared buff's `changes[]` are evaluated against the master's roll data
 * and bucketed by target into AC / saves / skills / attack / damage / ability
 * / speed / initiative buckets, each resolved through the same typed-
 * stacking (`resolveStack`) path used everywhere else in the engine.
 *
 * Extracted out of `familiar.ts` (where this logic originated) so the
 * familiar and companion derivations can't silently diverge — see each
 * module's own doc comment for what's deliberately NOT routed (HP,
 * DR/resistances, and `operator: "set"` speed semantics).
 */

import type { AbilityId, ActiveBuff } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { tryEvaluateFormula, type RollData } from "./formula.js";
import { resolveStack, type TypedModifier } from "./stacking.js";

/** An AC-bucketed shared modifier, tagged with which AC bucket it belongs to. */
export type AcCandidate = TypedModifier & { category: string };

/**
 * Movement-speed change targets, mirroring `compute.ts`'s own
 * `applySpeedTarget` naming (duplicated locally — compute.ts's is private).
 * Maps a `Change.target` string to the `speeds` record key it feeds.
 */
const SPEED_TARGET_MODE: Readonly<Record<string, string>> = {
  landSpeed: "land",
  flySpeed: "fly",
  swimSpeed: "swim",
  climbSpeed: "climb",
  burrowSpeed: "burrow",
};

/** `@item.level`/`@cl` in a shared buff's formula = the buff's own caster/effect level. */
function withBuffCasterLevel(buff: Pick<ActiveBuff, "casterLevel">, rollData: RollData): RollData {
  return buff.casterLevel === undefined
    ? rollData
    : { ...rollData, cl: buff.casterLevel, item: { level: buff.casterLevel } };
}

/** Evaluate a shared buff's change formula; malformed/dice formulas contribute 0 rather than crashing. */
function evalShared(formula: string, rollData: RollData): number {
  try {
    const value = tryEvaluateFormula(formula, rollData);
    return value === null || Number.isNaN(value) ? 0 : value;
  } catch {
    return 0;
  }
}

/** Every shared buff's `changes[]`, evaluated and bucketed by target — see module doc comment. */
export interface RoutedSharedBuffs {
  ac: AcCandidate[];
  fort: TypedModifier[];
  ref: TypedModifier[];
  will: TypedModifier[];
  skill: Map<string, TypedModifier[]>;
  /**
   * Global skill-check modifiers (`target: "skills"` — e.g. shaken/sickened's
   * "-2 on skill checks") — applies to EVERY skill in addition to any
   * per-skill `skill.*` modifiers above, mirroring `compute.ts`'s own
   * `globalSkillMods` handling for the master (issue #68).
   */
  skillsGlobal: TypedModifier[];
  ability: Record<AbilityId, TypedModifier[]>;
  attack: TypedModifier[];
  damage: TypedModifier[];
  speed: Map<string, TypedModifier[]>;
  init: TypedModifier[];
}

/**
 * Evaluate + bucket every shared buff's `changes[]` by target:
 *   - AC (`ac`/`aac`/`sac`/`nac` targets)
 *   - saves (`fort`/`ref`/`will`/`allSavingThrows`)
 *   - skills (`skill.*`, plus a global `skills` bucket — issue #68)
 *   - attack rolls (`attack`/`mattack` targets — applied to every attack line
 *     alike, matching the no-provenance-split posture of both callers)
 *   - damage rolls (`damage`/`wdamage` targets — issue #68 folds `wdamage`
 *     ["weapon damage"] into the same bucket as `damage`, since every one of
 *     these creatures attacks exclusively with natural weapons, which count
 *     as "weapon damage" for effects like sickened's penalty)
 *   - ability scores (`str`/`dex`/`con`/`int`/`wis`/`cha` targets)
 *   - movement speed (`landSpeed`/`flySpeed`/`swimSpeed`/`climbSpeed`/`burrowSpeed`)
 *   - initiative (`init` target)
 * `operator: "set"` changes are NOT honored for speed — shared buffs are
 * player buffs, not conditions, so nothing shareable in the vendored data
 * ever sets an absolute speed. (Issue #68 also feeds this function each
 * creature's OWN active `CONDITIONS` entries, reshaped as synthetic
 * `ActiveBuff`s — see `companion.ts`'s `conditionChangeSources` — so a
 * condition's `Change[]` go through the exact same routing as a shared buff.)
 */
export function routeSharedBuffs(
  buffs: readonly ActiveBuff[],
  rollData: RollData,
): RoutedSharedBuffs {
  const routed: RoutedSharedBuffs = {
    ac: [],
    fort: [],
    ref: [],
    will: [],
    skill: new Map(),
    skillsGlobal: [],
    ability: { str: [], dex: [], con: [], int: [], wis: [], cha: [] },
    attack: [],
    damage: [],
    speed: new Map(),
    init: [],
  };
  const abilityTargets = new Set<string>(ABILITY_IDS);

  for (const buff of buffs) {
    const buffRollData = withBuffCasterLevel(buff, rollData);
    for (const ch of buff.changes) {
      const value = evalShared(ch.formula, buffRollData);
      if (!value) continue;
      const mod: TypedModifier = {
        type: ch.type || "untyped",
        value,
        source: buff.name,
        sourceId: buff.instanceId,
      };
      const speedMode = SPEED_TARGET_MODE[ch.target];
      if (ch.target === "ac" || ch.target === "aac" || ch.target === "sac" || ch.target === "nac") {
        const category =
          ch.target === "aac"
            ? "armor"
            : ch.target === "sac"
              ? "shield"
              : ch.target === "nac"
                ? "natural"
                : ch.type === "dodge"
                  ? "dodge"
                  : ch.type === "deflection"
                    ? "deflection"
                    : "generic";
        routed.ac.push({ ...mod, category });
      } else if (ch.target === "fort") {
        routed.fort.push(mod);
      } else if (ch.target === "ref") {
        routed.ref.push(mod);
      } else if (ch.target === "will") {
        routed.will.push(mod);
      } else if (ch.target === "allSavingThrows") {
        routed.fort.push(mod);
        routed.ref.push(mod);
        routed.will.push(mod);
      } else if (ch.target === "skills") {
        routed.skillsGlobal.push(mod);
      } else if (ch.target.startsWith("skill.")) {
        const id = ch.target.slice("skill.".length);
        const arr = routed.skill.get(id);
        if (arr) arr.push(mod);
        else routed.skill.set(id, [mod]);
      } else if (abilityTargets.has(ch.target)) {
        routed.ability[ch.target as AbilityId].push(mod);
      } else if (ch.target === "attack" || ch.target === "mattack") {
        routed.attack.push(mod);
      } else if (ch.target === "damage" || ch.target === "wdamage") {
        routed.damage.push(mod);
      } else if (ch.target === "init") {
        routed.init.push(mod);
      } else if (speedMode) {
        const arr = routed.speed.get(speedMode);
        if (arr) arr.push(mod);
        else routed.speed.set(speedMode, [mod]);
      }
    }
  }
  return routed;
}

/**
 * Apply shared ability-score bonuses to a creature's own base ability scores
 * BEFORE deriving anything that depends on them — this is what makes them
 * cascade into AC (Dex), saves (Con/Dex/Wis), CMB/CMD (Str/Dex), skills,
 * attacks (Str/Dex), and initiative (Dex) exactly the way the creature's own
 * base ability scores already do, with no separate "shared bonus" pathway
 * downstream of this call.
 */
export function applySharedAbilityBonuses(
  abilities: Record<AbilityId, { score: number; mod: number }>,
  sharedAbility: Record<AbilityId, TypedModifier[]>,
  abilityMod: (score: number) => number,
): Record<AbilityId, { score: number; mod: number }> {
  const result = { ...abilities };
  for (const id of ABILITY_IDS) {
    const bonus = resolveStack(sharedAbility[id]).total;
    if (bonus) {
      const newScore = result[id].score + bonus;
      result[id] = { score: newScore, mod: abilityMod(newScore) };
    }
  }
  return result;
}

/** Add shared-buff speed bonuses onto a creature's base speeds, one typed-stacking resolve per movement mode. */
export function applySharedSpeeds(
  base: Readonly<Record<string, number>>,
  sharedSpeed: ReadonlyMap<string, TypedModifier[]>,
): Record<string, number> {
  const speeds = { ...base };
  for (const [mode, mods] of sharedSpeed) {
    const bonus = resolveStack(mods).total;
    if (bonus) speeds[mode] = (speeds[mode] ?? 0) + bonus;
  }
  return speeds;
}

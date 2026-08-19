/**
 * `compute(doc, refData) -> DerivedSheet`: the static (no active buffs/conditions)
 * derived character sheet. Passive racial/item/class-feature changes DO feed
 * through the stacking engine here; active buffs and conditions land in Stage 4.
 *
 * Clean-room implementation from the PF1 rules (DESIGN §6).
 *
 * HP assumptions (documented): maximum hit points at 1st character level; each
 * subsequent level adds the standard rounded average `floor(HD/2) + 1`; Con
 * modifier is added per Hit Die. The favored-class bonus is applied only from the
 * explicit `build.favoredClassBonus` choices (each `"hp"` entry = +1 HP); it is
 * NOT auto-assumed, since the builder (Stage 3) collects those choices.
 *
 * If `build.maxHpOverride` is set (a positive integer), it replaces the computed
 * average as `sheet.hp.max`; the rules-average is always exposed as `sheet.hp.auto`
 * so the UI can display it and offer a reset.
 */

import type {
  AbilityId,
  AcComponent,
  ArmorClass,
  BabTier,
  CharacterDoc,
  DerivedActiveForm,
  DerivedEncumbrance,
  DerivedProficiencies,
  DerivedSheet,
  DerivedSkill,
  HitPoints,
  ModifierComponent,
  RefData,
  ResolvedStat,
  ResolvedWeaponAttack,
  SaveTier,
  SizeId,
  WeaponInstance,
  WornArmor,
} from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { computeAbilityDCs } from "./ability-dcs.js";
import { computeClChecks, computeSpellDCs } from "./spell-dcs.js";
import { resolveBonusKnownSpells, resolveCastingAdjustments } from "./casting-economy/index.js";
import { deriveSpellLikeAbilities } from "./spell-like-abilities/index.js";
import {
  ABILITY_LABEL,
  collectAbilitySubstitutions,
  resolveSubstitution,
  type ActiveAbilitySubstitution,
  type ResolvedAbility,
} from "./ability-substitution.js";
import { acBonusType } from "./ac-bonus-types.js";
import { chosenBonusClassSkills } from "./bonus-class-skills.js";
import { traitGrantedClassSkills } from "./traits.js";
import { featGrantedClassSkills } from "./feat-effects-resolve.js";
import { resolveClassFeatures } from "./archetypes.js";
import { computeRanger } from "./ranger.js";
import { orderByTag } from "./cavalier-orders.js";
import { collectModifiers, forTarget, type CollectedModifier } from "./collect.js";
import { computeDefenses } from "./defenses.js";
import { weaponDrBypasses } from "./dr-bypass.js";
import { computeKineticBlasts } from "./kinetic-blast.js";
import { KINETICIST_ELEMENTS } from "./kineticist-elements.js";
import { ORACLE_MYSTERIES } from "./oracle-mysteries.js";
import { resolveSave } from "./save-categories.js";
import { maneuverConditionalTotals } from "./maneuver-categories.js";
import { acConditionalTotals, type ScopedAcModifier } from "./ac-categories.js";
import { computeSenses } from "./senses.js";
import {
  carryAdjustments,
  computeEncumbrance,
  encumbranceLevelFor,
  encumberedSpeed,
  loadTierLabel,
} from "./encumbrance.js";
import { derivePcNaturalAttacks } from "./pc-natural-attacks/index.js";
import {
  computePolymorphAttacks,
  polymorphFormOption,
  POLYMORPH_TIERS,
  type PolymorphTier,
} from "./polymorph.js";
import {
  deriveProficiencies,
  isArmorTypeProficient,
  isShieldTierProficient,
  isWeaponProficient,
} from "./proficiency.js";
import { hasSlowAndSteady } from "./racial-traits.js";
import { abilityMod, buildRollData, totalLevel, type AbilityView } from "./rolldata.js";
import { resolveStack, synthetic, toComponents, type TypedModifier } from "./stacking.js";
import { normalizeWeaponGroup } from "./weapon-groups.js";
import { gunTrainingMatches } from "./gun-training.js";
import {
  babForLevels,
  fractionalBab,
  fractionalSave,
  isTrainedOnly,
  PARAMETERIZED_SKILL_PREFIXES,
  ROGUE_FINESSE_TRAINING_LEVELS,
  saveForLevels,
  SIZE_AC_MOD,
  SKILL_ABILITY,
  SKILL_GROUPS,
  SKILL_IDS,
  skillBaseId,
  skillUsesAcp,
  specialSizeMod,
} from "./tables.js";

const SCHEMA_VERSION = 1;

/** Size categories smallest to largest, for stepping by a "size" change target. */
const SIZE_LADDER: readonly SizeId[] = [
  "fine",
  "dim",
  "tiny",
  "sm",
  "med",
  "lg",
  "huge",
  "grg",
  "col",
];

/** Shifts `size` by `steps` along {@link SIZE_LADDER}, clamped at either end. */
function shiftSize(size: SizeId, steps: number): SizeId {
  const idx = SIZE_LADDER.indexOf(size);
  const clamped = Math.min(SIZE_LADDER.length - 1, Math.max(0, idx + steps));
  return SIZE_LADDER[clamped]!;
}

/**
 * Weapon damage-die size progression (CRB p.145 weapon-size damage table,
 * reprinted from the designer FAQ on size changes: "Occasionally a
 * character's size will change... to determine the new damage, find the
 * die on the size chart and move it the appropriate number of size
 * categories"). Two independent chains, since the published chart isn't one
 * single sequence — a die's neighbors depend on which family it's in:
 *
 * - `SIZE_DIE_CHAIN_MAIN`: the common one-handed/light-weapon family
 *   (1 -> 1d2 -> 1d3 -> 1d4 -> 1d6 -> 1d8 -> 2d6 -> 3d6 -> 4d6 -> 6d6 -> 8d6
 *   -> 12d6 -> 16d6).
 * - `SIZE_DIE_CHAIN_D8`: the "big single-die" family starting at 1d10 (e.g.
 *   greatclub) — 1d10 -> 2d8 -> 3d8 -> 4d8 -> 6d8 -> 8d8 -> 12d8 -> 16d8.
 *
 * Kept exactly as published: a die the chart doesn't print (2d4, 1d12, 2d12)
 * is NOT inserted here, it's converted to its charted equivalent first — see
 * {@link normalizeToChain}.
 */
const SIZE_DIE_CHAIN_MAIN: readonly string[] = [
  "1",
  "1d2",
  "1d3",
  "1d4",
  "1d6",
  "1d8",
  "2d6",
  "3d6",
  "4d6",
  "6d6",
  "8d6",
  "12d6",
  "16d6",
];
const SIZE_DIE_CHAIN_D8: readonly string[] = [
  "1d10",
  "2d8",
  "3d8",
  "4d8",
  "6d8",
  "8d8",
  "12d8",
  "16d8",
];
const SIZE_DIE_INDEX: ReadonlyMap<string, { chain: readonly string[]; idx: number }> = new Map(
  [SIZE_DIE_CHAIN_MAIN, SIZE_DIE_CHAIN_D8].flatMap((chain) =>
    chain.map((die, idx) => [die, { chain, idx }] as const),
  ),
);

/**
 * Converts a die the size chart doesn't print onto the charted die it counts
 * as, per the FAQ's own escape hatch: "If the die type is not referenced on
 * this chart, apply the following rules before adjusting the damage dice. 2d4
 * counts as 1d8 on the chart, 3d4 counts as 2d6 on the chart, and so on for
 * higher numbers of d4. 1d12 counts as 2d6 on the chart, and so on for higher
 * numbers of d12."
 *
 * Both "and so on" runs advance one chart step per extra die, so this is index
 * arithmetic on {@link SIZE_DIE_CHAIN_MAIN} rather than a lookup table: `Nd4`
 * lands at index 3 + N (2d4 -> 1d8, 3d4 -> 2d6, ...) and `Nd12` at index 5 + N
 * (1d12 -> 2d6, 2d12 -> 3d6, ...). 1d4 is printed on the chart already and is
 * left alone.
 */
function normalizeToChain(dice: string): string {
  const m = /^(\d+)d(4|12)$/.exec(dice);
  if (!m) return dice;
  const count = Number(m[1]);
  const isD4 = m[2] === "4";
  if (count < (isD4 ? 2 : 1)) return dice;
  const idx = (isD4 ? 3 : 5) + count;
  return SIZE_DIE_CHAIN_MAIN[Math.min(idx, SIZE_DIE_CHAIN_MAIN.length - 1)]!;
}

/**
 * `SIZE_DIE_CHAIN_MAIN` and `SIZE_DIE_CHAIN_D8` interleave into ONE
 * underlying die-size progression once dice reach 1d8/1d10: `1d6`(4) and
 * `1d10`(6) both sit one row past `1d8`(5), and each chain then advances two
 * rows at a time (`1d8`->`2d6` skips over `1d10`; `1d10`->`2d8` skips over
 * `2d6`). This is exactly the FAQ's own "two steps" vs "one step" language
 * below: a plain {@link SIZE_DIE_CHAIN_MAIN}/`_D8` index step already equals
 * two FAQ steps once past 1d8, and one FAQ step below it. `combinedChartIndex`
 * and {@link dieAtCombinedChartIndex} convert to/from that single merged
 * numbering so {@link scaleWeaponDamageDice} can walk it in FAQ-step units.
 */
function combinedChartIndex(entry: { chain: readonly string[]; idx: number }): number {
  if (entry.chain === SIZE_DIE_CHAIN_D8) return entry.idx * 2 + 6;
  return entry.idx <= 5 ? entry.idx : entry.idx * 2 - 5;
}

/** Inverse of {@link combinedChartIndex}, clamped at either end of whichever chain the index resolves onto. */
function dieAtCombinedChartIndex(ci: number): string {
  if (ci <= 5) return SIZE_DIE_CHAIN_MAIN[Math.max(0, ci)]!;
  if (ci % 2 === 0) {
    return SIZE_DIE_CHAIN_D8[Math.min((ci - 6) / 2, SIZE_DIE_CHAIN_D8.length - 1)]!;
  }
  return SIZE_DIE_CHAIN_MAIN[Math.min((ci + 5) / 2, SIZE_DIE_CHAIN_MAIN.length - 1)]!;
}

/**
 * Shifts a weapon damage-dice display string (e.g. `"1d8"`) from `fromSize`
 * to `toSize` along the {@link SIZE_LADDER}, per the Paizo designer FAQ
 * "Size Changes, Effective Size Changes, and Damage Dice Progression"
 * (paizo.com/paizo/faq/v5748nruor1fm#v5748eaic9t3f, mirrored on aonprd.com):
 *
 * "When the damage dealt by a creature's weapons or natural attacks changes
 * due to a change in its size (or the size of its weapon), use the following
 * rules to determine the new damage. If the size increases by one step, look
 * up the original damage on the chart and increase the damage by two steps.
 * If the initial size is Small or lower (or is treated as Small or lower) or
 * the initial damage is 1d6 or less, instead increase the damage by one
 * step. If the size decreases by one step, look up the original damage on
 * the chart and decrease the damage by two steps. If the initial size is
 * Medium or lower (or is treated as Medium or lower) or the initial damage
 * is 1d8 or less, instead decrease the damage by one step."
 *
 * Each condition is re-checked at every single-category step against the
 * size/dice CURRENT at that step (not the original `fromSize`/`dice`), so a
 * multi-category shift (polymorph into a Fine form, say) walks the ladder one
 * category at a time rather than applying the FAQ's per-step rule once for
 * the whole distance — this is what makes a Medium longsword's well-known
 * printed progression (1d8 Medium, 1d6 Small, 1d4 Tiny, 1d3 Diminutive, 1d2
 * Fine; 2d6 Large, 3d6 Huge, 4d6 Gargantuan, 6d6 Colossal) fall out correctly:
 * every step below Large is size <= Small or is 1d6-and-below territory, so
 * it's a one-FAQ-step move each time, and Large-and-up normally isn't, so
 * it's two.
 *
 * Used when the wielder's effective size differs from the size the weapon's
 * `damageDice` was written for (Enlarge Person, Reduce Person, and active
 * polymorph forms all change effective size but not the stored per-weapon dice
 * string). Returns `dice` UNCHANGED when `fromSize === toSize` or when it
 * doesn't resolve onto a chain even after {@link normalizeToChain}.
 *
 * The conversion is one-way by design — a Medium greataxe counts as 2d6, so it
 * reads 3d6 at Large and 1d8 at Small, never 1d12 at either. That's not lossy
 * in practice because scaling always recomputes from the weapon's stored die,
 * so returning to base size prints 1d12 again.
 */
export function scaleWeaponDamageDice(dice: string, fromSize: SizeId, toSize: SizeId): string {
  if (fromSize === toSize) return dice;
  const entry = SIZE_DIE_INDEX.get(normalizeToChain(dice));
  if (!entry) return dice;
  const fromIdx = SIZE_LADDER.indexOf(fromSize);
  const toIdx = SIZE_LADDER.indexOf(toSize);
  const growing = toIdx > fromIdx;
  const smallOrLowerIdx = SIZE_LADDER.indexOf("sm");
  const mediumOrLowerIdx = SIZE_LADDER.indexOf("med");
  let ci = combinedChartIndex(entry);
  for (let cur = fromIdx; cur !== toIdx; cur += growing ? 1 : -1) {
    if (growing) {
      const exception = cur <= smallOrLowerIdx || ci <= 4; // "initial damage is 1d6 or less"
      ci += exception ? 1 : 2;
    } else {
      const exception = cur <= mediumOrLowerIdx || ci <= 5; // "initial damage is 1d8 or less"
      ci -= exception ? 1 : 2;
    }
    // Re-resolve against a real printed die before the next iteration so a
    // die already clamped at the top/bottom of its chain doesn't drift into
    // an unclamped index that would flip a later step's own exception check.
    ci = combinedChartIndex(SIZE_DIE_INDEX.get(dieAtCombinedChartIndex(ci))!);
  }
  return dieAtCombinedChartIndex(ci);
}

/**
 * Applies collected modifiers for one movement mode to `speeds[mode]` in
 * place. Foundry's `operator: "set"` changes (Slow, Debilitating Injury, ...)
 * replace the mode's value outright rather than adding to it; when more than
 * one "set" change targets the same mode at once, the LOWEST wins — every
 * "set" change in the vendored slice is a penalty, so "lowest" is "most
 * restrictive," which is the correct way for such effects to combine. Plain
 * additive changes still apply on top of the base value whenever no "set" is
 * present for that mode.
 */
function applySpeedTarget(
  speeds: Record<string, number>,
  collected: CollectedModifier[],
  mode: string,
  target: string,
): void {
  const mods = forTarget(collected, target);
  if (mods.length === 0) return;
  const setMods = mods.filter((m) => m.operator === "set");
  if (setMods.length > 0) {
    speeds[mode] = Math.min(...setMods.map((m) => m.value));
    return;
  }
  const addTotal = mods.reduce((s, m) => s + m.value, 0);
  if (addTotal) speeds[mode] = (speeds[mode] ?? 0) + addTotal;
}

/**
 * Provenance label for an ability line that may have been substituted — plain
 * ability name normally, ability plus the granting feature when a substitution
 * won, so the sheet explains why AC is reading Intelligence.
 */
function abilityLabelFor(resolved: ResolvedAbility): string {
  const base = ABILITY_LABEL[resolved.ability];
  return resolved.substitution ? `${base} (${resolved.substitution.source})` : base;
}

/* ------------------------------------------------------------- temp HP */

/**
 * Aggregates every `tempHp`-targeting `Change` into `HitPoints.grantedTemp`.
 * NOT `resolveStack` (typed-bonus stacking is per bonus TYPE —
 * dodge/untyped/circumstance sum, others take the highest-within-type) —
 * temporary HP stacking is per SOURCE (Paizo FAQ / CRB p. 208 "Combining
 * Magical Effects": temp HP from the same source doesn't stack, temp HP from
 * different sources does), so this groups by each modifier's `source` (display
 * name — two active instances of the identical buff share the same `source`
 * string even though their `sourceId`s/instanceIds differ, which is exactly
 * "same source" in the FAQ's sense), takes the highest value within each
 * group, then SUMS across groups.
 */
function computeGrantedTempHp(collected: CollectedModifier[]): {
  total: number;
  components: ModifierComponent[];
} {
  const mods = forTarget(collected, "tempHp");
  if (mods.length === 0) return { total: 0, components: [] };
  const bySource = new Map<string, CollectedModifier[]>();
  for (const m of mods) {
    const arr = bySource.get(m.source);
    if (arr) arr.push(m);
    else bySource.set(m.source, [m]);
  }
  const components: ModifierComponent[] = [];
  let total = 0;
  for (const [, group] of bySource) {
    const best = group.reduce((a, b) => (b.value > a.value ? b : a));
    if (best.value > 0) total += best.value;
    for (const m of group) {
      components.push({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m === best && best.value > 0,
      });
    }
  }
  return { total, components };
}

/* ----------------------------------------------------------------- abilities */

function computeAbilities(
  doc: CharacterDoc,
  collected: CollectedModifier[],
): Record<AbilityId, AbilityView & { components: ModifierComponent[] }> {
  const result = {} as Record<AbilityId, AbilityView & { components: ModifierComponent[] }>;
  for (const id of ABILITY_IDS) {
    const base = doc.abilities[id] ?? 10;
    const stack = resolveStack(forTarget(collected, id));
    const total = base + stack.total;
    result[id] = {
      base,
      total,
      mod: abilityMod(total),
      components: [synthetic("Base", "base", base), ...toComponents(stack.modifiers)],
    };
  }
  return result;
}

/* -------------------------------------------------------------------- saves */

/**
 * `ability` is the save's ability term — normally the save's fixed ability
 * (Con/Dex/Wis for fort/ref/will), but Reflex's can be substituted (oracle
 * Sidestep Secret/Prophetic Armor: Cha instead of Dex — see
 * `ability-substitution.ts`). Fortitude/Will callers pass a `ResolvedAbility`
 * with no `substitution`, so the label falls back to the plain ability id
 * exactly as before.
 */
function computeSave(
  which: "fort" | "ref" | "will",
  classes: CharacterDoc["identity"]["classes"],
  refData: RefData,
  ability: ResolvedAbility,
  collected: CollectedModifier[],
  fractional: boolean,
): ResolvedStat {
  const tiers: { tier: SaveTier; level: number }[] = [];
  for (const c of classes) {
    const def = Object.values(refData.classes).find((x) => x.tag === c.tag);
    if (def) tiers.push({ tier: def.saves[which], level: c.level });
  }
  // Fractional base bonuses (Pathfinder Unchained, opt-in per character):
  // sum the exact fractions and round down once, granting the good save's +2
  // once for the save rather than once per good-save class, the way a class
  // skill's +3 works. RAW rounds down per class and grants the +2 each time.
  const base = fractional
    ? fractionalSave(tiers)
    : tiers.reduce((sum, t) => sum + saveForLevels(t.tier, t.level), 0);
  const all = [...forTarget(collected, which), ...forTarget(collected, "allSavingThrows")];

  const { total, stack, conditionals } = resolveSave(which, base + ability.mod, all);
  const label = ability.substitution
    ? `Ability (${ability.ability}, ${ability.substitution.source})`
    : `Ability (${ability.ability})`;
  const components: ModifierComponent[] = [
    synthetic("Base", "base", base),
    synthetic(label, "ability", ability.mod),
    ...toComponents(stack.modifiers),
  ];
  return conditionals.length > 0 ? { total, components, conditionals } : { total, components };
}

/* ----------------------------------------------------------------------- AC */

type AcCategory = AcComponent["category"];

function categoryFor(target: string, type: string): AcCategory {
  if (target === "aac") return "armor";
  if (target === "sac") return "shield";
  if (target === "nac") return "natural";
  if (type === "dodge") return "dodge";
  if (type === "deflection") return "deflection";
  return "generic";
}

const TOUCH_CATEGORIES: ReadonlySet<AcCategory> = new Set<AcCategory>([
  "base",
  "dex",
  "size",
  "dodge",
  "deflection",
  "generic",
]);
const FLAT_FOOTED_CATEGORIES: ReadonlySet<AcCategory> = new Set<AcCategory>([
  "base",
  "armor",
  "shield",
  "natural",
  "size",
  "deflection",
  "generic",
]);

/**
 * RAW: CMD benefits from these eight *named* AC BONUS types (deflection,
 * dodge, circumstance, insight, luck, morale, profane, sacred) in addition to
 * BAB/Str/Dex/size. Armor, shield, and natural-armor bonuses never apply.
 * Untyped/enhancement/racial/etc. AC bonuses are likewise excluded — a
 * vendored source that wants an untyped bonus to also affect CMD (e.g. a
 * monk's Wis-to-AC class feature) carries its own explicit `cmd`-target
 * change for that (see the CMB/CMD block in {@link compute}).
 *
 * This exclusion is for BONUSES only — "any penalties to a creature's AC
 * also apply to its CMD" (CRB p.199) is unconditional, so an "ac" PENALTY
 * (negative value) auto-applies to CMD regardless of its type, named or not.
 */
const CMD_AC_TYPES: ReadonlySet<string> = new Set([
  "deflection",
  "dodge",
  "circumstance",
  "insight",
  "luck",
  "morale",
  "profane",
  "sacred",
]);

/**
 * `acAbility` is the ability feeding AC's Dexterity line — normally Dex, but
 * an ability substitution (Student of War's Mind Over Metal) can replace it;
 * see `ability-substitution.ts`.
 *
 * The armor/load max-Dex cap still binds the substituted modifier. Mind Over
 * Metal says so explicitly — the armor's normal maximum Dexterity bonus still
 * applies, limiting how much of the Intelligence bonus reaches AC — so the cap
 * is a property of the AC term rather than of the ability feeding it.
 */
function computeAc(
  doc: CharacterDoc,
  size: SizeId,
  acAbility: ResolvedAbility,
  collected: CollectedModifier[],
  encumbrance?: DerivedEncumbrance,
): ArmorClass {
  const dexMod = acAbility.mod;
  // Gather candidates as {category, type, value, source}, then stack within each
  // (category|type) group so e.g. armor base + armor enhancement stack but two
  // luck bonuses to AC do not.
  interface AcCand extends TypedModifier {
    category: AcCategory;
    /**
     * Set on a worn piece's enhancement bonus, naming the piece whose own
     * armor/shield bonus it enhances. A magic armor's "+1" enhances *that
     * armor's* bonus, so when the piece loses the armor-bonus competition
     * (bracers of armor beat it, say) its enhancement has nothing left to
     * enhance and drops out with it.
     */
    enhances?: string;
    /** Identity a worn piece's `enhances` back-reference points at. */
    pieceKey?: string;
  }
  const cands: AcCand[] = [];

  cands.push({
    category: "base",
    type: "base",
    value: 10,
    source: "Base",
    applied: true,
  } as AcCand);

  // worn armor / shield + max-dex cap
  let maxDexCap: number | undefined;
  let armorTotal = 0;
  let shieldTotal = 0;
  let wornIndex = 0;
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.armor) continue;
    const a = inst.armor;
    const label = inst.name ?? (a.slot === "shield" ? "Shield" : "Armor");
    // Per-piece, not per-label: two identically-named pieces must not have one's
    // enhancement follow the other's base bonus out of the breakdown.
    const pieceKey = `worn:${wornIndex++}`;
    const isShield = a.slot === "shield";
    const category: AcCategory = isShield ? "shield" : "armor";
    if (isShield) shieldTotal += a.ac;
    else armorTotal += a.ac;
    cands.push({
      // Worn armor's own AC IS the armor (or shield) bonus, so it competes with
      // every other source of one — mage armor, bracers, a second worn piece.
      category,
      type: acBonusType(isShield ? "sac" : "aac", "untyped"),
      value: a.ac,
      source: label,
      pieceKey,
    });
    if (a.enhancement) {
      cands.push({
        category,
        type: "enh",
        value: a.enhancement,
        source: `${label} (enhancement)`,
        enhances: pieceKey,
      });
    }
    // A tower shield's max-Dex cap binds the same as an armor's (RAW) — read
    // regardless of slot, and combined as the worst (lowest) of every
    // equipped piece that carries one.
    if (a.maxDex !== undefined) {
      maxDexCap = maxDexCap === undefined ? a.maxDex : Math.min(maxDexCap, a.maxDex);
    }
  }
  void armorTotal;
  void shieldTotal;

  // armor-training max-dex increase
  const mDexBonus = forTarget(collected, "mDexA").reduce((s, m) => s + m.value, 0);
  if (maxDexCap !== undefined) maxDexCap += mDexBonus;

  // Encumbrance (optional rule): a medium/heavy load imposes its own
  // max-Dex-to-AC cap, combining with any worn-armor cap as "whichever is more
  // restrictive wins" (PF1 RAW — the two never stack additively).
  const loadCap = encumbrance?.maxDexCap;
  const combinedDexCap =
    loadCap === undefined
      ? maxDexCap
      : maxDexCap === undefined
        ? loadCap
        : Math.min(maxDexCap, loadCap);
  const cappedDex = combinedDexCap === undefined ? dexMod : Math.min(dexMod, combinedDexCap);
  // Label the Dexterity line with the load tier only when the load's cap is
  // the one actually binding (equal-or-more restrictive than any armor cap) —
  // otherwise it reads exactly as it did before this feature existed.
  const dexBoundByLoad =
    loadCap !== undefined &&
    cappedDex < dexMod &&
    (maxDexCap === undefined || loadCap <= maxDexCap);
  // Qualifiers stack in one parenthetical: the granting feature when the
  // ability was substituted, and the load tier when the load's cap is the one
  // actually binding.
  const dexQualifiers = [
    ...(acAbility.substitution ? [acAbility.substitution.source] : []),
    ...(dexBoundByLoad ? [loadTierLabel(encumbrance!.tier)] : []),
  ];
  cands.push({
    category: "dex",
    type: "untyped",
    value: cappedDex,
    source:
      dexQualifiers.length > 0
        ? `${ABILITY_LABEL[acAbility.ability]} (${dexQualifiers.join(", ")})`
        : ABILITY_LABEL[acAbility.ability],
  });

  const sizeMod = SIZE_AC_MOD[size];
  if (sizeMod !== 0) cands.push({ category: "size", type: "size", value: sizeMod, source: "Size" });

  // typed AC changes from items/features: ac / aac / sac / nac. An
  // AC-category-scoped modifier (Change.acCategories — "+1 dodge bonus to AC
  // against traps") is held out of the headline candidates, same as a
  // save-category scope is held out of a save's headline total — it feeds
  // only the conditional lines built after the headline stacks resolve.
  // Only the bare "ac" target honors the scope (see Change.acCategories).
  const acScoped: ScopedAcModifier[] = [];
  for (const target of ["ac", "aac", "sac", "nac"]) {
    for (const m of forTarget(collected, target)) {
      const type = acBonusType(target, m.type);
      const category = categoryFor(target, m.type);
      if (target === "ac" && (m.acCategories?.length ?? 0) > 0) {
        acScoped.push({ ...m, type, stackCategory: category });
        continue;
      }
      cands.push({ ...m, type, category });
    }
  }

  // stack within (category|type)
  const groups = new Map<string, AcCand[]>();
  for (const c of cands) {
    const key = `${c.category}|${c.type}`;
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  const components: AcComponent[] = [];
  /** Worn pieces whose own armor/shield bonus survived the competition. */
  const winningPieces = new Set<string>();
  const enhancements: { component: AcComponent; enhances: string }[] = [];
  for (const [, group] of groups) {
    const stack = resolveStack(group);
    stack.modifiers.forEach((m, i) => {
      const cand = group[i]!;
      const component: AcComponent = {
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
        category: cand.category,
      };
      if (m.applied && cand.pieceKey !== undefined) winningPieces.add(cand.pieceKey);
      if (cand.enhances !== undefined) enhancements.push({ component, enhances: cand.enhances });
      components.push(component);
    });
  }
  // An enhancement bonus only ever enhanced its own piece's armor/shield bonus,
  // so it goes when that bonus does (a +1 chain shirt under bracers of armor +8
  // contributes 8, not 9).
  for (const { component, enhances } of enhancements) {
    if (!winningPieces.has(enhances)) component.applied = false;
  }

  const sumWhere = (pred: (c: AcComponent) => boolean) =>
    components.reduce((s, c) => (c.applied && pred(c) ? s + c.value : s), 0);

  // Flat-footed loses the Dex (and dodge) bonus to AC, but a Dex/dodge
  // PENALTY still applies — flat-footed AC can never exceed normal AC. So a
  // component outside FLAT_FOOTED_CATEGORIES still counts when it's negative.
  const flatFooted = components.reduce(
    (s, c) =>
      c.applied && (FLAT_FOOTED_CATEGORIES.has(c.category) || c.value < 0) ? s + c.value : s,
    0,
  );

  const normal = sumWhere(() => true);
  // Conditional lines hang off normal AC only — see ArmorClass.conditionals
  // for why touch/flat-footed stay bare numbers.
  const conditionals = acConditionalTotals(
    normal,
    cands.map((c) => ({ ...c, stackCategory: c.category })),
    acScoped,
  );

  return {
    normal,
    touch: sumWhere((c) => TOUCH_CATEGORIES.has(c.category)),
    flatFooted,
    components,
    ...(conditionals.length > 0 ? { conditionals } : {}),
  };
}

/* ------------------------------------------------------- armor speed / ASF */

/**
 * Highest armor `type` (weight class: 0 none/1 light/2 med/3 heavy) among
 * equipped BODY armor — shields don't impose the "Table: Speed" reduction.
 * `WornArmor.type` already reflects any material-driven shift (mithral
 * lightens by one step, see `model/materials.ts`), so this automatically picks
 * up e.g. mithral full plate reading as medium.
 */
function heaviestWornArmorType(doc: CharacterDoc): number {
  let max = 0;
  for (const inst of doc.build.gear ?? []) {
    if (inst.equipped && inst.armor?.slot === "armor" && inst.armor.type) {
      max = Math.max(max, inst.armor.type);
    }
  }
  return max;
}

/**
 * Effective armor check penalty for a single worn armor/shield piece (CRB,
 * Equipment: masterwork armor/shields have their check penalty lessened by
 * 1, to a minimum of 0; magic armor with an enhancement bonus of +1 or
 * higher is automatically masterwork and gets that same single -1, not an
 * additional one). `WornArmor.acp` holds the listed/base penalty — the raw
 * table value after any special-material adjustment baked in at pick time
 * (`apps/web/src/model/doc.ts` `addWornArmorFromRef`), but before this
 * masterwork/enhancement reduction, so it applies uniformly whether the
 * armor came from `RefData` or was entered by hand.
 *
 * Mithral is excluded: per RAW, mithral armor "is also always considered
 * masterwork," and this repo's -3 mithral ACP adjustment (see
 * `apps/web/src/model/materials.ts`) already represents that combined
 * reduction, not an additional stack on top of it.
 */
export function armorPieceAcp(
  armor: Pick<WornArmor, "acp" | "masterwork" | "enhancement" | "material">,
): number {
  const raw = armor.acp ?? 0;
  if (raw >= 0) return 0;
  const masterworked = armor.masterwork === true || (armor.enhancement ?? 0) >= 1;
  if (!masterworked || armor.material === "mithral") return raw;
  return Math.min(0, raw + 1);
}

/**
 * Class tags recognised as arcane spellcasters for arcane-spell-failure (ASF)
 * display — clean-room from PF1 RAW, not derived from Foundry data (the
 * vendored `ClassRef` carries no arcane/divine flag). This is the arcane
 * subset of `tables.ts`'s `SpellProgression` tags: wizard, sorcerer, arcanist
 * (ACG), and magus (UM) are int/cha-based arcane casters (arcanist has no
 * armor proficiency at all — "not proficient with any type of armor or shield"
 * per its own Weapon and Armor Proficiency feature — while magus gets a
 * level-gated exemption, see `ARMOR_EXEMPTIONS`); bard is a spontaneous arcane
 * caster, witch (APG) is a full prepared-arcane caster, and bloodrager (ACG)
 * is a spontaneous arcane caster too (own spell list, cha-based);
 * cleric/druid/paladin/ranger/shaman/warpriest/hunter are divine and never
 * incur ASF at all. Summoner and skald (both Cha-based spontaneous casters)
 * are also arcane — inquisitor (Wis-based) is divine and stays out of this
 * set.
 */
const ARCANE_CASTER_TAGS: ReadonlySet<string> = new Set([
  "wizard",
  "sorcerer",
  "arcanist",
  "magus",
  "bard",
  "summoner",
  "skald",
  "witch",
  "bloodrager",
  // Summoner (Unchained) is the same Cha-based arcane spontaneous caster as
  // the base summoner (see `CASTER_MODELS.summonerUnchained`'s doc comment).
  "summonerUnchained",
]);

/**
 * One class's PF1-RAW "Weapon and Armor Proficiency" arcane-spell-failure
 * exemption — clean-room from each class's own Archives of Nethys page
 * (legacy.aonprd.com), not Foundry source:
 *
 * - Bard (CRB): "...cast bard spells while wearing light armor and using a
 *   shield without incurring the normal arcane spell failure chance." —
 *   light armor AND a shield, no ASF.
 * - Summoner (APG) / Summoner Unchained: "...cast summoner spells while
 *   wearing light armor without incurring the normal arcane spell failure
 *   chance... wearing medium or heavy armor, or using a shield, incurs a
 *   chance of arcane spell failure..." — light armor ONLY, a shield still
 *   incurs ASF. (Unchained restates identical wording, not a different rule.)
 * - Skald (ACG): "...cast skald spells while wearing light or medium armor
 *   and even while using a shield without incurring the normal arcane spell
 *   failure chance." — light OR medium armor, even with a shield (tower
 *   shields aren't a skald proficiency, but the schema doesn't distinguish
 *   shield sub-types, so any equipped shield is treated as covered).
 * - Bloodrager (ACG): "...cast bloodrager spells while wearing light armor
 *   or medium armor without incurring the normal arcane spell failure
 *   chance... wearing heavy armor or wielding a shield incurs a chance of
 *   arcane spell failure..." — light OR medium armor, a shield still incurs
 *   ASF.
 * - Magus (UM): light armor at 1st ("Weapon and Armor Proficiency"), medium
 *   armor added at 7th ("Medium Armor" class feature), heavy armor added at
 *   13th ("Heavy Armor" class feature); "a magus wearing [medium/heavy]
 *   armor or using a shield incurs a chance of arcane spell failure" — a
 *   shield always incurs ASF regardless of level.
 *
 * `maxArmorType` mirrors `heaviestWornArmorType`'s weight scale (0 none/1
 * light/2 medium/3 heavy) and is a function of the class's own level so the
 * magus's exemption widens as she levels.
 */
interface ArcaneArmorExemption {
  /** Display label for the sheet's exemption footnote. */
  label: string;
  /** Heaviest armor type (0-3) exempted from ASF, given this class's level. */
  maxArmorType: (classLevel: number) => number;
  /** Whether the exemption still holds when a shield is equipped. */
  shieldOk: boolean;
}

const ARMOR_EXEMPTIONS: Readonly<Record<string, ArcaneArmorExemption>> = {
  bard: { label: "Bard", maxArmorType: () => 1, shieldOk: true },
  summoner: { label: "Summoner", maxArmorType: () => 1, shieldOk: false },
  summonerUnchained: {
    label: "Summoner (Unchained)",
    maxArmorType: () => 1,
    shieldOk: false,
  },
  skald: { label: "Skald", maxArmorType: () => 2, shieldOk: true },
  bloodrager: { label: "Bloodrager", maxArmorType: () => 2, shieldOk: false },
  magus: {
    label: "Magus",
    maxArmorType: (classLevel) => (classLevel >= 13 ? 3 : classLevel >= 7 ? 2 : 1),
    shieldOk: false,
  },
};

/** "light armor" / "light or medium armor" / "light, medium, or heavy armor". */
function armorTierLabel(maxArmorType: number): string {
  if (maxArmorType >= 3) return "light, medium, or heavy armor";
  if (maxArmorType >= 2) return "light or medium armor";
  return "light armor";
}

/**
 * Total arcane spell failure chance (%) from equipped armor + shields, only
 * for characters with at least one arcane-casting class — divine- only
 * characters get `undefined` back (ASF doesn't apply to them at all).
 *
 * Armor-proficiency exemption (PF1 RAW, see `ARMOR_EXEMPTIONS`): several
 * arcane classes ignore ASF while wearing armor within their own proficiency
 * (and, for bard/skald, even with a shield). This is applied here only when
 * the exempt class is the character's ONLY arcane class — a multiclass
 * wizard/bard still incurs ASF for her wizard spells regardless of what she's
 * wearing, so `total` stays the plain (conservative) sum in that case. This
 * app models ASF as a single sheet-level number rather than
 * per-spell/per-class, so the exemption is necessarily all-or-nothing: where a
 * multiclass character's arcane classes disagree on armor proficiency (e.g.
 * wizard + skald), the exemption is withheld entirely and the sheet shows the
 * conservative (higher) total rather than guessing which spell the player is
 * about to cast.
 */
function computeArcaneSpellFailure(
  doc: CharacterDoc,
): { total: number; exempt: boolean; exemptNote?: string } | undefined {
  const classes = doc.identity.classes.filter((c) => c.level > 0);
  const classTags = new Set(classes.map((c) => c.tag));
  const arcaneTags = [...classTags].filter((t) => ARCANE_CASTER_TAGS.has(t));
  if (arcaneTags.length === 0) return undefined;

  let rawTotal = 0;
  let hasShield = false;
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.armor) continue;
    rawTotal += inst.armor.asf ?? 0;
    if (inst.armor.slot === "shield") hasShield = true;
  }

  const soleArcaneTag = arcaneTags.length === 1 ? arcaneTags[0] : undefined;
  const rule = soleArcaneTag ? ARMOR_EXEMPTIONS[soleArcaneTag] : undefined;
  let exempt = false;
  let exemptNote: string | undefined;
  if (rule) {
    const classLevel = classes.find((c) => c.tag === soleArcaneTag)?.level ?? 0;
    const maxArmorType = rule.maxArmorType(classLevel);
    exempt = (rule.shieldOk || !hasShield) && heaviestWornArmorType(doc) <= maxArmorType;
    if (exempt) {
      exemptNote = `${rule.label}: exempt in ${armorTierLabel(maxArmorType)}${
        rule.shieldOk ? " (shield included)" : ", no shield"
      }`;
    }
  }
  return { total: exempt ? 0 : rawTotal, exempt, exemptNote };
}

/* ----------------------------------------------------------------------- HP */

/** Allowlisted stat-override keys the engine recognises. */
const STAT_OVERRIDE_KEYS = new Set([
  "hp.max",
  "ac.normal",
  "speeds.land",
  "initiative.total",
  "bab",
  "cmd",
  "cmb",
  "saves.fort.total",
  "saves.ref.total",
  "saves.will.total",
]);

function computeHp(
  doc: CharacterDoc,
  refData: RefData,
  conMod: number,
  collected: CollectedModifier[],
): HitPoints {
  const mode = doc.build.settings?.hpMode ?? "average";
  const hpRolls = doc.build.hpRolls ?? [];

  // Expand class levels in document order; the first overall level is maxed.
  // PF1 enforces a minimum of 1 HP per Hit Die after Con, so each level's
  // contribution is floored at 1 individually — a large negative Con penalty
  // can't drag a level (or the whole total) below its per-HD minimum.
  let hdBase = 0; // raw HP contribution from Hit Dice, pre-Con (display only)
  let hpFromLevels = 0; // actual HP from levels, post-Con, each level floored at 1
  let isFirstLevel = true;
  let hd = 0;
  for (const cls of doc.identity.classes) {
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    const die = def?.hd ?? 8;
    for (let i = 0; i < cls.level; i++) {
      let levelHp: number;
      if (isFirstLevel) {
        levelHp = die; // L1 always maxed regardless of mode
      } else if (mode === "max") {
        levelHp = die;
      } else if (mode === "rolled") {
        // hpRolls is indexed by character level (0-based = charLevel-1).
        const charLevel = hd + 1; // hd not yet incremented
        const rolled = hpRolls[charLevel - 1];
        levelHp = rolled != null && rolled > 0 ? rolled : Math.floor(die / 2) + 1;
      } else {
        // average
        levelHp = Math.floor(die / 2) + 1;
      }
      hdBase += levelHp;
      hpFromLevels += Math.max(1, levelHp + conMod);
      isFirstLevel = false;
      hd++;
    }
  }

  // Con modifier per Hit Die, as actually applied (reflects the per-HD floor
  // above, so this can differ from the naive `conMod * hd` when it binds).
  const conTotal = hpFromLevels - hdBase;

  // Favored-class HP choices (explicit only). "hp" and "both" each contribute +1.
  const fcbHp = (doc.build.favoredClassBonus ?? []).filter(
    (c) => c === "hp" || c === "both",
  ).length;

  // HP bonuses from collected modifiers (e.g. Toughness feat, class features).
  const hpStack = resolveStack(forTarget(collected, "hp"));

  const auto = hdBase + conTotal + fcbHp + hpStack.total;

  const components: ModifierComponent[] = [];
  if (hdBase !== 0) components.push(synthetic("Hit Dice", "base", hdBase));
  if (conTotal !== 0)
    components.push(
      synthetic(`Con (${conMod >= 0 ? "+" : ""}${conMod} × ${hd} HD)`, "ability", conTotal),
    );
  if (fcbHp !== 0) components.push(synthetic("Favored class", "untyped", fcbHp));
  components.push(...toComponents(hpStack.modifiers));

  // Legacy override (backward compat, honoured in average/unset mode)
  const override = doc.build.maxHpOverride;
  const hasLegacyOverride = override != null && override > 0 && mode === "average";
  const max = hasLegacyOverride ? override : auto;

  return {
    auto,
    max,
    current: doc.live.hp.current,
    temp: doc.live.hp.temp,
    nonlethal: doc.live.hp.nonlethal,
    components,
    grantedTemp: computeGrantedTempHp(collected),
  };
}

/* ------------------------------------------------------------------- skills */

function computeSkills(
  doc: CharacterDoc,
  refData: RefData,
  abilities: Record<AbilityId, AbilityView>,
  collected: CollectedModifier[],
  encumbrance?: DerivedEncumbrance,
): Record<string, DerivedSkill> {
  // Class-skill set: union of all the character's classes' classSkills, plus
  // any class skills granted unconditionally by the race (e.g. Adaro always
  // treat Swim as a class skill). Both vendored lists carry the bare
  // "crf"/"pro"/"prf" id (never a per-instance one), so membership for a
  // parameterized instance is resolved via its base id below (see
  // skillBaseId).
  const classSkillSet = new Set<string>();
  for (const cls of doc.identity.classes) {
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    for (const s of def?.classSkills ?? []) classSkillSet.add(s);
  }
  const race = refData.races[doc.identity.race];
  for (const s of race?.classSkills ?? []) classSkillSet.add(s);
  // Player-chosen bonus class skills (e.g. Student of War's Additional
  // Skill), already truncated to the character's current entitlement.
  for (const s of chosenBonusClassSkills(doc, refData)) classSkillSet.add(s);
  // Fixed class skills granted by a feat's own text ("Knowledge (nobility) is
  // always a class skill for you" — Noble Scion, Street Smarts, ...).
  for (const s of featGrantedClassSkills(doc, refData.feats)) classSkillSet.add(s);
  // Fixed class skills granted by a picked trait's own text ("Sense Motive
  // is always a class skill for you" — Suspicious, and the vendored-catalog
  // entries promoted in trait-effects-extracted.ts).
  for (const s of traitGrantedClassSkills(doc, refData)) classSkillSet.add(s);

  // Element/order/mystery-granted bonus class skills: fixed by the choice
  // itself (which mystery/order/element), not a separate player pick, so
  // each is wired directly here rather than through `chosenBonusClassSkills`'
  // budgeted-pick pathway. Gated on the granting class's level, same "never
  // apply to a stale field on the wrong class" posture as every other
  // build-choice loop in `collect.ts` (see the cookbook's oracle-curse
  // example).
  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleMystery) {
    for (const s of ORACLE_MYSTERIES[doc.build.oracleMystery]?.classSkills ?? []) {
      classSkillSet.add(s);
    }
  }
  const orderGrantingLevel =
    (doc.identity.classes.find((c) => c.tag === "cavalier")?.level ?? 0) +
    (doc.identity.classes.find((c) => c.tag === "samurai")?.level ?? 0);
  if (orderGrantingLevel > 0 && doc.build.cavalierOrder) {
    for (const s of orderByTag(doc.build.cavalierOrder)?.orderSkills ?? []) classSkillSet.add(s);
  }
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  if (kineticistLevel > 0) {
    const elementTags = [
      doc.build.kineticistElement,
      ...(doc.build.kineticistExpandedElements ?? []),
    ];
    for (const tag of elementTags) {
      if (!tag) continue;
      for (const s of KINETICIST_ELEMENTS[tag]?.classSkills ?? []) classSkillSet.add(s);
    }
  }

  // Effective armor check penalty (negative), reduced by armor-training acpA.
  const wornAcp = (doc.build.gear ?? []).reduce(
    (s, inst) => (inst.equipped && inst.armor ? s + armorPieceAcp(inst.armor) : s),
    0,
  );
  const acpReduction = forTarget(collected, "acpA").reduce((s, m) => s + Math.abs(m.value), 0);
  // Encumbrance (optional rule): a medium/heavy load imposes its own flat
  // armor check penalty. RAW (CRB p.171, Carrying Capacity): when wearing
  // armor, use the WORSE of armor ACP or load ACP for each category — the two
  // never stack additively. Mirrors the max-Dex worse-of just below.
  const loadAcp = encumbrance?.acp ?? 0;
  const effectiveAcp = Math.min(0, wornAcp + acpReduction, loadAcp);

  // Every skill.* modifier target, split into its "skill." suffix. Resolved
  // against the final id set below (a raw target with a dot, e.g.
  // "skill.crf.alchemy", already names one specific parameterized instance
  // regardless of whether that instance exists elsewhere on the doc).
  const skillTargets: { rest: string; m: TypedModifier }[] = [];
  for (const m of collected) {
    if (m.target.startsWith("skill.")) {
      skillTargets.push({ rest: m.target.slice("skill.".length), m });
    }
  }

  // Base id set: every static skill id, every ranked instance (including
  // parameterized ones like "crf.alchemy" from build.skillRanks), and any
  // parameterized instance named explicitly by a modifier target even if it
  // has no ranks yet.
  const idsSoFar = new Set<string>([
    ...SKILL_IDS,
    ...Object.keys(doc.build.skillRanks ?? {}),
    ...skillTargets.filter((t) => t.rest.includes(".")).map((t) => t.rest),
  ]);

  // Pre-group skill.* modifiers by base skill id (subskills route to the
  // parent). Three kinds of "rest": (1) a dotted rest names one specific
  // parameterized instance ("crf.alchemy") — targets only that id; (2) a
  // static compound-skill group alias (e.g. "knowledge" for Bardic
  // Knowledge) — fans out to its fixed member list (SKILL_GROUPS); (3) one
  // of the parameterized prefixes (crf/pro/prf) — fans out to the bare id
  // PLUS every "<prefix>.*" instance the character actually has (data-
  // dependent, so resolved against idsSoFar rather than a static table).
  const miscBySkill = new Map<string, TypedModifier[]>();
  for (const { rest, m } of skillTargets) {
    const targetIds: readonly string[] = rest.includes(".")
      ? [rest]
      : (SKILL_GROUPS[rest] ??
        (PARAMETERIZED_SKILL_PREFIXES.has(rest)
          ? [rest, ...[...idsSoFar].filter((id) => id.startsWith(`${rest}.`))]
          : [rest]));
    for (const id of targetIds) {
      const arr = miscBySkill.get(id);
      if (arr) arr.push(m);
      else miscBySkill.set(id, [m]);
    }
  }

  // Global skill-check modifiers (`skills` target, e.g. shaken/sickened) apply
  // to every skill in addition to any per-skill modifiers.
  const globalSkillMods = forTarget(collected, "skills");

  const ids = new Set<string>([...idsSoFar, ...miscBySkill.keys()]);

  const skills: Record<string, DerivedSkill> = {};
  for (const id of ids) {
    const baseId = skillBaseId(id);
    const ability = SKILL_ABILITY[baseId] ?? "int";
    const abilityModifier = abilities[ability].mod;
    const ranks = doc.build.skillRanks?.[id] ?? 0;
    const classSkill = classSkillSet.has(id) || classSkillSet.has(baseId);
    const classSkillBonus = classSkill && ranks >= 1 ? 3 : 0;
    const usesAcp = skillUsesAcp(id);
    const acp = usesAcp ? effectiveAcp : 0;
    const stack = resolveStack([...(miscBySkill.get(id) ?? []), ...globalSkillMods]);
    const total = ranks + abilityModifier + classSkillBonus + acp + stack.total;
    const trainedOnly = isTrainedOnly(id);
    const usable = ranks > 0 || !trainedOnly;
    // Load-tier ACP is already folded into `acp` above; this is a display-only
    // provenance chip alongside the misc-modifier breakdown, not a second
    // addend into `total`.
    const loadAcpComponent: ModifierComponent[] =
      usesAcp && loadAcp !== 0 && encumbrance
        ? [synthetic(loadTierLabel(encumbrance.tier), "penalty", loadAcp)]
        : [];
    skills[id] = {
      id,
      ability,
      ranks,
      abilityMod: abilityModifier,
      classSkillBonus,
      acp,
      miscMod: stack.total,
      total,
      classSkill,
      components: [...loadAcpComponent, ...toComponents(stack.modifiers)],
      trainedOnly,
      usable,
    };
  }
  return skills;
}

/* ------------------------------------------------------------ iteratives */

/**
 * Full-attack iterative sequence (PF1 CRB): an extra attack at BAB +6, +11,
 * and +16, each at a cumulative -5, capped at 4 attacks total.
 *
 * Returns `undefined` for a single attack (BAB < 6) so callers can omit the
 * field entirely rather than storing a length-1 array.
 *
 * Display-only and intentionally narrow: this does NOT account for
 * haste/speed extra attacks, two-weapon fighting, or flurry of blows — those
 * modify the iterative sequence beyond plain BAB and are out of scope here.
 */
export function iterativeSequence(bab: number, attackTotal: number): number[] | undefined {
  if (bab < 6) return undefined;
  const count = Math.min(4, 1 + Math.floor((bab - 1) / 5));
  return Array.from({ length: count }, (_, k) => attackTotal - 5 * k);
}

/* --------------------------------------------------------------- weapons */

/**
 * Every `<group>` key a weapon's `attack.weapon.<group>` /
 * `damage.weapon.<group>` bonuses should be gathered from: the weapon's
 * free-text, player-set `.group` tag (Weapon Focus/Specialization's
 * exact-match mechanism, unchanged — kept unnormalized for backward
 * compatibility with every `Change` already authored against it) UNIONED with
 * its vendored `.weaponGroups` semantic tags (Weapon Training and its
 * archetype reflavors), each normalized via `normalizeWeaponGroup` so an
 * authored target like `attack.weapon.blades-heavy` matches the vendored
 * `"bladesHeavy"` tag. Deduplicated so a weapon whose free-text tag happens to
 * coincide with one of its own semantic groups doesn't query the same target
 * twice (which would still resolve to the same single set of matching changes
 * either way — `forTarget` is not additive per call — but dedup keeps the
 * intent obvious). Hand-entered custom weapons have no `.weaponGroups` and
 * keep matching via `.group` alone.
 */
function weaponGroupKeys(w: Pick<WeaponInstance, "group" | "weaponGroups">): string[] {
  const keys = new Set<string>();
  if (w.group) keys.add(w.group);
  for (const g of w.weaponGroups ?? []) keys.add(normalizeWeaponGroup(g));
  return [...keys];
}

/**
 * Rogue (Unchained) Finesse Training: true when `w` is eligible for the
 * character's Dex-to-damage substitution — one of `build.
 * rogueFinesseWeapons`' picks that have actually been UNLOCKED by the
 * character's current `rogueUnchained` class level
 * (`ROGUE_FINESSE_TRAINING_LEVELS` — 3rd/11th/19th) matches this weapon.
 * Matching is a free-text, case-insensitive substring check against the
 * weapon's display `name` (so a "rapier" pick matches a `WeaponInstance` named
 * "Rapier +1") OR an exact match against its free-text `group` tag — the same
 * convention Weapon Focus/Specialization already use via
 * `WeaponInstance.group` (not the semantic `WEAPON_GROUPS` vocabulary — RAW
 * scopes this ability to one weapon TYPE, not a whole group). Never blocks
 * selection; a character with no `rogueUnchained` levels or no picks simply
 * never matches.
 */
function rogueFinesseTrainingMatches(doc: CharacterDoc, w: WeaponInstance): boolean {
  const rogueLevel = doc.identity.classes.find((c) => c.tag === "rogueUnchained")?.level ?? 0;
  if (rogueLevel <= 0) return false;
  const unlockedTiers = ROGUE_FINESSE_TRAINING_LEVELS.filter((lvl) => rogueLevel >= lvl).length;
  const picks = (doc.build.rogueFinesseWeapons ?? []).slice(0, unlockedTiers);
  if (picks.length === 0) return false;
  const wname = w.name.trim().toLowerCase();
  const wgroup = (w.group ?? "").trim().toLowerCase();
  return picks.some((p) => {
    const needle = p?.trim().toLowerCase();
    if (!needle) return false;
    return wname.includes(needle) || wgroup === needle;
  });
}

/**
 * Non-proficient-ARMOR attack penalty (PF1 CRB "Armor Proficiency"): a
 * character wearing armor or wielding a shield outside their proficiency
 * suffers that piece's armor check penalty on ATTACK rolls too, in addition to
 * the Str/Dex skill checks it already always applies to (unconditionally,
 * proficient or not — see `computeSkills`'s `wornAcp`; this is deliberately
 * NOT threaded through there, to avoid double-applying). One component per
 * non-proficient equipped piece, so multiple non-proficient items (a
 * non-proficient suit AND a non-proficient shield) stack, matching how their
 * ACP already stacks going into `wornAcp`.
 */
function nonProficientArmorAttackComponents(
  doc: CharacterDoc,
  proficiencies: DerivedProficiencies,
): ModifierComponent[] {
  const components: ModifierComponent[] = [];
  for (const inst of doc.build.gear ?? []) {
    const a = inst.armor;
    if (!inst.equipped || !a) continue;
    const acp = armorPieceAcp(a);
    if (!acp) continue;
    const proficient =
      a.slot === "armor"
        ? isArmorTypeProficient(proficiencies, a.type)
        : a.shieldTier
          ? isShieldTierProficient(proficiencies, a.shieldTier)
          : true;
    if (proficient) continue;
    const label = inst.name ?? (a.slot === "armor" ? "Armor" : "Shield");
    components.push(synthetic(`${label} (non-proficient)`, "penalty", acp));
  }
  return components;
}

/**
 * Tower shield's separate −2 penalty on attack rolls (CRB p.153, Tower
 * Shield: "you take a –2 penalty on attack rolls because it is so unwieldy")
 * — independent of proficiency (applies whether or not the wielder is
 * proficient with tower shields) and independent of the shield's armor check
 * penalty already folded into `nonProficientArmorAttackComponents`/
 * `wornAcp`'s ACP handling, so it's a separate flat component rather than
 * routed through either of those. One flat -2 regardless of how many tower
 * shields are (implausibly) equipped at once — PF1 has no rule for stacking
 * a second one.
 */
function towerShieldAttackComponents(doc: CharacterDoc): ModifierComponent[] {
  const hasTowerShield = (doc.build.gear ?? []).some(
    (inst) => inst.equipped && inst.armor?.shieldTier === "tower",
  );
  return hasTowerShield ? [synthetic("Tower shield", "penalty", -2)] : [];
}

/**
 * Builds a ResolvedWeaponAttack for each entry in build.weapons.
 *
 * Attack formula (PF1 CRB):
 *   attack = BAB + ability mod (STR or DEX per attackAbility) + size modifier
 *            + enhancement (or +1 masterwork if enhancement is 0)
 *            + general "attack" / "mattack" / "rattack" changes, plus
 *              "tattack" (thrown weapon attack rolls — see targets.ts; NOT
 *              touch attacks, which PF1 has no separate change target for)
 *              when this instance is both category "ranged" and tagged
 *              "thrown" in its weaponGroups (see isThrownAttack below)
 *            + per-group changes (e.g. `attack.weapon.longsword` from Weapon Focus,
 *              or `attack.weapon.bows` from a semantic weapon-group bonus)
 *            + -4 if non-proficient with the weapon, + non-proficient worn
 *              armor/shield's ACP (see {@link
 *              nonProficientArmorAttackComponents}) + tower shield's flat -2
 *              (CRB p.153, see {@link towerShieldAttackComponents})
 *
 * Damage bonus (numeric; dice displayed separately):
 *   damage = ability damage [see below]
 *            + enhancement
 *            + any "damage" target changes from the collected modifier set,
 *              plus "twdamage" (thrown weapon damage) under the same
 *              ranged-and-thrown condition as "tattack" above
 *            + per-group changes (e.g. `damage.weapon.longsword` from Weapon Specialization,
 *              or `damage.weapon.bows` from a semantic weapon-group bonus)
 *
 * Per-weapon feat bonuses (Weapon Focus, Weapon Specialization) and semantic
 * weapon-group bonuses (Weapon Training) are both routed via group-specific
 * targets (`attack.weapon.<group>` / `damage.weapon.<group>`) so the regular
 * collect → stack pipeline handles them without special-casing here — see
 * {@link weaponGroupKeys} for how a weapon's matching `<group>` keys are
 * gathered.
 *
 * Ability damage — melee vs. ranged read very differently:
 * - Melee: floor(ability mod × damageMultiplier), STR by default. An explicit
 *   player-set "dex"/"none" override is allowed (e.g. Slashing Grace); when
 *   the stored value is unset or the default "str", Rogue (Unchained)'s
 *   Finesse Training substitutes Dex automatically for a matching weapon —
 *   see {@link rogueFinesseTrainingMatches} — so the player doesn't have to
 *   flip the per-weapon field by hand for the class feature that's supposed
 *   to grant it for free.
 * - Ranged: the default/unset "str" contributes NOTHING (no composite-bow
 *   rating modeled — a plain bow must not gain Str damage). Dex damage only
 *   applies via an explicit player-set "dex" override, or automatically for a
 *   firearm covered by the Gun Training family — see {@link
 *   gunTrainingMatches} — and is always ×1 (never damageMultiplier-scaled;
 *   Gun Training's own text carries no two-handed-weapon scaling), including
 *   a negative Dex modifier applying in full.
 *
 * `baseSize`/`effectiveSize` (the race size the weapon's `damageDice` was
 * written for, and the wielder's current effective size) rewrite the
 * DISPLAYED `damageDice` string when they differ — see
 * {@link scaleWeaponDamageDice} — since the numeric damage bonus above never
 * carries a dice term to begin with.
 */
function computeWeaponAttacks(
  doc: CharacterDoc,
  refData: RefData,
  bab: number,
  sizeAttackMod: number,
  collected: CollectedModifier[],
  proficiencies: DerivedProficiencies,
  flatAttackPenaltyComponents: ModifierComponent[],
  abilityMods: Readonly<Record<AbilityId, number>>,
  substitutions: readonly ActiveAbilitySubstitution[],
  baseSize: SizeId,
  effectiveSize: SizeId,
): ResolvedWeaponAttack[] {
  const flatAttackPenalty = flatAttackPenaltyComponents.reduce((s, c) => s + c.value, 0);
  const weapons = doc.build.weapons ?? [];
  return weapons.map((w) => {
    const category = w.category ?? "melee";
    const enh = w.enhancement ?? 0;
    // Masterwork's +1 attack bonus is implied (and superseded) by any magic
    // enhancement bonus, so it only applies to a non-magical (+0) weapon.
    const masterworkBonus = enh === 0 && w.masterwork ? 1 : 0;
    // An ability substitution applies on top of whichever ability the weapon
    // is already using, so a Str weapon and a Weapon Finesse'd Dex weapon each
    // get the substitution written for their own base ability, and neither
    // gets one written for the other's.
    const attackAbility = resolveSubstitution(
      category === "melee" ? "attack.melee" : "attack.ranged",
      w.attackAbility,
      abilityMods,
      substitutions,
    );
    const attackAbilityMod = attackAbility.mod;
    const attackAbilityLabel = abilityLabelFor(attackAbility);
    const groupKeys = weaponGroupKeys(w);
    // Whether THIS instance represents a thrown attack — the app models one
    // weapon instance with a single fixed category, so "thrown" only applies
    // when the player has this instance set up as a ranged attack AND the
    // weapon's vendored group tags include "thrown" (Foundry's target for
    // thrown weapon attack rolls, `tattack` — see targets.ts). A dagger left
    // at its default "melee" category is being swung, not thrown, so it
    // deliberately does NOT pick up a thrown-only bonus; a player who wants
    // to model throwing it can add a second instance with category "ranged".
    const isThrownAttack = category === "ranged" && groupKeys.includes("thrown");
    const weaponProficient = isWeaponProficient(proficiencies, w);
    const weaponProfPenalty = weaponProficient ? 0 : -4;
    const weaponProfComponents: ModifierComponent[] = weaponProficient
      ? []
      : [synthetic(`${w.name} (non-proficient)`, "penalty", -4)];

    // General attack changes + per-group feat bonuses (e.g. Weapon Focus via
    // "attack.weapon.<group>", or a semantic weapon-group bonus via "attack.weapon.bows").
    // "tattack" (thrown weapon attack rolls, e.g. Accurate Stance) only joins
    // the ranged line for a weapon actually tagged "thrown" — see isThrownAttack.
    const weaponAttackStack = resolveStack([
      ...forTarget(collected, "attack"),
      ...(category === "melee"
        ? forTarget(collected, "mattack")
        : [
            ...forTarget(collected, "rattack"),
            ...(isThrownAttack ? forTarget(collected, "tattack") : []),
          ]),
      ...groupKeys.flatMap((g) => forTarget(collected, `attack.weapon.${g}`)),
    ]);
    const attackTotal =
      bab +
      attackAbilityMod +
      sizeAttackMod +
      enh +
      masterworkBonus +
      weaponAttackStack.total +
      weaponProfPenalty +
      flatAttackPenalty;
    const attackComponents: ModifierComponent[] = [
      synthetic("BAB", "base", bab),
      synthetic(attackAbilityLabel, "ability", attackAbilityMod),
      ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
      ...(enh !== 0 ? [synthetic(`${w.name} (enhancement)`, "enh", enh)] : []),
      ...(masterworkBonus !== 0
        ? [synthetic(`${w.name} (masterwork)`, "enh", masterworkBonus)]
        : []),
      ...toComponents(weaponAttackStack.modifiers),
      ...weaponProfComponents,
      ...flatAttackPenaltyComponents,
    ];

    // Ability-to-damage: STR or DEX. Melee (unchanged): scaled by
    // damageMultiplier; an unset/default "str" value is auto-promoted to
    // "dex" for a weapon matching Rogue (Unchained)'s Finesse Training.
    // Ranged: the default/unset "str" contributes NOTHING (no composite-bow
    // rating modeled here — a plain bow must not gain Str damage); only an
    // explicit player-set "dex" (the escape hatch for an unmodeled
    // Dex-to-damage source) or a Gun Training family match
    // (`gunTrainingMatches`, auto — same "str doesn't block the auto-match"
    // convention as autoFinesseDex) ever apply. Either way an explicit
    // "dex"/"none" always wins over an auto-match.
    const autoFinesseDex =
      (w.damageAbility === undefined || w.damageAbility === "str") &&
      category === "melee" &&
      rogueFinesseTrainingMatches(doc, w);
    const autoGunTrainingDex =
      (w.damageAbility === undefined || w.damageAbility === "str") &&
      category === "ranged" &&
      gunTrainingMatches(doc, w);
    const damageAbility: "str" | "dex" | "none" =
      category === "melee"
        ? autoFinesseDex
          ? "dex"
          : (w.damageAbility ?? "str")
        : autoGunTrainingDex || w.damageAbility === "dex"
          ? "dex"
          : "none";
    // "none" carries no ability at all, so there is nothing to substitute for.
    // Melee's Str/Dex term can be swapped by a registered ability
    // substitution (Guided, Zen Archer's Perfect Strike, ...); no ranged
    // damage substitution is registered (`ability-substitution.ts` has no
    // "damage.ranged" slot — nothing published needs one), so the ranged Dex
    // case reads the modifier directly.
    const resolvedDamageAbility: ResolvedAbility | undefined =
      damageAbility === "none"
        ? undefined
        : category === "melee"
          ? resolveSubstitution("damage.melee", damageAbility, abilityMods, substitutions)
          : { ability: "dex", mod: abilityMods.dex };
    const damageAbilityMod = resolvedDamageAbility?.mod ?? 0;
    const mult = w.damageMultiplier ?? 1;
    const appliesAbilityDamage = damageAbility === "str" || damageAbility === "dex";
    // The multiplier (1.5× two-handed, 0.5× off-hand) scales a melee Str/Dex
    // BONUS only — a penalty is never multiplied up or reduced (PF1 RAW: the
    // full penalty always applies). Ranged ability damage is always ×1 (Gun
    // Training and its archetype variants read "a bonus... equal to her
    // Dexterity modifier", with no two-handed-weapon scaling), including a
    // negative Dex modifier applying in full.
    const abilityDamage = !appliesAbilityDamage
      ? 0
      : category === "ranged"
        ? damageAbilityMod
        : damageAbilityMod >= 0
          ? Math.floor(damageAbilityMod * mult)
          : damageAbilityMod;

    // General "damage" target changes + per-group feat bonuses (e.g. Weapon
    // Specialization via "damage.weapon.<group>", or a semantic weapon-group
    // bonus via "damage.weapon.bows"). "wdamage" (all weapon damage),
    // "mwdamage" (melee), "rwdamage" (ranged) come from vendored buffs/
    // conditions (Divine Favor, Rage, sickened, etc.). "twdamage" (thrown)
    // joins the ranged line only for a weapon actually tagged "thrown" (see
    // isThrownAttack above) rather than being approximated onto every ranged
    // line — a longbow no longer picks up a thrown-only damage bonus.
    const weaponDamageStack = resolveStack([
      ...forTarget(collected, "damage"),
      ...forTarget(collected, "wdamage"),
      ...(category === "melee"
        ? forTarget(collected, "mwdamage")
        : [
            ...forTarget(collected, "rwdamage"),
            ...(isThrownAttack ? forTarget(collected, "twdamage") : []),
          ]),
      ...groupKeys.flatMap((g) => forTarget(collected, `damage.weapon.${g}`)),
    ]);
    const damageTotal = abilityDamage + enh + weaponDamageStack.total;

    const damageComponents: ModifierComponent[] = [];
    if (appliesAbilityDamage) {
      // The ×multiplier annotation only describes what actually happened —
      // a penalty (see abilityDamage above) isn't scaled, so it gets no label,
      // and ranged ability damage is never scaled at all (see abilityDamage).
      const multLabel =
        category === "melee" && mult !== 1 && damageAbilityMod >= 0 ? ` ×${mult}` : "";
      const abilityLabel = damageAbility === "dex" ? "Dexterity" : "Strength";
      damageComponents.push(synthetic(`${abilityLabel}${multLabel}`, "ability", abilityDamage));
    }
    if (enh !== 0) damageComponents.push(synthetic(`${w.name} (enhancement)`, "enh", enh));
    damageComponents.push(...toComponents(weaponDamageStack.modifiers));

    // Critical hit string: "19–20/×2" or "×2".
    const critRange = w.critRange ?? 20;
    const critMult = w.critMult ?? 2;
    const crit = critRange < 20 ? `${critRange}–20/×${critMult}` : `×${critMult}`;

    const iteratives = iterativeSequence(bab, attackTotal);
    const result: ResolvedWeaponAttack = {
      name: w.name,
      category,
      attack: {
        total: attackTotal,
        components: attackComponents,
        ...(iteratives ? { iteratives } : {}),
      },
      damageBonus: { total: damageTotal, components: damageComponents },
      crit,
    };
    // What this weapon overcomes for DR purposes — material, plus, alignment
    // abilities, and a monk's or brawler's unarmed-strike class feature. Left
    // off entirely for the plain steel weapon that bypasses nothing.
    const drBypass = weaponDrBypasses(doc, refData, w);
    if (drBypass.length > 0) result.drBypass = drBypass;
    if (appliesAbilityDamage) {
      result.damageAbilityMod = damageAbilityMod;
      // Ranged ability damage is never damageMultiplier-scaled (see
      // abilityDamage above) — reporting `mult` there would misdescribe what
      // was actually applied, so ranged always reports 1.
      result.damageMultiplier = category === "ranged" ? 1 : mult;
    }
    // Display-only dice string, size-scaled when the wielder's effective size
    // (Enlarge/Reduce Person, an active polymorph form) differs from the size
    // `w.damageDice` was written for — see `scaleWeaponDamageDice`. The
    // numeric `damageBonus.total` above never includes a dice term (formula.ts
    // can't evaluate one — see the engine cookbook §2.2), so this scaling is
    // purely a display correction.
    if (w.damageDice !== undefined) {
      result.damageDice = scaleWeaponDamageDice(w.damageDice, baseSize, effectiveSize);
    }
    // Range increment (ranged only) and firearm-specific display data
    // (Ultimate Combat) — see WeaponInstance's rangeIncrement/misfire/
    // capacity/firearmEra doc comments. "Firearm" is detected rather than
    // gated on category alone, since it's the presence of these fields (or a
    // "firearms"-tagged group) that actually distinguishes a firearm from a
    // bow or crossbow, both also ranged.
    if (category === "ranged" && w.rangeIncrement !== undefined) {
      result.rangeIncrement = w.rangeIncrement;
    }
    const isFirearm =
      w.misfire !== undefined ||
      w.firearmEra !== undefined ||
      groupKeys.some((g) => g === "firearms" || g.startsWith("firearms-"));
    if (isFirearm) {
      const touchRangeFt =
        w.rangeIncrement !== undefined && w.firearmEra !== undefined
          ? w.rangeIncrement * (w.firearmEra === "early" ? 1 : 5)
          : undefined;
      result.firearm = {
        ...(w.misfire !== undefined ? { misfire: w.misfire } : {}),
        ...(w.capacity !== undefined ? { capacity: w.capacity } : {}),
        ...(touchRangeFt !== undefined ? { touchRangeFt } : {}),
      };
    }
    return result;
  });
}

/* ----------------------------------------------------------------- compute */

export function compute(doc: CharacterDoc, refData: RefData): DerivedSheet {
  const level = totalLevel(doc);
  const race = refData.races[doc.identity.race];
  // Pre-buff base speeds, threaded into rollData so set-formulas (Slow,
  // Debilitating Injury, ...) that reference `@attributes.speed.<mode>.total`
  // evaluate against real values instead of the missing-path default of 0.
  // Race base only (not race + passive bonuses) — see buildRollData's doc comment.
  const baseSpeeds = race?.speeds ?? { land: 30 };

  // BAB — computed from class levels alone (no feat/buff in this slice
  // modifies it), so it's available before roll data is built. Vendored
  // formulas (e.g. Monk's Maneuver Training) reference `@attributes.bab.total`.
  const fractionalBonuses = doc.build.settings?.fractionalBonuses ?? false;
  const babTiers: { tier: BabTier; level: number }[] = [];
  for (const cls of doc.identity.classes) {
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!def) continue;
    // Vigilante's Avenger specialization (Ultimate Intrigue, the "Vigilante
    // Specialization" class feature) reads "gains a base attack bonus equal to
    // his vigilante level instead of using those listed on Table 1-1" — a
    // full-BAB override for vigilante levels specifically, not a global tier
    // change (a multiclassed avenger's OTHER classes still use their own
    // listed tier). `def.bab` is vigilante's normal "med" tier from the
    // vendored data; swapped for "high" only when this class entry IS
    // vigilante levels AND the build chose Avenger.
    const tier =
      cls.tag === "vigilante" && doc.build.vigilanteSpecialization === "avenger" ? "high" : def.bab;
    babTiers.push({ tier, level: cls.level });
  }
  // Under fractional base bonuses (Pathfinder Unchained, opt-in per character)
  // the per-class fractions are summed and rounded down once instead of each
  // class rounding down on its own.
  const bab = fractionalBonuses
    ? fractionalBab(babTiers)
    : babTiers.reduce((sum, t) => sum + babForLevels(t.tier, t.level), 0);

  const baseSize: SizeId = race?.size ?? "med";

  // Bootstrap: resolve ability-targeting changes against base scores, then build
  // the final roll data and re-collect everything against the final abilities.
  const bootRollData = buildRollData(doc, refData, undefined, baseSpeeds, bab);
  const bootCollected = collectModifiers(doc, refData, bootRollData);
  const bootAbilities = computeAbilities(doc, bootCollected);

  // Effective size category from a relative "size"-target Change (Enlarge/
  // Reduce Person, ...), or an active polymorph form's absolute override (see
  // the final `size` computation below for the full rationale) — resolved
  // once here from the BOOT pass so encumbrance (next) can size its carrying-
  // capacity multiplier correctly. `collect.ts`'s size-shifting changes are
  // flat/unconditional formulas in the vendored slice (never ability- or
  // encumbrance-level-dependent), so the boot-pass value matches the final
  // one computed below in every case this app's data actually exercises.
  const bootSizeShift = Math.trunc(
    forTarget(bootCollected, "size").reduce((s, m) => s + m.value, 0),
  );
  const bootSize: SizeId = doc.live.activeForm
    ? doc.live.activeForm.size
    : shiftSize(baseSize, bootSizeShift);

  // Encumbrance (optional rule — default off). Computed from the BOOT-pass
  // Strength (already reflects racial/item/buff ability changes, via the same
  // collected-modifier pass as everything else) so the resulting
  // `@attributes.encumbrance.level` can feed the FINAL roll data below, which
  // is what vendored formulas (e.g. monk's Wis-to-AC gate) actually evaluate
  // against. Uses `bootSize` (see above) rather than `baseSize` so a Large
  // Enlarge Person shift actually reaches the carrying-capacity size
  // multiplier — `carryAdjustments` (Ant Haul, Enlarge/Reduce's own
  // carryStr/carryMult) folds in on top from the same boot-pass collected
  // modifiers, for the same circularity reason.
  const encumbranceEnabled = doc.build.settings?.encumbranceEnabled ?? false;
  const encumbrance = encumbranceEnabled
    ? computeEncumbrance(
        doc,
        refData,
        bootAbilities.str.total,
        bootSize,
        carryAdjustments(bootCollected),
      )
    : undefined;
  const encumbranceLevel = encumbrance ? encumbranceLevelFor(encumbrance.tier) : 0;

  const rollData = buildRollData(doc, refData, bootAbilities, baseSpeeds, bab, encumbranceLevel);
  const collected = collectModifiers(doc, refData, rollData);
  const abilities = computeAbilities(doc, collected);

  // Enlarge/Reduce Person and similar effects shift the character along the
  // size ladder; round toward zero (a +1.5 or -0.5 step isn't a thing PF1
  // formulas produce, but be defensive) and clamp at the ladder's ends.
  const sizeShift = Math.trunc(forTarget(collected, "size").reduce((s, m) => s + m.value, 0));
  let size: SizeId = shiftSize(baseSize, sizeShift);
  // A polymorph-family transformation (`live.activeForm`) replaces the size
  // ladder's result outright: the form's size is an unconditional, absolute
  // replacement per PF1 RAW, not a relative shift like Enlarge Person's own
  // "size" change above. Simultaneously combining a size-shifting spell with a
  // polymorph effect is a rare table edge case this app doesn't try to
  // adjudicate — the form's size simply wins while active. Applied even when
  // the form's tier/creatureType/size/element combination itself doesn't
  // resolve to a known `PolymorphFormOption` (`collect.ts` contributes no
  // ability/NA changes in that case, but the player's chosen size is still
  // meaningful on its own).
  if (doc.live.activeForm) size = doc.live.activeForm.size;
  const sizeAttackMod = SIZE_AC_MOD[size];

  const strMod = abilities.str.mod;

  // Ability substitutions ("use Int in place of Dex for AC") — see
  // `ability-substitution.ts`. Resolved once here and threaded into each term
  // that can be substituted; a term with no matching substitution keeps the
  // ability the rules give it, so this is a no-op for the overwhelming
  // majority of characters.
  const abilityMods = Object.fromEntries(
    ABILITY_IDS.map((id) => [id, abilities[id].mod]),
  ) as Record<AbilityId, number>;
  const substitutions = collectAbilitySubstitutions(doc, refData, rollData);
  const meleeAttackAbility = resolveSubstitution("attack.melee", "str", abilityMods, substitutions);
  const rangedAttackAbility = resolveSubstitution(
    "attack.ranged",
    "dex",
    abilityMods,
    substitutions,
  );
  const initAbility = resolveSubstitution("init", "dex", abilityMods, substitutions);
  // Reflex's ability term is substitutable (oracle Sidestep Secret/Prophetic
  // Armor: Cha instead of Dex) — Fortitude and Will have no registered
  // substitution today, so they stay plain ability modifiers.
  const refAbility = resolveSubstitution("save.ref", "dex", abilityMods, substitutions);

  // Saves
  const saves = {
    fort: computeSave(
      "fort",
      doc.identity.classes,
      refData,
      { ability: "con", mod: abilities.con.mod },
      collected,
      fractionalBonuses,
    ),
    ref: computeSave(
      "ref",
      doc.identity.classes,
      refData,
      refAbility,
      collected,
      fractionalBonuses,
    ),
    will: computeSave(
      "will",
      doc.identity.classes,
      refData,
      { ability: "wis", mod: abilities.wis.mod },
      collected,
      fractionalBonuses,
    ),
  };

  // Proficiency — class/feat/race grants, and the non-proficient worn
  // armor/shield attack penalty derived from them. Weapon non-proficiency (-4)
  // is necessarily per-weapon (see computeWeaponAttacks below); the
  // armor/shield ACP-on-attack penalty isn't weapon-specific, so it applies
  // here too, on the base melee/ranged lines — same for the tower shield's
  // flat -2 (CRB p.153, see {@link towerShieldAttackComponents}), which also
  // isn't weapon-specific.
  const proficiencies = deriveProficiencies(doc, refData);
  const flatAttackPenaltyComponents = [
    ...nonProficientArmorAttackComponents(doc, proficiencies),
    ...towerShieldAttackComponents(doc),
  ];
  const flatAttackPenalty = flatAttackPenaltyComponents.reduce((s, c) => s + c.value, 0);

  // Attack. `attack` applies to both lines; `mattack`/`rattack` are melee/ranged
  // specific (e.g. prone's -4 is melee only).
  const meleeStack = resolveStack([
    ...forTarget(collected, "attack"),
    ...forTarget(collected, "mattack"),
  ]);
  const rangedStack = resolveStack([
    ...forTarget(collected, "attack"),
    ...forTarget(collected, "rattack"),
  ]);
  const meleeComponents: ModifierComponent[] = [
    synthetic("BAB", "base", bab),
    synthetic(abilityLabelFor(meleeAttackAbility), "ability", meleeAttackAbility.mod),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(meleeStack.modifiers),
    ...flatAttackPenaltyComponents,
  ];
  const rangedComponents: ModifierComponent[] = [
    synthetic("BAB", "base", bab),
    synthetic(abilityLabelFor(rangedAttackAbility), "ability", rangedAttackAbility.mod),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(rangedStack.modifiers),
    ...flatAttackPenaltyComponents,
  ];
  const meleeTotal =
    bab + meleeAttackAbility.mod + sizeAttackMod + meleeStack.total + flatAttackPenalty;
  const rangedTotal =
    bab + rangedAttackAbility.mod + sizeAttackMod + rangedStack.total + flatAttackPenalty;
  const meleeIteratives = iterativeSequence(bab, meleeTotal);
  const rangedIteratives = iterativeSequence(bab, rangedTotal);
  const attack = {
    melee: {
      total: meleeTotal,
      components: meleeComponents,
      ...(meleeIteratives ? { iteratives: meleeIteratives } : {}),
    },
    ranged: {
      total: rangedTotal,
      components: rangedComponents,
      ...(rangedIteratives ? { iteratives: rangedIteratives } : {}),
    },
  };

  // AC. The Dexterity line is substitutable via the "ac" slot; CMD's own Dex
  // term (below, the separate "cmd" slot) does NOT automatically follow it —
  // Mind Over Metal reads "for determining her Armor Class" only, so an
  // "ac"-only substitution leaves CMD alone. A substitution written for both
  // (the oracle's Nature's Whispers: "to your Armor Class and CMD") is
  // registered on both slots instead, and resolves independently below. (CMB's
  // own ability term has its own registered substitution — Agile Maneuvers —
  // unrelated to either of these.)
  const acAbility = resolveSubstitution("ac", "dex", abilityMods, substitutions);
  const ac = computeAc(doc, size, acAbility, collected, encumbrance);

  // CMB / CMD
  const sizeSpecial = specialSizeMod(size);
  // A maneuver-scoped modifier (Change.maneuverCategories — "+2 on attempts
  // to trip") is held out of the headline stack, same as a save-category
  // scope is held out of a save's headline total — applying it unconditionally
  // would inflate every other maneuver too.
  const cmbAllMods = forTarget(collected, "cmb");
  const cmbUnconditional = cmbAllMods.filter((m) => (m.maneuverCategories?.length ?? 0) === 0);
  const cmbScoped = cmbAllMods.filter((m) => (m.maneuverCategories?.length ?? 0) > 0);
  const cmbStack = resolveStack(cmbUnconditional);
  // Tiny or smaller creatures use Dex in place of Str for CMB (CRB p.199);
  // Agile Maneuvers (APG p.150, "you can use your Dexterity modifier instead
  // of your Strength modifier when calculating your Combat Maneuver Bonus")
  // extends the same swap to any size. Both are ability SUBSTITUTIONS (not
  // additive bonuses), so both route through `resolveSubstitution` — the size
  // rule sets `cmbBaseAbility` first, then the feat (if present) competes
  // against whichever ability that leaves in place, per
  // `resolveSubstitution`'s highest-wins convention (see `ability-
  // substitution.ts`'s doc comment). For a Tiny-or-smaller character (already
  // on Dex) Agile Maneuvers is simply a no-op, matching RAW — there's nothing
  // left to substitute. CMD's own Str term is unaffected by either — neither
  // Agile Maneuvers nor the size rule targets the "cmd" slot, only "cmb".
  const cmbBaseAbility = SIZE_LADDER.indexOf(size) <= SIZE_LADDER.indexOf("tiny") ? "dex" : "str";
  const cmbAbility = resolveSubstitution("cmb", cmbBaseAbility, abilityMods, substitutions);
  const cmbAbilityMod = cmbAbility.mod;
  const cmb = bab + cmbAbilityMod + sizeSpecial + cmbStack.total;
  const cmbConditionals = maneuverConditionalTotals(
    bab + cmbAbilityMod + sizeSpecial,
    cmbUnconditional,
    cmbScoped,
  );

  // CMD = 10 + BAB + Str + Dex + special size mod, auto-including any of the
  // eight RAW-named AC bonus types (CMD_AC_TYPES above), any "ac" PENALTY
  // regardless of type ("any penalties to a creature's AC also apply to its
  // CMD" — CRB p.199), plus whatever carries an explicit "cmd"-target change.
  // Read from the same `collected` "ac" modifiers computeAc reads (armor/
  // shield/natural bonuses live under the separate "aac"/"sac"/"nac" targets,
  // so filtering to bare "ac" already excludes them without a category check).
  //
  // Some vendored sources (Iron Mask, the Deflection Aura buff, monk's
  // Wis-to-AC class feature) carry BOTH a generic "ac" change and their own
  // explicit "cmd" change with an identical formula. Auto-deriving both would
  // double-count, so a source with an explicit "cmd" change is excluded from
  // the auto-derivation entirely (the explicit change wins for that source —
  // dedup by sourceId/source, matching the provenance key `collect.ts`
  // already stamps on every modifier). The two pools are then stacked
  // together in one `resolveStack` pass, so cross-pool same-type competition
  // (e.g. an explicit cmd deflection bonus vs. a separate deflection ring)
  // still resolves to the highest per type, per RAW.
  //
  // Note: neither `cmb` nor `cmd` carries a components/provenance array on
  // DerivedSheet (unlike `ac.components`), so a deduped auto-derivation has
  // nothing to mark `applied: false` on — it's simply absent from the sum.
  const explicitCmdMods = forTarget(collected, "cmd");
  const explicitCmdSourceIds = new Set(explicitCmdMods.map((m) => m.sourceId ?? m.source));
  // The auto-derived-from-AC pool never carries a maneuver scope — only an
  // explicit "cmd"-target Change can name one — but an explicit change CAN,
  // so it's split the same way `cmbAllMods` is above before either stack
  // is built.
  const explicitCmdUnconditional = explicitCmdMods.filter(
    (m) => (m.maneuverCategories?.length ?? 0) === 0,
  );
  const explicitCmdScoped = explicitCmdMods.filter((m) => (m.maneuverCategories?.length ?? 0) > 0);
  // An AC-category-scoped modifier (Change.acCategories) is conditional and
  // held out of headline AC, so it must not leak into headline CMD either —
  // and it earns no CMD conditional line (AC categories describe attacks,
  // not maneuvers; only Change.maneuverCategories feeds cmdConditionals).
  const autoCmdFromAc = forTarget(collected, "ac").filter(
    (m) =>
      (m.acCategories?.length ?? 0) === 0 &&
      (m.value < 0 || CMD_AC_TYPES.has(m.type.toLowerCase())) &&
      !explicitCmdSourceIds.has(m.sourceId ?? m.source),
  );
  const cmdUnconditionalMods = [...autoCmdFromAc, ...explicitCmdUnconditional];
  const cmdStack = resolveStack(cmdUnconditionalMods);
  // CMD's Dex term is substitutable via the "cmd" slot (see the "AC" comment
  // above) — unlike "ac", nothing sets a non-Dex base here, since CMD has no
  // size-based substitution equivalent to CMB's Tiny-or-smaller rule.
  const cmdDexAbility = resolveSubstitution("cmd", "dex", abilityMods, substitutions);
  const cmd = 10 + bab + strMod + cmdDexAbility.mod + sizeSpecial + cmdStack.total;
  const cmdConditionals = maneuverConditionalTotals(
    10 + bab + strMod + cmdDexAbility.mod + sizeSpecial,
    cmdUnconditionalMods,
    explicitCmdScoped,
  );

  // Flat-footed CMD (CRB p.199, same "Flat-Footed" sidebar that defines
  // flat-footed AC): loses the Dexterity bonus and any dodge bonus feeding
  // `cmd` above, but a Dex/dodge PENALTY still counts (penalties always
  // apply) — mirrors `computeAc`'s `flatFooted` derivation exactly. CMD has
  // no `components` array to filter post hoc (see the note above), so the
  // dodge exclusion happens on the input modifier list instead of on stacked
  // output. Uses `cmdDexAbility.mod` rather than raw Dex for the same reason
  // `computeAc`'s flat-footed line does — a substituted ability's penalty
  // still applies even when its bonus doesn't (the oracle's Nature's
  // Whispers spells this out for AC: "any condition that would cause you to
  // lose your Dexterity modifier... instead causes you to lose your Charisma
  // modifier"; CMD follows the same logic since it shares the same Dex term).
  const flatFootedDexMod = Math.min(cmdDexAbility.mod, 0);
  const flatFootedCmdMods = cmdUnconditionalMods.filter(
    (m) => m.type.toLowerCase() !== "dodge" || m.value < 0,
  );
  const flatFootedCmdStack = resolveStack(flatFootedCmdMods);
  const cmdFlatFooted =
    10 + bab + strMod + flatFootedDexMod + sizeSpecial + flatFootedCmdStack.total;

  // Initiative
  const initStack = resolveStack(forTarget(collected, "init"));
  const initiative: ResolvedStat = {
    total: initAbility.mod + initStack.total,
    components: [
      synthetic(abilityLabelFor(initAbility), "ability", initAbility.mod),
      ...toComponents(initStack.modifiers),
    ],
  };

  // HP
  const hp = computeHp(doc, refData, abilities.con.mod, collected);

  // Speeds — start from race base, then apply per-mode targets.
  // Each mode "foo" listens to "fooSpeed" (e.g. fly → "flySpeed") so feat/feature
  // bonuses can slot in via the same evalChange path used for other stats.
  const speeds: Record<string, number> = { ...baseSpeeds };
  applySpeedTarget(speeds, collected, "land", "landSpeed");
  applySpeedTarget(speeds, collected, "fly", "flySpeed");
  applySpeedTarget(speeds, collected, "swim", "swimSpeed");
  applySpeedTarget(speeds, collected, "climb", "climbSpeed");
  applySpeedTarget(speeds, collected, "burrow", "burrowSpeed");
  // Encumbrance (optional rule) and worn medium/heavy ARMOR (always-on core
  // rule — unlike encumbrance, not settings-gated) both reduce land speed per
  // the RAW "Table: Speed" mapping. The two don't stack: PF1 RAW reduces speed
  // to the SAME tabled value regardless of which condition triggers it, so
  // this is a single reduction gated by "either applies," not two sequential
  // ones (chaining the table twice would over-reduce, e.g. 30 -> 20 -> 15).
  // Takes the lower of the tabled value and whatever the above targets already
  // produced (e.g. a "set" effect like Slow) — RAW load/armor speed penalties
  // apply only to land speed, not fly/swim/etc.
  //
  // Slow and Steady (d20pfsrd core Dwarf/Duergar trait): "base speed is never
  // modified by armor or encumbrance" — both reductions above are skipped
  // entirely when the race has the trait (and hasn't swapped it away via an
  // alternate racial trait), so a dwarf in full plate keeps her full 20 ft.
  const armorSpeedPenalty = heaviestWornArmorType(doc) >= 2;
  const slowAndSteady = hasSlowAndSteady(doc, race);
  if (
    !slowAndSteady &&
    (encumbrance?.speedPenalty || armorSpeedPenalty) &&
    speeds.land !== undefined
  ) {
    speeds.land = Math.min(speeds.land, encumberedSpeed(speeds.land));
  }

  // Arcane spell failure — display-only, only for arcane casters.
  const arcaneSpellFailure = computeArcaneSpellFailure(doc);

  // Skills
  const skills = computeSkills(doc, refData, abilities, collected, encumbrance);

  // Per-weapon attack lines. `baseSize`/`size` (base race size vs. the
  // wielder's current EFFECTIVE size, covers both a relative "size" Change
  // from Enlarge/Reduce Person and an active polymorph form's absolute
  // override, since both are already folded into `size` above by this point)
  // feed `scaleWeaponDamageDice`'s displayed-dice rewrite.
  const attacks = computeWeaponAttacks(
    doc,
    refData,
    bab,
    sizeAttackMod,
    collected,
    proficiencies,
    flatAttackPenaltyComponents,
    abilityMods,
    substitutions,
    baseSize,
    size,
  );

  // The PC's own body's natural attacks (bite, claws, ...) from a racial
  // trait/class feature/archetype feature/feat grant — see
  // `pc-natural-attacks/index.ts`. Undefined both when the character has no
  // grants and while an active polymorph form replaces her own body.
  const naturalAttacks = derivePcNaturalAttacks(
    doc,
    refData,
    bab,
    strMod,
    sizeAttackMod,
    size,
    collected,
    flatAttackPenaltyComponents,
  );

  // Kinetic blast lines (Occult Adventures) — every simple blast known plus
  // every composite qualified for, resolved with the live Elemental Overflow
  // bonus that scales with burn currently held. Empty for non-kineticists.
  const burnFeature = Object.values(refData.classFeatures).find((f) => f.tag === "burn");
  const kineticBlasts = computeKineticBlasts(doc, refData, {
    bab,
    sizeAttackMod,
    collected,
    abilityMods,
    substitutions,
    currentBurn: burnFeature ? (doc.live.resources[burnFeature.id]?.used ?? 0) : 0,
  });

  // DR / energy resistance / spell resistance — display-only.
  const defenses = computeDefenses(doc, refData, collected);

  // Special senses (darkvision, low-light vision, scent, ...) — display-only.
  const senses = computeSenses(collected);

  // Active polymorph-family transformation — resolved sheet for display:
  // natural-attack lines (BAB/Str/size math done here, since `bab`/
  // `strMod`/`sizeAttackMod` are only available at this point in `compute`)
  // plus the tier/option's honesty-bar context notes and the gear-melding
  // disclaimer. The ability-score/natural-armor adjustments themselves are NOT
  // duplicated here — they already flow through `abilities.*.components`/
  // `ac.components` via `collect.ts`.
  let activeForm: DerivedActiveForm | undefined;
  if (doc.live.activeForm) {
    const af = doc.live.activeForm;
    const option = polymorphFormOption(af.tier, af.creatureType, af.size, af.element);
    const tierDef = POLYMORPH_TIERS[af.tier as PolymorphTier];
    // A polymorph form's attacks ARE natural attacks, so nattack/ndamage
    // (Change targets aimed at "natural attack rolls"/"natural attack
    // damage" — see targets.ts) fold in here too; the general attack/damage
    // buckets deliberately don't — see computePolymorphAttacks' doc comment.
    const formNattackTotal = resolveStack(forTarget(collected, "nattack")).total;
    const formNdamageTotal = resolveStack(forTarget(collected, "ndamage")).total;
    activeForm = {
      tier: af.tier,
      tierName: tierDef?.name ?? af.tier,
      creatureType: af.creatureType,
      size: af.size,
      element: af.element,
      formName: af.formName,
      naturalArmor: option?.naturalArmor ?? 0,
      attacks: computePolymorphAttacks(
        bab,
        strMod,
        sizeAttackMod,
        af.naturalAttacks ?? [],
        formNattackTotal,
        formNdamageTotal,
      ),
      notes: [
        ...(tierDef?.notes ?? []),
        ...(option?.notes ?? []),
        "Polymorph melds some worn/carried gear into the new form (PF1 RAW) — this app does not auto-suppress armor/gear bonuses; adjust equipped gear by hand if needed.",
      ],
      playerNotes: af.notes,
      unresolved: option === undefined,
    };
  }

  // Enemy-facing ability DCs (hex, channel energy, bomb, cruelty, mesmerist
  // trick, Stunning Fist, Quivering Palm) — computed from the FINAL pass's
  // abilities/collected/rollData so a belt-of-intellect-style ability change
  // reaches these DCs like everything else on the sheet. `familyDCs` feeds
  // `resolveClassFeatures` below so a hex/cruelty contextNote's substituted
  // number agrees with the panel.
  const { dcs: abilityDCs, familyDCs } = computeAbilityDCs(
    doc,
    refData,
    abilities,
    collected,
    rollData,
  );

  // Spell-DC and caster-level-check bonuses — pure folds over `collected`
  // (no doc/refData inputs), so like the ability DCs above they see the
  // final pass's modifiers. Both come back undefined (field omitted) when
  // nothing targets them, which is every non-caster character.
  const spellDCs = computeSpellDCs(collected);
  const clChecks = computeClChecks(collected);

  // Castable spell-like-ability rows (racial innates, heritage traits, class
  // features, feats) — derived from the final pass's abilities so score
  // gates (Gnome Magic's Charisma 11) and DC mods see buffs/items.
  const spellLikeAbilities = deriveSpellLikeAbilities(
    doc,
    refData,
    abilities as Parameters<typeof deriveSpellLikeAbilities>[2],
  );

  // Slot / spells-known count edits the web's casting model folds into its
  // slot math (level-gated only, so base scores suffice), and fixed
  // bonus-known-spell grants its known-spell merges append.
  const castingAdjustments = resolveCastingAdjustments(doc, refData);
  const bonusKnownSpells = resolveBonusKnownSpells(doc, refData);

  // Generic stat overrides (bounded allowlist)
  const overrides = doc.build.settings?.statOverrides ?? {};
  const { classFeatures, activeArchetypes } = resolveClassFeatures(
    doc,
    refData,
    abilities,
    familyDCs,
  );
  const sheet = {
    schemaVersion: SCHEMA_VERSION,
    level,
    abilities,
    bab,
    saves,
    ac,
    cmb,
    cmd,
    cmdFlatFooted,
    ...(cmbConditionals.length > 0 ? { cmbConditionals } : {}),
    ...(cmdConditionals.length > 0 ? { cmdConditionals } : {}),
    initiative,
    attack,
    attacks,
    ...(naturalAttacks ? { naturalAttacks } : {}),
    kineticBlasts,
    hp,
    speeds,
    skills,
    classFeatures,
    activeArchetypes,
    ranger: computeRanger(doc),
    defenses,
    senses,
    encumbrance,
    size,
    activeForm,
    arcaneSpellFailure,
    proficiencies,
    ...(abilityDCs.length > 0 ? { abilityDCs } : {}),
    ...(spellDCs ? { spellDCs } : {}),
    ...(clChecks ? { clChecks } : {}),
    ...(spellLikeAbilities.length > 0 ? { spellLikeAbilities } : {}),
    ...(castingAdjustments.length > 0 ? { castingAdjustments } : {}),
    ...(bonusKnownSpells !== undefined ? { bonusKnownSpells } : {}),
  };

  for (const [key, val] of Object.entries(overrides)) {
    if (!STAT_OVERRIDE_KEYS.has(key)) continue;
    const overrideComp: ModifierComponent = {
      source: "Manual override",
      type: "override",
      value: val,
      applied: true,
    };
    switch (key) {
      case "hp.max":
        sheet.hp = { ...sheet.hp, max: val, components: [...sheet.hp.components, overrideComp] };
        break;
      case "ac.normal": {
        const acOverrideComp: AcComponent = { ...overrideComp, category: "generic" };
        sheet.ac = {
          ...sheet.ac,
          normal: val,
          components: [...sheet.ac.components, acOverrideComp],
        };
        break;
      }
      case "speeds.land":
        sheet.speeds = { ...sheet.speeds, land: val };
        break;
      case "initiative.total":
        sheet.initiative = {
          ...sheet.initiative,
          total: val,
          components: [...sheet.initiative.components, overrideComp],
        };
        break;
      case "bab":
        sheet.bab = val;
        break;
      case "cmd":
        sheet.cmd = val;
        break;
      case "cmb":
        sheet.cmb = val;
        break;
      case "saves.fort.total":
        sheet.saves = {
          ...sheet.saves,
          fort: {
            ...sheet.saves.fort,
            total: val,
            components: [...sheet.saves.fort.components, overrideComp],
          },
        };
        break;
      case "saves.ref.total":
        sheet.saves = {
          ...sheet.saves,
          ref: {
            ...sheet.saves.ref,
            total: val,
            components: [...sheet.saves.ref.components, overrideComp],
          },
        };
        break;
      case "saves.will.total":
        sheet.saves = {
          ...sheet.saves,
          will: {
            ...sheet.saves.will,
            total: val,
            components: [...sheet.saves.will.components, overrideComp],
          },
        };
        break;
    }
  }

  return sheet;
}

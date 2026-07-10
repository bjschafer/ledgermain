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
  CharacterDoc,
  DerivedActiveForm,
  DerivedEncumbrance,
  DerivedSheet,
  DerivedSkill,
  HitPoints,
  ModifierComponent,
  RefData,
  ResolvedStat,
  ResolvedWeaponAttack,
  SizeId,
  WeaponInstance,
} from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { resolveClassFeatures } from "./archetypes.js";
import { computeRanger } from "./ranger.js";
import { collectModifiers, forTarget, type CollectedModifier } from "./collect.js";
import { computeDefenses } from "./defenses.js";
import {
  computeEncumbrance,
  encumbranceLevelFor,
  encumberedSpeed,
  loadTierLabel,
} from "./encumbrance.js";
import {
  computePolymorphAttacks,
  polymorphFormOption,
  POLYMORPH_TIERS,
  type PolymorphTier,
} from "./polymorph.js";
import { hasSlowAndSteady } from "./racial-traits.js";
import { abilityMod, buildRollData, totalLevel, type AbilityView } from "./rolldata.js";
import { resolveStack, type ResolvedModifier, type TypedModifier } from "./stacking.js";
import { normalizeWeaponGroup } from "./weapon-groups.js";
import {
  babForLevels,
  isTrainedOnly,
  PARAMETERIZED_SKILL_PREFIXES,
  ROGUE_FINESSE_TRAINING_LEVELS,
  SAVE_ABILITY,
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

function toComponents(mods: ResolvedModifier[]): ModifierComponent[] {
  return mods.map((m) => ({
    source: m.source,
    sourceId: m.sourceId,
    type: m.type,
    value: m.value,
    applied: m.applied,
  }));
}

function synthetic(source: string, type: string, value: number): ModifierComponent {
  return { source, type, value, applied: true };
}

/* ------------------------------------------------------------- temp HP */

/**
 * Aggregates every `tempHp`-targeting `Change` into `HitPoints.grantedTemp`
 * (issue #67). NOT `resolveStack` (typed-bonus stacking is per bonus TYPE —
 * dodge/untyped/circumstance sum, others take the highest-within-type) —
 * temporary HP stacking is per SOURCE (Paizo FAQ / CRB p. 208 "Combining
 * Magical Effects": temp HP from the same source doesn't stack, temp HP from
 * different sources does), so this groups by each modifier's `source`
 * (display name — two active instances of the identical buff share the same
 * `source` string even though their `sourceId`s/instanceIds differ, which is
 * exactly "same source" in the FAQ's sense), takes the highest value within
 * each group, then SUMS across groups.
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

function computeSave(
  which: "fort" | "ref" | "will",
  classes: CharacterDoc["identity"]["classes"],
  refData: RefData,
  abilityModifier: number,
  collected: CollectedModifier[],
): ResolvedStat {
  let base = 0;
  for (const c of classes) {
    const def = Object.values(refData.classes).find((x) => x.tag === c.tag);
    if (def) base += saveForLevels(def.saves[which], c.level);
  }
  const mods: TypedModifier[] = [
    ...forTarget(collected, which),
    ...forTarget(collected, "allSavingThrows"),
  ];
  const stack = resolveStack(mods);
  const components: ModifierComponent[] = [
    synthetic("Base", "base", base),
    synthetic(`Ability (${SAVE_ABILITY[which]})`, "ability", abilityModifier),
    ...toComponents(stack.modifiers),
  ];
  return { total: base + abilityModifier + stack.total, components };
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
 * RAW: CMD benefits from these eight *named* AC bonus types (deflection,
 * dodge, circumstance, insight, luck, morale, profane, sacred) in addition to
 * BAB/Str/Dex/size. Armor, shield, and natural-armor bonuses never apply.
 * Untyped/enhancement/racial/etc. AC bonuses are likewise excluded — a
 * vendored source that wants an untyped bonus to also affect CMD (e.g. a
 * monk's Wis-to-AC class feature) carries its own explicit `cmd`-target
 * change for that (see the CMB/CMD block in {@link compute}).
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

function computeAc(
  doc: CharacterDoc,
  size: SizeId,
  dexMod: number,
  collected: CollectedModifier[],
  encumbrance?: DerivedEncumbrance,
): ArmorClass {
  // Gather candidates as {category, type, value, source}, then stack within each
  // (category|type) group so e.g. armor base + armor enhancement stack but two
  // luck bonuses to AC do not.
  interface AcCand extends TypedModifier {
    category: AcCategory;
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
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.armor) continue;
    const a = inst.armor;
    const label = inst.name ?? (a.slot === "shield" ? "Shield" : "Armor");
    if (a.slot === "shield") {
      shieldTotal += a.ac;
      cands.push({ category: "shield", type: "untyped", value: a.ac, source: label });
      if (a.enhancement) {
        cands.push({
          category: "shield",
          type: "enh",
          value: a.enhancement,
          source: `${label} (enhancement)`,
        });
      }
    } else {
      armorTotal += a.ac;
      cands.push({ category: "armor", type: "untyped", value: a.ac, source: label });
      if (a.enhancement) {
        cands.push({
          category: "armor",
          type: "enh",
          value: a.enhancement,
          source: `${label} (enhancement)`,
        });
      }
      if (a.maxDex !== undefined) {
        maxDexCap = maxDexCap === undefined ? a.maxDex : Math.min(maxDexCap ?? a.maxDex, a.maxDex);
      }
    }
  }
  void armorTotal;
  void shieldTotal;

  // armor-training max-dex increase
  const mDexBonus = forTarget(collected, "mDexA").reduce((s, m) => s + m.value, 0);
  if (maxDexCap !== undefined) maxDexCap += mDexBonus;

  // Encumbrance (issue #16, optional rule): a medium/heavy load imposes its
  // own max-Dex-to-AC cap, combining with any worn-armor cap as "whichever is
  // more restrictive wins" (PF1 RAW — the two never stack additively).
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
  cands.push({
    category: "dex",
    type: "untyped",
    value: cappedDex,
    source: dexBoundByLoad ? `Dexterity (${loadTierLabel(encumbrance!.tier)})` : "Dexterity",
  });

  const sizeMod = SIZE_AC_MOD[size];
  if (sizeMod !== 0) cands.push({ category: "size", type: "size", value: sizeMod, source: "Size" });

  // typed AC changes from items/features: ac / aac / sac / nac
  for (const target of ["ac", "aac", "sac", "nac"]) {
    for (const m of forTarget(collected, target)) {
      cands.push({ ...m, category: categoryFor(target, m.type) });
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
  for (const [, group] of groups) {
    const stack = resolveStack(group);
    stack.modifiers.forEach((m, i) => {
      components.push({
        source: m.source,
        sourceId: m.sourceId,
        type: m.type,
        value: m.value,
        applied: m.applied,
        category: group[i]!.category,
      });
    });
  }

  const sumWhere = (pred: (c: AcComponent) => boolean) =>
    components.reduce((s, c) => (c.applied && pred(c) ? s + c.value : s), 0);

  return {
    normal: sumWhere(() => true),
    touch: sumWhere((c) => TOUCH_CATEGORIES.has(c.category)),
    flatFooted: sumWhere((c) => FLAT_FOOTED_CATEGORIES.has(c.category)),
    components,
  };
}

/* ------------------------------------------------------- armor speed / ASF */

/**
 * Highest armor `type` (weight class: 0 none/1 light/2 med/3 heavy) among
 * equipped BODY armor — shields don't impose the "Table: Speed" reduction
 * (issue #8). `WornArmor.type` already reflects any material-driven shift
 * (mithral lightens by one step, see `model/materials.ts`), so this
 * automatically picks up e.g. mithral full plate reading as medium.
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
 * Class tags recognised as arcane spellcasters for arcane-spell-failure (ASF)
 * display (issue #8, issue #64) — clean-room from PF1 RAW, not derived from
 * Foundry data (the vendored `ClassRef` carries no arcane/divine flag). This
 * is the arcane subset of `tables.ts`'s `SpellProgression` tags: wizard,
 * sorcerer, arcanist (ACG), and magus (UM) are int/cha-based arcane casters
 * (arcanist has no armor proficiency at all — "not proficient with any type
 * of armor or shield" per its own Weapon and Armor Proficiency feature —
 * while magus gets a level-gated exemption, see `ARMOR_EXEMPTIONS`); bard is
 * a spontaneous arcane caster, witch (APG) is a full prepared-arcane caster,
 * and bloodrager (ACG) is a spontaneous arcane caster too (own spell list,
 * cha-based); cleric/druid/paladin/ranger/shaman/warpriest/hunter are divine
 * and never incur ASF at all. Summoner and skald (both Cha-based spontaneous
 * casters) are also arcane — inquisitor (Wis-based) is divine and stays out
 * of this set.
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
 * exemption (issue #64) — clean-room from each class's own Archives of
 * Nethys page (legacy.aonprd.com), not Foundry source:
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
 * Total arcane spell failure chance (%) from equipped armor + shields (issue
 * #8), only for characters with at least one arcane-casting class — divine-
 * only characters get `undefined` back (ASF doesn't apply to them at all).
 *
 * Armor-proficiency exemption (PF1 RAW, issue #64, see `ARMOR_EXEMPTIONS`):
 * several arcane classes ignore ASF while wearing armor within their own
 * proficiency (and, for bard/skald, even with a shield). This is applied
 * here only when the exempt class is the character's ONLY arcane class — a
 * multiclass wizard/bard still incurs ASF for her wizard spells regardless
 * of what she's wearing, so `total` stays the plain (conservative) sum in
 * that case. This app models ASF as a single sheet-level number rather than
 * per-spell/per-class, so the exemption is necessarily all-or-nothing: where
 * a multiclass character's arcane classes disagree on armor proficiency
 * (e.g. wizard + skald), the exemption is withheld entirely and the sheet
 * shows the conservative (higher) total rather than guessing which spell
 * the player is about to cast.
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

  // Effective armor check penalty (negative), reduced by armor-training acpA.
  const wornAcp = (doc.build.gear ?? []).reduce(
    (s, inst) => (inst.equipped && inst.armor?.acp ? s + inst.armor.acp : s),
    0,
  );
  const acpReduction = forTarget(collected, "acpA").reduce((s, m) => s + Math.abs(m.value), 0);
  // Encumbrance (issue #16, optional rule): a medium/heavy load imposes its
  // own flat armor check penalty, additive with worn armor's ACP (PF1 RAW).
  const loadAcp = encumbrance?.acp ?? 0;
  const effectiveAcp = Math.min(0, wornAcp + acpReduction + loadAcp);

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
    // provenance chip (issue #16) alongside the misc-modifier breakdown, not a
    // second addend into `total`.
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
 * Every `<group>` key a weapon's `attack.weapon.<group>` / `damage.weapon.<group>`
 * bonuses should be gathered from (issue #45): the weapon's free-text,
 * player-set `.group` tag (Weapon Focus/Specialization's exact-match
 * mechanism, unchanged — kept unnormalized for backward compatibility with
 * every `Change` already authored against it) UNIONED with its vendored
 * `.weaponGroups` semantic tags (Weapon Training and its archetype
 * reflavors), each normalized via `normalizeWeaponGroup` so an authored
 * target like `attack.weapon.blades-heavy` matches the vendored
 * `"bladesHeavy"` tag. Deduplicated so a weapon whose free-text tag happens
 * to coincide with one of its own semantic groups doesn't query the same
 * target twice (which would still resolve to the same single set of
 * matching changes either way — `forTarget` is not additive per call — but
 * dedup keeps the intent obvious). Hand-entered custom weapons have no
 * `.weaponGroups` and keep matching via `.group` alone.
 */
function weaponGroupKeys(w: Pick<WeaponInstance, "group" | "weaponGroups">): string[] {
  const keys = new Set<string>();
  if (w.group) keys.add(w.group);
  for (const g of w.weaponGroups ?? []) keys.add(normalizeWeaponGroup(g));
  return [...keys];
}

/**
 * Rogue (Unchained) Finesse Training (issue #65): true when `w` is eligible
 * for the character's Dex-to-damage substitution — one of `build.
 * rogueFinesseWeapons`' picks that have actually been UNLOCKED by the
 * character's current `rogueUnchained` class level (`ROGUE_FINESSE_TRAINING_LEVELS`
 * — 3rd/11th/19th) matches this weapon. Matching is a free-text,
 * case-insensitive substring check against the weapon's display `name` (so a
 * "rapier" pick matches a `WeaponInstance` named "Rapier +1") OR an exact
 * match against its free-text `group` tag — the same convention Weapon
 * Focus/Specialization already use via `WeaponInstance.group` (not the
 * semantic `WEAPON_GROUPS` vocabulary — RAW scopes this ability to one
 * weapon TYPE, not a whole group). Never blocks selection; a character with
 * no `rogueUnchained` levels or no picks simply never matches.
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
 * Builds a ResolvedWeaponAttack for each entry in build.weapons.
 *
 * Attack formula (PF1 CRB):
 *   attack = BAB + ability mod (STR or DEX per attackAbility) + size modifier
 *            + enhancement (or +1 masterwork if enhancement is 0)
 *            + general "attack" / "mattack" / "rattack" changes
 *            + per-group changes (e.g. `attack.weapon.longsword` from Weapon Focus,
 *              or `attack.weapon.bows` from a semantic weapon-group bonus)
 *
 * Damage bonus (numeric; dice displayed separately):
 *   damage = floor(ability mod × damageMultiplier) [melee, damageAbility="str"/"dex" only]
 *            + enhancement
 *            + any "damage" target changes from the collected modifier set
 *            + per-group changes (e.g. `damage.weapon.longsword` from Weapon Specialization,
 *              or `damage.weapon.bows` from a semantic weapon-group bonus)
 *
 * Per-weapon feat bonuses (Weapon Focus, Weapon Specialization) and semantic
 * weapon-group bonuses (Weapon Training, issue #45) are both routed via
 * group-specific targets (`attack.weapon.<group>` / `damage.weapon.<group>`) so the
 * regular collect → stack pipeline handles them without special-casing here —
 * see {@link weaponGroupKeys} for how a weapon's matching `<group>` keys are gathered.
 *
 * `damageAbility` is normally "str" (or the player's own explicit "dex"/"none"
 * override — issue #65 extended the union to allow a hand-set Dex-to-damage
 * source like Slashing Grace). When the stored value is unset or the default
 * "str", Rogue (Unchained)'s Finesse Training substitutes Dex automatically
 * for a matching weapon — see {@link rogueFinesseTrainingMatches} — so the
 * player doesn't have to flip the per-weapon field by hand for the class
 * feature that's supposed to grant it for free.
 */
function computeWeaponAttacks(
  doc: CharacterDoc,
  bab: number,
  strMod: number,
  dexMod: number,
  sizeAttackMod: number,
  collected: CollectedModifier[],
): ResolvedWeaponAttack[] {
  const weapons = doc.build.weapons ?? [];
  return weapons.map((w) => {
    const category = w.category ?? "melee";
    const enh = w.enhancement ?? 0;
    // Masterwork's +1 attack bonus is implied (and superseded) by any magic
    // enhancement bonus, so it only applies to a non-magical (+0) weapon.
    const masterworkBonus = enh === 0 && w.masterwork ? 1 : 0;
    const attackAbilityMod = w.attackAbility === "dex" ? dexMod : strMod;
    const attackAbilityLabel = w.attackAbility === "dex" ? "Dexterity" : "Strength";
    const groupKeys = weaponGroupKeys(w);

    // General attack changes + per-group feat bonuses (e.g. Weapon Focus via
    // "attack.weapon.<group>", or a semantic weapon-group bonus via "attack.weapon.bows").
    const weaponAttackStack = resolveStack([
      ...forTarget(collected, "attack"),
      ...(category === "melee" ? forTarget(collected, "mattack") : forTarget(collected, "rattack")),
      ...groupKeys.flatMap((g) => forTarget(collected, `attack.weapon.${g}`)),
    ]);
    const attackTotal =
      bab + attackAbilityMod + sizeAttackMod + enh + masterworkBonus + weaponAttackStack.total;
    const attackComponents: ModifierComponent[] = [
      synthetic("BAB", "base", bab),
      synthetic(attackAbilityLabel, "ability", attackAbilityMod),
      ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
      ...(enh !== 0 ? [synthetic(`${w.name} (enhancement)`, "enh", enh)] : []),
      ...(masterworkBonus !== 0
        ? [synthetic(`${w.name} (masterwork)`, "enh", masterworkBonus)]
        : []),
      ...toComponents(weaponAttackStack.modifiers),
    ];

    // Ability-to-damage: STR or DEX, only melee, scaled by damageMultiplier.
    // An unset/default "str" value is auto-promoted to "dex" for a weapon
    // matching Rogue (Unchained)'s Finesse Training (issue #65); an explicit
    // player-set "dex"/"none" always wins over the auto-match.
    const autoFinesseDex =
      (w.damageAbility === undefined || w.damageAbility === "str") &&
      category === "melee" &&
      rogueFinesseTrainingMatches(doc, w);
    const damageAbility = autoFinesseDex ? "dex" : (w.damageAbility ?? "str");
    const damageAbilityMod = damageAbility === "dex" ? dexMod : strMod;
    const mult = w.damageMultiplier ?? 1;
    const appliesAbilityDamage =
      (damageAbility === "str" || damageAbility === "dex") && category === "melee";
    const abilityDamage = appliesAbilityDamage ? Math.floor(damageAbilityMod * mult) : 0;

    // General "damage" target changes + per-group feat bonuses (e.g. Weapon
    // Specialization via "damage.weapon.<group>", or a semantic weapon-group
    // bonus via "damage.weapon.bows"). "wdamage" (all weapon damage),
    // "mwdamage" (melee), "rwdamage" (ranged) come from vendored buffs/
    // conditions (Divine Favor, Rage, sickened, etc.). We don't model thrown
    // weapons as a distinct category, so "twdamage" (thrown) is approximated
    // onto ranged lines alongside "rwdamage".
    const weaponDamageStack = resolveStack([
      ...forTarget(collected, "damage"),
      ...forTarget(collected, "wdamage"),
      ...(category === "melee"
        ? forTarget(collected, "mwdamage")
        : [...forTarget(collected, "rwdamage"), ...forTarget(collected, "twdamage")]),
      ...groupKeys.flatMap((g) => forTarget(collected, `damage.weapon.${g}`)),
    ]);
    const damageTotal = abilityDamage + enh + weaponDamageStack.total;

    const damageComponents: ModifierComponent[] = [];
    if (appliesAbilityDamage) {
      const multLabel = mult !== 1 ? ` ×${mult}` : "";
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
    if (w.damageDice !== undefined) result.damageDice = w.damageDice;
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
  let bab = 0;
  for (const cls of doc.identity.classes) {
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!def) continue;
    // Issue #65: Vigilante's Avenger specialization (Ultimate Intrigue, the
    // "Vigilante Specialization" class feature) reads "gains a base attack
    // bonus equal to his vigilante level instead of using those listed on
    // Table 1-1" — a full-BAB override for vigilante levels specifically,
    // not a global tier change (a multiclassed avenger's OTHER classes still
    // use their own listed tier). `def.bab` is vigilante's normal "med" tier
    // from the vendored data; swapped for "high" only when this class entry
    // IS vigilante levels AND the build chose Avenger.
    const tier =
      cls.tag === "vigilante" && doc.build.vigilanteSpecialization === "avenger" ? "high" : def.bab;
    bab += babForLevels(tier, cls.level);
  }

  const baseSize: SizeId = race?.size ?? "med";

  // Bootstrap: resolve ability-targeting changes against base scores, then build
  // the final roll data and re-collect everything against the final abilities.
  const bootRollData = buildRollData(doc, refData, undefined, baseSpeeds, bab);
  const bootCollected = collectModifiers(doc, refData, bootRollData);
  const bootAbilities = computeAbilities(doc, bootCollected);

  // Encumbrance (issue #16, optional rule — default off). Computed from the
  // BOOT-pass Strength (already reflects racial/item/buff ability changes, via
  // the same collected-modifier pass as everything else) so the resulting
  // `@attributes.encumbrance.level` can feed the FINAL roll data below, which
  // is what vendored formulas (e.g. monk's Wis-to-AC gate) actually evaluate
  // against. Uses `baseSize` (race size, not any Enlarge/Reduce Person shift)
  // for the same reason `rolldata.ts` uses race-base speeds: computing the
  // size-shift itself requires `collected`, which would make this circular.
  const encumbranceEnabled = doc.build.settings?.encumbranceEnabled ?? false;
  const encumbrance = encumbranceEnabled
    ? computeEncumbrance(doc, refData, bootAbilities.str.total, baseSize)
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
  // A polymorph-family transformation (issue #70 — `live.activeForm`)
  // replaces the size ladder's result outright: the form's size is an
  // unconditional, absolute replacement per PF1 RAW, not a relative shift
  // like Enlarge Person's own "size" change above. Simultaneously combining
  // a size-shifting spell with a polymorph effect is a rare table edge case
  // this app doesn't try to adjudicate — the form's size simply wins while
  // active. Applied even when the form's tier/creatureType/size/element
  // combination itself doesn't resolve to a known `PolymorphFormOption`
  // (`collect.ts` contributes no ability/NA changes in that case, but the
  // player's chosen size is still meaningful on its own).
  if (doc.live.activeForm) size = doc.live.activeForm.size;
  const sizeAttackMod = SIZE_AC_MOD[size];

  const strMod = abilities.str.mod;
  const dexMod = abilities.dex.mod;

  // Saves
  const saves = {
    fort: computeSave("fort", doc.identity.classes, refData, abilities.con.mod, collected),
    ref: computeSave("ref", doc.identity.classes, refData, abilities.dex.mod, collected),
    will: computeSave("will", doc.identity.classes, refData, abilities.wis.mod, collected),
  };

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
    synthetic("Strength", "ability", strMod),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(meleeStack.modifiers),
  ];
  const rangedComponents: ModifierComponent[] = [
    synthetic("BAB", "base", bab),
    synthetic("Dexterity", "ability", dexMod),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(rangedStack.modifiers),
  ];
  const meleeTotal = bab + strMod + sizeAttackMod + meleeStack.total;
  const rangedTotal = bab + dexMod + sizeAttackMod + rangedStack.total;
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

  // AC
  const ac = computeAc(doc, size, dexMod, collected, encumbrance);

  // CMB / CMD
  const sizeSpecial = specialSizeMod(size);
  const cmbStack = resolveStack(forTarget(collected, "cmb"));
  const cmb = bab + strMod + sizeSpecial + cmbStack.total;

  // CMD = 10 + BAB + Str + Dex + special size mod, auto-including any of the
  // eight RAW-named AC bonus types (CMD_AC_TYPES above) plus whatever carries
  // an explicit "cmd"-target change. Read from the same `collected` "ac"
  // modifiers computeAc reads (armor/shield/natural bonuses live under the
  // separate "aac"/"sac"/"nac" targets, so filtering to bare "ac" already
  // excludes them without a category check).
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
  const autoCmdFromAc = forTarget(collected, "ac").filter(
    (m) =>
      CMD_AC_TYPES.has(m.type.toLowerCase()) && !explicitCmdSourceIds.has(m.sourceId ?? m.source),
  );
  const cmdStack = resolveStack([...autoCmdFromAc, ...explicitCmdMods]);
  const cmd = 10 + bab + strMod + dexMod + sizeSpecial + cmdStack.total;

  // Initiative
  const initStack = resolveStack(forTarget(collected, "init"));
  const initiative: ResolvedStat = {
    total: dexMod + initStack.total,
    components: [synthetic("Dexterity", "ability", dexMod), ...toComponents(initStack.modifiers)],
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
  // Encumbrance (issue #16, optional rule) and worn medium/heavy ARMOR (issue
  // #8, always-on core rule — unlike encumbrance, not settings-gated) both
  // reduce land speed per the RAW "Table: Speed" mapping. The two don't
  // stack: PF1 RAW reduces speed to the SAME tabled value regardless of
  // which condition triggers it, so this is a single reduction gated by
  // "either applies," not two sequential ones (chaining the table twice
  // would over-reduce, e.g. 30 -> 20 -> 15). Takes the lower of the tabled
  // value and whatever the above targets already produced (e.g. a "set"
  // effect like Slow) — RAW load/armor speed penalties apply only to land
  // speed, not fly/swim/etc.
  //
  // Slow and Steady (issue #52, d20pfsrd core Dwarf/Duergar trait): "base
  // speed is never modified by armor or encumbrance" — both reductions above
  // are skipped entirely when the race has the trait (and hasn't swapped it
  // away via an alternate racial trait), so a dwarf in full plate keeps her
  // full 20 ft.
  const armorSpeedPenalty = heaviestWornArmorType(doc) >= 2;
  const slowAndSteady = hasSlowAndSteady(doc, race);
  if (
    !slowAndSteady &&
    (encumbrance?.speedPenalty || armorSpeedPenalty) &&
    speeds.land !== undefined
  ) {
    speeds.land = Math.min(speeds.land, encumberedSpeed(speeds.land));
  }

  // Arcane spell failure (issue #8) — display-only, only for arcane casters.
  const arcaneSpellFailure = computeArcaneSpellFailure(doc);

  // Skills
  const skills = computeSkills(doc, refData, abilities, collected, encumbrance);

  // Per-weapon attack lines
  const attacks = computeWeaponAttacks(doc, bab, strMod, dexMod, sizeAttackMod, collected);

  // DR / energy resistance / spell resistance — display-only (issue #21).
  const defenses = computeDefenses(doc, refData, collected);

  // Active polymorph-family transformation (issue #70) — resolved sheet for
  // display: natural-attack lines (BAB/Str/size math done here, since `bab`/
  // `strMod`/`sizeAttackMod` are only available at this point in `compute`)
  // plus the tier/option's honesty-bar context notes and the gear-melding
  // disclaimer. The ability-score/natural-armor adjustments themselves are
  // NOT duplicated here — they already flow through `abilities.*.components`/
  // `ac.components` via `collect.ts`.
  let activeForm: DerivedActiveForm | undefined;
  if (doc.live.activeForm) {
    const af = doc.live.activeForm;
    const option = polymorphFormOption(af.tier, af.creatureType, af.size, af.element);
    const tierDef = POLYMORPH_TIERS[af.tier as PolymorphTier];
    activeForm = {
      tier: af.tier,
      tierName: tierDef?.name ?? af.tier,
      creatureType: af.creatureType,
      size: af.size,
      element: af.element,
      formName: af.formName,
      naturalArmor: option?.naturalArmor ?? 0,
      attacks: computePolymorphAttacks(bab, strMod, sizeAttackMod, af.naturalAttacks ?? []),
      notes: [
        ...(tierDef?.notes ?? []),
        ...(option?.notes ?? []),
        "Polymorph melds some worn/carried gear into the new form (PF1 RAW) — this app does not auto-suppress armor/gear bonuses; adjust equipped gear by hand if needed.",
      ],
      playerNotes: af.notes,
      unresolved: option === undefined,
    };
  }

  // Generic stat overrides (bounded allowlist)
  const overrides = doc.build.settings?.statOverrides ?? {};
  const { classFeatures, activeArchetypes } = resolveClassFeatures(doc, refData, abilities);
  const sheet = {
    schemaVersion: SCHEMA_VERSION,
    level,
    abilities,
    bab,
    saves,
    ac,
    cmb,
    cmd,
    initiative,
    attack,
    attacks,
    hp,
    speeds,
    skills,
    classFeatures,
    activeArchetypes,
    ranger: computeRanger(doc),
    defenses,
    encumbrance,
    size,
    activeForm,
    arcaneSpellFailure,
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

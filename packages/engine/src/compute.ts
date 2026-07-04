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
  DerivedSheet,
  DerivedSkill,
  HitPoints,
  ModifierComponent,
  RefData,
  ResolvedStat,
  ResolvedWeaponAttack,
  SizeId,
} from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { resolveClassFeatures } from "./archetypes.js";
import { computeRanger } from "./ranger.js";
import { collectModifiers, forTarget, type CollectedModifier } from "./collect.js";
import { computeDefenses } from "./defenses.js";
import { abilityMod, buildRollData, totalLevel, type AbilityView } from "./rolldata.js";
import { resolveStack, type ResolvedModifier, type TypedModifier } from "./stacking.js";
import {
  babForLevels,
  isTrainedOnly,
  PARAMETERIZED_SKILL_PREFIXES,
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

  const cappedDex = maxDexCap === undefined ? dexMod : Math.min(dexMod, maxDexCap);
  cands.push({ category: "dex", type: "untyped", value: cappedDex, source: "Dexterity" });

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
  };
}

/* ------------------------------------------------------------------- skills */

function computeSkills(
  doc: CharacterDoc,
  refData: RefData,
  abilities: Record<AbilityId, AbilityView>,
  collected: CollectedModifier[],
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
  const effectiveAcp = Math.min(0, wornAcp + acpReduction);

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
    const acp = skillUsesAcp(id) ? effectiveAcp : 0;
    const stack = resolveStack([...(miscBySkill.get(id) ?? []), ...globalSkillMods]);
    const total = ranks + abilityModifier + classSkillBonus + acp + stack.total;
    const trainedOnly = isTrainedOnly(id);
    const usable = ranks > 0 || !trainedOnly;
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
      components: toComponents(stack.modifiers),
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
 * Builds a ResolvedWeaponAttack for each entry in build.weapons.
 *
 * Attack formula (PF1 CRB):
 *   attack = BAB + ability mod (STR or DEX per attackAbility) + size modifier
 *            + enhancement (or +1 masterwork if enhancement is 0)
 *            + general "attack" / "mattack" / "rattack" changes
 *            + per-group changes (e.g. `attack.weapon.longsword` from Weapon Focus)
 *
 * Damage bonus (numeric; dice displayed separately):
 *   damage = floor(STR × damageMultiplier) [melee, damageAbility="str" only]
 *            + enhancement
 *            + any "damage" target changes from the collected modifier set
 *            + per-group changes (e.g. `damage.weapon.longsword` from Weapon Specialization)
 *
 * Per-weapon feat bonuses (Weapon Focus, Weapon Specialization) are routed via
 * group-specific targets (`attack.weapon.<group>` / `damage.weapon.<group>`) so the
 * regular collect → stack pipeline handles them without special-casing here.
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

    // General attack changes + per-group feat bonuses (e.g. Weapon Focus via "attack.weapon.<group>").
    const weaponAttackStack = resolveStack([
      ...forTarget(collected, "attack"),
      ...(category === "melee" ? forTarget(collected, "mattack") : forTarget(collected, "rattack")),
      ...(w.group ? forTarget(collected, `attack.weapon.${w.group}`) : []),
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

    // Ability-to-damage: only STR, only melee, scaled by damageMultiplier.
    const damageAbility = w.damageAbility ?? "str";
    const mult = w.damageMultiplier ?? 1;
    const appliesAbilityDamage = damageAbility === "str" && category === "melee";
    const abilityDamage = appliesAbilityDamage ? Math.floor(strMod * mult) : 0;

    // General "damage" target changes + per-group feat bonuses (e.g. Weapon Specialization via "damage.weapon.<group>").
    // "wdamage" (all weapon damage), "mwdamage" (melee), "rwdamage" (ranged) come
    // from vendored buffs/conditions (Divine Favor, Rage, sickened, etc.). We
    // don't model thrown weapons as a distinct category, so "twdamage" (thrown)
    // is approximated onto ranged lines alongside "rwdamage".
    const weaponDamageStack = resolveStack([
      ...forTarget(collected, "damage"),
      ...forTarget(collected, "wdamage"),
      ...(category === "melee"
        ? forTarget(collected, "mwdamage")
        : [...forTarget(collected, "rwdamage"), ...forTarget(collected, "twdamage")]),
      ...(w.group ? forTarget(collected, `damage.weapon.${w.group}`) : []),
    ]);
    const damageTotal = abilityDamage + enh + weaponDamageStack.total;

    const damageComponents: ModifierComponent[] = [];
    if (appliesAbilityDamage) {
      const multLabel = mult !== 1 ? ` ×${mult}` : "";
      damageComponents.push(synthetic(`Strength${multLabel}`, "ability", abilityDamage));
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
    if (def) bab += babForLevels(def.bab, cls.level);
  }

  // Bootstrap: resolve ability-targeting changes against base scores, then build
  // the final roll data and re-collect everything against the final abilities.
  const bootRollData = buildRollData(doc, refData, undefined, baseSpeeds, bab);
  const bootCollected = collectModifiers(doc, refData, bootRollData);
  const bootAbilities = computeAbilities(doc, bootCollected);
  const rollData = buildRollData(doc, refData, bootAbilities, baseSpeeds, bab);
  const collected = collectModifiers(doc, refData, rollData);
  const abilities = computeAbilities(doc, collected);

  const baseSize: SizeId = race?.size ?? "med";
  // Enlarge/Reduce Person and similar effects shift the character along the
  // size ladder; round toward zero (a +1.5 or -0.5 step isn't a thing PF1
  // formulas produce, but be defensive) and clamp at the ladder's ends.
  const sizeShift = Math.trunc(forTarget(collected, "size").reduce((s, m) => s + m.value, 0));
  const size: SizeId = shiftSize(baseSize, sizeShift);
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
  const ac = computeAc(doc, size, dexMod, collected);

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

  // Skills
  const skills = computeSkills(doc, refData, abilities, collected);

  // Per-weapon attack lines
  const attacks = computeWeaponAttacks(doc, bab, strMod, dexMod, sizeAttackMod, collected);

  // DR / energy resistance / spell resistance — display-only (issue #21).
  const defenses = computeDefenses(doc, collected);

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

/**
 * `@pf1/engine` — the pure, framework-agnostic PF1 rules engine.
 *
 *  - {@link compute}: CharacterDoc + RefData → DerivedSheet (static sheet).
 *  - Formula DSL evaluator: {@link evaluateFormula}, {@link parseFormula}.
 *  - Typed bonus-stacking resolver: {@link resolveStack}.
 */

export { compute } from "./compute.js";
export {
  collectModifiers,
  forTarget,
  evaluateBuffChange,
  type CollectedModifier,
} from "./collect.js";
export {
  resolveStack,
  type TypedModifier,
  type ResolvedModifier,
  type StackResult,
} from "./stacking.js";
export {
  parseFormula,
  evaluateFormula,
  evaluateNode,
  tryEvaluateFormula,
  containsDice,
  DiceTermError,
  FormulaSyntaxError,
  type RollData,
  type FormulaNode,
} from "./formula.js";
export { buildRollData, abilityMod, totalLevel, type AbilityView } from "./rolldata.js";
export {
  babForLevels,
  saveForLevels,
  specialSizeMod,
  SIZE_AC_MOD,
  SAVE_ABILITY,
  SKILL_ABILITY,
  SKILL_IDS,
  SKILL_GROUPS,
  PARAMETERIZED_SKILL_PREFIXES,
  skillBaseId,
  skillUsesAcp,
  isTrainedOnly,
  raceGrantsFlexibleAbility,
  baseSpellsPerDay,
  baseSpellsKnown,
  baseSpellsPrepared,
  type SpellProgression,
  type SpellKnownProgression,
  type SpellPreparedProgression,
  channelEnergyDetail,
  type ChannelEnergyDetail,
  sneakAttackDice,
  type SneakAttackDetail,
  smiteEvilDetail,
  smiteEvilLabel,
  type SmiteEvilDetail,
  layOnHandsDice,
  type LayOnHandsDetail,
  unarmedDamageDie,
  type UnarmedDamageDetail,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
  type BarbarianDrDetail,
} from "./tables.js";
export { CONDITIONS, CONDITION_IDS, CONDITION_LADDERS, type ConditionDef } from "./conditions.js";
export { TRAITS, TRAIT_IDS, type TraitDef, type TraitCategory } from "./traits.js";
export {
  RACIAL_TRAITS,
  alternateRacialTraitsForRace,
  type AlternateRacialTrait,
} from "./racial-traits.js";
export {
  BLOODLINES,
  BLOODLINE_TAGS,
  bloodlineVariantLabel,
  type BloodlineDef,
  type BloodlinePower,
  type BloodlinePowerLevel,
  type BloodlineResourcePool,
  type BloodlineVariantOption,
} from "./bloodlines.js";
export {
  ARCANIST_EXPLOITS,
  ARCANIST_EXPLOIT_IDS,
  type ArcanistExploitDef,
} from "./arcanist-exploits.js";
export {
  ORACLE_MYSTERIES,
  ORACLE_MYSTERY_TAGS,
  type OracleMysteryDef,
  type OracleMysteryBonusSpell,
} from "./oracle-mysteries.js";
export {
  ORACLE_CURSES,
  ORACLE_CURSE_TAGS,
  type OracleCurseDef,
  type OracleCurseBonusSpell,
} from "./oracle-curses.js";
export {
  FEAT_EFFECTS,
  SITUATIONAL_FEAT_EFFECTS,
  featNameSlug,
  type FeatChange,
  type StaticFeatEntry,
  type ChoiceFeatEntry,
  type SituationalFeatEffect,
  type SituationalFeatEntry,
  type FeatEntry,
} from "./feat-effects.js";
export { FAMILIARS, FAMILIAR_KINDS, type FamiliarDef } from "./familiars.js";
export {
  BASE_FAMILIARS,
  BASE_FAMILIAR_IDS,
  deriveFamiliar,
  familiarIntScore,
  familiarNaturalArmorAdj,
  familiarSpecialAbilities,
  FAMILIAR_SPECIAL_ABILITIES,
  type BaseFamiliar,
  type FamiliarNaturalAttack,
  type FamiliarMasterInputs,
  type FamiliarSpecialAbility,
  type FlyManeuverability,
  type DerivedFamiliar,
  type DerivedFamiliarAc,
  type DerivedFamiliarAttack,
  type DerivedFamiliarSkill,
} from "./familiar.js";
export {
  BASE_COMPANIONS,
  BASE_COMPANION_IDS,
  ANIMAL_COMPANION_PROGRESSION,
  COMPANION_SPECIAL_ABILITY_DETAIL,
  COMPANION_ABILITY_INCREASE_LEVELS,
  deriveCompanion,
  companionEffectiveLevel,
  companionProgressionRow,
  companionSpecialAbilityNames,
  companionAbilityIncreaseSlots,
  type BaseCompanion,
  type CompanionAttack,
  type CompanionGrowthStep,
  type CompanionProgressionRow,
  type DerivedCompanion,
  type DerivedCompanionAc,
  type DerivedCompanionAttack,
  type DerivedCompanionSkill,
  type FlyManeuverability as CompanionFlyManeuverability,
} from "./companion.js";
export {
  routeSharedBuffs,
  applySharedAbilityBonuses,
  applySharedSpeeds,
  type AcCandidate,
  type RoutedSharedBuffs,
} from "./shared-creature-buffs.js";
export { advanceRounds, type AdvanceResult } from "./duration.js";
export { deriveResourcePools, type DerivedResourcePool } from "./resources.js";
export {
  resolveClassFeatures,
  archetypeSwappedUuids,
  activeArchetypeSwaps,
  archetypeHasModeledEffects,
  archetypeModeledEffectTier,
  type ArchetypeEffectTier,
  barbarianDamageReductionReplaced,
  collectGrantedFeatures,
  type ResolvedClassFeatures,
  type GrantedFeature,
} from "./archetypes.js";
export { ARCHETYPE_FEATURE_EFFECTS, type ArchetypeFeatureEffect } from "./archetype-effects.js";
export {
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  ARCHETYPE_FEATURE_CLASSIFICATION,
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
  type ExtractedArchetypeFeatureEffect,
  type ExtractionConfidence,
  type ArchetypeFeatureClassificationBucket,
  type ArchetypeFeatureClassificationEntry,
} from "./archetype-extracted/index.js";
export {
  resolveArchetypeFeatureEffect,
  type ArchetypeEffectSource,
  type ResolvedArchetypeFeatureEffect,
} from "./archetype-effects-resolve.js";
export {
  isTargetApplied,
  unappliedChanges,
  unappliedTargetLabel,
  UNAPPLIED_TARGET_LABELS,
} from "./targets.js";
export {
  FAVORED_ENEMY_TYPES,
  FAVORED_TERRAIN_TYPES,
  COMBAT_STYLES,
  rangerLevel,
  favoredEnemySlots,
  favoredTerrainSlots,
  favoredBonusBudget,
  computeRanger,
  type RangerChoice,
  type CombatStyle,
} from "./ranger.js";
export { computeDefenses } from "./defenses.js";
export {
  carryingCapacity,
  sizeCarryingMultiplier,
  loadThresholds,
  loadTier,
  encumbranceLevelFor,
  loadMaxDexCap,
  loadAcp,
  loadTierLabel,
  encumberedSpeed,
  gearUnitWeight,
  totalCarriedWeight,
  computeEncumbrance,
} from "./encumbrance.js";
export {
  WEAPON_GROUPS,
  isKnownWeaponGroup,
  normalizeWeaponGroup,
  type WeaponGroup,
} from "./weapon-groups.js";

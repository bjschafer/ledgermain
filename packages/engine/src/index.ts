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
export {
  buildRollData,
  abilityMod,
  totalLevel,
  type AbilityView,
} from "./rolldata.js";
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
  type SpellProgression,
  type SpellKnownProgression,
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
export { CONDITIONS, CONDITION_IDS, type ConditionDef } from "./conditions.js";
export { TRAITS, TRAIT_IDS, type TraitDef, type TraitCategory } from "./traits.js";
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
export { advanceRounds, type AdvanceResult } from "./duration.js";
export { deriveResourcePools, type DerivedResourcePool } from "./resources.js";
export {
  resolveClassFeatures,
  archetypeSwappedUuids,
  collectGrantedFeatures,
  type ResolvedClassFeatures,
  type GrantedFeature,
} from "./archetypes.js";
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

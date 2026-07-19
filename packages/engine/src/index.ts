/**
 * `@pf1/engine` — the pure, framework-agnostic PF1 rules engine.
 *
 *  - {@link compute}: CharacterDoc + RefData → DerivedSheet (static sheet).
 *  - Formula DSL evaluator: {@link evaluateFormula}, {@link parseFormula}.
 *  - Typed bonus-stacking resolver: {@link resolveStack}.
 */

export { compute } from "./compute.js";
export {
  ABILITY_SUBSTITUTIONS,
  collectAbilitySubstitutions,
  resolveSubstitution,
  type AbilitySubstitutionDef,
  type ActiveAbilitySubstitution,
  type ResolvedAbility,
  type SubstitutionSlot,
} from "./ability-substitution.js";
export {
  BONUS_CLASS_SKILL_GRANTS,
  chosenBonusClassSkills,
  collectBonusClassSkillGrants,
  type ActiveBonusClassSkillGrant,
  type BonusClassSkillGrantDef,
} from "./bonus-class-skills.js";
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
  formatDiceFormula,
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
  WEAPON_TRAINING_LEVELS,
  weaponTrainingBonus,
  smiteGoodLabel,
  flurryOfBlowsUnchainedLabel,
  painfulStareBonus,
  painfulStareLabel,
  hypnoticStarePenalty,
  hypnoticStareLabel,
  kineticBlastDetail,
  type KineticBlastDetail,
  burnPerRoundLimit,
  burnDetailLabel,
  kineticOverflowBonus,
  kineticOverflowLabel,
  type KineticOverflowBonus,
  metakinesisLabel,
  gatherPowerLabel,
  infusionSpecializationReduction,
  internalBufferMax,
  bombDamageDetail,
  type BombDamageDetail,
  fiendishBoonWeaponDetail,
  fiendishBoonLabel,
  type FiendishBoonWeaponDetail,
  antipaladinDamageReduction,
  type AntipaladinDrDetail,
  ROGUE_FINESSE_TRAINING_LEVELS,
  ROGUE_SKILL_UNLOCK_LEVELS,
  studiedCombatBonus,
  studiedCombatLabel,
  studiedStrikeDice,
  type StudiedStrikeDetail,
  hiddenStrikeDice,
  type HiddenStrikeDetail,
  shifterClawsDamageDie,
  shifterClawsLabel,
  type ShifterClawsDetail,
} from "./tables.js";
export { CONDITIONS, CONDITION_IDS, CONDITION_LADDERS, type ConditionDef } from "./conditions.js";
export { TRAITS, TRAIT_IDS, type TraitDef, type TraitCategory } from "./traits.js";
export {
  RACIAL_TRAITS,
  alternateRacialTraitsForRace,
  effectiveRaceContextNotes,
  raceContextNotesFor,
  hasSlowAndSteady,
  raceHasSlowAndSteady,
  slowAndSteadySuppressedBy,
  SLOW_AND_STEADY_SUPPRESS_TARGET,
  type AlternateRacialTrait,
  type RacialTraitResourcePool,
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
  BLOODRAGER_BLOODLINES,
  BLOODRAGER_BLOODLINE_TAGS,
  bloodragerBloodlineVariantLabel,
  type BloodragerBloodlineDef,
  type BloodragerBloodlinePower,
  type BloodragerBloodlinePowerLevel,
  type BloodragerBloodlineVariantOption,
  type BloodragerBonusSpell,
} from "./bloodrager-bloodlines.js";
export { BLOODRAGE_BUFF, BLOODRAGE_BUFF_ID } from "./bloodrage.js";
export {
  ARCANIST_EXPLOITS,
  ARCANIST_EXPLOIT_IDS,
  type ArcanistExploitDef,
} from "./arcanist-exploits.js";
export { MAGUS_ARCANA, MAGUS_ARCANA_IDS, type MagusArcanaDef } from "./magus-arcana.js";
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
  ORACLE_REVELATIONS,
  ORACLE_REVELATION_IDS,
  revelationsForMystery,
  ORACLE_MYSTERY_FINAL_REVELATIONS,
  type OracleRevelationDef,
  type OracleMysteryFinalRevelation,
} from "./oracle-revelations.js";
export {
  WITCH_PATRONS,
  WITCH_PATRON_TAGS,
  type WitchPatronDef,
  type WitchPatronBonusSpell,
} from "./witch-patrons.js";
export {
  WITCH_HEXES,
  WITCH_HEX_IDS,
  hexesForTier,
  witchHexDC,
  type WitchHexDef,
  type WitchHexTier,
} from "./witch-hexes.js";
export {
  ALCHEMIST_DISCOVERIES,
  ALCHEMIST_DISCOVERY_IDS,
  type AlchemistDiscoveryDef,
} from "./alchemist-discoveries.js";
export { MONK_KI_POWERS, MONK_KI_POWER_IDS, type MonkKiPowerDef } from "./monk-ki-powers.js";
export {
  MONK_STYLE_STRIKES,
  MONK_STYLE_STRIKE_IDS,
  type MonkStyleStrikeDef,
} from "./monk-style-strikes.js";
export { ROGUE_TALENTS, ROGUE_TALENT_IDS, type RogueTalentDef } from "./rogue-talents.js";
export {
  ANTIPALADIN_CRUELTIES,
  ANTIPALADIN_CRUELTY_IDS,
  crueltiesForTier,
  antipaladinCrueltyDC,
  type AntipaladinCrueltyDef,
  type AntipaladinCrueltyTier,
} from "./antipaladin-cruelties.js";
export {
  NINJA_TRICKS,
  NINJA_TRICK_IDS,
  tricksForTier,
  type NinjaTrickDef,
  type NinjaTrickTier,
} from "./ninja-tricks.js";
export {
  INVESTIGATOR_TALENTS,
  INVESTIGATOR_TALENT_IDS,
  type InvestigatorTalentDef,
  type InvestigatorTalentCategory,
} from "./investigator-talents.js";
export {
  VIGILANTE_SOCIAL_TALENTS,
  VIGILANTE_SOCIAL_TALENT_IDS,
  VIGILANTE_TALENTS,
  VIGILANTE_TALENT_IDS,
  vigilanteTalentsForSpecialization,
  type VigilanteTalentDef,
  type VigilanteTalentEntry,
  type VigilanteSpecialization,
  type VigilanteTalentGate,
} from "./vigilante-talents.js";
export { SHIFTER_ASPECTS, SHIFTER_ASPECT_IDS, type ShifterAspectDef } from "./shifter-aspects.js";
export {
  OCCULTIST_SCHOOLS,
  OCCULTIST_SCHOOL_TAGS,
  OCCULTIST_APPLIED_RESONANT_SCHOOLS,
  OCCULTIST_PHYSICAL_ABILITIES,
  findOccultistFocusPower,
  type OccultistSchoolDef,
  type OccultistBaseFocusPower,
  type OccultistFocusPowerDef,
  type OccultistResonantPower,
} from "./occultist-implements.js";
export {
  KINETICIST_ELEMENTS,
  KINETICIST_ELEMENT_TAGS,
  KINETICIST_COMPOSITE_BLASTS,
  eligibleCompositeBlasts,
  type KineticistElementDef,
  type KineticistSimpleBlast,
  type KineticistDefenseDef,
  type KineticistBasicUtilityDef,
  type KineticistCompositeBlastDef,
  type KineticistDamageType,
} from "./kineticist-elements.js";
export {
  KINETICIST_WILD_TALENTS,
  KINETICIST_UNIVERSAL_TALENT_IDS,
  findKineticistWildTalent,
  wildTalentsForElement,
  minKineticistLevelForTalent,
  type KineticistWildTalentDef,
  type KineticistWildTalentCategory,
  type KineticistInfusionKind,
} from "./kineticist-wild-talents.js";
export {
  PSYCHIC_DISCIPLINES,
  PSYCHIC_DISCIPLINE_TAGS,
  type PsychicDisciplineDef,
  type PsychicDisciplineBonusSpell,
  type PsychicDisciplinePower,
} from "./psychic-disciplines.js";
export {
  PHRENIC_AMPLIFICATIONS,
  PHRENIC_AMPLIFICATION_IDS,
  amplificationsForTier as phrenicAmplificationsForTier,
  type PhrenicAmplificationDef,
  type PhrenicAmplificationTier,
} from "./phrenic-amplifications.js";
export {
  MESMERIST_TRICKS,
  MESMERIST_TRICK_IDS,
  tricksForTier as mesmeristTricksForTier,
  type MesmeristTrickDef,
  type MesmeristTrickTier,
} from "./mesmerist-tricks.js";
export {
  MESMERIST_BOLD_STARES,
  MESMERIST_BOLD_STARE_IDS,
  boldStareRiderSummary,
  type MesmeristBoldStareDef,
} from "./mesmerist-bold-stares.js";
export {
  SHAMAN_SPIRITS,
  SHAMAN_SPIRIT_TAGS,
  hexesForSpirit,
  findShamanHex,
  type ShamanSpiritDef,
  type ShamanSpiritMagicSpell,
  type ShamanSpiritAbility,
  type ShamanSpiritHex,
} from "./shaman-spirits.js";
export {
  MEDIUM_SPIRITS,
  MEDIUM_SPIRIT_TAGS,
  MEDIUM_SPIRIT_POWER_LEVELS,
  mediumSpiritBonus,
  type MediumSpiritDef,
  type MediumSpiritPower,
  type MediumSpiritPowerTier,
  type MediumSpiritBonusTarget,
} from "./medium-spirits.js";
export {
  GUNSLINGER_DEEDS,
  SWASHBUCKLER_DEEDS,
  deedsForClass,
  preciseStrikeBonus,
  type DeedDef,
} from "./deeds.js";
export {
  CAVALIER_ORDERS,
  SAMURAI_ORDERS,
  orderByTag,
  ordersForClass,
  challengeRiderAt,
  challengeRiderText,
  type OrderDef,
  type OrderAbility,
} from "./cavalier-orders.js";
export {
  FEAT_EFFECTS,
  FEAT_POOL_EFFECTS,
  SITUATIONAL_FEAT_EFFECTS,
  featNameSlug,
  type FeatChange,
  type StaticFeatEntry,
  type ChoiceFeatEntry,
  type SituationalFeatEffect,
  type SituationalFeatEntry,
  type FeatEntry,
  type FeatPoolEffect,
} from "./feat-effects.js";
export {
  FEAT_EFFECTS_EXTRACTED,
  type ExtractedFeatEntry,
  type ExtractedStaticFeatEntry,
  type ExtractedChoiceFeatEntry,
} from "./feat-effects-extracted.js";
export {
  resolveFeatEffect,
  type FeatEffectSource,
  type ResolvedFeatEffect,
} from "./feat-effects-resolve.js";
export {
  FEAT_CLASSIFICATION,
  type FeatClassificationBucket,
  type FeatClassificationEntry,
} from "./feat-classification.js";
export {
  METAMAGIC_FEATS,
  metamagicDef,
  metamagicDefByName,
  isMetamagicFeat,
  type MetamagicDef,
} from "./metamagic.js";
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
  MOUNT_SPECIES_BY_RIDER_SIZE,
  ANIMAL_COMPANION_PROGRESSION,
  COMPANION_SPECIAL_ABILITY_DETAIL,
  COMPANION_ABILITY_INCREASE_LEVELS,
  deriveCompanion,
  companionEffectiveLevel,
  companionProgressionRow,
  companionSpecialAbilityNames,
  companionAbilityIncreaseSlots,
  companionSkillPoints,
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
  PHANTOM_BASE_ABILITIES,
  EMOTIONAL_FOCI,
  EMOTIONAL_FOCUS_IDS,
  PHANTOM_PROGRESSION,
  PHANTOM_SPECIAL_ABILITY_DETAIL,
  PHANTOM_ABILITY_INCREASE_LEVELS,
  derivePhantom,
  phantomProgressionRow,
  phantomSpecialAbilityNames,
  phantomAbilityIncreaseSlots,
  phantomSlamDamage,
  type EmotionalFocus,
  type PhantomProgressionRow,
  type DerivedPhantom,
  type DerivedPhantomAc,
  type DerivedPhantomAttack,
  type DerivedPhantomSkill,
} from "./phantom.js";
export {
  EIDOLON_BASE_FORMS,
  EIDOLON_BASE_FORM_IDS,
  EIDOLON_PROGRESSION,
  EIDOLON_EVOLUTIONS,
  EIDOLON_EVOLUTION_IDS,
  EIDOLON_SPECIAL_ABILITY_DETAIL,
  EIDOLON_UNIVERSAL_ABILITIES,
  deriveEidolon,
  eidolonStartingAbilities,
  eidolonProgressionRow,
  eidolonSpecialAbilityNames,
  eidolonSummonerLevel,
  type EidolonBaseForm,
  type EidolonAttackGrant,
  type EidolonProgressionRow,
  type EidolonEvolutionDef,
  type EidolonEvolutionKind,
  type EidolonSpeedGrant,
  type DerivedEidolon,
  type DerivedEidolonAc,
  type DerivedEidolonAttack,
  type DerivedEidolonSkill,
} from "./eidolon.js";
export {
  EIDOLON_UNCHAINED_POOL,
  EIDOLON_UNCHAINED_ABILITY_INCREASE_LEVELS,
  EIDOLON_SUBTYPES,
  EIDOLON_SUBTYPE_IDS,
  eidolonUnchainedProgressionRow,
  eidolonUnchainedSpecialAbilityNames,
  eidolonUnchainedAbilityIncreaseSlots,
  eidolonVariant,
  eidolonSubtypeGrantedEvolutions,
  eidolonEvolutionPoolAvailable,
  type EidolonSubtypeGrant,
  type EidolonSubtypeForm,
  type EidolonSubtypeDef,
} from "./eidolon-unchained.js";
export {
  routeSharedBuffs,
  applySharedAbilityBonuses,
  applySharedSpeeds,
  type AcCandidate,
  type RoutedSharedBuffs,
} from "./shared-creature-buffs.js";
export {
  classifyNaturalAttacks,
  secondaryAttackPenalty,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  type NaturalAttackType,
} from "./natural-attacks.js";
export { advanceRounds, type AdvanceResult } from "./duration.js";
export { deriveResourcePools, type DerivedResourcePool } from "./resources.js";
export type { ToggleBuffOption } from "./toggle-buffs.js";
export {
  INQUISITOR_JUDGMENTS,
  maxSimultaneousJudgments,
  judgmentPoolDetail,
  judgmentToggleOptions,
  type JudgmentDef,
} from "./judgments.js";
export { SKALD_INSPIRED_RAGE, RAGING_SONG_DETAIL } from "./raging-song.js";
export {
  resolveClassFeatures,
  archetypeSwappedUuids,
  activeArchetypeSwaps,
  archetypeHasModeledEffects,
  archetypeModeledEffectTier,
  type ArchetypeEffectTier,
  barbarianDamageReductionReplaced,
  antipaladinDamageReductionReplaced,
  weaponTrainingReplaced,
  collectGrantedFeatures,
  type ResolvedClassFeatures,
  type GrantedFeature,
} from "./archetypes.js";
export { ARCHETYPE_FEATURE_EFFECTS, type ArchetypeFeatureEffect } from "./archetype-effects.js";
export {
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  ARCHETYPE_FEATURE_CLASSIFICATION,
  // Per-class slices, re-exported directly for callers that want one class's
  // table without importing the merged aggregator (e.g. fixture tests
  // spot-checking a single class) — consistently exported for every class in
  // `archetype-extracted/`, not just the wave that happened to add them
  // first (cosmetic cleanup, issue #61).
  ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED,
  ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION,
  BARBARIAN_ARCHETYPE_EFFECTS_EXTRACTED,
  BARBARIAN_ARCHETYPE_FEATURE_CLASSIFICATION,
  BARD_ARCHETYPE_EFFECTS_EXTRACTED,
  BARD_ARCHETYPE_FEATURE_CLASSIFICATION,
  DRUID_ARCHETYPE_EFFECTS_EXTRACTED,
  DRUID_ARCHETYPE_FEATURE_CLASSIFICATION,
  FIGHTER_ARCHETYPE_EFFECTS_EXTRACTED,
  FIGHTER_ARCHETYPE_FEATURE_CLASSIFICATION,
  MAGUS_ARCHETYPE_EFFECTS_EXTRACTED,
  MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION,
  MONK_ARCHETYPE_EFFECTS_EXTRACTED,
  MONK_ARCHETYPE_FEATURE_CLASSIFICATION,
  ORACLE_ARCHETYPE_EFFECTS_EXTRACTED,
  ORACLE_ARCHETYPE_FEATURE_CLASSIFICATION,
  PALADIN_ARCHETYPE_EFFECTS_EXTRACTED,
  PALADIN_ARCHETYPE_FEATURE_CLASSIFICATION,
  RANGER_ARCHETYPE_EFFECTS_EXTRACTED,
  RANGER_ARCHETYPE_FEATURE_CLASSIFICATION,
  ROGUE_ARCHETYPE_EFFECTS_EXTRACTED,
  ROGUE_ARCHETYPE_FEATURE_CLASSIFICATION,
  SORCERER_ARCHETYPE_EFFECTS_EXTRACTED,
  SORCERER_ARCHETYPE_FEATURE_CLASSIFICATION,
  WIZARD_ARCHETYPE_EFFECTS_EXTRACTED,
  WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION,
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
export { MONK_BONUS_FEAT_SLUGS } from "./monk.js";
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
export {
  deriveProficiencies,
  isWeaponProficient,
  isArmorTypeProficient,
  isShieldTierProficient,
} from "./proficiency.js";
export { BUFF_CHANGE_PATCHES } from "./buff-effects.js";
export {
  RAGE_POWERS,
  RAGE_POWER_IDS,
  ragePowersForEdition,
  type RagePowerDef,
  type RagePowerEdition,
} from "./rage-powers.js";
export {
  POLYMORPH_TIERS,
  POLYMORPH_TIER_IDS,
  polymorphFormOption,
  wildShapeTiersForLevel,
  computePolymorphAttacks,
  type PolymorphCreatureType,
  type PolymorphElement,
  type PolymorphTier,
  type PolymorphAbilityAdjustment,
  type PolymorphFormOption,
  type PolymorphTierDef,
  type PolymorphNaturalAttackInput,
  type ResolvedPolymorphAttack,
} from "./polymorph.js";

/**
 * `@pf1/engine` — the pure, framework-agnostic PF1 rules engine.
 *
 *  - {@link compute}: CharacterDoc + RefData → DerivedSheet (static sheet).
 *  - Formula DSL evaluator: {@link evaluateFormula}, {@link parseFormula}.
 *  - Typed bonus-stacking resolver: {@link resolveStack}.
 */

export { compute, armorPieceAcp } from "./compute.js";
export {
  ABILITY_DC_FAMILIES,
  abilityDCTarget,
  computeAbilityDCs,
  type AbilityDCFamily,
  type ComputedAbilityDCs,
} from "./ability-dcs.js";
export {
  SPELL_SCHOOLS,
  spellDCTarget,
  clCheckTarget,
  computeSpellDCs,
  computeClChecks,
  type SpellSchoolDef,
} from "./spell-dcs.js";
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
  fractionalBab,
  fractionalSave,
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
  shamanSpiritMagicSlotLevels,
  type SpellProgression,
  type SpellKnownProgression,
  type SpellPreparedProgression,
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
  kineticOverflowUpgradeLabel,
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
export {
  TRAITS,
  TRAIT_IDS,
  mergedTraits,
  resolveTraitDef,
  traitGrantedClassSkills,
  type TraitDef,
  type TraitCategory,
} from "./traits.js";
export {
  TRAIT_EFFECTS_EXTRACTED,
  type ExtractedTraitEntry,
  TRAIT_CHOICES,
  type TraitChoiceEntry,
  type TraitChoiceFamily,
} from "./trait-effects-extracted.js";
export {
  RACIAL_TRAITS,
  alternateRacialTraitsForRace,
  effectiveRaceContextNotes,
  raceContextNotesFor,
  hasSlowAndSteady,
  raceHasSlowAndSteady,
  slowAndSteadySuppressedBy,
  SLOW_AND_STEADY_SUPPRESS_TARGET,
  FLEXIBLE_ABILITY_SUPPRESS_TARGET,
  VENDORED_STANDARD_TRAIT_TARGETS,
  vendoredTraitSuppressTargets,
  VENDORED_STANDARD_TRAIT_NOTES,
  vendoredTraitSuppressNoteFragments,
  vendoredTraitFullyHandled,
  type AlternateRacialTrait,
  type RacialTraitResourcePool,
} from "./racial-traits.js";
export {
  BLOODLINES,
  BLOODLINE_TAGS,
  bloodlineMovesNumbers,
  bloodlineVariantLabel,
  mergedSorcererBloodlineCatalog,
  resolveSorcererBloodline,
  type BloodlineDef,
  type BloodlinePower,
  type BloodlinePowerLevel,
  type BloodlineResourcePool,
  type BloodlineVariantOption,
  type MergedSorcererBloodlineEntry,
} from "./bloodlines.js";
export {
  BLOODLINE_MUTATIONS,
  mutatedBloodlineDef,
  mutationsForBloodlineTag,
  parentBloodlineTagFor,
  resolveBloodlineMutation,
  resolveSorcererBloodlineOrMutation,
  type BloodlineMutationDef,
  type BloodlineMutationSwap,
} from "./bloodline-mutations.js";
export {
  BLOODRAGER_BLOODLINES,
  BLOODRAGER_BLOODLINE_TAGS,
  bloodragerBloodlineMovesNumbers,
  bloodragerBloodlineVariantLabel,
  mergedBloodragerBloodlineCatalog,
  resolveBloodragerBloodline,
  type BloodragerBloodlineDef,
  type BloodragerBloodlinePower,
  type BloodragerBloodlinePowerLevel,
  type BloodragerBloodlineVariantOption,
  type BloodragerBonusSpell,
  type MergedBloodragerBloodlineEntry,
} from "./bloodrager-bloodlines.js";
export { BLOODRAGE_BUFF, BLOODRAGE_BUFF_ID } from "./bloodrage.js";
export { FALSE_LIFE_BUFF, FALSE_LIFE_BUFF_ID } from "./false-life.js";
export { COGNATOGEN_BUFFS, COGNATOGEN_BUFF_IDS, COGNATOGEN_DISCOVERY_ID } from "./cognatogen.js";
export {
  ARCANIST_EXPLOITS,
  ARCANIST_EXPLOIT_IDS,
  resolveArcanistExploit,
  mergedArcanistExploitCatalog,
  type ArcanistExploitDef,
  type MergedArcanistExploitEntry,
} from "./arcanist-exploits.js";
export {
  MAGUS_ARCANA,
  MAGUS_ARCANA_IDS,
  resolveMagusArcanum,
  mergedMagusArcanaCatalog,
  type MagusArcanaDef,
  type MergedMagusArcanaEntry,
} from "./magus-arcana.js";
export {
  ORACLE_MYSTERIES,
  ORACLE_MYSTERY_TAGS,
  mergedOracleMysteryCatalog,
  resolveOracleMystery,
  type OracleMysteryDef,
  type OracleMysteryBonusSpell,
  type MergedOracleMysteryEntry,
} from "./oracle-mysteries.js";
export {
  ORACLE_CURSES,
  ORACLE_CURSE_TAGS,
  mergedOracleCurseCatalog,
  resolveOracleCurse,
  type OracleCurseDef,
  type OracleCurseBonusSpell,
  type MergedOracleCurseEntry,
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
  mergedWitchPatronCatalog,
  resolveWitchPatron,
  parseVendoredPatronSpells,
  parseVendoredPatronThemeInfo,
  type WitchPatronDef,
  type WitchPatronBonusSpell,
  type MergedWitchPatronEntry,
  type WitchPatronThemeInfo,
  type WitchPatronSpellChange,
} from "./witch-patrons.js";
export {
  WITCH_HEXES,
  WITCH_HEX_IDS,
  hexesForTier,
  witchHexDC,
  resolveWitchHex,
  mergedWitchHexCatalog,
  type WitchHexDef,
  type WitchHexTier,
  type MergedWitchHexEntry,
} from "./witch-hexes.js";
export {
  SAVE_DC_PHRASES,
  resolveSaveDCText,
  saveDCContext,
  type SaveDCContext,
} from "./feature-save-dc.js";
export {
  SHAMAN_GENERAL_HEXES,
  SHAMAN_GENERAL_HEX_IDS,
  mergedShamanHexCatalog,
  resolveGeneralShamanHex,
  type ShamanGeneralHexDef,
  type ShamanGeneralHexEntry,
} from "./shaman-hexes.js";
export {
  ALCHEMIST_DISCOVERIES,
  ALCHEMIST_DISCOVERY_IDS,
  mergedAlchemistDiscoveryCatalog,
  resolveAlchemistDiscovery,
  type AlchemistDiscoveryDef,
  type MergedAlchemistDiscoveryEntry,
} from "./alchemist-discoveries.js";
export {
  MONK_KI_POWERS,
  MONK_KI_POWER_IDS,
  mergedMonkKiPowerCatalog,
  resolveMonkKiPower,
  type MonkKiPowerDef,
  type MergedMonkKiPowerEntry,
} from "./monk-ki-powers.js";
export {
  MONK_STYLE_STRIKES,
  MONK_STYLE_STRIKE_IDS,
  mergedMonkStyleStrikeCatalog,
  resolveMonkStyleStrike,
  type MonkStyleStrikeDef,
  type MergedMonkStyleStrikeEntry,
} from "./monk-style-strikes.js";
export {
  ROGUE_TALENTS,
  ROGUE_TALENT_IDS,
  mergedRogueTalentCatalog,
  resolveRogueTalent,
  type RogueTalentDef,
  type MergedRogueTalentEntry,
} from "./rogue-talents.js";
export {
  SLAYER_TALENTS,
  SLAYER_TALENT_IDS,
  isAdvancedSlayerTalent,
  resolveSlayerTalent,
  mergedSlayerTalentCatalog,
  type SlayerTalentDef,
  type MergedSlayerTalentEntry,
} from "./slayer-talents.js";
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
  mergedNinjaTrickCatalog,
  resolveNinjaTrick,
  type NinjaTrickDef,
  type NinjaTrickTier,
  type MergedNinjaTrickEntry,
} from "./ninja-tricks.js";
export {
  INVESTIGATOR_TALENTS,
  INVESTIGATOR_TALENT_IDS,
  resolveInvestigatorTalent,
  mergedInvestigatorTalentCatalog,
  type InvestigatorTalentDef,
  type InvestigatorTalentCategory,
  type MergedInvestigatorTalentEntry,
} from "./investigator-talents.js";
export {
  VIGILANTE_SOCIAL_TALENTS,
  VIGILANTE_SOCIAL_TALENT_IDS,
  VIGILANTE_TALENTS,
  VIGILANTE_TALENT_IDS,
  vigilanteTalentsForSpecialization,
  mergedVigilanteSocialTalentCatalog,
  mergedVigilanteTalentCatalog,
  resolveVigilanteSocialTalent,
  resolveVigilanteTalent,
  type VigilanteTalentDef,
  type VigilanteTalentEntry,
  type VigilanteSpecialization,
  type VigilanteTalentGate,
  type MergedVigilanteSocialTalentEntry,
  type MergedVigilanteTalentEntry,
} from "./vigilante-talents.js";
export {
  SHIFTER_ASPECTS,
  SHIFTER_ASPECT_IDS,
  mergedShifterAspectCatalog,
  resolveShifterAspect,
  type ShifterAspectDef,
  type MergedShifterAspectEntry,
} from "./shifter-aspects.js";
export {
  OCCULTIST_SCHOOLS,
  OCCULTIST_SCHOOL_TAGS,
  OCCULTIST_APPLIED_RESONANT_SCHOOLS,
  OCCULTIST_PHYSICAL_ABILITIES,
  findOccultistFocusPower,
  resolveOccultistImplement,
  mergedOccultistImplementCatalog,
  type OccultistSchoolDef,
  type OccultistBaseFocusPower,
  type OccultistFocusPowerDef,
  type OccultistResonantPower,
  type MergedOccultistImplementEntry,
  type MergedOccultistImplementHandEntry,
  type MergedOccultistImplementVendoredEntry,
} from "./occultist-implements.js";
export {
  KINETICIST_ELEMENTS,
  KINETICIST_ELEMENT_TAGS,
  KINETICIST_COMPOSITE_BLASTS,
  eligibleCompositeBlasts,
  elementSimpleBlasts,
  chosenSimpleBlast,
  knownSimpleBlasts,
  mergedCompositeBlastCatalog,
  type KineticistElementDef,
  type KineticistSimpleBlast,
  type KineticistDefenseDef,
  type KineticistBasicUtilityDef,
  type KineticistCompositeBlastDef,
  type KineticistDamageType,
  type MergedCompositeBlastEntry,
} from "./kineticist-elements.js";
export {
  ELEMENTAL_DEFENSE_LEVEL,
  resolveKineticistDefense,
  type KineticistDefenseState,
  type ResolvedKineticistDefense,
} from "./kineticist-defense.js";
export {
  KINETIC_BLAST_WEAPON_GROUP,
  computeKineticBlasts,
  BLAST_SCOPED_WILD_TALENT_IDS,
  kineticBlastConDamage,
  kineticBlastDiceCount,
  type KineticBlastContext,
} from "./kinetic-blast.js";
export {
  INFUSION_BLAST_EFFECTS,
  KINETICIST_METAKINESIS,
  gatherPowerModeLabel,
  gatherPowerReduction,
  infusionSaveAbility,
  kineticBlastEffectiveSpellLevel,
  metakinesisBurn,
  resolveBlastBurn,
  resolveLoadoutInfusions,
  wildTalentSaveDc,
  type BlastBurnBreakdown,
  type BlastBurnInput,
  type KineticistInfusionBlastEffect,
  type KineticistMetakinesisDef,
} from "./kineticist-infusions.js";
export {
  KINETICIST_WILD_TALENTS,
  KINETICIST_UNIVERSAL_TALENT_IDS,
  findKineticistWildTalent,
  resolveKineticistWildTalent,
  mergedKineticistWildTalentCatalog,
  wildTalentsForElement,
  minKineticistLevelForTalent,
  wildTalentPrereqText,
  wildTalentRequirementFragments,
  type KineticistWildTalentDef,
  type KineticistWildTalentCategory,
  type KineticistInfusionKind,
  type MergedKineticistWildTalentEntry,
  type KineticistTalentRequirement,
} from "./kineticist-wild-talents.js";
export {
  PSYCHIC_DISCIPLINES,
  PSYCHIC_DISCIPLINE_TAGS,
  resolvePsychicDiscipline,
  mergedPsychicDisciplineCatalog,
  type PsychicDisciplineDef,
  type PsychicDisciplineBonusSpell,
  type PsychicDisciplinePower,
  type MergedPsychicDisciplineEntry,
  type MergedPsychicDisciplineHandEntry,
  type MergedPsychicDisciplineVendoredEntry,
} from "./psychic-disciplines.js";
export {
  PHRENIC_AMPLIFICATIONS,
  PHRENIC_AMPLIFICATION_IDS,
  amplificationsForTier as phrenicAmplificationsForTier,
  resolvePhrenicAmplification,
  mergedPhrenicAmplificationCatalog,
  type PhrenicAmplificationDef,
  type PhrenicAmplificationTier,
  type MergedPhrenicAmplificationEntry,
} from "./phrenic-amplifications.js";
export {
  MESMERIST_TRICKS,
  MESMERIST_TRICK_IDS,
  tricksForTier as mesmeristTricksForTier,
  resolveMesmeristTrick,
  mergedMesmeristTrickCatalog,
  type MesmeristTrickDef,
  type MesmeristTrickTier,
  type MergedMesmeristTrickEntry,
} from "./mesmerist-tricks.js";
export {
  MESMERIST_BOLD_STARES,
  MESMERIST_BOLD_STARE_IDS,
  boldStareRiderSummary,
  resolveMesmeristBoldStare,
  mergedMesmeristBoldStareCatalog,
  type MesmeristBoldStareDef,
  type MergedMesmeristBoldStareEntry,
} from "./mesmerist-bold-stares.js";
export {
  SHAMAN_SPIRITS,
  SHAMAN_SPIRIT_TAGS,
  SHAMAN_GREATER_SPIRIT_LEVEL,
  SHAMAN_TRUE_SPIRIT_LEVEL,
  SHAMAN_MANIFESTATION_LEVEL,
  hexesForSpirit,
  findShamanHex,
  mergedShamanSpiritCatalog,
  resolveShamanSpirit,
  type ShamanSpiritDef,
  type ShamanSpiritMagicSpell,
  type ShamanSpiritAbility,
  type ShamanSpiritHex,
  type MergedShamanSpiritEntry,
} from "./shaman-spirits.js";
export {
  MEDIUM_SPIRITS,
  MEDIUM_SPIRIT_TAGS,
  MEDIUM_SPIRIT_POWER_LEVELS,
  mediumSpiritBonus,
  resolveMediumSpirit,
  mergedMediumSpiritCatalog,
  type MediumSpiritDef,
  type MediumSpiritPower,
  type MediumSpiritPowerTier,
  type MediumSpiritBonusTarget,
  type MergedMediumSpiritEntry,
  type MergedMediumSpiritHandEntry,
  type MergedMediumSpiritVendoredEntry,
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
  SPLATBOOK_ORDERS,
  orderByTag,
  ordersForClass,
  challengeRiderAt,
  challengeRiderText,
  mergedOrderCatalog,
  mergedOrdersForClass,
  resolveMergedOrder,
  type OrderDef,
  type OrderAbility,
  type MergedOrderEntry,
} from "./cavalier-orders.js";
export {
  FEAT_EFFECTS,
  FEAT_POOL_EFFECTS,
  SITUATIONAL_FEAT_EFFECTS,
  ENERGY_TYPES,
  featNameSlug,
  characterFeatSlugs,
  type FeatChange,
  type StaticFeatEntry,
  type ChoiceFeatEntry,
  type FeatChoiceOption,
  type SituationalFeatEffect,
  type SituationalFeatEntry,
  type FeatEntry,
  type FeatPoolEffect,
} from "./feat-effects.js";
export {
  TWF_CHAIN,
  TWF_CHAIN_SLUGS,
  brawlersFlurry,
  brawlersFlurryLabel,
  twoWeaponProfile,
  type GrantedTwfChain,
  type OffHandGrip,
  type TwfChainFeat,
  type TwoWeaponProfile,
} from "./two-weapon-fighting.js";
export {
  FEAT_EFFECTS_EXTRACTED,
  type ExtractedFeatEntry,
  type ExtractedStaticFeatEntry,
  type ExtractedChoiceFeatEntry,
} from "./feat-effects-extracted.js";
export { FEAT_EFFECTS_EXTRACTED_COMMUNITY } from "./feat-effects-extracted-community.js";
export {
  resolveFeatEffect,
  featGrantedClassSkills,
  type FeatEffectSource,
  type ResolvedFeatEffect,
} from "./feat-effects-resolve.js";
export {
  FEAT_CLASSIFICATION,
  type FeatClassificationBucket,
  type FeatClassificationEntry,
} from "./feat-classification.js";
export {
  FEAT_CLASSIFICATION_COMMUNITY,
  FEAT_CLASSIFICATION_COMMUNITY_NOTES,
} from "./feat-classification-community.js";
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
  familiarSpecies,
  type DerivedFamiliar,
  type DerivedFamiliarAc,
  type DerivedFamiliarAttack,
  type DerivedFamiliarSkill,
  type DerivedFamiliarSla,
} from "./familiar.js";
export {
  FAMILIAR_TEMPLATES,
  IMPROVED_FAMILIARS,
  isImprovedFamiliar,
  type CreatureDefenses,
  type FamiliarSlaDef,
  type FamiliarTemplate,
  type FamiliarTypeKind,
  type ImprovedFamiliar,
  type ImprovedFamiliarPrereq,
} from "./improved-familiars/index.js";
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
  COMPANION_EFFECT_FEATS,
  COMPANION_EFFECT_CLASS_FEATURES,
  COMPANION_EFFECT_ARCHETYPE_FEATURES,
  collectCompanionMasterEffects,
  type ArchetypeCompanionEffect,
  type ClassFeatureCompanionEffect,
  type CompanionLevelEffect,
  type CompanionMasterEffect,
  type ResolvedCompanionMasterEffects,
} from "./companion-master-effects/index.js";
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
  eidolonBaseFormIdsForVariant,
  foldEidolonGrantDefenses,
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
  type DerivedEidolonDefenses,
} from "./eidolon.js";
export {
  EIDOLON_UNCHAINED_POOL,
  EIDOLON_UNCHAINED_ABILITY_INCREASE_LEVELS,
  EIDOLON_CHOICE_ENERGIES,
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
export {
  advanceConditionRounds,
  advanceRounds,
  type AdvanceConditionsResult,
  type AdvanceResult,
} from "./duration.js";
export {
  deriveResourcePools,
  resourcePoolRollDataResources,
  type DerivedResourcePool,
} from "./resources.js";
export { resourceTagSlug } from "./resource-tag.js";
export type { ToggleBuffOption } from "./toggle-buffs.js";
export {
  INQUISITOR_JUDGMENTS,
  maxSimultaneousJudgments,
  judgmentPoolDetail,
  judgmentToggleOptions,
  type JudgmentDef,
} from "./judgments.js";
export {
  SKALD_INSPIRED_RAGE,
  SKALD_SONG_OF_MARCHING,
  SKALD_SONG_OF_STRENGTH,
  SKALD_DIRGE_OF_DOOM,
  SKALD_SONG_OF_THE_FALLEN,
  ragingSongToggleOptions,
  RAGING_SONG_DETAIL,
} from "./raging-song.js";
export {
  BARD_PERFORMANCES,
  bardicPerformanceToggleOptions,
  BARDIC_PERFORMANCE_DETAIL,
  type BardicPerformanceDef,
} from "./bardic-performances.js";
export { kiSpendToggleOptions, KI_POOL_DETAIL } from "./ki-spends.js";
export {
  arcanePoolToggleOptions,
  arcaneReservoirToggleOptions,
  ARCANE_POOL_DETAIL,
  ARCANE_RESERVOIR_DETAIL,
} from "./arcane-spends.js";
export {
  gritToggleOptions,
  panacheToggleOptions,
  GRIT_DETAIL,
  PANACHE_DETAIL,
} from "./grit-panache-spends.js";
export { CHANNEL_VARIANTS, channelVariantFor, type ChannelVariantDef } from "./channel-variants.js";
export { sacredWeaponToggleOptions, SACRED_WEAPON_DETAIL } from "./sacred-weapon-spends.js";
export { mentalFocusToggleOptions, MENTAL_FOCUS_DETAIL } from "./mental-focus-spends.js";
export {
  PER_DAY_ACTIVATIONS,
  perDayActivationToggleOptions,
  type PerDayActivationDef,
} from "./per-day-activations/index.js";
export {
  ARCHETYPE_CASTING_ADJUSTMENTS,
  ARCHETYPE_CASTING_ADJUSTMENTS_AM,
  ARCHETYPE_CASTING_ADJUSTMENTS_NZ,
  CASTING_ADJUSTMENT_TABLES,
  CHARACTER_TRAIT_CASTING_ADJUSTMENTS,
  CLASS_FEATURE_CASTING_ADJUSTMENTS,
  FEAT_CASTING_ADJUSTMENTS,
  RACIAL_TRAIT_CASTING_ADJUSTMENTS,
  resolveCastingAdjustments,
  type CastingAdjustmentDef,
  type CastingAdjustmentTables,
} from "./casting-economy/index.js";
export {
  ARCHETYPE_SLA_GRANTS,
  ARCHETYPE_SLA_GRANTS_AM,
  ARCHETYPE_SLA_GRANTS_NZ,
  CLASS_FEATURE_SLA_GRANTS,
  deriveSlaResourcePools,
  deriveSpellLikeAbilities,
  effectiveSpellLevel,
  spellIdByName,
  FEAT_SLA_GRANTS,
  RACE_SLA_GRANTS,
  RACIAL_TRAIT_SLA_GRANTS,
  SLA_GRANT_TABLES,
  slaClaimedPoolIds,
  type RaceSlaGrantDef,
  type SlaGrantDef,
  type SlaSourceTables,
} from "./spell-like-abilities/index.js";
export { rageFatigueOnEnd, UNCHAINED_RAGE_FATIGUE_ROUNDS } from "./rage-fatigue.js";
export type { RageFatigue } from "./rage-fatigue.js";
export {
  resolveClassFeatures,
  archetypeSwappedUuids,
  archetypeReplacedSlotKeys,
  archetypeReplacedSlotCount,
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
  ARCHETYPE_TIER_REPLACEMENTS,
  ARMOR_TRAINING_GRANT_UUID,
  ARMOR_TRAINING_TIER_LEVELS,
  armorTrainingTiersKept,
  replacedTierLevels,
  type ReplacedGrantKind,
  type TierReplacementEntry,
} from "./archetype-tier-replacements.js";
export {
  ARCHETYPE_FEATURE_EFFECTS_EXTRACTED,
  ARCHETYPE_FEATURE_CLASSIFICATION,
  // Per-class slices, re-exported directly for callers that want one class's
  // table without importing the merged aggregator (e.g. fixture tests
  // spot-checking a single class) — consistently exported for every class in
  // `archetype-extracted/`, not just the wave that happened to add them first
  // (cosmetic cleanup).
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
export { computeDefenses, EFFECT_IMMUNITY_LABELS } from "./defenses.js";
export {
  SAVE_CATEGORIES,
  SAVE_CATEGORY_ORDER,
  categoryAppliesToSave,
  creatureSaveConditionals,
  saveCategoryWithAncestors,
  resolveSave,
  saveCategoryLabel,
  type CreatureSaveConditionals,
  type ResolvedSave,
  type SaveCategory,
  type ScopedSaveModifier,
} from "./save-categories.js";
export {
  MANEUVER_CATEGORIES,
  MANEUVER_CATEGORY_ORDER,
  maneuverCategoryLabel,
  maneuverConditionalTotals,
  type ManeuverCategory,
  type ScopedManeuverModifier,
} from "./maneuver-categories.js";
export {
  STANDARD_RACE_SAVE_BONUSES,
  standardRaceSaveChanges,
  type StandardRaceSaveBonus,
} from "./race-save-notes.js";
export {
  AC_CATEGORIES,
  AC_CATEGORY_ORDER,
  acCategoryLabel,
  acConditionalTotals,
  type AcCategory,
  type ScopedAcModifier,
} from "./ac-categories.js";
export {
  STANDARD_RACE_MANEUVER_BONUSES,
  standardRaceManeuverChanges,
  type StandardRaceManeuverBonus,
} from "./race-maneuver-notes.js";
export {
  STANDARD_RACE_AC_BONUSES,
  standardRaceAcChanges,
  type StandardRaceAcBonus,
} from "./race-ac-notes.js";
export { computeSenses, isSenseTarget, SENSE_TARGET_IDS } from "./senses.js";
export {
  BUFF_INSTANCE_STATE,
  SELECTABLE_ELEMENTS,
  buffInstanceState,
  elementTarget,
  needsElementChoice,
  type AblativeSpec,
  type BuffInstanceStateSpec,
  type ElementChoiceSpec,
} from "./buff-instance-state.js";
export {
  qualifierBypassedBy,
  resolveDamage,
  type AblativePool,
  type PoolConsumption,
  type AppliedReduction,
  type DamageResolution,
  type DamageResolutionOptions,
  type IncomingDamage,
  type ResolvedDamageTerm,
} from "./damage-resolution.js";
export {
  DAMAGE_TYPES,
  DR_NONE_QUALIFIER,
  damageType,
  isEnergyDamage,
  isPhysicalDamage,
  normalizeQualifier,
  qualifierLabel,
  resolveDamageWord,
  type DamageCategory,
  type DamageTypeDef,
  type DamageTypeId,
} from "./damage-types.js";
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
  carryAdjustments,
} from "./encumbrance.js";
export {
  UNARMED_STRIKE_GROUP,
  WEAPON_GROUPS,
  isKnownWeaponGroup,
  isUnarmedStrikeWeapon,
  normalizeWeaponGroup,
  type WeaponGroup,
} from "./weapon-groups.js";
export {
  BRAWLER_STRIKE_ALIGNMENT_LEVEL,
  weaponDrBypasses,
  type BrawlerStrikeAlignment,
} from "./dr-bypass.js";
export {
  deriveProficiencies,
  grantsDeityFavoredWeapon,
  isWeaponProficient,
  isArmorTypeProficient,
  isShieldTierProficient,
} from "./proficiency.js";
export {
  BUFF_CHANGE_PATCHES,
  BUFF_SAVE_NOTE_COVERAGE,
  SAVE_CATEGORY_PATCHES,
} from "./buff-effects.js";
export {
  CLASS_FEATURE_CHANGE_PATCHES,
  CLASS_FEATURE_CHOICES,
  type ClassFeatureChoiceEntry,
} from "./class-feature-effects.js";
export {
  GRANTED_POWER_CHANGE_PATCHES,
  GRANTED_POWER_CHOICES,
  type GrantedPowerChoiceEntry,
} from "./granted-power-effects/index.js";
export { FEAT_SAVE_CATEGORY_CHANGES } from "./feat-save-categories.js";
export {
  saveChangesFromNotes,
  scopedSave,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_SAVE_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_SAVE_NOTES,
  SAVE_NOTE_TARGETS,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "./vendored-trait-save-notes.js";
export {
  maneuverChangesFromNotes,
  scopedManeuver,
  MANEUVER_NOTE_TARGETS,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_MANEUVER_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_MANEUVER_NOTES,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
} from "./vendored-trait-maneuver-notes.js";
export {
  acChangesFromNotes,
  scopedAc,
  AC_NOTE_TARGETS,
  PARTIALLY_PROMOTED_CHARACTER_TRAIT_AC_NOTES,
  PARTIALLY_PROMOTED_RACIAL_TRAIT_AC_NOTES,
  VENDORED_CHARACTER_TRAIT_AC_NOTES,
  VENDORED_RACIAL_TRAIT_AC_NOTES,
} from "./vendored-trait-ac-notes.js";
export {
  clCheckChangesFromNotes,
  scopedClCheck,
  CL_CHECK_NOTE_TARGETS,
  VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES,
} from "./vendored-trait-cl-check-notes.js";
export {
  saveNoteCoverage,
  type SaveNoteCatalog,
  type SaveNoteCoverage,
} from "./save-note-coverage.js";
export { ITEM_CHANGE_PATCHES } from "./item-effects.js";
export {
  RAGE_POWERS,
  RAGE_POWER_IDS,
  ragePowersForEdition,
  resolveRagePower,
  mergedRagePowerCatalog,
  type RagePowerDef,
  type RagePowerEdition,
  type MergedRagePowerEntry,
  type PickChoice,
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

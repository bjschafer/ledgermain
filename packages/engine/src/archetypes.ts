/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top: which base feature is struck through, which archetype
 * feature replaced it (or, when the dataset couldn't pair a slot
 * unambiguously, a prose-only soft warning instead of a swap), and — for the
 * hand-verified slice in `archetype-effects.ts` or the machine-extracted slice
 * in `archetype-effects-extracted.ts` — the archetype feature's own mechanical
 * `detail` summary. The vendored archetype dataset itself carries no numeric
 * effects (see `packages/schema/ src/refdata.ts` `ArchetypeFeature` doc
 * comment); any numbers shown here come from `resolveArchetypeFeatureEffect`
 * (`archetype-effects-resolve.ts`), never the dataset.
 */

import type {
  AbilityId,
  CharacterDoc,
  DerivedArchetype,
  DerivedArchetypeFeature,
  DerivedClassFeature,
  RefData,
} from "@pf1/schema";

import { resolveArchetypeFeatureEffect } from "./archetype-effects-resolve.js";
import { ARCHETYPE_TIER_REPLACEMENTS } from "./archetype-tier-replacements.js";
import { boldStareRiderSummary } from "./mesmerist-bold-stares.js";
import {
  chosenSimpleBlast,
  elementSimpleBlasts,
  KINETICIST_ELEMENTS,
} from "./kineticist-elements.js";
import { resolveKineticistDefense } from "./kineticist-defense.js";
import {
  sneakAttackDice,
  smiteEvilDetail,
  smiteEvilLabel,
  smiteGoodLabel,
  unarmedDamageDie,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
  flurryOfBlowsUnchainedLabel,
  painfulStareLabel,
  hypnoticStareLabel,
  kineticBlastDetail,
  kineticOverflowLabel,
  kineticOverflowUpgradeLabel,
  metakinesisLabel,
  gatherPowerLabel,
  infusionSpecializationReduction,
  internalBufferMax,
  fiendishBoonLabel,
  studiedCombatLabel,
  studiedStrikeDice,
  hiddenStrikeDice,
  shifterClawsLabel,
} from "./tables.js";
import type { AbilityView } from "./rolldata.js";
import { resolveSaveDCText, saveDCContext } from "./feature-save-dc.js";
import { brawlersFlurryLabel } from "./two-weapon-fighting.js";
import { archetypeFeaturesOf, classByTag, classFeatureByTag } from "./refdata-index.js";

import {
  collectBloodragerBloodlinePowers,
  collectPsychicDisciplinePowers,
  collectSorcererBloodlinePowers,
} from "./granted-features/bloodlines.js";
import { collectBaseClassFeatures } from "./granted-features/class-features.js";
import {
  collectAlchemistDiscoveries,
  collectAntipaladinCruelties,
  collectArcanistExploits,
  collectMagusArcana,
  collectMesmeristPowers,
  collectOracleRevelations,
  collectShamanSpiritPowers,
  collectWarpriestBlessings,
  collectWitchHexes,
} from "./granted-features/class-powers.js";
import {
  collectDomainPowers,
  collectDruidDomainPowers,
  collectInquisitionPowers,
  collectWizardSchoolPowers,
} from "./granted-features/domains.js";
import {
  collectKineticistPowers,
  collectMediumSpiritPowers,
  collectOccultistPowers,
} from "./granted-features/focus-classes.js";
import { collectHomebrewFeatures } from "./granted-features/homebrew.js";
import type { GrantedFeature, GrantedFeaturesContext } from "./granted-features/shared.js";
import {
  collectInvestigatorTalents,
  collectMonkKiPowers,
  collectNinjaTricks,
  collectRagePowers,
  collectRogueTalents,
  collectShifterAspects,
  collectSlayerTalents,
  collectVigilanteTalents,
} from "./granted-features/talents.js";

export interface ResolvedClassFeatures {
  classFeatures: DerivedClassFeature[];
  activeArchetypes: DerivedArchetype[];
}

export type { GrantedFeature } from "./granted-features/shared.js";
export { domainCasterLevel } from "./granted-features/shared.js";

/**
 * Archetype id for the kineticist's Psychokinetcist (Occult Adventures p.56).
 * The misspelling is the vendored source's, not a typo here — see the
 * `pf1e-archetypes` module's `kineticist:psychokinetcist`. Matching on the id
 * keeps this stable if the display name is ever corrected upstream.
 */
export const PSYCHOKINETCIST_ARCHETYPE_ID = "kineticist:psychokinetcist";

/**
 * Whether this build channels its kinetic power through the mind rather than
 * the body: burn keys off Wisdom, its cap is the bare modifier rather than
 * `3 + mod`, and it inflicts a stacking Wis-based penalty instead of
 * nonlethal damage (Mind Burn / Emotional Intensity).
 */
export function isPsychokinetcist(doc: CharacterDoc): boolean {
  return (doc.build.archetypes ?? []).includes(PSYCHOKINETCIST_ARCHETYPE_ID);
}

/**
 * Every source of granted features, in the order they contribute. Order is not
 * semantically load-bearing (callers group and sort by level), but it is the
 * order fixtures were computed against, so keep it stable.
 */
const GRANT_SOURCES: readonly ((ctx: GrantedFeaturesContext) => void)[] = [
  collectBaseClassFeatures,
  collectDomainPowers,
  collectInquisitionPowers,
  collectWizardSchoolPowers,
  collectDruidDomainPowers,
  collectSorcererBloodlinePowers,
  collectBloodragerBloodlinePowers,
  collectArcanistExploits,
  collectMagusArcana,
  collectOracleRevelations,
  collectWitchHexes,
  collectAlchemistDiscoveries,
  collectRagePowers,
  collectMonkKiPowers,
  collectRogueTalents,
  collectShamanSpiritPowers,
  collectPsychicDisciplinePowers,
  collectMesmeristPowers,
  collectAntipaladinCruelties,
  collectNinjaTricks,
  collectInvestigatorTalents,
  collectVigilanteTalents,
  collectSlayerTalents,
  collectShifterAspects,
  collectOccultistPowers,
  collectKineticistPowers,
  collectMediumSpiritPowers,
  collectWarpriestBlessings,
  collectHomebrewFeatures,
];

/**
 * Every class-feature grant a character currently qualifies for: base-class
 * features (gated by that class's level) plus any granted by a chosen cleric
 * domain or wizard arcane school (gated by the granting class's level — a
 * domain power scales off cleric level, a school power off wizard level).
 * Shared by `resolveClassFeatures` (display) and `deriveResourcePools`
 * (uses/day tracking) so both stay in sync automatically.
 *
 * The work itself lives one subsystem per function under `granted-features/`;
 * this function only builds the shared context and runs them in order. Adding
 * a source of grants means a new function there and a new entry in
 * {@link GRANT_SOURCES}.
 */
export function collectGrantedFeatures(doc: CharacterDoc, refData: RefData): GrantedFeature[] {
  const out: GrantedFeature[] = [];
  const ctx: GrantedFeaturesContext = { doc, refData, out };
  for (const collect of GRANT_SOURCES) collect(ctx);
  return out;
}

/**
 * uuid of every base-class-feature grant currently swapped out by an active
 * archetype (gated by the character's CURRENT level in the granting class,
 * unlike {@link archetypeSwappedUuids} which ignores level and is used for
 * pre-pick conflict detection instead) -> the archetype feature name that
 * replaces it. Shared by `resolveClassFeatures` (struck-through display) and
 * `collectModifiers` (so a swapped-out base feature's `changes[]` — e.g. Armor
 * Training's `mDexA`/`acpA`, Diamond Soul's `spellResist` — stop contributing
 * the moment the swap actually takes effect; see `collect/class-features.ts`'s
 * `collectGrantedClassFeatures`, and the audit that found this WAS a real bug prior to
 * this function existing: `collectModifiers` iterated `classDef.features` with
 * no awareness of `doc.build.archetypes` at all).
 */
export function activeArchetypeSwaps(doc: CharacterDoc, refData: RefData): Map<string, string> {
  const replacedByUuid = new Map<string, string>();
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    for (const f of archetypeFeaturesOf(refData, archetypeId)) {
      if (f.level > clsLevel) continue;
      const targetUuid = resolvedSwapTargetUuid(f);
      if (targetUuid) replacedByUuid.set(targetUuid, f.name);
      for (const extraUuid of additionalSwapTargetUuids(f)) {
        replacedByUuid.set(extraUuid, f.name);
      }
    }
  }
  return replacedByUuid;
}

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` is a data bug:
 * the feature's own rules text is purely ADDITIVE ("adds X to the list...
 * regardless of the style chosen"), so honoring the pairing would suppress the
 * entire base feature with nothing backfilled. Hand-verified against the
 * published rules.
 */
const MISPAIRED_ADDITIVE_FEATURES: ReadonlySet<string> = new Set([
  // Adds Monstrous Mount to the combat-style bonus-feat list; vendored data
  // pairs it to Combat Style Feat's base uuid, which zeroed the ranger's
  // whole bonus-feat progression.
  "ranger:sable-company-marine:hippogriff-companion:2",
]);

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` points at the
 * WRONG base feature entirely (not merely "additive" like
 * {@link MISPAIRED_ADDITIVE_FEATURES} above) -> the CORRECT base-feature uuid
 * to suppress instead, or `null` when the feature's real replacement target
 * has no numeric `Change` of its own to point at (handled by a separate
 * hand-authored mechanism — see the entry's comment).
 *
 * Fighter's Brawler archetype. The vendored CSV-pairing script appears to have
 * matched each Brawler feature to the base FIGHTER feature at the SAME class
 * level, rather than by the feature's own "replaces..." prose — all three
 * mispairings below land on a same-level fighter feature that has nothing to
 * do with what the Brawler feature actually replaces. Verified against the
 * published archetype text (d20pfsrd Brawler, matches the vendored
 * `description` field verbatim):
 *   - Close Control (2nd): "This ability replaces armor training 1." Vendored
 *     pairing points at Bravery (fighter's OWN level-2 feature) instead of
 *     Armor Training.
 *   - Close Combatant (3rd): "This ability replaces weapon training 1 and 2."
 *     Vendored pairing points at Armor Training (fighter's level-3 feature)
 *     instead of Weapon Training — the mispairing was filed for. Weapon
 *     Training's own `changes[]` is empty upstream (its per-group bonus is
 *     hand-authored in `collect.ts`, gated on `weaponTrainingReplaced` /
 *     `WEAPON_TRAINING_REPLACEMENTS` below — NOT on this pairing), so there's
 *     no numeric double-suppression risk in remapping this to Weapon
 *     Training's uuid; it only fixes the classFeatures display (Weapon
 *     Training now shows struck through by Close Combatant instead of Armor
 *     Training).
 *   - Menacing Stance (7th): "This ability replaces armor training 2, 3, and
 *     4 and armor mastery." Vendored pairing points at "Armor Training (Heavy
 *     Armor)" (fighter's OWN level-7 feature, `changes: []`, purely a
 *     move-at-full-speed-in-heavy-armor rider) instead of the base Armor
 *     Training feature that actually carries the `mDexA`/`acpA` progression.
 *     Remapped to Armor Training's uuid, joining Close Control (tier 1) to
 *     suppress the rest of the atomic mDexA/acpA formula — together they
 *     cover the entire progression with no partial-tier gap: Close Control
 *     alone (levels 2–6) already suppresses the *whole* formula safely,
 *     because the formula's value at those levels IS exactly tier 1's value
 *     (`clamp(floor((unlevel+1)/4), 0, 4)` == 1 for levels 3–6, its only
 *     nonzero value below level 7); Menacing Stance then keeps it suppressed
 *     from level 7 on. "Armor Training (Heavy Armor)" itself is left alone
 *     (not remapped to anything) since it isn't named in Menacing Stance's
 *     replacement text and carries no numbers either way.
 */
const MISPAIRED_TARGET_REMAP: ReadonlyMap<string, string | null> = new Map([
  [
    "fighter:brawler:close-control:2",
    "Compendium.pf1.class-abilities.Item.5JFfSqLMCpbRmERa", // Armor Training
  ],
  [
    "fighter:brawler:close-combatant:3",
    "Compendium.pf1.class-abilities.Item.RzEzudurxQFirFoF", // Weapon Training
  ],
  [
    "fighter:brawler:menacing-stance:7",
    "Compendium.pf1.class-abilities.Item.5JFfSqLMCpbRmERa", // Armor Training
  ],
  // druid:feral-child's Native Cunning (3rd) prose says "This ability replaces
  // wild shape", but the vendored pairing links Trackless Step — the same
  // level-matching CSV quirk as the brawler entries above (Native Cunning is a
  // L3 row; Trackless Step is the druid's own L3 feature). Trackless Step's
  // suppression isn't lost by remapping: the sibling row
  // `druid:feral-child:favored-terrain:3` ("replaces trackless step and a
  // thousand faces") already correctly claims it. Wild Shape carries `changes:
  // []` (prose + a `uses.maxFormula` pool only), so this is a classFeatures
  // display fix; the pool still derives because `deriveResourcePools` doesn't
  // consult archetype swaps for ANY feature — a pre-existing engine-wide
  // posture, not per-entry harm introduced here.
  [
    "druid:feral-child:native-cunning:3",
    "Compendium.pf1.class-abilities.Item.sJdBOE9lwz5XAkUi", // Wild Shape
  ],
  // Unarmed Fighter's Tough Guy (3rd) prose says "replaces armor training 1"
  // — ONE tier — but is vendored paired to the whole Armor Training grant.
  // Unlike the many archetypes handled by suppress-plus-backfill (a sibling
  // "Armor Training" row carrying the kept-tier schedule in
  // `archetype-extracted/fighter.ts`), the unarmed fighter has no such row:
  // RAW it keeps exactly tier 3 (nothing in UC p. 48 replaces it). The
  // per-tier trades live in `ARCHETYPE_TIER_REPLACEMENTS`
  // (archetype-tier-replacements.ts), so the boolean pairing must go
  // entirely or it would strip the tier the fighter RAW keeps.
  ["fighter:unarmed-fighter:tough-guy:3", null],
  // "replaces the Nth-level bonus feat" prose level-matched to Bravery
  // (fighter's own level-2 feature) — same CSV quirk as the brawler
  // entries above. None of these archetypes replaces bravery with the
  // feature in question (each trades a bonus-feat slot, carried by
  // `ARCHETYPE_TIER_REPLACEMENTS`), so honoring the pairing wrongly
  // suppresses Bravery — which is wired (fear-save note).
  ["fighter:corsair:deck-fighting:2", null],
  ["fighter:eldritch-guardian:share-training:2", null],
  ["fighter:siegebreaker:breaker-momentum:2", null],
  ["fighter:weapon-bearer-squire:swift-sharpening:2", null],
  // Real feature (cantrip casting + Knowledge bonuses) level-matched to
  // Bravery, which the archetype never replaces. The published text trades
  // the 2nd-level bonus feat away, but the vendored description omits that
  // sentence entirely, so the instance can't carry a drift-guarded
  // `ARCHETYPE_TIER_REPLACEMENTS` entry — one feat slot stays over-granted
  // for this archetype until the vendored prose gains the sentence.
  ["fighter:child-of-acavna-and-amaznen:lore-of-acavna-and-amaznen:2", null],
]);

/**
 * Archetype feature ids that are themselves data-quality artifacts — a
 * vendored row whose description is a byte-identical, unmodified copy of
 * some OTHER ability's text (never the archetype's own real ability at that
 * level), yet still carries a `pairedBaseFeatureUuid` from the same
 * level-matching CSV compilation quirk that produced `MISPAIRED_TARGET_REMAP`
 * above. Unlike the additive case ({@link MISPAIRED_ADDITIVE_FEATURES}) or a
 * wrong-but-real-target case ({@link MISPAIRED_TARGET_REMAP}), these rows
 * shouldn't suppress ANY base feature at all — honoring the vendored pairing
 * here strikes through a real, unrelated base feature the archetype never
 * actually touches.
 *
 * Consolidated bug list: `monk:maneuver-master:evasion:9`
 * and `monk:nornkith:evasion:9`. Both archetypes already replace base Evasion
 * with their own ability at 2nd level (Resilience / Defensive Aid — each
 * correctly paired to base Evasion's own uuid), then EACH separately carries
 * a level-9 row named "Evasion" whose description is verbatim vanilla
 * base-monk Evasion text (see the classification notes in
 * `archetype-extracted/monk.ts` — flagged there as a suspected shared
 * CSV-compilation quirk). The vendored pairing on that L9 row points at the
 * base class's OWN level-9 feature SLOT, which for a monk is Improved
 * Evasion — not the (already-replaced) Evasion the row's text describes.
 * Before this fix, a Maneuver Master / Nornkith monk at level 9+ incorrectly
 * showed Improved Evasion as struck through ("replaced by Evasion") in the
 * classFeatures list, even though neither archetype's real abilities ever
 * touch it. Verified: Improved Evasion carries no vendored `Change` either
 * way (`class-features.json` id `Cc2eFfhJYlClCGEH`), so this is a
 * display-only fix, not a numeric one.
 */
const SPURIOUS_DUPLICATE_PAIRINGS: ReadonlySet<string> = new Set([
  "monk:maneuver-master:evasion:9",
  "monk:nornkith:evasion:9",
  // Generic "Bonus Feat" schedule-reprint rows level-matched to Bravery
  // (fighter's own level-2 feature). None of these rows replaces anything
  // itself; verified against the published rules that dragoon, titan
  // fighter, and cavern sniper never trade Bravery at all (cavern sniper
  // loses it to Silent Shooter, whose own pairing is correct), while
  // tactician and unarmed fighter lose it to Tactical Awareness / Harsh
  // Training, which carry their own correct pairings — the reprint row's
  // duplicate claim only corrupts the "replaced by" attribution.
  // Deliberately NOT here: fighter:druman-blackjacket:bonus-feat:2, an
  // empty artifact row whose Bravery pairing stands in for Well-Paid
  // Loyalty (the real level-2 Bravery replacement, absent from the vendored
  // dataset) — dropping it would wrongly restore Bravery.
  "fighter:dragoon:bonus-feat:2",
  "fighter:titan-fighter:bonus-feat:2",
  "fighter:cavern-sniper:bonus-feat:2",
  "fighter:tactician:bonus-feat:2",
  "fighter:unarmed-fighter:bonus-feat:2",
]);

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` correctly
 * identifies ONE base feature they replace, but whose OWN prose says they
 * replace an additional base feature too — the vendored CSV pairing script
 * only ever links one uuid per row, so a genuinely-two-target replacement
 * can't be captured there. Every consumer of a swap-target set
 * (`activeArchetypeSwaps`, `archetypeSwappedUuids`) also consults this map
 * via {@link additionalSwapTargetUuids}. Only ids with a CONFIRMED prose-only
 * additional target (no vendored `Change` on the extra base feature —
 * checked against `class-features.json` before adding) belong here, so
 * there's no double-suppression numeric risk, matching the discipline
 * `MISPAIRED_TARGET_REMAP` above already applies.
 */
const ADDITIONAL_SWAP_TARGETS: ReadonlyMap<string, readonly string[]> = new Map([
  // magus:myrmidarch's Armor Training (8th) "replaces improved spell combat
  // and greater spell combat" but the vendored pairing links only to Improved
  // Spell Combat. Both base features carry `changes: []` (prose-only
  // class-abilities entries), so this is purely a classFeatures display fix —
  // Greater Spell Combat now correctly shows struck through too, instead of
  // appearing (wrongly) still available to a myrmidarch.
  [
    "magus:myrmidarch:armor-training:8",
    ["Compendium.pf1.class-abilities.Item.nWDMATASYzzAShr6"], // Greater Spell Combat
  ],
]);

/**
 * The base-class-feature uuid `f` actually swaps out, after applying the
 * hand-curated corrections above — `undefined` when the vendored dataset
 * couldn't pair it (prose-only soft warning) or when a correction removes the
 * pairing outright. Shared by every swap-detection consumer in this file so
 * they never disagree with each other about the same underlying data.
 */
function resolvedSwapTargetUuid(f: {
  id: string;
  pairedBaseFeatureUuid?: string;
}): string | undefined {
  if (MISPAIRED_ADDITIVE_FEATURES.has(f.id)) return undefined;
  if (SPURIOUS_DUPLICATE_PAIRINGS.has(f.id)) return undefined;
  if (MISPAIRED_TARGET_REMAP.has(f.id)) return MISPAIRED_TARGET_REMAP.get(f.id) ?? undefined;
  return f.pairedBaseFeatureUuid;
}

/**
 * Extra base-class-feature uuids `f` ALSO swaps out beyond
 * {@link resolvedSwapTargetUuid}'s single primary target — see
 * {@link ADDITIONAL_SWAP_TARGETS}. Empty array when `f` has none.
 */
function additionalSwapTargetUuids(f: { id: string }): readonly string[] {
  return ADDITIONAL_SWAP_TARGETS.get(f.id) ?? [];
}

/**
 * Barbarian archetype ids whose feature at `level` fully replaces the
 * barbarian's Damage Reduction progression via an AMBIGUOUS (unpaired) swap —
 * i.e. one feature that folds in more than one base-feature slot at once, so
 * the CSV pairing script in `data-pipeline` can't link it via
 * `pairedBaseFeatureUuid` the normal 1:1 way. Hand-verified from the
 * published rules (Invulnerable Rager's Invulnerability replaces uncanny
 * dodge, improved uncanny dodge, AND damage reduction in one feature). Used
 * by {@link barbarianDamageReductionReplaced} alongside the normal paired-swap
 * check (which already covers e.g. Savage Barbarian/Wildborn, both clean 1:1
 * swaps of "Damage Reduction").
 */
const AMBIGUOUS_DR_REPLACEMENTS: ReadonlyMap<string, number> = new Map([
  ["barbarian:invulnerable-rager", 2],
  // barbarianUnchained has its own, separate archetype CSV/id namespace (its
  // "Invulnerable Rager" is a distinct RefData.archetypes entry,
  // "barbarianUnchained:invulnerable-rager", NOT the chained one above) —
  // same ambiguous swap shape confirmed against the vendored
  // archetype-features slice (its "Invulnerability" feature at level 2 also
  // carries no `pairedBaseFeatureUuid`).
  ["barbarianUnchained:invulnerable-rager", 2],
]);

/**
 * True when the character's barbarian Damage Reduction — `defenses.ts`'s
 * hardcoded `barbarianDamageReduction` table, not a vendored `Change` (the
 * class feature's `changes[]` is empty upstream) — has been replaced by an
 * active archetype at the character's current barbarian level. `defenses.ts`
 * uses this to skip that hardcoded contribution so it doesn't sit alongside
 * (or silently outrank) the archetype's own `dr`/`nac`-target effect from
 * `archetype-effects.ts`.
 *
 * `barbLevel` sums chained ("barbarian") and Unchained ("barbarianUnchained")
 * levels — a character would realistically only ever have one of the two,
 * but summing (rather than picking one tag) keeps this correct regardless of
 * which variant is actually on the sheet, same posture as `defenses.ts`'s own
 * `barbarianLevel` helper.
 */
export function barbarianDamageReductionReplaced(doc: CharacterDoc, refData: RefData): boolean {
  const barbLevel = doc.identity.classes
    .filter((c) => c.tag === "barbarian" || c.tag === "barbarianUnchained")
    .reduce((sum, c) => sum + c.level, 0);
  if (barbLevel < 2) return false;

  const barbClass = classByTag(refData, "barbarian");
  const drGrantUuid = barbClass?.features.find((f) => f.name === "Damage Reduction")?.uuid;
  if (drGrantUuid && activeArchetypeSwaps(doc, refData).has(drGrantUuid)) return true;

  for (const archetypeId of doc.build.archetypes ?? []) {
    const gateLevel = AMBIGUOUS_DR_REPLACEMENTS.get(archetypeId);
    if (gateLevel !== undefined && barbLevel >= gateLevel) return true;
  }
  return false;
}

/**
 * True when the character's antipaladin Damage Reduction (Aura of Depravity,
 * 17th level — `defenses.ts`'s hardcoded `antipaladinDamageReduction` table,
 * not a vendored `Change`; see that function's doc comment) has been replaced
 * by an active archetype at the character's current antipaladin level. Found
 * via an audit of the vendored antipaladin archetype slice (B): Insinuator's
 * "Aura of Indomitability" (17th level) carries a `pairedBaseFeatureUuid`
 * pointing at Aura of Depravity's uuid — a clean 1:1 swap, same shape as
 * `barbarianDamageReductionReplaced`'s common case (no ambiguous unpaired
 * antipaladin DR swap was found, so there's no antipaladin equivalent of
 * `AMBIGUOUS_DR_REPLACEMENTS` needed here). Unlike Aura of Depravity, no
 * vendored antipaladin archetype feature was found replacing Unholy Champion
 * (20th level) — its DR bump is left unconditional.
 */
export function antipaladinDamageReductionReplaced(doc: CharacterDoc, refData: RefData): boolean {
  const antipaladinLevel = doc.identity.classes.find((c) => c.tag === "antipaladin")?.level ?? 0;
  if (antipaladinLevel < 17) return false;

  const antipaladinClass = classByTag(refData, "antipaladin");
  const drGrantUuid = antipaladinClass?.features.find((f) => f.name === "Aura of Depravity")?.uuid;
  return !!drGrantUuid && activeArchetypeSwaps(doc, refData).has(drGrantUuid);
}

/**
 * Fighter archetype ids whose OWN feature meaningfully takes over some or all
 * of the base Weapon Training mechanism — a fixed or restricted group, a
 * different cadence, or an unmodeled condition — that `archetype-extracted/
 * fighter.ts` already covers (fully or partially) with its own `Change`.
 * `weaponTrainingReplaced` uses this hand-curated set, NOT the generic
 * `pairedBaseFeatureUuid`/`activeArchetypeSwaps` swap-detection every other
 * suppression check in this file uses (`barbarianDamageReductionReplaced`
 * above): Foundry's vendored data pairs nearly EVERY fighter archetype's
 * "Weapon Training"-slot feature to the base uuid, including ones that are
 * byte-identical unmodified reflavors (Aerial Assaulter, Pack Mule, Rondelero
 * Duelist, Two-Weapon Warrior) or purely additive (Warlord adds one more
 * selectable group without restricting the normal free choice) — the generic
 * swap mechanism is too broad for this specific feature (unlike Armor
 * Training/Damage Reduction, where every real archetype pairing genuinely
 * does replace the mechanic). Suppressing the picker for those non-replacing
 * archetypes would incorrectly zero out an unrelated fighter's weapon
 * training entirely. This set was hand-built from the same prose-reading
 * pass that produced the extracted entries above — see each id's
 * classification entry for the reasoning.
 *
 * `fighter:brawler` is here because its Close Combatant feature genuinely
 * takes over the feature slot, not because of the generic swap check — even
 * with `MISPAIRED_TARGET_REMAP` above correcting Close Combatant's vendored
 * `pairedBaseFeatureUuid` to point at Weapon Training instead of Armor
 * Training, the swap check still can't backfill the per-tier
 * `weaponTrainingGroups` picker with Close Combatant's fixed
 * close-weapon-group bonus — that's what this set is for.
 */
const WEAPON_TRAINING_REPLACEMENTS: ReadonlySet<string> = new Set([
  "fighter:archer",
  "fighter:brawler",
  "fighter:crossbowman",
  "fighter:dragoon",
  "fighter:foehammer",
  "fighter:polearm-master",
  "fighter:spear-fighter",
  "fighter:tribal-fighter",
  "fighter:two-handed-fighter",
  "fighter:unarmed-fighter",
  "fighter:ustalavic-duelist",
  // Martial Flexibility's text trades away weapon training (and weapon
  // mastery) wholesale on top of four bonus-feat instances — the vendored
  // feature is unpaired, so without this entry the picker would still offer
  // weapon-training groups. The bonus-feat half lives in
  // `archetype-tier-replacements.ts`.
  "fighter:varisian-free-style-fighter",
]);

/**
 * True when the character's base Weapon Training class feature — modeled via
 * `doc.build.weaponTrainingGroups` + `collect.ts`'s per-group bonus
 * derivation, not a vendored `Change` (the feature's `changes[]` is empty
 * upstream) — has been replaced by an active archetype. `collect.ts` uses
 * this to skip that derivation entirely so it never sits alongside (or
 * double-counts against) the archetype's own weapon-group-scoped effect from
 * `archetype-extracted/fighter.ts`. See {@link WEAPON_TRAINING_REPLACEMENTS}
 * for why this doesn't use the generic paired-swap check.
 */
export function weaponTrainingReplaced(doc: CharacterDoc): boolean {
  return (doc.build.archetypes ?? []).some((id) => WEAPON_TRAINING_REPLACEMENTS.has(id));
}

/**
 * "verified" when at least one of `archetypeId`'s features has a hand-authored
 * entry with a real `Change`; "extracted" when none are hand-verified but at
 * least one has a machine-extracted entry with a real `Change`; "none"
 * otherwise. Verified always wins at the archetype level even if only one of
 * several modeled features is verified — matches
 * `resolveArchetypeFeatureEffect`'s per-feature precedence. Used by
 * `ArchetypePicker` to badge which archetypes carry modeled numeric effects,
 * and to distinguish a hand-verified badge from a machine-extracted one so the
 * two are never visually confused. A notes-only entry (`changes: []`, added to
 * surface a `detail` summary — e.g. Scout's Charge, Archaeologist's Luck) does
 * NOT count in either tier: it has no numeric effect to badge.
 */
export type ArchetypeEffectTier = "verified" | "extracted" | "none";

export function archetypeModeledEffectTier(
  refData: RefData,
  archetypeId: string,
): ArchetypeEffectTier {
  let sawExtracted = false;
  for (const f of archetypeFeaturesOf(refData, archetypeId)) {
    const resolved = resolveArchetypeFeatureEffect(f.id);
    if (!resolved || resolved.effect.changes.length === 0) continue;
    if (resolved.source === "verified") return "verified";
    sawExtracted = true;
  }
  return sawExtracted ? "extracted" : "none";
}

/**
 * Back-compat convenience: true for either tier. Prefer
 * {@link archetypeModeledEffectTier} where the UI needs to distinguish them.
 */
export function archetypeHasModeledEffects(refData: RefData, archetypeId: string): boolean {
  return archetypeModeledEffectTier(refData, archetypeId) !== "none";
}

/**
 * `abilities` (from a computed sheet) lets Smite Evil's Cha-keyed detail
 * resolve against final scores; omit it to treat Cha modifier as 0 (matches
 * `deriveResourcePools`'s optional-abilities posture). `familyDCs` (from
 * `ability-dcs.ts`'s `computeAbilityDCs`) threads final ability-DC totals
 * into the `feature-save-dc.ts` phrase substitution below, so a hex/cruelty
 * contextNote agrees with the ability-DC panel when a player has applied an
 * `abilityDC.<family>` modifier; omit it to fall back to the plain formula
 * (byte-identical to before `familyDCs` existed).
 */
export function resolveClassFeatures(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
  familyDCs?: Readonly<Record<string, number>>,
): ResolvedClassFeatures {
  const replacedByUuid = activeArchetypeSwaps(doc, refData);
  const activeArchetypes: DerivedArchetype[] = [];

  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;

    const swappedSlots: Record<number, string> = {};
    const features: DerivedArchetypeFeature[] = [];
    const archetypeFeatures = archetypeFeaturesOf(refData, archetypeId)
      .filter((f) => f.level <= clsLevel)
      .sort((a, b) => a.level - b.level);

    for (const f of archetypeFeatures) {
      const resolved = resolveArchetypeFeatureEffect(f.id);
      features.push({
        level: f.level,
        featureId: f.id,
        name: f.name,
        description: f.description,
        // A resolved pairing or a structured `replacesSlot` both give the UI
        // something concrete to print; `replacesText` alone is still enough
        // (prints "Replaces: <text>" verbatim). Only a feature that swaps out
        // something with NONE of the three — and isn't flagged purely
        // additive — is genuinely ambiguous.
        ambiguous:
          !f.pairedBaseFeatureUuid &&
          !f.replacesText &&
          !f.replacesSlot &&
          f.isReplacement !== false,
        replacesText: f.replacesText,
        replacesSlot: f.replacesSlot,
        abilityType: f.abilityType,
        detail: resolved?.effect.detail?.(clsLevel),
        effectSource: resolved?.effect.detail ? resolved.source : undefined,
      });
      const targetUuid = resolvedSwapTargetUuid(f);
      if (targetUuid) {
        swappedSlots[f.level] = targetUuid;
      }
    }

    activeArchetypes.push({
      id: archetype.id,
      name: archetype.name,
      classTag: archetype.classTag,
      swappedSlots,
      features,
    });
  }

  const classFeatures: DerivedClassFeature[] = [];
  const dcCtx = saveDCContext(doc, abilities, familyDCs);
  // Base race size, for the unarmed-damage table's Small/Large columns. Not
  // the character's effective size: a level-scaling class feature prints the
  // die the class table gives them, and Enlarge Person's own step is applied
  // where the attack line is built (`compute.ts`'s `scaleWeaponDamageDice`).
  const baseSize = refData.races[doc.identity.race]?.size ?? "med";
  for (const {
    classTag,
    grant,
    origin,
    detail: providedDetail,
    contextNotes: authoredNotes,
  } of collectGrantedFeatures(doc, refData)) {
    // "DC = 10 + 1/2 witch level + Int mod" -> "DC 19" for this character; an
    // unrecognized phrasing passes through untouched (see `feature-save-dc.ts`).
    const contextNotes = authoredNotes?.map((n) => ({
      ...n,
      text: resolveSaveDCText(n.text, dcCtx),
    }));
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    const replacedBy = replacedByUuid.get(grant.uuid);
    // Sneak Attack's die count, Smite Evil's attack/damage/AC scaling, and
    // Monk's unarmed damage die / Flurry of Blows summary have no vendored
    // tag/changes (Foundry only tags channelEnergy/rage) — matched by name,
    // same posture as feat-effects.ts's name-slug lookup. Domain/school grants
    // never match these class+name pairs, so `detail` stays undefined.
    // Bloodline grants carry a pre-computed `providedDetail` instead (no
    // vendored feature to derive it from) — takes priority. Ninja's Sneak
    // Attack (UC) uses the IDENTICAL progression as rogue's (same
    // `floor((level+1)/2)` d6 table per the SRD) — matched here alongside
    // rogue rather than duplicating `sneakAttackDice`. Antipaladin's Smite
    // Good (APG) is likewise a mirror of paladin's Smite Evil (same math, "vs.
    // good" display suffix via `smiteGoodLabel`).
    let detail: string | undefined = providedDetail;
    if (
      detail === undefined &&
      (classTag === "rogue" || classTag === "ninja") &&
      grant.name === "Sneak Attack"
    ) {
      detail = sneakAttackDice(classLevel).diceLabel;
    } else if (detail === undefined && classTag === "paladin" && grant.name === "Smite Evil") {
      const chaMod = abilities?.cha?.mod ?? 0;
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
    } else if (detail === undefined && classTag === "antipaladin" && grant.name === "Smite Good") {
      const chaMod = abilities?.cha?.mod ?? 0;
      detail = smiteGoodLabel(smiteEvilDetail(classLevel, chaMod));
    } else if (
      detail === undefined &&
      classTag === "antipaladin" &&
      grant.name === "Fiendish Boon"
    ) {
      // Fiendish Boon's own vendored description is a prose-only stub with
      // no numbers (`changes: []`) — same as paladin's own Divine Bond,
      // which today has no hand-authored detail at all. Unlike Divine Bond,
      // this project tracks WHICH form was chosen (`build.antipaladinBoon`)
      // so a summary line is worth showing; see `fiendishBoonLabel`'s doc
      // comment for why the weapon math itself still stays manual.
      detail = fiendishBoonLabel(classLevel, doc.build.antipaladinBoon);
    } else if (detail === undefined && classTag === "monk" && grant.name === "Unarmed Strike") {
      detail = unarmedDamageDie(classLevel, baseSize).dieLabel;
    } else if (detail === undefined && classTag === "monk" && grant.name === "Flurry of Blows") {
      detail = flurryOfBlowsLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "brawler" &&
      grant.name === "Unarmed Strike (BRA)"
    ) {
      // Brawler's own unarmed damage table is the monk's, level for level and
      // column for column — see `unarmedDamageDie`.
      detail = unarmedDamageDie(classLevel, baseSize).dieLabel;
    } else if (
      detail === undefined &&
      classTag === "brawler" &&
      grant.name === "Brawler's Flurry"
    ) {
      detail = brawlersFlurryLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "barbarian" &&
      grant.name === "Damage Reduction"
    ) {
      detail = barbarianDamageReduction(classLevel).label;
    } else if (
      detail === undefined &&
      classTag === "barbarianUnchained" &&
      grant.name === "Damage Reduction"
    ) {
      // Shared vendored featureId with chained barbarian's own Damage
      // Reduction (`RENIeTVjWB7Mq6Mw`) — same clean-room progression table.
      detail = barbarianDamageReduction(classLevel).label;
    } else if (
      detail === undefined &&
      classTag === "monkUnchained" &&
      grant.name === "Unarmed Strike"
    ) {
      // Shared vendored featureId with chained monk's own Unarmed Strike
      // (`a4SPdPuOFdmfJdHN`) — same "Table: Monk Unarmed Damage" progression.
      detail = unarmedDamageDie(classLevel, baseSize).dieLabel;
    } else if (
      detail === undefined &&
      classTag === "monkUnchained" &&
      grant.name === "Flurry of Blows (UC)"
    ) {
      detail = flurryOfBlowsUnchainedLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "rogueUnchained" &&
      grant.name === "Sneak Attack (UC)"
    ) {
      detail = sneakAttackDice(classLevel).diceLabel;
    } else if (detail === undefined && classTag === "mesmerist" && grant.name === "Painful Stare") {
      detail = painfulStareLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "mesmerist" &&
      grant.name === "Hypnotic Stare"
    ) {
      detail = boldStareRiderSummary(
        hypnoticStareLabel(classLevel),
        doc.build.mesmeristBoldStares ?? [],
      );
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Physical Kinetic Blast"
    ) {
      // Kinetic Blast dice (Occult Adventures) — display-only summary; the
      // vendored feature's dice-bearing action formula isn't numerically
      // evaluable per the formula-DSL convention. See `kineticBlastDetail`.
      detail = kineticBlastDetail(classLevel, abilities?.con?.mod).physicalLabel;
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Energy Kinetic Blast"
    ) {
      detail = kineticBlastDetail(classLevel, abilities?.con?.mod).energyLabel;
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Elemental Focus"
    ) {
      // which element was chosen (`build.kineticistElement`) has no vendored
      // per-element data (see `kineticist-elements.ts`'s doc comment) —
      // hand-authored summary of the simple blast, bonus class skills
      // (display-only, same `classSkillSet`-wiring gap `cavalierOrder`
      // documents), and automatic basic utility talent.
      const element = doc.build.kineticistElement
        ? KINETICIST_ELEMENTS[doc.build.kineticistElement]
        : undefined;
      if (element) {
        const blast =
          chosenSimpleBlast(element.tag, doc.build.kineticistSimpleBlasts ?? {}) ??
          element.simpleBlast;
        detail =
          `${element.name} — simple blast: ${blast.name} ` +
          `(${blast.damageType}, ${blast.descriptor}); ` +
          `bonus wild talent: ${element.basicUtility.name}`;
      }
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Elemental Defense"
    ) {
      // Elemental Defense scales with how much of the burn currently held was
      // spent on it — resolved live, so this row states the value the sheet
      // is actually carrying rather than the rule that produces it. Clamped
      // to the burn held, same as `collect.ts`'s own resolution.
      const burnFeature = classFeatureByTag(refData, "burn");
      const burnHeld = burnFeature ? (doc.live.resources[burnFeature.id]?.used ?? 0) : 0;
      const defense = resolveKineticistDefense(doc.build.kineticistElement, classLevel, {
        burnInvested: Math.min(doc.live.kineticistDefenseBurn ?? 0, burnHeld),
        shroudMode: doc.live.kineticistShroudMode,
      });
      if (defense) detail = `${defense.name}: ${defense.detail}`;
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Expanded Element"
    ) {
      // the vendored feature is a single row at 7th level, but RAW grants a
      // SECOND pick at 15th ("At 15th level, the kineticist can either select
      // a new element or expand her understanding of her original element") —
      // both picks (`build.kineticistExpandedElements` indices 0/1) are
      // summarized here rather than inventing a synthetic second grant row,
      // since the vendored dataset has none to attach it to.
      const picks = doc.build.kineticistExpandedElements ?? [];
      const choices = doc.build.kineticistSimpleBlasts ?? {};
      // Expanding into the element you already have grants the OTHER simple
      // blast rather than a fresh choice, so name that one specifically.
      const expandedBlastName = (tag: string): string => {
        const el = KINETICIST_ELEMENTS[tag]!;
        if (tag !== doc.build.kineticistElement) {
          return (chosenSimpleBlast(tag, choices) ?? el.simpleBlast).name;
        }
        const kept = chosenSimpleBlast(tag, choices) ?? el.simpleBlast;
        const other = elementSimpleBlasts(tag).find((b) => b.id !== kept.id);
        return other ? other.name : kept.name;
      };
      const parts: string[] = [];
      if (classLevel >= 7 && picks[0]) {
        const el = KINETICIST_ELEMENTS[picks[0]];
        if (el)
          parts.push(`7th: ${el.name} (+${expandedBlastName(el.tag)}, ${el.basicUtility.name})`);
      }
      if (classLevel >= 15 && picks[1]) {
        const el = KINETICIST_ELEMENTS[picks[1]];
        if (el)
          parts.push(`15th: ${el.name} (+${expandedBlastName(el.tag)}, ${el.basicUtility.name})`);
      }
      if (parts.length > 0) detail = parts.join(" · ");
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Elemental Overflow"
    ) {
      // the ONE kineticist rider that genuinely depends on live session state
      // — see `kineticOverflowBonus`'s doc comment. Reads the Burn resource
      // pool's current `used` value (same pool `resources.ts` derives from the
      // Burn feature's vendored `uses.maxFormula`) rather than re-deriving
      // burn tracking here.
      const burnFeature = classFeatureByTag(refData, "burn");
      const currentBurn = burnFeature ? (doc.live.resources[burnFeature.id]?.used ?? 0) : 0;
      const upgrade = kineticOverflowUpgradeLabel(classLevel, currentBurn);
      detail = upgrade
        ? `${kineticOverflowLabel(classLevel, currentBurn)} · ${upgrade}`
        : kineticOverflowLabel(classLevel, currentBurn);
    } else if (detail === undefined && classTag === "kineticist" && grant.name === "Metakinesis") {
      detail = metakinesisLabel(classLevel);
    } else if (detail === undefined && classTag === "kineticist" && grant.name === "Gather Power") {
      detail = gatherPowerLabel(classLevel);
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Infusion Specialization"
    ) {
      detail = `-${infusionSpecializationReduction(classLevel)} burn on combined infusion costs (min 0)`;
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Internal Buffer"
    ) {
      detail = `max ${internalBufferMax(classLevel)} point(s) stored (spend 1/talent to avoid accepting burn)`;
    } else if (detail === undefined && classTag === "kineticist" && grant.name === "Supercharge") {
      detail = "Gather Power reduces burn cost by 2 (move action) / 3 (full round) instead of 1/2";
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Composite Specialization"
    ) {
      detail = "-1 burn cost on composite blasts (min 0)";
    } else if (
      detail === undefined &&
      classTag === "kineticist" &&
      grant.name === "Metakinetic Master"
    ) {
      detail = "Choose one metakinesis type; its burn cost is reduced by 1 (min 0)";
    } else if (detail === undefined && classTag === "kineticist" && grant.name === "Omnikinesis") {
      detail =
        "1 burn: use any blast wild talent you don't know · 1 burn as a standard action: swap any wild talent for another of the same category for 24 hours, ignoring elemental restrictions";
    } else if (
      detail === undefined &&
      classTag === "investigator" &&
      grant.name === "Studied Combat"
    ) {
      // insight bonus to atk/dmg vs. a studied target — see
      // `studiedCombatLabel`'s doc comment (no vendored dice/changes
      // upstream).
      const label = studiedCombatLabel(classLevel);
      if (label) detail = label;
    } else if (
      detail === undefined &&
      classTag === "investigator" &&
      grant.name === "Studied Strike"
    ) {
      detail = studiedStrikeDice(classLevel).diceLabel;
    } else if (
      detail === undefined &&
      classTag === "vigilante" &&
      grant.name === "Vigilante Specialization"
    ) {
      // Avenger gets full BAB (see compute.ts's BAB loop, which reads this
      // same `doc.build.vigilanteSpecialization` field) — no class-feature
      // detail line needed for that half. Stalker gets Hidden Strike, whose
      // dice this surfaces (see `hiddenStrikeDice`'s doc comment — prose-only
      // upstream, same posture as Sneak Attack).
      const spec = doc.build.vigilanteSpecialization;
      if (spec === "avenger") {
        detail = "Avenger: full BAB (= vigilante level)";
      } else if (spec === "stalker") {
        detail = `Stalker: Hidden Strike ${hiddenStrikeDice(classLevel).diceLabel}`;
      }
    } else if (detail === undefined && classTag === "shifter" && grant.name === "Shifter Claws") {
      detail = shifterClawsLabel(classLevel);
    }
    classFeatures.push({
      level: grant.level,
      classTag,
      featureId: grant.featureId,
      name: grant.name,
      applied: !replacedBy,
      replacedBy,
      detail,
      origin,
      contextNotes,
    });
  }
  classFeatures.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  return { classFeatures, activeArchetypes };
}

/**
 * Every base-class-feature uuid this archetype swaps out (across all its
 * levels, regardless of the character's current level — a swap the character
 * hasn't reached yet still makes taking a second, overlapping archetype
 * pointless once they level up). Used to detect conflicting archetype picks
 * before they're added to `build.archetypes`, since `resolveClassFeatures`
 * itself just applies swaps last-wins and silently drops the earlier one.
 */
export function archetypeSwappedUuids(refData: RefData, archetypeId: string): Set<string> {
  const uuids = new Set<string>();
  for (const f of archetypeFeaturesOf(refData, archetypeId)) {
    const targetUuid = resolvedSwapTargetUuid(f);
    if (targetUuid) uuids.add(targetUuid);
    for (const extraUuid of additionalSwapTargetUuids(f)) {
      uuids.add(extraUuid);
    }
  }
  return uuids;
}

/** Stable string key for a `replacesSlot`, so two slots compare equal only when both kind AND level match (an unleveled slot only collides with another unleveled slot of the same kind — see {@link archetypeReplacedSlotKeys}). */
function slotKey(slot: { kind: string; level?: number }): string {
  return `${slot.kind}:${slot.level ?? ""}`;
}

/**
 * Every subsystem slot (`replacesSlot` — a hex, rogue talent, rage power,
 * ...) this archetype replaces, across ALL its levels regardless of the
 * character's current level — the `replacesSlot` counterpart to
 * {@link archetypeSwappedUuids}, used the same way: to flag two archetypes
 * that can't coexist before either is added to `build.archetypes`. Keyed by
 * {@link slotKey} rather than the raw uuid set `archetypeSwappedUuids` uses,
 * since a subsystem slot has no `Class.features` grant to point at.
 */
export function archetypeReplacedSlotKeys(
  refData: RefData,
  archetypeId: string,
): Map<string, { kind: string; level?: number }> {
  const slots = new Map<string, { kind: string; level?: number }>();
  for (const f of archetypeFeaturesOf(refData, archetypeId)) {
    if (f.replacesSlot) slots.set(slotKey(f.replacesSlot), f.replacesSlot);
    // Hand-table single-tier replacements (one Armor Training tier, one
    // bonus-feat instance) claim the same kind of slot key, so two
    // archetypes trading away the same tier conflict exactly like two
    // archetypes trading away the same hex.
    const tierEntry = ARCHETYPE_TIER_REPLACEMENTS[f.id];
    if (tierEntry) {
      for (const level of tierEntry.levels) {
        const slot = { kind: tierEntry.kind, level };
        slots.set(slotKey(slot), slot);
      }
    }
  }
  return slots;
}

/**
 * How many of the character's currently active archetype features replace a
 * `kind`-tagged subsystem slot (`replacesSlot`) for `classTag`'s own
 * progression, gated by that class's current level — the shared budget-math
 * primitive behind both `model/witchHexes.ts`'s and `model/shamanHexes.ts`'s
 * `expected*HexCount` (apps/web).
 *
 * Only a LEVELED slot (`replacesSlot.level` set) consumes one of the class's
 * picks — matches `resolveFeatureLevel`'s own reasoning in the data pipeline:
 * a bare, level-less slot (e.g. Mountain Witch's Stone Spirit Hex, "this
 * ability alters hex") widens what the class can choose FROM rather than
 * consuming one of the choices themselves, so it never reduces the count.
 * Gates on the slot's own level, not the feature's grant level — Gravewalker's
 * Bonethrall is USABLE at 1st level but its prose says it "replaces the
 * witch's hex gained at 4th level", so the witch keeps her 1st- and 2nd-level
 * hexes and only loses the 4th-level one.
 */
export function archetypeReplacedSlotCount(
  doc: CharacterDoc,
  refData: RefData,
  classTag: string,
  kind: string,
): number {
  const clsLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
  if (clsLevel <= 0) return 0;

  let count = 0;
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype || archetype.classTag !== classTag) continue;
    for (const f of archetypeFeaturesOf(refData, archetypeId)) {
      const slot = f.replacesSlot;
      if (slot?.kind === kind && slot.level !== undefined && slot.level <= clsLevel) count++;
    }
  }
  return count;
}

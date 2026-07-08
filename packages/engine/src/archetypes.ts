/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top: which base feature is struck through, which archetype
 * feature replaced it (or, when the dataset couldn't pair a slot
 * unambiguously, a prose-only soft warning instead of a swap), and — for the
 * hand-verified slice in `archetype-effects.ts` (issue #7) or the
 * machine-extracted slice in `archetype-effects-extracted.ts` (issue #45) —
 * the archetype feature's own mechanical `detail` summary. The vendored
 * archetype dataset itself carries no numeric effects (see `packages/schema/
 * src/refdata.ts` `ArchetypeFeature` doc comment); any numbers shown here
 * come from `resolveArchetypeFeatureEffect` (`archetype-effects-resolve.ts`),
 * never the dataset.
 */

import type {
  AbilityId,
  CharacterDoc,
  ClassFeatureGrant,
  DerivedArchetype,
  DerivedArchetypeFeature,
  DerivedClassFeature,
  RefData,
} from "@pf1/schema";

import { ARCANIST_EXPLOITS } from "./arcanist-exploits.js";
import { resolveArchetypeFeatureEffect } from "./archetype-effects-resolve.js";
import { BLOODLINES, type BloodlineResourcePool } from "./bloodlines.js";
import { MAGUS_ARCANA } from "./magus-arcana.js";
import { ORACLE_REVELATIONS } from "./oracle-revelations.js";
import {
  sneakAttackDice,
  smiteEvilDetail,
  smiteEvilLabel,
  smiteGoodLabel,
  unarmedDamageDie,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
  flurryOfBlowsUnchainedLabel,
} from "./tables.js";
import type { AbilityView } from "./rolldata.js";

export interface ResolvedClassFeatures {
  classFeatures: DerivedClassFeature[];
  activeArchetypes: DerivedArchetype[];
}

/** A single class-feature grant the character qualifies for, with its granting context. */
export interface GrantedFeature {
  classTag: string;
  level: number;
  grant: ClassFeatureGrant;
  /** Set when this grant came from a chosen domain/school/bloodline/exploit/arcana/revelation rather than the class itself. */
  origin?: {
    kind: "domain" | "school" | "bloodline" | "exploit" | "arcana" | "revelation";
    label: string;
  };
  /**
   * Pre-computed display detail for grants with no vendored `RefData.classFeatures`
   * entry to look up (bloodline powers — see `bloodlines.ts`; hand-authored, not in
   * the vendored pack). `undefined` for domain/school/base-class grants, which
   * `resolveClassFeatures` derives `detail` for itself (or leaves undefined).
   */
  detail?: string;
  /**
   * Pre-computed uses/day pool for grants with no vendored `uses.maxFormula` to
   * read (bloodline powers). `deriveResourcePools` uses this directly instead of
   * looking up `refData.classFeatures[grant.featureId]` when set.
   */
  resourcePool?: BloodlineResourcePool;
}

/**
 * Every class-feature grant a character currently qualifies for: base-class
 * features (gated by that class's level) plus any granted by a chosen cleric
 * domain or wizard arcane school (gated by the granting class's level — a
 * domain power scales off cleric level, a school power off wizard level).
 * Shared by `resolveClassFeatures` (display) and `deriveResourcePools`
 * (uses/day tracking) so both stay in sync automatically.
 */
export function collectGrantedFeatures(doc: CharacterDoc, refData: RefData): GrantedFeature[] {
  const out: GrantedFeature[] = [];

  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      out.push({ classTag: cls.tag, level: grant.level, grant });
    }
  }

  const clericLevel = doc.identity.classes.find((c) => c.tag === "cleric")?.level ?? 0;
  if (clericLevel > 0) {
    for (const tag of doc.build.clericDomains ?? []) {
      const domain = Object.values(refData.domains).find((d) => d.tag === tag);
      if (!domain) continue;
      for (const grant of domain.features) {
        if (grant.level > clericLevel || !grant.resolved) continue;
        out.push({
          classTag: "cleric",
          level: grant.level,
          grant,
          origin: { kind: "domain", label: domain.name },
        });
      }
    }
  }

  const wizardLevel = doc.identity.classes.find((c) => c.tag === "wizard")?.level ?? 0;
  if (wizardLevel > 0) {
    // `build.wizardSchool` undefined means Universalist (back-compat — see
    // `WizardSchoolTag` doc comment in @pf1/schema): a Universalist still gets
    // Hand of the Apprentice / Metamagic Mastery, just no bonus spell slot.
    const schoolTag = doc.build.wizardSchool ?? "uni";
    const school = Object.values(refData.wizardSchools).find((s) => s.tag === schoolTag);
    if (school) {
      for (const grant of school.features) {
        if (grant.level > wizardLevel || !grant.resolved) continue;
        out.push({
          classTag: "wizard",
          level: grant.level,
          grant,
          origin: { kind: "school", label: school.name },
        });
      }
    }
  }

  // Sorcerer bloodline powers (issue #34) — hand-authored (see bloodlines.ts),
  // gated on actual sorcerer levels the same way domain/school grants are
  // gated on cleric/wizard levels above. A non-sorcerer with a stale
  // `sorcererBloodline` field (or an unresolvable bloodline tag) gets nothing.
  const sorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")?.level ?? 0;
  if (sorcererLevel > 0 && doc.build.sorcererBloodline) {
    const bloodline = BLOODLINES[doc.build.sorcererBloodline];
    if (bloodline) {
      for (const power of bloodline.powers) {
        if (power.level > sorcererLevel) continue;
        out.push({
          classTag: "sorcerer",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `bloodline:${bloodline.tag}:${power.id}`,
            featureId: `bloodline:${bloodline.tag}:${power.id}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "bloodline", label: `${bloodline.name} Bloodline` },
          detail: power.resourcePool?.detail,
          resourcePool: power.resourcePool,
        });
      }
    }
  }

  // Arcanist exploits (issue #42) — hand-authored (see arcanist-exploits.ts),
  // gated on actual arcanist levels the same way domain/school/bloodline
  // grants are gated above. A non-arcanist with a stale `arcanistExploits`
  // field gets nothing. Unlike bloodline powers, base exploits carry no
  // individual level gate of their own (the ACG picks-per-level budget lives
  // in `model/arcanistExploits.ts`, not here) — every chosen, recognized
  // exploit id is granted at a flat display level of 1 so it groups with the
  // character's earliest features rather than inventing a fake per-exploit
  // level.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = ARCANIST_EXPLOITS[exploitId];
      if (!exploit) continue;
      out.push({
        classTag: "arcanist",
        level: 1,
        grant: {
          level: 1,
          uuid: `exploit:${exploit.id}`,
          featureId: `exploit:${exploit.id}`,
          name: exploit.name,
          resolved: true,
        },
        origin: { kind: "exploit", label: "Arcanist Exploit" },
        // Exploits have no vendored RefData.classFeatures entry to derive a
        // description from (unlike base class features), so `detail` carries
        // the exploit's own rules summary rather than a terse dice/DC string
        // — otherwise the row would show only a bare name.
        detail: exploit.summary,
      });
    }
  }

  // Magus arcana (issue #61) — hand-authored (see magus-arcana.ts), gated on
  // actual magus levels the same way arcanist exploits are gated above. A
  // non-magus with a stale `magusArcana` field gets nothing. Like exploits,
  // base arcana carry no individual level gate HERE (the picker's own
  // `minLevel` soft-filters what's offered — see `model/magusArcana.ts`);
  // every chosen, recognized arcana id is granted at a flat display level of
  // 3 (the earliest a magus has any arcana at all) so it groups sensibly
  // rather than inventing a fake per-arcana level.
  const magusLevel = doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
  if (magusLevel > 0) {
    for (const arcanaId of doc.build.magusArcana ?? []) {
      const arcana = MAGUS_ARCANA[arcanaId];
      if (!arcana) continue;
      out.push({
        classTag: "magus",
        level: 3,
        grant: {
          level: 3,
          uuid: `arcana:${arcana.id}`,
          featureId: `arcana:${arcana.id}`,
          name: arcana.name,
          resolved: true,
        },
        origin: { kind: "arcana", label: "Magus Arcana" },
        // Arcana have no vendored RefData.classFeatures entry to derive a
        // description from (unlike base class features), so `detail` carries
        // the arcana's own rules summary — otherwise the row would show only
        // a bare name.
        detail: arcana.summary,
      });
    }
  }

  // Oracle revelations (issue #61) — hand-authored (see
  // oracle-revelations.ts), gated on actual oracle levels AND a chosen
  // mystery (a revelation id from a DIFFERENT mystery than the one currently
  // selected, or a non-oracle/stale field, is silently skipped — mirrors the
  // "unresolvable id" tolerance every other hand-authored table here uses).
  // Granted at a flat display level of 1, same rationale as exploits/arcana
  // above.
  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleMystery) {
    for (const revelationId of doc.build.oracleRevelations ?? []) {
      const revelation = ORACLE_REVELATIONS[revelationId];
      if (!revelation || revelation.mysteryTag !== doc.build.oracleMystery) continue;
      out.push({
        classTag: "oracle",
        level: 1,
        grant: {
          level: 1,
          uuid: `revelation:${revelation.id}`,
          featureId: `revelation:${revelation.id}`,
          name: revelation.name,
          resolved: true,
        },
        origin: { kind: "revelation", label: "Revelation" },
        detail: revelation.summary,
      });
    }
  }

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
 * the moment the swap actually takes effect; see `collect.ts`'s "granted
 * class features" section, and the issue #7 audit that found this WAS a real
 * bug prior to this function existing: `collectModifiers` iterated
 * `classDef.features` with no awareness of `doc.build.archetypes` at all).
 */
export function activeArchetypeSwaps(doc: CharacterDoc, refData: RefData): Map<string, string> {
  const replacedByUuid = new Map<string, string>();
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const targetUuid = resolvedSwapTargetUuid(f);
      if (targetUuid) replacedByUuid.set(targetUuid, f.name);
    }
  }
  return replacedByUuid;
}

/**
 * Archetype feature ids whose vendored `pairedBaseFeatureUuid` is a data bug:
 * the feature's own rules text is purely ADDITIVE ("adds X to the list...
 * regardless of the style chosen"), so honoring the pairing would suppress the
 * entire base feature with nothing backfilled. Hand-verified against the
 * published rules; the #45 extraction waves' classification audits cite each.
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
 * Issue #46: Fighter's Brawler archetype. The vendored CSV-pairing script
 * appears to have matched each Brawler feature to the base FIGHTER feature at
 * the SAME class level, rather than by the feature's own "replaces ..."
 * prose — all three mispairings below land on a same-level fighter feature
 * that has nothing to do with what the Brawler feature actually replaces.
 * Verified against the published archetype text (d20pfsrd Brawler, matches
 * the vendored `description` field verbatim):
 *   - Close Control (2nd): "This ability replaces armor training 1." Vendored
 *     pairing points at Bravery (fighter's OWN level-2 feature) instead of
 *     Armor Training.
 *   - Close Combatant (3rd): "This ability replaces weapon training 1 and 2."
 *     Vendored pairing points at Armor Training (fighter's level-3 feature)
 *     instead of Weapon Training — the mispairing issue #46 was filed for.
 *     Weapon Training's own `changes[]` is empty upstream (its per-group
 *     bonus is hand-authored in `collect.ts`, gated on `weaponTrainingReplaced`
 *     / `WEAPON_TRAINING_REPLACEMENTS` below — NOT on this pairing), so
 *     there's no numeric double-suppression risk in remapping this to Weapon
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
  if (MISPAIRED_TARGET_REMAP.has(f.id)) return MISPAIRED_TARGET_REMAP.get(f.id) ?? undefined;
  return f.pairedBaseFeatureUuid;
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

  const barbClass = Object.values(refData.classes).find((c) => c.tag === "barbarian");
  const drGrantUuid = barbClass?.features.find((f) => f.name === "Damage Reduction")?.uuid;
  if (drGrantUuid && activeArchetypeSwaps(doc, refData).has(drGrantUuid)) return true;

  for (const archetypeId of doc.build.archetypes ?? []) {
    const gateLevel = AMBIGUOUS_DR_REPLACEMENTS.get(archetypeId);
    if (gateLevel !== undefined && barbLevel >= gateLevel) return true;
  }
  return false;
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
 * Training (issue #46), the swap check still can't backfill the per-tier
 * `weaponTrainingGroups` picker with Close Combatant's fixed close-weapon-group
 * bonus — that's what this set is for.
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
 * "verified" when at least one of `archetypeId`'s features has a
 * hand-authored entry (issue #7) with a real `Change`; "extracted" when none
 * are hand-verified but at least one has a machine-extracted entry (issue
 * #45) with a real `Change`; "none" otherwise. Verified always wins at the
 * archetype level even if only one of several modeled features is verified —
 * matches `resolveArchetypeFeatureEffect`'s per-feature precedence. Used by
 * `ArchetypePicker` to badge which archetypes carry modeled numeric effects,
 * and to distinguish a hand-verified badge from a machine-extracted one so
 * the two are never visually confused. A notes-only entry (`changes: []`,
 * added to surface a `detail` summary — e.g. Scout's Charge, Archaeologist's
 * Luck) does NOT count in either tier: it has no numeric effect to badge.
 */
export type ArchetypeEffectTier = "verified" | "extracted" | "none";

export function archetypeModeledEffectTier(
  refData: RefData,
  archetypeId: string,
): ArchetypeEffectTier {
  let sawExtracted = false;
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId !== archetypeId) continue;
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
 * `deriveResourcePools`'s optional-abilities posture).
 */
export function resolveClassFeatures(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<AbilityId, AbilityView>,
): ResolvedClassFeatures {
  const replacedByUuid = activeArchetypeSwaps(doc, refData);
  const activeArchetypes: DerivedArchetype[] = [];

  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;

    const swappedSlots: Record<number, string> = {};
    const features: DerivedArchetypeFeature[] = [];
    const archetypeFeatures = Object.values(refData.archetypeFeatures)
      .filter((f) => f.archetypeId === archetypeId && f.level <= clsLevel)
      .sort((a, b) => a.level - b.level);

    for (const f of archetypeFeatures) {
      const resolved = resolveArchetypeFeatureEffect(f.id);
      features.push({
        level: f.level,
        name: f.name,
        description: f.description,
        ambiguous: !f.pairedBaseFeatureUuid,
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
  for (const { classTag, grant, origin, detail: providedDetail } of collectGrantedFeatures(
    doc,
    refData,
  )) {
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    const replacedBy = replacedByUuid.get(grant.uuid);
    // Sneak Attack's die count, Smite Evil's attack/damage/AC scaling, and
    // Monk's unarmed damage die / Flurry of Blows summary have no vendored
    // tag/changes (Foundry only tags channelEnergy/rage) — matched by
    // name, same posture as feat-effects.ts's name-slug lookup. Domain/school
    // grants never match these class+name pairs, so `detail` stays undefined.
    // Bloodline grants (issue #34) carry a pre-computed `providedDetail`
    // instead (no vendored feature to derive it from) — takes priority.
    // Ninja's Sneak Attack (UC) uses the IDENTICAL progression as rogue's (same
    // `floor((level+1)/2)` d6 table per the SRD) — matched here alongside
    // rogue rather than duplicating `sneakAttackDice`. Antipaladin's Smite Good
    // (APG) is likewise a mirror of paladin's Smite Evil (same math, "vs. good"
    // display suffix via `smiteGoodLabel`).
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
    } else if (detail === undefined && classTag === "monk" && grant.name === "Unarmed Strike") {
      detail = unarmedDamageDie(classLevel).dieLabel;
    } else if (detail === undefined && classTag === "monk" && grant.name === "Flurry of Blows") {
      detail = flurryOfBlowsLabel(classLevel);
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
      detail = unarmedDamageDie(classLevel).dieLabel;
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
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId !== archetypeId) continue;
    const targetUuid = resolvedSwapTargetUuid(f);
    if (targetUuid) uuids.add(targetUuid);
  }
  return uuids;
}

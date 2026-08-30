/**
 * Merge point and derivation for the spell-like-ability grant tables in this
 * directory (see `types.ts` for the charter). Two consumers:
 *
 * - `compute.ts` calls {@link deriveSpellLikeAbilities} to emit
 *   `DerivedSheet.spellLikeAbilities` — the castable rows the tracker's
 *   Spell-Like Abilities panel renders.
 * - `resources.ts` calls {@link deriveSlaResourcePools} to append a synthetic
 *   resource pool per metered grant that has no vendored pool of its own
 *   (`sla:*` ids), so uses ride the normal `live.resources` ledger, rest
 *   handling, and manual-pool bookkeeping unchanged. Grants whose source
 *   already derives a pool (`attachToSourcePool`) reuse that pool's id
 *   instead — never two counters for one budget.
 *
 * The two functions share one grant-collection pass so a suppressed or gated
 * grant can never emit a row without its pool or vice versa.
 */

import type { CharacterDoc, DerivedSpellLikeAbility, RefData, Spell } from "@pf1/schema";

import { collectGrantedFeatures } from "../archetypes.js";
import { featNameSlug } from "../feat-effects.js";
import { tryEvaluateFormula, type RollData } from "../formula.js";
import { RACIAL_TRAITS } from "../racial-traits.js";
import type { DerivedResourcePool } from "../resources.js";
import { buildRollData, type AbilityView } from "../rolldata.js";
import { ARCHETYPE_SLA_GRANTS_AM } from "./archetypesAM.js";
import { ARCHETYPE_SLA_GRANTS_NZ } from "./archetypesNZ.js";
import { CLASS_FEATURE_SLA_GRANTS } from "./class-features.js";
import { FEAT_SLA_GRANTS } from "./feats.js";
import { RACE_SLA_GRANTS, RACIAL_TRAIT_SLA_GRANTS } from "./racial.js";
import type { RaceSlaGrantDef, SlaGrantDef } from "./types.js";

export type { RaceSlaGrantDef, SlaGrantDef } from "./types.js";
export { RACE_SLA_GRANTS, RACIAL_TRAIT_SLA_GRANTS } from "./racial.js";
export { CLASS_FEATURE_SLA_CHOICES, CLASS_FEATURE_SLA_GRANTS } from "./class-features.js";
export { FEAT_SLA_GRANTS } from "./feats.js";
export { ARCHETYPE_SLA_GRANTS_AM } from "./archetypesAM.js";
export { ARCHETYPE_SLA_GRANTS_NZ } from "./archetypesNZ.js";

/** The A–M / N–Z shard merge — keys are class-tag-prefixed, so collisions can't happen. */
export const ARCHETYPE_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {
  ...ARCHETYPE_SLA_GRANTS_AM,
  ...ARCHETYPE_SLA_GRANTS_NZ,
};

/**
 * All five source tables, overridable for tests (the class-feature/archetype/
 * feat paths ship empty until their content wave lands, so unit tests inject
 * small tables to exercise them — same posture as
 * `resolveArchetypeFeatureEffect`'s table params).
 */
export interface SlaSourceTables {
  race: Readonly<Record<string, readonly RaceSlaGrantDef[]>>;
  racialTrait: Readonly<Record<string, readonly SlaGrantDef[]>>;
  classFeature: Readonly<Record<string, readonly SlaGrantDef[]>>;
  archetypeFeature: Readonly<Record<string, readonly SlaGrantDef[]>>;
  feat: Readonly<Record<string, readonly SlaGrantDef[]>>;
}

export const SLA_GRANT_TABLES: SlaSourceTables = {
  race: RACE_SLA_GRANTS,
  racialTrait: RACIAL_TRAIT_SLA_GRANTS,
  classFeature: CLASS_FEATURE_SLA_GRANTS,
  archetypeFeature: ARCHETYPE_SLA_GRANTS,
  feat: FEAT_SLA_GRANTS,
};

const CHARACTER_LEVEL_CL = "@attributes.hd.total";
const GRANTING_CLASS_CL = "@class.unlevel";

/** One gate-passed grant, ready to become a row and (when metered) a pool. */
interface ResolvedSlaGrant {
  def: SlaGrantDef;
  /** Row id — and the synthetic pool id for a self-metered grant. */
  id: string;
  sourceLabel: string;
  classTag: string;
  /** The source's own derived pool id, for `attachToSourcePool` grants. */
  attachPoolId?: string;
  /** The attached source pool's recharge period ("day"/"week"). */
  attachPer?: string;
  /** Eval context for `cl` and `uses.formula` (class-contextual when the source has one). */
  rollData: RollData;
  defaultCl: string;
}

/** Strip one trailing parenthetical and normalize for name comparison. */
function normalizeTraitName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

/**
 * Standard-trait names suppressed by the character's selected alternate/
 * heritage racial traits — two published shapes (see `RaceSlaGrantDef`):
 * a trait that structurally replaces the standard trait (vendored
 * `replacedTraitNames` / hand `replaces`), and a heritage variant that
 * carries no replacement bookkeeping but is NAMED after the standard trait
 * it stands in for ("Spell-Like Ability (Tiefling - Beastbrood)"). Both
 * race-gated the same way the pool scans in `resources.ts` are, so a stale
 * selection left by a race change suppresses nothing.
 */
function suppressedStandardTraits(doc: CharacterDoc, refData: RefData): Set<string> {
  const raceName = refData.races[doc.identity.race]?.name;
  const suppressed = new Set<string>();
  if (!raceName) return suppressed;

  for (const id of doc.build.vendoredRacialTraits ?? []) {
    const trait = refData.racialTraits[id];
    if (!trait || !trait.race.includes(raceName)) continue;
    suppressed.add(normalizeTraitName(trait.name));
    for (const replaced of trait.replacedTraitNames) suppressed.add(normalizeTraitName(replaced));
  }
  for (const id of doc.build.racialTraits ?? []) {
    const trait = RACIAL_TRAITS[id];
    if (!trait || trait.race !== raceName) continue;
    suppressed.add(normalizeTraitName(trait.name));
    for (const replaced of trait.replaces) suppressed.add(normalizeTraitName(replaced));
  }
  return suppressed;
}

/** Defensive ability reads against the untyped roll-data shape (`buildRollData`'s per-ability `{ total, mod, ... }`). */
function abilityField(rollData: RollData, ability: string, field: "total" | "mod"): number {
  const abilities = rollData.abilities;
  if (!abilities || typeof abilities !== "object") return 0;
  const entry = (abilities as Record<string, unknown>)[ability];
  if (!entry || typeof entry !== "object") return 0;
  const value = (entry as Record<string, unknown>)[field];
  return typeof value === "number" ? value : 0;
}

/** Case-insensitive spell-name index, cached per RefData instance (the web app memoizes one). */
const spellIndexCache = new WeakMap<RefData, Map<string, string>>();

/** Resolve a spell name to its `RefData.spells` id, case-insensitively — exported for the familiar SLA panel's reuse of the same degradation posture. */
export function spellIdByName(refData: RefData, name: string): string | undefined {
  let index = spellIndexCache.get(refData);
  if (!index) {
    index = new Map<string, string>();
    for (const [id, spell] of Object.entries(refData.spells)) {
      const key = spell.name.toLowerCase();
      if (!index.has(key)) index.set(key, id);
    }
    spellIndexCache.set(refData, index);
  }
  return index.get(name.toLowerCase());
}

/**
 * Effective spell level for the SLA save DC — sorcerer/wizard list level
 * when the spell is on that list, else the lowest of its class-list levels
 * (see `types.ts`'s header for the clean-room ruling), else the spell's
 * nominal level.
 */
export function effectiveSpellLevel(spell: Spell): number {
  const byClass = spell.learnedAt.class;
  const sorWiz = byClass["wizard"] ?? byClass["sorcerer"];
  if (sorWiz !== undefined) return sorWiz;
  const levels = Object.values(byClass);
  if (levels.length > 0) return Math.min(...levels);
  return spell.level;
}

/** The shared collection pass — every gate lives here so rows and pools can't disagree. */
function collectSlaGrants(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<string, AbilityView>,
  tables: SlaSourceTables = SLA_GRANT_TABLES,
): ResolvedSlaGrant[] {
  const rollData = buildRollData(doc, refData, abilities);
  const characterLevel = doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
  const grants: ResolvedSlaGrant[] = [];
  const seenIds = new Set<string>();

  const push = (grant: ResolvedSlaGrant): void => {
    if (seenIds.has(grant.id)) return;
    seenIds.add(grant.id);
    grants.push(grant);
  };

  const passesCommonGates = (def: SlaGrantDef, levelInScope: number): boolean => {
    if (def.minLevel !== undefined && levelInScope < def.minLevel) return false;
    if (
      def.minAbility &&
      abilityField(rollData, def.minAbility.ability, "total") < def.minAbility.score
    ) {
      return false;
    }
    if (def.when && !def.when(doc)) return false;
    return true;
  };

  // Race innates — suppressible by a selected alternate/heritage trait.
  const race = refData.races[doc.identity.race];
  const raceDefs = race ? tables.race[race.name] : undefined;
  if (race && raceDefs) {
    const suppressed = suppressedStandardTraits(doc, refData);
    for (const def of raceDefs) {
      if (def.standardTraitName && suppressed.has(normalizeTraitName(def.standardTraitName))) {
        continue;
      }
      if (!passesCommonGates(def, characterLevel)) continue;
      // Id deliberately omits the race id: one race at a time, and
      // `syncDerivedPools` reclaims stale counters on a race change.
      push({
        def,
        id: `sla:race:${def.slug}`,
        sourceLabel: race.name,
        classTag: "racial",
        rollData,
        defaultCl: CHARACTER_LEVEL_CL,
      });
    }
  }

  // Racial traits — vendored and hand-authored stores, same race gates as
  // the pool scans in `resources.ts`.
  const raceName = race?.name;
  if (raceName) {
    for (const id of doc.build.vendoredRacialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = refData.racialTraits[id];
      if (!defs || !trait || !trait.race.includes(raceName)) continue;
      for (const def of defs) {
        if (!passesCommonGates(def, characterLevel)) continue;
        push({
          def,
          id: `sla:${id}:${def.slug}`,
          sourceLabel: trait.name,
          classTag: "racial",
          attachPoolId: def.attachToSourcePool ? id : undefined,
          attachPer: def.attachToSourcePool ? (trait.uses?.per ?? "day") : undefined,
          rollData,
          defaultCl: CHARACTER_LEVEL_CL,
        });
      }
    }
    for (const id of doc.build.racialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = RACIAL_TRAITS[id];
      if (!defs || !trait || trait.race !== raceName) continue;
      for (const def of defs) {
        if (!passesCommonGates(def, characterLevel)) continue;
        push({
          def,
          id: `sla:${id}:${def.slug}`,
          sourceLabel: trait.name,
          classTag: "racial",
          attachPoolId: def.attachToSourcePool ? id : undefined,
          attachPer: def.attachToSourcePool ? (trait.resourcePool?.per ?? "day") : undefined,
          rollData,
          defaultCl: CHARACTER_LEVEL_CL,
        });
      }
    }
  }

  // Class features and domain/school/inquisition granted powers — keyed by
  // vendored pack id, class-contextual roll data like `resources.ts`.
  for (const g of collectGrantedFeatures(doc, refData)) {
    const defs = tables.classFeature[g.grant.featureId];
    if (!defs) continue;
    const classLevel = doc.identity.classes.find((c) => c.tag === g.classTag)?.level ?? 0;
    const featureRollData = {
      ...rollData,
      class: { level: classLevel, unlevel: classLevel },
    } as RollData;
    const feature = refData.classFeatures[g.grant.featureId];
    for (const def of defs) {
      if (def.minLevel !== undefined && classLevel < def.minLevel) continue;
      if (
        def.minAbility &&
        abilityField(rollData, def.minAbility.ability, "total") < def.minAbility.score
      ) {
        continue;
      }
      if (def.when && !def.when(doc)) continue;
      push({
        def,
        id: `sla:${g.grant.featureId}:${def.slug}`,
        sourceLabel: g.grant.name,
        classTag: g.classTag,
        attachPoolId: def.attachToSourcePool ? g.grant.featureId : undefined,
        attachPer: def.attachToSourcePool ? (feature?.uses?.per ?? "day") : undefined,
        rollData: featureRollData,
        defaultCl: GRANTING_CLASS_CL,
      });
    }
  }

  // Archetype features — iterate the TABLE (not the 6k-entry pack), gate on
  // the archetype being chosen and its class level reaching the feature.
  const chosenArchetypes = new Set(doc.build.archetypes ?? []);
  if (chosenArchetypes.size > 0) {
    for (const [featureId, defs] of Object.entries(tables.archetypeFeature)) {
      const af = refData.archetypeFeatures[featureId];
      if (!af || !chosenArchetypes.has(af.archetypeId)) continue;
      const classLevel = doc.identity.classes.find((c) => c.tag === af.classTag)?.level ?? 0;
      if (classLevel < af.level) continue;
      const featureRollData = {
        ...rollData,
        class: { level: classLevel, unlevel: classLevel },
      } as RollData;
      for (const def of defs) {
        if (def.minLevel !== undefined && classLevel < def.minLevel) continue;
        if (def.when && !def.when(doc)) continue;
        push({
          def,
          id: `sla:${featureId}:${def.slug}`,
          sourceLabel: af.name,
          classTag: af.classTag,
          rollData: featureRollData,
          defaultCl: GRANTING_CLASS_CL,
        });
      }
    }
  }

  // Feats — slug-keyed like `FEAT_POOL_EFFECTS`; a duplicate copy grants once.
  const featIds = [
    ...(doc.build.feats ?? []),
    ...(doc.build.extraFeats ?? []).map((e) => e.featId),
  ];
  for (const featId of featIds) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const slug = featNameSlug(feat.name);
    const defs = tables.feat[slug];
    if (!defs) continue;
    for (const def of defs) {
      if (!passesCommonGates(def, characterLevel)) continue;
      push({
        def,
        id: `sla:feat:${slug}:${def.slug}`,
        sourceLabel: feat.name,
        classTag: "feat",
        attachPoolId: def.attachToSourcePool ? feat.id : undefined,
        attachPer: def.attachToSourcePool ? (feat.uses?.per ?? "day") : undefined,
        rollData,
        defaultCl: CHARACTER_LEVEL_CL,
      });
    }
  }

  return grants;
}

function frequencyOf(grant: ResolvedSlaGrant): DerivedSpellLikeAbility["frequency"] {
  const { def } = grant;
  if (def.frequency === "constant") return "constant";
  if (def.frequency === "atWill") return "atWill";
  const per = def.uses ? def.uses.per : grant.attachPer;
  return per === "week" ? "perWeek" : "perDay";
}

/**
 * The castable rows for `DerivedSheet.spellLikeAbilities` — see the module
 * header. `abilities` (a computed sheet's) lets gates and formulas see final
 * scores; omit for base scores, same contract as `deriveResourcePools`.
 */
export function deriveSpellLikeAbilities(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<string, AbilityView>,
  tables: SlaSourceTables = SLA_GRANT_TABLES,
): DerivedSpellLikeAbility[] {
  const rows: DerivedSpellLikeAbility[] = [];
  for (const grant of collectSlaGrants(doc, refData, abilities, tables)) {
    const { def } = grant;
    const spellId = spellIdByName(refData, def.spell);
    const spell = spellId ? refData.spells[spellId] : undefined;

    let casterLevel: number | null;
    try {
      casterLevel = tryEvaluateFormula(def.cl ?? grant.defaultCl, grant.rollData);
    } catch {
      casterLevel = null;
    }

    const metered = def.uses !== undefined || grant.attachPoolId !== undefined;
    rows.push({
      id: grant.id,
      name: def.displayName ?? spell?.name ?? def.spell,
      ...(spellId !== undefined ? { spellId } : {}),
      spellLevel: def.spellLevel ?? (spell ? effectiveSpellLevel(spell) : 0),
      casterLevel: Math.max(1, Math.trunc(casterLevel ?? 1)),
      abilityMod: abilityField(grant.rollData, def.dcAbility ?? "cha", "mod"),
      frequency: frequencyOf(grant),
      ...(metered ? { poolId: grant.attachPoolId ?? grant.id } : {}),
      source: grant.sourceLabel,
      classTag: grant.classTag,
      ...(def.note !== undefined ? { note: def.note } : {}),
    });
  }
  return rows;
}

/**
 * Synthetic pools for metered grants with no source pool to attach to —
 * appended by `deriveResourcePools` so the `live.resources` ledger, rest
 * handling, and roll-data resource slices all see them like any other pool.
 * Ids match the corresponding row's `id`/`poolId` exactly.
 */
export function deriveSlaResourcePools(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<string, AbilityView>,
  tables: SlaSourceTables = SLA_GRANT_TABLES,
): DerivedResourcePool[] {
  const pools: DerivedResourcePool[] = [];
  for (const grant of collectSlaGrants(doc, refData, abilities, tables)) {
    const { def } = grant;
    if (!def.uses || grant.attachPoolId !== undefined) continue;

    let max: number | null;
    try {
      max = tryEvaluateFormula(def.uses.formula, grant.rollData);
    } catch {
      continue;
    }
    if (max === null || Number.isNaN(max) || max <= 0) continue;

    const truncatedMax = Math.trunc(max);
    pools.push({
      id: grant.id,
      name: def.displayName ?? def.spell,
      max: truncatedMax,
      restValue: truncatedMax,
      per: def.uses.per ?? "day",
      classTag: grant.classTag,
      linkedBuffIds: [],
    });
  }
  return pools;
}

/**
 * The `live.resources` pool ids claimed by SLA rows — the tracker's
 * Resources panel hides these (uses are tracked on the Spell-Like Abilities
 * panel instead), covering both synthetic `sla:*` pools and attached
 * source pools.
 */
export function slaClaimedPoolIds(
  slas: readonly DerivedSpellLikeAbility[] | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const sla of slas ?? []) {
    if (sla.poolId !== undefined) ids.add(sla.poolId);
  }
  return ids;
}

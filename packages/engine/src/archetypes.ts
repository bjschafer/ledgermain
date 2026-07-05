/**
 * Resolve a character's granted base-class features and any archetype swaps
 * layered on top: which base feature is struck through, which archetype
 * feature replaced it (or, when the dataset couldn't pair a slot
 * unambiguously, a prose-only soft warning instead of a swap), and — for the
 * small hand-authored slice in `archetype-effects.ts` (issue #7) — the
 * archetype feature's own mechanical `detail` summary. The vendored archetype
 * dataset itself carries no numeric effects (see `packages/schema/src/
 * refdata.ts` `ArchetypeFeature` doc comment); any numbers shown here come
 * from `ARCHETYPE_FEATURE_EFFECTS`, not the dataset.
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
import { ARCHETYPE_FEATURE_EFFECTS } from "./archetype-effects.js";
import { BLOODLINES, type BloodlineResourcePool } from "./bloodlines.js";
import {
  sneakAttackDice,
  smiteEvilDetail,
  smiteEvilLabel,
  unarmedDamageDie,
  flurryOfBlowsLabel,
  barbarianDamageReduction,
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
  /** Set when this grant came from a chosen domain/school/bloodline/exploit rather than the class itself. */
  origin?: { kind: "domain" | "school" | "bloodline" | "exploit"; label: string };
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
      if (f.pairedBaseFeatureUuid) replacedByUuid.set(f.pairedBaseFeatureUuid, f.name);
    }
  }
  return replacedByUuid;
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
]);

/**
 * True when the character's barbarian Damage Reduction — `defenses.ts`'s
 * hardcoded `barbarianDamageReduction` table, not a vendored `Change` (the
 * class feature's `changes[]` is empty upstream) — has been replaced by an
 * active archetype at the character's current barbarian level. `defenses.ts`
 * uses this to skip that hardcoded contribution so it doesn't sit alongside
 * (or silently outrank) the archetype's own `dr`/`nac`-target effect from
 * `archetype-effects.ts`.
 */
export function barbarianDamageReductionReplaced(doc: CharacterDoc, refData: RefData): boolean {
  const barbLevel = doc.identity.classes.find((c) => c.tag === "barbarian")?.level ?? 0;
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
 * True when at least one of `archetypeId`'s features has a hand-authored
 * entry in `ARCHETYPE_FEATURE_EFFECTS` (issue #7) — used by `ArchetypePicker`
 * to badge which archetypes carry modeled numeric effects vs. structural/
 * prose-only swaps.
 */
export function archetypeHasModeledEffects(refData: RefData, archetypeId: string): boolean {
  for (const f of Object.values(refData.archetypeFeatures)) {
    if (f.archetypeId === archetypeId && ARCHETYPE_FEATURE_EFFECTS[f.id]) return true;
  }
  return false;
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
      features.push({
        level: f.level,
        name: f.name,
        description: f.description,
        ambiguous: !f.pairedBaseFeatureUuid,
        detail: ARCHETYPE_FEATURE_EFFECTS[f.id]?.detail?.(clsLevel),
      });
      if (f.pairedBaseFeatureUuid) {
        swappedSlots[f.level] = f.pairedBaseFeatureUuid;
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
    let detail: string | undefined = providedDetail;
    if (detail === undefined && classTag === "rogue" && grant.name === "Sneak Attack") {
      detail = sneakAttackDice(classLevel).diceLabel;
    } else if (detail === undefined && classTag === "paladin" && grant.name === "Smite Evil") {
      const chaMod = abilities?.cha?.mod ?? 0;
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
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
    if (f.archetypeId === archetypeId && f.pairedBaseFeatureUuid) {
      uuids.add(f.pairedBaseFeatureUuid);
    }
  }
  return uuids;
}

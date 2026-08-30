/**
 * Derives the PC's OWN natural-attack lines (bite, claws, ...) from
 * hand-authored grant tables — see `types.ts` for the charter. This is a
 * THIRD natural-attack surface alongside two that already exist:
 *
 * - `polymorph.ts`'s `computePolymorphAttacks` — a transformation the player
 *   transcribes off an assumed creature's stat block while `live.activeForm`
 *   is set. That form REPLACES the PC's own body, so this module returns no
 *   lines while a form is active (see `derivePcNaturalAttacks` below).
 * - `eidolon.ts`/companion natural attacks — a different creature's body
 *   entirely, unaffected by anything here.
 *
 * `compute.ts` calls {@link derivePcNaturalAttacks} to emit
 * `DerivedSheet.naturalAttacks` — the tracker's own-body natural-attack
 * lines, folded from the same typed-modifier pipeline as weapon attacks
 * (`attack`/`mattack`/`nattack` into the attack roll, `damage`/`ndamage`
 * into damage).
 */

import type {
  ActiveBuff,
  CharacterDoc,
  DerivedNaturalAttack,
  ModifierComponent,
  RefData,
  SizeId,
} from "@pf1/schema";

import { collectGrantedFeatures } from "../archetypes.js";
import type { CollectedModifier } from "../collect.js";
import { forTarget } from "../collect.js";
import { scaleWeaponDamageDice } from "../compute.js";
import { characterFeatSlugs, featNameSlug } from "../feat-effects.js";
import {
  classifyNaturalAttacks,
  naturalAttackBonus,
  naturalAttackDamageBonus,
  secondaryAttackPenalty,
} from "../natural-attacks.js";
import { RACIAL_TRAITS } from "../racial-traits.js";
import { resolveStack, synthetic, toComponents } from "../stacking.js";
import {
  ARCHETYPE_FEATURE_NATURAL_ATTACKS,
  CLASS_FEATURE_NATURAL_ATTACKS,
} from "./class-archetype.js";
import { FEAT_NATURAL_ATTACKS } from "./feats.js";
import { RACE_NATURAL_ATTACKS, RACIAL_TRAIT_NATURAL_ATTACKS } from "./racial.js";
import type {
  PcNaturalAttackBuffGate,
  PcNaturalAttackDef,
  PcNaturalAttackKind,
  PcNaturalAttackLine,
  PcNaturalAttackTables,
} from "./types.js";

export type {
  PcNaturalAttackBuffGate,
  PcNaturalAttackDef,
  PcNaturalAttackKind,
  PcNaturalAttackLine,
  PcNaturalAttackTables,
  RaceNaturalAttackDef,
} from "./types.js";
export {
  ARCHETYPE_FEATURE_NATURAL_ATTACKS,
  CLASS_FEATURE_NATURAL_ATTACKS,
} from "./class-archetype.js";
export { FEAT_NATURAL_ATTACKS } from "./feats.js";
export { RACE_NATURAL_ATTACKS, RACIAL_TRAIT_NATURAL_ATTACKS } from "./racial.js";

/** The four shard tables merged — overridable for tests (every shard ships empty, so unit tests inject small tables to exercise them). */
export const PC_NATURAL_ATTACK_TABLES: PcNaturalAttackTables = {
  race: RACE_NATURAL_ATTACKS,
  racialTrait: RACIAL_TRAIT_NATURAL_ATTACKS,
  classFeature: CLASS_FEATURE_NATURAL_ATTACKS,
  archetypeFeature: ARCHETYPE_FEATURE_NATURAL_ATTACKS,
  feat: FEAT_NATURAL_ATTACKS,
};

/** Strip one trailing parenthetical and normalize for name comparison — same convention as `spell-like-abilities/index.ts`'s trait-suppression check. */
function normalizeTraitName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

/**
 * Standard-trait names suppressed by the character's selected alternate/
 * heritage racial traits — mirrors `spell-like-abilities/index.ts`'s own
 * (unexported) helper of the same name; kept as a small local copy rather
 * than importing that module, since pulling in its whole SLA-grant surface
 * for one gating helper would be wasteful.
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

/** True when `gate` is satisfied by at least one of `activeBuffs` — matches by `buffId`, `effectTag`, or exact `name` (see `PcNaturalAttackBuffGate`'s doc comment). */
function requiredBuffSatisfied(
  gate: PcNaturalAttackBuffGate | undefined,
  activeBuffs: readonly ActiveBuff[],
): boolean {
  if (!gate) return true;
  return activeBuffs.some(
    (b) =>
      (b.buffId !== undefined && (gate.buffIds?.includes(b.buffId) ?? false)) ||
      (b.effectTag !== undefined && (gate.effectTags?.includes(b.effectTag) ?? false)) ||
      (gate.names?.includes(b.name) ?? false),
  );
}

/** One gate-passed grant, ready to flatten into attack lines. */
interface ResolvedPcNaturalAttackGrant {
  def: PcNaturalAttackDef;
  /** The level `minLevel` gated against and a level-scaled `mediumDice` function receives. */
  levelInScope: number;
}

/**
 * Every owned feat occurrence (`build.feats` plus `build.extraFeats`),
 * paired with the choiceId stored for that SAME occurrence — same
 * `{slug, choiceId}` shape as `dex-weapon-feats.ts`'s local `ownedFeats` /
 * `proficiency.ts`'s local `collectFeatInstances`, needed here so
 * {@link PcNaturalAttackDef.requiredChoiceId} can gate a feat-sourced grant
 * on the player's stored pick (Aspect of the Beast's four manifestations).
 */
function ownedFeatOccurrences(
  doc: CharacterDoc,
  refData: RefData,
): { slug: string; choiceId?: string }[] {
  const out: { slug: string; choiceId?: string }[] = [];
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    out.push({ slug: featNameSlug(feat.name), choiceId: doc.build.featChoices?.[featId] });
  }
  for (const instance of doc.build.extraFeats ?? []) {
    const feat = refData.feats[instance.featId];
    if (!feat) continue;
    out.push({ slug: featNameSlug(feat.name), choiceId: instance.choiceId });
  }
  return out;
}

/** The shared collection pass — every gate lives here so a suppressed or gated grant never contributes a line. */
function collectPcNaturalAttackGrants(
  doc: CharacterDoc,
  refData: RefData,
  tables: PcNaturalAttackTables,
): ResolvedPcNaturalAttackGrant[] {
  const grants: ResolvedPcNaturalAttackGrant[] = [];
  const characterLevel = doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
  const activeBuffs = doc.live.activeBuffs ?? [];
  const pushed = new Set<PcNaturalAttackDef>();

  const classLevelOf = (tag: string): number =>
    doc.identity.classes.find((c) => c.tag === tag)?.level ?? 0;

  const push = (def: PcNaturalAttackDef, grantingClassLevel?: number): void => {
    if (pushed.has(def)) return;
    const levelInScope = def.classTag
      ? classLevelOf(def.classTag)
      : (grantingClassLevel ?? characterLevel);
    if (def.minLevel !== undefined && levelInScope < def.minLevel) return;
    if (!requiredBuffSatisfied(def.requiredBuff, activeBuffs)) return;
    if (def.when && !def.when(doc)) return;
    pushed.add(def);
    grants.push({ def, levelInScope });
  };

  // Race — suppressible by a selected alternate/heritage trait, same posture as the SLA race table.
  const race = refData.races[doc.identity.race];
  const raceDefs = race ? tables.race[race.name] : undefined;
  if (race && raceDefs) {
    const suppressed = suppressedStandardTraits(doc, refData);
    for (const def of raceDefs) {
      if (def.standardTraitName && suppressed.has(normalizeTraitName(def.standardTraitName))) {
        continue;
      }
      push(def);
    }
  }

  // Racial traits — vendored and hand-authored stores, same race gates as the SLA racial-trait table.
  const raceName = race?.name;
  if (raceName) {
    for (const id of doc.build.vendoredRacialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = refData.racialTraits[id];
      if (!defs || !trait || !trait.race.includes(raceName)) continue;
      for (const def of defs) push(def);
    }
    for (const id of doc.build.racialTraits ?? []) {
      const defs = tables.racialTrait[id];
      const trait = RACIAL_TRAITS[id];
      if (!defs || !trait || trait.race !== raceName) continue;
      for (const def of defs) push(def);
    }
  }

  // Class features — vendored pack id, granting-class level in scope.
  for (const g of collectGrantedFeatures(doc, refData)) {
    const defs = tables.classFeature[g.grant.featureId];
    if (!defs) continue;
    const classLevel = classLevelOf(g.classTag);
    for (const def of defs) push(def, classLevel);
  }

  // Archetype features — iterate the TABLE, gate on the archetype being chosen and its class level.
  const chosenArchetypes = new Set(doc.build.archetypes ?? []);
  if (chosenArchetypes.size > 0) {
    for (const [featureId, defs] of Object.entries(tables.archetypeFeature)) {
      const af = refData.archetypeFeatures[featureId];
      if (!af || !chosenArchetypes.has(af.archetypeId)) continue;
      const classLevel = classLevelOf(af.classTag);
      if (classLevel < af.level) continue;
      for (const def of defs) push(def, classLevel);
    }
  }

  // Feats — slug-keyed; a duplicate copy of the same feat grants once (via
  // `pushed`). A def with `requiredChoiceId` only applies when THIS
  // occurrence's own stored choice matches (Aspect of the Beast).
  for (const { slug, choiceId } of ownedFeatOccurrences(doc, refData)) {
    const defs = tables.feat[slug];
    if (!defs) continue;
    for (const def of defs) {
      if (def.requiredChoiceId !== undefined && def.requiredChoiceId !== choiceId) continue;
      push(def);
    }
  }

  return grants;
}

/** A grant's attack line, resolved to its Medium-baseline dice string but not yet classified primary/secondary. */
interface RawAttackLine {
  name: string;
  count: number;
  mediumDice?: string;
  explicitKind?: PcNaturalAttackKind;
  note?: string;
}

function resolveMediumDice(
  mediumDice: PcNaturalAttackLine["mediumDice"],
  levelInScope: number,
): string | undefined {
  if (mediumDice === undefined) return undefined;
  return typeof mediumDice === "function" ? mediumDice(levelInScope) : mediumDice;
}

function flattenLines(grants: readonly ResolvedPcNaturalAttackGrant[]): RawAttackLine[] {
  const lines: RawAttackLine[] = [];
  for (const { def, levelInScope } of grants) {
    for (const line of def.attacks) {
      lines.push({
        name: line.name,
        count: line.count ?? 1,
        mediumDice: resolveMediumDice(line.mediumDice, levelInScope),
        explicitKind: line.kind,
        note: def.note,
      });
    }
  }
  return lines;
}

/**
 * The PC's own natural-attack lines — see the module header for how this
 * surface relates to `computePolymorphAttacks` and eidolon/companion
 * attacks. Returns `undefined` (never an empty array) both when the
 * character has no grants and while `doc.live.activeForm` is set: an active
 * polymorph form REPLACES the PC's own body, and its natural-attack lines
 * are the ActiveForm panel's to show, not this one's — showing both would
 * double up attacks the character can't actually make simultaneously.
 *
 * `bab`/`strMod`/`sizeAttackMod`/`effectiveSize`/`collected`/
 * `flatAttackPenaltyComponents` are exactly the values `compute.ts` already
 * threads into `computeWeaponAttacks` and `computePolymorphAttacks` — this
 * derivation reuses them rather than recomputing anything.
 */
export function derivePcNaturalAttacks(
  doc: CharacterDoc,
  refData: RefData,
  bab: number,
  strMod: number,
  sizeAttackMod: number,
  effectiveSize: SizeId,
  collected: CollectedModifier[],
  flatAttackPenaltyComponents: ModifierComponent[],
  tables: PcNaturalAttackTables = PC_NATURAL_ATTACK_TABLES,
): DerivedNaturalAttack[] | undefined {
  if (doc.live.activeForm) return undefined;

  const grants = collectPcNaturalAttackGrants(doc, refData, tables);
  if (grants.length === 0) return undefined;
  const rawLines = flattenLines(grants);
  if (rawLines.length === 0) return undefined;

  // Classified across the WHOLE set together — primary/secondary and the
  // lone-attack ×1.5 Str rider are properties of the character's combined
  // natural-attack routine, not of any one grant in isolation (see
  // `classifyNaturalAttacks`'s doc comment).
  const classified = classifyNaturalAttacks(rawLines);
  const hasMultiattack = characterFeatSlugs(doc, refData).includes("multiattack");

  const flatAttackPenalty = flatAttackPenaltyComponents.reduce((s, c) => s + c.value, 0);
  const attackStack = resolveStack([
    ...forTarget(collected, "attack"),
    ...forTarget(collected, "mattack"), // natural attacks are always melee
    ...forTarget(collected, "nattack"),
  ]);
  const damageStack = resolveStack([
    ...forTarget(collected, "damage"),
    ...forTarget(collected, "ndamage"),
  ]);

  const baseAttackBonus = bab + strMod + sizeAttackMod + attackStack.total + flatAttackPenalty;
  const baseAttackComponents: ModifierComponent[] = [
    synthetic("BAB", "base", bab),
    synthetic("Strength", "ability", strMod),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(attackStack.modifiers),
    ...flatAttackPenaltyComponents,
  ];
  const damageComponentsCommon = toComponents(damageStack.modifiers);

  return classified.map((line): DerivedNaturalAttack => {
    const kind = line.explicitKind ?? line.attackType;
    const secondary = kind === "secondary";

    const attackBonus = naturalAttackBonus(baseAttackBonus, kind, hasMultiattack);
    const attackComponents: ModifierComponent[] = secondary
      ? [
          ...baseAttackComponents,
          synthetic("Secondary natural attack", "penalty", secondaryAttackPenalty(hasMultiattack)),
        ]
      : baseAttackComponents;

    const strDamageBonus = naturalAttackDamageBonus(strMod, kind, line.strMultiplier);
    const strLabel = secondary
      ? "Strength (½)"
      : line.strMultiplier === 1.5
        ? "Strength (×1.5)"
        : "Strength";
    const damageComponents: ModifierComponent[] = [
      synthetic(strLabel, "ability", strDamageBonus),
      ...damageComponentsCommon,
    ];
    const damageDice =
      line.mediumDice !== undefined
        ? scaleWeaponDamageDice(line.mediumDice, "med", effectiveSize)
        : undefined;

    return {
      name: line.name,
      count: line.count,
      kind,
      attackBonus,
      attackComponents,
      ...(damageDice !== undefined ? { damageDice } : {}),
      damageBonus: strDamageBonus + damageStack.total,
      damageComponents,
      ...(line.note !== undefined ? { notes: [line.note] } : {}),
    };
  });
}

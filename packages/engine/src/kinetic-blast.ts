/**
 * Kinetic blast attack/damage lines, clean-room from the published PF1
 * kineticist rules (Occult Adventures; cross-checked against the vendored
 * Kinetic Blast class-feature prose, which is OGL compendium data):
 *
 *   - Physical blasts are ranged ATTACKS dealing "1d6+1 + the kineticist's
 *     Constitution modifier, increasing by 1d6+1 for every 2 kineticist
 *     levels beyond 1st" — so the flat rider is always +1 per die.
 *   - Energy blasts are ranged TOUCH attacks dealing "1d6 + 1/2 the
 *     kineticist's Constitution modifier, increasing by 1d6 for every 2
 *     kineticist levels beyond 1st" — no per-die rider, half Con.
 *   - Composite blasts double both dice and rider: "2d6+2 + Con modifier,
 *     increasing by 2d6+2 for every 2 kineticist levels beyond 1st"
 *     (physical) / "2d6 + 1/2 Con modifier" (energy). The Con addend is NOT
 *     doubled.
 *
 * Dice counts stay display strings — the formula DSL cannot evaluate a dice
 * term (engine cookbook §2.2), and this engine never rolls. Only the numeric
 * addends land in `damageBonus`.
 *
 * Blasts are weapon-LIKE, not weapons ("Kinetic blasts count as a type of
 * weapon for the purpose of feats such as Weapon Focus"), so these lines pull
 * the same `Change` targets a ranged `WeaponInstance` does — including the
 * synthetic weapon group {@link KINETIC_BLAST_WEAPON_GROUP}, which is what a
 * Weapon Focus (kinetic blast) pick writes to. What they deliberately do NOT
 * borrow from `computeWeaponAttacks`: BAB iteratives (a blast is a standard
 * action, one per activation), proficiency penalties (nothing to be
 * proficient with), enhancement/masterwork (nothing to enchant), and
 * size-scaled damage dice (the dice come from class level, not a weapon's
 * size).
 *
 * NOT modeled here, and left to the table: form and substance infusions
 * (which rewrite range, area, and save behavior per activation), Gather Power
 * and Infusion Specialization burn discounts, and Metakinesis. Each is a
 * per-activation choice with no build field to read.
 */

import type {
  AbilityId,
  CharacterDoc,
  DerivedKineticBlast,
  ModifierComponent,
  RefData,
} from "@pf1/schema";

import { type ActiveAbilitySubstitution, resolveSubstitution } from "./ability-substitution.js";
import { forTarget, type CollectedModifier } from "./collect.js";
import {
  eligibleCompositeBlasts,
  elementSimpleBlasts,
  knownSimpleBlasts,
  mergedCompositeBlastCatalog,
} from "./kineticist-elements.js";
import { resolveStack, synthetic, toComponents } from "./stacking.js";
import { kineticOverflowBonus } from "./tables.js";

/**
 * The weapon-group key blast lines match `attack.weapon.<group>` /
 * `damage.weapon.<group>` Changes against — what a Weapon Focus (or Weapon
 * Specialization) pick of "kinetic blast" targets. Kept in the same
 * kebab-case slug convention as `weapon-groups.ts`' vocabulary, though it is
 * not one of Foundry's weapon categories: no vendored weapon carries it, so
 * it can never collide with a real group.
 */
export const KINETIC_BLAST_WEAPON_GROUP = "kinetic-blast";

/** Range in feet, before the Extended Range infusion (a per-activation choice). */
const BLAST_RANGE_FT = 30;

/**
 * Damage descriptors for the 22 published composite blasts, hand-authored
 * from their damage lines. Kept here rather than on
 * `KineticistCompositeBlastDef` for the reason that table's own doc comment
 * gives for leaving vendored `damageType` undefined: the descriptors are free
 * prose upstream ("half bludgeoning, half fire"), not a parseable field, so
 * they are authored where they are displayed.
 */
const COMPOSITE_BLAST_DESCRIPTORS: Readonly<Record<string, string>> = {
  autumnBlast: "any two of bludgeoning, piercing, slashing (half each)",
  blizzardBlast: "half piercing, half cold",
  blueFlameBlast: "fire",
  chargedWaterBlast: "half bludgeoning, half electricity",
  forceBlast: "force",
  iceBlast: "half piercing, half cold",
  magmaBlast: "half bludgeoning, half fire",
  metalBlast: "bludgeoning, piercing, or slashing",
  mudBlast: "bludgeoning",
  negativeAdmixture: "half negative energy, half a chosen energy type",
  plasmaBlast: "half bludgeoning, half fire",
  positiveAdmixture: "half positive energy, half a chosen energy type",
  sandstormBlast: "piercing and slashing",
  springBlast: "half bludgeoning, half piercing or slashing",
  steamBlast: "half bludgeoning, half fire",
  summerBlast: "half fire, half bludgeoning, piercing, or slashing",
  thunderstormBlast: "half bludgeoning, half electricity",
  verdantBlast: "bludgeoning, piercing, slashing, and optionally positive energy",
  voidBlast: "half bludgeoning, half negative energy",
  winterBlast: "half cold, half bludgeoning, piercing, or slashing",
};

/**
 * Composite entries that are NOT blasts in their own right: each infuses a
 * blast the kineticist already knows (Aetheric Boost adds +1 damage per die;
 * Gravitic Boost upgrades its dice from d6 to d8). Both keep their catalog
 * rows for eligibility and prose, but neither gets an attack line — the line
 * would double-count the blast it modifies.
 */
const BLAST_MODIFIER_IDS: ReadonlySet<string> = new Set(["aethericBoost", "graviticBoost"]);

/**
 * Force Blast is the one composite whose damage is explicitly downgraded:
 * "Force blast deals damage as a simple energy blast instead of a composite
 * energy blast." Its burn cost stays a composite's 2.
 */
const SIMPLE_DAMAGE_COMPOSITE_IDS: ReadonlySet<string> = new Set(["forceBlast"]);

/** Dice a blast rolls: `ceil(level / 2)` for a simple blast, doubled for a composite. */
export function kineticBlastDiceCount(
  kineticistLevel: number,
  kind: "simple" | "composite",
): number {
  const simple = Math.ceil(Math.max(1, kineticistLevel) / 2);
  return kind === "composite" ? simple * 2 : simple;
}

/**
 * The Constitution addend on a blast's damage: the full modifier for a
 * physical blast, half (rounded down) for an energy blast. A Con PENALTY is
 * not halved — the full penalty always applies, the same asymmetry
 * `computeWeaponAttacks` documents for a multiplied ability bonus.
 */
export function kineticBlastConDamage(conMod: number, blastType: "physical" | "energy"): number {
  if (blastType === "physical") return conMod;
  return conMod >= 0 ? Math.floor(conMod / 2) : conMod;
}

export interface KineticBlastContext {
  bab: number;
  sizeAttackMod: number;
  collected: CollectedModifier[];
  abilityMods: Readonly<Record<AbilityId, number>>;
  substitutions: readonly ActiveAbilitySubstitution[];
  /** Burn currently held, read from the Burn pool's `used` count by the caller. */
  currentBurn: number;
}

/**
 * Every blast line the character can currently throw: each simple blast she
 * knows (see `knownSimpleBlasts`) plus each composite blast she qualifies for
 * (see `eligibleCompositeBlasts`, resolved against the merged vendored
 * catalog). Empty for a character with no kineticist levels or no chosen
 * element.
 */
export function computeKineticBlasts(
  doc: CharacterDoc,
  refData: RefData,
  ctx: KineticBlastContext,
): DerivedKineticBlast[] {
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  const primaryElement = doc.build.kineticistElement;
  if (kineticistLevel <= 0 || !primaryElement) return [];

  const expandedElements = doc.build.kineticistExpandedElements ?? [];
  const choices = doc.build.kineticistSimpleBlasts ?? {};

  const lines: DerivedKineticBlast[] = [];
  for (const blast of knownSimpleBlasts(primaryElement, expandedElements, choices)) {
    lines.push(
      blastLine(doc, ctx, kineticistLevel, {
        id: blast.id,
        name: blast.name,
        kind: "simple",
        diceKind: "simple",
        blastType: blast.damageType,
        descriptor: blast.descriptor,
        burn: 0,
        elements: elementsOfSimpleBlast(primaryElement, expandedElements, blast.id),
      }),
    );
  }

  const composites = eligibleCompositeBlasts(
    primaryElement,
    expandedElements,
    mergedCompositeBlastCatalog(refData),
    choices,
  );
  for (const cb of composites) {
    if (BLAST_MODIFIER_IDS.has(cb.id)) continue;
    // A vendored-only entry carries no `damageType` (see
    // `mergedCompositeBlastCatalog`) — physical vs. energy decides both the
    // damage math and whether the roll targets touch AC, so there is nothing
    // honest to show without it.
    if (!cb.damageType) continue;
    lines.push(
      blastLine(doc, ctx, kineticistLevel, {
        id: cb.id,
        name: cb.name,
        kind: "composite",
        diceKind: SIMPLE_DAMAGE_COMPOSITE_IDS.has(cb.id) ? "simple" : "composite",
        blastType: cb.damageType,
        descriptor: COMPOSITE_BLAST_DESCRIPTORS[cb.id] ?? cb.damageType,
        burn: cb.burn,
        elements: cb.requiredElements,
      }),
    );
  }
  return lines;
}

interface BlastSpec {
  id: string;
  name: string;
  kind: "simple" | "composite";
  /** Which damage progression to roll on — differs from `kind` only for Force Blast. */
  diceKind: "simple" | "composite";
  blastType: "physical" | "energy";
  descriptor: string;
  burn: number;
  elements: string[];
}

function blastLine(
  doc: CharacterDoc,
  ctx: KineticBlastContext,
  kineticistLevel: number,
  spec: BlastSpec,
): DerivedKineticBlast {
  const { bab, sizeAttackMod, collected, abilityMods, substitutions, currentBurn } = ctx;
  const overflow = kineticOverflowBonus(kineticistLevel, currentBurn);

  // Blasts are ranged attacks, so Dexterity — resolved through the same
  // substitution pass a ranged weapon uses, so a Dex-replacing feature
  // (Zen Archery and friends) reaches blast lines too.
  const attackAbility = resolveSubstitution("attack.ranged", "dex", abilityMods, substitutions);
  const attackStack = resolveStack([
    ...forTarget(collected, "attack"),
    ...forTarget(collected, "rattack"),
    ...forTarget(collected, `attack.weapon.${KINETIC_BLAST_WEAPON_GROUP}`),
  ]);
  const attackTotal =
    bab + attackAbility.mod + sizeAttackMod + attackStack.total + overflow.attackBonus;
  const attackComponents: ModifierComponent[] = [
    synthetic("BAB", "base", bab),
    synthetic(
      attackAbility.substitution ? `Dexterity (${attackAbility.substitution.source})` : "Dexterity",
      "ability",
      attackAbility.mod,
    ),
    ...(sizeAttackMod !== 0 ? [synthetic("Size", "size", sizeAttackMod)] : []),
    ...toComponents(attackStack.modifiers),
    ...(overflow.attackBonus !== 0
      ? [synthetic("Elemental Overflow", "untyped", overflow.attackBonus)]
      : []),
  ];

  const dice = kineticBlastDiceCount(kineticistLevel, spec.diceKind);
  // "+1 per die" is the physical blast's rider; energy blasts have none.
  const diceRider = spec.blastType === "physical" ? dice : 0;
  const conDamage = kineticBlastConDamage(abilityMods.con, spec.blastType);
  const damageStack = resolveStack([
    ...forTarget(collected, "damage"),
    ...forTarget(collected, "wdamage"),
    ...forTarget(collected, "rwdamage"),
    ...forTarget(collected, `damage.weapon.${KINETIC_BLAST_WEAPON_GROUP}`),
  ]);
  const damageTotal = diceRider + conDamage + damageStack.total + overflow.damageBonus;
  const damageComponents: ModifierComponent[] = [
    ...(diceRider !== 0 ? [synthetic("Physical blast (+1/die)", "untyped", diceRider)] : []),
    ...(conDamage !== 0
      ? [
          synthetic(
            spec.blastType === "physical" ? "Constitution" : "Constitution ×1/2",
            "ability",
            conDamage,
          ),
        ]
      : []),
    ...toComponents(damageStack.modifiers),
    ...(overflow.damageBonus !== 0
      ? [synthetic("Elemental Overflow", "untyped", overflow.damageBonus)]
      : []),
  ];

  return {
    id: spec.id,
    name: spec.name,
    kind: spec.kind,
    blastType: spec.blastType,
    descriptor: spec.descriptor,
    touch: spec.blastType === "energy",
    attack: { total: attackTotal, components: attackComponents },
    damageBonus: { total: damageTotal, components: damageComponents },
    damageDice: `${dice}d6`,
    crit: "×2",
    range: BLAST_RANGE_FT,
    burn: spec.burn,
    elements: spec.elements,
  };
}

/** Which known element(s) offer this simple blast — for grouping only. */
function elementsOfSimpleBlast(
  primaryElement: string,
  expandedElements: readonly string[],
  blastId: string,
): string[] {
  const tags = [...new Set([primaryElement, ...expandedElements].filter(Boolean))];
  return tags.filter((tag) => elementSimpleBlasts(tag).some((b) => b.id === blastId));
}

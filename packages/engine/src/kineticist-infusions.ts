/**
 * The per-activation shape of a kinetic blast: form/substance infusions,
 * Gather Power, and Metakinesis. Clean-room from the published PF1 kineticist
 * rules (Occult Adventures; cross-checked against the vendored Infusion,
 * Infusion Specialization, Gather Power, Metakinesis, Burn, and Wild Talents
 * class-feature prose, which is OGL compendium data).
 *
 * Everything here is arithmetic over three published sentences, which is why
 * it lives in one small module rather than being spread across the blast
 * lines that consume it:
 *
 *   - **Effective spell level.** "Kinetic blast and defense wild talents are
 *     always considered to have an effective spell level equal to 1/2 the
 *     kineticist's class level (to a maximum effective spell level of 9th at
 *     kineticist level 18th)." Every save DC on a blast line reads this.
 *   - **Save DC.** "Unless otherwise noted, the DC for a saving throw against
 *     a wild talent is equal to 10 + the wild talent's effective spell level
 *     + the kineticist's Constitution modifier", with the Infusion feature's
 *     two overrides: the DC uses "the associated kinetic blast's effective
 *     spell level, not the level of the infusion", and "the DCs for form
 *     infusions are calculated using the kineticist's Dexterity modifier
 *     instead of her Constitution modifier".
 *   - **Burn.** The infusion's cost "is added to the burn cost of the kinetic
 *     blast the infusion modifies"; Infusion Specialization "reduces the
 *     combined burn cost of the infusions by 1 ... can't reduce the total
 *     cost of the infusions used below 0"; Gather Power reduces "the total
 *     burn cost of a blast wild talent" and "can never reduce the burn cost
 *     of a wild talent below 0 points".
 *
 * The two reductions therefore have DIFFERENT scopes and cannot be summed
 * into one number: Infusion Specialization is clamped against the infusion
 * subtotal alone, Gather Power against everything.
 *
 * NOT modeled, and deliberately: the per-infusion burn escalations several
 * entries offer (Pushing Infusion buying 5 more feet per point, Focused Blast
 * buying its enhancement bonus up to +5), the damage-for-DC trades (Dazzling
 * and Flash Infusion's "reduce the blast's damage by half to increase the DC
 * by 2"), and Disintegrating/Elemental Trap's unreducible surcharges. Each is
 * an open-ended per-activation dial rather than a state the loadout holds,
 * and each stays in the infusion's own rules text.
 */

import type {
  KineticBlastDelivery,
  KineticistBlastLoadout,
  KineticistGatherPowerMode,
  KineticistMetakinesisOption,
  RefData,
} from "@pf1/schema";

import {
  KINETICIST_WILD_TALENTS,
  type KineticistWildTalentDef,
  resolveKineticistWildTalent,
} from "./kineticist-wild-talents.js";
import { infusionSpecializationReduction } from "./tables.js";

/**
 * A blast's effective spell level: half the kineticist's class level, capped
 * at 9th. The published formula floors to 0 at 1st level, which is not a
 * legal effective spell level for a wild talent ("a kineticist can always
 * select 1st-level wild talents"), so the floor here is 1 — the reading that
 * keeps a 1st-level kineticist's blast a 1st-level effect.
 */
export function kineticBlastEffectiveSpellLevel(kineticistLevel: number): number {
  return Math.min(9, Math.max(1, Math.floor(Math.max(0, kineticistLevel) / 2)));
}

/**
 * Points Gather Power takes off the total, by how long she spent gathering.
 * Supercharge (11th level) rewrites both printed values: "when using gather
 * power as a move action, a kineticist can reduce the total burn cost of a
 * single wild talent by 2 points instead of 1. When using gather power for 1
 * full round, she can reduce the burn cost ... by 3 points instead of 2."
 *
 * The third stance composes the other two, exactly as the base rule does: a
 * full round is worth 2 and the following move action 1 more, which is how
 * Gather Power reaches its printed total of 3. Supercharge upgrades each half
 * on its own terms, so the composed stance reaches 5. Supercharge never
 * restates the combined case, and this is the reading that keeps the two
 * halves consistent with the sentence they come from.
 */
export function gatherPowerReduction(
  mode: KineticistGatherPowerMode | undefined,
  kineticistLevel: number,
): number {
  const supercharged = kineticistLevel >= 11;
  switch (mode) {
    case "move":
      return supercharged ? 2 : 1;
    case "fullRound":
      return supercharged ? 3 : 2;
    case "fullRoundThenMove":
      return supercharged ? 5 : 3;
    default:
      return 0;
  }
}

/** Display label for one Gather Power stance, with the level's actual reduction. */
export function gatherPowerModeLabel(
  mode: KineticistGatherPowerMode,
  kineticistLevel: number,
): string {
  const off = `-${gatherPowerReduction(mode, kineticistLevel)} burn`;
  switch (mode) {
    case "move":
      return `Move action (${off})`;
    case "fullRound":
      return `Full round, blast next turn (${off})`;
    case "fullRoundThenMove":
      return `Full round, then a move next turn (${off})`;
  }
}

export interface KineticistMetakinesisDef {
  id: KineticistMetakinesisOption;
  name: string;
  /** Kineticist level it becomes available at. */
  minLevel: number;
  burn: number;
  summary: string;
}

/**
 * Metakinesis, in the order the class feature grants it. RAW prices each
 * option separately and never declares them mutually exclusive, so a loadout
 * carrying more than one pays for each.
 */
export const KINETICIST_METAKINESIS: readonly KineticistMetakinesisDef[] = [
  {
    id: "empower",
    name: "Empower",
    minLevel: 5,
    burn: 1,
    summary: "The blast is empowered, as Empower Spell.",
  },
  {
    id: "maximize",
    name: "Maximize",
    minLevel: 9,
    burn: 2,
    summary: "The blast is maximized, as Maximize Spell.",
  },
  {
    id: "quicken",
    name: "Quicken",
    minLevel: 13,
    burn: 3,
    summary: "The blast is quickened, as Quicken Spell.",
  },
  {
    id: "twice",
    name: "Twice",
    minLevel: 17,
    burn: 4,
    summary:
      "Throw the blast twice with the same standard action (or swift, if also quickened). Every modification applies to both, and the burn is paid once.",
  },
];

/** Combined burn cost of the Metakinesis options in a loadout. */
export function metakinesisBurn(options: readonly KineticistMetakinesisOption[]): number {
  const seen = new Set(options);
  return KINETICIST_METAKINESIS.filter((m) => seen.has(m.id)).reduce((sum, m) => sum + m.burn, 0);
}

/**
 * The DC of a save against a wild talent: 10 + its effective spell level +
 * the governing ability modifier.
 */
export function wildTalentSaveDc(effectiveSpellLevel: number, abilityMod: number): number {
  return 10 + effectiveSpellLevel + abilityMod;
}

/**
 * Which ability modifier an infusion's save DC uses — Dexterity for a form
 * infusion, Constitution for everything else.
 */
export function infusionSaveAbility(kind: "form" | "substance" | undefined): "con" | "dex" {
  return kind === "form" ? "dex" : "con";
}

/**
 * The infusions a loadout names, resolved to hand-authored defs and filtered
 * to the ones the character actually knows. A pick that isn't in
 * `knownTalentIds` is dropped rather than honored: the loadout is live state
 * that can outlive a build change (a retrained infusion, a rebuilt
 * character), and silently costing burn for an infusion she no longer has
 * would be worse than ignoring it. A vendored-only infusion resolves too, but
 * carries no `blastEffect`, so it contributes burn and prose and nothing else.
 */
export function resolveLoadoutInfusions(
  loadout: KineticistBlastLoadout | undefined,
  knownTalentIds: readonly string[],
  refData: RefData,
): { form?: KineticistWildTalentDef; substance?: KineticistWildTalentDef } {
  if (!loadout) return {};
  const known = new Set(knownTalentIds);
  const pick = (id: string | undefined, kind: "form" | "substance") => {
    if (!id || !known.has(id)) return undefined;
    const hand = KINETICIST_WILD_TALENTS[id];
    if (hand) return hand.category === "infusion" && hand.kind === kind ? hand : undefined;
    const merged = resolveKineticistWildTalent(id, refData);
    if (!merged || merged.category !== "infusion") return undefined;
    // A vendored-only row carries no form/substance split (the published
    // prose only labels a handful), so it is taken at the slot it was put in.
    return { ...merged, kind } satisfies KineticistWildTalentDef;
  };
  return { form: pick(loadout.form, "form"), substance: pick(loadout.substance, "substance") };
}

/**
 * How one infusion rewrites the blast line it is applied to. Every field is
 * optional; an infusion with no entry in {@link INFUSION_BLAST_EFFECTS} still
 * costs its burn and prints its rules text, it just doesn't move a number.
 */
export interface KineticistInfusionBlastEffect {
  /** Range in feet instead of 30. `0` means the effect starts at the kineticist. */
  rangeFt?: number;
  /** How the blast reaches its target once this infusion shapes it. */
  delivery?: KineticBlastDelivery;
  /** The area covered instead of a single target, e.g. `"30-ft. line"`. */
  area?: string;
  /** The published Saving Throw entry, when it names one. */
  save?: { type: "fort" | "ref" | "will"; effect: string };
  /**
   * How much of the blast's damage each target takes. The dice and damage
   * bonus on the line are left UNSCALED: the published fractions apply to the
   * rolled total, and halving a display string would put the rounding in the
   * wrong place (this engine never rolls).
   */
  damageQualifier?: string;
  /** A typed bonus this infusion adds to the blast's attack roll (a `Change.type`). */
  attackBonus?: { value: number; type: string };
  /** True when the infusion strips Elemental Overflow's damage bonus. */
  suppressOverflowDamage?: boolean;
  /** One line for what the fields above can't carry. */
  note?: string;
}

/**
 * What each infusion does to a blast line, hand-authored from the published
 * Saving Throw / area / range entries (verified against the vendored infusion
 * prose, which is OGL compendium data and carries every one of those entries
 * verbatim).
 *
 * Only infusions that change something the sheet DISPLAYS appear here. An
 * infusion whose whole effect is a rider the sheet has no slot for (Magnetic
 * Infusion's +4 for allies with metal weapons, Penetrating Infusion's
 * resistance reduction, Rare-metal Infusion's DR bypass) is deliberately
 * absent: it still costs burn and still shows its rules text, and inventing a
 * display for it would claim more than the engine resolves.
 *
 * The `damageQualifier` strings are the published fractions verbatim in
 * play language, because a form infusion that scales damage almost always
 * scales it DIFFERENTLY for physical and energy blasts, and the sheet shows
 * one line for both.
 */
export const INFUSION_BLAST_EFFECTS: Readonly<Record<string, KineticistInfusionBlastEffect>> = {
  /* --------------------------------------------------- form infusions -- */
  "aether:foeThrow": {
    save: { type: "fort", effect: "negates" },
    note: "On a miss the thrown creature takes half damage and lands where it likes within 30 ft. of the target.",
  },
  "aether:forceHook": {
    note: "The blast hooks its target and drags you adjacent to it, as force hook charge.",
  },
  "aether:manyThrow": {
    rangeFt: 120,
    note: "One attack roll per target, up to your kineticist level, with no two targets more than 30 ft. apart.",
  },
  "aether:telekineticBoomerang": {
    note: "The thrown object returns to your hand, undamaged, and can be snapped back for a second attack if the first missed.",
  },
  "air:bolt": {
    delivery: "area",
    area: "5-ft.-wide, 30-ft.-long vertical bolt",
    save: { type: "ref", effect: "half" },
    note: "Outdoors in a storm, the blast deals 1 extra point of damage per die.",
  },
  "air:chain": {
    note: "Each hit lets you make a ranged touch attack against another target within 30 ft., for 1d6 less each time.",
  },
  "air:cloud": {
    rangeFt: 120,
    delivery: "area",
    area: "20-ft.-radius spread",
    damageQualifier: "1/4 damage when created, half on entering or ending a turn inside",
    note: "The cloud obscures vision as obscuring mist and lasts a number of rounds equal to your Constitution modifier.",
  },
  "air:cyclone": {
    rangeFt: 0,
    delivery: "area",
    area: "20-ft.-radius burst centered on you",
    save: { type: "ref", effect: "half" },
    damageQualifier: "half damage",
  },
  "air:energizeWeapon": {
    delivery: "rider",
    note: "Adds 1d6 damage of the blast's type to each attack with the chosen weapon, rising by 1d6 at 7th level and every 6 levels after, and doubled for a blue flame blast.",
  },
  "earth:deadlyEarth": {
    rangeFt: 120,
    delivery: "area",
    area: "20-ft. radius on an earthen surface",
    damageQualifier: "1/4 damage when created, half on entering or ending a turn inside",
    note: "The whole area counts as difficult terrain and lasts a number of rounds equal to your Constitution modifier.",
  },
  "earth:fragmentation": {
    rangeFt: 120,
    area: "20-ft. burst around the target struck",
    save: { type: "ref", effect: "half, see text" },
    damageQualifier: "full damage on the target hit, half in the burst",
    note: "The attack roll still has to hit: if it misses, nothing happens at all.",
  },
  "earth:impale": {
    area: "30-ft. line",
    note: "One attack roll against each creature in the line, nearest first, stopping at the first target the spike fails to hurt.",
  },
  "earth:tremor": {
    note: "Lets a normal blast reach a burrowing or incorporeal creature inside the surface you are touching.",
  },
  "fire:detonation": {
    rangeFt: 0,
    delivery: "area",
    area: "20-ft. radius centered on you",
    save: { type: "ref", effect: "half" },
  },
  "fire:eruption": {
    rangeFt: 120,
    delivery: "area",
    area: "10-ft.-radius, 40-ft.-high cylinder",
    save: { type: "ref", effect: "half" },
    damageQualifier: "half damage for a physical blast, full for an energy blast",
  },
  "fire:explosion": {
    rangeFt: 120,
    delivery: "area",
    area: "5-, 10-, 15-, or 20-ft.-radius spread",
    save: { type: "ref", effect: "half" },
  },
  "fire:fanOfFlames": {
    rangeFt: 0,
    delivery: "area",
    area: "15-ft. cone",
    save: { type: "ref", effect: "half" },
  },
  "universal:bladeRush": {
    delivery: "melee",
    attackBonus: { value: 2, type: "untyped" },
    note: "Move 30 ft. first without provoking, then attack once. You take a -2 penalty to AC until the start of your next turn.",
  },
  "universal:bladeWhirlwind": {
    delivery: "melee",
    area: "every foe within reach",
    note: "One attack against each foe in reach. A critical threat is confirmed against the first target you hit only.",
  },
  "universal:elementalTrap": {
    rangeFt: 0,
    delivery: "area",
    area: "10 ft. around a 5-ft. trap square",
    save: { type: "ref", effect: "half, see text" },
    note: "The creature that sets the trap off gets no save. Perception and Disable Device DC is 10 + your kineticist level + your Dexterity modifier.",
  },
  "universal:extendedRange": { rangeFt: 120 },
  "universal:extremeRange": { rangeFt: 480 },
  "universal:flurryOfBlasts": {
    rangeFt: 120,
    note: "Two blasts (three at 10th, four at 16th, five at 20th), each dealing damage as if you were a 1st-level kineticist, with no two targets more than 30 ft. apart.",
  },
  "universal:focusedBlast": {
    attackBonus: { value: 1, type: "enhancement" },
    note: "The same bonus applies to caster level checks to overcome spell resistance. Two more burn raises it by 1, to a maximum of +5.",
  },
  "universal:kineticBlade": {
    delivery: "melee",
    suppressOverflowDamage: true,
    note: "Used as part of an attack, charge, or full attack. Damage applies your usual blast modifiers but never your Strength.",
  },
  "universal:kineticFist": {
    delivery: "rider",
    note: "Adds 1d6 damage per 3 dice of blast damage to your natural attacks and unarmed strikes, ignoring spell resistance and taking none of the blast's damage modifiers.",
  },
  "universal:kineticWhip": {
    delivery: "melee",
    suppressOverflowDamage: true,
    note: "As kinetic blade, but with reach, and it threatens for attacks of opportunity until the start of your next turn.",
  },
  "universal:mobileBlast": {
    delivery: "area",
    area: "one 5-ft. square, movable as a move action",
    save: { type: "ref", effect: "negates" },
    damageQualifier: "1/4 damage, or half for an energy blast",
    note: "Lasts indefinitely if its burn cost before Gather Power is 0, otherwise a number of rounds equal to your Constitution modifier.",
  },
  "universal:snake": {
    rangeFt: 120,
    note: "Trace any path you like, which can put the blast past total cover and into squares you cannot see.",
  },
  "universal:spindle": {
    delivery: "area",
    area: "two adjacent 5-ft. squares, up to 30 ft. away",
    save: { type: "ref", effect: "negates, see text" },
    damageQualifier: "half damage for a physical blast, full for an energy blast",
  },
  "universal:torrent": {
    delivery: "area",
    area: "30-ft. line",
    save: { type: "ref", effect: "half" },
    damageQualifier: "half damage for a physical blast, full for an energy blast",
  },
  "universal:wall": {
    delivery: "area",
    area: "wall up to 10 ft. by 120 ft., or 20 ft. by 60 ft.",
    damageQualifier:
      "1/4 damage when created (half for an energy blast), half on crossing it (full for an energy blast)",
    note: "The wall gives cover from the far side and lasts a number of rounds equal to your Constitution modifier.",
  },
  "universal:whipHurricane": {
    delivery: "melee",
    area: "every foe within reach",
    note: "As blade whirlwind, with a whip that lasts until the beginning of your next turn.",
  },
  "void:singularity": {
    delivery: "area",
    area: "5-ft.-radius burst, growing to 10 ft. then 15 ft.",
    save: { type: "ref", effect: "half" },
    damageQualifier: "1/4 damage, or half for a negative blast",
  },
  "water:maelstrom": {
    rangeFt: 120,
    delivery: "area",
    area: "20-ft.-radius maelstrom, in water only",
    save: { type: "ref", effect: "partial" },
    damageQualifier: "1/4 damage even on a save, half on entering or ending a turn inside",
    note: "Swimming inside needs a DC 35 Swim check, and you can reposition every creature in it as a free action on your turn.",
  },
  "water:spray": {
    rangeFt: 0,
    delivery: "area",
    area: "30-ft. cone",
    save: { type: "ref", effect: "half" },
    damageQualifier: "half damage",
  },

  /* ---------------------------------------------- substance infusions -- */
  "aether:disintegratingInfusion": {
    save: { type: "fort", effect: "partial, see text" },
    damageQualifier: "double damage, or half the blast's normal damage on a save",
    note: "Anything dropped to 0 hit points is disintegrated. Destroying force effects or objects costs 1 burn each, and that point can never be reduced.",
  },
  "air:gustingInfusion": { save: { type: "fort", effect: "negates" } },
  "air:synapticInfusion": { save: { type: "will", effect: "negates" } },
  "air:thunderingInfusion": { save: { type: "fort", effect: "negates" } },
  "earth:entanglingInfusion": { save: { type: "ref", effect: "negates" } },
  "fire:burningInfusion": { save: { type: "ref", effect: "negates" } },
  "fire:dazzlingInfusion": { save: { type: "will", effect: "negates" } },
  "fire:flashInfusion": { save: { type: "will", effect: "negates" } },
  "fire:foxfireInfusion": { save: { type: "will", effect: "partial" } },
  "universal:drainingInfusion": {
    save: { type: "fort", effect: "partial, see text" },
    damageQualifier:
      "1/4 damage on a save, with no Constitution modifier or Elemental Overflow at all",
    suppressOverflowDamage: true,
    note: "Only creatures whose subtype matches your element are affected at all, and against them the blast targets touch AC and always allows spell resistance.",
  },
  "universal:kundaliniInfusion": { save: { type: "fort", effect: "partial" } },
  "universal:shepherdOfSouls": { save: { type: "will", effect: "negates" } },
  "universal:venomAdmixture": {
    note: "The poison brings its own type, save, DC, frequency, effect, and cure. One dose is consumed.",
  },
  "universal:venomInfusion": { save: { type: "fort", effect: "negates" } },
  "universal:venomInfusionGreater": { save: { type: "fort", effect: "negates" } },
  "void:dampeningInfusion": { save: { type: "will", effect: "negates" } },
  "void:enervatingInfusion": { save: { type: "fort", effect: "negates" } },
  "void:turningBlast": { save: { type: "will", effect: "negates" } },
  "void:unnervingInfusion": { save: { type: "will", effect: "negates" } },
  "void:weighingInfusion": { save: { type: "ref", effect: "negates" } },
  "water:chillingInfusion": { save: { type: "fort", effect: "negates" } },
  "water:entanglingInfusion": { save: { type: "ref", effect: "negates" } },
  "water:slickInfusion": { save: { type: "ref", effect: "negates" } },
  "wood:sporeInfusion": { save: { type: "fort", effect: "negates" } },
  "wood:toxicInfusion": { save: { type: "fort", effect: "negates" } },
  "wood:toxicInfusionGreater": { save: { type: "fort", effect: "negates" } },
};

export interface BlastBurnInput {
  /** The blast's own cost: 0 simple, 2 composite. */
  blastBurn: number;
  /** Combined cost of the applied infusions. */
  infusionBurn: number;
  metakinesisBurn: number;
  kineticistLevel: number;
  gatherPower: KineticistGatherPowerMode | undefined;
}

export interface BlastBurnBreakdown {
  blast: number;
  infusions: number;
  infusionSpecialization: number;
  metakinesis: number;
  gatherPower: number;
  total: number;
}

/**
 * The full burn arithmetic for one activation. Both reductions are reported
 * as the amount that actually came off, so a reduction wasted against an
 * already-free blast shows as 0 rather than as a phantom discount.
 */
export function resolveBlastBurn(input: BlastBurnInput): BlastBurnBreakdown {
  const specialization =
    input.infusionBurn > 0
      ? Math.min(input.infusionBurn, infusionSpecializationReduction(input.kineticistLevel))
      : 0;
  const beforeGather =
    input.blastBurn + (input.infusionBurn - specialization) + input.metakinesisBurn;
  const gather = Math.min(
    beforeGather,
    gatherPowerReduction(input.gatherPower, input.kineticistLevel),
  );
  return {
    blast: input.blastBurn,
    infusions: input.infusionBurn,
    infusionSpecialization: specialization,
    metakinesis: input.metakinesisBurn,
    gatherPower: gather,
    total: Math.max(0, beforeGather - gather),
  };
}

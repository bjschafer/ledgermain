/**
 * Curated special-material table (clean-room from PF1 RAW — not Foundry code).
 *
 * The upstream data bakes material effects into individual item stats at
 * authoring time; there is no runtime rule that recomputes them from a material
 * tag. This table encodes the published rules for the common materials so the
 * picker can apply them to any base armor/weapon at selection time.
 *
 * Mithral and darkwood change the wearer's numbers: both weigh half as much,
 * mithral shifts the weight class and eases maxDex, ACP and ASF, and darkwood
 * eases a shield's ACP by 2. Both already count as masterwork, so the engine's
 * `armorPieceAcp` skips its own masterwork reduction for them. What a material
 * lets a weapon get through is derived separately, from the `material` tag
 * itself: see `@pf1/engine`'s `weaponDrBypasses`.
 */
import type { ArmorRef } from "@pf1/schema";

export interface MaterialDef {
  id: string;
  name: string;
  /** Whether this material can be applied to armor/shields. */
  appliesToArmor: boolean;
  /** Whether this material can be applied to weapons. */
  appliesToWeapons: boolean;
  /** Weight multiplier for anything made of this material. Absent means unchanged. */
  weightFactor?: number;
  /**
   * Returns stat patches to merge onto an {@link ArmorRef} before
   * denormalization (ACP is a positive magnitude here, not yet negated).
   */
  applyToArmorRef?: (
    a: ArmorRef,
  ) => Partial<Pick<ArmorRef, "maxDex" | "acp" | "weightClass" | "asf">>;
}

const MATERIALS: Record<string, MaterialDef> = {
  steel: {
    id: "steel",
    name: "Steel",
    appliesToArmor: true,
    appliesToWeapons: true,
  },
  mithral: {
    id: "mithral",
    name: "Mithral",
    appliesToArmor: true,
    appliesToWeapons: true,
    weightFactor: 0.5,
    applyToArmorRef: (a: ArmorRef) => ({
      maxDex: (a.maxDex ?? 99) + 2,
      acp: Math.max(0, (a.acp ?? 0) - 3),
      weightClass: a.weightClass
        ? (Math.max(1, a.weightClass - 1) as ArmorRef["weightClass"])
        : undefined,
      asf: a.asf ? Math.max(0, a.asf - 10) : undefined,
    }),
  },
  adamantine: {
    id: "adamantine",
    name: "Adamantine",
    appliesToArmor: true,
    appliesToWeapons: true,
  },
  darkwood: {
    id: "darkwood",
    name: "Darkwood",
    appliesToArmor: true,
    appliesToWeapons: false,
    weightFactor: 0.5,
    applyToArmorRef: (a: ArmorRef) => ({ acp: Math.max(0, (a.acp ?? 0) - 2) }),
  },
  silver: {
    id: "silver",
    name: "Alchemical Silver",
    appliesToArmor: false,
    appliesToWeapons: true,
  },
  "cold-iron": {
    id: "cold-iron",
    name: "Cold Iron",
    appliesToArmor: false,
    appliesToWeapons: true,
  },
};

export { MATERIALS };

/** List of materials applicable to armor (for UI selectors). */
export const ARMOR_MATERIALS = Object.values(MATERIALS).filter((m) => m.appliesToArmor);

/** List of materials applicable to weapons (for UI selectors). */
export const WEAPON_MATERIALS = Object.values(MATERIALS).filter((m) => m.appliesToWeapons);

/** What an item of `weight` pounds weighs when made of `materialId`. */
export function materialWeight(weight: number, materialId?: string): number {
  const factor = materialId ? MATERIALS[materialId]?.weightFactor : undefined;
  return factor ? weight * factor : weight;
}

/**
 * Apply a material's stat modifiers (weight included) to an {@link ArmorRef}
 * and return the patched ref. Returns the original ref unchanged if the
 * material is unknown or changes nothing.
 */
export function applyMaterialToArmor(armor: ArmorRef, materialId?: string): ArmorRef {
  if (!materialId || materialId === "steel") return armor;
  const mat = MATERIALS[materialId];
  if (!mat) return armor;
  const patched = mat.applyToArmorRef ? { ...armor, ...mat.applyToArmorRef(armor) } : armor;
  return armor.weight != null && mat.weightFactor
    ? { ...patched, weight: armor.weight * mat.weightFactor }
    : patched;
}

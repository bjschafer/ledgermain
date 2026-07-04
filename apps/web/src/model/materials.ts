/**
 * Curated special-material table (clean-room from PF1 RAW — not Foundry code).
 *
 * The upstream data bakes material effects into individual item stats at
 * authoring time; there is no runtime rule that recomputes them from a material
 * tag. This table encodes the published rules for the common materials so the
 * picker can apply them to any base armor/weapon at selection time.
 *
 * Only mithral has mechanical effects the engine tracks (weight class shift,
 * maxDex +2, ACP −3, ASF −10%, issue #8). Other materials are display-only
 * for now (DR / hardness bypass not modelled by the engine).
 */
import type { ArmorRef } from "@pf1/schema";

export interface MaterialDef {
  id: string;
  name: string;
  /** Whether this material can be applied to armor/shields. */
  appliesToArmor: boolean;
  /** Whether this material can be applied to weapons. */
  appliesToWeapons: boolean;
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

/**
 * Apply a material's stat modifiers to an {@link ArmorRef} and return the
 * patched ref. Returns the original ref unchanged if the material is unknown
 * or has no armor modifiers.
 */
export function applyMaterialToArmor(armor: ArmorRef, materialId?: string): ArmorRef {
  if (!materialId || materialId === "steel") return armor;
  const mat = MATERIALS[materialId];
  if (!mat?.applyToArmorRef) return armor;
  return { ...armor, ...mat.applyToArmorRef(armor) };
}

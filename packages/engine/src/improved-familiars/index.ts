/**
 * Merged Improved Familiar surface — species shards + templates + the
 * lookup helpers `familiar.ts` and the web app consume. See `types.ts` for
 * the table family's charter and rules posture.
 */

import type { BaseFamiliar } from "../familiar.js";
import { IMPROVED_FAMILIARS_BASICS } from "./species-basics.js";
import { IMPROVED_FAMILIARS_CRB_OUTSIDERS } from "./species-crb-outsiders.js";
import { IMPROVED_FAMILIARS_MEPHITS } from "./species-mephits.js";
import { IMPROVED_FAMILIARS_SPLAT } from "./species-splat.js";
import type { ImprovedFamiliar } from "./types.js";

export { FAMILIAR_TEMPLATES } from "./templates.js";
export type {
  CreatureDefenses,
  FamiliarSlaDef,
  FamiliarTemplate,
  FamiliarTypeKind,
  ImprovedFamiliar,
  ImprovedFamiliarPrereq,
} from "./types.js";

/** Every Improved Familiar species, merged across the per-book shards. One id namespace with `BASE_FAMILIARS` — the picker draws from both. */
export const IMPROVED_FAMILIARS: Readonly<Record<string, ImprovedFamiliar>> = {
  ...IMPROVED_FAMILIARS_BASICS,
  ...IMPROVED_FAMILIARS_CRB_OUTSIDERS,
  ...IMPROVED_FAMILIARS_MEPHITS,
  ...IMPROVED_FAMILIARS_SPLAT,
};

/** Type guard: an improved species (full own stat block) vs a standard animal. */
export function isImprovedFamiliar(
  species: BaseFamiliar | ImprovedFamiliar,
): species is ImprovedFamiliar {
  return (species as ImprovedFamiliar).typeKind !== undefined;
}

/**
 * PC natural attacks granted by base-class features and archetype features —
 * see `types.ts`'s header for the table family's charter and `index.ts` for
 * the resolver.
 *
 * - `CLASS_FEATURE_NATURAL_ATTACKS`, keyed by the vendored `classFeatures`
 *   pack id (the `PER_DAY_ACTIVATIONS`/`CLASS_FEATURE_SLA_GRANTS`
 *   convention) — e.g. a druid's Wild Shape is NOT here (it's the dedicated
 *   `polymorph.ts` surface), but a class feature that grants a standing bite
 *   or claws directly onto the PC's own body (a shifter's aspect-granted
 *   claws, for instance) belongs here.
 * - `ARCHETYPE_FEATURE_NATURAL_ATTACKS`, keyed by the vendored
 *   `archetypeFeatures` pack id, gated by the resolver on the archetype
 *   being chosen and its class level.
 *
 * Both tables ship empty until a content wave fills them; leave new entries
 * here, not inline in `index.ts`.
 */

import type { PcNaturalAttackDef } from "./types.js";

export const CLASS_FEATURE_NATURAL_ATTACKS: Readonly<
  Record<string, readonly PcNaturalAttackDef[]>
> = {};

export const ARCHETYPE_FEATURE_NATURAL_ATTACKS: Readonly<
  Record<string, readonly PcNaturalAttackDef[]>
> = {};

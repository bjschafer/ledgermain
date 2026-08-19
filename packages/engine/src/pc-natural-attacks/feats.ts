/**
 * PC natural attacks granted by feats — see `types.ts`'s header for the
 * table family's charter and `index.ts` for the resolver. Keyed by
 * `featNameSlug`, the same slug-keying convention `FEAT_SLA_GRANTS`/
 * `FEAT_POOL_EFFECTS` use, so a duplicate copy of a feat still grants once.
 *
 * Ships empty until a content wave fills it; leave new entries here, not
 * inline in `index.ts`.
 */

import type { PcNaturalAttackDef } from "./types.js";

export const FEAT_NATURAL_ATTACKS: Readonly<Record<string, readonly PcNaturalAttackDef[]>> = {};

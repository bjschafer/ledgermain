/**
 * Spell-like abilities granted by feats, keyed by the feat's name slug
 * (`featNameSlug` in `feat-effects.ts` — the same keying as
 * `FEAT_CLASSIFICATION` / `FEAT_POOL_EFFECTS`, so system-pack and community
 * feats both resolve).
 *
 * Defaults for this shard (see `types.ts`): caster level is total character
 * level; uses formulas evaluate against character-level roll data (feats
 * have no granting class). Feats that only apply metamagic to an EXISTING
 * spell-like ability (the Empower/Quicken/… Spell-Like Ability family) stay
 * out — they grant nothing castable.
 */

import type { SlaGrantDef } from "./types.js";

export const FEAT_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {};

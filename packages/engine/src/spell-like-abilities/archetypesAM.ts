/**
 * Spell-like abilities granted by archetype features, classes A–M by class
 * tag (alchemist … monkUnchained) — keyed by the vendored
 * `RefData.archetypeFeatures` id
 * (`"<classTag>:<archetypeSlug>:<featureSlug>:<level>"`). The N–Z half lives
 * in `archetypesNZ.ts`; the class-tag split keeps wave agents' diffs
 * disjoint, and `index.ts` merges the two.
 *
 * Defaults for this shard (see `types.ts`): caster level is the archetype's
 * class level (`@class.unlevel`); the feature's own `level` already gates
 * when the grant appears, so `minLevel` is only for a grant that upgrades
 * later than the feature's grant level. Archetype features carry no vendored
 * `uses` block at all (the pack has no such field), so `attachToSourcePool`
 * never applies here — metered grants always state their own `uses`.
 */

import type { SlaGrantDef } from "./types.js";

export const ARCHETYPE_SLA_GRANTS_AM: Readonly<Record<string, readonly SlaGrantDef[]>> = {};

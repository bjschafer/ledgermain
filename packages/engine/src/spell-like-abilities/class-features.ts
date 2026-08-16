/**
 * Spell-like abilities granted by class features and by domain/school/
 * inquisition granted powers — one table, keyed by the vendored
 * `RefData.classFeatures` pack id (granted powers are classFeatures entries
 * too, and flow through `collectGrantedFeatures` with their granting class's
 * tag exactly like the per-day-activation table's keys).
 *
 * Defaults for this shard (see `types.ts`): caster level is the GRANTING
 * class's level (`@class.unlevel`); a `uses.formula` also evaluates with
 * `@class.unlevel` bound to that class. A feature whose vendored entry
 * already carries `uses.maxFormula` should attach (`attachToSourcePool`)
 * instead of restating the budget. `minLevel` is rarely needed — the vendored
 * grant level already gates when the feature appears.
 */

import type { SlaGrantDef } from "./types.js";

export const CLASS_FEATURE_SLA_GRANTS: Readonly<Record<string, readonly SlaGrantDef[]>> = {};

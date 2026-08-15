/**
 * Hand-authored `Change[]` patches for **granted** powers — features a
 * character gets not from its own class's automatic feature list, but from
 * a chosen cleric/inquisitor domain (or subdomain, or druid nature-bond
 * domain), wizard arcane school (or focused school), or inquisitor
 * inquisition. `collectGrantedFeatures` (`archetypes.ts`) already resolves
 * all of these for display and uses/day tracking, but nothing in
 * `collect.ts` walked their `changes[]` before this table existed — the
 * class-feature loop only reaches `RefData.classes[*].features`, a base or
 * prestige class's own list, never a granted power. A granted power whose
 * published text promises a numeric effect that fails to reach the sheet is
 * this table's reason to exist, same problem `CLASS_FEATURE_CHANGE_PATCHES`
 * solves for base class features (`class-feature-effects.ts`).
 *
 * Split by origin into `DOMAIN_POWER_PATCHES` (`domains.ts`),
 * `SCHOOL_POWER_PATCHES` (`schools.ts`), and `INQUISITION_POWER_PATCHES`
 * (`inquisitions.ts`) purely for file size — this merged table is the only
 * thing `collect.ts` actually reads.
 *
 * **Name-collision discipline**: every key in every one of the three tables
 * above is looked up against the SAME granted power's `name`, but that name
 * has to be unique across the whole granted-power space this table's
 * collection loop can reach — domains, subdomains, wizard schools, focused
 * schools, inquisitions, AND druid nature-bond domain picks (which resolve
 * through the domain/subdomain tables too, see `domains.ts`). Two different
 * catalogs granting a same-named power would both pick up the same patch
 * entry whether that's correct for both or not, so before adding a key,
 * search all of `class-features.json`, `domains.json`, `subdomains.json`,
 * `wizard-schools.json`, `focused-schools.json`, and `inquisitions.json`
 * for the exact name, not just the one catalog you're patching.
 *
 * **Patches only, never the vendored power's own `changes[]`.** The
 * collection loop in `collect.ts` deliberately does NOT apply a granted
 * power's vendored `changes[]` — those were left unrouted on purpose, and
 * auditing whether any of them are safe to turn on is a separate pass, not
 * part of standing up this hook.
 *
 * Only unconditional, self-facing numbers belong here — the same posture
 * `CLASS_FEATURE_CHANGE_PATCHES` documents at length: a power whose bonus
 * only helps an ally, needs an activation/resource, or is scoped to
 * something `Change`'s vocabulary (`save-categories.ts`'s `saveCategories`
 * included) can't express stays as description prose the player reads,
 * never a wrong or half-applied number.
 */

import type { Change } from "@pf1/schema";

import { DOMAIN_POWER_PATCHES } from "./domains.js";
import { INQUISITION_POWER_PATCHES } from "./inquisitions.js";
import {
  SCHOOL_POWER_CHOICES,
  SCHOOL_POWER_PATCHES,
  type GrantedPowerChoiceEntry,
} from "./schools.js";

export const GRANTED_POWER_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  ...DOMAIN_POWER_PATCHES,
  ...SCHOOL_POWER_PATCHES,
  ...INQUISITION_POWER_PATCHES,
};

export type { GrantedPowerChoiceEntry };

/**
 * Choose-one granted-power selections (Resistance (Power)'s energy type), the
 * `GRANTED_POWER_CHANGE_PATCHES` counterpart for powers that need a stored
 * pick rather than an unconditional number. Only `schools.ts` has an entry
 * today; the other two origin tables merge in here too so a future wave's
 * domain/inquisition choice-pilot needs no change to this aggregator.
 */
export const GRANTED_POWER_CHOICES: Readonly<Record<string, GrantedPowerChoiceEntry>> = {
  ...SCHOOL_POWER_CHOICES,
};

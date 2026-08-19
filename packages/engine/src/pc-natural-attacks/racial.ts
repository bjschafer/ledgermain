/**
 * PC natural attacks granted by races and racial traits — see `types.ts`'s
 * header for the table family's charter and `index.ts` for the resolver.
 *
 * - `RACE_NATURAL_ATTACKS`, keyed by `Race.name` — a natural weapon the
 *   race's own base description grants outright (rare; most published
 *   examples are actually a named racial trait, which belongs below
 *   instead). Subject to standard-trait suppression via `standardTraitName`.
 * - `RACIAL_TRAIT_NATURAL_ATTACKS`, keyed by a racial-trait id — either a
 *   vendored `RefData.racialTraits` id or a hand-authored `RACIAL_TRAITS` id
 *   (`racial-traits.ts`; the two stores' ids never collide). This is where
 *   most race-granted natural weapons belong (tengu's Gifted Adept doesn't
 *   grant one, but e.g. a "Claws" or "Bite" alternate racial trait would).
 *
 * Both tables ship empty until a content wave fills them; leave new entries
 * here, not inline in `index.ts`.
 */

import type { PcNaturalAttackDef, RaceNaturalAttackDef } from "./types.js";

export const RACE_NATURAL_ATTACKS: Readonly<Record<string, readonly RaceNaturalAttackDef[]>> = {};

export const RACIAL_TRAIT_NATURAL_ATTACKS: Readonly<Record<string, readonly PcNaturalAttackDef[]>> =
  {};

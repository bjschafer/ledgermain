/**
 * Clean-room PF1 Metamagic feat table (issue #71): hand-authored from the
 * published rules (cross-checked against aonprd.com's metamagic-feat pages —
 * no Foundry system code consulted, per CLAUDE.md). The vendored Foundry data
 * pack tags these 10 feats `"Metamagic"` but carries no structured slot-level
 * adjustment (it lives only in each feat's prose), so this registry supplies
 * the one number the tracker actually needs to model: how many spell-slot
 * levels applying the feat raises the prepared/cast slot.
 *
 * Keyed by name slug (see `featNameSlug`), for the same reason `feat-effects.ts`
 * is: Foundry feat ids are opaque UUIDs that may change between data versions,
 * so a slug from the canonical name is the stable, human-authorable key.
 * Lookup path: `doc.build.feats` → `refData.feats[id].name` → slug.
 *
 * Honesty bar (issue #71): the SLOT-LEVEL accounting is the modeled part. The
 * feat's numeric effect on the spell itself (Empower's +50%, Maximize's
 * maximized dice, Widen's doubled area, …) is a display-only `note`, never a
 * sheet number — the engine does not, and deliberately will not, recompute a
 * spell's damage/area/duration. The one exception is that a metamagic feat's
 * slot increase does NOT change the spell's EFFECTIVE level for save-DC /
 * concentration purposes — RAW, those still use the spell's actual level —
 * EXCEPT Heighten Spell, which genuinely raises the spell's effective level
 * ("all effects dependent on spell level are calculated according to the
 * heightened level"). `raisesEffectiveLevel` flags that single case so callers
 * can keep the save DC honest.
 */

/** Normalize a feat name to its slug key. Re-exported from `feat-effects.ts` to avoid a cycle at call sites. */
import { featNameSlug } from "./feat-effects.js";

export interface MetamagicDef {
  /** Name slug (see `featNameSlug`) — the map key. */
  slug: string;
  /** Feat display name. */
  name: string;
  /**
   * Spell-slot levels this feat adds to the prepared/cast slot. For a
   * `variable` feat this is the minimum (and default) increase; the player
   * may choose more, up to `maxIncrease` (Reach) or `9 - spellLevel` (Heighten).
   */
  slotIncrease: number;
  /**
   * True when the level increase is player-chosen rather than fixed: Reach
   * Spell (+1 per range-category step, 1–3) and Heighten Spell (raise to any
   * higher level). Fixed feats omit this.
   */
  variable?: boolean;
  /** Maximum chosen increase for a `variable` feat with a hard cap (Reach = 3). Heighten is capped per-spell (`9 - spellLevel`) at the call site instead. */
  maxIncrease?: number;
  /**
   * True ONLY for Heighten Spell: the slot increase also raises the spell's
   * effective level for every level-dependent effect (save DC, concentration
   * DC, dispel checks, …). Every other metamagic leaves the effective level —
   * and therefore the save DC — unchanged.
   */
  raisesEffectiveLevel?: boolean;
  /** At-table reminder of the feat's mechanical effect. Display-only context, never a sheet number. */
  note: string;
}

/**
 * The 10 metamagic feats in the vendored slice, by name slug. Values verified
 * against the published PF1 rules (Core Rulebook metamagic feats).
 */
export const METAMAGIC_FEATS: Readonly<Record<string, MetamagicDef>> = {
  "empower-spell": {
    slug: "empower-spell",
    name: "Empower Spell",
    slotIncrease: 2,
    note: "Variable, numeric effects (damage, healing, ability drain, etc.) increased by half (+50%). Does not affect the spell's save DC.",
  },
  "enlarge-spell": {
    slug: "enlarge-spell",
    name: "Enlarge Spell",
    slotIncrease: 1,
    note: "Range doubled (close/medium/long only).",
  },
  "extend-spell": {
    slug: "extend-spell",
    name: "Extend Spell",
    slotIncrease: 1,
    note: "Duration doubled (only for spells with a duration measured in rounds/minutes/hours).",
  },
  "heighten-spell": {
    slug: "heighten-spell",
    name: "Heighten Spell",
    slotIncrease: 1,
    variable: true,
    raisesEffectiveLevel: true,
    note: "Treated as a higher-level spell for ALL level-dependent effects, including save DC. Choose how many levels to raise it (up to 9th).",
  },
  "maximize-spell": {
    slug: "maximize-spell",
    name: "Maximize Spell",
    slotIncrease: 3,
    note: "Variable, numeric effects maximized (no roll); random variables (e.g. targets hit) still roll. Does not affect the spell's save DC.",
  },
  "quicken-spell": {
    slug: "quicken-spell",
    name: "Quicken Spell",
    slotIncrease: 4,
    note: "Cast as a swift action (one quickened spell per turn); does not provoke.",
  },
  "reach-spell": {
    slug: "reach-spell",
    name: "Reach Spell",
    slotIncrease: 1,
    variable: true,
    maxIncrease: 3,
    note: "Range increased one category per +1 slot level (touch → close → medium → long).",
  },
  "silent-spell": {
    slug: "silent-spell",
    name: "Silent Spell",
    slotIncrease: 1,
    note: "Cast with no verbal component.",
  },
  "still-spell": {
    slug: "still-spell",
    name: "Still Spell",
    slotIncrease: 1,
    note: "Cast with no somatic component (no arcane spell failure from that component).",
  },
  "widen-spell": {
    slug: "widen-spell",
    name: "Widen Spell",
    slotIncrease: 3,
    note: "Burst/emanation/spread area increased by 100%. Does not affect the spell's save DC.",
  },
};

/** The metamagic def for `slug`, or `undefined` if it is not a modeled metamagic feat. */
export function metamagicDef(slug: string): MetamagicDef | undefined {
  return METAMAGIC_FEATS[slug];
}

/** True when `slug` (a `featNameSlug`) names a modeled metamagic feat. */
export function isMetamagicFeat(slug: string): boolean {
  return slug in METAMAGIC_FEATS;
}

/** The metamagic def for a feat by its display `name` (slugged internally), or `undefined`. */
export function metamagicDefByName(name: string): MetamagicDef | undefined {
  return METAMAGIC_FEATS[featNameSlug(name)];
}

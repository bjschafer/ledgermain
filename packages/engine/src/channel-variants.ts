/**
 * Archetype overrides for the Channel Energy pipeline. The base subsystem is
 * fully generic — dice, save DC, and uses/day all evaluate the granting
 * class's vendored formulas (`resources.ts` `actionBasedDetail`/`processGrant`
 * and `ability-dcs.ts` `channelInstances`) — but a handful of archetypes
 * change the progression itself: different dice, a different pool size, an
 * effective-level offset, or a pool of their own where the base class spends
 * another resource. Those cannot ride the generic path (the vendored
 * archetype features carry no formulas of their own), so this table
 * substitutes formulas at the same three evaluation points.
 *
 * Keyed by the vendored archetype id (`"cleric:fiendish-vessel"` — the
 * `class:slug` shape `build.archetypes` stores, same matching convention as
 * `bardic-performance-variants/`). A def applies to the granting class's
 * channel feature (the `CHANNEL_ENERGY_NAME_RE` family) whenever the
 * character has the archetype active on that class. Formulas are evaluated
 * with `@class.unlevel` bound to the granting class's level, exactly like
 * the vendored formulas they replace. Clean-room: every formula here is
 * derived from the published archetype text (aonprd.com / d20pfsrd.com),
 * cited per entry — never from Foundry source.
 *
 * Only progression-shaped changes belong here. A variant that retargets WHO
 * the channel affects (Iron Priest's constructs), restricts the energy
 * choice, or bolts on a rider effect stays prose in its classification note:
 * the numbers on the sheet are unchanged, and `note` on a def exists for the
 * reminder text that accompanies a real formula change, not as a general
 * annotation surface.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";
import { classByTag } from "./refdata-index.js";

export interface ChannelVariantDef {
  /** Vendored archetype id, `class:slug` — must equal this def's table key. */
  archetypeId: string;
  /** Pool display name when the archetype renames the feature ("Channel Evil"). */
  displayName?: string;
  /**
   * Replaces the vendored `uses.maxFormula` — or SUPPLIES one for a feature
   * whose vendored uses is a `source` pointer at another pool (Hospitaler's
   * own channel pool where the base paladin spends Lay on Hands), which then
   * derives its own per-day pool row instead of merging into the source's.
   */
  usesFormula?: string;
  /** Replaces the channel action's damage/healing dice formula. */
  damageFormula?: string;
  /** Replaces the save `dcFormula` (effective-level offsets change the DC too). */
  dcFormula?: string;
  /** Rider reminder appended to the pool's detail line. */
  note?: string;
}

/**
 * See the module doc comment. Entries beyond the seeded first one are
 * authored by the channel content wave; the fiendish vessel is the
 * coordinator-authored pattern entry.
 */
export const CHANNEL_VARIANTS: Readonly<Record<string, ChannelVariantDef>> = {
  // Channel Evil (Cheliax, Empire of Devils p.21, verified via aonprd): d4s
  // on the cleric schedule ("1d4 ... increases by 1d4 at every two levels
  // beyond 1st, to a maximum of 10d4 at 19th" — the same ceil(level/2) count
  // as the base d6 progression), heals evil and harms good, DC and uses/day
  // unchanged (10 + 1/2 level + Cha; 3 + Cha).
  "cleric:fiendish-vessel": {
    archetypeId: "cleric:fiendish-vessel",
    displayName: "Channel Evil",
    damageFormula: "(ceil(@class.unlevel/2))d4",
    note: "heals evil creatures and harms good ones; a good creature that fails its save is sickened for 1d4 rounds",
  },

  // Luminous Font (Adventurer's Guide p.112, verified via d20pfsrd/aonprd):
  // "A blossoming light's channel energy is usable a number of times per
  // day equal to 5 + her Charisma modifier. At 2nd level and every 2 levels
  // thereafter, the blossoming light gains an additional use per day of
  // channel energy." Dice and DC are the unmodified base cleric
  // progression (`(ceil(@class.unlevel/2))d6` / `10 + floor(@class.unlevel/2)
  // + @abilities.cha.mod`); only the pool grows, and unlike the base flat
  // `3 + Cha` it now scales with level too.
  "cleric:blossoming-light": {
    archetypeId: "cleric:blossoming-light",
    displayName: "Luminous Font",
    usesFormula: "5 + @abilities.cha.mod + floor(@class.unlevel/2)",
    note: "at 7th level an additional use fills the area with daylight for a number of rounds equal to cleric level; at 10th level she can use atonement once per day as a spell-like ability to offer redemption to others",
  },

  // Sermonic Performance (Ultimate Combat, verified via d20pfsrd): "Sermonic
  // performance replaces the 1st-, 9th-, and 15th-level channel energy
  // abilities. This caps the cleric's channel energy damage at 7d6 points."
  // The evangelist still channels energy from 1st level on the ordinary
  // schedule (only the 1st/9th/15th slots that would otherwise grant channel
  // energy improvements instead grant bardic performances) — RAW names no
  // delay to channeling itself, only the dice ceiling. DC is unaffected
  // (untouched by the quoted text; still keyed off real cleric level).
  "cleric:evangelist": {
    archetypeId: "cleric:evangelist",
    damageFormula: "(min(ceil(@class.unlevel/2), 7))d6",
  },

  // Secrets Revealed (Pathfinder Society Field Guide, verified via
  // d20pfsrd): "This ability replaces the increase to her channel energy
  // damage normally gained at 5th level — her channel energy damage
  // increases to 3d6 at 7th level instead, and for the rest of her career as
  // a cleric lags 1d6 behind normal." Below 5th level the progression is
  // untouched; from 5th on, the 5th-level bump is simply skipped (holding at
  // 2d6 through 6th) and the whole schedule then runs 2 levels behind the
  // vendored one, which lands exactly on "3d6 at 7th, 1d6 behind forever
  // after." DC is untouched by the quoted text (no DC formula shipped; it
  // still keys off real cleric level).
  "cleric:scroll-scholar": {
    archetypeId: "cleric:scroll-scholar",
    damageFormula:
      "(if(gte(@class.unlevel,5), ceil((@class.unlevel-2)/2), ceil(@class.unlevel/2)))d6",
  },

  // Channel Positive Energy (Advanced Player's Guide p.62, verified via
  // d20pfsrd): "When a hospitaler reaches 4th level, she gains the ability
  // to channel positive energy as a cleric equal to her paladin level –3.
  // She can use this ability a number of times per day equal to 3 + her
  // Charisma modifier. Using this ability does not expend uses of lay on
  // hands, as it does with other paladins." The vendored base ability
  // (`uses.source: "layOnHands"`, no `maxFormula` of its own) spends Lay on
  // Hands and uses full paladin level as the effective cleric level; this
  // supplies its own uses formula (making it its own pool rather than
  // merging into Lay on Hands) and substitutes `@class.unlevel - 3` for the
  // effective level in both the dice and DC formulas. The base feature is
  // granted at 4th, so `@class.unlevel` is at least 4 whenever these
  // evaluate — never producing a negative effective level.
  "paladin:hospitaler": {
    archetypeId: "paladin:hospitaler",
    usesFormula: "3 + @abilities.cha.mod",
    damageFormula: "(ceil((@class.unlevel - 3)/2))d6",
    dcFormula: "10 + floor((@class.unlevel - 3)/2) + @abilities.cha.mod",
    note: "its own resource pool, separate from lay on hands",
  },
};

/* --------------------------------------------- prestige channel classes -- */

/**
 * Holy Vindicator (APG p.263): "The vindicator's class level stacks with
 * levels in any other class that grants the channel energy ability" — a
 * general stack, so both the dice and the save DC evaluate at the combined
 * level. Death Slayer's stack is deliberately NOT here: its text stacks
 * "for the purpose of determining the number of damage dice her channel
 * energy ability deals to undead" — dice-only AND undead-only, which a
 * single detail line cannot carry without overstating the heal dice, so a
 * base class's pool gets a reminder note instead (see `resources.ts`) and
 * only the standalone grant below carries real Death Slayer numbers.
 */
const CHANNEL_STACKING_TAGS: ReadonlySet<string> = new Set(["holyVindicator"]);

/** Total bonus levels the character's channel formulas evaluate with, from {@link CHANNEL_STACKING_TAGS} classes other than the granting one. */
export function channelStackingLevels(doc: CharacterDoc, excludeTag: string): number {
  let bonus = 0;
  for (const c of doc.identity.classes) {
    if (c.tag === excludeTag || c.level <= 0) continue;
    if (CHANNEL_STACKING_TAGS.has(c.tag)) bonus += c.level;
  }
  return bonus;
}

/** The character's Death Slayer levels — drives the dice-stack reminder note on a base class's channel pool. */
export function deathSlayerLevels(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "deathSlayer")?.level ?? 0;
}

/**
 * A prestige class whose bare vendored Channel Energy feature carries no
 * formulas but whose published text grants a real standalone ability —
 * synthesized into a pool + DC instance when NO other class supplies a base
 * channel feature (with one, the prestige levels ride the stacking rules
 * above instead, and a second counter for one budget would be wrong).
 */
export interface ChannelPrestigeGrant {
  classTag: string;
  usesFormula: string;
  damageFormula: string;
  dcFormula: string;
  note: string;
}

/**
 * Death Slayer (Adventurer's Guide p.152, verified via aonprd): "gains the
 * power to harm undead with positive energy. This ability functions as a
 * cleric's ability to channel positive energy to deal damage to undead (but
 * not to heal living creatures)" — cleric-shaped numbers at death slayer
 * level, harm-undead only. "(if any)" in its stacking clause confirms the
 * standalone shape is real.
 */
export const CHANNEL_PRESTIGE_GRANTS: Readonly<Record<string, ChannelPrestigeGrant>> = {
  deathSlayer: {
    classTag: "deathSlayer",
    usesFormula: "3 + @abilities.cha.mod",
    damageFormula: "(ceil(@class.unlevel/2))d6",
    dcFormula: "10 + floor(@class.unlevel/2) + @abilities.cha.mod",
    note: "harms undead only, never heals or harms the living",
  },
};

/**
 * Whether any class OTHER than `excludeTag` grants a real base channel
 * feature (name matches the channel family AND the vendored entry carries
 * its own uses or actions — the bare prestige grants above don't count, or
 * two formula-less prestige classes would suppress each other).
 */
export function hasBaseChannelClass(
  doc: CharacterDoc,
  refData: RefData,
  excludeTag: string,
): boolean {
  const channelName = /^Channel (Energy|Positive Energy|Negative Energy)( \(WAR\))?$/;
  for (const cls of doc.identity.classes) {
    if (cls.tag === excludeTag || cls.level <= 0) continue;
    const classDef = classByTag(refData, cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature || !channelName.test(feature.name)) continue;
      if (feature.uses || (feature.actions?.length ?? 0) > 0) return true;
    }
  }
  return false;
}

/**
 * The chosen archetype's channel variant for the given granting class, if
 * any — first match wins (a class can only meaningfully have one channel
 * variant; the vendored archetype conflict rules prevent stacking two).
 */
export function channelVariantFor(
  doc: CharacterDoc,
  classTag: string,
): ChannelVariantDef | undefined {
  for (const id of doc.build.archetypes ?? []) {
    const def = CHANNEL_VARIANTS[id];
    if (def && id.startsWith(`${classTag}:`)) return def;
  }
  return undefined;
}

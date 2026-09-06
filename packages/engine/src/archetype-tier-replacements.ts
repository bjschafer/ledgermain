/**
 * Single-tier archetype replacements: archetype features that trade away ONE
 * gained instance of a scaling base-class feature (one Armor Training tier,
 * one bonus-feat slot) rather than a whole `ClassFeatureGrant`. The vendored
 * grant is atomic — Armor Training's mDexA/acpA and each class's bonus-feat
 * count are single level-based formulas — so these swaps can't ride
 * `pairedBaseFeatureUuid` (that suppresses every tier at once). Instead:
 *
 *  - Armor Training: `collect.ts` overrides the base grant's formulas with
 *    the KEPT-tier count from {@link armorTrainingTiersKept} whenever an
 *    active archetype replaces some (not all) tiers.
 *  - Bonus feats: `apps/web`'s `model/feats.ts` subtracts the replaced
 *    instances from that class's slot budget.
 *
 * Sources, unioned by {@link replacedTierLevels}:
 *  1. This hand table, keyed by the archetype feature's own `RefEntity.id`
 *     (same keying as `archetype-effects.ts`), clean-room from the published
 *     rules. `levels` are the class levels the replaced tier/instance would
 *     have been GAINED — not the feature's own grant level (an archetype's
 *     trade is fixed when it's chosen, so a replaced tier never manifests
 *     even before the replacing feature arrives; same reasoning as
 *     `archetypeReplacedSlotCount`'s Gravewalker precedent).
 *  2. Vendored `ArchetypeFeature.replacesSlot` entries of kind
 *     `"bonus feat"` with a level — monk/warpriest/swashbuckler archetypes
 *     already carry these upstream; only the fighter dataset lacks them.
 *
 * NOT here: an archetype whose features, in union, replace EVERY Armor
 * Training tier. Those keep the vendored whole-grant pairing (the Brawler
 * precedent — see `MISPAIRED_TARGET_REMAP` in `archetypes.ts`), which
 * `collect.ts`'s swap check already honors; adding tier entries on top would
 * double-remove. The drift-guard test enforces this split.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";
import { archetypeFeaturesOf } from "./refdata-index.js";

/** Fighter Armor Training's `ClassFeatureGrant.uuid` (the whole-grant swap key). */
export const ARMOR_TRAINING_GRANT_UUID = "Compendium.pf1.class-abilities.Item.5JFfSqLMCpbRmERa";

/** Fighter levels at which Armor Training tiers are gained (CRB p. 55). */
export const ARMOR_TRAINING_TIER_LEVELS: readonly number[] = [3, 7, 11, 15];

export type ReplacedGrantKind = "armor training" | "bonus feat";

export interface TierReplacementEntry {
  /** Which scaling base feature loses instances. */
  kind: ReplacedGrantKind;
  /**
   * Class levels at which the replaced tier/instance would have been gained
   * (Armor Training: 3/7/11/15; bonus feats: the class's own gain levels).
   */
  levels: readonly number[];
  /**
   * Drift guard: the vendored feature's description must still contain this
   * phrase (case-insensitive, tags stripped) — enforced by
   * `archetypeTierReplacements.test.ts`.
   */
  keyword: string;
}

export const ARCHETYPE_TIER_REPLACEMENTS: Readonly<Record<string, TierReplacementEntry>> = {
  // ── fighter Armor Training tiers ─────────────────────────────────────────
  // Most fighter archetypes that trade away individual tiers are already
  // modeled by suppress-plus-backfill: a sibling row wholesale-pairs the base
  // grant and the archetype's own "Armor Training" row carries the KEPT-tier
  // schedule as an extracted effect (dragoon, mobile fighter, tactician,
  // weapon-bearer squire, rondelero duelist, cyber-soldier, child of Acavna
  // and Amaznen — see `archetype-extracted/fighter.ts`). Entries belong here
  // ONLY when no such backfill row exists, so the base grant must stay live
  // with individual tiers removed.

  // Unarmed Fighter (UC p. 48) — nothing replaces armor training 3, so the
  // fighter keeps exactly that tier (the vendored whole-grant pairing on
  // Tough Guy is neutralized in `archetypes.ts`). Sucker Punch is GAINED at
  // 17th but the tier it trades away is the one gained at 15th.
  "fighter:unarmed-fighter:tough-guy:3": {
    kind: "armor training",
    levels: [3],
    keyword: "replaces armor training 1",
  },
  "fighter:unarmed-fighter:clever-wrestler:7": {
    kind: "armor training",
    levels: [7],
    keyword: "replaces armor training 2",
  },
  "fighter:unarmed-fighter:sucker-punch:17": {
    kind: "armor training",
    levels: [15],
    keyword: "replaces armor training 4",
  },
  // Unbreakable (UC p. 47) pairs NOTHING to the Armor Training grant, so the
  // fighter RAW keeps tiers 1-2 and loses only 3 and 4.
  "fighter:unbreakable:quick-recovery:11": {
    kind: "armor training",
    levels: [11],
    keyword: "replaces armor training 3",
  },
  "fighter:unbreakable:unlimited-endurance:15": {
    kind: "armor training",
    levels: [15],
    keyword: "replaces armor training 4",
  },
  // ── fighter bonus feats (gained at 1st and every even level, CRB p. 55) ──
  // Several of these were vendored PAIRED to Bravery (the CSV level-matcher
  // linked "replaces the 2nd-level bonus feat" prose to fighter's own
  // level-2 feature); those pairings are neutralized in `archetypes.ts` so
  // the instance can be modeled here instead.
  "fighter:cavern-sniper:quick-and-deadly:4": {
    kind: "bonus feat",
    levels: [4],
    keyword: "replaces the 4th-level fighter bonus feat",
  },
  "fighter:child-of-acavna-and-amaznen:eldritch-lore:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the bonus fighter combat feat gained at 1st level",
  },
  "fighter:corsair:deck-fighting:2": {
    kind: "bonus feat",
    levels: [2],
    keyword: "replaces the fighter's 2nd-level bonus feat",
  },
  "fighter:corsair:improved-deck-fighting:6": {
    kind: "bonus feat",
    levels: [6],
    keyword: "replaces the fighter's 6th-level bonus feat",
  },
  "fighter:dragoon:skilled-rider:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the 1st-level fighter bonus combat feat",
  },
  "fighter:druman-blackjacket:blackjacket-tactics:4": {
    kind: "bonus feat",
    levels: [4],
    keyword: "replaces the bonus feat gained at 4th level",
  },
  "fighter:druman-blackjacket:amateurs:8": {
    kind: "bonus feat",
    levels: [8],
    keyword: "replaces the bonus feat gained at 8th level",
  },
  "fighter:druman-blackjacket:superior-tactics:12": {
    kind: "bonus feat",
    levels: [12],
    keyword: "replaces the bonus feat gained at 12th level",
  },
  "fighter:druman-blackjacket:esprit-de-corps:16": {
    kind: "bonus feat",
    levels: [16],
    keyword: "replaces the bonus feat gained at 16th level",
  },
  "fighter:eldritch-guardian:familiar:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the bonus feat gained at 1st level",
  },
  "fighter:eldritch-guardian:share-training:2": {
    kind: "bonus feat",
    levels: [2],
    keyword: "replaces the bonus feat gained at 2nd level",
  },
  "fighter:opportunist:cunning-edge:4": {
    kind: "bonus feat",
    levels: [4, 8, 12, 16, 20],
    keyword: "replaces the bonus feats gained at 4th, 8th, 12th, 16th, and 20th levels",
  },
  "fighter:pack-mule:unobtrusive:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the bonus feat gained at 1st level",
  },
  "fighter:siegebreaker:breaker-rush:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the feat gained at 1st level",
  },
  "fighter:siegebreaker:breaker-momentum:2": {
    kind: "bonus feat",
    levels: [2],
    keyword: "replaces the feat gained at 2nd level",
  },
  "fighter:siegebreaker:disorienting-blow:8": {
    kind: "bonus feat",
    levels: [8],
    keyword: "replaces the bonus feat gained at 8th level",
  },
  "fighter:tactician:strategic-training:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the bonus fighter combat feat gained at 1st level",
  },
  "fighter:titan-fighter:giant-weapon-wielder:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the fighter's 1st level bonus feat",
  },
  "fighter:unarmed-fighter:trick-throw:8": {
    kind: "bonus feat",
    levels: [8],
    keyword: "replaces the 8th-level bonus feat",
  },
  "fighter:unarmed-fighter:takedown:12": {
    kind: "bonus feat",
    levels: [12],
    keyword: "replaces the 12th-level bonus feat",
  },
  "fighter:unbreakable:tough-as-nails:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the fighter's 1st-level bonus feat",
  },
  "fighter:ustalavic-duelist:duelist-stance:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the fighter's 1st-level bonus feat",
  },
  "fighter:weapon-bearer-squire:weapon-rack:1": {
    kind: "bonus feat",
    levels: [1],
    keyword: "replaces the 1st-level fighter bonus combat feat",
  },
  "fighter:weapon-bearer-squire:swift-sharpening:2": {
    kind: "bonus feat",
    levels: [2],
    keyword: "replaces the 2nd-level fighter bonus combat feat",
  },
  // Also trades away Weapon Training and Weapon Mastery wholesale — the
  // Weapon Training half is carried by `WEAPON_TRAINING_REPLACEMENTS` in
  // `archetypes.ts` (Weapon Mastery has no modeled numbers to suppress).
  "fighter:varisian-free-style-fighter:martial-flexibility:1": {
    kind: "bonus feat",
    levels: [1, 6, 10, 12],
    keyword: "replaces the bonus feats gained at 1st level, 6th level, 10th level, and 12th level",
  },
};

/**
 * Union of replaced-instance levels (each `<= clsLevel` of the owning class)
 * for `kind` across the character's active archetypes of `classTag` — from
 * both the hand table and vendored leveled `replacesSlot` entries whose kind
 * matches. A Set: two archetypes claiming the same instance (blocked by the
 * picker's slot-conflict check anyway) still only remove it once.
 */
export function replacedTierLevels(
  doc: CharacterDoc,
  refData: RefData,
  kind: ReplacedGrantKind,
  classTag: string,
): Set<number> {
  const clsLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
  const out = new Set<number>();
  if (clsLevel <= 0) return out;
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype || archetype.classTag !== classTag) continue;
    for (const f of archetypeFeaturesOf(refData, archetypeId)) {
      const entry = ARCHETYPE_TIER_REPLACEMENTS[f.id];
      if (entry?.kind === kind) {
        for (const level of entry.levels) if (level <= clsLevel) out.add(level);
      }
      const slot = f.replacesSlot;
      if (slot?.kind === kind && slot.level !== undefined && slot.level <= clsLevel) {
        out.add(slot.level);
      }
    }
  }
  return out;
}

/**
 * How many Armor Training tiers the fighter actually HAS at `clsLevel` once
 * `replaced` tiers are removed — the value `collect.ts` substitutes for the
 * vendored `clamp(floor((@class.unlevel + 1) / 4), 0, 4)` when a partial-tier
 * replacement is active. Each tier is worth exactly +1 max Dex / -1 ACP, so
 * the kept COUNT is the whole effect.
 */
export function armorTrainingTiersKept(clsLevel: number, replaced: ReadonlySet<number>): number {
  let kept = 0;
  for (const tierLevel of ARMOR_TRAINING_TIER_LEVELS) {
    if (tierLevel <= clsLevel && !replaced.has(tierLevel)) kept++;
  }
  return kept;
}

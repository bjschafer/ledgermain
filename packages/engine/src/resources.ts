/**
 * Derive limited-use resource pools (e.g. Rage rounds/day, Channel Energy uses)
 * from a character's granted class features. Each feature that carries a
 * `uses.maxFormula` becomes a suggested pool whose maximum is the formula
 * evaluated against that class's roll-data context.
 *
 * What this CANNOT derive (documented limitation): the vendored data slice does
 * not include item charge counts, so item charges are tracked as manual pools by
 * the tracker UI. Spell slots are handled separately — the web app composes the
 * engine's hardcoded spells-per-day table (`baseSpellsPerDay` in `tables.ts`)
 * with ability bonus spells in its prepared-spells panel.
 *
 * Each pool also exposes `linkedBuffIds` (issue: wire the previously-dead
 * `ClassFeature.grantsBuffs` field) — buffs the pool's power can activate,
 * resolved against `refData.buffs`. Deliberately does NOT drain the pool's
 * uses when a linked buff is toggled: a barbarian's player counts their own
 * rage rounds, and coupling "buff active" to "1 use spent" would be wrong
 * more often than right (a round of rage maintained ≠ a "use" in the pool's
 * per-day accounting once uses are tracked in rounds already, and nothing
 * here knows how many rounds a buff toggle will actually last). Toggling is
 * purely a shortcut into `model/buffs.ts`'s normal buff add/remove — exactly
 * as if the player had added the buff by hand from the Buffs panel.
 *
 * Feats can carry their own `uses.maxFormula` too (Combat Reflexes'
 * AoOs/round, Alignment Channel's uses/day, ...) — `deriveFeatResourcePools`
 * scans `doc.build.feats` for these after the class-feature loop above and
 * folds them into the same returned list, evaluated against the
 * character-level roll data rather than a granting class's contextual one
 * (feats have no "granting class").
 */

import type { CharacterDoc, ClassFeature, FeatureAction, RefData } from "@pf1/schema";

import { collectGrantedFeatures } from "./archetypes.js";
import { FEAT_POOL_EFFECTS, featNameSlug } from "./feat-effects.js";
import { formatDiceFormula, tryEvaluateFormula, type RollData } from "./formula.js";
import { PSYCHIC_DISCIPLINES } from "./psychic-disciplines.js";
import { buildRollData, type AbilityView } from "./rolldata.js";
import { burnDetailLabel, smiteEvilDetail, smiteEvilLabel } from "./tables.js";

export interface DerivedResourcePool {
  /** Stable pool id (the class-feature id). */
  id: string;
  /** Display label, e.g. "Rage". */
  name: string;
  /** Maximum uses, from `uses.maxFormula`. */
  max: number;
  /**
   * What a night's rest sets this pool's remaining uses to (issue #43).
   * Defaults to `max` — byte-identical to pre-#43 behavior, since RAW for
   * almost every pool here (Rage, Ki, Bardic Performance, Channel Energy,
   * Lay on Hands, …) a rest simply tops the pool back up to its cap.
   *
   * Arcane Reservoir is the one modeled exception: Advanced Class Guide p.
   * 12 reads "the arcanist's arcane reservoir can hold a maximum amount of
   * magical energy equal to 3 + the arcanist's level. Each day, when
   * preparing spells, the arcanist's arcane reservoir fills with raw
   * magical energy, gaining a number of points equal to 3 + 1/2 her
   * arcanist level. Any points she had from the previous day are lost."
   * — the refill is strictly lower than the cap, and a rest *sets* the pool
   * to the refill value rather than topping it up to max (leftover points
   * are explicitly lost, not carried forward). See `arcaneReservoirRestValue`.
   */
  restValue: number;
  /** Recharge period, e.g. "day". */
  per?: string;
  /** Class the feature was granted by (for display). */
  classTag: string;
  /**
   * One-line mechanical summary — derived from the feature's vendored
   * `actions[]` where present (e.g. Acid Dart's "ranged touch · 1d6+2 acid",
   * Channel Energy's "4d6 (DC 15 Will)"), via `actionBasedDetail`. A handful
   * of features have real mechanics that carry no vendored action data at
   * all (Smite Evil's attack/damage/AC scaling) and keep a hand-authored
   * fallback instead — see the `deriveResourcePools` body. Undefined when
   * neither applies (Rage has nothing beyond its `uses.maxFormula`). Also
   * carries an addendum for any OTHER granted feature that shares this pool
   * via `uses.source` (e.g. a paladin's Channel Positive Energy, which
   * spends Lay on Hands uses rather than having its own cap — see the
   * "linked features" pass). The tracker renders this as the sub-line of the
   * resource row.
   */
  detail?: string;
  /**
   * Buff ids (`RefData.buffs` keys) this pool can activate — resolved from
   * the granting `ClassFeature.grantsBuffs` UUIDs (or, for a linked feature
   * with no independent pool of its own — e.g. Inspire Courage, see the
   * "linked features" pass — from ITS `grantsBuffs`, merged onto the pool it
   * draws uses from). Only 3 of the 12 vendored features carrying
   * `grantsBuffs` point at a buff inside the vendored slice (Rage, Inspire
   * Courage, Aura of Protection); the other 9 point outside it and resolve to
   * nothing here — unresolvable UUIDs are silently skipped, never thrown.
   * Empty when none resolve. The tracker uses this to render an
   * activate/deactivate toggle; it deliberately does NOT drain the pool's
   * uses on activation (see `deriveResourcePools`'s doc comment).
   */
  linkedBuffIds: string[];
}

/**
 * Scan granted class features for `uses.maxFormula` pools. `abilities` (from a
 * computed sheet) lets formulas like Rage's `@abilities.con.mod` resolve against
 * final scores; omit it to use base scores.
 */
export function deriveResourcePools(
  doc: CharacterDoc,
  refData: RefData,
  abilities?: Record<string, AbilityView>,
): DerivedResourcePool[] {
  const rollData = buildRollData(doc, refData, abilities as Parameters<typeof buildRollData>[2]);
  const pools: DerivedResourcePool[] = [];
  const poolMaxBonusByFeatureTag = collectFeatPoolBonuses(doc, refData);
  const poolIdByTag = new Map<string, string>();
  // Features with no independent daily cap of their own (`uses.source` instead
  // of `uses.maxFormula`, e.g. Channel Positive Energy drawing on Lay on
  // Hands — or, for Inspire Courage, no `uses` block at all, resolved via
  // FEATURE_BUFF_POOL_TAG below) but with vendored `actions` and/or
  // `grantsBuffs` worth surfacing — merged into the referenced pool's
  // `detail`/`linkedBuffIds` in a second pass below, once every pool's tag is
  // known.
  const linkedFeatures: { feature: ClassFeature; featureRollData: RollData; linkedTag: string }[] =
    [];

  const clericWisdomHouserule = doc.build.settings?.clericWisdomHouserule ?? false;

  for (const { classTag, grant, resourcePool } of collectGrantedFeatures(doc, refData)) {
    const classLevel = doc.identity.classes.find((c) => c.tag === classTag)?.level ?? 0;
    // `@class.unlevel` inside a feature formula refers to THIS (granting) class's
    // level — for a domain/school grant that's the cleric/wizard level.
    let featureRollData = { ...rollData, class: { level: classLevel, unlevel: classLevel } };
    // Cleric Wisdom house-rule (issue #56, default off): cleric-tagged grants
    // (base-class features AND domain powers, both carry classTag "cleric" —
    // see `collectGrantedFeatures`) evaluate their formulas with `@abilities.cha`
    // aliased to Wisdom's values. Scoped to a per-grant COPY of `featureRollData`
    // — the character's real ability scores/mods (used everywhere else: skills,
    // saves, other classes' formulas) are untouched, and non-cleric classTags
    // (paladin's Lay on Hands/Channel Positive Energy, bard's Bardic
    // Performance, sorcerer/oracle Cha-based casting, ...) never see this.
    if (clericWisdomHouserule && classTag === "cleric") {
      featureRollData = withClericWisdomHouserule(featureRollData);
    }

    // Bloodline powers (issue #34) carry a pre-computed formula (no vendored
    // `RefData.classFeatures` entry exists for them — see `bloodlines.ts`).
    // Evaluated against the plain `rollData` (its formulas reference
    // `@classes.sorcerer.level` directly, not the granting-class-contextual
    // `@class.unlevel` the vendored-feature path below relies on).
    if (resourcePool) {
      let poolMax: number | null;
      try {
        poolMax = tryEvaluateFormula(resourcePool.usesFormula, rollData);
      } catch {
        continue;
      }
      if (poolMax === null || Number.isNaN(poolMax) || poolMax <= 0) continue;
      if (pools.some((p) => p.id === grant.featureId)) continue;
      const truncatedMax = Math.trunc(poolMax);
      pools.push({
        id: grant.featureId,
        name: grant.name,
        max: truncatedMax,
        restValue: truncatedMax,
        per: resourcePool.per,
        classTag,
        detail: resourcePool.detail,
        // Bloodline powers are hand-authored (bloodlines.ts), not vendored
        // `ClassFeature`s, so there's no `grantsBuffs` to resolve here.
        linkedBuffIds: [],
      });
      continue;
    }

    const feature = refData.classFeatures[grant.featureId];
    if (!feature) continue;
    const formula = feature.uses?.maxFormula;
    if (!formula) {
      // No maxFormula — either nothing (most features) or a `uses.source`
      // pointer to another feature's pool. Either way it can't become its
      // own pool row (see `ClassFeature.uses` doc comment); stash it for the
      // linked-feature merge pass if it has actions and/or grantsBuffs worth
      // surfacing on the pool it draws from.
      const linkedTag = feature.uses?.source ?? FEATURE_BUFF_POOL_TAG[feature.name];
      if (linkedTag && (feature.actions?.length || feature.grantsBuffs.length > 0)) {
        linkedFeatures.push({ feature, featureRollData: featureRollData as RollData, linkedTag });
      }
      continue;
    }
    // Psychic Phrenic Pool ability correction (Occult Adventures): the
    // vendored feature's `uses.maxFormula` (`floor(@class.unlevel / 2) +
    // @abilities.cha.mod`) hardcodes Charisma, but RAW the pool's ability is
    // discipline-determined — Wisdom for 6 of the 12 core disciplines (see
    // `PSYCHIC_DISCIPLINES`' doc comment). Reuses the cleric house-rule's
    // scoped cha→wis alias, gated on THIS feature only (a per-feature copy;
    // nothing else the psychic evaluates sees the alias). No discipline
    // chosen, an unknown tag, or a Charisma-based discipline keeps the
    // vendored formula untouched.
    if (
      feature.tag === "phrenicPool" &&
      classTag === "psychic" &&
      doc.build.psychicDiscipline &&
      PSYCHIC_DISCIPLINES[doc.build.psychicDiscipline]?.phrenicPoolAbility === "wis"
    ) {
      featureRollData = withClericWisdomHouserule(featureRollData);
    }
    let max: number | null;
    try {
      max = tryEvaluateFormula(formula, featureRollData);
    } catch {
      continue;
    }
    if (max === null || Number.isNaN(max) || max <= 0) continue;
    if (pools.some((p) => p.id === feature.id)) continue;

    // Smite Evil's attack/damage/AC scaling has no vendored action data at
    // all (only a bare "Use" activation) — kept hand-authored. Everything
    // else prefers the generic vendored-action-derived detail (Channel
    // Energy's dice/DC, Lay on Hands' healing dice, Acid Dart's ranged-touch
    // acid damage, ...), which also lifts the old cleric-only gate that left
    // a paladin's own Channel Positive Energy without any dice line.
    let detail: string | undefined;
    if (feature.tag === "smiteEvil" && classTag === "paladin") {
      const featureAbilities = (featureRollData as RollData).abilities as
        | { cha?: { mod?: number } }
        | undefined;
      const chaMod = featureAbilities?.cha?.mod ?? 0;
      detail = smiteEvilLabel(smiteEvilDetail(classLevel, chaMod));
    } else if (feature.tag === "burn" && classTag === "kineticist") {
      // Burn's nonlethal-per-point rule has no vendored action data (only the
      // `3 + Con` `uses.maxFormula` that made this pool) — hand-authored,
      // same posture as Smite Evil above. Deliberately does NOT auto-apply
      // the nonlethal damage — see `burnDetailLabel`'s doc comment.
      const characterLevel = doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
      detail = burnDetailLabel(characterLevel, classLevel);
    } else {
      detail = actionBasedDetail(feature, featureRollData as RollData);
    }

    // Feats that raise this pool's maximum (Extra Rage, Extra Reservoir, …
    // see feat-effects.ts FEAT_POOL_EFFECTS) — additive, keyed by the
    // class-feature's tag so unrelated same-named pools aren't affected.
    const featBonus = feature.tag ? (poolMaxBonusByFeatureTag.get(feature.tag) ?? 0) : 0;
    const poolMax = Math.trunc(max) + featBonus;

    const restValue =
      feature.tag === "arcaneReservoir" && classTag === "arcanist"
        ? arcaneReservoirRestValue(classLevel, featBonus, poolMax)
        : poolMax;

    if (feature.tag) poolIdByTag.set(feature.tag, feature.id);

    pools.push({
      id: feature.id,
      name: feature.name,
      max: poolMax,
      restValue,
      per: feature.uses?.per,
      classTag,
      detail,
      linkedBuffIds: resolveGrantsBuffs(feature.grantsBuffs, refData),
    });
  }

  for (const { feature, featureRollData, linkedTag } of linkedFeatures) {
    const poolId = poolIdByTag.get(linkedTag);
    if (!poolId) continue;
    const pool = pools.find((p) => p.id === poolId);
    if (!pool) continue;

    const linkedDetail = actionBasedDetail(feature, featureRollData);
    if (linkedDetail) {
      pool.detail = pool.detail
        ? `${pool.detail} · ${feature.name}: ${linkedDetail}`
        : `${feature.name}: ${linkedDetail}`;
    }

    for (const buffId of resolveGrantsBuffs(feature.grantsBuffs, refData)) {
      if (!pool.linkedBuffIds.includes(buffId)) pool.linkedBuffIds.push(buffId);
    }
  }

  // Feats whose vendored `uses.maxFormula` makes them their own resource pool
  // (Combat Reflexes' AoOs/round, Alignment Channel's uses/day, ...) — see
  // `deriveFeatResourcePools`'s doc comment for why this is a separate scan
  // from the class-feature loop above (character-level roll data, not a
  // granting class's contextual `@class.unlevel`).
  pools.push(...deriveFeatResourcePools(doc, refData, rollData));

  return pools;
}

/**
 * Cleric Wisdom house-rule (issue #56): returns a COPY of `data` with
 * `abilities.cha` aliased to `abilities.wis`'s values, for evaluating a single
 * cleric-tagged grant's formulas (Channel Energy's `uses.maxFormula` and its
 * actions' `dcFormula`, both written against `@abilities.cha.mod` in the
 * vendored data — see `class-features.json`'s `channelEnergy` entry). Does
 * NOT touch `data.abilities.wis` itself or any other roll-data field, so
 * anything ELSE evaluated against the (non-copied) base `rollData` — the
 * character's actual ability scores, skills, saves, other classes' formulas —
 * is unaffected. `data.abilities` is untyped (`RollData` is `Record<string,
 * unknown>`), so this reads defensively and no-ops if the shape it expects
 * (`buildRollData`'s `{ base, total, mod, baseMod }` per ability) isn't there.
 */
function withClericWisdomHouserule<T extends RollData>(data: T): T {
  const abilities = data.abilities;
  if (!abilities || typeof abilities !== "object") return data;
  const wis = (abilities as Record<string, unknown>).wis;
  if (!wis || typeof wis !== "object") return data;
  return { ...data, abilities: { ...abilities, cha: { ...wis } } };
}

/**
 * Foundry compendium UUID -> foundry `_id`, e.g.
 * "Compendium.pf1.buffs.Item.abc123" -> "abc123". Local to this module (no
 * runtime dependency on `@pf1/data-pipeline`, which only ships the pipeline
 * itself) — mirrors `data-pipeline/src/util/uuid.ts`'s `parseUuid`.
 */
const COMPENDIUM_UUID_RE = /^Compendium\.pf1\.[^.]+\.Item\.([^.]+)$/;

/**
 * Resolve a `ClassFeature.grantsBuffs` UUID list against `refData.buffs`,
 * dropping anything outside the vendored slice — never throwing. Of the 12
 * vendored features carrying `grantsBuffs`, only 3 resolve (Rage, Inspire
 * Courage, Aura of Protection).
 *
 * Issue #62 audit of the other 9 occurrences (7 unique UUIDs, `Spellbooks
 * (ARC/MAG/WIZ)` sharing one): the data pipeline's `grantsBuffs` field
 * (`transform/classes.ts`) is populated from Foundry's generic
 * `links.supplements` — NOT a buffs-only relation — so it also picks up
 * linked feats and items. Checked each of the 7 against the raw pinned
 * clone: Endurance, Eschew Materials, Leadership, Scribe Scroll, Stunning
 * Fist, and Improved Unarmed Strike all resolve to entries in the `feats`
 * pack (`Compendium.pf1.feats.Item.*`); Spellbooks resolves to an item
 * (`Compendium.pf1.items.Item.*`, a spellbook, not a buff). None of the 9
 * are buffs at all, so there is nothing to vendor — dropping the link (this
 * function's existing behavior) is the correct, already-implemented
 * disposition for every one of them. The feats among them are separately,
 * correctly granted via `ClassFeatureGrant` / `apps/web/src/model/
 * feats.ts`'s `grantedFeats()`, which is why this silent drop never loses
 * any player-facing information.
 */
function resolveGrantsBuffs(uuids: readonly string[], refData: RefData): string[] {
  const ids: string[] = [];
  for (const uuid of uuids) {
    const id = COMPENDIUM_UUID_RE.exec(uuid)?.[1];
    if (id && refData.buffs[id] && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * Hand-authored routing for sub-powers that grant a buff but carry no
 * `uses` block of their own at all (unlike Channel Positive Energy's
 * `uses.source: "layOnHands"`, Inspire Courage — and the rest of the bardic
 * "performance types" — have no vendored pointer back to the pool of rounds
 * they spend). Clean-room from the published rules (every bardic performance
 * type draws from the SAME pool of rounds/day; a type itself has no
 * independent cap) — keyed by feature name, used only to resolve
 * `grantsBuffs` onto the right pool for the "linked features" merge pass
 * above. Add future performance-type buffs (Inspire Greatness, …) here if
 * they turn out to resolve against the vendored buff slice too.
 */
const FEATURE_BUFF_POOL_TAG: Readonly<Record<string, string>> = {
  "Inspire Courage": "bardicPerformance",
};

/* ------------------------------------------------- action-derived detail -- */

const SAVE_TYPE_LABELS: Record<string, string> = { fort: "Fort", ref: "Ref", will: "Will" };

function saveTypeLabel(type: string): string {
  if (!type) return "";
  return SAVE_TYPE_LABELS[type] ?? type[0]!.toUpperCase() + type.slice(1);
}

/** Foundry action-type codes that describe an attack roll, mapped to their display prefix. */
const ATTACK_RANGE_PREFIX: Record<string, string> = {
  rsak: "ranged",
  rwak: "ranged",
  msak: "melee",
  mwak: "melee",
};

/**
 * Format a {@link FeatureAction}'s damage into a display fragment — "ranged
 * touch · 1d6+2 acid" (rsak + touch + typed damage), "melee touch · 1d6"
 * (untyped damage types are dropped — "untyped" reads as noise, not
 * information), "heal 3d6" (actionType "heal" — no melee/ranged framing),
 * or a bare dice/number for anything else (e.g. Channel Energy's
 * save-triggered burst, which has no attack roll at all). `null` when the
 * formula can't be evaluated even numerically (fully symbolic formula the
 * evaluator can't isolate dice from).
 */
function formatDamageLabel(action: FeatureAction, data: RollData): string | null {
  const damage = action.damage;
  if (!damage) return null;

  let dice = formatDiceFormula(damage.formula, data);
  if (dice === null) {
    let plain: number | null;
    try {
      plain = tryEvaluateFormula(damage.formula, data);
    } catch {
      plain = null;
    }
    if (plain === null || Number.isNaN(plain)) return null;
    dice = String(Math.trunc(plain));
  }

  if (action.actionType === "heal") return `heal ${dice}`;

  const prefix = action.actionType ? ATTACK_RANGE_PREFIX[action.actionType] : undefined;
  if (!prefix) return dice;

  const touchSuffix = action.touch ? " touch" : "";
  const types = damage.types.filter((t) => t !== "untyped");
  const typeSuffix = types.length > 0 ? ` ${types.join("/")}` : "";
  return `${prefix}${touchSuffix} · ${dice}${typeSuffix}`;
}

/** Format a {@link FeatureAction}'s save into "DC 16 Fort", or `null` if its DC formula won't evaluate. */
function formatSaveLabel(save: NonNullable<FeatureAction["save"]>, data: RollData): string | null {
  if (!save.dcFormula) return null;
  let dc: number | null;
  try {
    dc = tryEvaluateFormula(save.dcFormula, data);
  } catch {
    return null;
  }
  if (dc === null || Number.isNaN(dc)) return null;
  const label = saveTypeLabel(save.type);
  return `DC ${Math.round(dc)}${label ? ` ${label}` : ""}`;
}

/**
 * Pick the one action to summarize when a feature carries several (e.g.
 * Channel Energy's heal-living/harm-undead/heal-undead/harm-living quartet —
 * all four share the same dice and DC formulas, so which one wins doesn't
 * change the output). Prefers an action with both damage and a save (most
 * informative), then any action with damage, then any with a save, else the
 * first action (which will have neither and produce no detail).
 */
function pickPrimaryAction(actions: FeatureAction[]): FeatureAction | undefined {
  return (
    actions.find((a) => a.damage && a.save) ??
    actions.find((a) => a.damage) ??
    actions.find((a) => a.save) ??
    actions[0]
  );
}

/**
 * Derive a resource-pool `detail` summary from a class feature's vendored
 * `actions[]` — clean-room formatting over the Foundry actionType/damage/save
 * shape (data, not code; see CLAUDE.md licensing). `undefined` when the
 * feature has no actions, or its primary action has neither damage nor a
 * save worth showing (e.g. Smite Evil's bare "Use" activation).
 */
function actionBasedDetail(feature: ClassFeature, data: RollData): string | undefined {
  const actions = feature.actions;
  if (!actions || actions.length === 0) return undefined;
  const action = pickPrimaryAction(actions);
  if (!action) return undefined;

  const damageLabel = formatDamageLabel(action, data);
  const saveLabel = action.save ? formatSaveLabel(action.save, data) : null;

  if (damageLabel && saveLabel) return `${damageLabel} (${saveLabel})`;
  return damageLabel ?? saveLabel ?? undefined;
}

/**
 * Arcane Reservoir's daily refill (issue #43), clean-room from Advanced Class
 * Guide p. 12: "the arcanist's arcane reservoir can hold a maximum amount of
 * magical energy equal to 3 + the arcanist's level. Each day, when preparing
 * spells, the arcanist's arcane reservoir fills with raw magical energy,
 * gaining a number of points equal to 3 + 1/2 her arcanist level. Any points
 * she had from the previous day are lost."
 *
 * Base refill = 3 + floor(level / 2), strictly below the 3 + level cap.
 *
 * Extra Reservoir (feats.json: "You gain three more points in your arcane
 * reservoir, and the maximum number of points in your arcane reservoir
 * increases by that amount") reads as adding its +3 to BOTH the current/daily
 * points AND the max — i.e. `featBonus` (already folded into `poolMax` by the
 * caller) applies to the refill too, not just the cap. Clamped to `poolMax`
 * as a defensive floor (mathematically refill <= cap always holds: 3 +
 * floor(level/2) + featBonus <= 3 + level + featBonus for level >= 0).
 */
function arcaneReservoirRestValue(classLevel: number, featBonus: number, poolMax: number): number {
  const refill = 3 + Math.floor(classLevel / 2) + featBonus;
  return Math.min(refill, poolMax);
}

/**
 * Sum, per class-feature tag, how much `doc.build.feats` PLUS
 * `doc.build.extraFeats` raises that feature's derived pool max (see
 * `FEAT_POOL_EFFECTS`). A feat taken multiple times (e.g. two copies of
 * Extra Reservoir — the primary in `doc.build.feats`, a 2nd+ instance in
 * `doc.build.extraFeats`; see issue #58's `apps/web/src/model/doc.ts`
 * `addFeatInstance` and `model/repeatableFeats.ts`'s curated repeatable set)
 * contributes its `maxDelta` once per occurrence, matching the feats' own
 * "stacks" wording.
 */
function collectFeatPoolBonuses(doc: CharacterDoc, refData: RefData): Map<string, number> {
  const bonuses = new Map<string, number>();
  const featIds = [
    ...(doc.build.feats ?? []),
    ...(doc.build.extraFeats ?? []).map((e) => e.featId),
  ];
  for (const featId of featIds) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const effect = FEAT_POOL_EFFECTS[featNameSlug(feat.name)];
    if (!effect) continue;
    bonuses.set(effect.featureTag, (bonuses.get(effect.featureTag) ?? 0) + effect.maxDelta);
  }
  return bonuses;
}

/**
 * Feats whose vendored `uses.maxFormula` makes THEM a resource pool, exactly
 * like a class feature — Combat Reflexes (`1 + max(0, @abilities.dex.mod)`
 * AoOs/round), Alignment Channel / Command Undead (`3 + @abilities.cha.mod`
 * uses/day), Improved Iron Will / Improved Great Fortitude / Improved
 * Lightning Reflexes (flat `1`/day reroll), Quicken Spell-Like Ability
 * (`3`/day), Caster's Champion (`3`/day), Wingover (`1`/round), Combat Vigor
 * (`@abilities.con.baseMod`/day), Blazing Aura (`@skills.kpl.rank`/day), Spit
 * Venom (`1 + floor(@attributes.hd.total / 3)` charges) — 12 feats in the
 * current vendored slice.
 *
 * Evaluated against the CHARACTER-level `rollData` (built once by the
 * caller), not a per-class `featureRollData` — feat formulas reference
 * `@abilities.*` / `@attributes.hd.total` / `@skills.*.rank` directly; feats
 * have no "granting class" for a `@class.unlevel`-style override to make
 * sense of. Pool id = feat id, so a feat listed more than once in
 * `doc.build.feats` (the "manually-added duplicates" budget door — see
 * `model/feats.ts`) still produces exactly ONE pool, not one per copy — RAW
 * none of these 12 are "you can take this feat multiple times, effects
 * stack" feats (contrast `FEAT_POOL_EFFECTS`'s Extra Rage/Extra Ki/…), so
 * there is no stacking behavior to preserve here.
 *
 * `classTag` is the synthetic marker `"feat"` (never a real class tag) — the
 * tracker's resource row doesn't currently render `classTag` at all, but a
 * fake class name would be actively wrong if that ever changes, so a feat
 * gets an honest origin marker instead of borrowing the wrong class.
 */
function deriveFeatResourcePools(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
): DerivedResourcePool[] {
  const pools: DerivedResourcePool[] = [];
  const seen = new Set<string>();

  for (const featId of doc.build.feats ?? []) {
    if (seen.has(featId)) continue;
    const feat = refData.feats[featId];
    const formula = feat?.uses?.maxFormula;
    if (!feat || !formula) continue;
    seen.add(featId);

    let max: number | null;
    try {
      max = tryEvaluateFormula(formula, rollData);
    } catch {
      continue;
    }
    if (max === null || Number.isNaN(max) || max <= 0) continue;

    const truncatedMax = Math.trunc(max);
    pools.push({
      id: feat.id,
      name: feat.name,
      max: truncatedMax,
      restValue: truncatedMax,
      per: feat.uses?.per,
      classTag: "feat",
      linkedBuffIds: [],
    });
  }

  return pools;
}

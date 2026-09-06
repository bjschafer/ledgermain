/**
 * Class features granted by level, cleric domain / subdomain direct changes,
 * and the granted-power (domain / school / inquisition) patch tables.
 */
import {
  activeArchetypeSwaps,
  collectGrantedFeatures,
  domainCasterLevel,
  weaponTrainingReplaced,
} from "../archetypes.js";
import {
  ARMOR_TRAINING_GRANT_UUID,
  armorTrainingTiersKept,
  replacedTierLevels,
} from "../archetype-tier-replacements.js";
import { CLASS_FEATURE_CHANGE_PATCHES, CLASS_FEATURE_CHOICES } from "../class-feature-effects.js";
import {
  GRANTED_POWER_CHANGE_PATCHES,
  GRANTED_POWER_CHOICES,
} from "../granted-power-effects/index.js";
import { type RollData } from "../formula.js";
import { weaponTrainingBonus } from "../tables.js";
import { normalizeWeaponGroup } from "../weapon-groups.js";
import { classByTag, domainByTag, subdomainByTag } from "../refdata-index.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Class features granted by level, with archetype swaps applied. */
export function collectGrantedClassFeatures(ctx: CollectContext): void {
  const { doc, refData, rollData, out } = ctx;
  // Audit finding: an active archetype's swapped-out base feature (e.g.
  // Two-Handed Fighter replacing Armor Training) previously kept contributing
  // its `changes[]` here regardless — this loop had no awareness of
  // `doc.build.archetypes` at all. `archetypeSwaps` (uuid -> replacing
  // archetype feature name, gated on the character's current level in that
  // class — see `activeArchetypeSwaps` in `archetypes.ts`) fixes that: a
  // swapped grant is skipped entirely, same as if the character never had it.
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  for (const cls of doc.identity.classes) {
    const classDef = classByTag(refData, cls.tag);
    if (!classDef) continue;
    // `@class.unlevel` inside a feature formula refers to *this* class's level.
    const featureRollData: RollData = {
      ...rollData,
      class: { level: cls.level, unlevel: cls.level },
    };
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      // Partial-tier Armor Training replacement: an archetype that trades
      // away SOME tiers (Unbreakable's Quick Recovery, ...) can't use the
      // whole-grant swap above, so the vendored all-tiers formula is
      // substituted with the kept-tier count — each tier is exactly +1 max
      // Dex / -1 ACP. See `archetype-tier-replacements.ts`.
      if (grant.uuid === ARMOR_TRAINING_GRANT_UUID) {
        const replaced = replacedTierLevels(doc, refData, "armor training", cls.tag);
        if (replaced.size > 0) {
          const kept = armorTrainingTiersKept(cls.level, replaced);
          if (kept > 0) {
            evalChange(
              String(kept),
              featureRollData,
              "mDexA",
              "untyped",
              feature.name,
              feature.id,
              out,
            );
            evalChange(
              String(-kept),
              featureRollData,
              "acpA",
              "untyped",
              feature.name,
              feature.id,
              out,
            );
          }
          continue;
        }
      }
      // A `"<classTag>:<name>"` key scopes a patch to one bearer of a shared
      // feature name and, for that class, wins outright over any bare-name
      // key (they never combine); every other class still resolves the bare
      // name. This is what lets same-named features with genuinely different
      // progressions (rogue vs. prestige Trap Sense) each carry their own
      // formula — see CLASS_FEATURE_CHANGE_PATCHES's doc comment.
      for (const ch of [
        ...(feature.changes ?? []),
        ...(CLASS_FEATURE_CHANGE_PATCHES[`${cls.tag}:${feature.name}`] ??
          CLASS_FEATURE_CHANGE_PATCHES[feature.name] ??
          []),
      ]) {
        evalChange(
          ch.formula,
          featureRollData,
          ch.target,
          ch.type,
          feature.name,
          feature.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one class features (Proctor's Monitor Expression): apply the
      // stored selection's changes. Same per-class-key-wins precedence as
      // CLASS_FEATURE_CHANGE_PATCHES above; the stored pick itself is keyed
      // by the feature's own vendored id (one pick per grant instance), not
      // by name. No stored pick, or a stale option id, emits nothing.
      const classFeatureChoice =
        CLASS_FEATURE_CHOICES[`${cls.tag}:${feature.name}`] ?? CLASS_FEATURE_CHOICES[feature.name];
      if (classFeatureChoice) {
        const picked = doc.build.pickChoices?.[`classFeature:${feature.id}`];
        for (const ch of (picked && classFeatureChoice.choiceChanges[picked]) || []) {
          evalChange(
            ch.formula,
            featureRollData,
            ch.target,
            ch.type,
            feature.name,
            feature.id,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
      }
    }

    // --- Weapon Training group picks ---------------------------
    // The vendored "Weapon Training" class feature carries `changes: []`
    // upstream (see tables.ts `weaponTrainingBonus`'s doc comment), so its
    // per-group attack/damage bonus is hand-authored here rather than driven
    // by a vendored formula, gated on the player's own `build.weaponTrainingGroups`
    // picks (one per tier) exactly like every other free-choice picker.
    // Skipped entirely when an active archetype has replaced Weapon Training
    // (`weaponTrainingReplaced`) — that archetype's own weapon-group-scoped
    // bonus (if any) comes from `archetype-extracted/fighter.ts` instead, and
    // applying both would double-count.
    if (cls.tag === "fighter" && !weaponTrainingReplaced(doc)) {
      (doc.build.weaponTrainingGroups ?? []).forEach((rawGroup, tierIndex) => {
        if (!rawGroup) return;
        const bonus = weaponTrainingBonus(cls.level, tierIndex);
        if (bonus <= 0) return;
        const group = normalizeWeaponGroup(rawGroup);
        const sourceId = `weapon-training-${tierIndex}`;
        evalChange(
          String(bonus),
          featureRollData,
          `attack.weapon.${group}`,
          "untyped",
          "Weapon Training",
          sourceId,
          out,
        );
        evalChange(
          String(bonus),
          featureRollData,
          `damage.weapon.${group}`,
          "untyped",
          "Weapon Training",
          sourceId,
          out,
        );
      });
    }
  }
}

/** Cleric domain / subdomain direct changes. */
export function collectClericDomainChanges(ctx: CollectContext): void {
  const { doc, refData, rollData, out } = ctx;
  // A handful of domains carry a `system.changes` bonus directly on the domain
  // doc rather than on a `links.supplements`-linked class feature (Protection's
  // +1-per-5-levels save resistance, Travel's +10 land speed, Darkness/Rune's
  // bonus feat), same shape as the four `Subdomain.changes` entries (Purity,
  // Defense, Fortification, Solitude — all the save-resistance bonus). Gated on
  // the cleric's level and evaluated with `@class.unlevel` = cleric level, the
  // same granting-class convention `collectGrantedFeatures` uses for domain
  // POWER grants. (Darkness/Rune's `bonusFeats` change is a fixed feat named
  // only in prose — granted via the web layer's `grantedFeats`, see
  // `apps/web/src/model/feats.ts`; the collected modifier here is inert for
  // compute, which reads no `bonusFeats` target.)
  const domainLevel = domainCasterLevel(doc);
  if (domainLevel > 0) {
    const domainRollData: RollData = {
      ...rollData,
      class: { level: domainLevel, unlevel: domainLevel },
    };
    for (const tag of doc.build.clericDomains ?? []) {
      const domain = domainByTag(refData, tag) ?? subdomainByTag(refData, tag);
      if (!domain) continue;
      for (const ch of domain.changes) {
        evalChange(
          ch.formula,
          domainRollData,
          ch.target,
          ch.type,
          domain.name,
          domain.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Granted-power patches (domain / school / inquisition). */
export function collectGrantedPowerPatches(ctx: CollectContext): void {
  const { doc, refData, rollData, out } = ctx;
  // `collectGrantedFeatures` already resolves every power a chosen cleric
  // domain/subdomain, wizard arcane school/focused school, or inquisitor
  // inquisition grants — for display and uses/day tracking. Nothing walked
  // its `changes[]` before `GRANTED_POWER_CHANGE_PATCHES` existed, so an
  // unconditional numeric bonus on one of these powers never reached the
  // sheet no matter how plainly its published text stated it.
  //
  // The origin whitelist below is deliberate, not exhaustive of
  // `GrantedFeature.origin.kind`: bloodlines, hexes, rage powers, and every
  // other granted-power origin already have their own dedicated effect path
  // (`bloodline-mutations.ts`, `witch-hexes.ts`, `rage-powers.ts`, ...), so
  // routing them through this table too would risk a double-apply. Only
  // domain/school/inquisition grants had no route at all.
  //
  // Only the hand patch table is applied here — never the granted power's
  // own vendored `changes[]`, which were left unrouted deliberately (see
  // `granted-power-effects/index.ts`'s doc comment; auditing them is a
  // separate pass).
  for (const gf of collectGrantedFeatures(doc, refData)) {
    if (
      gf.origin?.kind !== "domain" &&
      gf.origin?.kind !== "school" &&
      gf.origin?.kind !== "inquisition"
    ) {
      continue;
    }
    const patches = GRANTED_POWER_CHANGE_PATCHES[gf.grant.name];
    const choiceEntry = GRANTED_POWER_CHOICES[gf.grant.name];
    if ((!patches || patches.length === 0) && !choiceEntry) continue;
    const grantingLevel = doc.identity.classes.find((c) => c.tag === gf.classTag)?.level ?? 0;
    if (grantingLevel === 0) continue;
    const grantRollData: RollData = {
      ...rollData,
      class: { level: grantingLevel, unlevel: grantingLevel },
    };
    for (const ch of patches ?? []) {
      evalChange(
        ch.formula,
        grantRollData,
        ch.target,
        ch.type,
        gf.grant.name,
        gf.grant.featureId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
    // Choose-one granted powers (Resistance (Power)'s energy type): apply
    // the stored selection's changes. Stored under the same `classFeature:`
    // namespace a base class feature's choice uses (both key off the
    // granting entry's own vendored id) — no stored pick, or a stale option
    // id, emits nothing.
    if (choiceEntry) {
      const picked = doc.build.pickChoices?.[`classFeature:${gf.grant.featureId}`];
      for (const ch of (picked && choiceEntry.choiceChanges[picked]) || []) {
        evalChange(
          ch.formula,
          grantRollData,
          ch.target,
          ch.type,
          gf.grant.name,
          gf.grant.featureId,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

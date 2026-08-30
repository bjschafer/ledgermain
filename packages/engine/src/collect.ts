/**
 * Collects typed modifiers from all sources — passive (race, equipped items,
 * granted class features) AND live session state (active buffs, conditions) —
 * evaluating each change's formula to a number against the roll-data context.
 * Dice-bearing change formulas (none target static stats in the slice) are
 * skipped. Buffs and conditions flow through the same evaluator + stacker as
 * passive changes (Stage 4).
 */

import type { ActiveBuff, CharacterDoc, Change, RefData } from "@pf1/schema";

import { resolveAlchemistDiscovery } from "./alchemist-discoveries.js";
import { ARCANIST_EXPLOITS } from "./arcanist-exploits.js";
import { resolveArchetypeFeatureEffect } from "./archetype-effects-resolve.js";
import {
  activeArchetypeSwaps,
  collectGrantedFeatures,
  domainCasterLevel,
  weaponTrainingReplaced,
} from "./archetypes.js";
import {
  ARMOR_TRAINING_GRANT_UUID,
  armorTrainingTiersKept,
  replacedTierLevels,
} from "./archetype-tier-replacements.js";
import { resolveSorcererBloodlineOrMutation } from "./bloodline-mutations.js";
import { BLOODRAGER_BLOODLINES } from "./bloodrager-bloodlines.js";
import { BUFF_CHANGE_PATCHES } from "./buff-effects.js";
import { CLASS_FEATURE_CHANGE_PATCHES, CLASS_FEATURE_CHOICES } from "./class-feature-effects.js";
import {
  GRANTED_POWER_CHANGE_PATCHES,
  GRANTED_POWER_CHOICES,
} from "./granted-power-effects/index.js";
import { FEAT_SAVE_CATEGORY_CHANGES } from "./feat-save-categories.js";
import { CONDITIONS } from "./conditions.js";
import { FAMILIARS } from "./familiars.js";
import { featNameSlug } from "./feat-effects.js";
import { resolveFeatEffect } from "./feat-effects-resolve.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import { ITEM_CHANGE_PATCHES } from "./item-effects.js";
import { resolveKineticistDefense } from "./kineticist-defense.js";
import { KINETICIST_ELEMENTS } from "./kineticist-elements.js";
import { resolveKineticistWildTalent } from "./kineticist-wild-talents.js";
import { resolveMagusArcanum } from "./magus-arcana.js";
import { mediumSpiritBonus, MEDIUM_SPIRITS } from "./medium-spirits.js";
import { OCCULTIST_SCHOOLS } from "./occultist-implements.js";
import { ORACLE_CURSES } from "./oracle-curses.js";
import { ORACLE_REVELATIONS } from "./oracle-revelations.js";
import { polymorphFormOption } from "./polymorph.js";
import { PSYCHIC_DISCIPLINES } from "./psychic-disciplines.js";
import { standardRaceAcChanges } from "./race-ac-notes.js";
import { standardRaceManeuverChanges } from "./race-maneuver-notes.js";
import { standardRaceSaveChanges } from "./race-save-notes.js";
import {
  acChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_AC_NOTES,
  VENDORED_RACIAL_TRAIT_AC_NOTES,
} from "./vendored-trait-ac-notes.js";
import {
  saveChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "./vendored-trait-save-notes.js";
import {
  maneuverChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
} from "./vendored-trait-maneuver-notes.js";
import {
  clCheckChangesFromNotes,
  VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES,
} from "./vendored-trait-cl-check-notes.js";
import {
  effectiveRaceContextNotes,
  FLEXIBLE_ABILITY_SUPPRESS_TARGET,
  RACIAL_TRAITS,
  vendoredTraitSuppressTargets,
} from "./racial-traits.js";
import { RACIAL_TRAIT_CHOICES } from "./racial-trait-choices.js";
import { resolveInvestigatorTalent } from "./investigator-talents.js";
import { resolveNinjaTrick } from "./ninja-tricks.js";
import { resolveRagePower } from "./rage-powers.js";
import { resolveRogueTalent } from "./rogue-talents.js";
import { resolveVigilanteSocialTalent, resolveVigilanteTalent } from "./vigilante-talents.js";
import { resolveGeneralShamanHex } from "./shaman-hexes.js";
import {
  findShamanHex,
  SHAMAN_GREATER_SPIRIT_LEVEL,
  SHAMAN_MANIFESTATION_LEVEL,
  SHAMAN_SPIRITS,
  SHAMAN_TRUE_SPIRIT_LEVEL,
  type ShamanSpiritAbility,
} from "./shaman-spirits.js";
import { resolveSlayerTalent } from "./slayer-talents.js";
import { TRAIT_CHOICES } from "./trait-effects-extracted.js";
import { resolveTraitDef } from "./traits.js";
import { totalLevel } from "./rolldata.js";
import type { TypedModifier } from "./stacking.js";
import { raceGrantsFlexibleAbility, SKILL_ABILITY, weaponTrainingBonus } from "./tables.js";
import { normalizeWeaponGroup } from "./weapon-groups.js";
import { resolveWitchHex } from "./witch-hexes.js";

/** A {@link TypedModifier} tagged with what it targets. */
export interface CollectedModifier extends TypedModifier {
  target: string;
  /**
   * Foundry's change operator, carried through from {@link Change}. Absent
   * means additive (the default); "set" means the evaluated formula replaces
   * the target's value rather than adding to it. Only speed targets consume
   * "set" today (see compute.ts); other targets ignore it.
   */
  operator?: "add" | "set";
  /**
   * Save-category scope carried through from {@link Change}. When set, this
   * modifier is excluded from the save's headline total and contributes only
   * to those categories' conditional totals (see `compute.ts`'s `computeSave`).
   */
  saveCategories?: readonly string[];
  /**
   * Maneuver-category scope carried through from {@link Change}. When set,
   * this modifier is excluded from cmb/cmd's headline total and contributes
   * only to those categories' conditional totals (see `compute.ts`'s cmb/cmd
   * block). Only meaningful on `cmb`/`cmd`-target modifiers.
   */
  maneuverCategories?: readonly string[];
  /**
   * AC-category scope carried through from {@link Change}. When set, this
   * modifier is excluded from AC's headline totals (and from the CMD
   * auto-derivation that reads bare-`ac` modifiers) and contributes only to
   * those categories' conditional totals (see `compute.ts`'s `computeAc`).
   * Only meaningful on bare-`ac`-target modifiers.
   */
  acCategories?: readonly string[];
}

/** `@item.level` / `@cl` in a buff formula = the buff's caster/effect level. */
function withBuffCasterLevel(buff: Pick<ActiveBuff, "casterLevel">, rollData: RollData): RollData {
  return buff.casterLevel === undefined
    ? rollData
    : { ...rollData, cl: buff.casterLevel, item: { level: buff.casterLevel } };
}

/**
 * Resolve one buff change's formula to a number, honoring the buff's
 * `casterLevel` override the same way {@link collectModifiers} does. For UI
 * use — shows a player what a buff's formula actually amounts to rather than
 * the raw `@data.path` string. Returns `null` for dice terms or malformed
 * formulas; callers should fall back to displaying the raw formula.
 */
export function evaluateBuffChange(
  change: Pick<Change, "formula">,
  buff: Pick<ActiveBuff, "casterLevel">,
  rollData: RollData,
): number | null {
  try {
    return tryEvaluateFormula(change.formula, withBuffCasterLevel(buff, rollData));
  } catch {
    return null;
  }
}

function evalChange(
  formula: string,
  rollData: RollData,
  target: string,
  type: string,
  source: string,
  sourceId: string,
  out: CollectedModifier[],
  operator?: "add" | "set",
  saveCategories?: readonly string[],
  maneuverCategories?: readonly string[],
  acCategories?: readonly string[],
): void {
  let value: number | null;
  try {
    value = tryEvaluateFormula(formula, rollData);
  } catch {
    // A malformed change formula should not crash the whole sheet; skip it.
    return;
  }
  if (value === null || Number.isNaN(value)) return;
  // A category-scoped change contributing 0 (a level-tiered category that
  // hasn't unlocked yet) must not become a conditional line identical to the
  // headline total, so drop it here rather than filtering downstream.
  if (value === 0 && saveCategories !== undefined && saveCategories.length > 0) return;
  if (value === 0 && maneuverCategories !== undefined && maneuverCategories.length > 0) return;
  if (value === 0 && acCategories !== undefined && acCategories.length > 0) return;
  out.push({
    target,
    type: type || "untyped",
    value,
    source,
    sourceId,
    operator,
    saveCategories,
    maneuverCategories,
    acCategories,
  });
}

/**
 * Buff-gated changes: true when `ch` carries no `activeWhenBuff`
 * (unconditional — every change source that predates this mechanism resolves
 * here, unchanged) or when at least one currently active buff matches the gate
 * by `buffId` and/or `effectTag` — never by display name (see
 * `Change.activeWhenBuff`'s doc comment). A gate is satisfied by ANY match
 * across either list.
 *
 * Gated-but-currently-inactive changes are simply OMITTED from the
 * collected list rather than pushed through with a forced
 * `applied: false` provenance flag. `stacking.ts`'s `resolveStack` computes
 * `applied` purely from same-type-bonus comparison (highest wins); bolting
 * on an externally-forced "inactive" entry would mean carrying a phantom
 * modifier through the whole pipeline (and through `resolveStack`'s
 * highest-wins logic, where it could wrongly suppress a genuinely-applied
 * same-type bonus) for a struck-through-in-the-UI distinction the tracker
 * doesn't currently render any differently from "this source contributed
 * nothing" — the cheaper, correct-by-construction choice.
 */
function buffGateSatisfied(
  ch: Pick<Change, "activeWhenBuff">,
  activeBuffs: readonly ActiveBuff[],
): boolean {
  const gate = ch.activeWhenBuff;
  if (!gate) return true;
  return activeBuffs.some(
    (b) =>
      (b.buffId !== undefined && (gate.buffIds?.includes(b.buffId) ?? false)) ||
      (b.effectTag !== undefined && (gate.effectTags?.includes(b.effectTag) ?? false)),
  );
}

export function collectModifiers(
  doc: CharacterDoc,
  refData: RefData,
  rollData: RollData,
): CollectedModifier[] {
  const out: CollectedModifier[] = [];

  // Buff-gate check — see `buffGateSatisfied`. Consulted in every
  // hand-authored build-choice loop below (traits, bloodline powers, exploits,
  // arcana, revelations, hexes, rage powers, discoveries, curse), both
  // racial-trait loops (hand-authored `RACIAL_TRAITS` and the vendored
  // `RefData.racialTraits` catalog — the latter's own hand-authored
  // `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` supplement is the first data-pipeline
  // source to actually emit `activeWhenBuff`, e.g. a skinwalker heritage's
  // "while shapechanged" rider), so a table entry carrying `activeWhenBuff`
  // gates correctly no matter which table it lands in. Items, class features,
  // buffs, and conditions deliberately skip the check: nothing authors the
  // field on those sources. Buffs the master actually carries: a buff flagged
  // `excludeMaster` (a Share Spells personal spell cast on a companion
  // *instead of* the caster) applies only to its shared creatures, so the
  // master neither collects its modifiers nor gates its own changes on it.
  const masterBuffs = (doc.live.activeBuffs ?? []).filter((b) => !b.excludeMaster);
  const gateOpen = (ch: Change): boolean => buffGateSatisfied(ch, masterBuffs);

  // --- race ---------------------------------------------------------------
  const race = refData.races[doc.identity.race];
  if (race) {
    // Alternate racial traits that apply to THIS race — a stale id from a race
    // change (or an unknown id) is ignored, matching the
    // traits/conditions/feats posture. Each swaps a standard trait for an
    // alternate: `suppressTargets` drops the replaced standard trait's
    // structured `Race.change` (so e.g. a Human taking Focused Study loses the
    // `bonusFeats` grant), and the alternate's own `changes[]` are applied
    // below alongside every other change source.
    const activeRacialTraits = (doc.build.racialTraits ?? [])
      .map((id) => RACIAL_TRAITS[id])
      .filter((t): t is typeof t & {} => t != null && t.race === race.name);
    const suppressed = new Set<string>();
    for (const t of activeRacialTraits) {
      for (const target of t.suppressTargets ?? []) suppressed.add(target);
    }
    // Vendored alternates suppress too, where the replaced standard trait has
    // a hand-verified target mapping (`VENDORED_STANDARD_TRAIT_TARGETS` — the
    // featured races; unmapped races/names fall through to the historical
    // "apply on top" posture documented on the loop below).
    const activeVendoredTraits = (doc.build.vendoredRacialTraits ?? [])
      .map((id) => refData.racialTraits[id])
      .filter((t): t is NonNullable<typeof t> => t != null && t.race.includes(race.name));
    for (const t of activeVendoredTraits) {
      for (const target of vendoredTraitSuppressTargets(t, race.name)) suppressed.add(target);
    }

    for (const ch of race.changes) {
      if (suppressed.has(ch.target)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        race.name,
        race.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
    // Standard racial traits the compendium ships only as prose: a save
    // bonus scoped to a category of effects has no vendored `Race.change` to
    // carry it, so it's recovered from the note that describes it. Fed the
    // POST-suppression notes, which is what keeps an alternate that replaces
    // the trait (Steel Soul for Hardy) from doubling up with it — see
    // `race-save-notes.ts`.
    // Same idea, for standard racial traits whose bonus is scoped to one
    // named combat maneuver rather than a save category (dwarf/duergar
    // Stability) — see `race-maneuver-notes.ts`.
    const survivingRaceNotes = effectiveRaceContextNotes(
      race,
      activeRacialTraits,
      activeVendoredTraits,
    );
    for (const ch of [
      ...standardRaceSaveChanges(race.name, survivingRaceNotes),
      ...standardRaceManeuverChanges(race.name, survivingRaceNotes),
      ...standardRaceAcChanges(race.name, survivingRaceNotes),
    ]) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        race.name,
        race.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }

    // Flexible +2 (Human / Half-Elf / Half-Orc): no fixed ability changes,
    // player picks one ability score at character creation. An alternate
    // racial trait that RAW-replaces this bonus with a fixed one (Half-Orc
    // Orc Atavism, Half-Elf Kindred-Raised) suppresses it via the
    // `FLEXIBLE_ABILITY_SUPPRESS_TARGET` sentinel — not a real `Change`
    // target, so it's checked here rather than in the `ch.target` loop above.
    if (
      raceGrantsFlexibleAbility(race) &&
      doc.identity.flexibleAbility &&
      !suppressed.has(FLEXIBLE_ABILITY_SUPPRESS_TARGET)
    ) {
      out.push({
        target: doc.identity.flexibleAbility,
        type: "racial",
        value: 2,
        source: `${race.name} (choice)`,
        sourceId: race.id,
      });
    }
    // The chosen alternates' own granted modifiers. Gated by `gateOpen` like
    // every other hand-authored build-choice loop below — this loop predates
    // the mechanism and had never actually checked it, so a hand-authored
    // alternate trait's rider couldn't be scoped to a toggled buff until now.
    for (const t of activeRacialTraits) {
      for (const ch of t.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          t.name,
          t.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one racial traits (Tiefling's Maw or Claw): apply the stored
      // selection's changes. No stored pick, or a stale option id, emits
      // nothing — same posture as `CLASS_FEATURE_CHOICES`.
      const traitChoiceEntry = RACIAL_TRAIT_CHOICES[t.id];
      if (traitChoiceEntry) {
        const picked = doc.build.pickChoices?.[`racialTrait:${t.id}`];
        for (const ch of (picked && traitChoiceEntry.choiceChanges[picked]) || []) {
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            t.name,
            t.id,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
      }
    }

    // Vendored alternate racial traits — the ~80-race `RefData.racialTraits`
    // catalog. For the featured races with a verified
    // `VENDORED_STANDARD_TRAIT_TARGETS` mapping, the replaced standard trait's
    // structured bonus was already suppressed above; everywhere else the
    // source only names WHAT it replaces, not a verified mapping to specific
    // `Race.changes`/`contextNotes` entries, so these apply on top rather than
    // risk dropping the wrong thing on an unaudited entry (see `RacialTrait`'s
    // doc comment in `@pf1/schema`). The model layer excludes any vendored
    // entry whose name already matches a hand-authored one for the character's
    // race, so this never double-grants the SAME trait's bonus twice.
    for (const t of activeVendoredTraits) {
      // Gated by `gateOpen` same as the hand-authored loop above — lets a
      // vendored trait's own supplemented rider (e.g. a skinwalker heritage's
      // "while shapechanged" bonus, hand-authored in data-pipeline
      // `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES`) apply only while the matching
      // buff/effectTag is active, instead of unconditionally.
      for (const ch of [
        ...t.changes,
        ...saveChangesFromNotes(t.contextNotes, VENDORED_RACIAL_TRAIT_SAVE_NOTES),
        ...maneuverChangesFromNotes(t.contextNotes, VENDORED_RACIAL_TRAIT_MANEUVER_NOTES),
        ...acChangesFromNotes(t.contextNotes, VENDORED_RACIAL_TRAIT_AC_NOTES),
        ...clCheckChangesFromNotes(t.contextNotes, VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES),
      ]) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          t.name,
          t.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // "Choose one" changes the source ships untargeted (`openChanges`): each
      // applies only once the player has named a target, positionally, in
      // `build.vendoredRacialTraitTargets`. An unfilled slot grants nothing
      // rather than guessing a target — the picker flags it instead.
      const chosenTargets = doc.build.vendoredRacialTraitTargets?.[t.id] ?? [];
      for (const [i, ch] of (t.openChanges ?? []).entries()) {
        if (!gateOpen(ch)) continue;
        const target = chosenTargets[i];
        if (!target) continue;
        evalChange(
          ch.formula,
          rollData,
          target,
          ch.type,
          t.name,
          t.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one vendored racial traits (a fixed, enumerable option list —
      // distinct from the free-text `openChanges` targeting above): same
      // `racialTrait:<id>` namespace and posture as the hand-authored branch.
      const vendoredChoiceEntry = RACIAL_TRAIT_CHOICES[t.id];
      if (vendoredChoiceEntry) {
        const picked = doc.build.pickChoices?.[`racialTrait:${t.id}`];
        for (const ch of (picked && vendoredChoiceEntry.choiceChanges[picked]) || []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            t.name,
            t.id,
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

  // --- equipped items -----------------------------------------------------
  for (const inst of doc.build.gear ?? []) {
    if (!inst.equipped || !inst.itemId) continue;
    const item = refData.items[inst.itemId];
    if (!item) continue;
    const changes = [...item.changes, ...(ITEM_CHANGE_PATCHES[item.name] ?? [])];
    for (const ch of changes) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        item.name,
        item.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- granted class features ---------------------------------------------
  // Audit finding: an active archetype's swapped-out base feature (e.g.
  // Two-Handed Fighter replacing Armor Training) previously kept contributing
  // its `changes[]` here regardless — this loop had no awareness of
  // `doc.build.archetypes` at all. `archetypeSwaps` (uuid -> replacing
  // archetype feature name, gated on the character's current level in that
  // class — see `activeArchetypeSwaps` in `archetypes.ts`) fixes that: a
  // swapped grant is skipped entirely, same as if the character never had it.
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
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

  // --- cleric domain / subdomain direct changes ---------------
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
      const domain =
        Object.values(refData.domains).find((d) => d.tag === tag) ??
        Object.values(refData.subdomains).find((s) => s.tag === tag);
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

  // --- granted-power patches (domain/school/inquisition) ------
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

  // --- archetype feature effects (extended by) --------
  // Hand-authored numeric effects for the small slice of archetype features
  // that grant an unconditional bonus (see `archetype-effects.ts`'s doc
  // comment for the audit/scope rationale), extended by the machine-extracted
  // table (`archetype-effects-extracted.ts`, the fighter pilot) —
  // `resolveArchetypeFeatureEffect` checks the hand-verified table first, so
  // an id present in both is never double-applied. Gated the same way base
  // class features are: the granting class's level must reach the feature's
  // level.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    const archFeatureRollData: RollData = {
      ...rollData,
      class: { level: clsLevel, unlevel: clsLevel },
    };
    for (const f of Object.values(refData.archetypeFeatures)) {
      if (f.archetypeId !== archetypeId || f.level > clsLevel) continue;
      const resolved = resolveArchetypeFeatureEffect(f.id);
      if (!resolved) continue;
      for (const ch of resolved.effect.changes) {
        evalChange(
          ch.formula,
          archFeatureRollData,
          ch.target,
          ch.type,
          f.name,
          f.uuid,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one archetype features (Invulnerable Rager's Extreme
      // Endurance fire-or-cold pick): apply the stored selection's changes.
      // No stored pick, or a stale option id, emits nothing — same posture
      // as every other pick-choice namespace.
      if (resolved.effect.choiceChanges) {
        const picked = doc.build.pickChoices?.[`archetypeFeature:${f.id}`];
        for (const ch of (picked && resolved.effect.choiceChanges[picked]) || []) {
          evalChange(
            ch.formula,
            archFeatureRollData,
            ch.target,
            ch.type,
            f.name,
            f.uuid,
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

  // --- active buffs (live state) ------------------------------------------
  for (const buff of masterBuffs) {
    const buffRollData = withBuffCasterLevel(buff, rollData);
    for (const ch of buff.changes) {
      evalChange(
        ch.formula,
        buffRollData,
        ch.target,
        ch.type,
        buff.name,
        buff.instanceId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
    // Hand-authored patches for a vendored buff whose own `changes[]` are
    // missing a real numeric effect its description text promises — see
    // `buff-effects.ts`'s doc comment (e.g. Unchained Rage's temp-HP grant).
    // Keyed by name so it applies regardless of activation path (linked-pool
    // toggle, table-buff toggle, or a manual add).
    for (const ch of BUFF_CHANGE_PATCHES[buff.name] ?? []) {
      evalChange(
        ch.formula,
        buffRollData,
        ch.target,
        ch.type,
        buff.name,
        buff.instanceId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- conditions (live state) --------------------------------------------
  for (const condId of doc.live.conditions ?? []) {
    const cond = CONDITIONS[condId];
    if (!cond) continue;
    for (const ch of cond.changes) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        cond.name,
        cond.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- traits (build choices) ----------------------------------------------
  // doc.build.traits holds trait ids: keys into the engine's 28-entry
  // hand-authored TRAITS table OR the vendored RefData.traits
  // catalog — resolveTraitDef checks both, hand-authored
  // first. A homebrew trait's own definition rides in doc.build.homebrew.traits
  // and is checked as a final fallback here. Unknown ids are skipped, matching
  // the conditions/feats posture: never crash on an unrecognized id.
  for (const traitId of doc.build.traits ?? []) {
    const trait = resolveTraitDef(traitId, refData) ?? doc.build.homebrew?.traits?.[traitId];
    if (!trait) continue;
    for (const ch of [
      ...trait.changes,
      ...saveChangesFromNotes(trait.contextNotes, VENDORED_CHARACTER_TRAIT_SAVE_NOTES),
      ...maneuverChangesFromNotes(trait.contextNotes, VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES),
      ...acChangesFromNotes(trait.contextNotes, VENDORED_CHARACTER_TRAIT_AC_NOTES),
    ]) {
      if (!gateOpen(ch)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        trait.name,
        trait.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
    // Choose-one traits (Deep Cover's Bluff-or-Disguise class skill): apply
    // the stored selection's changes. No stored pick, or a stale option id,
    // emits nothing — same safe default as every other pick-choice namespace.
    // A family-shaped choice (an own Craft/Perform/Profession instance, e.g.
    // Clan Artisan) instead runs the picked FULL instance id through
    // `familyChangeTemplate` — the trait-choice analog of a `ChoiceFeatEntry`
    // feat's `build(choiceId)` below, since the instance id can't be
    // enumerated into a fixed `choiceChanges` map ahead of time.
    const traitChoice = TRAIT_CHOICES[traitId];
    const traitPicked = doc.build.pickChoices?.[`trait:${traitId}`];
    const traitChoiceChanges = traitPicked
      ? (traitChoice?.choiceChanges?.[traitPicked] ??
        traitChoice?.familyChangeTemplate?.(traitPicked))
      : undefined;
    for (const ch of traitChoiceChanges ?? []) {
      if (!gateOpen(ch)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        trait.name,
        trait.id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- homebrew abilities (build.homebrew.classFeatures) -----------------
  // A vendored class feature's `changes[]` are routed per-subsystem rather
  // than generically (see the granted-power section below), but a homebrew
  // ability has no subsystem to route through: the player authored the
  // modifier by hand, so it applies unconditionally, exactly like a homebrew
  // feat's or trait's own `changes[]`. Authoring the ability IS granting it
  // (there's no catalog to select from), so there's no separate selected-ids
  // list to intersect with here.
  for (const [id, ability] of Object.entries(doc.build.homebrew?.classFeatures ?? {})) {
    for (const ch of ability.changes ?? []) {
      if (!gateOpen(ch)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        ability.name,
        id,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- sorcerer bloodline arcana + powers (build choice) ----------
  // Bloodline arcana/powers are hand-authored clean-room content (not in the
  // vendored Foundry data pack — see `@pf1/engine` `bloodlines.ts`), same
  // posture as `traits.ts` above. Gated on the character actually having
  // sorcerer levels (a non-sorcerer with a stale `sorcererBloodline` field
  // gets nothing) and, per power, on the sorcerer level reaching that power's
  // gate. `rollData.classes.sorcerer.level` (built by `buildRollData`) already
  // carries the right value for the `@classes.sorcerer.level` formulas these
  // entries use, so no per-grant RollData override is needed (unlike the
  // domain/school `@class.unlevel` convention above, which is granting-class
  // contextual). `doc.build.sorcererBloodline` may name a wildblooded mutation
  // id instead of a base bloodline — `resolveSorcererBloodlineOrMutation`
  // resolves either to the same merged shape (mutation's arcana, parent's
  // powers with any swap applied; see `bloodline-mutations.ts`).
  const sorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")?.level ?? 0;
  if (sorcererLevel > 0 && doc.build.sorcererBloodline) {
    const bloodline = resolveSorcererBloodlineOrMutation(doc.build.sorcererBloodline, refData);
    if (bloodline && !bloodline.displayOnly) {
      for (const ch of bloodline.arcana.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${bloodline.name} Bloodline (Arcana)`,
          `bloodline:${bloodline.tag}:arcana`,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      for (const power of bloodline.powers) {
        if (power.level > sorcererLevel) continue;
        // Variant-dependent grants (Dragon Resistances' energy resistance,
        // Elemental Movement's mode) key off the bloodline variant stored at
        // pick time — no stored variant, or a stale id, emits nothing.
        const variantChanges = doc.build.sorcererBloodlineVariant
          ? (power.variantChanges?.[doc.build.sorcererBloodlineVariant] ?? [])
          : [];
        for (const ch of [...(power.changes ?? []), ...variantChanges]) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            `${power.name} (${bloodline.name} Bloodline)`,
            `bloodline:${bloodline.tag}:${power.id}`,
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

  // --- bloodrager bloodline powers (build choice) ---------------
  // Hand-authored clean-room content (not in the vendored Foundry data pack —
  // see `@pf1/engine` `bloodrager-bloodlines.ts`), gated on the character
  // actually having bloodrager levels — same posture as the sorcerer
  // bloodline loop above, but at the bloodrager's own 1st/4th/8th/12th/16th/
  // 20th power gates. `rollData.classes.bloodrager.level` (built by
  // `buildRollData`) already carries the right value for the
  // `@classes.bloodrager.level` formulas these entries use.
  const bloodragerLevel = doc.identity.classes.find((c) => c.tag === "bloodrager")?.level ?? 0;
  if (bloodragerLevel > 0 && doc.build.bloodragerBloodline) {
    const bloodline = BLOODRAGER_BLOODLINES[doc.build.bloodragerBloodline];
    if (bloodline) {
      for (const power of bloodline.powers) {
        if (power.level > bloodragerLevel) continue;
        // Same variant-dependent path as the sorcerer loop above, off
        // `bloodragerBloodlineVariant`.
        const variantChanges = doc.build.bloodragerBloodlineVariant
          ? (power.variantChanges?.[doc.build.bloodragerBloodlineVariant] ?? [])
          : [];
        for (const ch of [...(power.changes ?? []), ...variantChanges]) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            `${power.name} (${bloodline.name} Bloodline)`,
            `bloodragerBloodline:${bloodline.tag}:${power.id}`,
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

  // --- psychic discipline powers (build choice, promotion audit) -----------
  // Hand-authored clean-room content (not in the vendored Foundry data pack —
  // see `@pf1/engine` `psychic-disciplines.ts`), gated on the character
  // actually having psychic levels and a chosen discipline — same posture as
  // the sorcerer/bloodrager bloodline loops above, at each power's own
  // 1st/5th/13th gate. `archetypes.ts`'s `collectGrantedFeatures` surfaces
  // every power as a note; this loop additionally applies the rare few whose
  // `changes` are genuinely unconditional (see that file's doc comment).
  const psychicLevel = doc.identity.classes.find((cl) => cl.tag === "psychic")?.level ?? 0;
  if (psychicLevel > 0 && doc.build.psychicDiscipline) {
    const discipline = PSYCHIC_DISCIPLINES[doc.build.psychicDiscipline];
    if (discipline) {
      for (const power of discipline.powers) {
        if (power.level > psychicLevel) continue;
        for (const ch of power.changes ?? []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            `${power.name} (${discipline.name} Discipline)`,
            `discipline:${discipline.tag}:${power.name}`,
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

  // --- arcanist exploits (build choice) -------------------------
  // Exploit ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `arcanist-exploits.ts`), same
  // posture as `traits.ts` above. Gated on the character actually having
  // arcanist levels (a non-arcanist with a stale `arcanistExploits` field
  // gets nothing). Every base exploit is `displayOnly` with `changes: []`
  // today (see that file's doc comment), so this loop currently contributes
  // no numeric modifiers — it's wired the same way traits/bloodline powers
  // are so a future exploit with a real unconditional Change works for free.
  const arcanistLevel = doc.identity.classes.find((c) => c.tag === "arcanist")?.level ?? 0;
  if (arcanistLevel > 0) {
    for (const exploitId of doc.build.arcanistExploits ?? []) {
      const exploit = ARCANIST_EXPLOITS[exploitId];
      if (!exploit) continue;
      for (const ch of exploit.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          exploit.name,
          exploit.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- magus arcana (build choice, vendored catalog) -----
  // Arcana ids resolve through the hand-authored table first, falling back
  // to the vendored catalog (`RefData.magusArcana`) for a vendored-only pick
  // — see `@pf1/engine` `magus-arcana.ts`'s `resolveMagusArcanum`. Gated on
  // the character actually having magus levels. Every base arcana is
  // `displayOnly` with `changes: []` today (see that file's doc comment), so
  // this loop currently contributes no numeric modifiers — wired the same
  // way for a future arcana with a real unconditional Change to work for
  // free.
  const magusLevel = doc.identity.classes.find((c) => c.tag === "magus")?.level ?? 0;
  if (magusLevel > 0) {
    for (const arcanaId of doc.build.magusArcana ?? []) {
      const arcana = resolveMagusArcanum(arcanaId, refData);
      if (!arcana) continue;
      for (const ch of arcana.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          arcana.name,
          arcana.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- oracle revelations (build choice) -------------------------
  // Most revelations are `displayOnly` with `changes: []`, but a promoted
  // handful carry real changes and three carry choose-one `choiceChanges`
  // (see `oracle-revelations.ts`'s doc comment) — scoped to the character's
  // chosen mystery.
  const oracleLevelForRevelations =
    doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevelForRevelations > 0 && doc.build.oracleMystery) {
    for (const revelationId of doc.build.oracleRevelations ?? []) {
      const revelation = ORACLE_REVELATIONS[revelationId];
      if (!revelation || revelation.mysteryTag !== doc.build.oracleMystery) continue;
      // Choose-one revelations: the pick lives under the revelation's own
      // key, or — for the Dragon mystery's associated element
      // (`choiceFromMystery`) — under the MYSTERY's key, since RAW makes
      // that choice when the mystery is selected. No stored pick, or a
      // stale option id, emits nothing (same safe default as rage powers).
      let choiceChanges: readonly Change[] = [];
      if (revelation.choiceChanges) {
        const key = revelation.choiceFromMystery
          ? `oracleMystery:${revelation.mysteryTag}`
          : `oracleRevelation:${revelation.id}`;
        const picked = doc.build.pickChoices?.[key];
        choiceChanges = (picked && revelation.choiceChanges[picked]) || [];
      }
      for (const ch of [...revelation.changes, ...choiceChanges]) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          revelation.name,
          revelation.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- witch hexes (build choice, vendored catalog) ------
  // Hex ids resolve through the hand-authored table first, falling back to
  // the vendored catalog (`RefData.hexes`) for a vendored-only pick — see
  // `@pf1/engine` `witch-hexes.ts`'s `resolveWitchHex`. Gated on the
  // character actually having witch levels. Nearly every hex is `displayOnly`
  // with `changes: []` — only the handful whose benefit is unconditional and
  // lands on the witch's own sheet carries a real Change (see that file's doc
  // comment for the bar and the deferred near-misses).
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
  if (witchLevel > 0) {
    for (const hexId of doc.build.witchHexes ?? []) {
      const hex = resolveWitchHex(hexId, refData);
      if (!hex) continue;
      for (const ch of hex.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          hex.name,
          hex.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- shaman hexes (build choice, general catalog) --------
  // Hex ids may be spirit-scoped (`<spiritTag>:<name>` — `findShamanHex`,
  // hand-authored in `shaman-spirits.ts`) or drawn from the vendored,
  // spirit-agnostic GENERAL catalog (`resolveGeneralShamanHex`,
  // `shaman-hexes.ts`). A spirit-scoped hex's `changes[]` only applies while
  // it belongs to the CURRENTLY chosen spirit — same "tolerate but don't
  // apply a leftover pick from an abandoned spirit" rule
  // `collectGrantedFeatures` (archetypes.ts) already uses for display,
  // extended to numbers so switching away from a spirit silently drops any
  // Change its hexes granted rather than leaving it stuck on. Almost every
  // spirit hex is `displayOnly` with `changes: []` (see `shaman-spirits.ts`'s
  // doc comment) — one promotion exists (Flame's Cinder Dance, a flat
  // landSpeed bump) — and every general hex is `displayOnly` with `changes:
  // []` today (see `shaman-hexes.ts`'s doc comment) — wired the same way for
  // a future entry with a real unconditional/buff-gated Change to work for
  // free.
  const shamanLevel = doc.identity.classes.find((c) => c.tag === "shaman")?.level ?? 0;
  if (shamanLevel > 0) {
    const currentSpiritTag = doc.build.shamanSpirit;
    for (const hexId of doc.build.shamanHexes ?? []) {
      const spiritHex = findShamanHex(hexId);
      if (spiritHex) {
        if (hexId.split(":")[0] !== currentSpiritTag) continue;
        for (const ch of spiritHex.changes) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            spiritHex.name,
            spiritHex.id,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
        continue;
      }
      const hex = resolveGeneralShamanHex(hexId, refData);
      if (!hex) continue;
      for (const ch of hex.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          hex.name,
          hex.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }

    // Greater/True Spirit Ability + Manifestation — gained at fixed shaman
    // class-level thresholds (`SHAMAN_GREATER_
    // SPIRIT_LEVEL`/`SHAMAN_TRUE_SPIRIT_LEVEL`/`SHAMAN_MANIFESTATION_LEVEL`,
    // verified against aonprd.com's Shaman class page), not a budgeted pick,
    // so there's no id list to iterate — just the current spirit's own three
    // tiers, each independently gated on the shaman having actually reached
    // that level. Most tiers are `changes: []` (see `shaman- spirits.ts`'s doc
    // comment); wired the same way for a future promotion to work for free.
    const currentSpirit = currentSpiritTag ? SHAMAN_SPIRITS[currentSpiritTag] : undefined;
    if (currentSpirit) {
      const tiers: [ShamanSpiritAbility, number, string][] = [
        [currentSpirit.greaterAbility, SHAMAN_GREATER_SPIRIT_LEVEL, "greater"],
        [currentSpirit.trueAbility, SHAMAN_TRUE_SPIRIT_LEVEL, "true"],
        [currentSpirit.manifestation, SHAMAN_MANIFESTATION_LEVEL, "manifestation"],
      ];
      for (const [ability, minLevel, tierId] of tiers) {
        if (shamanLevel < minLevel) continue;
        for (const ch of ability.changes ?? []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            ability.name,
            `spirit:${currentSpirit.tag}:${tierId}`,
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

  // --- talent-family lists (rogue/ninja/investigator/vigilante) -----------
  // These four families were surfaced as display features (see
  // `collectGrantedFeatures`) from day one but never had modifier loops
  // here, so a def's `changes[]` silently went nowhere — found when the
  // first promotions landed (ninja Wall Climber, vigilante Rooftop
  // Infiltrator) and the pre-existing vigilante entries (Shadow's Speed,
  // Monkey's Paws) turned out never to have reached the sheet either. Same
  // gate-resolve-skip-apply shape as every loop above; class gates mirror
  // `collectGrantedFeatures`' own (rogue OR unchained rogue for talents,
  // one vigilante gate for both talent pools).
  const rogueTalentLevel =
    doc.identity.classes.find((c) => c.tag === "rogue" || c.tag === "rogueUnchained")?.level ?? 0;
  if (rogueTalentLevel > 0) {
    for (const talentId of doc.build.rogueTalents ?? []) {
      const talent = resolveRogueTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const ninjaLevel = doc.identity.classes.find((c) => c.tag === "ninja")?.level ?? 0;
  if (ninjaLevel > 0) {
    for (const trickId of doc.build.ninjaTricks ?? []) {
      const trick = resolveNinjaTrick(trickId, refData);
      if (!trick) continue;
      for (const ch of trick.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          trick.name,
          trick.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const investigatorTalentLevel =
    doc.identity.classes.find((c) => c.tag === "investigator")?.level ?? 0;
  if (investigatorTalentLevel > 0) {
    for (const talentId of doc.build.investigatorTalents ?? []) {
      const talent = resolveInvestigatorTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const vigilanteLevel = doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
  if (vigilanteLevel > 0) {
    for (const talentId of doc.build.vigilanteTalents ?? []) {
      const talent = resolveVigilanteTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
    for (const talentId of doc.build.vigilanteSocialTalents ?? []) {
      const talent = resolveVigilanteSocialTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- barbarian rage powers (build choice, gated) ------
  // Power ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `rage-powers.ts`), same posture as
  // magus arcana above. Gated on the character actually having barbarian
  // (either edition) levels. Most powers are still `displayOnly` with
  // `changes: []` (activated/per-round abilities or conditional-target near
  // misses — see that file's doc comment), but a handful (Raging Climber,
  // Raging Swimmer, Swift Foot) now carry a real `Change` gated by
  // `activeWhenBuff` ("while raging" mechanism) —
  // `buffGateSatisfied` skips those entirely unless the character currently
  // has the (chained or Unchained) Rage buff active in `live.activeBuffs`.
  const barbarianAnyLevel = doc.identity.classes
    .filter((c) => c.tag === "barbarian" || c.tag === "barbarianUnchained")
    .reduce((sum, c) => sum + c.level, 0);
  if (barbarianAnyLevel > 0) {
    for (const powerId of doc.build.ragePowers ?? []) {
      const power = resolveRagePower(powerId, refData);
      if (!power) continue;
      for (const ch of power.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          power.name,
          power.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one powers (Energy Resistance's energy type, the Elemental
      // Blood chain): apply the stored selection's changes. The pick lives
      // under the DECLARING power's key (`choiceFrom` for chain entries);
      // no stored pick, or a stale option id, emits nothing.
      if (power.choiceChanges) {
        const picked = doc.build.pickChoices?.[`ragePower:${power.choiceFrom ?? power.id}`];
        for (const ch of (picked && power.choiceChanges[picked]) || []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            power.name,
            power.id,
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

  // --- alchemist discoveries (build choice) ----------------------
  // Discovery ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `alchemist-discoveries.ts`), same
  // posture as magus arcana above. Gated on the character actually having
  // alchemist levels. Every discovery is `displayOnly` with `changes: []`
  // today (see that file's doc comment), so this loop currently contributes
  // no numeric modifiers — wired the same way for a future discovery with a
  // real unconditional Change to work for free.
  const alchemistLevel = doc.identity.classes.find((c) => c.tag === "alchemist")?.level ?? 0;
  if (alchemistLevel > 0) {
    for (const discoveryId of doc.build.alchemistDiscoveries ?? []) {
      const discovery = resolveAlchemistDiscovery(discoveryId, refData);
      if (!discovery) continue;
      for (const ch of discovery.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          discovery.name,
          discovery.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- kineticist wild talents (build choice) -------------------------------
  // Talent ids resolve through the hand-authored table first, falling back
  // to the vendored catalog — see `@pf1/engine` `kineticist-wild-talents.ts`
  // `resolveKineticistWildTalent`. Gated on the character actually having
  // kineticist levels. Most talents are display-only (activated abilities
  // with burn/action state — see that file's doc comment); a promoted set
  // (Clockwork Heart's feat benefits, the elemental-resistance Adaptation
  // talents, Eyes of the Void's darkvision, Herbal Antivenom's poison-save
  // bonus, ...) carries a real unconditional Change — see that file's doc
  // comment for the list.
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  if (kineticistLevel > 0) {
    for (const talentId of doc.build.kineticistWildTalents ?? []) {
      const talent = resolveKineticistWildTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes ?? []) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- kineticist Skilled Kineticist (universal utility wild talent) ------
  // RAW (Occult Adventures): "you gain a bonus equal to 1/2 your kineticist
  // level on skill checks with the skills your primary element added to your
  // class skill list." Which two skills that is depends on the player's
  // PRIMARY element (`KINETICIST_ELEMENTS[...].classSkills`, the same table
  // `compute.ts`'s `computeSkills` reads for the class-skill grant itself),
  // not a player choice, so it can't live in the talent's own static
  // `changes[]` (which has no access to `doc.build.kineticistElement`) —
  // resolved here instead, the same "needs the character's own build state"
  // shape as the Elemental Defense block below. Greater Skilled Kineticist's
  // OWN bonus (a player-chosen THIRD skill) stays unmodeled: the schema has
  // no field recording which skill was picked.
  if (kineticistLevel > 0 && doc.build.kineticistElement) {
    const hasSkilledKineticist = (doc.build.kineticistWildTalents ?? []).includes(
      "universal:skilledKineticist",
    );
    if (hasSkilledKineticist) {
      const primaryClassSkills =
        KINETICIST_ELEMENTS[doc.build.kineticistElement]?.classSkills ?? [];
      for (const skillId of primaryClassSkills) {
        evalChange(
          "floor(@classes.kineticist.level / 2)",
          rollData,
          `skill.${skillId}`,
          "competence",
          "Skilled Kineticist",
          "universal:skilledKineticist",
          out,
        );
      }
    }
  }

  // --- kineticist Elemental Defense (primary element, 2nd level) ----------
  // Always on, and always scaled by however much of the burn currently held
  // the player spent on it (`live.kineticistDefenseBurn`) — clamped to the
  // burn actually held, so a stale counter can never inflate the sheet. Five
  // of the seven defenses land on a real target; the other two carry
  // `changes: []` and stay reminders. See `kineticist-defense.ts`.
  if (kineticistLevel > 0) {
    const burnFeature = Object.values(refData.classFeatures).find((f) => f.tag === "burn");
    const burnHeld = burnFeature ? (doc.live.resources[burnFeature.id]?.used ?? 0) : 0;
    const defense = resolveKineticistDefense(doc.build.kineticistElement, kineticistLevel, {
      burnInvested: Math.min(doc.live.kineticistDefenseBurn ?? 0, burnHeld),
      shroudMode: doc.live.kineticistShroudMode,
    });
    for (const ch of defense?.changes ?? []) {
      if (!gateOpen(ch)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        defense!.name,
        `kineticistDefense:${defense!.elementTag}`,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- slayer talents (build choice, hand-table follow-up) ------
  // Talent ids are hand-authored clean-room content overlaid onto the
  // vendored catalog (`@pf1/engine` `slayer-talents.ts`'s
  // `resolveSlayerTalent`, hand-authored table first, vendored fallback for
  // an id not yet promoted), same posture as rage powers above. Gated on the
  // character actually having slayer levels. Most talents are `displayOnly`
  // with `changes: []` (sneak-attack/studied-target riders, activated
  // abilities, or scoped-target near misses — see that file's doc comment),
  // but Foil Scrutiny/Armored Marauder/Armored Swiftness carry a real
  // Change (the latter two conditional on `@armor.type`, not buff-gated).
  const slayerLevel = doc.identity.classes.find((c) => c.tag === "slayer")?.level ?? 0;
  if (slayerLevel > 0) {
    for (const talentId of doc.build.slayerTalents ?? []) {
      const talent = resolveSlayerTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- oracle's curse (build choice) ---------------------------------------
  // Curse ids are hand-authored clean-room content (not linked from the
  // vendored Oracle class def — see `@pf1/engine` `oracle-curses.ts`), same
  // posture as arcanist exploits above. Gated on the character actually
  // having oracle levels (a non-oracle with a stale `oracleCurse` field gets
  // nothing). Most base curses are `changes: []` (situational tiered
  // benefits, contextNotes only); only Wasting (-4 Cha-based skills) and Lame
  // (variable landSpeed penalty) carry a real unconditional Change today.
  const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
  if (oracleLevel > 0 && doc.build.oracleCurse) {
    const curse = ORACLE_CURSES[doc.build.oracleCurse];
    if (curse) {
      for (const ch of curse.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          curse.name,
          `curse:${curse.tag}`,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- feats -----------------------------------------------------------------
  // doc.build.feats holds feat ids (keys into RefData.feats). We resolve each id
  // to a name slug and look it up via resolveFeatEffect, which checks the
  // hand-verified FEAT_EFFECTS table first and falls back to the
  // machine-extracted FEAT_EFFECTS_EXTRACTED table (feat
  // batch-extraction pass — see feat-effects-resolve.ts for the precedence
  // rule and feat-classification.ts for the full per-feat audit).
  //   Static entries: emit their changes unconditionally.
  //   Choice entries: read doc.build.featChoices[featId]; if a choice is set,
  //     call entry.build(choiceId) and emit the resulting changes. If no choice
  //     is set yet, emit nothing — never crash on an incomplete doc.
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    const slug = featNameSlug(feat.name);
    const resolved = resolveFeatEffect(slug);
    const entry = resolved?.entry;

    if (entry?.type === "static") {
      for (const ch of entry.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          feat.name,
          featId,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    } else if (entry?.type === "choice") {
      // Choice-based feat: only emit changes when a choice has been stored.
      const choiceId = doc.build.featChoices?.[featId];
      if (choiceId) {
        for (const ch of entry.build(choiceId)) {
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            feat.name,
            featId,
            out,
            ch.operator,
            ch.saveCategories,
            ch.maneuverCategories,
            ch.acCategories,
          );
        }
      }
    }
    // Category-scoped save bonuses ride ALONGSIDE the resolved entry rather
    // than inside the precedence chain, which only ever yields one entry per
    // feat — see `feat-save-categories.ts`.
    for (const ch of FEAT_SAVE_CATEGORY_CHANGES[slug] ?? []) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        feat.name,
        featId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }

    // "situational" entries never live in FEAT_EFFECTS/FEAT_EFFECTS_EXTRACTED
    // (see SITUATIONAL_FEAT_EFFECTS in feat-effects.ts) — nothing to emit here.

    // Directly-authored changes (homebrew only — see `Feat.changes`'s doc
    // comment): applied unconditionally, alongside any table-resolved effect
    // above, never in place of it.
    for (const ch of feat.changes ?? []) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        feat.name,
        featId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- extra feat instances (RAW-repeatable feats) ---------------
  // Second-and-later copies of a feat already in `doc.build.feats` (Weapon
  // Focus taken again for a different weapon, Extra Rage taken again,...) —
  // see `apps/web/src/model/doc.ts` `addFeatInstance` and
  // `apps/web/src/model/repeatableFeats.ts`'s curated repeatable set. Applies
  // the identical static/choice resolution as the primary loop above, but
  // keyed by the instance's OWN choice (`extraFeats[i].choiceId`, never
  // `featChoices[featId]`) and stamped with the instance id as `sourceId` so
  // two instances of the same feat never collapse into one provenance entry.
  for (const instance of doc.build.extraFeats ?? []) {
    const feat = refData.feats[instance.featId];
    if (!feat) continue;
    const slug = featNameSlug(feat.name);
    const resolved = resolveFeatEffect(slug);
    const entry = resolved?.entry;

    if (entry?.type === "static") {
      for (const ch of entry.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          feat.name,
          instance.instanceId,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    } else if (entry?.type === "choice" && instance.choiceId) {
      for (const ch of entry.build(instance.choiceId)) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          feat.name,
          instance.instanceId,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }

    // Directly-authored changes (homebrew only — see `Feat.changes`'s doc
    // comment); same posture as the primary loop above.
    for (const ch of feat.changes ?? []) {
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        feat.name,
        instance.instanceId,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }

  // --- brawler Martial Flexibility (live state) ------------------
  // `doc.live.martialFlexibilityFeatId` (set by `model/martialFlexibility.ts`)
  // records which combat feat the player is currently "borrowing" (PF1 RAW:
  // move/swift/free/immediate action depending on brawler level, lasts 1
  // minute — see `resources.ts`'s vendored `martialFlexibility` pool for the
  // uses/day cap, not tracked here). Reuses the SAME `resolveFeatEffect`
  // machinery as a normally-owned feat — cheap because the lookup is already
  // keyed by feat id, not by "is this in doc.build.feats" — so any borrowed
  // feat with a modeled STATIC effect (Weapon Focus, Dodge, Toughness,...)
  // applies for real. Choice-type feats (e.g. Weapon Focus's weapon pick)
  // are deliberately skipped here: there is no separate "which weapon did
  // you pick for the borrowed copy" field, and reusing `featChoices[featId]`
  // could silently borrow the wrong stored choice from an unrelated owned
  // copy of the same feat — display + note is the honest behavior for that
  // subset (the UI still shows the borrowed feat's name/description).
  const martialFlexibilityFeatId = doc.live.martialFlexibilityFeatId;
  if (martialFlexibilityFeatId) {
    const feat = refData.feats[martialFlexibilityFeatId];
    if (feat) {
      const resolved = resolveFeatEffect(featNameSlug(feat.name));
      if (resolved?.entry.type === "static") {
        for (const ch of resolved.entry.changes) {
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            `${feat.name} (Martial Flexibility)`,
            `martialFlexibility:${martialFlexibilityFeatId}`,
            out,
          );
        }
      }
    }
  }

  // --- arcane bond: familiar master bonus ----------------------------------
  // A familiar grants its master a small always-on bonus (hand-authored table
  // in familiars.ts). Unknown kinds and bonded objects apply nothing — bonded
  // objects have no numeric effect in v1 (display-only RAW notes in the UI).
  // Skipped when a tracked familiar (`doc.build.familiar`) already exists: the
  // block below applies the identical per-species bonus from the same table,
  // and the builder UI now auto-creates the tracked familiar the moment
  // `arcaneBond.type` is set to "familiar" — so both fields being populated is
  // the normal case, not an edge case, and must not double-apply the bonus.
  const bond = doc.build.arcaneBond;
  if (bond?.type === "familiar" && bond.familiarKind && !doc.build.familiar) {
    const familiar = FAMILIARS[bond.familiarKind];
    if (familiar) {
      for (const ch of familiar.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${familiar.name} (familiar)`,
          `familiar:${bond.familiarKind}`,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }

  // --- tracked familiar (build.familiar): master bonus + Alertness --------
  // A tracked familiar (issue: familiar support — independent of the
  // Wizard-only `arcaneBond` field above; see CharacterDoc.build.familiar's
  // doc comment) grants its master the SAME published per-species bonus as
  // an arcane-bond familiar. Reuses the `FAMILIARS` table above rather than
  // duplicating the hand-authored data a second time — a familiar's master
  // bonus doesn't depend on which field granted the familiar. It also grants
  // the master the Alertness feat's benefit while in reach (PF1 RAW "familiar
  // basics"), gated on `live.familiarInReach` (default true) and using the
  // exact same untyped +2/+2 shape as the real Alertness feat entry in
  // `feat-effects.ts` (so a master who separately has BOTH stacks them — a
  // documented, accepted edge case; see the schema doc comment on
  // `live.familiarInReach`).
  const trackedFamiliar = doc.build.familiar;
  if (trackedFamiliar?.speciesId) {
    const familiarDef = FAMILIARS[trackedFamiliar.speciesId];
    if (familiarDef) {
      for (const ch of familiarDef.changes) {
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          `${familiarDef.name} (familiar: ${trackedFamiliar.name})`,
          `familiar:tracked:${trackedFamiliar.speciesId}`,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
    if (doc.live.familiarInReach ?? true) {
      out.push(
        {
          target: "skill.per",
          type: "untyped",
          value: 2,
          source: "Alertness (familiar in reach)",
          sourceId: "familiar-alertness",
        },
        {
          target: "skill.sen",
          type: "untyped",
          value: 2,
          source: "Alertness (familiar in reach)",
          sourceId: "familiar-alertness",
        },
      );
    }
  }

  // --- occultist implement resonant powers (live state) --------
  // `live.occultistFocusInvested[tag]` (set by `model/occultistImplements.ts`)
  // records how many of the day's Mental Focus points are currently divided
  // into each known implement (PF1 RAW "Mental Focus" — see that field's
  // schema doc comment). Only the FOUR resonant powers flagged
  // `appliesAsChange: true` in `OCCULTIST_SCHOOLS` (Abjuration/Divination/
  // Enchantment/Transmutation — see `occultist-implements.ts`'s doc comment
  // for exactly why the other four are situational/no-modelable-target and
  // stay display-only) are injected as real sheet Changes here; a school not
  // currently known (not in `build.occultistImplements`) or with 0 focus
  // invested contributes nothing (`computeBonus` already returns 0 below each
  // power's own investment threshold, e.g. Transmutation needs 3+).
  const occultistLevel = doc.identity.classes.find((c) => c.tag === "occultist")?.level ?? 0;
  if (occultistLevel > 0) {
    const knownSchools = new Set(doc.build.occultistImplements ?? []);
    for (const tag of knownSchools) {
      const school = OCCULTIST_SCHOOLS[tag];
      if (!school || !school.resonantPower.appliesAsChange) continue;
      const invested = doc.live.occultistFocusInvested?.[tag] ?? 0;
      const bonus = school.resonantPower.computeBonus(invested, occultistLevel);
      if (bonus <= 0) continue;
      const source = `${school.resonantPower.name} (${school.name} Resonant Power)`;
      const sourceId = `occultistResonant:${tag}`;
      if (tag === "abjuration") {
        out.push({ target: "allSavingThrows", type: "resistance", value: bonus, source, sourceId });
      } else if (tag === "divination") {
        out.push({ target: "skill.per", type: "insight", value: bonus, source, sourceId });
      } else if (tag === "enchantment") {
        for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
          if (ability !== "cha") continue;
          out.push({
            target: `skill.${skillId}`,
            type: "competence",
            value: bonus,
            source,
            sourceId,
          });
        }
      } else if (tag === "transmutation") {
        const ability = doc.live.occultistPhysicalEnhancementAbility ?? "str";
        out.push({ target: ability, type: "enhancement", value: bonus, source, sourceId });
      }
    }
  }

  // --- medium spirit bonus + séance boon (live state) ----------
  // `live.mediumSpirit` (set by `model/mediumSpirits.ts`'s séance picker)
  // names which of the 6 legendary spirits (`MEDIUM_SPIRITS`) is currently
  // channeled; while one is, the flat Spirit Bonus (scaling by medium level,
  // `mediumSpiritBonus`) and any flat Séance Boon apply as real untyped
  // `Change`s wherever the spirit's own `spiritBonusTargets`/
  // `seanceBoonChange` name a target this engine actually consumes — see
  // `medium-spirits.ts`'s file doc comment for the per-spirit audit of which
  // targets are real vs. prose-only. `abilitySkills` targets fan out to one
  // `skill.<id>` Change per skill keyed to that ability (same pattern as the
  // occultist Enchantment resonant power just above), since no `chaSkills`-
  // style group target is actually consumed by `compute.ts`.
  const mediumLevel = doc.identity.classes.find((c) => c.tag === "medium")?.level ?? 0;
  if (mediumLevel > 0 && doc.live.mediumSpirit) {
    const spirit = MEDIUM_SPIRITS[doc.live.mediumSpirit];
    if (spirit) {
      const bonus = mediumSpiritBonus(mediumLevel);
      const bonusSource = `Spirit Bonus (${spirit.name} Spirit)`;
      const bonusSourceId = `mediumSpiritBonus:${spirit.tag}`;
      for (const t of spirit.spiritBonusTargets) {
        if (t.kind === "flat") {
          out.push({
            target: t.target,
            type: "untyped",
            value: bonus,
            source: bonusSource,
            sourceId: bonusSourceId,
          });
        } else {
          for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
            if (ability !== t.ability) continue;
            out.push({
              target: `skill.${skillId}`,
              type: "untyped",
              value: bonus,
              source: bonusSource,
              sourceId: bonusSourceId,
            });
          }
        }
      }

      // Spirit Focus (community pack): "Select a legend of spirits. Your
      // spirit bonus from spirits of that legend increases by 1." The feat's
      // own choice axis (feat-effects-extracted-community.ts) has no
      // build()-time access to `live.mediumSpirit`, so the match against the
      // CURRENTLY channeled spirit is checked here instead — +1 on the same
      // targets as the Spirit Bonus above, only when the chosen legend is the
      // one actually channeled.
      const spiritFocusFeatId = (doc.build.feats ?? []).find(
        (id) => featNameSlug(refData.feats[id]?.name ?? "") === "spirit-focus",
      );
      if (spiritFocusFeatId && doc.build.featChoices?.[spiritFocusFeatId] === spirit.tag) {
        const focusSource = `Spirit Focus (${spirit.name} Spirit)`;
        const focusSourceId = `spiritFocus:${spirit.tag}`;
        for (const t of spirit.spiritBonusTargets) {
          if (t.kind === "flat") {
            out.push({
              target: t.target,
              type: "untyped",
              value: 1,
              source: focusSource,
              sourceId: focusSourceId,
            });
          } else {
            for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
              if (ability !== t.ability) continue;
              out.push({
                target: `skill.${skillId}`,
                type: "untyped",
                value: 1,
                source: focusSource,
                sourceId: focusSourceId,
              });
            }
          }
        }
      }

      if (spirit.seanceBoonChange) {
        out.push({
          target: spirit.seanceBoonChange.target,
          type: "untyped",
          value: spirit.seanceBoonChange.value,
          source: `Séance Boon (${spirit.name} Spirit)`,
          sourceId: `mediumSeanceBoon:${spirit.tag}`,
        });
      }
    }
  }

  // --- active polymorph form (live state) ----------------------
  // `live.activeForm` (set by `model/polymorph.ts` — Wild Shape or a Beast
  // Shape/Elemental Body/Plant Shape spell) records the player's chosen
  // tier + creature type/size/element; the ability-score and natural-armor
  // adjustments for that specific row (`@pf1/engine` `polymorphFormOption`)
  // are injected here as ordinary `str`/`dex`/`con`/`nac` modifiers so they
  // ride the SAME typed-bonus stacker as every other ability/AC source — see
  // `polymorph.ts`'s file doc comment for why "size" and "base" (natural
  // armor) are the correct RAW types to reuse here, rather than a bespoke
  // polymorph-only stacking rule. An unresolved tier/creatureType/size/
  // element combination (stale, or simply never valid) contributes nothing,
  // same soft posture as every other live-state lookup above. The form's
  // SIZE itself (independent of whether this lookup resolves) is applied
  // directly by `compute.ts`, which overrides the size-ladder size outright.
  const activeForm = doc.live.activeForm;
  if (activeForm) {
    const option = polymorphFormOption(
      activeForm.tier,
      activeForm.creatureType,
      activeForm.size,
      activeForm.element,
    );
    if (option) {
      const source = `${activeForm.formName} (form)`;
      for (const adj of option.abilityAdjustments) {
        out.push({
          target: adj.ability,
          type: adj.type,
          value: adj.value,
          source,
          sourceId: "activeForm",
        });
      }
      if (option.naturalArmor) {
        out.push({
          target: "nac",
          type: "base",
          value: option.naturalArmor,
          source,
          sourceId: "activeForm",
        });
      }
    }
  }

  // --- level-up ability score increases -----------------------------------
  // Defensive cap: if level dropped after choices were made, don't over-apply.
  const allowed = Math.floor(totalLevel(doc) / 4);
  const increases = (doc.build.abilityIncreases ?? []).slice(0, allowed);
  for (const ability of increases) {
    out.push({
      target: ability,
      type: "untyped",
      value: 1,
      source: "Level-up increase",
      sourceId: "ability-increase",
    });
  }

  // --- ability damage / drain / penalty (live state) -----------
  // Drain actually lowers the ability's effective score: a plain penalty on
  // the ability's own target, same as any other ability-targeting change.
  for (const [ability, points] of Object.entries(doc.live.abilityDrain ?? {})) {
    if (!points) continue;
    out.push({
      target: ability,
      type: "drain",
      value: -points,
      source: "Ability drain",
      sourceId: "ability-drain",
    });
  }
  // Damage/penalty must NOT lower the score, only the derived modifier, by
  // exactly floor(points/2). Subtracting 2*floor(points/2) (always even) from
  // the ability's total shifts `abilityMod = floor((total-10)/2)` down by
  // exactly floor(points/2) regardless of the total's parity, since
  // floor((x - 2k)/2) === floor(x/2) - k for any integer k. This does mean
  // `AbilityScore.total` visibly drops by an even number even though RAW says
  // the score itself is untouched — a deliberate, documented display
  // simplification (see CharacterDoc.live.abilityDamage doc comment) rather
  // than adding a parallel "modifier-only" adjustment path to computeAbilities.
  for (const [ability, points] of Object.entries(doc.live.abilityDamage ?? {})) {
    if (!points) continue;
    const evenPoints = 2 * Math.floor(points / 2);
    if (evenPoints === 0) continue;
    out.push({
      target: ability,
      type: "damage",
      value: -evenPoints,
      source: "Ability damage",
      sourceId: "ability-damage",
    });
  }
  for (const [ability, points] of Object.entries(doc.live.abilityPenalty ?? {})) {
    if (!points) continue;
    const evenPoints = 2 * Math.floor(points / 2);
    if (evenPoints === 0) continue;
    out.push({
      target: ability,
      type: "penalty",
      value: -evenPoints,
      source: "Ability penalty",
      sourceId: "ability-penalty",
    });
  }

  // --- negative levels (live state) -----------------------------
  // Each negative level (temporary + permanent combined): -1 attack, -1 all
  // saves, -1 skill checks, -5 max HP. Injected as synthetic untyped penalties
  // through the same `attack`/`allSavingThrows`/`skills`/`hp` targets that
  // conditions and buffs already use, so no new consumer wiring is needed.
  // Ability-check and caster-level penalties are documented gaps — see the
  // `negativeLevels` doc comment on CharacterDoc.live.
  const negLevels = doc.live.negativeLevels;
  const totalNegLevels = (negLevels?.temporary ?? 0) + (negLevels?.permanent ?? 0);
  if (totalNegLevels > 0) {
    for (const target of ["attack", "allSavingThrows", "skills"]) {
      out.push({
        target,
        type: "untyped",
        value: -totalNegLevels,
        source: "Negative levels",
        sourceId: "negative-levels",
      });
    }
    out.push({
      target: "hp",
      type: "untyped",
      value: -5 * totalNegLevels,
      source: "Negative levels",
      sourceId: "negative-levels",
    });
  }

  return out;
}

/**
 * Filter collected modifiers down to a single target. Returns the full
 * {@link CollectedModifier} (not just {@link TypedModifier}) so callers that
 * need to branch on `operator` (e.g. speed set-changes in compute.ts) can —
 * it's still assignable wherever a `TypedModifier[]` is expected.
 */
export function forTarget(mods: CollectedModifier[], target: string): CollectedModifier[] {
  return mods.filter((m) => m.target === target);
}

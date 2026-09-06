/**
 * Racial changes: the race's own changes plus alternate racial traits,
 * vendored racial-trait catalog entries, and the note-derived save / maneuver /
 * AC / caster-level-check riders those tables carry.
 */
import { standardRaceAcChanges } from "../race-ac-notes.js";
import { standardRaceManeuverChanges } from "../race-maneuver-notes.js";
import { standardRaceSaveChanges } from "../race-save-notes.js";
import { acChangesFromNotes, VENDORED_RACIAL_TRAIT_AC_NOTES } from "../vendored-trait-ac-notes.js";
import {
  saveChangesFromNotes,
  VENDORED_RACIAL_TRAIT_SAVE_NOTES,
} from "../vendored-trait-save-notes.js";
import {
  maneuverChangesFromNotes,
  VENDORED_RACIAL_TRAIT_MANEUVER_NOTES,
} from "../vendored-trait-maneuver-notes.js";
import {
  clCheckChangesFromNotes,
  VENDORED_RACIAL_TRAIT_CL_CHECK_NOTES,
} from "../vendored-trait-cl-check-notes.js";
import {
  effectiveRaceContextNotes,
  FLEXIBLE_ABILITY_SUPPRESS_TARGET,
  RACIAL_TRAITS,
  vendoredTraitSuppressTargets,
} from "../racial-traits.js";
import { RACIAL_TRAIT_CHOICES } from "../racial-trait-choices.js";
import { raceGrantsFlexibleAbility } from "../tables.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Race, alternate racial traits, and vendored racial-trait changes. */
export function collectRace(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
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
}

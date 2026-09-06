/**
 * Character traits and homebrew abilities — both hand-authored build choices
 * that carry raw changes.
 */
import {
  acChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_AC_NOTES,
} from "../vendored-trait-ac-notes.js";
import {
  saveChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_SAVE_NOTES,
} from "../vendored-trait-save-notes.js";
import {
  maneuverChangesFromNotes,
  VENDORED_CHARACTER_TRAIT_MANEUVER_NOTES,
} from "../vendored-trait-maneuver-notes.js";
import { TRAIT_CHOICES } from "../trait-effects-extracted.js";
import { resolveTraitDef } from "../traits.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Character traits (build choice). */
export function collectTraits(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
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
}

/** Homebrew abilities (`build.homebrew.classFeatures`). */
export function collectHomebrewAbilities(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
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
}

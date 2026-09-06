/**
 * Feats: the build's feat list, RAW-repeatable extra feat instances, and the
 * brawler's live Martial Flexibility pick.
 */
import { FEAT_SAVE_CATEGORY_CHANGES } from "../feat-save-categories.js";
import { featNameSlug } from "../feat-effects.js";
import { resolveFeatEffect } from "../feat-effects-resolve.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Feats (build choice). */
export function collectFeats(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // doc.build.feats holds feat ids (keys into RefData.feats). We resolve each id
  // to a name slug and look it up via resolveFeatEffect, which checks the
  // hand-verified FEAT_EFFECTS table first and falls back to the
  // machine-extracted FEAT_EFFECTS_EXTRACTED table (feat
  // batch-extraction pass — see feat-effects-resolve.ts for the precedence
  // rule and feat-classification.ts for the full per-feat audit).
  //   Static entries: emit their changes when any optional live-buff gate is open.
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
        if (!gateOpen(ch)) continue;
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
          if (!gateOpen(ch)) continue;
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
}

/** Extra feat instances (RAW-repeatable feats). */
export function collectExtraFeatInstances(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
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
        if (!gateOpen(ch)) continue;
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
        if (!gateOpen(ch)) continue;
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
}

/** Brawler Martial Flexibility (live state). */
export function collectMartialFlexibility(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
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
          if (!gateOpen(ch)) continue;
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
}

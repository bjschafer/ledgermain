/**
 * Bloodline-shaped build choices: sorcerer bloodline arcana and powers,
 * bloodrager bloodline powers, and psychic discipline powers.
 */
import { resolveSorcererBloodlineOrMutation } from "../bloodline-mutations.js";
import { BLOODRAGER_BLOODLINES } from "../bloodrager-bloodlines.js";
import { PSYCHIC_DISCIPLINES } from "../psychic-disciplines.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Sorcerer bloodline arcana + powers (build choice). */
export function collectSorcererBloodline(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
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
}

/** Bloodrager bloodline powers (build choice). */
export function collectBloodragerBloodline(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
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
}

/** Psychic discipline powers (build choice). */
export function collectPsychicDiscipline(ctx: CollectContext): void {
  const { doc, rollData, out, gateOpen } = ctx;
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
}

/**
 * Bloodline-shaped grants: sorcerer and bloodrager bloodline powers, and the
 * psychic's discipline powers and phrenic amplifications.
 */
import { resolveSorcererBloodlineOrMutation } from "../bloodline-mutations.js";
import { BLOODRAGER_BLOODLINES } from "../bloodrager-bloodlines.js";
import { resolvePhrenicAmplification } from "../phrenic-amplifications.js";
import { PSYCHIC_DISCIPLINES } from "../psychic-disciplines.js";
import { type GrantedFeaturesContext } from "./shared.js";

/** Sorcerer bloodline powers. */
export function collectSorcererBloodlinePowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Sorcerer bloodline powers — hand-authored (see bloodlines.ts), gated on
  // actual sorcerer levels the same way domain/school grants are gated on
  // cleric/wizard levels above. A non-sorcerer with a stale
  // `sorcererBloodline` field (or an unresolvable bloodline tag) gets nothing.
  // `doc.build.sorcererBloodline` may name a base bloodline OR a wildblooded
  // mutation id (`resolveSorcererBloodlineOrMutation` resolves either) — the
  // merged entry already carries the parent's kept powers plus the
  // mutation's swapped-in ones (see `bloodline-mutations.ts`).
  const sorcererLevel = doc.identity.classes.find((c) => c.tag === "sorcerer")?.level ?? 0;
  if (sorcererLevel > 0 && doc.build.sorcererBloodline) {
    const bloodline = resolveSorcererBloodlineOrMutation(doc.build.sorcererBloodline, refData);
    if (bloodline && !bloodline.displayOnly) {
      for (const power of bloodline.powers) {
        if (power.level > sorcererLevel) continue;
        out.push({
          classTag: "sorcerer",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `bloodline:${bloodline.tag}:${power.id}`,
            featureId: `bloodline:${bloodline.tag}:${power.id}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "bloodline", label: `${bloodline.name} Bloodline` },
          detail: power.resourcePool?.detail,
          resourcePool: power.resourcePool,
          contextNotes: power.contextNotes,
        });
      }
    }
  }
}

/** Bloodrager bloodline powers. */
export function collectBloodragerBloodlinePowers(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // Bloodrager bloodline powers — hand-authored (see
  // bloodrager-bloodlines.ts), gated on actual bloodrager levels the same way
  // sorcerer bloodline powers are gated above (each power at its own
  // 1st/4th/8th/12th/16th/20th level gate). A non-bloodrager with a stale
  // `bloodragerBloodline` field (or an unresolvable bloodline tag) gets
  // nothing.
  const bloodragerLevel = doc.identity.classes.find((c) => c.tag === "bloodrager")?.level ?? 0;
  if (bloodragerLevel > 0 && doc.build.bloodragerBloodline) {
    const bloodline = BLOODRAGER_BLOODLINES[doc.build.bloodragerBloodline];
    if (bloodline) {
      for (const power of bloodline.powers) {
        if (power.level > bloodragerLevel) continue;
        out.push({
          classTag: "bloodrager",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `bloodragerBloodline:${bloodline.tag}:${power.id}`,
            featureId: `bloodragerBloodline:${bloodline.tag}:${power.id}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "bloodline", label: `${bloodline.name} Bloodline` },
          detail: power.resourcePool?.detail,
          resourcePool: power.resourcePool,
          contextNotes: power.contextNotes,
        });
      }
    }
  }
}

/** Psychic discipline powers and phrenic amplifications. */
export function collectPsychicDisciplinePowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Psychic discipline powers — hand-authored (see psychic-disciplines.ts's
  // `powers` field), gated on actual psychic levels AND a chosen discipline,
  // same shape as shaman spirit ability above: automatically granted (not a
  // budgeted pick) at each power's own 1st/5th/13th-level gate. A non-psychic
  // or unresolvable discipline tag gets nothing.
  const psychicLevel = doc.identity.classes.find((c) => c.tag === "psychic")?.level ?? 0;
  if (psychicLevel > 0 && doc.build.psychicDiscipline) {
    const discipline = PSYCHIC_DISCIPLINES[doc.build.psychicDiscipline];
    if (discipline) {
      for (const power of discipline.powers) {
        if (power.level > psychicLevel) continue;
        out.push({
          classTag: "psychic",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `discipline:${discipline.tag}:${power.name}`,
            featureId: `discipline:${discipline.tag}:${power.name}`,
            name: power.name,
            resolved: true,
          },
          origin: { kind: "discipline", label: `${discipline.name} Discipline` },
          detail: power.summary,
        });
      }
    }
  }

  // Phrenic amplifications — hand-authored (see phrenic-amplifications.ts),
  // gated on actual psychic levels the same way magus arcana is gated above.
  // Granted at a flat display level of 1, same rationale as exploits/arcana
  // above.
  if (psychicLevel > 0) {
    for (const amplificationId of doc.build.psychicAmplifications ?? []) {
      const amp = resolvePhrenicAmplification(amplificationId, refData);
      if (!amp) continue;
      out.push({
        classTag: "psychic",
        level: 1,
        grant: {
          level: 1,
          uuid: `amplification:${amp.id}`,
          featureId: `amplification:${amp.id}`,
          name: amp.name,
          resolved: true,
        },
        origin: { kind: "amplification", label: "Phrenic Amplification" },
        detail: `${amp.costLabel} — ${amp.summary}`,
      });
    }
  }
}

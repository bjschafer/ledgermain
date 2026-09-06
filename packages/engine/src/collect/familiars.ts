/**
 * Familiar-granted master bonuses, from either an untracked arcane bond or a
 * tracked familiar.
 */
import { FAMILIARS } from "../familiars.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Arcane bond: familiar master bonus. */
export function collectArcaneBondFamiliar(ctx: CollectContext): void {
  const { doc, rollData, out } = ctx;
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
}

/** Tracked familiar (`build.familiar`): master bonus + Alertness. */
export function collectTrackedFamiliar(ctx: CollectContext): void {
  const { doc, rollData, out } = ctx;
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
}

/**
 * Special-sense derivation (darkvision, low-light vision, scent, …),
 * display-only — nothing here feeds back into any other number on the sheet.
 *
 * Sources all flow in through the same `collectModifiers` pipeline as every
 * other change target (race / alternate racial trait / item / class feature /
 * buff — see `collect.ts`). The vendored slice already carries `sensedv`,
 * `sensesc`, `sensets` and `sensebse` changes on 20 alternate racial traits
 * and 11 buffs (Darkvision, Darkvision Greater, Animal Focus (Bat), …); race
 * entries carry their senses as description prose only, mechanized by the
 * data-pipeline's `SUPPLEMENTAL_RACE_SENSES` table.
 *
 * Two targets here are this engine's own convention rather than Foundry's,
 * because the fields they write are booleans in Foundry's actor model and so
 * have no `change` target upstream at all (`pf1.config.buffTargets` has no
 * entry for either):
 *
 *   - `sensell` — low-light vision (`traits.senses.ll.enabled`)
 *   - `sensesid` — see in darkness (`traits.senses.sid`)
 *
 * Both are treated as flags: any source evaluating > 0 turns them on. Same
 * posture as the `dr.<bypass>` / `eres.<energy>` prefixes in `defenses.ts`,
 * which are likewise this engine's vocabulary so a user-authored buff can
 * grant something Foundry only models as actor state.
 *
 * PF1 rule reused for resolution: senses of the same kind DON'T stack — a
 * dwarf (darkvision 60 ft.) under a *darkvision, greater* spell (120 ft.)
 * sees 120 ft., not 180. So the single longest-range source wins and the rest
 * are kept, unapplied, for provenance. That is why this can't be routed
 * through `resolveStack` (whose "untyped always sums" behavior is right for
 * ability/skill bonuses and wrong here), and it is also why every vendored
 * sense change uses Foundry's `operator: "set"`: the operator is redundant
 * for this target family, so it is deliberately ignored — a plain additive
 * `sensedv` change is resolved exactly like a `set` one rather than stacking
 * on top of the winner.
 *
 * Zero-value entries are dropped, same guard as `defenses.ts`: a conditional
 * formula (Animal Focus (Bat)'s `if(gte(@item.level, 15), 10)` blindsense
 * evaluates to 0 below 15th level) must not materialize a "Blindsense 0 ft."
 * line just because it was collected.
 */

import type { DerivedSense, ModifierComponent, SenseKind } from "@pf1/schema";

import type { CollectedModifier } from "./collect.js";

interface SenseDef {
  kind: SenseKind;
  label: string;
  /** Rangeless on/off senses render as a bare label, no distance. */
  flag?: true;
}

/**
 * Change target → sense, in display order. Keys are Foundry's
 * `pf1.config.buffTargets` sense ids, except `sensell`/`sensesid` (see the
 * module doc comment).
 */
const SENSE_TARGETS: Record<string, SenseDef> = {
  sensedv: { kind: "darkvision", label: "Darkvision" },
  sensell: { kind: "lowLight", label: "Low-light vision", flag: true },
  sensesid: { kind: "seeInDarkness", label: "See in darkness", flag: true },
  sensebs: { kind: "blindsight", label: "Blindsight" },
  sensebse: { kind: "blindsense", label: "Blindsense" },
  sensets: { kind: "tremorsense", label: "Tremorsense" },
  sensesc: { kind: "scent", label: "Scent" },
  sensels: { kind: "lifesense", label: "Lifesense" },
  sensetr: { kind: "trueSeeing", label: "True seeing" },
  senseths: { kind: "thoughtsense", label: "Thoughtsense" },
};

/** Every change target this module consumes (used by `targets.ts`). */
export const SENSE_TARGET_IDS: readonly string[] = Object.keys(SENSE_TARGETS);

/** True if `target` grants a special sense. */
export function isSenseTarget(target: string): boolean {
  return target in SENSE_TARGETS;
}

/**
 * Derives the display-only sense lines. Returns `[]` when nothing grants a
 * sense — the UI renders no "Senses" row at all rather than an empty one.
 */
export function computeSenses(collected: CollectedModifier[]): DerivedSense[] {
  const byTarget = new Map<string, CollectedModifier[]>();
  for (const m of collected) {
    if (!isSenseTarget(m.target)) continue;
    const list = byTarget.get(m.target);
    if (list) list.push(m);
    else byTarget.set(m.target, [m]);
  }

  const senses: DerivedSense[] = [];
  for (const [target, def] of Object.entries(SENSE_TARGETS)) {
    const mods = byTarget.get(target);
    if (!mods) continue;

    let bestIdx = 0;
    for (let i = 1; i < mods.length; i++) {
      if (mods[i]!.value > mods[bestIdx]!.value) bestIdx = i;
    }
    if (mods[bestIdx]!.value <= 0) continue;

    const components: ModifierComponent[] = mods.map((m, i) => ({
      source: m.source,
      sourceId: m.sourceId,
      type: m.type,
      value: m.value,
      applied: i === bestIdx,
    }));
    senses.push({
      kind: def.kind,
      label: def.label,
      range: def.flag ? undefined : mods[bestIdx]!.value,
      components,
    });
  }
  return senses;
}

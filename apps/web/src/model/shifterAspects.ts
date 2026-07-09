/**
 * Pure shifter-aspect transitions (issue #65): the build-time pick
 * (`build.shifterAspects`, mirroring `toggleAlchemistDiscovery`) plus a
 * live minor-form buff toggle (mirroring `toggleLinkedBuff` in
 * `model/buffs.ts` — same "activate/deactivate a well-known buff" shape),
 * built directly from `@pf1/engine` `SHIFTER_ASPECTS` rather than routed
 * through a resource pool's `linkedBuffIds`, since there is no vendored
 * `RefData.buffs` entry to link (see that table's doc comment — aspects
 * aren't part of the Foundry data pack at all). Synthetic buff id
 * `shifter-aspect:<aspectId>` keeps this toggle's "active" instance
 * findable without colliding with any real `RefData.buffs` key.
 *
 * Budget (PF1 Blood of the Beast, verified against the class table): a
 * shifter knows her first aspect at 1st level, a 2nd at 5th, a 3rd at 10th,
 * a 4th at 15th, and a 5th at 20th (via the Final Aspect class feature).
 * This module never blocks: taking more than the expected count is a soft
 * warning only, matching the project's hybrid posture on feat/trait/skill
 * budgets.
 */

import { SHIFTER_ASPECTS } from "@pf1/engine";
import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import { localId } from "./ids.js";

const BUFF_ID_PREFIX = "shifter-aspect:";

/** The shifter's class level (0 for a non-shifter, or a stale/multiclassed doc). */
export function shifterLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "shifter")?.level ?? 0;
}

export function hasShifterAspect(doc: CharacterDoc, id: string): boolean {
  return (doc.build.shifterAspects ?? []).includes(id);
}

/**
 * Add or remove a known aspect id. No-op add if already present. Removing a
 * known aspect also deactivates its minor-form buff if currently toggled on
 * (an unknown aspect can't have an active minor form).
 */
export function toggleShifterAspect(doc: CharacterDoc, aspectId: string): CharacterDoc {
  const current = doc.build.shifterAspects ?? [];
  const has = current.includes(aspectId);
  const shifterAspects = has ? current.filter((a) => a !== aspectId) : [...current, aspectId];
  const next: CharacterDoc = { ...doc, build: { ...doc.build, shifterAspects } };
  return has ? deactivateAspectMinorForm(next, aspectId) : next;
}

/** The number of aspects currently known. */
export function chosenShifterAspectCount(doc: CharacterDoc): number {
  return (doc.build.shifterAspects ?? []).length;
}

/**
 * Base Blood of the Beast progression: 1 aspect at 1st level, 2 at 5th, 3 at
 * 10th, 4 at 15th, 5 at 20th (Final Aspect). Returns 0 for a non-shifter
 * (level 0).
 */
export function expectedShifterAspectCount(doc: CharacterDoc): number {
  const level = shifterLevel(doc);
  if (level <= 0) return 0;
  let count = 1;
  if (level >= 5) count++;
  if (level >= 10) count++;
  if (level >= 15) count++;
  if (level >= 20) count++;
  return count;
}

/**
 * True when the chosen aspects should prompt a soft warning: more than the
 * expected count. Never used to block — only to color the count badge (see
 * `alchemistDiscoveriesNeedWarning` for the identical pattern).
 */
export function shifterAspectsNeedWarning(doc: CharacterDoc): boolean {
  return chosenShifterAspectCount(doc) > expectedShifterAspectCount(doc);
}

/* --------------------------------------------------- minor-form buff toggle */

function activeAspectBuff(doc: CharacterDoc, aspectId: string): ActiveBuff | undefined {
  return doc.live.activeBuffs.find((b) => b.buffId === `${BUFF_ID_PREFIX}${aspectId}`);
}

export function isAspectMinorFormActive(doc: CharacterDoc, aspectId: string): boolean {
  return activeAspectBuff(doc, aspectId) !== undefined;
}

/** Toggle an aspect's minor form on/off. No-op if the aspect id isn't in `SHIFTER_ASPECTS`. */
export function toggleAspectMinorForm(doc: CharacterDoc, aspectId: string): CharacterDoc {
  const active = activeAspectBuff(doc, aspectId);
  if (active) {
    return {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: doc.live.activeBuffs.filter((b) => b.instanceId !== active.instanceId),
      },
    };
  }
  const aspect = SHIFTER_ASPECTS[aspectId];
  if (!aspect) return doc;
  const buff: ActiveBuff = {
    instanceId: localId("buff-"),
    buffId: `${BUFF_ID_PREFIX}${aspectId}`,
    name: `${aspect.name} (minor form)`,
    changes: aspect.minorFormChanges.map((c) => ({ ...c })),
    contextNotes: aspect.contextNotes?.map((n) => ({ ...n })),
  };
  return { ...doc, live: { ...doc.live, activeBuffs: [...doc.live.activeBuffs, buff] } };
}

function deactivateAspectMinorForm(doc: CharacterDoc, aspectId: string): CharacterDoc {
  const active = activeAspectBuff(doc, aspectId);
  if (!active) return doc;
  return {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: doc.live.activeBuffs.filter((b) => b.instanceId !== active.instanceId),
    },
  };
}

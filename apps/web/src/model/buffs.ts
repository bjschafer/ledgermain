/**
 * Pure buff transitions for the live tracker. A buff snapshot (its `changes`) is
 * copied onto the document so it is self-contained; the engine evaluates it
 * exactly like any other typed-modifier source. Round-advance delegates to the
 * engine's pure `advanceRounds` so duration logic has one home.
 */

import { advanceRounds } from "@pf1/engine";
import type { ActiveBuff, Buff, Change, CharacterDoc, ContextNote } from "@pf1/schema";

let counter = 0;
/** Stable-ish id without requiring crypto in every environment. */
function newInstanceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  counter += 1;
  return `buff-${Date.now()}-${counter}`;
}

export interface BuffOptions {
  instanceId?: string;
  casterLevel?: number;
  remainingRounds?: number;
}

/** Build an {@link ActiveBuff} from a reference-data buff, snapshotting its changes. */
export function makeActiveBuff(buff: Buff, opts: BuffOptions = {}): ActiveBuff {
  return {
    instanceId: opts.instanceId ?? newInstanceId(),
    buffId: buff.id,
    name: buff.name,
    changes: buff.changes.map((c) => ({ ...c })),
    contextNotes: buff.contextNotes?.map((n) => ({ ...n })),
    casterLevel: opts.casterLevel,
    remainingRounds: opts.remainingRounds,
  };
}

/** Build a user-authored buff — the "expert flexibility" door (same Change shape). */
export function makeCustomBuff(
  name: string,
  changes: Change[],
  opts: BuffOptions & { contextNotes?: ContextNote[] } = {},
): ActiveBuff {
  return {
    instanceId: opts.instanceId ?? newInstanceId(),
    name: name.trim() || "Custom buff",
    changes: changes.map((c) => ({ ...c })),
    contextNotes: opts.contextNotes,
    casterLevel: opts.casterLevel,
    remainingRounds: opts.remainingRounds,
  };
}

export function addBuff(doc: CharacterDoc, buff: ActiveBuff): CharacterDoc {
  return { ...doc, live: { ...doc.live, activeBuffs: [...doc.live.activeBuffs, buff] } };
}

export function removeBuff(doc: CharacterDoc, instanceId: string): CharacterDoc {
  return {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: doc.live.activeBuffs.filter((b) => b.instanceId !== instanceId),
    },
  };
}

/** Set (or clear, with `undefined`) the remaining rounds of an active buff. */
export function setBuffRounds(
  doc: CharacterDoc,
  instanceId: string,
  rounds: number | undefined,
): CharacterDoc {
  const remainingRounds =
    rounds === undefined || Number.isNaN(rounds) ? undefined : Math.max(0, Math.trunc(rounds));
  return {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: doc.live.activeBuffs.map((b) =>
        b.instanceId === instanceId ? { ...b, remainingRounds } : b,
      ),
    },
  };
}

export interface AdvanceRoundResult {
  doc: CharacterDoc;
  expired: ActiveBuff[];
}

/** Advance the round clock: tick durations and auto-drop expired buffs. */
export function advanceRound(doc: CharacterDoc, rounds = 1): AdvanceRoundResult {
  const { buffs, expired } = advanceRounds(doc.live.activeBuffs, rounds);
  return { doc: { ...doc, live: { ...doc.live, activeBuffs: buffs } }, expired };
}

/**
 * Suggest a round duration for a reference buff at a given caster level, from its
 * structured duration. Best-effort: covers the common round/minute/hour /level
 * patterns; the UI lets the user override. `undefined` = indefinite.
 */
export function suggestRounds(buff: Buff, casterLevel: number): number | undefined {
  const d = buff.duration;
  if (!d?.units) return undefined;
  const perLevel = /@item\.level/.test(d.value ?? "");
  const literal = Number(d.value);
  const base = perLevel ? Math.max(1, casterLevel) : Number.isFinite(literal) ? literal : 1;
  switch (d.units) {
    case "round":
      return base;
    case "minute":
      return base * 10;
    case "hour":
      return base * 600;
    default:
      return undefined; // permanent / special
  }
}

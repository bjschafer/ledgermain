/**
 * Saved rolls (issue #2): a static, no-dice-roller lookup surface. A `SavedRoll`
 * is just a bookmark — `{ label, source }` — into a number the engine already
 * computes. Nothing is snapshotted; `resolveSavedRoll` re-reads the current
 * `DerivedSheet` every time, so a saved roll stays correct as buffs/feats/gear
 * change (same "recompute, don't memoize" posture as the rest of the tracker).
 */

import type { CharacterDoc, DerivedSheet, ModifierComponent, SavedRoll, SavedRollSource } from "@pf1/schema";

import { SAVE_NAMES, signed, signedSequence, skillName } from "./names.js";

let counter = 0;
/** Stable-ish id without requiring crypto in every environment (mirrors model/buffs.ts). */
function newSavedRollId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  counter += 1;
  return `roll-${Date.now()}-${counter}`;
}

/** One pickable thing a saved roll can point at, for the "add" picker. */
export interface SavedRollOption {
  source: SavedRollSource;
  /** Default label, used to seed the roll's editable `label` at add-time. */
  label: string;
}

/**
 * Every source currently pickable from the sheet: base melee/ranged, each
 * per-weapon attack line, CMB/CMD, initiative, the three saves, and every
 * usable skill. Options with no live counterpart (e.g. a since-removed
 * weapon) simply don't appear here — they're still resolvable-but-missing on
 * an already-saved roll via {@link resolveSavedRoll}.
 */
export function availableSavedRollSources(sheet: DerivedSheet): SavedRollOption[] {
  const out: SavedRollOption[] = [
    { source: { kind: "melee" }, label: "Melee Attack" },
    { source: { kind: "ranged" }, label: "Ranged Attack" },
  ];
  for (const atk of sheet.attacks) {
    out.push({ source: { kind: "weapon", weaponName: atk.name }, label: `${atk.name} (attack)` });
  }
  out.push({ source: { kind: "cmb" }, label: "CMB" });
  out.push({ source: { kind: "cmd" }, label: "CMD" });
  out.push({ source: { kind: "initiative" }, label: "Initiative" });
  for (const save of ["fort", "ref", "will"] as const) {
    out.push({ source: { kind: "save", save }, label: `${SAVE_NAMES[save]} Save` });
  }
  for (const s of Object.values(sheet.skills)) {
    if (!s.usable) continue;
    out.push({ source: { kind: "skill", skillId: s.id }, label: skillName(s.id) });
  }
  return out;
}

/** A saved roll resolved against the current sheet, ready to display. */
export interface ResolvedSavedRoll {
  id: string;
  label: string;
  /** e.g. "+11/+6" for an iterative attack, "+8" for a flat stat. */
  display: string;
  components: ModifierComponent[];
  /** True when the source no longer resolves (e.g. the referenced weapon was removed). */
  missing: boolean;
}

/** Resolve one saved roll's current value + provenance from the live sheet. */
export function resolveSavedRoll(roll: SavedRoll, sheet: DerivedSheet): ResolvedSavedRoll {
  const resolved = resolveSource(roll.source, sheet);
  if (!resolved) {
    return { id: roll.id, label: roll.label, display: "—", components: [], missing: true };
  }
  return { id: roll.id, label: roll.label, ...resolved, missing: false };
}

function resolveSource(
  source: SavedRollSource,
  sheet: DerivedSheet,
): { display: string; components: ModifierComponent[] } | null {
  switch (source.kind) {
    case "melee":
      return {
        display: signedSequence(sheet.attack.melee.total, sheet.attack.melee.iteratives),
        components: sheet.attack.melee.components,
      };
    case "ranged":
      return {
        display: signedSequence(sheet.attack.ranged.total, sheet.attack.ranged.iteratives),
        components: sheet.attack.ranged.components,
      };
    case "weapon": {
      const atk = sheet.attacks.find((a) => a.name === source.weaponName);
      if (!atk) return null;
      return {
        display: signedSequence(atk.attack.total, atk.attack.iteratives),
        components: atk.attack.components,
      };
    }
    case "cmb":
      return { display: signed(sheet.cmb), components: [] };
    case "cmd":
      return { display: String(sheet.cmd), components: [] };
    case "initiative":
      return { display: signed(sheet.initiative.total), components: sheet.initiative.components };
    case "save":
      return {
        display: signed(sheet.saves[source.save].total),
        components: sheet.saves[source.save].components,
      };
    case "skill": {
      const s = sheet.skills[source.skillId];
      if (!s) return null;
      return { display: signed(s.total), components: s.components };
    }
  }
}

/** Add a saved roll pointing at `source`, displayed as `label`. */
export function addSavedRoll(doc: CharacterDoc, source: SavedRollSource, label: string): CharacterDoc {
  const roll: SavedRoll = { id: newSavedRollId(), label, source };
  return {
    ...doc,
    build: { ...doc.build, savedRolls: [...(doc.build.savedRolls ?? []), roll] },
  };
}

export function removeSavedRoll(doc: CharacterDoc, id: string): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).filter((r) => r.id !== id),
    },
  };
}

export function renameSavedRoll(doc: CharacterDoc, id: string, label: string): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).map((r) => (r.id === id ? { ...r, label } : r)),
    },
  };
}

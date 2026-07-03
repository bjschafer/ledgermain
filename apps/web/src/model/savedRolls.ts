/**
 * Saved rolls (issue #2): a static, no-dice-roller lookup surface. A `SavedRoll`
 * is a bookmark — `{ label, source }` — into a number the engine already
 * computes, optionally nudged by a flat `attackModifier`/`damageModifier` for
 * situational feats the engine doesn't model as a toggle (Rapid Shot, Deadly
 * Aim, ...). Nothing is snapshotted; `resolveSavedRoll` re-reads the current
 * `DerivedSheet` every time, so a saved roll stays correct as buffs/feats/gear
 * change (same "recompute, don't memoize" posture as the rest of the tracker).
 * `source.kind === "custom"` has no engine source at all — a fully freeform
 * bookmark for the cases the other kinds don't cover.
 */

import type {
  CharacterDoc,
  DerivedSheet,
  ModifierComponent,
  ResolvedWeaponAttack,
  SavedRoll,
  SavedRollSource,
} from "@pf1/schema";

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
 * per-weapon attack line, CMB/CMD, initiative, the three saves, every usable
 * skill, and a fully custom bookmark. Options with no live counterpart (e.g. a
 * since-removed weapon) simply don't appear here — they're still
 * resolvable-but-missing on an already-saved roll via {@link resolveSavedRoll}.
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
  out.push({ source: { kind: "custom" }, label: "Custom" });
  return out;
}

/** A resolved damage line, shown alongside a saved roll's attack value. */
export interface ResolvedSavedRollDamage {
  /** e.g. "1d8+6" (dice + signed bonus), or a freeform note for a custom roll. */
  display: string;
  components: ModifierComponent[];
  crit?: string;
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
  damage?: ResolvedSavedRollDamage;
}

/** Append a synthetic "Manual adjustment" component when `modifier` is nonzero. */
function withManualAdjustment(base: ModifierComponent[], modifier: number): ModifierComponent[] {
  if (!modifier) return base;
  return [...base, { source: "Manual adjustment", type: "untyped", value: modifier, applied: true }];
}

/** A signed (or iterative) total with `modifier` folded into every entry, plus provenance. */
function signedResult(
  total: number,
  iteratives: number[] | undefined,
  modifier: number,
  baseComponents: ModifierComponent[],
): { display: string; components: ModifierComponent[] } {
  return {
    display: signedSequence(total + modifier, iteratives?.map((n) => n + modifier)),
    components: withManualAdjustment(baseComponents, modifier),
  };
}

function weaponDamage(atk: ResolvedWeaponAttack, modifier: number): ResolvedSavedRollDamage {
  const bonusTotal = atk.damageBonus.total + modifier;
  const bonusStr = bonusTotal !== 0 ? signed(bonusTotal) : null;
  const display = [atk.damageDice, bonusStr].filter(Boolean).join("") || signed(bonusTotal);
  return { display, components: withManualAdjustment(atk.damageBonus.components, modifier), crit: atk.crit };
}

/** Resolve one saved roll's current value + provenance from the live sheet. */
export function resolveSavedRoll(roll: SavedRoll, sheet: DerivedSheet): ResolvedSavedRoll {
  const attackModifier = roll.attackModifier ?? 0;
  const damageModifier = roll.damageModifier ?? 0;
  const resolved = resolveSource(roll.source, sheet, attackModifier, damageModifier);
  if (!resolved) {
    return { id: roll.id, label: roll.label, display: "—", components: [], missing: true };
  }
  const damage =
    resolved.damage ??
    (roll.source.kind === "custom" && roll.customDamage
      ? { display: roll.customDamage, components: [] }
      : undefined);
  return {
    id: roll.id,
    label: roll.label,
    display: resolved.display,
    components: resolved.components,
    missing: false,
    damage,
  };
}

function resolveSource(
  source: SavedRollSource,
  sheet: DerivedSheet,
  attackModifier: number,
  damageModifier: number,
): { display: string; components: ModifierComponent[]; damage?: ResolvedSavedRollDamage } | null {
  switch (source.kind) {
    case "melee":
      return signedResult(
        sheet.attack.melee.total,
        sheet.attack.melee.iteratives,
        attackModifier,
        sheet.attack.melee.components,
      );
    case "ranged":
      return signedResult(
        sheet.attack.ranged.total,
        sheet.attack.ranged.iteratives,
        attackModifier,
        sheet.attack.ranged.components,
      );
    case "weapon": {
      const atk = sheet.attacks.find((a) => a.name === source.weaponName);
      if (!atk) return null;
      return {
        ...signedResult(atk.attack.total, atk.attack.iteratives, attackModifier, atk.attack.components),
        damage: weaponDamage(atk, damageModifier),
      };
    }
    case "cmb":
      return signedResult(sheet.cmb, undefined, attackModifier, []);
    case "cmd":
      return {
        display: String(sheet.cmd + attackModifier),
        components: withManualAdjustment([], attackModifier),
      };
    case "initiative":
      return signedResult(
        sheet.initiative.total,
        undefined,
        attackModifier,
        sheet.initiative.components,
      );
    case "save":
      return signedResult(
        sheet.saves[source.save].total,
        undefined,
        attackModifier,
        sheet.saves[source.save].components,
      );
    case "skill": {
      const s = sheet.skills[source.skillId];
      if (!s) return null;
      return signedResult(s.total, undefined, attackModifier, s.components);
    }
    case "custom":
      return signedResult(0, undefined, attackModifier, []);
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

/** Patch a saved roll's editable fields (label, manual adjustments, custom damage note). */
export function updateSavedRoll(
  doc: CharacterDoc,
  id: string,
  patch: Partial<Pick<SavedRoll, "label" | "attackModifier" | "damageModifier" | "customDamage">>,
): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    },
  };
}

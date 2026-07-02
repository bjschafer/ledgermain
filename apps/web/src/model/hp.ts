/**
 * Pure HP transitions for the live tracker. Each returns a NEW document so they
 * are trivially unit-testable and safe as React state reducers. Derived max HP
 * lives on the computed sheet, so functions that need it take it as a parameter
 * (the document never stores derived values — DESIGN §2/§3).
 *
 * PF1 model:
 *   - Damage is absorbed by temporary HP first, then reduces current HP (which
 *     may go negative — the table tracks dying/death by the number).
 *   - Healing restores current HP up to max; it never restores temporary HP.
 *     Curing hit point damage also removes an equal amount of nonlethal damage
 *     (PF1 CRB, Nonlethal Damage), floored at 0.
 *   - Nonlethal damage accumulates separately; when it meets/exceeds current HP
 *     the creature is staggered/unconscious (a display concern, not modelled here).
 */

import type { CharacterDoc } from "@pf1/schema";

type Hp = CharacterDoc["live"]["hp"];

function withHp(doc: CharacterDoc, hp: Hp): CharacterDoc {
  return { ...doc, live: { ...doc.live, hp } };
}

function nonNeg(n: number): number {
  return Number.isNaN(n) ? 0 : Math.max(0, Math.trunc(n));
}

/** Apply `amount` of (lethal) damage — temp HP soaks it first, then current. */
export function applyDamage(doc: CharacterDoc, amount: number): CharacterDoc {
  const dmg = nonNeg(amount);
  if (dmg === 0) return doc;
  const { current, temp, nonlethal } = doc.live.hp;
  const fromTemp = Math.min(temp, dmg);
  return withHp(doc, {
    current: current - (dmg - fromTemp),
    temp: temp - fromTemp,
    nonlethal,
  });
}

/**
 * Heal `amount` of current HP, capped at `max`. Does not restore temp HP.
 * Also removes an equal amount of nonlethal damage (floored at 0).
 */
export function applyHealing(doc: CharacterDoc, amount: number, max: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  const { current, temp, nonlethal } = doc.live.hp;
  return withHp(doc, {
    current: Math.min(max, current + heal),
    temp,
    nonlethal: nonNeg(nonlethal - heal),
  });
}

/** Set the temporary HP pool (temp HP does not stack; the highest applies). */
export function setTempHp(doc: CharacterDoc, value: number): CharacterDoc {
  return withHp(doc, { ...doc.live.hp, temp: nonNeg(value) });
}

/** Add nonlethal damage. */
export function addNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const add = nonNeg(amount);
  if (add === 0) return doc;
  return withHp(doc, { ...doc.live.hp, nonlethal: doc.live.hp.nonlethal + add });
}

/** Heal `amount` of nonlethal damage (floored at 0). */
export function healNonlethal(doc: CharacterDoc, amount: number): CharacterDoc {
  const heal = nonNeg(amount);
  if (heal === 0) return doc;
  return withHp(doc, { ...doc.live.hp, nonlethal: nonNeg(doc.live.hp.nonlethal - heal) });
}

/** Rest: full current HP, all nonlethal removed, temp cleared. */
export function restHp(doc: CharacterDoc, max: number): CharacterDoc {
  return withHp(doc, { current: max, temp: 0, nonlethal: 0 });
}

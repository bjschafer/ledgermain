/**
 * Link a spell to the compendium buff(s) that represent it, so casting a
 * buff-spell can apply its mechanical effect in one click instead of a manual
 * hunt through the Buffs panel.
 *
 * Foundry gives us almost no structural spell→buff edge (only a handful of
 * spells carry an `@Apply[...]` note upstream), so the connection is made by
 * NAME: the buff compendium's `subType: "spell"` entries are the mechanical
 * versions of buff-spells and share the spell's name. Matching is deliberately
 * conservative — exact normalized name, or a buff whose only extra is a
 * trailing parenthetical qualifier (`Resist Energy (Fire)`, `Rage (Spell)`) —
 * so a spell never silently picks up an unrelated buff. Anything this misses
 * still has the full buff search as its escape hatch.
 *
 * A single spell can map to several buffs (Resist Energy → one per energy
 * type, Prayer → positive/negative), so this returns a list; the caller offers
 * a choice when there's more than one.
 */

import type { Buff, RefData, Spell } from "@pf1/schema";

const norm = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Strip a single trailing parenthetical qualifier, e.g. `"resist energy (fire)"` → `"resist energy"`. */
const parenBase = (s: string): string => s.replace(/\s*\([^()]*\)\s*$/, "").trim();

/**
 * Index from a normalized spell name to the spell-subtype buffs that represent
 * it. Built once per `RefData.buffs` object and cached — the tracker calls
 * {@link buffsForSpell} once per rendered spell row.
 */
const indexCache = new WeakMap<RefData["buffs"], Map<string, Buff[]>>();

function spellBuffIndex(refData: RefData): Map<string, Buff[]> {
  const cached = indexCache.get(refData.buffs);
  if (cached) return cached;

  const index = new Map<string, Buff[]>();
  const add = (key: string, buff: Buff) => {
    const list = index.get(key);
    if (list) list.push(buff);
    else index.set(key, [buff]);
  };
  for (const buff of Object.values(refData.buffs)) {
    // Only the "spell" buff subtype is a spell's mechanical effect; item/feat/
    // temp buffs share names by coincidence (a "Rage" feat-buff is not the
    // "Rage" spell) and must not be offered here.
    if (buff.subType !== "spell") continue;
    const n = norm(buff.name);
    add(n, buff);
    const base = parenBase(n);
    if (base !== n) add(base, buff);
  }
  indexCache.set(refData.buffs, index);
  return index;
}

/**
 * The compendium buffs a spell can be applied as — usually one, occasionally
 * several variants (energy type, alignment). Empty when the spell has no
 * mechanical buff (the common case: most spells aren't buffs).
 */
export function buffsForSpell(spell: Spell, refData: RefData): Buff[] {
  return spellBuffIndex(refData).get(norm(spell.name)) ?? [];
}

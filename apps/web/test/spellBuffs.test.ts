import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { Buff, RefData, Spell } from "@pf1/schema";

import { buffsForSpell } from "../src/model/spellBuffs.js";

const ref = loadRefData();

/** Find a vendored spell by exact name. */
function spell(name: string): Spell {
  const found = Object.values(ref.spells).find((s) => s.name === name);
  if (!found) throw new Error(`fixture spell not found: ${name}`);
  return found;
}

describe("buffsForSpell (real data)", () => {
  it("links a buff-spell to its single compendium buff", () => {
    const names = buffsForSpell(spell("Shield of Faith"), ref).map((b) => b.name);
    expect(names).toEqual(["Shield of Faith"]);
  });

  it("resolves a parenthetical-qualified buff (Rage → Rage (Spell))", () => {
    const names = buffsForSpell(spell("Rage"), ref).map((b) => b.name);
    expect(names).toContain("Rage (Spell)");
  });

  it("returns every energy variant for Resist Energy", () => {
    const names = buffsForSpell(spell("Resist Energy"), ref)
      .map((b) => b.name)
      .sort();
    expect(names).toEqual([
      "Resist Energy (Acid)",
      "Resist Energy (Cold)",
      "Resist Energy (Electricity)",
      "Resist Energy (Fire)",
      "Resist Energy (Sonic)",
    ]);
  });

  it("returns nothing for a non-buff spell", () => {
    expect(buffsForSpell(spell("Fireball"), ref)).toEqual([]);
  });

  it("every resolved buff is a spell-subtype buff", () => {
    for (const s of Object.values(ref.spells)) {
      for (const b of buffsForSpell(s, ref)) expect(b.subType).toBe("spell");
    }
  });
});

describe("buffsForSpell (synthetic edge cases)", () => {
  function withBuffs(buffs: Buff[]): RefData {
    const map: Record<string, Buff> = {};
    for (const b of buffs) map[b.id] = b;
    return { ...ref, buffs: map };
  }
  const buff = (id: string, name: string, subType: string): Buff =>
    ({ id, uuid: id, name, subType, changes: [], contextNotes: [] }) as unknown as Buff;
  const testSpell = (name: string): Spell =>
    ({
      id: `spell-${name}`,
      uuid: `spell-${name}`,
      name,
      level: 1,
      descriptors: [],
      components: {},
      learnedAt: { class: {} },
      actions: [],
    }) as unknown as Spell;

  it("ignores non-spell-subtype buffs that share a name", () => {
    const rd = withBuffs([buff("b1", "Rage", "feat"), buff("b2", "Rage (Spell)", "spell")]);
    const names = buffsForSpell(testSpell("Rage"), rd).map((b) => b.name);
    expect(names).toEqual(["Rage (Spell)"]);
  });

  it("matches case- and whitespace-insensitively", () => {
    const rd = withBuffs([buff("b1", "  BULL'S   Strength  ", "spell")]);
    expect(buffsForSpell(testSpell("Bull's Strength"), rd)).toHaveLength(1);
  });
});

/**
 * False Life (CRB p. 239): unlike Divine Power/Greater Heroism/ Aid, all of
 * which correctly resolve to a vendored buff, False Life has NO
 * `RefData.buffs` entry at all — confirmed against the real vendored slice.
 * `@pf1/engine`'s `FALSE_LIFE_BUFF` (see that module's doc comment) fills the
 * gap as a hand-authored fallback, checked only once the vendored index comes
 * up empty.
 */
describe("buffsForSpell (False Life hand-authored fallback)", () => {
  it("resolves False Life to the hand-authored buff (no vendored buff exists)", () => {
    const buffs = buffsForSpell(spell("False Life"), ref);
    expect(buffs.map((b) => b.name)).toEqual(["False Life"]);
    expect(buffs[0]?.contextNotes[0]?.text).toContain("1d10 + 1 per caster level");
  });

  it("a real vendored buff of the same name would win over the hand-authored fallback", () => {
    const vendored: Buff = {
      id: "vendored-false-life",
      uuid: "vendored-false-life",
      name: "False Life",
      subType: "spell",
      changes: [],
      contextNotes: [],
    };
    const rd: RefData = { ...ref, buffs: { ...ref.buffs, [vendored.id]: vendored } };
    const buffs = buffsForSpell(spell("False Life"), rd);
    expect(buffs).toEqual([vendored]);
  });
});

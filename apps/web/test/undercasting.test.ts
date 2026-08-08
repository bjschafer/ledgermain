/**
 * Undercasting (Occult Adventures psychic spells "that can be undercast"):
 * derived purely from name + description against the real vendored data
 * slice, per `model/undercasting.ts`'s doc comment — no structured chain
 * linkage exists in the data itself.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { RefData } from "@pf1/schema";

import { spellLevelMap } from "../src/model/preparedSpells.js";
import {
  impliedUndercastSpells,
  undercastGrant,
  undercastGrantLabel,
} from "../src/model/undercasting.js";

const ref = loadRefData();

/** id of the vendored spell with exactly this name. Throws if not found, so a data-version drift fails loudly. */
function spellIdByName(refData: RefData, name: string): string {
  const entry = Object.entries(refData.spells).find(([, sp]) => sp.name === name);
  if (!entry) throw new Error(`fixture spell not found: ${name}`);
  return entry[0];
}

const CHAINS: Record<string, { count: number; rootLevel: number }> = {
  "Ego Whip": { count: 5, rootLevel: 3 },
  "Id Insinuation": { count: 4, rootLevel: 2 },
  "Intellect Fortress": { count: 3, rootLevel: 4 },
  "Mental Barrier": { count: 5, rootLevel: 2 },
  "Mind Thrust": { count: 6, rootLevel: 1 },
  "Psychic Crush": { count: 5, rootLevel: 5 },
  "Rend Body": { count: 4, rootLevel: 5 },
  "Thought Shield": { count: 5, rootLevel: 2 },
  "Thought Worm": { count: 4, rootLevel: 2 },
  "Tower of Iron Will": { count: 5, rootLevel: 5 },
};

describe("undercastGrant() — the 10 chains against the real vendored data", () => {
  for (const [family, { count, rootLevel }] of Object.entries(CHAINS)) {
    it(`${family}: root (I) grants nothing, the top version grants I..top-1`, () => {
      const rootId = spellIdByName(ref, `${family} I`);
      expect(undercastGrant(ref, rootId)).toBeUndefined();

      const topName = `${family} ${toRoman(count)}`;
      const topId = spellIdByName(ref, topName);
      const grant = undercastGrant(ref, topId)!;
      expect(grant).toBeDefined();
      expect(grant.family).toBe(family);
      expect(grant.spells).toHaveLength(count - 1);
      expect(grant.spells.map((s) => s.numeral)).toEqual(
        Array.from({ length: count - 1 }, (_, i) => i + 1),
      );
      // The chain's roman-numeral-I root always sits at the printed base
      // level (never carries the "can be undercast" sentence itself).
      expect(grant.spells[0]!.level).toBe(rootLevel);
    });
  }

  it("a spell not on any chain (e.g. Fireball) grants nothing", () => {
    const fireball = spellIdByName(ref, "Fireball");
    expect(undercastGrant(ref, fireball)).toBeUndefined();
  });

  it("a mid-chain version (Mind Thrust IV) grants only the versions below it, not V or VI", () => {
    const id = spellIdByName(ref, "Mind Thrust IV");
    const grant = undercastGrant(ref, id)!;
    expect(grant.spells.map((s) => s.name)).toEqual([
      "Mind Thrust I",
      "Mind Thrust II",
      "Mind Thrust III",
    ]);
    expect(grant.spells.map((s) => s.level)).toEqual([1, 2, 3]);
  });
});

describe("undercastGrantLabel()", () => {
  it("formats a multi-spell range", () => {
    const id = spellIdByName(ref, "Mind Thrust IV");
    const grant = undercastGrant(ref, id)!;
    expect(undercastGrantLabel(grant)).toBe("Undercast: also grants Mind Thrust I-III");
  });

  it("formats a single-spell grant (the II version, one level below)", () => {
    const id = spellIdByName(ref, "Ego Whip II");
    const grant = undercastGrant(ref, id)!;
    expect(undercastGrantLabel(grant)).toBe("Undercast: also grants Ego Whip I");
  });
});

describe("impliedUndercastSpells()", () => {
  it("Mind Thrust IV known → I, II, III implied at their own levels", () => {
    const knownId = spellIdByName(ref, "Mind Thrust IV");
    const implied = impliedUndercastSpells(ref, [knownId]);
    expect(implied.map((s) => s.name)).toEqual([
      "Mind Thrust I",
      "Mind Thrust II",
      "Mind Thrust III",
    ]);
    expect(implied.map((s) => s.level)).toEqual([1, 2, 3]);
    expect(implied.every((s) => s.grantedById === knownId)).toBe(true);
    expect(implied.every((s) => s.grantedByName === "Mind Thrust IV")).toBe(true);
  });

  it("overlapping known chains dedupe: knowing both III and V only reports each implied spell once", () => {
    const knownIds = [spellIdByName(ref, "Mind Thrust III"), spellIdByName(ref, "Mind Thrust V")];
    const implied = impliedUndercastSpells(ref, knownIds);
    // V implies I-IV, III implies I-II — union is I-IV, no duplicates.
    expect(implied.map((s) => s.name)).toEqual([
      "Mind Thrust I",
      "Mind Thrust II",
      "Mind Thrust III",
      "Mind Thrust IV",
    ]);
  });

  it("reports every lower chain member regardless of whether it's separately known too — callers (the tracker's known-by-level merge) filter against their own known set, same as the bloodline/mystery/discipline bonus-spell merges it mirrors", () => {
    const knownIds = [
      spellIdByName(ref, "Mind Thrust IV"),
      spellIdByName(ref, "Mind Thrust II"), // separately known too
    ];
    const implied = impliedUndercastSpells(ref, knownIds);
    expect(implied.map((s) => s.name)).toEqual([
      "Mind Thrust I",
      "Mind Thrust II",
      "Mind Thrust III",
    ]);
  });

  it("known spells outside any chain (or an empty list) imply nothing", () => {
    expect(impliedUndercastSpells(ref, [])).toEqual([]);
    expect(impliedUndercastSpells(ref, [spellIdByName(ref, "Fireball")])).toEqual([]);
  });

  it("spans multiple chains at once", () => {
    const knownIds = [spellIdByName(ref, "Ego Whip III"), spellIdByName(ref, "Rend Body II")];
    const implied = impliedUndercastSpells(ref, knownIds);
    expect(implied.map((s) => s.name).sort()).toEqual(
      ["Ego Whip I", "Ego Whip II", "Rend Body I"].sort(),
    );
  });
});

describe("undercasting does not touch the known-spell cap", () => {
  it("implied spells never land in the psychic spell-level count that the known-limit advisory reads", () => {
    // Mirrors what SpellsSection.tsx's `knownCountByLevel` does: count only
    // the doc's actual known ids, bucketed by the class's own spell-list
    // level (via spellLevelMap) — the implied lower-chain spells are never
    // written to `build.spells.known`, so they can never inflate this count.
    const known = new Set([spellIdByName(ref, "Mind Thrust V")]);
    const levelMap = spellLevelMap(ref, "psychic");
    const knownCountByLevel = new Map<number, number>();
    for (const id of known) {
      const lvl = levelMap.get(id);
      if (lvl !== undefined) knownCountByLevel.set(lvl, (knownCountByLevel.get(lvl) ?? 0) + 1);
    }
    expect(knownCountByLevel.get(5)).toBe(1); // Mind Thrust V itself
    // The four implied lower versions (I-IV) exist...
    const implied = impliedUndercastSpells(ref, known);
    expect(implied).toHaveLength(4);
    // ...but none of them bumped the known count at their levels.
    for (const sp of implied) {
      expect(knownCountByLevel.get(sp.level) ?? 0).toBe(0);
    }
  });
});

function toRoman(n: number): string {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1]!;
}

/**
 * Hand-computed fixtures for `applyAdjustments`, run against real monsters
 * pulled straight out of the vendored bestiary (not synthetic Monster
 * literals) so the numbers being asserted are the actual printed statblock
 * plus a hand-worked delta, not a shape invented to make the code pass.
 *
 * Each expected value is derived by hand in a comment next to the assertion;
 * see the ability-mod math (`floor(score/2) - 5`) and the melee damage
 * multiplier heuristic documented in `../src/model/adjust/apply.ts`.
 */
import type { Monster } from "@pf1/schema";
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applyAdjustments } from "../src/model/adjust/apply.js";
import type { StatblockAdjustment } from "../src/model/adjust/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const monstersPath = join(here, "../../../packages/data-pipeline/data/monsters.json");
const monsters = JSON.parse(readFileSync(monstersPath, "utf8")) as Record<string, Monster>;

function fixture(id: string): Monster {
  const m = monsters[id];
  if (!m)
    throw new Error(`fixture monster "${id}" missing from vendored data; pick a different one`);
  return m;
}

describe("applyAdjustments: Augment Summoning shape (+4 Str/+4 Con)", () => {
  // dog: str 13 (mod +1), con 15 (mod +2), hd "1d8+2" (1 HD), hp 6, melee "bite +2
  // (1d4+1)", fort "+4", cmb "+0", cmd "11 (15 vs. trip)", size Small.
  // str 13->17: mod +1->+3, strDelta +2. con 15->19: mod +2->+4, conDelta +2.
  const dog = fixture("dog");
  const adjustment: StatblockAdjustment = {
    key: "augment-summoning",
    label: "Augment Summoning",
    ops: [{ kind: "ability", deltas: { str: 4, con: 4 } }],
  };
  const result = applyAdjustments(dog, [adjustment]);

  it("updates the ability scores", () => {
    expect(result.monster.abilityScores).toEqual({ ...dog.abilityScores, str: 17, con: 19 });
  });

  it("adds conDelta * hdCount to hp, floated at 1 HD (2 * 1 = +2), and rewrites the HD flat bonus to match", () => {
    expect(result.monster.hp).toBe(8); // 6 + 2
    expect(result.monster.hd).toBe("1d8+4"); // existing +2, plus the same +2 hp delta
  });

  it("shifts Fortitude by conDelta and leaves Reflex/Will/init alone (Dex/Wis unchanged)", () => {
    expect(result.monster.fort).toBe("+6"); // +4 + 2
    expect(result.monster.ref).toBe(dog.ref);
    expect(result.monster.will).toBe(dog.will);
    expect(result.monster.init).toBe(dog.init);
  });

  it("shifts CMB by strDelta (Small creature, not Tiny/Diminutive/Fine) and CMD by str+dex", () => {
    expect(result.monster.cmb).toBe("+2"); // +0 + 2
    // cmd "11 (15 vs. trip)": leading 11 + 2 = 13; unsigned since printed with no sign; trailing preserved
    expect(result.monster.cmd).toBe("13 (15 vs. trip)");
  });

  it("flags the untouched conditional CMD text with an info note", () => {
    expect(result.notes).toContainEqual({
      text: "Conditional CMD values were not adjusted.",
      severity: "info",
    });
  });

  it("shifts the single-attack melee line at x1.5 Str (dog's only attack), leaving AC alone (no Dex delta)", () => {
    // bite +2 (1d4+1): printed dmg bonus 1 == floor(1.5*1) [old Str mod], reconciles at x1.5.
    // new bonus = floor(1.5 * (1+2)) = floor(4.5) = 4. Attack bonus = +2 + strDelta(2) = +4.
    expect(result.monster.melee).toBe("bite +4 (1d4+4)");
    expect(result.monster.ac).toBe(dog.ac);
    expect(result.monster.acMods).toBe(dog.acMods);
  });

  it("records every touched field in changes[]", () => {
    const fields = result.changes.map((c) => c.field).sort();
    const expected: (keyof Monster)[] = [
      "abilityScores",
      "cmb",
      "cmd",
      "fort",
      "hd",
      "hp",
      "melee",
    ];
    expect(fields).toEqual(expected.sort());
  });

  it("never mutates the input monster", () => {
    expect(dog.abilityScores!.str).toBe(13);
    expect(dog.hp).toBe(6);
    expect(dog.melee).toBe("bite +2 (1d4+1)");
  });
});

describe("applyAdjustments: no Con score is skipped, not fabricated", () => {
  // allip: undead, abilityScores has no `con` key at all.
  const allip = fixture("allip");
  expect(allip.abilityScores?.con).toBeUndefined();

  const result = applyAdjustments(allip, [
    { key: "con-boost", label: "Con Boost", ops: [{ kind: "ability", deltas: { con: 4 } }] },
  ]);

  it("adds an info note instead of guessing a Con score", () => {
    expect(result.notes).toEqual([
      {
        text: "no Constitution score; Constitution-based adjustments do not apply",
        severity: "info",
      },
    ]);
  });

  it("touches nothing else: no fields are recorded as changed", () => {
    expect(result.changes).toEqual([]);
  });

  it("returns the monster otherwise identical to the input", () => {
    expect(result.monster).toEqual(allip);
  });
});

describe("applyAdjustments: Weapon Finesse uses Dex for the attack roll, Str for damage", () => {
  // eagle: Small, feats "Weapon Finesse", str 10 (mod 0), dex 15 (mod +2).
  // dex 15->17: mod +2->+3, dexDelta +1. Str untouched (strDelta 0).
  const eagle = fixture("eagle");
  const result = applyAdjustments(eagle, [
    { key: "dex-boost", label: "Dex Boost", ops: [{ kind: "ability", deltas: { dex: 2 } }] },
  ]);

  it("shifts both iterative melee attacks by dexDelta, not strDelta, and leaves damage alone", () => {
    // "2 talons +3 (1d4), bite +3 (1d4)": strDelta is 0, so no candidate multiplier
    // logic runs at all -- damage dice stay exactly as printed.
    expect(result.monster.melee).toBe("2 talons +4 (1d4), bite +4 (1d4)");
  });

  it("still applies the ordinary Dex effects (AC, CMD, Reflex, init)", () => {
    expect(result.monster.ac).toBe(15); // 14 + 1
    expect(result.monster.touchAc).toBe(14); // 13 + 1
    expect(result.monster.acMods).toBe("+3 Dex, +1 natural, +1 size"); // "+2 Dex" -> "+3 Dex"
    expect(result.monster.cmd).toBe("12"); // 11 + (strDelta 0 + dexDelta 1)
    expect(result.monster.ref).toBe("+5"); // +4 + 1
    expect(result.monster.init).toBe("+3"); // +2 + 1
  });

  it("leaves CMB, Fortitude, Will, hp, and Hit Dice untouched (their governing mod didn't change)", () => {
    expect(result.monster.cmb).toBe(eagle.cmb); // strDelta 0
    expect(result.monster.fort).toBe(eagle.fort); // conDelta 0
    expect(result.monster.will).toBe(eagle.will); // wisDelta 0
    expect(result.monster.hp).toBe(eagle.hp);
    expect(result.monster.hd).toBe(eagle.hd);
  });
});

describe("applyAdjustments: Tiny creature uses Dex, not Str, for CMB", () => {
  // animate_hair: Tiny, str 10 (mod 0), dex 13 (mod +1), cmb "-1 (+1 grapple)".
  // str 10->14: mod 0->+2, strDelta +2. dex 13->15: mod +1->+2, dexDelta +1.
  // If CMB wrongly used strDelta it would read "+1 (+1 grapple)"; the Tiny rule
  // says CMB uses dexDelta instead, landing on "+0 (+1 grapple)".
  const animateHair = fixture("animate_hair");
  expect(animateHair.size).toBe("Tiny");

  const result = applyAdjustments(animateHair, [
    { key: "boost", label: "Boost", ops: [{ kind: "ability", deltas: { str: 4, dex: 2 } }] },
  ]);

  it("shifts CMB by dexDelta (+1), not strDelta (+2)", () => {
    expect(result.monster.cmb).toBe("+0 (+1 grapple)");
  });

  it("still shifts CMD by str+dex together", () => {
    expect(result.monster.cmd).toBe("13 (12 vs. grapple, can't be tripped)"); // 10 + (2+1)
  });
});

describe("applyAdjustments: resist merging (max of existing vs. granted, new energies appended)", () => {
  // aashaqs_wyvern: resist "acid 10, fire 10", hd "9d12+45" (9 HD).
  const wyvern = fixture("aashaqs_wyvern");
  const result = applyAdjustments(wyvern, [
    {
      key: "resist-grant",
      label: "Resist Grant",
      ops: [
        {
          kind: "resistTiers",
          energies: ["fire", "cold"],
          tiers: [
            { minHd: 0, value: 5 },
            { minHd: 5, value: 20 },
          ], // 9 HD picks the 20 tier
        },
      ],
    },
  ]);

  it("takes the max for an energy already resisted, and appends a brand new one", () => {
    // fire: existing 10 vs granted 20 -> 20 wins. cold: not present -> appended.
    expect(result.monster.resist).toBe("acid 10, fire 20, cold 20");
    expect(result.changes).toContainEqual({ field: "resist", kind: "appended" });
  });
});

describe("applyAdjustments: DR merging keeps both entries", () => {
  // animate_hair: dr "5/slashing", hd "2d8+2" (2 HD).
  const animateHair = fixture("animate_hair");
  const result = applyAdjustments(animateHair, [
    {
      key: "dr-grant",
      label: "DR Grant",
      ops: [{ kind: "drTiers", tiers: [{ minHd: 0, value: "5/cold iron" }] }],
    },
  ]);

  it("joins the granted DR onto the existing entry with an info note", () => {
    expect(result.monster.dr).toBe("5/slashing; 5/cold iron");
    expect(result.notes).toContainEqual({
      text: "Damage reduction merged alongside the existing entry.",
      severity: "info",
    });
  });
});

describe("applyAdjustments: SR from CR (existing SR wins when it's already higher)", () => {
  // aashaqs_wyvern: cr "8", sr "19".
  const wyvern = fixture("aashaqs_wyvern");
  const result = applyAdjustments(wyvern, [
    { key: "sr-grant", label: "SR Grant", ops: [{ kind: "srFromCr", delta: 2 }] }, // computed = 8 + 2 = 10
  ]);

  it("keeps the existing (higher) SR and notes it, rather than overwriting with a lower value", () => {
    expect(result.monster.sr).toBe("19");
    expect(result.notes).toContainEqual({
      text: "Existing spell resistance already meets or exceeds the granted value.",
      severity: "info",
    });
    expect(result.changes.some((c) => c.field === "sr")).toBe(false);
  });
});

describe("applyAdjustments: SR from CR (no existing SR, sets the computed value)", () => {
  // dog: cr "1/3" -> floor(1/3) = 0, no sr field.
  const dog = fixture("dog");
  const result = applyAdjustments(dog, [
    { key: "sr-grant", label: "SR Grant", ops: [{ kind: "srFromCr", delta: 5 }] },
  ]);

  it("sets SR to the computed value", () => {
    expect(result.monster.sr).toBe("5");
    expect(result.changes).toContainEqual({ field: "sr", kind: "recomputed" });
  });
});

describe("applyAdjustments: crTiers steps the CR ladder and recomputes XP", () => {
  // dog: cr "1/3" (ladder index 3), hd "1d8+2" (1 HD), xp 135.
  const dog = fixture("dog");
  const result = applyAdjustments(dog, [
    {
      key: "cr-bump",
      label: "CR Bump",
      ops: [{ kind: "crTiers", tiers: [{ minHd: 0, value: 1 }] }],
    },
  ]);

  it("steps CR one tier up the ladder (1/3 -> 1/2) and recomputes XP from the standard table", () => {
    expect(result.monster.cr).toBe("1/2");
    expect(result.monster.xp).toBe(200);
  });
});

describe("applyAdjustments: sizeStep (grow one size category)", () => {
  // animate_hair: Tiny -> Small. AC/attack size mod: Tiny +2 -> Small +1, delta -1.
  // CMB/CMD size mod: Tiny -2 -> Small -1, delta +1.
  const animateHair = fixture("animate_hair");
  const result = applyAdjustments(animateHair, [
    { key: "grow", label: "Grow", ops: [{ kind: "sizeStep", delta: 1 }] },
  ]);

  it("updates size and applies the AC/attack size-mod delta to all three AC fields", () => {
    expect(result.monster.size).toBe("Small");
    expect(result.monster.ac).toBe(12); // 13 - 1
    expect(result.monster.touchAc).toBe(12); // 13 - 1
    expect(result.monster.flatFootedAc).toBe(11); // 12 - 1
  });

  it("applies the CMB/CMD special size-mod delta", () => {
    expect(result.monster.cmb).toBe("+0 (+1 grapple)"); // -1 + 1
    expect(result.monster.cmd).toBe("11 (12 vs. grapple, can't be tripped)"); // 10 + 1
  });

  it("shifts the attack bonus by the size delta and steps the damage die one chart entry", () => {
    // "2 slams +3 (1d2)": attack +3 - 1 = +2; 1d2 is chart index 1, +1 step -> 1d3 (index 2).
    expect(result.monster.melee).toBe("2 slams +2 (1d3)");
  });

  it("adds the space/reach and Stealth informational notes", () => {
    expect(result.notes).toContainEqual({
      text: "Space/reach not adjusted for size.",
      severity: "info",
    });
    expect(result.notes).toContainEqual({
      text: "Skills (Stealth) not adjusted for size.",
      severity: "info",
    });
  });
});

describe("applyAdjustments: appendLine substitutes {hd}/{chaMod} and respects skipIfPresent", () => {
  // dog: hd "1d8+2" (1 HD), cha 6 (mod floor(6/2)-5 = -2), senses contain "scent".
  const dog = fixture("dog");

  it("substitutes {hd} and {chaMod} when the field is empty", () => {
    const result = applyAdjustments(dog, [
      {
        key: "howl",
        label: "Howl",
        ops: [
          { kind: "appendLine", field: "specialAttacks", text: "howl (DC 10 + {hd} + {chaMod})" },
        ],
      },
    ]);
    expect(result.monster.specialAttacks).toBe("howl (DC 10 + 1 + -2)");
    expect(result.changes).toContainEqual({ field: "specialAttacks", kind: "appended" });
  });

  it("appends with a comma when the field already has content", () => {
    const result = applyAdjustments(dog, [
      {
        key: "extra-sense",
        label: "Extra Sense",
        ops: [{ kind: "appendLine", field: "senses", text: "tremorsense 30 ft." }],
      },
    ]);
    expect(result.monster.senses).toBe(`${dog.senses}, tremorsense 30 ft.`);
  });

  it("skips the append when skipIfPresent already matches, case-insensitively", () => {
    const result = applyAdjustments(dog, [
      {
        key: "scent-again",
        label: "Scent Again",
        ops: [{ kind: "appendLine", field: "senses", text: "SCENT", skipIfPresent: "scent" }],
      },
    ]);
    expect(result.monster.senses).toBe(dog.senses);
    expect(result.changes).toEqual([]);
  });
});

describe("applyAdjustments: an unparseable attack line gets an honest manual note, not a guess", () => {
  // syrinx: str 8 (mod -1), melee "quarterstaff -1 (1d6-1) Adept" -- the trailing
  // " Adept" after the damage paren isn't valid attack-line grammar, so it fails
  // to parse. str 8->10: mod -1->0, strDelta +1.
  const syrinx = fixture("syrinx");
  expect(syrinx.melee).toBe("quarterstaff -1 (1d6-1) Adept");

  const result = applyAdjustments(syrinx, [
    { key: "str-boost", label: "Str Boost", ops: [{ kind: "ability", deltas: { str: 2 } }] },
  ]);

  it("leaves the original melee text completely unchanged", () => {
    expect(result.monster.melee).toBe(syrinx.melee);
    expect(result.changes.some((c) => c.field === "melee")).toBe(false);
  });

  it("adds a manual note spelling out exactly what to adjust by hand", () => {
    expect(result.notes).toContainEqual({
      text: "Melee line could not be parsed; adjust attack rolls by +1 and adjust damage by +1 by hand.",
      severity: "manual",
    });
  });
});

describe("applyAdjustments: adjustment.notes are carried through as info notes", () => {
  const dog = fixture("dog");
  const result = applyAdjustments(dog, [
    {
      key: "flightless",
      label: "Flightless Template",
      ops: [{ kind: "subtypes", add: ["augmented"] }],
      notes: ["Doesn't grant the ability to fly."],
    },
  ]);

  it("adds the subtype and appends the adjustment's own notes as info", () => {
    expect(result.monster.subtypes).toEqual(["augmented"]);
    expect(result.notes).toContainEqual({
      text: "Doesn't grant the ability to fly.",
      severity: "info",
    });
  });
});

describe("applyAdjustments: immutability", () => {
  it("never mutates the base monster, even across multiple ops touching the same fields", () => {
    const dog = fixture("dog");
    const snapshot = JSON.parse(JSON.stringify(dog)) as Monster;
    applyAdjustments(dog, [
      {
        key: "boost",
        label: "Boost",
        ops: [{ kind: "ability", deltas: { str: 4, con: 4, dex: 2 } }],
      },
      {
        key: "grant",
        label: "Grant",
        ops: [
          { kind: "sizeStep", delta: 1 },
          { kind: "subtypes", add: ["giant"] },
        ],
      },
    ]);
    expect(dog).toEqual(snapshot);
  });
});

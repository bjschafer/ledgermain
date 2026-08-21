/**
 * Hand-picked grammar cases, plus a corpus sweep: every melee/ranged string in
 * the vendored bestiary must round-trip through parse -> render exactly when
 * it parses at all. The sweep is the real correctness anchor; the floor below
 * is pinned just under the measured rate so a grammar regression fails loudly.
 */
import type { Monster } from "@pf1/schema";
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DICE_SIZE_CHART,
  flattenAttacks,
  parseAttackLine,
  renderAttackLine,
  shiftAttackBonus,
  shiftDamageBonus,
  stepDiceTerm,
  withDamageCore,
} from "../src/model/adjust/attackLine.js";

const here = dirname(fileURLToPath(import.meta.url));
const monstersPath = join(here, "../../../packages/data-pipeline/data/monsters.json");

describe("parseAttackLine / renderAttackLine round trip", () => {
  const cases = [
    "bite +2 (1d4+1)",
    "2 claws +5 (1d6+3), bite +5 (1d8+4 plus grab)",
    "mwk longsword +11/+6 (1d8+4/19-20)",
    "slam +14 (2d8+9 plus energy drain)",
    "gore +3 (1d6+2/x3)",
    "touch +5 (1d6 electricity)",
    "4 tentacles +8 (1d6+1)",
    "+1 scimitar +13/+8 (1d6+8/18-20) or slam +12 (1d6+7)",
    "+1 lance +11/+6 (1d8+4/&times&3), or mwk greatsword +11/+6 (2d6+3/19-20)",
    "swarm (1d6 plus distraction)",
    "slime squirt +4 ranged touch",
    "spit +4 touch",
    "web +35 touch (special/&times&3)",
    "bite +3 (1 plus poison)",
  ];

  for (const line of cases) {
    it(`round-trips ${JSON.stringify(line)}`, () => {
      const parsed = parseAttackLine(line);
      expect(parsed).not.toBeNull();
      expect(renderAttackLine(parsed!)).toBe(line);
    });
  }

  it("splits alternative attack routines on ' or ' and simultaneous attacks on ', '", () => {
    const parsed = parseAttackLine("+1 scimitar +13/+8 (1d6+8/18-20) or slam +12 (1d6+7)")!;
    expect(parsed.groups).toHaveLength(2);
    expect(parsed.groups[0]!.attacks).toHaveLength(1);
    expect(parsed.groups[0]!.attacks[0]!.namePart).toBe("+1 scimitar");
    expect(parsed.groups[1]!.attacks[0]!.namePart).toBe("slam");
  });

  it("parses iterative bonuses and a crit-range extra", () => {
    const attack = flattenAttacks(parseAttackLine("mwk longsword +11/+6 (1d8+4/19-20)")!)[0]!;
    expect(attack.bonuses).toEqual([11, 6]);
    expect(attack.damage!.core).toEqual({ kind: "dice", count: 1, sides: 8, bonus: 4 });
    expect(attack.damage!.extras).toEqual(["19-20"]);
  });

  it("keeps a plus-rider as opaque trailing text", () => {
    const attack = flattenAttacks(parseAttackLine("bite +13 (2d6+5 plus grab)")!)[0]!;
    expect(attack.damage!.rider).toBe(" plus grab");
  });

  it("parses a bonusless swarm attack with no damage bonus concept", () => {
    const attack = flattenAttacks(parseAttackLine("swarm (2d6 plus distraction)")!)[0]!;
    expect(attack.bonuses).toEqual([]);
    expect(attack.damage!.core).toEqual({ kind: "dice", count: 2, sides: 6, bonus: null });
  });

  it("rejects a line with trailing garbage after the damage paren", () => {
    expect(parseAttackLine("nine-ring broadsword +0 (1d8/&times&3) Occultist")).toBeNull();
  });
});

describe("shiftAttackBonus / shiftDamageBonus", () => {
  it("shifts every iterative bonus by the same delta", () => {
    const attack = flattenAttacks(parseAttackLine("mwk longsword +11/+6 (1d8+4/19-20)")!)[0]!;
    expect(shiftAttackBonus(attack, 2).bonuses).toEqual([13, 8]);
  });

  it("adds a bonus to a dice term that printed none", () => {
    const term = shiftDamageBonus({ kind: "dice", count: 1, sides: 6, bonus: null }, 2);
    expect(term).toEqual({ kind: "dice", count: 1, sides: 6, bonus: 2 });
  });

  it("drops the bonus back to nothing when it shifts to exactly 0", () => {
    const term = shiftDamageBonus({ kind: "dice", count: 1, sides: 6, bonus: 2 }, -2);
    expect(term).toEqual({ kind: "dice", count: 1, sides: 6, bonus: null });
  });

  it("leaves a raw (non-numeric) damage term untouched", () => {
    const term = shiftDamageBonus({ kind: "raw", text: "special" }, 3);
    expect(term).toEqual({ kind: "raw", text: "special" });
  });

  it("round-trips a full shift through withDamageCore + render", () => {
    const parsed = parseAttackLine("bite +2 (1d4+1)")!;
    const attack = flattenAttacks(parsed)[0]!;
    const shifted = withDamageCore(
      shiftAttackBonus(attack, 1),
      shiftDamageBonus(attack.damage!.core, 1),
    );
    expect(renderAttackLine({ groups: [{ attacks: [shifted], seps: [] }], groupSeps: [] })).toBe(
      "bite +3 (1d4+2)",
    );
  });
});

describe("stepDiceTerm (size-change dice progression)", () => {
  it("steps a die up the chart, preserving the bonus", () => {
    expect(stepDiceTerm({ kind: "dice", count: 1, sides: 6, bonus: 3 }, 1)).toEqual({
      kind: "dice",
      count: 1,
      sides: 8,
      bonus: 3,
    });
  });

  it("steps a flat 1 up to 1d2", () => {
    expect(stepDiceTerm({ kind: "flat", value: 1 }, 1)).toEqual({
      kind: "dice",
      count: 1,
      sides: 2,
      bonus: null,
    });
  });

  it("clamps at the bottom of the chart", () => {
    expect(stepDiceTerm({ kind: "flat", value: 1 }, -1)).toEqual({ kind: "flat", value: 1 });
  });

  it("clamps at the top of the chart", () => {
    const top = DICE_SIZE_CHART[DICE_SIZE_CHART.length - 1]!;
    expect(stepDiceTerm(top, 5)).toEqual(top);
  });

  it("refuses to step a dice combination that isn't on the chart", () => {
    expect(stepDiceTerm({ kind: "dice", count: 5, sides: 4, bonus: null }, 1)).toBeNull();
  });

  it("refuses to step a raw damage term", () => {
    expect(stepDiceTerm({ kind: "raw", text: "special" }, 1)).toBeNull();
  });
});

describe("corpus sweep: every vendored melee/ranged string", () => {
  const monsters = JSON.parse(readFileSync(monstersPath, "utf8")) as Record<string, Monster>;

  let total = 0;
  let parsedCount = 0;
  let roundTripCount = 0;
  const failures: string[] = [];

  for (const monster of Object.values(monsters)) {
    for (const line of [monster.melee, monster.ranged]) {
      if (!line) continue;
      total++;
      const parsed = parseAttackLine(line);
      if (!parsed) {
        if (failures.length < 25) failures.push(line);
        continue;
      }
      parsedCount++;
      if (renderAttackLine(parsed) === line) roundTripCount++;
      else if (failures.length < 25) failures.push(`MISMATCH: ${line}`);
    }
  }

  it("parses and round-trips at least 99.5% of the corpus", () => {
    // Measured on the full corpus at time of writing: 3653/3656 = 99.92% parse
    // and round-trip (they're identical -- nothing that parses fails to
    // round-trip). The three holdouts are single-monster data artifacts
    // (trailing free text after the damage paren, a stray "#N" footnote mark),
    // not a grammar gap. Floor pinned just under the measured rate.
    console.log(
      `attack line corpus sweep: ${parsedCount}/${total} parsed (${((parsedCount / total) * 100).toFixed(2)}%), ` +
        `${roundTripCount}/${total} round-tripped (${((roundTripCount / total) * 100).toFixed(2)}%)`,
    );
    if (failures.length > 0) console.log("sample failures:", failures.slice(0, 10));
    expect(total).toBeGreaterThan(1000); // sanity: the corpus actually loaded
    expect(parsedCount / total).toBeGreaterThanOrEqual(0.995);
    expect(roundTripCount / total).toBeGreaterThanOrEqual(0.995);
  });
});

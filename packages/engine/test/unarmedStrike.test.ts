import { describe, expect, it } from "bun:test";

import { flurryOfBlowsLabel, unarmedDamageDie } from "../src/index.js";

/**
 * Monk unarmed strike damage die progression. Clean-room from the published
 * PF1 SRD "Table: Monk Unarmed Damage" (Medium column only). Upstream's
 * `description` embeds the full table as prose and the feature's own action
 * formula is dice-bearing (`sizeRoll(...)`), neither of which this engine's
 * formula DSL numerically evaluates, so this number doesn't come from the
 * vendored data.
 */
describe("unarmedDamageDie", () => {
  it("level 1 monk -> 1d6", () => {
    expect(unarmedDamageDie(1)).toEqual({ dieLabel: "1d6" });
  });

  it("level 3 monk -> 1d6 (top of the first tier)", () => {
    expect(unarmedDamageDie(3)).toEqual({ dieLabel: "1d6" });
  });

  it("level 4 monk -> 1d8", () => {
    expect(unarmedDamageDie(4)).toEqual({ dieLabel: "1d8" });
  });

  it("level 7 monk -> 1d8 (top of the second tier)", () => {
    expect(unarmedDamageDie(7)).toEqual({ dieLabel: "1d8" });
  });

  it("level 8 monk -> 1d10", () => {
    expect(unarmedDamageDie(8)).toEqual({ dieLabel: "1d10" });
  });

  it("level 11 monk -> 1d10 (top of the third tier)", () => {
    expect(unarmedDamageDie(11)).toEqual({ dieLabel: "1d10" });
  });

  it("level 12 monk -> 2d6", () => {
    expect(unarmedDamageDie(12)).toEqual({ dieLabel: "2d6" });
  });

  it("level 15 monk -> 2d6 (top of the fourth tier)", () => {
    expect(unarmedDamageDie(15)).toEqual({ dieLabel: "2d6" });
  });

  it("level 16 monk -> 2d8", () => {
    expect(unarmedDamageDie(16)).toEqual({ dieLabel: "2d8" });
  });

  it("level 19 monk -> 2d8 (top of the fifth tier)", () => {
    expect(unarmedDamageDie(19)).toEqual({ dieLabel: "2d8" });
  });

  it("level 20 monk -> 2d10", () => {
    expect(unarmedDamageDie(20)).toEqual({ dieLabel: "2d10" });
  });

  it("out-of-range level clamps to the L1-3 tier", () => {
    expect(unarmedDamageDie(0)).toEqual({ dieLabel: "1d6" });
  });
});

/**
 * The Small and Large columns of the same published table, which are their own
 * printed progressions rather than the Medium column stepped along the CRB
 * weapon-size chart: at 12th level a Small monk reads 1d10 where stepping
 * Medium's 2d6 down one would give 1d8. Every level band is pinned below in
 * both columns, since that mismatch means no formula reproduces them.
 *
 * The brawler's own "Table: Brawler Unarmed Damage" (ACG) prints identical
 * values at every band and column, so these fixtures cover both classes.
 */
describe("unarmedDamageDie by size", () => {
  const small = (level: number) => unarmedDamageDie(level, "sm").dieLabel;
  const large = (level: number) => unarmedDamageDie(level, "lg").dieLabel;

  it("Small column: 1d4 / 1d6 / 1d8 / 1d10 / 2d6 / 2d8", () => {
    expect([small(1), small(4), small(8), small(12), small(16), small(20)]).toEqual([
      "1d4",
      "1d6",
      "1d8",
      "1d10",
      "2d6",
      "2d8",
    ]);
  });

  it("Large column: 1d8 / 2d6 / 2d8 / 3d6 / 3d8 / 4d8", () => {
    expect([large(1), large(4), large(8), large(12), large(16), large(20)]).toEqual([
      "1d8",
      "2d6",
      "2d8",
      "3d6",
      "3d8",
      "4d8",
    ]);
  });

  it("a 12th-level Small monk reads 1d10, not the size chart's 1d8", () => {
    expect(small(12)).toBe("1d10");
    expect(unarmedDamageDie(12).dieLabel).toBe("2d6");
  });

  it("sizes the table never printed read the nearest printed column", () => {
    expect(unarmedDamageDie(8, "tiny").dieLabel).toBe(small(8));
    expect(unarmedDamageDie(8, "huge").dieLabel).toBe(large(8));
  });

  it("defaults to the Medium column", () => {
    expect(unarmedDamageDie(8)).toEqual(unarmedDamageDie(8, "med"));
  });
});

/**
 * Monk Flurry of Blows display summary. Clean-room from the published PF1
 * SRD: a flat -2 on every attack at EVERY level (never stepped down, unlike
 * the D&D 3.5 monk), using monk level in place of true BAB — and monk level
 * generates its own iteratives at effective BAB 6/11/16, so the total attack
 * count is 2 (L1-5), 3 (L6-7), 4 (L8-10), 5 (L11-14), 6 (L15), 7 (L16-20),
 * not a flat 2/3/4. Display only — not wired into the live
 * attacks/iteratives table. Six published anchors pinned exactly below, plus
 * the tier-boundary levels in between.
 */
describe("flurryOfBlowsLabel", () => {
  it("level 1 monk -> published anchor -1/-1", () => {
    expect(flurryOfBlowsLabel(1)).toBe("-1/-1 (replaces full attack, using monk level as BAB)");
  });

  it("level 5 monk -> 2 attacks (top of the first tier)", () => {
    expect(flurryOfBlowsLabel(5)).toBe("+3/+3 (replaces full attack, using monk level as BAB)");
  });

  it("level 6 monk -> published anchor +4/+4/-1", () => {
    expect(flurryOfBlowsLabel(6)).toBe("+4/+4/-1 (replaces full attack, using monk level as BAB)");
  });

  it("level 7 monk -> 3 attacks (top of the second tier)", () => {
    expect(flurryOfBlowsLabel(7)).toBe("+5/+5/+0 (replaces full attack, using monk level as BAB)");
  });

  it("level 8 monk -> published anchor +6/+6/+1/+1", () => {
    expect(flurryOfBlowsLabel(8)).toBe(
      "+6/+6/+1/+1 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 10 monk -> 4 attacks (top of the third tier)", () => {
    expect(flurryOfBlowsLabel(10)).toBe(
      "+8/+8/+3/+3 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 11 monk -> published anchor +9/+9/+4/+4/-1", () => {
    expect(flurryOfBlowsLabel(11)).toBe(
      "+9/+9/+4/+4/-1 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 14 monk -> 5 attacks (top of the fourth tier)", () => {
    expect(flurryOfBlowsLabel(14)).toBe(
      "+12/+12/+7/+7/+2 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 15 monk -> published anchor +13/+13/+8/+8/+3/+3", () => {
    expect(flurryOfBlowsLabel(15)).toBe(
      "+13/+13/+8/+8/+3/+3 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 16 monk -> 7 attacks (top tier now capped at 3 extras)", () => {
    expect(flurryOfBlowsLabel(16)).toBe(
      "+14/+14/+9/+9/+4/+4/-1 (replaces full attack, using monk level as BAB)",
    );
  });

  it("level 20 monk -> published anchor +18/+18/+13/+13/+8/+8/+3", () => {
    expect(flurryOfBlowsLabel(20)).toBe(
      "+18/+18/+13/+13/+8/+8/+3 (replaces full attack, using monk level as BAB)",
    );
  });

  it("out-of-range level returns an empty string", () => {
    expect(flurryOfBlowsLabel(0)).toBe("");
  });

  // Full "Flurry of Blows Attack Bonus" column, Table: The Monk (Core
  // Rulebook), levels 1-20, cross-checked against d20pfsrd and the legacy
  // AoN mirror. Confirms the flat -2 (no step-down at 8th/15th, unlike the
  // D&D 3.5 monk) holds at every level, not just the six anchors above.
  const PUBLISHED_TABLE: readonly string[] = [
    "-1/-1",
    "+0/+0",
    "+1/+1",
    "+2/+2",
    "+3/+3",
    "+4/+4/-1",
    "+5/+5/+0",
    "+6/+6/+1/+1",
    "+7/+7/+2/+2",
    "+8/+8/+3/+3",
    "+9/+9/+4/+4/-1",
    "+10/+10/+5/+5/+0",
    "+11/+11/+6/+6/+1",
    "+12/+12/+7/+7/+2",
    "+13/+13/+8/+8/+3/+3",
    "+14/+14/+9/+9/+4/+4/-1",
    "+15/+15/+10/+10/+5/+5/+0",
    "+16/+16/+11/+11/+6/+6/+1",
    "+17/+17/+12/+12/+7/+7/+2",
    "+18/+18/+13/+13/+8/+8/+3",
  ];

  it("matches the published table at every level 1-20", () => {
    PUBLISHED_TABLE.forEach((expected, i) => {
      const level = i + 1;
      expect(flurryOfBlowsLabel(level)).toBe(
        `${expected} (replaces full attack, using monk level as BAB)`,
      );
    });
  });
});

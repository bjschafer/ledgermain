import { describe, expect, it } from "bun:test";

import {
  CAVALIER_ORDERS,
  challengeRiderAt,
  challengeRiderText,
  orderByTag,
  ordersForClass,
  SAMURAI_ORDERS,
  SPLATBOOK_ORDERS,
} from "../src/index.js";

/**
 * Fixture coverage for the cavalier/samurai order reference table
 * (`cavalier-orders.ts`). Orders are a free-choice pick (`build.
 * cavalierOrder`, soft-warning posture, no hard validation) — this file covers
 * the pure data/lookup functions the picker UI and any future challenge-rider
 * display consume.
 */
describe("CAVALIER_ORDERS — the six APG orders", () => {
  it("has exactly the six core orders", () => {
    expect(Object.keys(CAVALIER_ORDERS).sort()).toEqual(
      ["cockatrice", "dragon", "lion", "shield", "star", "sword"].sort(),
    );
  });

  it("every order is selectable by both cavalier and samurai (RAW: samurai may pick a cavalier order)", () => {
    for (const order of Object.values(CAVALIER_ORDERS)) {
      expect(order.forClasses).toContain("cavalier");
      expect(order.forClasses).toContain("samurai");
    }
  });

  it("every order grants exactly two order skills, and abilities at 2nd/8th/15th", () => {
    for (const order of Object.values(CAVALIER_ORDERS)) {
      expect(order.orderSkills).toHaveLength(2);
      expect(order.abilities.map((a) => a.level)).toEqual([2, 8, 15]);
    }
  });

  it("every order is displayOnly with a {n} placeholder in its challenge template", () => {
    for (const order of Object.values(CAVALIER_ORDERS)) {
      expect(order.displayOnly).toBe(true);
      expect(order.challengeTemplate).toContain("{n}");
    }
  });
});

describe("SAMURAI_ORDERS — Warrior/Ronin, cavalier-ineligible", () => {
  it("has exactly Warrior and Ronin", () => {
    expect(Object.keys(SAMURAI_ORDERS).sort()).toEqual(["ronin", "warrior"].sort());
  });

  it("neither is selectable by a cavalier", () => {
    for (const order of Object.values(SAMURAI_ORDERS)) {
      expect(order.forClasses).toEqual(["samurai"]);
    }
  });
});

describe("SPLATBOOK_ORDERS — the 30 published orders beyond the APG six and Warrior/Ronin", () => {
  it("has exactly 30 entries", () => {
    expect(Object.keys(SPLATBOOK_ORDERS)).toHaveLength(30);
  });

  it("every order grants two or three order skills, and abilities at 2nd/8th/15th", () => {
    for (const order of Object.values(SPLATBOOK_ORDERS)) {
      expect(order.orderSkills.length).toBeGreaterThanOrEqual(2);
      expect(order.orderSkills.length).toBeLessThanOrEqual(3);
      expect(order.abilities.map((a) => a.level)).toEqual([2, 8, 15]);
    }
  });

  it("every order is displayOnly (Challenge rider and abilities stay prose, per the file's honesty bar)", () => {
    for (const order of Object.values(SPLATBOOK_ORDERS)) {
      expect(order.displayOnly).toBe(true);
    }
  });

  it("only Eclipse and Songbird are samurai-only — their own text names only 'samurai'", () => {
    const samuraiOnly = Object.values(SPLATBOOK_ORDERS)
      .filter((o) => !o.forClasses.includes("cavalier"))
      .map((o) => o.id)
      .sort();
    expect(samuraiOnly).toEqual(["order_of_the_eclipse", "order_of_the_songbird"]);
  });
});

describe("ordersForClass", () => {
  it("cavalier sees the six APG orders plus every cavalier-eligible splatbook order (34 total), never Warrior/Ronin/Eclipse/Songbird", () => {
    const names = ordersForClass("cavalier").map((o) => o.id);
    expect(names).toHaveLength(34);
    expect(names).toContain("cockatrice");
    expect(names).toContain("order_of_the_asp");
    expect(names).not.toContain("warrior");
    expect(names).not.toContain("ronin");
    expect(names).not.toContain("order_of_the_eclipse");
    expect(names).not.toContain("order_of_the_songbird");
  });

  it("samurai sees every hand-authored order (38 total)", () => {
    const names = ordersForClass("samurai").map((o) => o.id);
    expect(names).toHaveLength(38);
    expect(names).toContain("warrior");
    expect(names).toContain("ronin");
    expect(names).toContain("cockatrice");
    expect(names).toContain("order_of_the_eclipse");
    expect(names).toContain("order_of_the_songbird");
  });
});

describe("orderByTag — resolves across all three tables", () => {
  it("finds a cavalier-table order", () => {
    expect(orderByTag("lion")?.name).toBe("Order of the Lion");
  });

  it("finds a samurai-only order", () => {
    expect(orderByTag("ronin")?.name).toBe("Order of the Ronin");
  });

  it("finds a splatbook order — the live compute.ts wiring path for its order skills", () => {
    const order = orderByTag("order_of_the_asp");
    expect(order?.name).toBe("Order of the Asp");
    expect(order?.orderSkills).toEqual(["klo", "slt"]);
  });

  it("returns undefined for an unknown tag", () => {
    expect(orderByTag("nonexistent")).toBeUndefined();
  });
});

describe("challengeRiderAt — Table: Cavalier's Order progression (+1 per 4 levels, starting +1 at L1)", () => {
  it("L1: +1", () => {
    expect(challengeRiderAt(1)).toBe(1);
  });
  it("L4: still +1 (bump lands at 5th)", () => {
    expect(challengeRiderAt(4)).toBe(1);
  });
  it("L5: +2", () => {
    expect(challengeRiderAt(5)).toBe(2);
  });
  it("L9: +3", () => {
    expect(challengeRiderAt(9)).toBe(3);
  });
  it("L20: +5", () => {
    expect(challengeRiderAt(20)).toBe(5);
  });
  it("level 0 or below: 0 (no challenge yet)", () => {
    expect(challengeRiderAt(0)).toBe(0);
    expect(challengeRiderAt(-2)).toBe(0);
  });
});

describe("challengeRiderText — substitutes the live number into the order's template", () => {
  it("Cockatrice at L9: +3 melee damage phrasing", () => {
    const text = challengeRiderText(CAVALIER_ORDERS.cockatrice!, 9);
    expect(text).toBe(
      "+3 morale bonus to melee damage rolls against the challenge target, as long as he's the only one threatening it.",
    );
  });

  it("Warrior (SAM) at L5: DR 2/— phrasing", () => {
    const text = challengeRiderText(SAMURAI_ORDERS.warrior!, 5);
    expect(text).toBe("DR 2/— against attacks made by the challenge target.");
  });

  it("Ronin at L1: both {n} placeholders substituted with the same value", () => {
    const text = challengeRiderText(SAMURAI_ORDERS.ronin!, 1);
    expect(text).toBe(
      "+1 morale bonus on attack rolls and +1 dodge bonus to AC against the challenge target.",
    );
  });

  it("Order of the Asp (splatbook) at L13: +4 phrasing, same progression as the APG orders", () => {
    const text = challengeRiderText(SPLATBOOK_ORDERS.order_of_the_asp!, 13);
    expect(text).toBe(
      "+4 morale bonus on attack and damage rolls against the challenge target while it's entangled, exhausted, fatigued, flanked, nauseated, prone, shaken, staggered, or denied its Dex bonus to AC.",
    );
  });

  it("Order of the Tome (splatbook): flat +2, no {n} in its template to substitute", () => {
    const order = SPLATBOOK_ORDERS.order_of_the_tome!;
    expect(order.challengeTemplate).not.toContain("{n}");
    expect(challengeRiderText(order, 20)).toBe(order.challengeTemplate);
  });
});

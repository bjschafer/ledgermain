import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import {
  CAVALIER_ORDERS,
  SAMURAI_ORDERS,
  SPLATBOOK_ORDERS,
  challengeRiderText,
  mergedOrderCatalog,
  mergedOrdersForClass,
  resolveMergedOrder,
} from "../src/index.js";

/**
 * Coverage for the cavalier/samurai order vendored-catalog overlay. Unlike
 * every other subsystem imported so far, this is a CHASSIS overlay (a
 * hand-authored order carries bonus skills/Challenge rider/leveled abilities,
 * not just prose) — see `cavalier-orders.ts`'s "vendored catalog overlay" doc
 * comment for the collision-audit narrative (37 of 38 hand-authored entries
 * matched directly; the samurai's Ronin order needed a wording-drift alias to
 * the vendored "Ronin", not "Order of the Ronin").
 */
const ref = loadRefData();

describe("mergedOrderCatalog", () => {
  const merged = mergedOrderCatalog(ref);
  const byId = new Map(merged.map((o) => [o.id, o]));

  it("has exactly one row per vendored entry — every hand-authored entry matched, no orphan to append", () => {
    expect(merged).toHaveLength(Object.keys(ref.cavalierOrders).length);
  });

  it("all 38 hand-authored orders (6 cavalier + Warrior/Ronin + 30 splatbook) matched a vendored entry and kept their chassis", () => {
    const allHand = { ...CAVALIER_ORDERS, ...SAMURAI_ORDERS, ...SPLATBOOK_ORDERS };
    let matched = 0;
    for (const order of Object.values(allHand)) {
      const entry = byId.get(order.id);
      expect(entry).toBeDefined();
      expect(entry!.displayOnly).toBe(false);
      expect(entry!.orderSkills).toEqual(order.orderSkills);
      expect(entry!.challengeTemplate).toBe(order.challengeTemplate);
      expect(entry!.abilities).toEqual(order.abilities);
      // ...but picks up the vendored prose for the full-text view.
      expect(entry!.description).toBeDefined();
      matched++;
    }
    expect(matched).toBe(38);
  });

  it("the samurai Ronin order matches the vendored 'Ronin' entry (wording drift, not a missing entry)", () => {
    const entry = byId.get("ronin")!;
    expect(entry.displayOnly).toBe(false);
    expect(entry.name).toBe("Order of the Ronin"); // hand-authored name wins display
    expect(entry.description).toBeDefined();
  });

  it("a splatbook order matches its vendored entry directly (no alias needed) and keeps its own class-skill chassis", () => {
    const entry = byId.get("order_of_the_asp")!;
    expect(entry.displayOnly).toBe(false);
    expect(entry.orderSkills).toEqual(["klo", "slt"]);
    expect(entry.forClasses).toEqual(["cavalier", "samurai"]);
    expect(entry.description).toBeDefined();
  });

  it("no vendored entry is left prose-only — every published order now has a hand-authored chassis", () => {
    for (const entry of merged) {
      expect(entry.displayOnly).toBe(false);
    }
  });

  it("every id is unique", () => {
    const ids = merged.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("mergedOrdersForClass", () => {
  it("a pure cavalier sees every cavalier-eligible order, but never Warrior/Ronin/Eclipse/Songbird (samurai-only, per each order's own text)", () => {
    const options = mergedOrdersForClass(ref, "cavalier");
    expect(options.some((o) => o.id === "cockatrice")).toBe(true);
    expect(options.some((o) => o.id === "order_of_the_asp")).toBe(true);
    expect(options.some((o) => o.id === "warrior")).toBe(false);
    expect(options.some((o) => o.id === "ronin")).toBe(false);
    expect(options.some((o) => o.id === "order_of_the_eclipse")).toBe(false);
    expect(options.some((o) => o.id === "order_of_the_songbird")).toBe(false);
  });

  it("a samurai sees every order, including Warrior/Ronin/Eclipse/Songbird", () => {
    const options = mergedOrdersForClass(ref, "samurai");
    expect(options.some((o) => o.id === "warrior")).toBe(true);
    expect(options.some((o) => o.id === "ronin")).toBe(true);
    expect(options.some((o) => o.id === "order_of_the_asp")).toBe(true);
    expect(options.some((o) => o.id === "order_of_the_eclipse")).toBe(true);
    expect(options.some((o) => o.id === "order_of_the_songbird")).toBe(true);
  });
});

describe("resolveMergedOrder", () => {
  it("resolves a matched id to its chassis + vendored prose", () => {
    const entry = resolveMergedOrder("cockatrice", ref);
    expect(entry?.displayOnly).toBe(false);
    expect(entry?.challengeTemplate).toBe(CAVALIER_ORDERS.cockatrice!.challengeTemplate);
  });

  it("resolves a splatbook order id to its class-skill-only-wired chassis + vendored prose", () => {
    const entry = resolveMergedOrder("order_of_the_asp", ref);
    expect(entry?.displayOnly).toBe(false);
    expect(entry?.name).toBe("Order of the Asp");
    expect(entry?.orderSkills).toEqual(SPLATBOOK_ORDERS.order_of_the_asp!.orderSkills);
  });

  it("returns undefined for an id in neither table", () => {
    expect(resolveMergedOrder("not-a-real-order", ref)).toBeUndefined();
  });
});

describe("challengeRiderText — widened signature still works for a plain template object", () => {
  it("substitutes the live number", () => {
    expect(challengeRiderText({ challengeTemplate: "+{n} bonus" }, 9)).toBe("+3 bonus");
  });
});

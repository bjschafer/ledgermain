import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * End-to-end coverage for the vendored cavalier/samurai order catalog (issue
 * #74 Phase 3c) against the real pinned Pf Data 1e slice.
 */
const ref = loadRefData();

describe("RefData.cavalierOrders", () => {
  it("has 38 entries — 40 raw dictionary keys minus the 'not_found' sentinel and one redirect alias", () => {
    expect(Object.keys(ref.cavalierOrders)).toHaveLength(38);
  });

  it("never includes the dataset's own junk keys, nor its redirect alias", () => {
    expect(ref.cavalierOrders.not_found).toBeUndefined();
    expect(ref.cavalierOrders.lion).toBeUndefined(); // redirects to order_of_the_lion
  });

  it("a known entry (Order of the Cockatrice) has the expected fields — this subsystem file carries no category/level at all", () => {
    const order = ref.cavalierOrders.order_of_the_cockatrice!;
    expect(order.name).toBe("Order of the Cockatrice");
    expect(order.description).toContain("Order Abilities");
    expect(order.sources).toEqual([{ id: "advanced-player-s-guide" }]);
  });

  it("the samurai-only Ronin order is named 'Ronin' in the source, NOT 'Order of the Ronin' like every other entry — a wording-drift alias, not a missing entry", () => {
    const ronin = ref.cavalierOrders.ronin!;
    expect(ronin.name).toBe("Ronin");
  });

  it("NOT the unrelated Hellknight order chassis (class_ability_hellknight_orders.json)", () => {
    expect(ref.cavalierOrders.order_of_the_chain).toBeUndefined();
    expect(ref.cavalierOrders.order_of_the_rack).toBeUndefined();
  });

  it("resolves ‹…› cross-refs between entries to plain display text, and strips the redundant leading ## header + SOURCE citation lines", () => {
    for (const order of Object.values(ref.cavalierOrders)) {
      expect(order.description ?? "").not.toMatch(/[‹›«»]/);
      expect(order.description ?? "").not.toMatch(/^##\s/);
    }
  });

  it("every entry has a synthetic uuid and a stable slug id matching the source dictionary key", () => {
    for (const [key, order] of Object.entries(ref.cavalierOrders)) {
      expect(order.id).toBe(key);
      expect(order.uuid).toBe(`pfdata:cavalier-order:${key}`);
    }
  });

  it("meta records a hash for cavalier-orders.json and the collection count", () => {
    expect(ref.meta.hashes["cavalier-orders.json"]).toMatch(/^[0-9a-f]{64}$/);
    expect(ref.meta.counts.cavalierOrders).toBe(38);
  });
});

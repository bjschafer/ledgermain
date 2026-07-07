import { describe, expect, it } from "bun:test";

import { groupByCategory } from "../src/model/grouping.js";

type Tier = "a" | "b" | "c";
const ORDER: readonly Tier[] = ["a", "b", "c"];
const label = (t: Tier) => t.toUpperCase();

describe("groupByCategory", () => {
  it("returns sections in the declared order, not input order", () => {
    const items = [
      { name: "x", tier: "c" as Tier },
      { name: "y", tier: "a" as Tier },
      { name: "z", tier: "b" as Tier },
    ];
    const groups = groupByCategory(items, (i) => i.tier, ORDER, label);
    expect(groups.map((g) => g.category)).toEqual(["a", "b", "c"]);
  });

  it("preserves relative item order within a section", () => {
    const items = [
      { name: "second", tier: "a" as Tier },
      { name: "first", tier: "a" as Tier },
    ];
    const [groupA] = groupByCategory(items, (i) => i.tier, ORDER, label);
    expect(groupA?.items.map((i) => i.name)).toEqual(["second", "first"]);
  });

  it("omits empty sections", () => {
    const items = [{ name: "only", tier: "b" as Tier }];
    const groups = groupByCategory(items, (i) => i.tier, ORDER, label);
    expect(groups.map((g) => g.category)).toEqual(["b"]);
    expect(groups[0]?.label).toBe("B");
  });

  it("drops items whose category is not in the order set", () => {
    const items = [
      { name: "kept", tier: "a" as Tier },
      { name: "dropped", tier: "z" as Tier },
    ];
    const groups = groupByCategory(items, (i) => i.tier, ORDER, label);
    expect(groups.flatMap((g) => g.items.map((i) => i.name))).toEqual(["kept"]);
  });

  it("returns no sections for an empty input", () => {
    expect(groupByCategory([], (i: { tier: Tier }) => i.tier, ORDER, label)).toEqual([]);
  });
});

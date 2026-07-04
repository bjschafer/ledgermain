import { describe, expect, it } from "bun:test";

import { resolveStack, type TypedModifier } from "../src/index.js";

const mod = (type: string, value: number, source = type): TypedModifier => ({
  type,
  value,
  source,
});

describe("stacking: same-type bonuses do not stack", () => {
  it("two morale bonuses → highest only", () => {
    const r = resolveStack([mod("morale", 2, "Bless"), mod("morale", 4, "Heroism")]);
    expect(r.total).toBe(4);
    const bless = r.modifiers.find((m) => m.source === "Bless")!;
    const heroism = r.modifiers.find((m) => m.source === "Heroism")!;
    expect(bless.applied).toBe(false); // overridden → struck through in UI
    expect(heroism.applied).toBe(true);
  });

  it("two enhancement bonuses → highest only", () => {
    const r = resolveStack([mod("enh", 4), mod("enh", 6), mod("enh", 2)]);
    expect(r.total).toBe(6);
    expect(r.modifiers.filter((m) => m.applied)).toHaveLength(1);
  });
});

describe("stacking: dodge / untyped / circumstance stack", () => {
  it("dodge + untyped → sum", () => {
    const r = resolveStack([mod("dodge", 1), mod("untyped", 2)]);
    expect(r.total).toBe(3);
    expect(r.modifiers.every((m) => m.applied)).toBe(true);
  });

  it("multiple dodge bonuses all stack", () => {
    const r = resolveStack([mod("dodge", 1), mod("dodge", 1), mod("dodge", 2)]);
    expect(r.total).toBe(4);
  });

  it("multiple circumstance bonuses all stack", () => {
    const r = resolveStack([mod("circumstance", 2), mod("circumstance", 2)]);
    expect(r.total).toBe(4);
  });

  it("empty type is treated as untyped and stacks", () => {
    const r = resolveStack([mod("", 2), mod("", 3)]);
    expect(r.total).toBe(5);
  });
});

describe("stacking: trait bonuses do not stack", () => {
  it("two trait bonuses to the same target → highest only, not summed", () => {
    // e.g. two character traits both granting a +1/+2 trait bonus to the same
    // save/skill (PF1: trait bonuses never stack with each other).
    const r = resolveStack([mod("trait", 1, "Trait A"), mod("trait", 2, "Trait B")]);
    expect(r.total).toBe(2);
    expect(r.modifiers.find((m) => m.source === "Trait A")!.applied).toBe(false);
    expect(r.modifiers.find((m) => m.source === "Trait B")!.applied).toBe(true);
  });
});

describe("stacking: penalties always stack", () => {
  it("same-type penalties stack", () => {
    const r = resolveStack([mod("morale", -2), mod("morale", -2)]);
    expect(r.total).toBe(-4);
    expect(r.modifiers.every((m) => m.applied)).toBe(true);
  });

  it("a penalty stacks with the highest same-type bonus", () => {
    // two enhancement bonuses (highest wins) + an enhancement penalty (always applies)
    const r = resolveStack([mod("enh", 4), mod("enh", 6), mod("enh", -2)]);
    expect(r.total).toBe(4); // 6 (highest bonus) + (-2) penalty
  });
});

describe("stacking: provenance", () => {
  it("records every input modifier with an applied flag and source", () => {
    const r = resolveStack([mod("competence", 2, "Item A"), mod("competence", 5, "Item B")]);
    expect(r.modifiers).toHaveLength(2);
    expect(r.modifiers.map((m) => m.source).sort()).toEqual(["Item A", "Item B"]);
    expect(r.modifiers.find((m) => m.source === "Item B")!.applied).toBe(true);
    expect(r.modifiers.find((m) => m.source === "Item A")!.applied).toBe(false);
  });
});
